import React from 'react';
import { PredictionResult } from '../types/turf';
import { Trophy, Flame, ShieldAlert, Copy, Check, ArrowRight } from 'lucide-react';

interface Top8PredictionProps {
  prediction: PredictionResult | null;
  onLoadIntoTicket: (numbers: number[]) => void;
}

export const Top8Prediction: React.FC<Top8PredictionProps> = ({
  prediction,
  onLoadIntoTicket,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!prediction) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(prediction.syntheseChiffree.join(' - '));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-6 mb-8 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              Le Top 8 Ultime de Yah.IA
            </h2>
            <span className="text-xs px-2 py-0.5 rounded font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {prediction.tauxRentabiliteEstime}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Sélection algorithmique optimisée pour le Tiercé, Quarté+, Quinté+ et Multi en 8.
          </p>
        </div>

        {/* Action button */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors flex items-center gap-1.5 border border-slate-700 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copié !' : 'Copier'}</span>
          </button>

          <button
            onClick={() => onLoadIntoTicket(prediction.syntheseChiffree)}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm shadow-emerald-950/20 active:scale-95"
          >
            <span>Jouer cette sélection</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Numerical Badge Chain (8 horses) */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-slate-950 rounded-xl border border-slate-800/80 mb-6">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 shrink-0 mr-2">
          Ordre de préférence :
        </span>
        {prediction.selectionHuit.map((cheval, idx) => {
          const isTop3 = idx < 3;
          const isTocard = cheval.statutYahIA === 'TOCARD_VALUE';

          return (
            <div
              key={`top8-sel-${cheval.numPmu}-${idx}`}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                idx === 0
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : idx === 1
                  ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-300'
                  : idx === 2
                  ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                  : isTocard
                  ? 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                  : 'bg-slate-900 border-slate-800 text-slate-200'
              }`}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center font-extrabold text-white text-xs shrink-0 shadow-xs"
                style={{ backgroundColor: cheval.casaqueCouleur || '#475569' }}
              >
                {cheval.numPmu}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold truncate max-w-[100px]">{cheval.nom}</span>
                <span className="text-[10px] font-mono text-slate-400">
                  Cote: {cheval.dernierRapportDirect?.rapport || '—'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tactical Comment */}
      <div className="p-4 bg-slate-950/50 rounded-lg border border-slate-800/60 text-xs sm:text-sm text-slate-300 leading-relaxed">
        <div className="font-semibold text-emerald-400 mb-1 flex items-center gap-1.5">
          <span>Décryptage Tactique du Quinté :</span>
          <span className="text-slate-500 font-normal">
            (Indice difficulté : <strong className="text-slate-300">{prediction.indiceDifficulte}</strong>)
          </span>
        </div>
        <p>{prediction.commentaireTactique}</p>
      </div>
    </div>
  );
};
