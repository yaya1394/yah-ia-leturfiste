import React, { useState } from 'react';
import { Terminal, Play, Copy, Check, Code, ExternalLink, Activity } from 'lucide-react';

interface EndpointDef {
  id: string;
  method: 'GET' | 'POST';
  path: string;
  summary: string;
  description: string;
  defaultParams?: Record<string, any>;
  bodyTemplate?: any;
}

const ENDPOINTS: EndpointDef[] = [
  {
    id: 'health',
    method: 'GET',
    path: '/api/health',
    summary: 'Statut du service & Uptime',
    description: 'Vérification de la disponibilité du serveur, du moteur Gemini 3.8 Flash et du flux PMU live.',
  },
  {
    id: 'quinte',
    method: 'GET',
    path: '/api/quinte',
    summary: 'Quinté+ du jour & Partants',
    description: 'Récupère la course événement du jour, tous les partants scorés et la prédiction de Yah.IA.',
    defaultParams: { date: '11102026' },
  },
  {
    id: 'programme',
    method: 'GET',
    path: '/api/programme',
    summary: 'Programme PMU complet du jour',
    description: 'Liste de toutes les réunions (R1 à R5) et courses officielles du jour avec allocations.',
    defaultParams: { date: '11102026' },
  },
  {
    id: 'course',
    method: 'GET',
    path: '/api/course/1/1',
    summary: 'Partants d\'une course spécifique (R1 C1)',
    description: 'Détail des chevaux, jockeys, entraîneurs, cotes en direct et scores calculés.',
    defaultParams: { date: '11102026' },
  },
  {
    id: 'predictions',
    method: 'GET',
    path: '/api/predictions/1/1',
    summary: 'Top 8 Ultime & Stratégie Yah.IA',
    description: 'Sélection algorithmique optimisée (Base, Challenger, Coup de cœur, Tocard).',
  },
  {
    id: 'analyse-ia',
    method: 'POST',
    path: '/api/analyse-ia',
    summary: 'Analyse experte Gemini 3.8 Flash',
    description: 'Déclenche l\'analyse en langage naturel de la course par l\'intelligence artificielle.',
    bodyTemplate: { reunion: 1, course: 1, date: '11102026' },
  },
  {
    id: 'ticket-gen',
    method: 'POST',
    path: '/api/tickets/generate',
    summary: 'Calculateur combinatoire de tickets PMU',
    description: 'Calcule le nombre de combinaisons, le coût total en € selon la formule et le pourcentage flexi.',
    bodyTemplate: {
      formule: 'QUINTE',
      typePari: 'CHAMP_REDUIT',
      bases: [5, 11],
      associes: [2, 7, 8, 14],
      flexi: 50,
    },
  },
  {
    id: 'value-bets',
    method: 'GET',
    path: '/api/value-bets',
    summary: 'Détecteur de Value Bets & Tocards',
    description: 'Scanne les courses du jour pour dénicher les chevaux sous-cotés à haute espérance de gain.',
  },
  {
    id: 'stats-hippodromes',
    method: 'GET',
    path: '/api/stats/hippodromes',
    summary: 'Statistiques & Profils des Hippodromes',
    description: 'Données techniques (Vincennes, Longchamp, Chantilly, Auteuil, Enghien) et grille tarifaire des paris.',
  },
  {
    id: 'chat',
    method: 'POST',
    path: '/api/gemini/chat',
    summary: 'Chat conversationnel avec Yah.IA',
    description: 'Interrogez le consultant turfiste en langage naturel.',
    bodyTemplate: {
      message: 'Quel est ton avis sur le Quinté du jour ?',
    },
  },
  {
    id: 'spec',
    method: 'GET',
    path: '/api/docs/spec',
    summary: 'Spécification OpenAPI 3.0 (JSON)',
    description: 'Schéma OpenAPI complet pour intégration Swagger, Postman ou SDK tiers.',
  },
];

