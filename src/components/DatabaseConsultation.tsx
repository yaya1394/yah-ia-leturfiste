import React, { useState, useEffect } from 'react';
import { Calendar, Search, ArrowRight, Loader2, History } from 'lucide-react';
import { CoursePassee } from '../types/turf';

export const DatabaseConsultation = () => {
  const [data, setData] = useState<CoursePassee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Assuming a new API endpoint /api/history will be created to fetch all data from 2021
      const res = await fetch('/api/history?since=2021-01-01');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error || 'Erreur lors du chargement des données.');
      }
    } catch (err) {
      setError('Impossible de se connecter au serveur.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg">
      <h2 className="text-xl font-black text-white flex items-center gap-2 mb-4">
        <History className="text-emerald-400" />
        Consultation Base de Données (depuis 01/01/2021)
      </h2>
      
      {isLoading && <div className="text-emerald-400 flex items-center gap-2"><Loader2 className="animate-spin"/> Chargement...</div>}
      {error && <div className="text-rose-400">{error}</div>}

      {!isLoading && !error && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="py-2">Date</th>
                <th className="py-2">Hippodrome</th>
                <th className="py-2">Course</th>
                <th className="py-2 text-right">Rang</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => (
                <tr key={idx} className="border-b border-slate-800 hover:bg-slate-800">
                  <td className="py-2">{row.date}</td>
                  <td className="py-2">{row.hippodrome}</td>
                  <td className="py-2">{row.nomCourse}</td>
                  <td className="py-2 text-right">{row.rang}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
