import React, { useState, useEffect } from 'react';
import { Course, Reunion, Participant } from './types/turf';
import { HorseDetailModal } from './components/HorseDetailModal';
import {
  Trophy,
  Calendar,
  Clock,
  MapPin,
  Award,
  ArrowRight,
  Sparkles,
  Info,
  CheckCircle2,
  CalendarDays,
  History,
  Radio,
  ChevronDown
} from 'lucide-react';

export default function App() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentDateStr, setCurrentDateStr] = useState<string>('');
  
  const [reunions, setReunions] = useState<Reunion[]>([]);
  const [selectedReunionNum, setSelectedReunionNum] = useState<number>(1);
  const [selectedCourseNum, setSelectedCourseNum] = useState<number>(1);
  
  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [modalHorse, setModalHorse] = useState<Participant | null>(null);

  // Date formatting helpers
  const toDDMMYYYY = (d: Date): string => {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear());
    return `${day}${month}${year}`;
  };

  const toYYYYMMDD = (d: Date): string => {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear());
    return `${year}-${month}-${day}`;
  };

  const formatFrenchLong = (d: Date): string => {
    const jours = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const mois = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    return `${jours[d.getDay()]} ${d.getDate()} ${mois[d.getMonth()]} ${d.getFullYear()}`;
  };

  const formatFrenchShort = (d: Date): string => {
    const jours = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'];
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${jours[d.getDay()]} ${day}/${month}`;
  };

  const isSameDay = (d1: Date, d2: Date): boolean => {
    return d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
  };

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const isSelectedToday = isSameDay(selectedDate, today);
  const isSelectedYesterday = isSameDay(selectedDate, yesterday);
  const isSelectedTomorrow = isSameDay(selectedDate, tomorrow);
  const isPastDate = selectedDate.getTime() < new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

  // Load programme whenever selectedDate changes
  useEffect(() => {
    const dStr = toDDMMYYYY(selectedDate);
    setCurrentDateStr(dStr);
    fetchProgramme(dStr);
  }, [selectedDate]);

  const fetchProgramme = async (dStr: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/programme?date=${dStr}`);
      const data = await res.json();
      if (data.success && data.reunions && data.reunions.length > 0) {
        setReunions(data.reunions);
        const r1 = data.reunions[0];
        setSelectedReunionNum(r1.numOfficiel);
        const c1 = r1.courses[0];
        setSelectedCourseNum(c1.numOfficiel);
        await fetchCourseDetail(r1.numOfficiel, c1.numOfficiel, dStr);
      }
    } catch (err) {
      console.error('Error fetching programme:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCourseDetail = async (rNum: number, cNum: number, dStr?: string) => {
    setIsLoading(true);
    const d = dStr || currentDateStr;
    try {
      const res = await fetch(`/api/course/${rNum}/${cNum}?date=${d}`);
      const data = await res.json();
      if (data.success && data.course) {
        setCourse(data.course);
      }
    } catch (err) {
      console.error('Error fetching course:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectReunion = (rNum: number) => {
    setSelectedReunionNum(rNum);
    const reunion = reunions.find((r) => r.numOfficiel === rNum);
    if (reunion && reunion.courses.length > 0) {
      const cNum = reunion.courses[0].numOfficiel;
      setSelectedCourseNum(cNum);
      fetchCourseDetail(rNum, cNum, toDDMMYYYY(selectedDate));
    }
  };

  const handleSelectCourse = (cNum: number) => {
    setSelectedCourseNum(cNum);
    fetchCourseDetail(selectedReunionNum, cNum, toDDMMYYYY(selectedDate));
  };

  const handleSelectCourseDropdown = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cNum = parseInt(e.target.value, 10);
    handleSelectCourse(cNum);
  };

  const handleDatePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) return;
    const [y, m, d] = e.target.value.split('-').map(Number);
    if (y && m && d) {
      setSelectedDate(new Date(y, m - 1, d));
    }
  };

  const currentReunion = reunions.find((r) => r.numOfficiel === selectedReunionNum) || reunions[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Equidia-inspired Header Navbar with Interactive Calendar */}
      <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 px-4 lg:px-8 py-3.5 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-4">
          
          {/* Brand */}
          <div className="flex items-center gap-2.5 self-start lg:self-auto">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-lg">
              <Trophy className="w-5 h-5 text-emerald-100" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-white flex items-center gap-1.5">
                Yah.IA<span className="text-emerald-400">.EquidiaLive</span>
              </span>
              <div className="text-[10px] font-mono text-slate-400">Programme Officiel PMU & Archives Réelles</div>
            </div>
          </div>

          {/* Interactive Calendar Controls (Hier, Aujourd'hui, Demain + DatePicker) */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-start lg:justify-end">
            
            {/* Quick buttons */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              {/* Hier */}
              <button
                onClick={() => setSelectedDate(yesterday)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelectedYesterday
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Hier ({formatFrenchShort(yesterday)})</span>
              </button>

              {/* Aujourd'hui */}
              <button
                onClick={() => setSelectedDate(today)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelectedToday
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Radio className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                <span>Aujourd'hui ({formatFrenchShort(today)})</span>
              </button>

              {/* Demain */}
              <button
                onClick={() => setSelectedDate(tomorrow)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelectedTomorrow
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Demain ({formatFrenchShort(tomorrow)})</span>
              </button>
            </div>

            {/* Native Date Picker to load ANY date from 2021 to 2026 */}
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
              <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
              <label htmlFor="calendar-picker" className="text-xs font-semibold text-slate-300 whitespace-nowrap cursor-pointer">
                Calendrier :
              </label>
              <input
                id="calendar-picker"
                type="date"
                min="2021-01-01"
                max="2026-12-31"
                value={toYYYYMMDD(selectedDate)}
                onChange={handleDatePickerChange}
                className="bg-transparent text-white text-xs font-mono font-bold outline-none cursor-pointer [color-scheme:dark]"
              />
            </div>

          </div>

        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6 space-y-6">
        
        {/* Date Status Banner with Real Information */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-800 text-emerald-400 border border-slate-700">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-mono text-slate-400">Date officielle sélectionnée :</div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>{formatFrenchLong(selectedDate)}</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
                  {toDDMMYYYY(selectedDate).slice(0, 2)}/{toDDMMYYYY(selectedDate).slice(2, 4)}/{toDDMMYYYY(selectedDate).slice(4, 8)}
                </span>
              </h2>
            </div>
          </div>

          <div>
            {isPastDate ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Archive PMU / Equidia (Courses terminées avec arrivées officielles)</span>
              </span>
            ) : isSelectedToday ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>Courses du Jour en Direct (R1C1 chargée par défaut)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Programme Officiel à venir (Partants déclarés)</span>
              </span>
            )}
          </div>
        </div>

        {/* Programme Réunions PMU (R1, R2, R3, R4, R5...) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <Award className="w-4 h-4 text-emerald-400" />
              <span>
                Réunions Officielles PMU {isSelectedToday ? 'du Jour' : isSelectedYesterday ? "d'Hier" : isSelectedTomorrow ? 'de Demain' : `du ${formatFrenchShort(selectedDate)}`} ({reunions.length} Réunions)
              </span>
            </span>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              Programme Officiel PMU / Equidia
            </span>
          </div>

          {/* Boutons Réunions R1, R2, R3... */}
          <div className="flex flex-wrap items-center gap-2">
            {reunions.map((r, rIdx) => {
              const isSelected = r.numOfficiel === selectedReunionNum;
              const hasQuinte = r.courses?.some((c) => c.isQuinte);
              return (
                <button
                  key={`reunion-tab-${r.numOfficiel}-${rIdx}`}
                  onClick={() => handleSelectReunion(r.numOfficiel)}
                  className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-md ring-1 ring-emerald-500/30'
                      : 'bg-slate-950 text-slate-300 border border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  <span className={`px-2 py-0.5 rounded font-mono font-bold ${
                    isSelected ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 text-white'
                  }`}>
                    R{r.numOfficiel}
                  </span>
                  <span className="truncate max-w-[140px] sm:max-w-[200px] font-semibold">{r.nomHippodrome}</span>
                  <span className="text-[10px] text-slate-400 font-mono">({r.courses?.length || 8}C)</span>
                  {hasQuinte && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                      ★ Quinté+
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Courses de la réunion sélectionnée (Sélecteur rapide d'onglets C1, C2, C3...) */}
          {currentReunion && (
            <div className="pt-3 border-t border-slate-800/80">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] font-mono uppercase text-slate-400 font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  Courses de R{selectedReunionNum} ({currentReunion.nomHippodrome}) :
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  {currentReunion.disciplinePrincipale} · {currentReunion.pays}
                </span>
              </div>

              {/* Onglets rapides des courses */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                {currentReunion.courses.map((c, cIdx) => {
                  const isCourseSelected = c.numOfficiel === selectedCourseNum;
                  return (
                    <button
                      key={`course-tab-${c.numOfficiel}-${cIdx}`}
                      onClick={() => handleSelectCourse(c.numOfficiel)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                        isCourseSelected
                          ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                          : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'
                      }`}
                    >
                      <span className="font-mono">C{c.numOfficiel}</span>
                      <span className={`text-[10px] ${isCourseSelected ? 'text-slate-900 font-bold' : 'text-slate-400 font-mono'}`}>
                        {c.heureDepart}
                      </span>
                      {c.isQuinte && (
                        <span className={`text-[10px] ${isCourseSelected ? 'text-amber-950 font-black' : 'text-amber-400 font-bold'}`}>
                          ★
                        </span>
                      )}
                      {c.isArriveeDefinitive && (
                        <span className={`w-1.5 h-1.5 rounded-full ${isCourseSelected ? 'bg-slate-950' : 'bg-emerald-400'}`}></span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Course Dropdown Menu (Liste déroulante détaillée des courses) */}
        {currentReunion && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
              <span className="text-xs font-bold text-slate-300 whitespace-nowrap">
                Détail de la course :
              </span>
              <select
                value={selectedCourseNum}
                onChange={handleSelectCourseDropdown}
                className="bg-slate-950 border border-slate-700 text-white text-xs sm:text-sm font-semibold rounded-xl px-3 py-2 outline-none focus:border-emerald-500 flex-1 max-w-xl cursor-pointer"
              >
                {currentReunion.courses.map((c, cIdx) => (
                  <option key={`course-opt-${c.numOfficiel}-${cIdx}`} value={c.numOfficiel}>
                    C{c.numOfficiel} · {c.nom} — {c.heureDepart} ({c.distance}m · {c.discipline} · {c.isQuinte ? '★ QUINTÉ+' : `${c.allocation.toLocaleString('fr-FR')} €`})
                  </option>
                ))}
              </select>
            </div>

            {isLoading && (
              <div className="text-xs text-emerald-400 font-mono flex items-center gap-2 shrink-0">
                <Sparkles className="w-4 h-4 animate-spin" />
                Actualisation des partants et cotes...
              </div>
            )}
          </div>
        )}

        {/* Race Details Header (Nom du prix, allocation, distance, partants, heure de départ) */}
        {course && (
          <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <div className="text-xs font-mono text-emerald-400 font-semibold mb-1 flex items-center gap-2">
                  <span>Réunion {course.reunionNum} · Course {course.courseNum} · {course.hippodrome}</span>
                  <span>·</span>
                  <span className="text-slate-400">{toDDMMYYYY(selectedDate).slice(0, 2)}/{toDDMMYYYY(selectedDate).slice(2, 4)}/{toDDMMYYYY(selectedDate).slice(4, 8)}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {course.nom}
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold font-mono flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Départ à {course.heureDepart}
                </span>
                {course.isQuinte && (
                  <span className="px-3 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold shadow">
                    ★ QUINTÉ+
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center font-mono">
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80">
                <div className="text-[10px] text-slate-400 uppercase">Allocation Totale</div>
                <div className="text-base sm:text-lg font-black text-emerald-400 mt-0.5">
                  {course.allocationTotale ? `${course.allocationTotale.toLocaleString('fr-FR')} €` : '—'}
                </div>
              </div>

              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80">
                <div className="text-[10px] text-slate-400 uppercase">Distance & Piste</div>
                <div className="text-base sm:text-lg font-black text-white mt-0.5">
                  {course.distance} mètres ({course.surfacePiste})
                </div>
              </div>

              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80">
                <div className="text-[10px] text-slate-400 uppercase">Partants Engagés</div>
                <div className="text-base sm:text-lg font-black text-cyan-400 mt-0.5">
                  {course.nbPartants} chevaux
                </div>
              </div>

              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80">
                <div className="text-[10px] text-slate-400 uppercase">Discipline & Corde</div>
                <div className="text-base sm:text-lg font-black text-amber-300 mt-0.5">
                  {course.discipline} · {course.corde}
                </div>
              </div>
            </div>

            {/* Official Arrival Banner if Race is Finished / Past */}
            {course.ordreArrivee && course.ordreArrivee.length > 0 && (
              <div className="p-3.5 bg-slate-950 rounded-xl border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <span className="text-xs font-black text-white uppercase tracking-wider">
                      Arrivée Définitive Officielle :
                    </span>
                    <span className="text-xs text-slate-400 ml-1.5 font-mono">
                      (Ordre d'arrivée validé PMU / Equidia)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 font-mono">
                  {course.ordreArrivee.slice(0, 5).map((numPmu, rankIdx) => {
                    const p = course.participants.find((part) => part.numPmu === numPmu);
                    const rankLabels = ['1er', '2e', '3e', '4e', '5e'];
                    const rankColors = [
                      'bg-emerald-500 text-slate-950 ring-2 ring-emerald-300',
                      'bg-cyan-500 text-slate-950 ring-1 ring-cyan-300',
                      'bg-amber-400 text-slate-950 ring-1 ring-amber-300',
                      'bg-blue-600 text-white',
                      'bg-slate-700 text-white',
                    ];

                    return (
                      <div key={`arr-badge-${rankIdx}-${numPmu}`} className="flex flex-col items-center">
                        <span className="text-[9px] font-bold text-slate-400">{rankLabels[rankIdx]}</span>
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shadow-md ${rankColors[rankIdx]}`}
                          title={`N°${numPmu} ${p?.nom || ''}`}
                        >
                          {numPmu}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Participants Table (Tableau des partants - click horse name to open history modal) */}
        {course && course.participants && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Tableau Officiel des Partants</span>
                <span className="text-xs font-mono text-slate-400">({course.participants.length} engagés)</span>
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                Cliquez sur le nom d'un cheval pour ouvrir sa fiche complète et l'historique chronologique
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-950/40">
                    <th className="py-3 px-3 sm:px-4 text-center w-14">N°</th>
                    <th className="py-3 px-3 sm:px-4">Cheval & Origines</th>
                    <th className="py-3 px-3 sm:px-4">Driver / Jockey</th>
                    <th className="py-3 px-3 sm:px-4">Entraîneur</th>
                    <th className="py-3 px-3 sm:px-4 font-mono text-amber-300">Musique</th>
                    <th className="py-3 px-3 sm:px-4 text-right">Gains Carrière</th>
                    <th className="py-3 px-3 sm:px-4 text-right">Cote PMU</th>
                    <th className="py-3 px-3 sm:px-4 text-center w-28">Fiche & Historique</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {course.participants.map((p, pIdx) => {
                    const cote = p.dernierRapportDirect?.rapport;
                    return (
                      <tr key={`partant-row-${p.numPmu}-${pIdx}`} className="hover:bg-slate-800/50 transition-colors">
                        <td className="py-3.5 px-3 sm:px-4 text-center">
                          {p.urlCasaque ? (
                            <div className="relative inline-flex items-center justify-center">
                              <img
                                src={p.urlCasaque}
                                alt={`Casaque ${p.numPmu}`}
                                className="w-8 h-8 object-contain"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                              <span className="absolute -bottom-1 -right-1 text-[9px] font-bold bg-slate-950/90 border border-slate-700 text-white rounded-full w-4 h-4 flex items-center justify-center shadow">
                                {p.numPmu}
                              </span>
                            </div>
                          ) : (
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-white text-xs shadow mx-auto"
                              style={{ backgroundColor: p.casaqueCouleur || '#475569' }}
                            >
                              {p.numPmu}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-3 sm:px-4">
                          <button
                            onClick={() => setModalHorse(p)}
                            className="font-bold text-white hover:text-emerald-400 transition-colors text-left flex items-center gap-1.5 cursor-pointer group"
                          >
                            <span className="group-underline">{p.nom}</span>
                            <Info className="w-3.5 h-3.5 text-emerald-400/70 group-hover:text-emerald-400" />
                          </button>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {p.sexe === 'M' ? 'Mâle' : p.sexe === 'F' ? 'Femelle' : 'Hongre'} de {p.age} ans
                            {p.poids ? ` · ${p.poids} kg` : ''}
                            {p.corde ? ` · Corde ${p.corde}` : ''}
                            {p.pere ? ` · (${p.pere} × ${p.mere})` : ''}
                            {p.deferre === 'DEFERRE_ANTERIEURS_POSTERIEURS' ? ' · D4' : p.deferre === 'DEFERRE_ANTERIEURS' ? ' · DA' : ''}
                          </div>
                        </td>

                        <td className="py-3.5 px-3 sm:px-4 font-medium text-slate-200">
                          {p.driver}
                        </td>

                        <td className="py-3.5 px-3 sm:px-4 text-slate-300">
                          {p.entraineur}
                        </td>

                        <td className="py-3.5 px-3 sm:px-4 font-mono text-amber-300 font-bold">
                          {p.musique}
                        </td>

                        <td className="py-3.5 px-3 sm:px-4 text-right font-mono text-slate-200">
                          {p.gainsParticipant?.gainsCarriere ? `${Math.round(p.gainsParticipant.gainsCarriere).toLocaleString('fr-FR')} €` : '—'}
                        </td>

                        <td className="py-3.5 px-3 sm:px-4 text-right font-mono text-emerald-400 font-bold">
                          {cote ? `${cote.toFixed(1)}/1` : '—'}
                        </td>

                        <td className="py-3.5 px-3 sm:px-4 text-center">
                          <button
                            onClick={() => setModalHorse(p)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all cursor-pointer inline-flex items-center gap-1 shadow-sm"
                          >
                            <span>Fiche</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Horse Detail Modal with Chronological History (DD/MM/YYYY) */}
        {modalHorse && (
          <HorseDetailModal
            horse={modalHorse}
            onClose={() => setModalHorse(null)}
            onToggleInTicket={() => {}}
            isSelectedInTicket={false}
          />
        )}

      </main>
    </div>
  );
}
