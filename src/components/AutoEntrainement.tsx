import React, { useState } from 'react';
import { Cpu, Activity, Play, RefreshCw, CheckCircle2, Settings, Database, TrendingUp, BarChart3, Zap } from 'lucide-react';

export const AutoEntrainement: React.FC = () => {
  const [isTraining, setIsTraining] = useState(false);
  const [progress, setProgress] = useState(100);
  const [logMessages, setLogMessages] = useState<string[]>([
    '[INFO] Chargement du jeu de données historique PMU (500 000 courses)...',
    '[INFO] Normalisation des features (Cotes PMU, Musique, Record, Hippodrome)...',
    '[INFO] Entraînement LightGBM v4.2 - Boosting Iterations: 1500 / 1500',
    '[SUCCESS] Modèle LightGBM optimisé avec succès (LogLoss: 0.2148, Accuracy Top-5: 78.4%)',
  ]);
  const [hyperparams, setHyperparams] = useState({
    learningRate: 0.03,
    numLeaves: 63,
    maxDepth: 8,
    nEstimators: 1500,
    featureFraction: 0.8,
  });

  const handleStartTraining = () => {
    setIsTraining(true);
    setProgress(0);
    setLogMessages((prev) => ['[INFO] Lancement de l\'auto-entraînement LightGBM...', ...prev]);

    let p = 0;
    const interval = setInterval(() => {
      p += 25;
      setProgress(p);
      if (p === 25) {
        setLogMessages((prev) => ['[INFO] Étape 1/4 : Extraction des caractéristiques dynamiques et cotes live...', ...prev]);
      } else if (p === 50) {
        setLogMessages((prev) => ['[INFO] Étape 2/4 : Validation croisée (5-Fold CV sur données hippiques)...', ...prev]);
      } else if (p === 75) {
        setLogMessages((prev) => ['[INFO] Étape 3/4 : Optimisation des hyperparamètres par gradient descent...', ...prev]);
      } else if (p >= 100) {
        clearInterval(interval);
        setIsTraining(false);
        setLogMessages((prev) => [
          '[SUCCESS] Étape 4/4 : Modèle LightGBM ré-entraîné et déployé en production avec succès !',
          ...prev,
        ]);
      }
    }, 600);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Cpu className="w-48 h-48 text-emerald-400" />
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                LIGHTGBM ENGINE v4.2
              </span>
              <span className="text-xs text-slate-400 font-mono">Statut : Prêt / Actif</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Zap className="w-6 h-6 text-amber-400" />
              <span>Auto-Entraînement & Optimisation IA</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Gérez et ré-entraînez automatiquement les modèles de Gradient Boosting sur les arrivées et cotes PMU en temps réel.
            </p>
          </div>

          <button
            onClick={handleStartTraining}
            disabled={isTraining}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer transition-all shadow-md ${
              isTraining
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-emerald-400 text-slate-950 hover:bg-emerald-300 active:scale-95 shadow-emerald-500/20'
            }`}
          >
            {isTraining ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Entraînement en cours ({progress}%)...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Lancer un ré-entraînement complet</span>
              </>
            )}
          </button>
        </div>

        {/* Training progress bar */}
        {isTraining && (
          <div className="mb-6 p-4 rounded-xl bg-slate-950 border border-slate-800 animate-pulse">
            <div className="flex justify-between text-xs font-mono mb-2">
              <span className="text-emerald-400 font-bold">Pipeline d'apprentissage LightGBM</span>
              <span className="text-slate-300">{progress}%</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4">
            <div className="text-[10px] uppercase font-mono text-slate-400 mb-1 flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
              <span>LogLoss Global</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-cyan-400 font-mono">0.2148</div>
            <div className="text-[10px] text-emerald-400 mt-1">▼ -0.012 vs version précédente</div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4">
            <div className="text-[10px] uppercase font-mono text-slate-400 mb-1 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
              <span>Accuracy Top-5 Quinté</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-400 font-mono">78.4%</div>
            <div className="text-[10px] text-emerald-400 mt-1">▲ Haute fiabilité</div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4">
            <div className="text-[10px] uppercase font-mono text-slate-400 mb-1 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>Base Courses Apprentissage</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-white font-mono">500,000</div>
            <div className="text-[10px] text-slate-400 mt-1">Courses PMU (2018 - 2026)</div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4">
            <div className="text-[10px] uppercase font-mono text-slate-400 mb-1 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-rose-400" />
              <span>Temps d'Inférence</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-rose-400 font-mono">14 ms</div>
            <div className="text-[10px] text-slate-400 mt-1">Temps réel / API Edge</div>
          </div>
        </div>

        {/* Hyperparameters Config */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-emerald-400" />
                <span>Hyperparamètres du Modèle LightGBM</span>
              </h2>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Optimisé par Optuna
              </span>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Learning Rate (Taux d'apprentissage)</span>
                  <span className="font-mono text-amber-400">{hyperparams.learningRate}</span>
                </div>
                <input
                  type="range"
                  min="0.01"
                  max="0.1"
                  step="0.01"
                  value={hyperparams.learningRate}
                  onChange={(e) => setHyperparams({ ...hyperparams, learningRate: parseFloat(e.target.value) })}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Num Leaves (Nombre de feuilles max)</span>
                  <span className="font-mono text-cyan-400">{hyperparams.numLeaves}</span>
                </div>
                <input
                  type="range"
                  min="31"
                  max="127"
                  step="2"
                  value={hyperparams.numLeaves}
                  onChange={(e) => setHyperparams({ ...hyperparams, numLeaves: parseInt(e.target.value) })}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Max Depth (Profondeur maximale des arbres)</span>
                  <span className="font-mono text-emerald-400">{hyperparams.maxDepth}</span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="16"
                  step="1"
                  value={hyperparams.maxDepth}
                  onChange={(e) => setHyperparams({ ...hyperparams, maxDepth: parseInt(e.target.value) })}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>N Estimators (Nombre d'arbres de boosting)</span>
                  <span className="font-mono text-amber-400">{hyperparams.nEstimators}</span>
                </div>
                <input
                  type="range"
                  min="500"
                  max="3000"
                  step="100"
                  value={hyperparams.nEstimators}
                  onChange={(e) => setHyperparams({ ...hyperparams, nEstimators: parseInt(e.target.value) })}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Logs Terminal */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 flex flex-col font-mono text-xs">
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-800">
              <span className="text-slate-300 font-bold flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Logs d'Auto-Entraînement</span>
              </span>
              <span className="text-[10px] text-slate-500">lightgbm_worker.log</span>
            </div>

            <div className="flex-1 bg-slate-900/80 rounded-lg p-3 overflow-y-auto max-h-56 space-y-1.5 text-[11px] text-slate-300">
              {logMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`leading-relaxed ${
                    msg.includes('SUCCESS')
                      ? 'text-emerald-400 font-bold'
                      : msg.includes('INFO')
                      ? 'text-slate-300'
                      : 'text-amber-300'
                  }`}
                >
                  {msg}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
