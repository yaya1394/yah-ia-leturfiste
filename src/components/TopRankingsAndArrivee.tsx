import React, { useState } from 'react';
import { Course, PredictionResult, Participant } from '../types/turf';
import { 
  Trophy, 
  CheckCircle2, 
  ArrowRight, 
  Copy, 
  Check, 
  Sparkles, 
  Clock, 
  Flag 
} from 'lucide-react';

interface TopRankingsAndArriveeProps {
  course: Course;
  prediction: PredictionResult;
  onLoadIntoTicket: (numbers: number[]) => void;
  onSelectHorseForModal: (horse: Participant) => void;
}

const getHorseCircleBg = (
  num: number, 
  activeArrivee?: number[] | null, 
  topList?: number[] | null,
  defaultColor?: string, 
  isOfficial?: boolean
) => {
  // If we have an official arrival, use strict arrival coloring
  if (isOfficial && activeArrivee) {
    const idx = activeArrivee.indexOf(num);
    if (idx === -1) return '#64748b'; // Not in official arrival: grey
    
    // Official arrival colors
    switch (idx) {
      case 0: return '#22c55e'; // 1er: Green
      case 1: return '#3b82f6'; // 2ème: Blue
      case 2: return '#eab308'; // 3ème: Yellow
      case 3: return '#ef4444'; // 4ème: Red
      case 4: return '#f472b6'; // 5ème: Pink
      default: return '#64748b';
    }
  }

  // Use arrival (if simulated) or TOP list for TOP positions
  const listToUse = activeArrivee || topList;

  if (listToUse) {
    const idx = listToUse.indexOf(num);
    if (idx !== -1 && idx < 5) {
      // Use the same color rhythm for TOP positions
      switch (idx) {
        case 0: return '#22c55e'; // 1er: Green
        case 1: return '#3b82f6'; // 2ème: Blue
        case 2: return '#eab308'; // 3ème: Yellow
        case 3: return '#ef4444'; // 4ème: Red
        case 4: return '#f472b6'; // 5ème: Pink
        default: break;
      }
    }
  }

  return defaultColor || '#475569'; // Default
};

// Compact horse display: full colored circle without contour/ring, odds underneath
const CompactHorseCard: React.FC<{
  p: Participant;
  activeArrivee?: number[] | null;
  topList?: number[] | null;
  hasOfficialArrivee?: boolean;
  onClick?: () => void;
}> = ({ p, activeArrivee, topList, hasOfficialArrivee, onClick }) => {
  const cote = p.dernierRapportDirect?.rapport;
  const bgColor = getHorseCircleBg(p.numPmu, activeArrivee ?? null, topList ?? null, p.casaqueCouleur, hasOfficialArrivee);

  return (
    <div
      onClick={onClick}
      className="flex flex-col items-center text-center gap-0.5 cursor-pointer transition-transform hover:scale-105 p-1 opacity-100"
      title={`N°${p.numPmu} · Cote : ${cote ? `${cote.toFixed(1)}/1` : '—'}`}
    >
      <div
        className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-black text-white text-sm shadow-md"
        style={{ backgroundColor: bgColor }}
      >
        {p.numPmu}
      </div>
      <span className="font-mono tabular-nums font-bold text-[11px] text-amber-400">
        {cote ? `${cote.toFixed(1)}/1` : '—'}
      </span>
    </div>
  );
};

