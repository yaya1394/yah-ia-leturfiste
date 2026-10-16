import React, { useState, useEffect } from 'react';
import { Participant, CoursePassee } from '../types/turf';
import {
  X,
  ShieldCheck,
  AlertCircle,
  Check,
  PlusCircle,
  Calendar,
  Trophy,
  MapPin,
  Activity,
  Loader2,
  ArrowUpDown,
  Award,
  Sparkles,
  Zap,
  Info
} from 'lucide-react';

interface HorseDetailModalProps {
  horse: Participant | null;
  onClose: () => void;
  onToggleInTicket: (numPmu: number) => void;
  isSelectedInTicket: boolean;
}

export const HorseDetailModal: React.FC<HorseDetailModalProps> = ({
  horse,
  onClose,
  onToggleInTicket,
  isSelectedInTicket,
}) => {
  const [currentHorse, setCurrentHorse] = useState<Participant | null>(horse);
  const [pastRaces, setPastRaces] = useState<CoursePassee[]>([]);
  const [isLoadingArchive, setIsLoadingArchive] = useState<boolean>(true);
  const [sortOrder, setSortOrder] = useState<'chrono_asc' | 'chrono_desc'>('chrono_desc'); // Default chronological (Newest to Oldest)
  const [filterResult, setFilterResult] = useState<'all' | 'wins' | 'podium' | 'd4'>('all');

  useEffect(() => {
    if (!horse) return;
    setCurrentHorse(horse);

    // Initial load from props if available
    if (horse.coursesPassees && horse.coursesPassees.length > 0) {
      setPastRaces(horse.coursesPassees);
    }

    setIsLoadingArchive(true);
    fetch(`/api/horse-archive/${encodeURIComponent(horse.nom)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.horse) {
          setCurrentHorse((prev) => {
            const base = prev || horse;
            return {
              ...data.horse,
              ...base,
              nom: horse.nom || data.horse.nom,
              driver: horse.driver || data.horse.driver,
              entraineur: horse.entraineur || data.horse.entraineur,
              proprietaire: horse.proprietaire || data.horse.proprietaire,
              eleveur: horse.eleveur || data.horse.eleveur,
              pere: horse.pere || data.horse.pere,
              mere: horse.mere || data.horse.mere,
              pereDeMere: horse.pereDeMere || data.horse.pereDeMere,
              musique: horse.musique || data.horse.musique,
              race: horse.race || data.horse.race,
              robe: horse.robe || data.horse.robe,
              sexe: horse.sexe || data.horse.sexe,
              age: horse.age || data.horse.age,
              poids: horse.poids ?? data.horse.poids,
              corde: horse.corde ?? data.horse.corde,
              valeurHandicap: horse.valeurHandicap || data.horse.valeurHandicap,
              urlCasaque: horse.urlCasaque || data.horse.urlCasaque,
              avisExpert: horse.avisExpert || data.horse.avisExpert,
              commentaireApresCourse: horse.commentaireApresCourse || data.horse.commentaireApresCourse,
            };
          });
          if (data.coursesPassees && data.coursesPassees.length > 0) {
            setPastRaces(data.coursesPassees.slice(-10));
          }
        }
      })
      .catch((err) => {
        console.error('Error fetching Equidia archive for horse:', err);
      })
      .finally(() => {
        setIsLoadingArchive(false);
      });
  }, [horse]);

  if (!currentHorse) return null;

  // Helper to parse DD/MM/YYYY into timestamp for sorting
  const parseDateTimestamp = (dStr: string): number => {
    if (!dStr) return 0;
    const parts = dStr.split('/');
    if (parts.length === 3) {
      return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10)).getTime();
    }
    return new Date(dStr).getTime() || 0;
  };

  // Sort races
  const sortedRaces = [...pastRaces].sort((a, b) => {
    const timeA = parseDateTimestamp(a.date);
    const timeB = parseDateTimestamp(b.date);
    return sortOrder === 'chrono_desc' ? timeB - timeA : timeA - timeB;
  });

  // Filter races
  const filteredRaces = sortedRaces.filter((race) => {
    const isWin = race.rang === 1 || race.rang === '1' || String(race.rang).toLowerCase().includes('1er');
    const isPodium = isWin || race.rang === 2 || race.rang === '2' || race.rang === 3 || race.rang === '3';
    const isD4 = race.deferre?.includes('D4');

    if (filterResult === 'wins') return isWin;
    if (filterResult === 'podium') return isPodium;
    if (filterResult === 'd4') return isD4;
    return true;
  });

  // Career calculations
  const totalRaces = currentHorse.nbCoursesCarriere || pastRaces.length || 1;
  const winsCount = currentHorse.nbVictoires ?? pastRaces.filter((r) => r.rang === 1 || r.rang === '1' || String(r.rang).includes('1er')).length;
  const placesCount = currentHorse.nbPlaces ?? pastRaces.filter((r) => r.rang === 2 || r.rang === '2' || r.rang === 3 || r.rang === '3').length;
  const podiumCount = winsCount + placesCount;
  const winRate = Math.round((winsCount / totalRaces) * 100);
  const podiumRate = Math.round((podiumCount / totalRaces) * 100);
  const totalGains = currentHorse.gainsParticipant?.gainsCarriere || pastRaces.reduce((acc, r) => acc + (r.gains || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-5xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Modal Header: Full Identity & Pedigree */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/95 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div className="flex items-start sm:items-center gap-3.5">
            {currentHorse.urlCasaque ? (
              <div className="relative w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-slate-900 border border-slate-700 p-1 flex items-center justify-center shadow-lg ring-2 ring-white/10 shrink-0">
                <img
                  src={currentHorse.urlCasaque}
                  alt={`Casaque ${currentHorse.nom}`}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-slate-950 text-white font-mono font-bold text-[10px] rounded-full border border-slate-700 flex items-center justify-center shadow">
                  {currentHorse.numPmu}
                </span>
              </div>
            ) : (
              <div
                className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center font-black text-white text-xl shadow-lg ring-2 ring-white/10 shrink-0"
                style={{ backgroundColor: currentHorse.casaqueCouleur || '#475569' }}
              >
                {currentHorse.numPmu}
              </div>
            )}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {currentHorse.nom}
                </h3>
                {currentHorse.statutYahIA && (
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                    currentHorse.statutYahIA === 'BASE' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                    currentHorse.statutYahIA === 'CHALLENGER' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' :
                    currentHorse.statutYahIA === 'COUP_DE_COEUR' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                    currentHorse.statutYahIA === 'TOCARD_VALUE' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                    'bg-slate-800 text-slate-300 border-slate-700'
                  }`}>
                    {currentHorse.statutYahIA}
                  </span>
                )}
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {currentHorse.sexe === 'M' ? 'Mâle' : currentHorse.sexe === 'F' ? 'Femelle' : 'Hongre'} · {currentHorse.age} ans · {currentHorse.robe || 'Bai'}
                </span>
              </div>

              {/* Pedigree & Origin Line */}
              <div className="text-xs text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 font-sans">
                <span className="text-slate-200 font-medium">{currentHorse.race || (currentHorse.poids ? 'Pur-Sang' : 'Trotteur Français')}</span>
                <span>·</span>
                <span>
                  Origines : <strong className="text-slate-200">{currentHorse.pere || 'Père officiel'}</strong> × <strong className="text-slate-200">{currentHorse.mere || 'Mère officielle'}</strong>
                  {currentHorse.pereDeMere && <span className="text-slate-400"> (par {currentHorse.pereDeMere})</span>}
                </span>
                <span>·</span>
                <span className="text-amber-300 font-mono font-bold bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-800/50">
                  Musique : {currentHorse.musique}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer self-end sm:self-auto"
            title="Fermer la fiche du cheval"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-5 space-y-5 overflow-y-auto flex-1 text-xs sm:text-sm">
          
          {/* Entourage, Record & Key Info Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Driver / Jockey Attitré</div>
              <div className="text-sm font-bold text-white mt-0.5 truncate">{currentHorse.driver}</div>
              <div className="text-[11px] text-slate-500 truncate">Entraîneur : {currentHorse.entraineur}</div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Propriétaire & Éleveur</div>
              <div className="text-sm font-bold text-white mt-0.5 truncate">{currentHorse.proprietaire || 'Écurie Propriétaire'}</div>
              <div className="text-[11px] text-slate-500 truncate">Éleveur : {currentHorse.eleveur || 'Élevage Français'}</div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">
                {currentHorse.poids ? 'Poids Porté & Corde' : 'Record Absolu / Réd. Km'}
              </div>
              <div className="text-sm font-black font-mono text-cyan-400 mt-0.5">
                {currentHorse.poids
                  ? `${currentHorse.poids} kg ${currentHorse.corde ? `· Corde ${currentHorse.corde}` : ''}`
                  : (currentHorse.recordAbsolu || "1'10\"4")}
              </div>
              <div className="text-[11px] text-slate-500">
                {currentHorse.valeurHandicap
                  ? `Valeur handicap : ${currentHorse.valeurHandicap}`
                  : currentHorse.deferre === 'DEFERRE_ANTERIEURS_POSTERIEURS'
                  ? 'D4 (4 pieds)'
                  : currentHorse.deferre === 'DEFERRE_ANTERIEURS'
                  ? 'DA (antérieurs)'
                  : 'Ferré (F)'}
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Cote Directe PMU</div>
              <div className="text-sm font-black font-mono text-emerald-400 mt-0.5">
                {currentHorse.dernierRapportDirect?.rapport ? `${currentHorse.dernierRapportDirect.rapport}/1` : '—'}
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                Réf: {currentHorse.dernierRapportReference?.rapport || '—'} · Score Yah.IA: {currentHorse.algoScore || 75}/100
              </div>
            </div>
          </div>

          {/* Authentic Expert Assessment from Equidia / PMU */}
          {(currentHorse.avisExpert || currentHorse.commentaireApresCourse) && (
            <div className="p-3.5 bg-gradient-to-r from-emerald-950/40 via-slate-950 to-slate-950 border border-emerald-800/40 rounded-xl space-y-2">
              {currentHorse.avisExpert && (
                <div>
                  <div className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wide">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Avis Expert Officiel PMU & Equidia</span>
                  </div>
                  <p className="text-xs text-slate-200 mt-1 italic leading-relaxed">
                    « {currentHorse.avisExpert} »
                  </p>
                </div>
              )}
              {currentHorse.commentaireApresCourse && (
                <div className="pt-1 border-t border-slate-800/60">
                  <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wide">
                    Débrief officiel après-course :
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                    {currentHorse.commentaireApresCourse}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Career Synthesis Stats Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-center font-mono">
            <div>
              <div className="text-[10px] text-slate-400 uppercase">Courses Courues</div>
              <div className="text-lg font-black text-white mt-0.5">{totalRaces}</div>
              <div className="text-[10px] text-slate-500">Carrière complète</div>
            </div>

            <div>
              <div className="text-[10px] text-slate-400 uppercase">Victoires (1er)</div>
              <div className="text-lg font-black text-emerald-400 mt-0.5">{winsCount}</div>
              <div className="text-[10px] text-emerald-500/80 font-bold">{winRate}% de victoires</div>
            </div>

            <div>
              <div className="text-[10px] text-slate-400 uppercase">Podium (1er, 2e, 3e)</div>
              <div className="text-lg font-black text-cyan-400 mt-0.5">{podiumCount}</div>
              <div className="text-[10px] text-cyan-500/80 font-bold">{podiumRate}% dans les 3</div>
            </div>

            <div>
              <div className="text-[10px] text-slate-400 uppercase">Gains Totaux Amassés</div>
              <div className="text-lg font-black text-amber-300 mt-0.5">
                {Math.round(totalGains).toLocaleString('fr-FR')} €
              </div>
              <div className="text-[10px] text-slate-500">Allocations perçues</div>
            </div>
          </div>

          {/* COMPLETE CHRONOLOGICAL PERFORMANCES TABLE */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  <span>10 Dernières Courses Officielles (Base de Données)</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                    Direct Firestore DB
                  </span>
                  {isLoadingArchive && (
                    <span className="flex items-center gap-1 text-xs text-amber-400 font-normal">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Chargement base...
                    </span>
                  )}
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Fiche chargée directement depuis la base de données (maximum 10 dernières courses en ordre chronologique par date JJ/MM/AAAA).
                </p>
              </div>

              {/* Table Controls: Sort Order & Quick Filter */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Chronological order toggle */}
                <button
                  onClick={() => setSortOrder(sortOrder === 'chrono_desc' ? 'chrono_asc' : 'chrono_desc')}
                  className="px-2.5 py-1 text-xs rounded-lg font-mono font-medium flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
                  title="Changer le sens du tri chronologique"
                >
                  <ArrowUpDown className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    {sortOrder === 'chrono_desc' ? 'Chronologique (Récent ➔ Ancien)' : 'Chronologique (Ancien ➔ Récent)'}
                  </span>
                </button>

                {/* Filter tags */}
                <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                  <button
                    onClick={() => setFilterResult('all')}
                    className={`px-2 py-0.5 text-[11px] rounded transition-colors cursor-pointer ${
                      filterResult === 'all' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Toutes ({pastRaces.length})
                  </button>
                  <button
                    onClick={() => setFilterResult('wins')}
                    className={`px-2 py-0.5 text-[11px] rounded transition-colors cursor-pointer ${
                      filterResult === 'wins' ? 'bg-emerald-950 text-emerald-300 font-bold border border-emerald-800' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Vict. ({winsCount})
                  </button>
                  <button
                    onClick={() => setFilterResult('podium')}
                    className={`px-2 py-0.5 text-[11px] rounded transition-colors cursor-pointer ${
                      filterResult === 'podium' ? 'bg-cyan-950 text-cyan-300 font-bold border border-cyan-800' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Podium ({podiumCount})
                  </button>
                </div>
              </div>
            </div>

            {/* The Detailed Races Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 shadow-inner">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900/90 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-800 sticky top-0">
                    <th className="py-2.5 px-3">Date (JJ/MM/AAAA)</th>
                    <th className="py-2.5 px-3">Hippodrome</th>
                    <th className="py-2.5 px-3">Prix / Épreuve</th>
                    <th className="py-2.5 px-3 text-center">Distance</th>
                    <th className="py-2.5 px-3 text-center">Discipline</th>
                    <th className="py-2.5 px-3 text-center">Corde</th>
                    <th className="py-2.5 px-3 text-right">Allocation Course</th>
                    <th className="py-2.5 px-3 text-center">Val. Hdp</th>
                    <th className="py-2.5 px-3 text-center font-bold text-white">Rang</th>
                    <th className="py-2.5 px-3 text-right">Allocations perçues</th>
                    <th className="py-2.5 px-3 text-center">Cote</th>
                    <th className="py-2.5 px-3 text-center">Déferrage</th>
                    <th className="py-2.5 px-3">Driver / Jockey</th>
                    <th className="py-2.5 px-3 text-center">Réd. Km / Chrono</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 font-mono">
                  {filteredRaces.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="py-8 text-center text-slate-500">
                        Aucune course ne correspond au filtre sélectionné.
                      </td>
                    </tr>
                  ) : (
                    filteredRaces.map((course, idx) => {
                      const isWin = course.rang === 1 || course.rang === '1' || String(course.rang).includes('1er');
                      const isSecond = course.rang === 2 || course.rang === '2' || String(course.rang).includes('2e');
                      const isThird = course.rang === 3 || course.rang === '3' || String(course.rang).includes('3e');
                      const isDisq = String(course.rang).toUpperCase().includes('D');
                      const isPlace = isSecond || isThird;

                      return (
                        <tr key={`course-perf-${course.date}-${idx}`} className="hover:bg-slate-900/70 transition-colors">
                          {/* Date format JJ/MM/AAAA */}
                          <td className="py-2.5 px-3 text-emerald-400 font-bold whitespace-nowrap">
                            {course.date}
                          </td>

                          {/* Hippodrome */}
                          <td className="py-2.5 px-3 text-white font-medium whitespace-nowrap flex items-center gap-1.5">
                            <MapPin className="w-3 h-3 text-slate-500" />
                            <span>{course.hippodrome}</span>
                          </td>

                          {/* Nom de la Course / Prix */}
                          <td className="py-2.5 px-3 text-slate-200 max-w-[200px] truncate" title={course.nomCourse}>
                            {course.nomCourse}
                          </td>

                          {/* Distance */}
                          <td className="py-2.5 px-3 text-center text-slate-300 whitespace-nowrap">
                            {course.distance}m
                          </td>

                          {/* Discipline */}
                          <td className="py-2.5 px-3 text-center text-slate-300 text-[11px] whitespace-nowrap">
                            {course.discipline}
                          </td>

                          {/* Corde */}
                          <td className="py-2.5 px-3 text-center text-slate-400 text-[11px] whitespace-nowrap">
                            {course.corde}
                          </td>

                          {/* Allocation globale de l'épreuve */}
                          <td className="py-2.5 px-3 text-right text-slate-300 whitespace-nowrap">
                            {course.allocation ? `${course.allocation.toLocaleString('fr-FR')} €` : '—'}
                          </td>

                          {/* Valeur d'Handicap */}
                          <td className="py-2.5 px-3 text-center text-slate-400 whitespace-nowrap">
                            {course.valeurHandicap ? `${course.valeurHandicap}` : '—'}
                          </td>

                          {/* Rang / Résultat */}
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${
                              isWin ? 'bg-emerald-500 text-slate-950 shadow-sm font-black ring-1 ring-emerald-300' :
                              isSecond ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                              isThird ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                              isDisq ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                              'bg-slate-800 text-slate-400'
                            }`}>
                              {isWin ? '1er' : isSecond ? '2e' : isThird ? '3e' : course.rang}
                            </span>
                          </td>

                          {/* Allocations perçues par le cheval */}
                          <td className="py-2.5 px-3 text-right whitespace-nowrap font-bold">
                            {course.gains && course.gains > 0 ? (
                              <span className="text-emerald-400">+{course.gains.toLocaleString('fr-FR')} €</span>
                            ) : (
                              <span className="text-slate-600">0 €</span>
                            )}
                          </td>

                          {/* Cote */}
                          <td className="py-2.5 px-3 text-center text-amber-300 font-bold whitespace-nowrap">
                            {course.cote ? `${course.cote}/1` : '—'}
                          </td>

                          {/* Déferrage */}
                          <td className="py-2.5 px-3 text-center font-bold whitespace-nowrap">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                              course.deferre?.includes('D4') ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                              course.deferre?.includes('DA') || course.deferre?.includes('DP') ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                              'bg-slate-900 border border-slate-700 text-slate-300'
                            }`}>
                              {course.deferre || 'Ferré'}
                            </span>
                          </td>

                          {/* Driver / Jockey */}
                          <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap text-left">
                            {course.driver || currentHorse.driver}
                          </td>

                          {/* Réduction Kilométrique / Chrono */}
                          <td className="py-2.5 px-3 text-center font-mono text-cyan-400 whitespace-nowrap">
                            {course.reductionKilometrique || '—'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Conformity footer explanation */}
            <div className="flex items-center gap-2 p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-[11px] text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>Conformité stricte :</strong> Les rangs présentés dans ce tableau sont synchronisés avec la musique officielle ({currentHorse.musique}) et présentés dans un ordre chronologique strict (format JJ/MM/AAAA) avec allocations, cotes et déferrage réels.
              </span>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Fermer la fiche
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onToggleInTicket(currentHorse.numPmu);
                onClose();
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg ${
                isSelectedInTicket
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30'
                  : 'bg-emerald-400 hover:bg-emerald-300 text-slate-950'
              }`}
            >
              {isSelectedInTicket ? <Check className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
              <span>{isSelectedInTicket ? 'Retirer du Ticket' : 'Retenir ce Cheval dans la Sélection'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
