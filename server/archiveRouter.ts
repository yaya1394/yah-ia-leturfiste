import express, { Request, Response } from 'express';
import { getArchiveDatabase, parseJson } from './archiveDatabase.js';

export const archiveRouter = express.Router();

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 250;

function queryString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function pagination(req: Request): { limit: number; offset: number } | null {
  const rawLimit = queryString(req.query.limit);
  const rawOffset = queryString(req.query.offset);
  const limit = rawLimit === undefined ? DEFAULT_LIMIT : Number(rawLimit);
  const offset = rawOffset === undefined ? 0 : Number(rawOffset);
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT || !Number.isInteger(offset) || offset < 0) return null;
  return { limit, offset };
}

function isoDate(value: unknown): string | undefined | null {
  const date = queryString(value);
  if (!date) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parsed = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === date ? date : null;
}

function archiveFailure(res: Response, error: unknown): void {
  const message = error instanceof Error ? error.message : 'Erreur de lecture de l’archive.';
  const unavailable = message.includes('Archive PMU absente');
  res.status(unavailable ? 503 : 500).json({ success: false, error: message });
}

archiveRouter.get('/status', (_req: Request, res: Response) => {
  try {
    const db = getArchiveDatabase();
    const status = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM races) AS races,
        (SELECT COUNT(*) FROM races WHERE is_final = 1) AS coursesDefinitives,
        (SELECT COUNT(*) FROM runners) AS partants,
        (SELECT COUNT(*) FROM horses) AS chevaux,
        (SELECT COUNT(*) FROM horse_performances) AS performances,
        (SELECT MIN(race_date) FROM races) AS premiereDate,
        (SELECT MAX(race_date) FROM races) AS derniereDate
    `).get();
    res.json({ success: true, archive: status });
  } catch (error) {
    archiveFailure(res, error);
  }
});

archiveRouter.get('/races', (req: Request, res: Response) => {
  const page = pagination(req);
  const from = isoDate(req.query.from);
  const to = isoDate(req.query.to);
  const finalFilter = queryString(req.query.final);
  if (!page) return res.status(400).json({ success: false, error: `Pagination invalide (limit: 1-${MAX_LIMIT}, offset: entier positif).` });
  if (from === null || to === null || (from && to && from > to)) {
    return res.status(400).json({ success: false, error: 'Dates invalides: utilisez from/to au format AAAA-MM-JJ et from ≤ to.' });
  }
  if (finalFilter !== undefined && !['true', 'false'].includes(finalFilter.toLowerCase())) {
    return res.status(400).json({ success: false, error: 'Le paramètre final doit valoir true ou false.' });
  }

  try {
    const db = getArchiveDatabase();
    const clauses: string[] = [];
    const params: Array<string | number> = [];
    if (from) { clauses.push('race_date >= ?'); params.push(from); }
    if (to) { clauses.push('race_date <= ?'); params.push(to); }
    const discipline = queryString(req.query.discipline);
    if (discipline) { clauses.push('discipline = ? COLLATE NOCASE'); params.push(discipline); }
    const hippodrome = queryString(req.query.hippodrome);
    if (hippodrome) { clauses.push('hippodrome LIKE ? COLLATE NOCASE'); params.push(`%${hippodrome}%`); }
    if (finalFilter !== undefined) { clauses.push('is_final = ?'); params.push(finalFilter.toLowerCase() === 'true' ? 1 : 0); }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const total = db.prepare(`SELECT COUNT(*) AS total FROM races ${where}`).get(...params) as { total: number };
    const races = db.prepare(`
      SELECT race_id AS id, race_date AS date, meeting_num AS reunion, course_num AS course,
             hippodrome, country, discipline, name, distance, start_time AS heureDepart,
             declared_runners AS partantsDeclares, status, is_final AS arriveeDefinitive, arrival_json
      FROM races ${where}
      ORDER BY race_date DESC, meeting_num, course_num
      LIMIT ? OFFSET ?
    `).all(...params, page.limit, page.offset).map((race: any) => ({
      ...race,
      arriveeDefinitive: Boolean(race.arriveeDefinitive),
      arrivee: parseJson(race.arrival_json, null),
      arrival_json: undefined,
    }));
    res.json({ success: true, total: total.total, limit: page.limit, offset: page.offset, races });
  } catch (error) {
    archiveFailure(res, error);
  }
});

archiveRouter.get('/races/:raceId', (req: Request, res: Response) => {
  try {
    const db = getArchiveDatabase();
    const race = db.prepare(`
      SELECT race_id AS id, race_date AS date, meeting_num AS reunion, course_num AS course,
             hippodrome, country, discipline, name, distance, start_time AS heureDepart,
             declared_runners AS partantsDeclares, status, is_final AS arriveeDefinitive,
             arrival_json, course_json
      FROM races WHERE race_id = ?
    `).get(req.params.raceId) as any;
    if (!race) return res.status(404).json({ success: false, error: 'Course introuvable.' });

    const partants = db.prepare(`
      SELECT r.horse_key AS chevalId, r.horse_name AS cheval, r.number AS numero,
             r.rank AS rang, r.result_status AS statut, r.non_runner AS nonPartant,
             r.driver AS driver, r.trainer AS entraineur, r.age, r.sex AS sexe,
             r.weight AS poids, r.draw AS corde, r.odds AS rapport, r.career_form_json
      FROM runners r WHERE r.race_id = ?
      ORDER BY CASE WHEN r.rank IS NULL THEN 1 ELSE 0 END, r.rank, r.number
    `).all(req.params.raceId).map((runner: any) => ({
      ...runner,
      nonPartant: Boolean(runner.nonPartant),
      coursesPassees: parseJson(runner.career_form_json, []),
      career_form_json: undefined,
    }));

    const response = {
      ...race,
      arriveeDefinitive: Boolean(race.arriveeDefinitive),
      arrivee: parseJson(race.arrival_json, null),
      donneesBrutes: parseJson(race.course_json, {}),
      partants,
    };
    res.json({ success: true, course: response });
  } catch (error) {
    archiveFailure(res, error);
  }
});

archiveRouter.get('/horses/:horse/performances', (req: Request, res: Response) => {
  const page = pagination(req);
  const from = isoDate(req.query.from);
  const to = isoDate(req.query.to);
  if (!page) return res.status(400).json({ success: false, error: `Pagination invalide (limit: 1-${MAX_LIMIT}, offset: entier positif).` });
  if (from === null || to === null || (from && to && from > to)) {
    return res.status(400).json({ success: false, error: 'Dates invalides: utilisez from/to au format AAAA-MM-JJ et from ≤ to.' });
  }

  try {
    const db = getArchiveDatabase();
    const clauses = ['(hp.horse_key = ? OR h.horse_id = ? OR h.name = ? COLLATE NOCASE)'];
    const params: Array<string | number> = [req.params.horse, req.params.horse, req.params.horse];
    if (from) { clauses.push('hp.date >= ?'); params.push(from); }
    if (to) { clauses.push('hp.date <= ?'); params.push(to); }
    const discipline = queryString(req.query.discipline);
    if (discipline) { clauses.push('hp.specialite = ? COLLATE NOCASE'); params.push(discipline); }
    const where = `WHERE ${clauses.join(' AND ')}`;
    const total = db.prepare(`
      SELECT COUNT(*) AS total FROM horse_performances hp
      JOIN horses h ON h.horse_key = hp.horse_key ${where}
    `).get(...params) as { total: number };
    const horse = db.prepare(`
      SELECT horse_key AS id, horse_id AS identifiantPmu, name AS nom
      FROM horses WHERE horse_key = ? OR horse_id = ? OR name = ? COLLATE NOCASE
      LIMIT 1
    `).get(req.params.horse, req.params.horse, req.params.horse);
    if (!horse) return res.status(404).json({ success: false, error: 'Cheval introuvable.' });
    const rows = db.prepare(`
      SELECT hp.date AS Date, hp.hippodrome AS Hippodrome, hp.specialite AS "Spé.",
             hp.distance AS Distance, hp.partants AS "Par.", hp.corde AS Corde,
             hp.auto AS Auto, hp.surface AS Surface, hp.categorie AS "Cat.",
             hp.allocation AS Allocation, hp.driver AS Driver, hp.artifice AS "Art.",
             hp.reduction_km AS "Red.km", hp.rapport AS "Rap.", hp.quinte AS "Quinté",
             hp.rang AS Rang, hp.type_course AS Type, hp.valeur_handicap AS VH,
             hp.source AS source, hp.race_id AS courseId
      FROM horse_performances hp
      JOIN horses h ON h.horse_key = hp.horse_key ${where}
      ORDER BY hp.date DESC, hp.performance_key
      LIMIT ? OFFSET ?
    `).all(...params, page.limit, page.offset) as any[];
    const performances = rows.map((row) => {
      const isGalop = ['PLAT', 'OBSTACLE', 'HAIES', 'STEEPLE-CHASE', 'CROSS'].includes(String(row['Spé.'] || '').toUpperCase());
      const fiche = isGalop
        ? {
            Date: row.Date, Hippodrome: row.Hippodrome, 'Spé.': row['Spé.'], Distance: row.Distance,
            'Par.': row['Par.'], Corde: row.Corde, Terrain: row.Surface, Type: row.Type,
            Allocation: row.Allocation, Jockey: row.Driver, 'Art.': row['Art.'], VH: row.VH,
            'Rap.': row['Rap.'], 'Quinté': row['Quinté'], Rang: row.Rang,
          }
        : {
            Date: row.Date, Hippodrome: row.Hippodrome, 'Spé.': row['Spé.'], Distance: row.Distance,
            'Par.': row['Par.'], Corde: row.Corde, Auto: row.Auto, Surface: row.Surface,
            'Cat.': row['Cat.'], Allocation: row.Allocation, Driver: row.Driver, 'Art.': row['Art.'],
            'Red.km': row['Red.km'], 'Rap.': row['Rap.'], 'Quinté': row['Quinté'], Rang: row.Rang,
          };
      return { fiche, source: row.source, courseId: row.courseId };
    });
    res.json({
      success: true,
      cheval: horse,
      total: total.total,
      limit: page.limit,
      offset: page.offset,
      performances,
    });
  } catch (error) {
    archiveFailure(res, error);
  }
});