export const TopRankingsAndArrivee: React.FC<TopRankingsAndArriveeProps> = ({
  course,
  prediction,
  onLoadIntoTicket,
  onSelectHorseForModal,
}) => {
  const [copiedTopUltime, setCopiedTopUltime] = useState(false);

  const totalPartants = course.nbPartants || course.participants.length || 14;
  const isLarge = totalPartants >= 13;
  const topCount = isLarge ? 5 : 3;
  const topUltimeCount = isLarge ? 7 : 5;

  const rawLightGBM = prediction?.topLightGBM?.length 
    ? prediction.topLightGBM 
    : [...course.participants].sort((a, b) => (b.scoreLightGBM || 0) - (a.scoreLightGBM || 0));

  const rawPodium = prediction?.topPodium?.length 
    ? prediction.topPodium 
    : [...course.participants].sort((a, b) => (b.probabilitePlace || 0) - (a.probabilitePlace || 0));

  const rawForme = prediction?.topFormePrevisionnelle?.length 
    ? prediction.topFormePrevisionnelle 
    : [...course.participants].sort((a, b) => (b.scoreFormePrevisionnelle || 0) - (a.scoreFormePrevisionnelle || 0));

  const rawReussite = prediction?.topReussitePrevisionnelle?.length 
    ? prediction.topReussitePrevisionnelle 
    : [...course.participants].sort((a, b) => (b.scoreReussitePrevisionnelle || 0) - (a.scoreReussitePrevisionnelle || 0));

  const topLightGBM = rawLightGBM.slice(0, topCount);
  const topPodium = rawPodium.slice(0, topCount);
  const topForme = rawForme.slice(0, topCount);
  const topReussite = rawReussite.slice(0, topCount);

  // Calculate TOP ULTIME as synthesis of contributions
  const scores = new Map<number, number>();
  const tops = [topLightGBM, topPodium, topForme, topReussite];
  
  tops.forEach((list) => {
    list.forEach((p, index) => {
      // Weight: 1st=topCount, 2nd=topCount-1, ..., last=1
      const points = (list.length - index);
      const currentScore = scores.get(p.numPmu) || 0;
      scores.set(p.numPmu, currentScore + points);
    });
  });

  const topUltime = [...course.participants]
    .sort((a, b) => (scores.get(b.numPmu) || 0) - (scores.get(a.numPmu) || 0))
    .slice(0, topUltimeCount);
    
  const syntheseChiffree = topUltime.map((p) => p.numPmu);

  const hasOfficialArrivee = Boolean(course.isArriveeDefinitive && course.ordreArrivee && course.ordreArrivee.length >= 3);
  const [simulatedArrivee, setSimulatedArrivee] = useState<number[] | null>(null);

  const activeArrivee: number[] | null = hasOfficialArrivee 
    ? (course.ordreArrivee || null)
    : simulatedArrivee;

  const handleCopyTopUltime = () => {
    navigator.clipboard.writeText(syntheseChiffree.join(' - '));
    setCopiedTopUltime(true);
    setTimeout(() => setCopiedTopUltime(false), 2000);
  };

  const handleQuickSimulate = () => {
    const nums = course.participants.slice(0, Math.min(8, course.participants.length)).map((p) => p.numPmu);
    const shuffled = [...nums].sort(() => Math.random() - 0.45).slice(0, 5);
    setSimulatedArrivee(shuffled);
  };

  const handleClearSimulation = () => {
    setSimulatedArrivee(null);
  };

  const countMatchesInTop5 = (candidateNums: number[]) => {
    if (!activeArrivee) return 0;
    const top5Arrivee = activeArrivee.slice(0, 5);
    return candidateNums.filter((num) => top5Arrivee.includes(num)).length;
  };

  const getTicketStatus = (synthese: number[]) => {
    if (!activeArrivee || activeArrivee.length < 3) return null;
    const top3 = activeArrivee.slice(0, 3);
    const top4 = activeArrivee.slice(0, 4);
    const top5 = activeArrivee.slice(0, 5);

    const hasTierceOrder = synthese[0] === top3[0] && synthese[1] === top3[1] && synthese[2] === top3[2];
    const hasTierceDesordre = top3.every((n) => synthese.slice(0, 4).includes(n));
    const hasQuarte = top4.every((n) => synthese.slice(0, 5).includes(n));
    const hasQuinte = top5.every((n) => synthese.includes(n));

    if (hasTierceOrder) return { label: '🎉 TIERCÉ DANS L\'ORDRE !', color: 'text-amber-300 bg-amber-950/80 border-amber-500' };
    if (hasQuinte) return { label: '🏆 QUINTÉ+ TROUVÉ !', color: 'text-emerald-300 bg-emerald-950/80 border-emerald-500' };
    if (hasQuarte) return { label: '⭐ QUARTÉ+ TROUVÉ !', color: 'text-cyan-300 bg-cyan-950/80 border-cyan-500' };
    if (hasTierceDesordre) return { label: '✓ TIERCÉ TROUVÉ !', color: 'text-emerald-400 bg-emerald-950/60 border-emerald-600' };
    
    const count5 = synthese.filter((n) => top5.includes(n)).length;
    return { label: `${count5}/5 chevaux du Quinté`, color: 'text-slate-300 bg-slate-900 border-slate-700' };
  };

  return (
    <div className="space-y-2 pb-6">
      
      {/* 2-Column Grid for the 4 Tops to save vertical space */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        
        {/* 1. TOP LITEGBM */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 shadow-sm">
          <div className="flex items-center justify-between gap-1 mb-1.5 pb-1 border-b border-slate-800">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-black text-[10px] font-mono border border-cyan-500/30">
                1
              </div>
              <h3 className="text-xs font-bold text-white tracking-tight flex items-center gap-1">
                <span>Auto-Entainement LITEGBM</span>
                <span className="text-[10px] font-normal text-slate-400 font-mono">({topCount}ch)</span>
              </h3>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-around gap-2 py-1">
            {topLightGBM.map((p, idx) => (
              <CompactHorseCard key={`lgbm-${p.numPmu}-${idx}`} p={p} activeArrivee={activeArrivee} topList={topLightGBM.map(p => p.numPmu)} hasOfficialArrivee={hasOfficialArrivee} onClick={() => onSelectHorseForModal(p)} />
            ))}
          </div>
        </div>

        {/* 2. TOP PODIUM */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 shadow-sm">
          <div className="flex items-center justify-between gap-1 mb-1.5 pb-1 border-b border-slate-800">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-[10px] font-mono border border-amber-500/30">
                2
              </div>
              <h3 className="text-xs font-bold text-white tracking-tight flex items-center gap-1">
                <span>TOP PODIUM</span>
                <span className="text-[10px] font-normal text-slate-400 font-mono">({topCount}ch)</span>
              </h3>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-around gap-2 py-1">
            {topPodium.map((p, idx) => (
              <CompactHorseCard key={`podium-${p.numPmu}-${idx}`} p={p} activeArrivee={activeArrivee} topList={topPodium.map(p => p.numPmu)} hasOfficialArrivee={hasOfficialArrivee} onClick={() => onSelectHorseForModal(p)} />
            ))}
          </div>
        </div>

        {/* 3. FORME PRÉVISIONNELLE */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 shadow-sm">
          <div className="flex items-center justify-between gap-1 mb-1.5 pb-1 border-b border-slate-800">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-[10px] font-mono border border-emerald-500/30">
                3
              </div>
              <h3 className="text-xs font-bold text-white tracking-tight flex items-center gap-1">
                <span>FORME PRÉVISIONNELLE</span>
                <span className="text-[10px] font-normal text-slate-400 font-mono">({topCount}ch)</span>
              </h3>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-around gap-2 py-1">
            {topForme.map((p, idx) => (
              <CompactHorseCard key={`forme-${p.numPmu}-${idx}`} p={p} activeArrivee={activeArrivee} topList={topForme.map(p => p.numPmu)} hasOfficialArrivee={hasOfficialArrivee} onClick={() => onSelectHorseForModal(p)} />
            ))}
          </div>
        </div>

        {/* 4. RÉUSSITE PRÉVISIONNELLE */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 shadow-sm">
          <div className="flex items-center justify-between gap-1 mb-1.5 pb-1 border-b border-slate-800">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-rose-500/20 text-rose-400 flex items-center justify-center font-black text-[10px] font-mono border border-rose-500/30">
                4
              </div>
              <h3 className="text-xs font-bold text-white tracking-tight flex items-center gap-1">
                <span>RÉUSSITE PRÉVISIONNELLE</span>
                <span className="text-[10px] font-normal text-slate-400 font-mono">({topCount}ch)</span>
              </h3>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-around gap-2 py-1">
            {topReussite.map((p, idx) => (
              <CompactHorseCard key={`reussite-${p.numPmu}-${idx}`} p={p} activeArrivee={activeArrivee} topList={topReussite.map(p => p.numPmu)} hasOfficialArrivee={hasOfficialArrivee} onClick={() => onSelectHorseForModal(p)} />
            ))}
          </div>
        </div>

      </div>

      {/* EN FIN : LE TOP ULTIME */}
      <div className="bg-slate-900 border border-emerald-500/40 rounded-lg p-2.5 shadow-sm relative">
        <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-800">
          <div className="flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <h3 className="text-xs font-black text-white tracking-tight flex items-center gap-1">
              <span>TOP ULTIME</span>
              <span className="text-[9px] px-1 py-0.5 rounded font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {topUltimeCount} chevaux
              </span>
            </h3>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopyTopUltime}
              className="px-2 py-0.5 rounded text-[11px] font-medium text-slate-300 bg-slate-950 hover:bg-slate-800 border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
            >
              {copiedTopUltime ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedTopUltime ? 'Copié' : 'Copier'}</span>
            </button>

            <button
              onClick={() => onLoadIntoTicket(syntheseChiffree)}
              className="px-2.5 py-0.5 rounded text-[11px] font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-all flex items-center gap-1 cursor-pointer shadow-sm active:scale-95"
            >
              <span>Ticket</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-around gap-2 py-1">
          {topUltime.map((p, idx) => (
            <CompactHorseCard key={`ultime-${p.numPmu}-${idx}`} p={p} activeArrivee={activeArrivee} topList={topUltime.map(p => p.numPmu)} hasOfficialArrivee={hasOfficialArrivee} onClick={() => onSelectHorseForModal(p)} />
          ))}
        </div>
      </div>

      {/* ARRIVÉE OFFICIELLE & COMPARATEUR */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 shadow-sm">
        <div className="flex items-center justify-between gap-2 pb-1.5 mb-2 border-b border-slate-800">
          <div className="flex items-center gap-1.5">
            <Flag className="w-3.5 h-3.5 text-emerald-400" />
            <h2 className="text-xs font-bold text-white tracking-tight">
              Arrivée & Comparateur
            </h2>
            {hasOfficialArrivee ? (
              <span className="text-[9px] font-mono font-bold px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                OFFICIELLE
              </span>
            ) : activeArrivee ? (
              <span className="text-[9px] font-mono font-bold px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                SIMULATION
              </span>
            ) : (
              <span className="text-[9px] font-mono font-medium px-1 py-0.2 rounded bg-slate-800 text-slate-400">
                EN ATTENTE
              </span>
            )}
          </div>

          {!hasOfficialArrivee && (
            <div className="flex items-center gap-1.5">
              {activeArrivee ? (
                <button
                  onClick={handleClearSimulation}
                  className="px-2 py-0.5 rounded text-[11px] text-slate-400 hover:text-white bg-slate-950 border border-slate-800 transition-colors cursor-pointer"
                >
                  Effacer
                </button>
              ) : (
                <button
                  onClick={handleQuickSimulate}
                  className="px-2 py-0.5 rounded text-[11px] font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-colors flex items-center gap-1 cursor-pointer shadow-sm active:scale-95"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Simuler</span>
                </button>
              )}
            </div>
          )}
        </div>

        {activeArrivee && activeArrivee.length > 0 ? (
          <div>
            <div className="mb-2">
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
                {activeArrivee.slice(0, 5).map((num, rankIdx) => {
                  const horse = course.participants.find((p) => p.numPmu === num);
                  const cote = horse?.dernierRapportDirect?.rapport;
                  const bgColor = getHorseCircleBg(num, activeArrivee, null, horse?.casaqueCouleur, hasOfficialArrivee);
                  return (
                    <div key={`active-arr-${rankIdx}-${num}`} className="flex flex-col items-center text-center gap-0.5">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center font-black text-white text-sm shadow-md"
                        style={{ backgroundColor: bgColor }}
                      >
                        {num}
                      </div>
                      <span className="text-[10px] font-mono font-bold text-slate-300">
                        {cote ? `${cote.toFixed(1)}/1` : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bilan de réussite compact */}
            <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800/80">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 mb-1.5 flex items-center justify-between">
                <span>Bilan Réussite :</span>
                {getTicketStatus(syntheseChiffree) && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getTicketStatus(syntheseChiffree)?.color}`}>
                    {getTicketStatus(syntheseChiffree)?.label}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-xs">
                <div className="p-1.5 rounded bg-slate-900 border border-slate-800 text-center">
                  <div className="text-[9px] text-slate-400">1. LITEGBM</div>
                  <div className="font-mono font-black text-xs text-cyan-400">
                    {countMatchesInTop5(topLightGBM.map((p) => p.numPmu))} / {topCount}
                  </div>
                </div>

                <div className="p-1.5 rounded bg-slate-900 border border-slate-800 text-center">
                  <div className="text-[9px] text-slate-400">2. PODIUM</div>
                  <div className="font-mono font-black text-xs text-amber-400">
                    {countMatchesInTop5(topPodium.map((p) => p.numPmu))} / {topCount}
                  </div>
                </div>

                <div className="p-1.5 rounded bg-slate-900 border border-slate-800 text-center">
                  <div className="text-[9px] text-slate-400">3. FORME</div>
                  <div className="font-mono font-black text-xs text-emerald-400">
                    {countMatchesInTop5(topForme.map((p) => p.numPmu))} / {topCount}
                  </div>
                </div>

                <div className="p-1.5 rounded bg-slate-900 border border-slate-800 text-center">
                  <div className="text-[9px] text-slate-400">4. RÉUSSITE</div>
                  <div className="font-mono font-black text-xs text-rose-400">
                    {countMatchesInTop5(topReussite.map((p) => p.numPmu))} / {topCount}
                  </div>
                </div>

                <div className="p-1.5 rounded bg-slate-900 border border-slate-800 text-center">
                  <div className="text-[9px] text-slate-400">TOP ULTIME</div>
                  <div className="font-mono font-black text-xs text-emerald-400">
                    {countMatchesInTop5(syntheseChiffree)} / 5
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-2 text-center bg-slate-950/40 rounded-lg border border-slate-800/80 text-xs text-slate-400">
            <p className="mb-1.5 text-[11px]">
              En attente du départ (<strong className="text-slate-200">{course.heureDepart}</strong>).
            </p>
            <button
              onClick={handleQuickSimulate}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium cursor-pointer transition-colors inline-flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Simuler une arrivée</span>
            </button>
          </div>
        )}
      </div>

    </div>
  );
};
