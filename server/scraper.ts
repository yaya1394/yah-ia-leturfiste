import cron from 'node-cron';
import { getRealPmuProgramme, getRealPmuCourse } from './pmuService.js';
import { saveHorseToFirestore } from './firestoreService.js';
import { db } from '../src/firebase.js';
import { collection, doc, setDoc } from 'firebase/firestore';

/**
 * Sync real PMU data for a given date (format YYYY-MM-DD or DDMMYYYY) into Firestore
 */
export async function processRealPmuDate(rawDate: string) {
  try {
    // Convert to DDMMYYYY if YYYY-MM-DD
    let dStr = rawDate;
    if (rawDate.includes('-')) {
      const parts = rawDate.split('-');
      if (parts.length === 3) {
        dStr = `${parts[2]}${parts[1]}${parts[0]}`;
      }
    }

    console.log(`[PMU Real Scraper] Synchronisation des données réelles PMU pour la date: ${dStr}...`);
    const reunions = await getRealPmuProgramme(dStr);

    if (!reunions || reunions.length === 0) {
      console.log(`[PMU Real Scraper] Programme PMU indisponible pour ${dStr}; aucune donnée de remplacement écrite.`);
      return;
    }

    let racesSaved = 0;
    let racesSkipped = 0;
    for (const reunion of reunions) {
      for (const course of reunion.courses) {
        const raceId = `R${reunion.numOfficiel}C${course.numOfficiel}-${dStr}`;
        const detailedCourse = await getRealPmuCourse(dStr, reunion.numOfficiel, course.numOfficiel);
        if (!detailedCourse?.participants?.length) {
          racesSkipped++;
          continue;
        }

        const arrival = detailedCourse.ordreArrivee || [];
        const hasRankedRunner = detailedCourse.participants.some((participant) => participant.ordreArrivee != null);
        if (!detailedCourse.isArriveeDefinitive || (arrival.length === 0 && !hasRankedRunner)) {
          // Do not let provisional, future or generated results enter the archive.
          racesSkipped++;
          continue;
        }

        const raceDocRef = doc(collection(db, 'races'), raceId);
        const rankByNumber = new Map<number, number>();
        arrival.forEach((number, index) => {
          if (!rankByNumber.has(number)) rankByNumber.set(number, index + 1);
        });
        const participants = detailedCourse.participants.map((participant) => ({
          ...participant,
          ordreArrivee: participant.ordreArrivee ?? rankByNumber.get(participant.numPmu),
        }));

        const racePayload = {
          raceId,
          date: dStr,
          reunionNum: reunion.numOfficiel,
          track: reunion.nomHippodrome,
          pays: reunion.pays,
          discipline: detailedCourse.discipline || reunion.disciplinePrincipale,
          number: detailedCourse.courseNum,
          name: detailedCourse.nom,
          heureDepart: detailedCourse.heureDepart,
          distance: detailedCourse.distance,
          allocation: detailedCourse.allocationTotale,
          nbPartants: detailedCourse.nbPartants,
          corde: detailedCourse.corde,
          surfacePiste: detailedCourse.surfacePiste,
          isQuinte: detailedCourse.isQuinte,
          isArriveeDefinitive: detailedCourse.isArriveeDefinitive,
          ordreArrivee: arrival,
          statutCourse: detailedCourse.statutCourse,
          source: 'PMU_REST',
          participants,
          updatedAt: new Date().toISOString(),
        };

        await setDoc(raceDocRef, racePayload, { merge: true });
        racesSaved++;

        // Save participants & their real career archives into horses collection
        for (const participant of participants) {
          await saveHorseToFirestore(participant);
        }
      }
    }

    console.log(`[PMU Real Scraper] ${dStr}: ${racesSaved} courses PMU définitives enregistrées, ${racesSkipped} ignorées faute de partants/résultat définitif.`);
  } catch (err) {
    console.error(`[PMU Real Scraper] Erreur lors de la synchronisation de ${rawDate}:`, err);
  }
}

export const processDate = processRealPmuDate;
export const runBackfill = syncRecentDates;

export async function syncRecentDates(startDateStr?: string) {
  if (startDateStr) {
    const startDate = new Date(startDateStr);
    const endDate = new Date();
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      await processRealPmuDate(`${yyyy}-${mm}-${dd}`);
    }
    return;
  }
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const datesToSync = [yesterday, today, tomorrow];
  for (const d of datesToSync) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    await processRealPmuDate(`${yyyy}-${mm}-${dd}`);
  }
}

export function startScraper() {
  // Runs daily at 01:00 AM
  cron.schedule('0 1 * * *', async () => {
    console.log('[PMU Real Scraper] Lancement du scraper automatique quotidien...');
    await syncRecentDates();
  });
}

