import React, { useState } from 'react';
import { Course, AIAnalysisResponse, PredictionResult } from '../types/turf';
import { Sparkles, MessageSquare, Send, Bot, User, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

interface GeminiAdvisorProps {
  course: Course | null;
  prediction: PredictionResult | null;
  analysis: AIAnalysisResponse | null;
  isLoadingAnalysis: boolean;
  onRefreshAnalysis: () => void;
}

export const GeminiAdvisor: React.FC<GeminiAdvisorProps> = ({
  course,
  prediction,
  analysis,
  isLoadingAnalysis,
  onRefreshAnalysis,
}) => {
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'model'; text: string }>>([
    {
      role: 'model',
      text: "Salut l'ami turfiste ! Je suis Yah.IA, ton consultant hippique. J'ai analysé les chronos, les déferrages et les cotes en direct. Pose-moi n'importe quelle question sur les partants ou dis-moi ton budget de jeu !",
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSendMessage = async (msgToSend?: string) => {
    const text = msgToSend || inputText;
    if (!text.trim() || isSending) return;

    const newHistory = [...chatMessages, { role: 'user' as const, text }];
    setChatMessages(newHistory);
    setInputText('');
    setIsSending(true);

    try {
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: chatMessages,
          contextData: course ? {
            nom: course.nom,
            hippodrome: course.hippodrome,
            distance: course.distance,
            nbPartants: course.nbPartants,
            topBases: prediction?.syntheseChiffree.slice(0, 4),
          } : undefined,
        }),
      });

      const data = await res.json();
      if (data.success && data.reply) {
        setChatMessages([...newHistory, { role: 'model', text: data.reply }]);
      } else {
        setChatMessages([...newHistory, { role: 'model', text: "Une petite baisse de tension au canter ! Réessaie dans un instant." }]);
      }
    } catch (err: any) {
      setChatMessages([...newHistory, { role: 'model', text: "Erreur de connexion avec l'IA. Vérifie ta connexion." }]);
    } finally {
      setIsSending(false);
    }
  };

  const quickPrompts = [
    "Quel est le tocard le plus rentable aujourd'hui ?",
    "Fais-moi un ticket 2 sur 4 à moins de 6 €",
    "Le favori est-il vraiment imbattable ?",
    "Pourquoi se méfier du n°1 dans ce Quinté ?",
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-6 mb-8 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <span>Studio Expert IA Gemini 3.8 Flash</span>
            <span className="text-xs px-2 py-0.5 rounded font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Yah.IA Consulting
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            Analyse littéraire, tactique et conversationnelle des courses par l'intelligence artificielle hippique.
          </p>
        </div>

        <button
          onClick={onRefreshAnalysis}
          disabled={isLoadingAnalysis}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm shadow-emerald-950/20 active:scale-95 shrink-0 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAnalysis ? 'animate-spin' : ''}`} />
          <span>{isLoadingAnalysis ? 'Génération IA en cours...' : 'Actualiser l\'Analyse'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Full Written AI Briefing */}
        <div className="lg:col-span-7 space-y-4">
          {isLoadingAnalysis ? (
            <div className="p-8 text-center bg-slate-950/60 rounded-xl border border-slate-800/80">
              <Sparkles className="w-8 h-8 text-emerald-400 animate-spin mx-auto mb-3" />
              <div className="text-sm font-semibold text-white mb-1">
                Gemini 3.8 Flash analyse les partants et cotes...
              </div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Croisement des chronos, de la régularité, de la monte et détection des tocards spéculatifs.
              </p>
            </div>
          ) : analysis ? (
            <div className="space-y-4">
              
              {/* Card 1: Title and Scenario */}
              <div className="p-4 sm:p-5 bg-slate-950 rounded-xl border border-slate-800">
                <div className="text-sm font-bold text-emerald-400 mb-2 flex items-center justify-between">
                  <span>{analysis.titre}</span>
                  <span className="text-[10px] font-mono text-slate-500">{analysis.genereLe}</span>
                </div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Scénario Tactique de la Course :
                </h3>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  {analysis.scenarioDeCourse}
                </p>
              </div>

              {/* Card 2: Favorites & Tocards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-1.5 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>L'Analyse des Favoris</span>
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {analysis.analyseFavorites}
                  </p>
                </div>

                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-400 mb-1.5 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Le Secret des Tocards</span>
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {analysis.secretsDesTocards}
                  </p>
                </div>
              </div>

              {/* Card 3: Advice by Budget */}
              <div className="p-4 sm:p-5 bg-slate-950 rounded-xl border border-slate-800">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                  Stratégies de Jeux Recommandées par Budget :
                </h3>
                <div className="space-y-2.5 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80">
                    <strong className="text-emerald-400 font-semibold block mb-0.5">Budget Découverte (&lt; 10 €) :</strong>
                    <span className="text-slate-300">{analysis.conseilDeJeu.budgetPetit}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80">
                    <strong className="text-cyan-400 font-semibold block mb-0.5">Budget Médian (20 - 30 €) :</strong>
                    <span className="text-slate-300">{analysis.conseilDeJeu.budgetMoyen}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80">
                    <strong className="text-amber-400 font-semibold block mb-0.5">Budget Confort (50 € +) :</strong>
                    <span className="text-slate-300">{analysis.conseilDeJeu.budgetConfort}</span>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="p-8 text-center bg-slate-950/60 rounded-xl border border-slate-800">
              <p className="text-xs text-slate-400 mb-3">Aucune analyse encore générée pour cette course.</p>
              <button
                onClick={onRefreshAnalysis}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300"
              >
                Générer l'analyse Gemini
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Conversational AI Chat Box with Yah.IA */}
        <div className="lg:col-span-5 flex flex-col h-[520px] bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
          <div className="p-3.5 border-b border-slate-800 bg-slate-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-white">Chat en direct avec Yah.IA</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
              En ligne
            </span>
          </div>

          {/* Quick Prompts Bar */}
          <div className="p-2.5 border-b border-slate-800/80 bg-slate-950/50 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {quickPrompts.map((q, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(q)}
                disabled={isSending}
                className="text-[11px] px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 whitespace-nowrap cursor-pointer shrink-0 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 text-xs">
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'model' && (
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 text-[11px] font-bold border border-emerald-500/30">
                    Y
                  </div>
                )}
                <div
                  className={`p-3 rounded-xl max-w-[85%] leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-emerald-500 text-slate-950 font-medium rounded-tr-none'
                      : 'bg-slate-900 text-slate-200 border border-slate-800 rounded-tl-none'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isSending && (
              <div className="flex gap-2 text-slate-400 text-xs items-center">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 text-[11px] font-bold border border-emerald-500/30">
                  Y
                </div>
                <span className="italic">Yah.IA réfléchit...</span>
              </div>
            )}
          </div>

          {/* Input Box */}
          <div className="p-3 border-t border-slate-800 bg-slate-900 flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Posez votre question à Yah.IA..."
              disabled={isSending}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || isSending}
              className="p-2 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-slate-950 rounded-lg cursor-pointer transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
