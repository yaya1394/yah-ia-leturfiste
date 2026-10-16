import React from 'react';
import { Reunion, Course } from '../types/turf';
import { Calendar, ChevronRight, Clock, CalendarDays } from 'lucide-react';

interface RaceSelectorProps {
  reunions: Reunion[];
  selectedReunion: number;
  selectedCourse: number;
  currentDate: string; // DDMMYYYY (ex: 11102026)
  onSelectRace: (rNum: number, cNum: number) => void;
  onDateChange: (dateStr: string) => void;
  isLoading: boolean;
}

// Date conversion helpers
function dateToDdmmyyyy(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear());
  return `${day}${month}${year}`;
}

function ddmmyyyyToYyyyMmDd(str: string): string {
  if (!str || str.length !== 8) return '';
  const day = str.slice(0, 2);
  const month = str.slice(2, 4);
  const year = str.slice(4, 8);
  return `${year}-${month}-${day}`;
}

function yyyyMmDdToDdmmyyyy(str: string): string {
  if (!str) return '';
  const parts = str.split('-');
  if (parts.length !== 3) return '';
  return `${parts[2]}${parts[1]}${parts[0]}`;
}

export const RaceSelector: React.FC<RaceSelectorProps> = ({
  reunions,
  selectedReunion,
  selectedCourse,
  currentDate,
  onSelectRace,
  onDateChange,
  isLoading,
}) => {
  const currentR = reunions.find((r) => r.numOfficiel === selectedReunion) || reunions[0];

  // Base date calculation for Hier, Aujourd'hui, Demain
  const today = new Date();
  const dToday = dateToDdmmyyyy(today);
  
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const dYesterday = dateToDdmmyyyy(yesterday);

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const dTomorrow = dateToDdmmyyyy(tomorrow);

  const isYesterday = currentDate === dYesterday;
  const isToday = currentDate === dToday;
  const isTomorrow = currentDate === dTomorrow;

  // Handle native HTML5 date input change
  const handleCalendarPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value; // YYYY-MM-DD
    if (val) {
      const ddmmyyyy = yyyyMmDdToDdmmyyyy(val);
      onDateChange(ddmmyyyy);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 mb-6 shadow-lg">
      
      {/* 1. TOP ROW: Quick Date Shortcuts (Hier / Aujourd'hui / Demain) + Interactive Calendar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-800/80">
        
        {/* Quick Date Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 shrink-0 mr-1 flex items-center gap-1">
            <CalendarDays className="w-3.5 h-3.5 text-emerald-400" />
            <span>Journée PMU :</span>
          </span>

          {/* Hier */}
          <button
            onClick={() => onDateChange(dYesterday)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
              isYesterday
                ? 'bg-emerald-400 text-slate-950 font-bold shadow-sm'
                : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            Hier ({yesterday.getDate()}/{yesterday.getMonth() + 1})
          </button>

          {/* Aujourd'hui */}
          <button
            onClick={() => onDateChange(dToday)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
              isToday
                ? 'bg-emerald-400 text-slate-950 font-extrabold shadow-sm'
                : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            Aujourd'hui ({today.getDate()}/{today.getMonth() + 1})
          </button>

          {/* Demain */}
          <button
            onClick={() => onDateChange(dTomorrow)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
              isTomorrow
                ? 'bg-emerald-400 text-slate-950 font-bold shadow-sm'
                : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            Demain ({tomorrow.getDate()}/{tomorrow.getMonth() + 1})
          </button>
        </div>

        {/* Calendar Picker for Exact Date */}
        <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 self-start sm:self-auto shrink-0 shadow-inner">
          <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium text-slate-400">Calendrier :</span>
          <input
            type="date"
            value={ddmmyyyyToYyyyMmDd(currentDate)}
            onChange={handleCalendarPickerChange}
            className="bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs font-mono text-white text-center focus:outline-none focus:border-emerald-400 cursor-pointer transition-colors"
          />
          <span className="font-mono text-xs text-emerald-400 font-bold">
            [{currentDate.slice(0, 2)}/{currentDate.slice(2, 4)}/{currentDate.slice(4)}]
          </span>
          {isLoading && (
            <span className="text-[11px] text-amber-400 animate-pulse ml-1 font-mono">
              Chargement...
            </span>
          )}
        </div>

      </div>

      {/* 2. REUNIONS SELECTOR (R1, R2, R3...) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-3 border-b border-slate-800/60 scrollbar-none">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 shrink-0 mr-1">
          Réunions :
        </span>
        {reunions.length === 0 ? (
          <span className="text-xs text-slate-500 italic">Aucune réunion PMU trouvée pour cette date</span>
        ) : (
          reunions.map((r) => {
            const isSelected = r.numOfficiel === selectedReunion;
            const hasQuinte = r.courses.some((c) => c.isQuinte);

            return (
              <button
                key={`selector-r-${r.numOfficiel}-${reunions.indexOf(r)}`}
                onClick={() => onSelectRace(r.numOfficiel, 1)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-emerald-400 text-slate-950 shadow-sm font-bold'
                    : 'bg-slate-950 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
                }`}
              >
                <span>R{r.numOfficiel}</span>
                <span className="font-normal opacity-90 truncate max-w-[130px]">{r.nomHippodrome}</span>
                {hasQuinte && (
                  <span className={`text-[10px] font-bold px-1 rounded ${isSelected ? 'bg-slate-950 text-emerald-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                    Q+
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* 3. COURSES SELECTOR (C1, C2, C3...) - Dropdown */}
      {currentR && currentR.courses.length > 0 && (
        <div className="flex items-center gap-2 pb-1">
          <span className="text-xs font-medium text-slate-400 shrink-0 mr-1">
            Course :
          </span>
          <select
            value={selectedCourse}
            onChange={(e) => onSelectRace(currentR.numOfficiel, parseInt(e.target.value))}
            className="bg-slate-950/70 text-slate-200 border border-slate-800 rounded-md px-3 py-1.5 text-xs font-medium w-full focus:outline-none focus:border-emerald-400 cursor-pointer"
          >
            {currentR.courses.map((c, cIdx) => (
              <option key={`selector-c-${c.numOfficiel}-${cIdx}`} value={c.numOfficiel}>
                Course {c.numOfficiel} - {c.nom} ({c.heureDepart}) {c.isQuinte ? ' - Q+' : ''} {c.isArriveeDefinitive ? ' - Finie' : ''}
              </option>
            ))}
          </select>
        </div>
      )}

    </div>
  );
};
