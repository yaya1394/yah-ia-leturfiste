#!/usr/bin/env python3
"""Import historical PMU race cards, starters and official results into SQLite.

The PMU REST endpoints used here are undocumented and may change or restrict
historical access. This importer is deliberately sequential, resumable and
preserves the received JSON so schema changes do not silently discard fields.
It does not fall back to generated or synthetic race data.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sqlite3
import sys
import time
import unicodedata
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen


DEFAULT_BASE_URL = "https://online.turfinfo.api.pmu.fr/rest/client/7"
DEFAULT_DB = Path(__file__).resolve().parents[1] / "data" / "pmu_archive.sqlite3"
USER_AGENT = "YahIA-PMU-Archive/1.0 (sequential historical data import)"

SCHEMA = """
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS import_days (
    race_date TEXT PRIMARY KEY,
    status TEXT NOT NULL CHECK (status IN ('running','complete','empty','partial')),
    meetings_seen INTEGER NOT NULL DEFAULT 0,
    races_seen INTEGER NOT NULL DEFAULT 0,
    races_saved INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS horses (
    horse_key TEXT PRIMARY KEY,
    horse_id TEXT,
    name TEXT NOT NULL,
    profile_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS races (
    race_id TEXT PRIMARY KEY,
    race_date TEXT NOT NULL,
    meeting_num INTEGER NOT NULL,
    course_num INTEGER NOT NULL,
    hippodrome TEXT,
    country TEXT,
    discipline TEXT,
    name TEXT,
    distance INTEGER,
    start_time TEXT,
    declared_runners INTEGER,
    status TEXT,
    is_final INTEGER NOT NULL DEFAULT 0,
    arrival_json TEXT,
    course_json TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (race_date, meeting_num, course_num)
);
CREATE INDEX IF NOT EXISTS races_by_date ON races(race_date);
CREATE TABLE IF NOT EXISTS runners (
    race_id TEXT NOT NULL REFERENCES races(race_id) ON DELETE CASCADE,
    horse_key TEXT NOT NULL REFERENCES horses(horse_key),
    horse_name TEXT NOT NULL,
    number INTEGER,
    rank INTEGER,
    result_status TEXT,
    non_runner INTEGER NOT NULL DEFAULT 0,
    driver TEXT,
    trainer TEXT,
    age INTEGER,
    sex TEXT,
    weight REAL,
    draw INTEGER,
    odds REAL,
    career_form_json TEXT,
    runner_json TEXT NOT NULL,
    PRIMARY KEY (race_id, horse_key, number)
);
CREATE INDEX IF NOT EXISTS runners_by_horse ON runners(horse_key);
CREATE TABLE IF NOT EXISTS horse_performances (
    performance_key TEXT PRIMARY KEY,
    horse_key TEXT NOT NULL REFERENCES horses(horse_key),
    race_id TEXT REFERENCES races(race_id) ON DELETE CASCADE,
    date TEXT,
    hippodrome TEXT,
    specialite TEXT,
    distance INTEGER,
    partants INTEGER,
    corde TEXT,
    auto TEXT,
    surface TEXT,
    categorie TEXT,
    allocation REAL,
    driver TEXT,
    artifice TEXT,
    type_course TEXT,
    valeur_handicap TEXT,
    reduction_km TEXT,
    rapport REAL,
    quinte INTEGER,
    rang TEXT,
    source TEXT NOT NULL,
    raw_json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS performances_by_horse_date ON horse_performances(horse_key,date);
CREATE TABLE IF NOT EXISTS raw_payloads (
    source_key TEXT PRIMARY KEY,
    payload_json TEXT NOT NULL,
    fetched_at TEXT NOT NULL
);
"""

VIEWS = """
DROP VIEW IF EXISTS horse_performance_cards;
CREATE VIEW horse_performance_cards AS
SELECT date AS "Date", hippodrome AS "Hippodrome", specialite AS "Spé.", distance AS "Distance",
       partants AS "Par.", corde AS "Corde", auto AS "Auto", surface AS "Surface", categorie AS "Cat.",
       allocation AS "Allocation", driver AS "Driver", artifice AS "Art.", reduction_km AS "Red.km",
       rapport AS "Rap.", quinte AS "Quinté", rang AS "Rang"
FROM horse_performances
WHERE UPPER(specialite) IN ('ATTELÉ', 'ATTELE', 'MONTÉ', 'MONTE');

DROP VIEW IF EXISTS horse_performance_cards_galop;
CREATE VIEW horse_performance_cards_galop AS
SELECT date AS "Date", hippodrome AS "Hippodrome", specialite AS "Spé.", distance AS "Distance",
       partants AS "Par.", corde AS "Corde", surface AS "Terrain", type_course AS "Type",
       allocation AS "Allocation", driver AS "Jockey", artifice AS "Art.", valeur_handicap AS "VH",
       rapport AS "Rap.", quinte AS "Quinté", rang AS "Rang"
FROM horse_performances
WHERE UPPER(specialite) IN ('PLAT', 'OBSTACLE', 'HAIES', 'STEEPLE-CHASE', 'STEEPLE_CHASE', 'CROSS');
"""


def utc_now() -> str:
    return datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


def json_text(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"), default=str)


def as_int(value: Any) -> int | None:
    try:
        if value is None or value == "":
            return None
        return int(value)
    except (TypeError, ValueError):
        return None


def as_float(value: Any) -> float | None:
    try:
        if value is None or value == "":
            return None
        cleaned = str(value).replace("\u202f", "").replace("\xa0", "").replace(" ", "")
        cleaned = cleaned.replace("€", "").replace(",", ".")
        return float(cleaned)
    except (TypeError, ValueError):
        return None


def as_text(value: Any) -> str | None:
    if value in (None, ""):
        return None
    if isinstance(value, dict):
        value = value.get("libelleLong") or value.get("libelle") or value.get("libelleCourt") or value.get("code") or value
    if isinstance(value, list):
        value = ", ".join(str(item) for item in value)
    return str(value)


def normalized_name(value: str) -> str:
    folded = unicodedata.normalize("NFKD", value.strip().upper())
    ascii_name = "".join(ch for ch in folded if not unicodedata.combining(ch))
    return re.sub(r"[^A-Z0-9]+", "_", ascii_name).strip("_") or "UNKNOWN"


def horse_identity(participant: dict[str, Any]) -> tuple[str, str | None, str]:
    name = str(participant.get("nom") or participant.get("name") or "INCONNU").strip()
    horse_id = next((participant.get(key) for key in (
        "idCheval", "id_cheval", "chevalId", "horseId", "numeroCheval"
    ) if participant.get(key) not in (None, "")), None)
    horse_id = str(horse_id) if horse_id is not None else None
    key = f"pmu:{horse_id}" if horse_id else f"name:{normalized_name(name)}"
    return key, horse_id, name


def arrival_ranks(arrival: Any) -> dict[int, int]:
    """Map horse numbers to rank, preserving tied groups when nested."""
    if not isinstance(arrival, list):
        return {}
    result: dict[int, int] = {}
    rank = 1
    for item in arrival:
        group = item if isinstance(item, list) else [item]
        valid = [as_int(number) for number in group]
        valid = [number for number in valid if number is not None]
        for number in valid:
            result[number] = rank
        rank += max(1, len(valid))
    return result


def fetch_json(url: str, timeout: int = 20, attempts: int = 5) -> Any:
    last_error: Exception | None = None
    for attempt in range(attempts):
        request = Request(url, headers={"Accept": "application/json", "User-Agent": USER_AGENT})
        try:
            with urlopen(request, timeout=timeout) as response:
                return json.loads(response.read().decode("utf-8"))
        except HTTPError as exc:
            last_error = exc
            if exc.code not in (408, 425, 429, 500, 502, 503, 504) or attempt + 1 == attempts:
                break
            retry_after = as_float(exc.headers.get("Retry-After")) if exc.headers else None
            time.sleep(retry_after if retry_after else min(60, 2 ** attempt))
        except (URLError, TimeoutError, json.JSONDecodeError) as exc:
            last_error = exc
            if attempt + 1 == attempts:
                break
            time.sleep(min(60, 2 ** attempt))
    raise RuntimeError(f"Échec HTTP/JSON pour {url}: {last_error}") from last_error


def api_url(base_url: str, *parts: str) -> str:
    return base_url.rstrip("/") + "/" + "/".join(quote(part, safe="") for part in parts)


def save_raw(db: sqlite3.Connection, source_key: str, payload: Any, keep_raw: bool) -> None:
    if keep_raw:
        db.execute(
            "INSERT INTO raw_payloads(source_key,payload_json,fetched_at) VALUES(?,?,?) "
            "ON CONFLICT(source_key) DO UPDATE SET payload_json=excluded.payload_json, fetched_at=excluded.fetched_at",
            (source_key, json_text(payload), utc_now()),
        )


def get_reunions(payload: Any) -> list[dict[str, Any]]:
    if not isinstance(payload, dict):
        raise RuntimeError("réponse programme non reconnue: objet JSON attendu")
    programme = payload.get("programme", payload)
    if not isinstance(programme, dict) or "reunions" not in programme:
        raise RuntimeError("réponse programme non reconnue: champ 'reunions' absent")
    reunions = programme["reunions"]
    if not isinstance(reunions, list):
        raise RuntimeError("réponse programme non reconnue: 'reunions' n'est pas une liste")
    return [item for item in reunions if isinstance(item, dict)]


def get_participants(payload: Any) -> list[dict[str, Any]]:
    if not isinstance(payload, dict):
        return []
    parts = payload.get("participants", [])
    return [item for item in parts if isinstance(item, dict)] if isinstance(parts, list) else []


def get_arrival(course: dict[str, Any], detail: dict[str, Any]) -> Any:
    for source in (detail, course):
        value = source.get("ordreArrivee") or source.get("arrivee")
        if value:
            return value
    return None


def pick(*sources: dict[str, Any] | None, keys: tuple[str, ...]) -> Any:
    for source in sources:
        if not isinstance(source, dict):
            continue
        for key in keys:
            value = source.get(key)
            if value not in (None, ""):
                return value
    return None


def normalize_date(value: Any) -> str | None:
    if value in (None, ""):
        return None
    raw = str(value).strip()
    for fmt in ("%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%d/%m/%Y", "%d-%m-%Y", "%d%m%Y"):
        try:
            return datetime.strptime(raw[:19], fmt).date().isoformat()
        except ValueError:
            continue
    return raw


def normalize_auto(value: Any) -> str | None:
    if value in (None, ""):
        return None
    if isinstance(value, bool):
        return "Oui" if value else "Non"
    raw = str(value).strip()
    upper = raw.upper()
    if upper in ("TRUE", "1", "OUI", "YES"):
        return "Oui"
    if upper in ("FALSE", "0", "NON", "NO"):
        return "Non"
    return raw


def normalize_specialite(value: Any) -> str | None:
    if value in (None, ""):
        return None
    raw = str(value)
    upper = raw.upper().replace("É", "E").replace("È", "E")
    if "MONTE" in upper:
        return "MONTÉ"
    if "ATTELE" in upper:
        return "ATTELÉ"
    if "PLAT" in upper:
        return "PLAT"
    if any(item in upper for item in ("OBSTACLE", "HAIE", "STEEPLE", "CROSS")):
        return "OBSTACLE"
    return raw


def performance_values(
    performance: dict[str, Any],
    race: dict[str, Any] | None = None,
    runner: dict[str, Any] | None = None,
    runner_count: int | None = None,
) -> dict[str, Any]:
    direct_odds = pick(runner, keys=("dernierRapportDirect",))
    if not isinstance(direct_odds, dict):
        direct_odds = {}
    artifice = pick(performance, runner, keys=("artifice", "artifices", "type_deferrage", "deferrage", "deferre"))
    blinkers = pick(performance, runner, keys=("oeilleres", "oeillères"))
    if blinkers not in (None, ""):
        artifice = f"{artifice}; oeillères={blinkers}" if artifice not in (None, "") else f"oeillères={blinkers}"
    auto_value = pick(performance, race, keys=("auto", "departAutostart", "autostart", "modeDepart"))
    if auto_value is None:
        auto_value = (race or {}).get("typeDepart") if isinstance(race, dict) else None
    if isinstance(auto_value, dict):
        auto_value = auto_value.get("libelle") or auto_value.get("code")
    allocation = pick(performance, race, keys=("allocation", "montantPrix", "montantTotalOffert", "allocationTotale"))
    type_course = pick(performance, race, keys=("typeCourse", "type_course", "courseType", "typeEpreuve", "type", "categorieCourse"))
    valeur_handicap = pick(performance, runner, keys=("valeurHandicap", "valeur_handicap", "handicapValeur", "valeurHdp", "vh"))
    specialite_raw = pick(
        performance,
        race,
        keys=("specialite", "spécialité", "specialty", "spec", "sousSpecialite", "libelleSpecialite",
              "codeSpecialite", "sousDiscipline", "typeEpreuve", "discipline"),
    )
    specialite = normalize_specialite(as_text(specialite_raw))
    if specialite not in ("ATTELÉ", "MONTÉ", "PLAT", "OBSTACLE"):
        subtype = normalize_specialite(as_text(pick(
            performance, race, keys=("typeCourse", "type_course", "courseType", "typeEpreuve", "categorieCourse", "type")
        )))
        if subtype in ("PLAT", "OBSTACLE"):
            specialite = subtype
    corde = pick(performance, keys=("placeCorde", "numCorde", "numeroCorde", "draw", "corde"))
    if corde is None:
        corde = pick(runner, keys=("placeCorde", "numCorde", "numeroCorde", "draw", "corde"))
    if corde is None:
        corde = pick(performance, race, keys=("sensCorde", "sens"))
    rapport = pick(performance, keys=("rapport", "cote", "odds"))
    if rapport is None:
        rapport = direct_odds.get("rapport")
    quinte = pick(performance, race, keys=("quinte", "isQuinte", "quintePlus"))
    if isinstance(quinte, str):
        quinte = quinte.strip().lower() in ("true", "1", "oui", "yes")
    return {
        "date": normalize_date(pick(performance, keys=("date", "dateCourse", "dateDepart")) or (race or {}).get("race_date")),
        "hippodrome": as_text(pick(performance, race, keys=("hippodrome", "nomHippodrome", "lieu"))),
        "specialite": specialite,
        "distance": as_int(pick(performance, race, keys=("distance", "dist", "metres"))),
        "partants": as_int(pick(performance, keys=("nombrePartants", "nbPartants", "nb_partants", "partants"))) or runner_count,
        "corde": as_text(corde),
        "auto": normalize_auto(auto_value),
        "surface": as_text(pick(performance, race, keys=("surface", "etatPiste", "typeSurface", "typePiste", "terrain", "piste"))),
        "categorie": as_text(pick(performance, race, keys=("categorie", "categorieCourse", "cat", "typeCourse"))),
        "allocation": as_float(allocation),
        "driver": as_text(pick(performance, runner, keys=("driver", "jockey", "conducteur"))),
        "artifice": str(artifice) if artifice not in (None, "") else None,
        "type_course": as_text(type_course),
        "valeur_handicap": as_text(valeur_handicap),
        "reduction_km": as_text(pick(performance, runner, keys=("reductionKilometrique", "reductionKm", "reduction_km", "redKm"))),
        "rapport": as_float(rapport),
        "quinte": int(bool(quinte)) if quinte is not None else None,
        "rang": as_text(pick(performance, runner, keys=("rang", "ordreArrivee", "position", "place", "resultat"))),
    }


def save_performance(
    db: sqlite3.Connection,
    horse_key: str,
    performance_key: str,
    performance: dict[str, Any],
    source: str,
    race: dict[str, Any] | None = None,
    runner: dict[str, Any] | None = None,
    race_id: str | None = None,
    runner_count: int | None = None,
) -> None:
    values = performance_values(performance, race, runner, runner_count)
    db.execute(
        """INSERT INTO horse_performances(performance_key,horse_key,race_id,date,hippodrome,specialite,distance,partants,
           corde,auto,surface,categorie,allocation,driver,artifice,type_course,valeur_handicap,reduction_km,rapport,quinte,rang,source,raw_json)
           VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
           ON CONFLICT(performance_key) DO UPDATE SET race_id=excluded.race_id,date=excluded.date,hippodrome=excluded.hippodrome,
           specialite=excluded.specialite,distance=excluded.distance,partants=excluded.partants,corde=excluded.corde,auto=excluded.auto,
           surface=excluded.surface,categorie=excluded.categorie,allocation=excluded.allocation,driver=excluded.driver,
           artifice=excluded.artifice,type_course=excluded.type_course,valeur_handicap=excluded.valeur_handicap,
           reduction_km=excluded.reduction_km,rapport=excluded.rapport,quinte=excluded.quinte,
           rang=excluded.rang,source=excluded.source,raw_json=excluded.raw_json""",
        (performance_key, horse_key, race_id, values["date"], values["hippodrome"], values["specialite"], values["distance"],
         values["partants"], values["corde"], values["auto"], values["surface"], values["categorie"], values["allocation"],
         values["driver"], values["artifice"], values["type_course"], values["valeur_handicap"],
         str(values["reduction_km"]) if values["reduction_km"] is not None else None,
         values["rapport"], values["quinte"], str(values["rang"]) if values["rang"] is not None else None,
         source, json_text(performance)),
    )


def import_date(
    db: sqlite3.Connection,
    race_date: date,
    base_url: str,
    delay: float,
    keep_raw: bool,
    force: bool,
) -> tuple[str, int]:
    iso_date = race_date.isoformat()
    saved = db.execute("SELECT status FROM import_days WHERE race_date=?", (iso_date,)).fetchone()
    if not force and saved and saved[0] in ("complete", "empty"):
        return "skipped", 0

    dmy = race_date.strftime("%d%m%Y")
    now = utc_now()
    db.execute(
        "INSERT INTO import_days(race_date,status,updated_at) VALUES(?, 'running', ?) "
        "ON CONFLICT(race_date) DO UPDATE SET status='running',last_error=NULL,updated_at=excluded.updated_at",
        (iso_date, now),
    )
    db.commit()
    failures: list[str] = []
    saved_races = 0

    try:
        programme_url = api_url(base_url, "programme", dmy)
        programme_payload = fetch_json(programme_url)
        time.sleep(delay)
        save_raw(db, f"{iso_date}:programme", programme_payload, keep_raw)
        reunions = get_reunions(programme_payload)
        if not reunions:
            db.execute(
                "UPDATE import_days SET status='empty',meetings_seen=0,races_seen=0,races_saved=0,updated_at=? WHERE race_date=?",
                (utc_now(), iso_date),
            )
            db.commit()
            return "empty", 0

        planned_races = sum(len(r.get("courses") or []) for r in reunions)
        for reunion in reunions:
            meeting_num = as_int(reunion.get("numOfficiel") or reunion.get("numReunion"))
            if meeting_num is None:
                failures.append("réunion sans numéro")
                continue
            courses = reunion.get("courses") or []
            if not isinstance(courses, list):
                failures.append(f"R{meeting_num}: liste des courses invalide")
                continue
            for index, course in enumerate(courses, start=1):
                if not isinstance(course, dict):
                    failures.append(f"R{meeting_num}C{index}: course invalide")
                    continue
                course_num = as_int(course.get("numOrdre") or course.get("numOfficiel")) or index
                race_id = f"{iso_date}-R{meeting_num}C{course_num}"
                path = ("programme", dmy, f"R{meeting_num}", f"C{course_num}")
                try:
                    detail = fetch_json(api_url(base_url, *path))
                    time.sleep(delay)
                    participants_payload = fetch_json(api_url(base_url, *path, "participants"))
                    time.sleep(delay)
                    participants = get_participants(participants_payload)
                    if not participants:
                        raise RuntimeError("réponse partants vide ou non reconnue")
                except Exception as exc:
                    failures.append(f"{race_id}: {exc}")
                    continue

                if not isinstance(detail, dict):
                    detail = {}
                arrival = get_arrival(course, detail)
                ranks = arrival_ranks(arrival)
                final = bool(
                    detail.get("isArriveeDefinitive") or course.get("isArriveeDefinitive")
                    or "ARRIVEE_DEFINITIVE" in str(detail.get("statut") or course.get("statut") or "")
                )
                status = detail.get("statut") or course.get("statut")
                hippodrome = (detail.get("hippodrome") or {}).get("libelleCourt") if isinstance(detail.get("hippodrome"), dict) else None
                hippodrome = hippodrome or reunion.get("hippodrome", {}).get("libelleCourt") if isinstance(reunion.get("hippodrome"), dict) else hippodrome
                country = (reunion.get("pays") or {}).get("code") if isinstance(reunion.get("pays"), dict) else reunion.get("pays")
                race_name = detail.get("libelle") or course.get("libelle") or course.get("nom")
                discipline = detail.get("discipline") or course.get("discipline")
                distance = as_int(detail.get("distance") or course.get("distance"))
                start_time = detail.get("heureDepart") or course.get("heureDepart")
                declared = as_int(course.get("nombreDeclaresPartants") or detail.get("nombreDeclaresPartants"))
                paris = detail.get("paris") or course.get("paris") or []
                is_quinte = bool(course.get("pariSpecial") or detail.get("pariSpecial") or any(
                    isinstance(pari, dict) and "QUINTE" in str(pari.get("codePari") or "").upper()
                    for pari in paris
                )) if isinstance(paris, list) else bool(course.get("pariSpecial") or detail.get("pariSpecial"))
                race_context = dict(detail)
                race_context.update({
                    "race_date": iso_date,
                    "hippodrome": hippodrome,
                    "discipline": discipline,
                    "distance": distance,
                    "nombrePartants": declared or len(participants),
                    "corde": detail.get("corde") or course.get("corde"),
                    "surface": detail.get("surface") or detail.get("typePiste") or detail.get("terrain"),
                    "categorie": detail.get("categorie") or detail.get("categorieCourse"),
                    "allocation": detail.get("montantPrix") or detail.get("montantTotalOffert") or course.get("montantPrix"),
                    "isQuinte": is_quinte,
                })
                with db:
                    db.execute(
                        """INSERT INTO races(race_id,race_date,meeting_num,course_num,hippodrome,country,discipline,name,distance,
                           start_time,declared_runners,status,is_final,arrival_json,course_json,updated_at)
                           VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                           ON CONFLICT(race_id) DO UPDATE SET hippodrome=excluded.hippodrome,country=excluded.country,
                           discipline=excluded.discipline,name=excluded.name,distance=excluded.distance,start_time=excluded.start_time,
                           declared_runners=excluded.declared_runners,status=excluded.status,is_final=excluded.is_final,
                           arrival_json=excluded.arrival_json,course_json=excluded.course_json,updated_at=excluded.updated_at""",
                        (race_id, iso_date, meeting_num, course_num, hippodrome, country, discipline, race_name, distance,
                         str(start_time) if start_time is not None else None, declared, status, int(final),
                         json_text(arrival) if arrival is not None else None, json_text(detail), utc_now()),
                    )
                    db.execute("DELETE FROM runners WHERE race_id=?", (race_id,))
                    for participant_index, participant in enumerate(participants, start=1):
                        horse_key, horse_id, horse_name = horse_identity(participant)
                        number = as_int(participant.get("numPmu") or participant.get("numero") or participant.get("num"))
                        rank = as_int(participant.get("ordreArrivee") or participant.get("rang"))
                        if rank is None and number is not None:
                            rank = ranks.get(number)
                        result_status = participant.get("statut") or participant.get("resultat")
                        non_runner = bool(participant.get("nonPartant") or participant.get("non_partant")) or "NON_PARTANT" in str(result_status or "").upper()
                        profile = {
                            "nom": horse_name,
                            "idCheval": horse_id,
                            "age": participant.get("age"),
                            "sexe": participant.get("sexe"),
                            "race": participant.get("race"),
                            "robe": participant.get("robe"),
                            "pere": participant.get("nomPere"),
                            "mere": participant.get("nomMere"),
                            "pereDeMere": participant.get("nomPereMere"),
                            "proprietaire": participant.get("proprietaire"),
                            "eleveur": participant.get("eleveur"),
                        }
                        db.execute(
                            "INSERT INTO horses(horse_key,horse_id,name,profile_json,updated_at) VALUES(?,?,?,?,?) "
                            "ON CONFLICT(horse_key) DO UPDATE SET horse_id=COALESCE(excluded.horse_id,horses.horse_id),"
                            "name=excluded.name,profile_json=excluded.profile_json,updated_at=excluded.updated_at",
                            (horse_key, horse_id, horse_name, json_text(profile), utc_now()),
                        )
                        form = participant.get("coursesPassees") or participant.get("performancesPassees") or participant.get("performances")
                        odds_obj = participant.get("dernierRapportDirect") or {}
                        odds = odds_obj.get("rapport") if isinstance(odds_obj, dict) else None
                        weight_raw = participant.get("handicapPoids")
                        weight = as_float(weight_raw)
                        if weight is not None and weight_raw is not None and float(weight_raw) > 100:
                            weight /= 10
                        db.execute(
                            """INSERT INTO runners(race_id,horse_key,horse_name,number,rank,result_status,non_runner,driver,trainer,
                               age,sex,weight,draw,odds,career_form_json,runner_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                            (race_id, horse_key, horse_name, number, rank, str(result_status) if result_status is not None else None,
                             int(non_runner), participant.get("driver"), participant.get("entraineur"), as_int(participant.get("age")),
                             participant.get("sexe"), weight, as_int(participant.get("placeCorde")), as_float(odds),
                             json_text(form) if form is not None else None, json_text(participant)),
                        )
                        result_participant = dict(participant)
                        if result_participant.get("rang") in (None, ""):
                            result_participant["rang"] = rank if rank is not None else result_status
                        performance_key = f"race:{race_id}:{horse_key}"
                        save_performance(
                            db, horse_key, performance_key, result_participant, "archive_race",
                            race_context, result_participant, race_id, declared or len(participants),
                        )
                        if isinstance(form, list):
                            for previous in form:
                                if not isinstance(previous, dict):
                                    continue
                                digest = hashlib.sha1(json_text(previous).encode("utf-8")).hexdigest()
                                save_performance(
                                    db, horse_key, f"snapshot:{horse_key}:{digest}", previous,
                                    "coursesPassees", runner_count=None,
                                )
                    save_raw(db, f"{race_id}:course", detail, keep_raw)
                    save_raw(db, f"{race_id}:participants", participants_payload, keep_raw)
                saved_races += 1

        day_status = "complete" if not failures and saved_races == planned_races else "partial"
        error_text = "\n".join(failures[:20]) if failures else None
        db.execute(
            "UPDATE import_days SET status=?,meetings_seen=?,races_seen=?,races_saved=?,last_error=?,updated_at=? WHERE race_date=?",
            (day_status, len(reunions), planned_races, saved_races, error_text, utc_now(), iso_date),
        )
        db.commit()
        return day_status, saved_races
    except Exception as exc:
        db.execute(
            "UPDATE import_days SET status='partial',last_error=?,updated_at=? WHERE race_date=?",
            (str(exc)[:2000], utc_now(), iso_date),
        )
        db.commit()
        return "partial", saved_races


def main() -> int:
    parser = argparse.ArgumentParser(description="Archive PMU races, official arrivals and starter records in SQLite.")
    parser.add_argument("--start", default="2018-01-01", help="Date de début ISO (défaut: 2018-01-01)")
    parser.add_argument("--end", default=date.today().isoformat(), help="Date de fin ISO (défaut: aujourd'hui)")
    parser.add_argument("--db", type=Path, default=DEFAULT_DB, help=f"Fichier SQLite (défaut: {DEFAULT_DB})")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL, help="Base URL de l'API PMU REST")
    parser.add_argument("--delay-seconds", type=float, default=0.75, help="Pause entre appels (défaut: 0,75 s)")
    parser.add_argument("--max-days", type=int, help="Limite facultative pour un premier lot")
    parser.add_argument("--force", action="store_true", help="Réimporte aussi les journées complètes")
    parser.add_argument("--omit-raw", action="store_true", help="Ne conserve pas les réponses JSON brutes")
    args = parser.parse_args()

    try:
        start = date.fromisoformat(args.start)
        end = date.fromisoformat(args.end)
        if end < start:
            raise ValueError("--end doit être supérieur ou égal à --start")
        if args.delay_seconds < 0:
            raise ValueError("--delay-seconds ne peut pas être négatif")
    except ValueError as exc:
        parser.error(str(exc))

    args.db.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(args.db)
    db.execute("PRAGMA journal_mode=WAL")
    db.execute("PRAGMA busy_timeout=30000")
    db.executescript(SCHEMA)
    # Migrate databases created by earlier importer versions.
    performance_columns = {row[1] for row in db.execute("PRAGMA table_info(horse_performances)")}
    for column in ("type_course", "valeur_handicap"):
        if column not in performance_columns:
            db.execute(f"ALTER TABLE horse_performances ADD COLUMN {column} TEXT")
    db.executescript(VIEWS)
    db.commit()

    current = start
    processed = 0
    totals = {"complete": 0, "empty": 0, "partial": 0, "skipped": 0, "races": 0}
    while current <= end and (args.max_days is None or processed < args.max_days):
        state, race_count = import_date(db, current, args.base_url, args.delay_seconds, not args.omit_raw, args.force)
        totals[state] = totals.get(state, 0) + 1
        totals["races"] += race_count
        if state != "skipped":
            processed += 1
        print(f"{current.isoformat()}  {state:8s}  courses sauvegardées: {race_count}", flush=True)
        current += timedelta(days=1)

    db.close()
    print("\nBilan:", json.dumps(totals, ensure_ascii=False))
    print(f"Base: {args.db.resolve()}")
    return 1 if totals["partial"] else 0


if __name__ == "__main__":
    sys.exit(main())
