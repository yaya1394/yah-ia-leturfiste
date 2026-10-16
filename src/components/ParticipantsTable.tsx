import React, { useState } from 'react';
import { Participant } from '../types/turf';
import { TrendingUp, TrendingDown, Minus, Info, PlusCircle, Check } from 'lucide-react';

interface ParticipantsTableProps {
  participants: Participant[];
  onSelectHorseForModal: (horse: Participant) => void;
  selectedForTicket: number[];
  onToggleHorseInTicket: (numPmu: number) => void;
}

export const ParticipantsTable: React.FC<ParticipantsTableProps> = ({
  participants,
  onSelectHorseForModal,
  selectedForTicket,
  onToggleHorseInTicket,
}) => {
  const [filter, setFilter] = useState<'all' | 'top8' | 'bases' | 'tocards'>('all');

  const filtered = participants.filter((p) => {
    if (filter === 'top8') return (p.algoScore || 0) >= 65;
    if (filter === 'bases') return p.statutYahIA === 'BASE' || p.statutYahIA === 'CHALLENGER' || p.statutYahIA === 'COUP_DE_COEUR';
    if (filter === 'tocards') return p.statutYahIA === 'TOCARD_VALUE' || (p.dernierRapportDirect && p.dernierRapportDirect.rapport >= 14);
    return true;
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm mb-8">
      {/* Table Header Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/60">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <span>Tableau des Partants & Scores Yah.IA</span>
            <span className="text-xs font-mono text-slate-400 font-normal">
              ({participants.length} chevaux engagés)
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            Analysé en temps réel par le modèle multi-factoriel (forme, classe, déferrage, jockey, value bets).
          </p>
        </div>

        {/* Filter buttons - segmented control */}
        <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              filter === 'all' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tous ({participants.length})
          </button>
          <button
            onClick={() => setFilter('top8')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              filter === 'top8' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Top 8
          </button>
          <button
            onClick={() => setFilter('bases')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              filter === 'bases' ? 'bg-slate-800 text-emerald-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Bases
          </button>
          <button
            onClick={() => setFilter('tocards')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              filter === 'tocards' ? 'bg-slate-800 text-amber-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Value Bets
          </button>
        </div>
      </div>

      {/* Table grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-950/40">
              <th className="py-3 px-3 sm:px-4 text-center w-12">N°</th>
              <th className="py-3 px-3 sm:px-4">Cheval / Origines</th>
              <th className="py-3 px-3 sm:px-4">Driver / Jockey</th>
              <th className="py-3 px-3 sm:px-4 hidden md:table-cell">Musique</th>
              <th className="py-3 px-3 sm:px-4 hidden lg:table-cell text-right">Gains</th>
              <th className="py-3 px-3 sm:px-4 text-right">Cote PMU</th>
              <th className="py-3 px-3 sm:px-4 text-right">Score Yah.IA</th>
              <th className="py-3 px-3 sm:px-4 text-center hidden sm:table-cell">Statut</th>
              <th className="py-3 px-3 sm:px-4 text-center w-24">Ticket</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 font-normal">
            {filtered.map((p) => {
              const isSelected = selectedForTicket.includes(p.numPmu);
              const cote = p.dernierRapportDirect?.rapport;
              const tendance = p.dernierRapportDirect?.tendance;

              return (
                <tr
                  key={`participant-${p.numPmu}-${filtered.indexOf(p)}`}
                  className={`transition-colors hover:bg-slate-800/50 ${
                    isSelected ? 'bg-emerald-950/20' : ''
                  }`}
                >
                  {/* Numéro & Casaque */}
                  <td className="py-3 px-3 sm:px-4 text-center">
                    <div
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-extrabold text-white text-xs sm:text-sm mx-auto shadow-sm"
                      style={{ backgroundColor: p.casaqueCouleur || '#475569' }}
                    >
                      {p.numPmu}
                    </div>
                  </td>

                  {/* Nom du cheval & Équipement */}
                  <td className="py-3 px-3 sm:px-4 min-w-[140px]">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onSelectHorseForModal(p)}
                        className="font-bold text-white hover:text-emerald-400 transition-colors text-left flex items-center gap-1 cursor-pointer"
                      >
                        <span>{p.nom}</span>
                        <Info className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                      <span>{p.sexe}{p.age}</span>
                      {p.poids && <span>· {p.poids} kg</span>}
                      {p.corde && <span>· Corde {p.corde}</span>}

                      {/* Ferrure */}
                      {p.deferre === 'DEFERRE_ANTERIEURS_POSTERIEURS' && (
                        <span className="text-[10px] font-bold px-1 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          D4
                        </span>
                      )}
                      {p.deferre === 'DEFERRE_ANTERIEURS' && (
                        <span className="text-[10px] font-bold px-1 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          DA
                        </span>
                      )}
                      {p.deferre === 'DEFERRE_POSTERIEURS' && (
                        <span className="text-[10px] font-bold px-1 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          DP
                        </span>
                      )}
                      {p.oeilleres && (
                        <span className="text-[10px] font-bold px-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Œil.
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Jockey & Entraîneur */}
                  <td className="py-3 px-3 sm:px-4 min-w-[120px]">
                    <div className="font-medium text-slate-200 truncate">
                      {p.driver}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      Entr: {p.entraineur}
                    </div>
                  </td>

                  {/* Musique */}
                  <td className="py-3 px-3 sm:px-4 hidden md:table-cell font-mono text-xs text-slate-300">
                    <span className="px-1.5 py-0.5 bg-slate-950 rounded border border-slate-800">
                      {p.musique}
                    </span>
                  </td>

                  {/* Gains Carrière */}
                  <td className="py-3 px-3 sm:px-4 hidden lg:table-cell text-right font-mono tabular-nums text-slate-300 text-xs">
                    {p.gainsParticipant?.gainsCarriere
                      ? `${Math.round(p.gainsParticipant.gainsCarriere).toLocaleString('fr-FR')} €`
                      : '—'}
                  </td>

                  {/* Cote PMU */}
                  <td className="py-3 px-3 sm:px-4 text-right">
                    <div className="font-mono tabular-nums font-bold text-white text-sm flex items-center justify-end gap-1">
                      <span>{cote ? cote.toFixed(1) : '—'}</span>
                      {tendance === 'BAISSE' ? (
                        <span title="Cote en baisse">
                          <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
                        </span>
                      ) : tendance === 'HAUSSE' ? (
                        <span title="Cote en hausse">
                          <TrendingUp className="w-3.5 h-3.5 text-rose-400" />
                        </span>
                      ) : (
                        <Minus className="w-3 h-3 text-slate-600" />
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Réf: {p.dernierRapportReference?.rapport || '—'}
                    </div>
                  </td>

                  {/* Score Yah.IA */}
                  <td className="py-3 px-3 sm:px-4 text-right">
                    <div className="font-mono tabular-nums font-extrabold text-sm text-emerald-400">
                      {p.algoScore || 50}<span className="text-[10px] text-slate-500">/100</span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">
                      {p.probabiliteVictoire || 5}% vict.
                    </div>
                  </td>

                  {/* Statut Yah.IA */}
                  <td className="py-3 px-3 sm:px-4 text-center hidden sm:table-cell">
                    {p.statutYahIA === 'BASE' ? (
                      <span className="inline-block px-2 py-0.5 text-[11px] font-bold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        BASE
                      </span>
                    ) : p.statutYahIA === 'CHALLENGER' ? (
                      <span className="inline-block px-2 py-0.5 text-[11px] font-bold rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                        CHALLENGER
                      </span>
                    ) : p.statutYahIA === 'COUP_DE_COEUR' ? (
                      <span className="inline-block px-2 py-0.5 text-[11px] font-bold rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                        C. CŒUR
                      </span>
                    ) : p.statutYahIA === 'TOCARD_VALUE' ? (
                      <span className="inline-block px-2 py-0.5 text-[11px] font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        VALUE BET
                      </span>
                    ) : p.statutYahIA === 'OUTSIDER' ? (
                      <span className="text-xs text-slate-400 font-medium">Outsider</span>
                    ) : p.statutYahIA === 'SECOND_CHOIX' ? (
                      <span className="text-xs text-slate-500">2nd choix</span>
                    ) : (
                      <span className="text-xs text-slate-600">Délaissé</span>
                    )}
                  </td>

                  {/* Bouton Ajouter au Ticket */}
                  <td className="py-3 px-3 sm:px-4 text-center">
                    <button
                      onClick={() => onToggleHorseInTicket(p.numPmu)}
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center mx-auto transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-400 text-slate-950 font-bold'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
                      }`}
                      title={isSelected ? 'Retirer du ticket' : 'Ajouter au ticket'}
                    >
                      {isSelected ? <Check className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
                    </button>
                  </td>

                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
