import { GoogleGenAI } from '@google/genai';

let ai: GoogleGenAI | undefined;

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('Gemini is optional and is not configured. Set GEMINI_API_KEY to enable AI features.');
  }

  ai ??= new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  return ai;
}

export const ALL_GEMINI_MODELS = [
  'gemini-3.8-flash',
  'gemini-2.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3-flash',
  'gemini-2.5-pro',
  'gemini-2.5-flash-thinking',
];

export async function generateWithAnyGeminiModel(prompt: string, preferredModel?: string, jsonMode: boolean = false): Promise<string> {
  const modelsToTry = preferredModel && ALL_GEMINI_MODELS.includes(preferredModel)
    ? [preferredModel, ...ALL_GEMINI_MODELS.filter(m => m !== preferredModel)]
    : ALL_GEMINI_MODELS;

  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      const response = await getGeminiClient().models.generateContent({
        model,
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: jsonMode ? 'application/json' : 'text/plain',
        },
      });

      if (response.text) {
        return response.text;
      }
    } catch (err) {
      lastError = err;
      console.warn(`[Gemini Model ${model}] Failed, trying next model...`, err);
    }
  }

  throw lastError || new Error('All Gemini models failed to generate content.');
}

export async function fetchRealEquidiaArchive(horseName: string, preferredModel?: string): Promise<any[]> {
  if (!isGeminiConfigured()) return [];

  try {
    const prompt = `Consulte les données publiques officielles sur www.equidia.fr et le PMU pour extraire l'historique exact des dernières courses courues par le cheval de course "${horseName}" (depuis 2021).
Retourne un objet JSON valide avec une clé "coursesPassees" contenant un tableau de ses courses réelles. Chaque objet du tableau doit contenir :
- date (JJ/MM/AAAA)
- hippodrome (nom)
- nomCourse (nom du Prix)
- distance (mètres)
- discipline (Plat, Trot Attelé, Haies, etc.)
- corde (Corde à gauche / droite)
- allocation (euros)
- valeurHandicap (nombre ou null)
- rang (1, 2, 3, Da, etc.)
- gains (euros)
- cote (nombre)
- deferre (D4, DA, DP, F)`;

    const textResult = await generateWithAnyGeminiModel(prompt, preferredModel, true);
    const parsed = JSON.parse(textResult || '{}');
    return Array.isArray(parsed.coursesPassees) ? parsed.coursesPassees : [];
  } catch (err) {
    console.error(`[Equidia Grounding] Error fetching archive for ${horseName}:`, err);
    return [];
  }
}
