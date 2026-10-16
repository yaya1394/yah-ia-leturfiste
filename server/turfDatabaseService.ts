import { db } from './firebaseAdmin.js';
import { fetchRealEquidiaArchive } from './geminiService.js';

export async function saveRaceArchive(raceData: {
  date: string; // YYYY-MM-DD or DDMMYYYY
  discipline: string; // 'TROT' or 'GALOP'
  hippodrome: string;
  nomCourse: string;
  reunionNum: number;
  courseNum: number;
  participants: any[];
  ordreArrivee?: number[];
}) {
  const isGalop = raceData.discipline.toUpperCase().includes('PLAT') || raceData.discipline.toUpperCase().includes('OBSTACLE') || raceData.discipline.toUpperCase().includes('HAIES') || raceData.discipline.toUpperCase().includes('GALOP');
  const collectionName = isGalop ? 'races_galop' : 'races_trot';

  const docId = `${raceData.date}_R${raceData.reunionNum}C${raceData.courseNum}`;
  await db.collection(collectionName).doc(docId).set({
    ...raceData,
    updatedAt: new Date().toISOString(),
  }, { merge: true });

  // Update unique horses registry in Firestore
  for (const p of (raceData.participants || [])) {
    if (p.nom) {
      const horseDocId = p.nom.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
      const horseRef = db.collection('horses_registry').doc(horseDocId);
      const existing = await horseRef.get();
      
      let pastRaces = existing.exists ? (existing.data()?.coursesPassees || []) : [];
      if (!pastRaces.some((c: any) => c.date === raceData.date && c.nomCourse === raceData.nomCourse)) {
        pastRaces.push({
          date: raceData.date,
          hippodrome: raceData.hippodrome,
          nomCourse: raceData.nomCourse,
          discipline: raceData.discipline,
          rang: p.ordreArrivee || p.rang || '—',
          gains: p.gains || 0,
          cote: p.dernierRapportDirect?.rapport || 15,
        });
      }

      await horseRef.set({
        nom: p.nom,
        musique: p.musique || '',
        entraineur: p.entraineur || '',
        driver: p.driver || '',
        gainsCarriere: p.gainsParticipant?.gainsCarriere || 0,
        coursesPassees: pastRaces,
        lastUpdated: new Date().toISOString(),
      }, { merge: true });
    }
  }
}

export async function getStoredRaces(discipline: 'trot' | 'galop', dateStr?: string) {
  const collectionName = discipline === 'galop' ? 'races_galop' : 'races_trot';
  let query: any = db.collection(collectionName);
  if (dateStr) {
    query = query.where('date', '==', dateStr);
  }
  const snap = await query.limit(50).get();
  return snap.docs.map((doc: any) => doc.data());
}

export async function getStoredHorse(horseName: string) {
  const horseDocId = horseName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
  const snap = await db.collection('horses_registry').doc(horseDocId).get();
  return snap.exists ? snap.data() : null;
}