export const ApiPlayground: React.FC = () => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointDef>(ENDPOINTS[1]); // Quinté default
  const [requestUrl, setRequestUrl] = useState(selectedEndpoint.path);
  const [requestBody, setRequestBody] = useState(
    selectedEndpoint.bodyTemplate ? JSON.stringify(selectedEndpoint.bodyTemplate, null, 2) : ''
  );
  const [responseJson, setResponseJson] = useState<any>(null);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedResponse, setCopiedResponse] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

  const handleSelectEndpoint = (ep: EndpointDef) => {
    setSelectedEndpoint(ep);
    let url = ep.path;
    if (ep.defaultParams) {
      const q = new URLSearchParams(ep.defaultParams).toString();
      url = `${ep.path}?${q}`;
    }
    setRequestUrl(url);
    setRequestBody(ep.bodyTemplate ? JSON.stringify(ep.bodyTemplate, null, 2) : '');
    setResponseJson(null);
    setResponseStatus(null);
    setLatencyMs(null);
  };

  const handleExecute = async () => {
    setIsLoading(true);
    setResponseJson(null);
    setResponseStatus(null);
    const start = performance.now();

    try {
      const options: RequestInit = {
        method: selectedEndpoint.method,
        headers: { 'Content-Type': 'application/json' },
      };

      if (selectedEndpoint.method === 'POST' && requestBody) {
        options.body = requestBody;
      }

      const res = await fetch(requestUrl, options);
      const elapsed = Math.round(performance.now() - start);
      setLatencyMs(elapsed);
      setResponseStatus(res.status);

      const data = await res.json();
      setResponseJson(data);
    } catch (err: any) {
      setResponseStatus(500);
      setResponseJson({ error: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const getCurlSnippet = () => {
    const fullUrl = `https://votre-domaine.com${requestUrl}`;
    if (selectedEndpoint.method === 'GET') {
      return `curl -X GET "${fullUrl}" -H "Accept: application/json"`;
    }
    return `curl -X POST "${fullUrl}" \\
  -H "Content-Type: application/json" \\
  -d '${requestBody.replace(/\n/g, '')}'`;
  };

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(getCurlSnippet());
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  const handleCopyResponse = () => {
    if (responseJson) {
      navigator.clipboard.writeText(JSON.stringify(responseJson, null, 2));
      setCopiedResponse(true);
      setTimeout(() => setCopiedResponse(false), 2000);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-6 mb-8 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Terminal className="w-5 h-5 text-cyan-400" />
            <span>Playground & Documentation API Yah.IA.LeTurfiste</span>
            <span className="text-xs px-2 py-0.5 rounded font-mono font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              REST v2.4
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            Intégrez les données PMU, les calculs de cotes et les pronostics de l'IA directement dans vos applications, bots ou modèles de trading.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          <span>Statut : <strong className="text-emerald-400">200 OK</strong></span>
          <span className="text-slate-600">|</span>
          <span>Latence : &lt;50ms</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Endpoint List */}
        <div className="lg:col-span-4 space-y-1.5 overflow-y-auto max-h-[600px] pr-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 px-1">
            Endpoints Disponibles :
          </div>
          {ENDPOINTS.map((ep) => {
            const isSelected = selectedEndpoint.id === ep.id;
            return (
              <button
                key={ep.id}
                onClick={() => handleSelectEndpoint(ep)}
                className={`w-full p-2.5 rounded-lg text-left transition-all border cursor-pointer block ${
                  isSelected
                    ? 'bg-slate-800 border-cyan-500 text-white shadow-sm'
                    : 'bg-slate-950/70 border-slate-800/80 text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-[10px] font-mono font-extrabold px-1.5 py-0.5 rounded ${
                      ep.method === 'GET'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    }`}
                  >
                    {ep.method}
                  </span>
                  <span className="font-mono text-xs font-semibold text-slate-200 truncate">
                    {ep.path}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  {ep.summary}
                </div>
              </button>
            );
          })}
        </div>

        {/* Right: Interactive Request & Response Console */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          
          {/* Active Endpoint Info */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`text-xs font-mono font-extrabold px-2 py-0.5 rounded ${
                  selectedEndpoint.method === 'GET'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                }`}
              >
                {selectedEndpoint.method}
              </span>
              <h3 className="text-sm font-bold text-white">{selectedEndpoint.summary}</h3>
            </div>
            <p className="text-xs text-slate-400 mb-3">{selectedEndpoint.description}</p>

            {/* URL Input Bar */}
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white">
                <span className="text-slate-500 mr-1">HOST</span>
                <input
                  type="text"
                  value={requestUrl}
                  onChange={(e) => setRequestUrl(e.target.value)}
                  className="flex-1 bg-transparent text-emerald-400 focus:outline-none"
                />
              </div>

              <button
                onClick={handleExecute}
                disabled={isLoading}
                className="px-4 py-2 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shrink-0"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{isLoading ? 'Envoi...' : 'Tester'}</span>
              </button>
            </div>

            {/* Body Editor for POST */}
            {selectedEndpoint.method === 'POST' && (
              <div className="mt-3">
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Corps de la Requête (JSON Body) :
                </label>
                <textarea
                  value={requestBody}
                  onChange={(e) => setRequestBody(e.target.value)}
                  rows={4}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
                />
              </div>
            )}
          </div>

          {/* cURL Snippet */}
          <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 truncate">
              <Code className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="font-mono text-slate-400 truncate text-[11px]">
                {getCurlSnippet()}
              </span>
            </div>
            <button
              onClick={handleCopyCurl}
              className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 shrink-0 cursor-pointer flex items-center gap-1 border border-slate-700"
            >
              {copiedCurl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedCurl ? 'Copié' : 'Copier cURL'}</span>
            </button>
          </div>

          {/* Response Viewer */}
          <div className="flex-1 min-h-[250px] bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex flex-col">
            <div className="p-3 border-b border-slate-800 bg-slate-900 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-white">Réponse du Serveur :</span>
                {responseStatus && (
                  <span
                    className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded ${
                      responseStatus < 300
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-rose-500/20 text-rose-400'
                    }`}
                  >
                    HTTP {responseStatus}
                  </span>
                )}
                {latencyMs !== null && (
                  <span className="font-mono text-[11px] text-slate-400">
                    {latencyMs} ms
                  </span>
                )}
              </div>

              {responseJson && (
                <button
                  onClick={handleCopyResponse}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  {copiedResponse ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedResponse ? 'Copié' : 'Copier JSON'}</span>
                </button>
              )}
            </div>

            <div className="flex-1 p-3.5 overflow-auto max-h-[350px]">
              {isLoading ? (
                <div className="text-center py-10 text-slate-500 text-xs font-mono">
                  Requête en cours d'exécution...
                </div>
              ) : responseJson ? (
                <pre className="text-xs font-mono text-emerald-300 whitespace-pre-wrap leading-relaxed">
                  {JSON.stringify(responseJson, null, 2)}
                </pre>
              ) : (
                <div className="text-center py-10 text-slate-600 text-xs">
                  Cliquez sur <strong className="text-emerald-400">"Tester"</strong> pour envoyer une requête en direct à l'API.
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
