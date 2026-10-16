import React from 'react';
import { Sparkles, Cpu, Trophy, BookOpen } from 'lucide-react';

interface HeaderProps {
  activeTab: 'quinte' | 'programme' | 'gemini' | 'auto-entrainement';
  setActiveTab: (tab: 'quinte' | 'programme' | 'gemini' | 'auto-entrainement') => void;
  onQuickProno: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onQuickProno,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
        
        {/* Zone 1: Single element brand wordmark */}
        <button
          onClick={() => setActiveTab('quinte')}
          className="flex items-center gap-2.5 text-left group whitespace-nowrap shrink-0 transition-opacity hover:opacity-90 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-950/40 border border-emerald-400/30">
            <Trophy className="w-4 h-4 text-emerald-100" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
              Yah.IA<span className="text-emerald-400">.LeTurfiste</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-medium">
                API v2.4
              </span>
            </span>
          </div>
        </button>

        {/* Zone 2: Clean single-line nav links */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2 text-xs lg:text-sm font-medium text-slate-400">
          <button
            onClick={() => setActiveTab('quinte')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'quinte'
                ? 'text-white bg-slate-800/80 font-semibold'
                : 'hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            Quinté+ & Partants
          </button>

          <button
            onClick={() => setActiveTab('programme')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'programme'
                ? 'text-white bg-slate-800/80 font-semibold'
                : 'hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            Toutes les Courses
          </button>


          <button
            onClick={() => setActiveTab('gemini')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'gemini'
                ? 'text-emerald-300 bg-emerald-950/40 border border-emerald-800/50 font-semibold'
                : 'hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            Expert IA Gemini
          </button>

          <button
            onClick={() => setActiveTab('auto-entrainement')}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'auto-entrainement'
                ? 'text-cyan-300 bg-cyan-950/40 border border-cyan-800/50 font-semibold'
                : 'hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            Auto-Entraînement LightGBM
          </button>

        </nav>

        {/* Zone 3: Single primary action */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onQuickProno}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 active:scale-95 transition-all rounded-lg shadow-sm shadow-emerald-950/30 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Prono Quinté+</span>
          </button>
        </div>

      </div>
    </header>
  );
};
