import express, { Request, Response } from 'express';
import { getProgramme, getCourseDetail, parseDateInput, getHorseArchive } from './pmuService.js';
import { sortChronoMax10 } from './firestoreService.js';
import { processDate } from './scraper.js';
import { ALL_GEMINI_MODELS, generateWithAnyGeminiModel, isGeminiConfigured } from './geminiService.js';
import { archiveRouter } from './archiveRouter.js';

export const apiRouter = express.Router();
apiRouter.use(express.json());
apiRouter.use('/archive', archiveRouter);

// GET /api/trigger-scrape?date=YYYY-MM-DD
apiRouter.get('/trigger-scrape', async (req: Request, res: Response) => {
  try {
    const rawDate = (req.query.date as string) || new Date().toISOString().split('T')[0];
    const parsed = parseDateInput(rawDate);
    const reunions = await getProgramme(parsed.dStr);
    res.json({
      success: true,
      date: parsed.isoStr,
      reunionsCount: reunions.length,
      reunions,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    service: 'Yah.IA.LeTurfiste API (Equidia Navigation Concept)',
    version: '4.2.0',
    timestamp: new Date().toISOString(),
  });
});

// GET /api/programme or /api/courses
apiRouter.get(['/programme', '/courses'], async (req: Request, res: Response) => {
  try {
    const rawDate = (req.query.date as string) || (req.query.d as string) || '';
    const parsed = parseDateInput(rawDate);
    const reunions = await getProgramme(parsed.dStr);
    res.json({
      success: true,
      date: parsed.displayStr,
      dateDDMMYYYY: parsed.dStr,
      dateISO: parsed.isoStr,
      isPast: parsed.isPast,
      isToday: parsed.isToday,
      isFuture: parsed.isFuture,
      reunions,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/programme/:date or /api/courses/:date
apiRouter.get(['/programme/:date', '/courses/:date'], async (req: Request, res: Response) => {
  try {
    const parsed = parseDateInput(req.params.date);
    const reunions = await getProgramme(parsed.dStr);
    res.json({
      success: true,
      date: parsed.displayStr,
      dateDDMMYYYY: parsed.dStr,
      dateISO: parsed.isoStr,
      isPast: parsed.isPast,
      isToday: parsed.isToday,
      isFuture: parsed.isFuture,
      reunions,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/course/:reunion/:course?date=...
apiRouter.get('/course/:reunion/:course', async (req: Request, res: Response) => {
  try {
    const { reunion, course } = req.params;
    const rawDate = (req.query.date as string) || (req.query.d as string) || '';
    const parsed = parseDateInput(rawDate);
    const courseDetail = await getCourseDetail(parsed.dStr, parseInt(reunion, 10), parseInt(course, 10));
    res.json({
      success: true,
      date: parsed.displayStr,
      dateDDMMYYYY: parsed.dStr,
      dateISO: parsed.isoStr,
      course: courseDetail,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/course/:date/:reunion/:course
apiRouter.get('/course/:date/:reunion/:course', async (req: Request, res: Response) => {
  try {
    const { date, reunion, course } = req.params;
    const parsed = parseDateInput(date);
    const courseDetail = await getCourseDetail(parsed.dStr, parseInt(reunion, 10), parseInt(course, 10));
    res.json({
      success: true,
      date: parsed.displayStr,
      dateDDMMYYYY: parsed.dStr,
      dateISO: parsed.isoStr,
      course: courseDetail,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/calendrier
apiRouter.get('/calendrier', (req: Request, res: Response) => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const dates = [
    { label: 'Hier', ...parseDateInput(yesterday) },
    { label: 'Aujourd\'hui', ...parseDateInput(today) },
    { label: 'Demain', ...parseDateInput(tomorrow) },
  ];
  res.json({ success: true, dates });
});

// GET /api/horse-archive/:nom
apiRouter.get('/horse-archive/:nom', async (req: Request, res: Response) => {
  try {
    const { nom } = req.params;
    const archive = await getHorseArchive(decodeURIComponent(nom));
    const coursesPassees = sortChronoMax10(archive.coursesPassees);
    res.json({
      success: true,
      horse: {
        ...archive,
        coursesPassees,
      },
      coursesPassees,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/history?since=YYYY-MM-DD
apiRouter.get('/history', async (req: Request, res: Response) => {
  try {
    const { since } = req.query;
    // In a real application, you would query your database here based on the 'since' date.
    // For now, returning an empty array as a placeholder.
    res.json({
      success: true,
      data: [],
      message: `Data requested since ${since}`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/ai/models
apiRouter.get('/ai/models', (req: Request, res: Response) => {
  res.json({
    success: true,
    configured: isGeminiConfigured(),
    models: isGeminiConfigured() ? ALL_GEMINI_MODELS : [],
  });
});

// POST /api/ai/generate
apiRouter.post('/ai/generate', async (req: Request, res: Response) => {
  try {
    const { prompt, model, jsonMode } = req.body;
    if (!prompt) {
      return res.status(400).json({ success: false, error: 'Prompt is required' });
    }
    if (!isGeminiConfigured()) {
      return res.status(503).json({
        success: false,
        code: 'AI_NOT_CONFIGURED',
        error: 'Les fonctions IA sont facultatives. Configurez GEMINI_API_KEY pour les activer.',
      });
    }
    const result = await generateWithAnyGeminiModel(prompt, model, Boolean(jsonMode));
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

