import React from 'react';
import { Course } from '../types/turf';
import { Clock, MapPin } from 'lucide-react';

interface HeroQuinteProps {
  course: Course | null;
}

export const HeroQuinte: React.FC<HeroQuinteProps> = ({ course }) => {
  if (!course) return null;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/90 px-3.5 py-2.5 mb-4 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
            R{course.reunionNum} C{course.courseNum}
          </span>
          
          {/* Nom du prix de la course en taille réduite pour un affichage net et compact */}
          <h1 className="text-xs sm:text-sm font-bold text-white tracking-tight truncate">
            {course.nom}
          </h1>

          {course.isQuinte && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
              QUINTÉ+
            </span>
          )}
        </div>

        {/* Détails compacts de la course */}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-300 shrink-0">
          <span className="flex items-center gap-1 text-slate-300">
            <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate max-w-[120px] sm:max-w-none">{course.hippodrome}</span>
          </span>
          <span className="text-slate-600">·</span>
          <span className="font-mono text-emerald-400 font-bold">
            {course.nbPartants} partants
          </span>
          <span className="text-slate-600">·</span>
          <span className="flex items-center gap-1 font-mono text-slate-300">
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{course.heureDepart}</span>
          </span>
          <span className="text-slate-600">·</span>
          <span className="font-mono text-slate-400">
            {course.distance}m
          </span>
        </div>
      </div>
    </div>
  );
};
