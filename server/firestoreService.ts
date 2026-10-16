import { db, auth } from '../src/firebase.js';
import { collection, doc, getDoc, setDoc, query, where, getDocs, limit } from 'firebase/firestore';
import { Reunion, Participant, CoursePassee } from '../src/types/turf.js';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): FirestoreErrorInfo {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path,
  };
  console.warn('Firestore notice/error:', JSON.stringify(errInfo));
  return errInfo;
}

export function normalizeHorseKey(name: string): string {
  return (name || '').trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]/g, '_');
}

export function parseDateTimestamp(dStr: string): number {
  if (!dStr) return 0;
  const parts = dStr.split('/');
  if (parts.length === 3) {
    return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10)).getTime();
  }
  return 0;
}

/**
 * Sorts past races in strict chronological order (oldest to newest)
 * and keeps a maximum of the 10 most recent career performances.
 */
export function sortChronoMax10(races?: CoursePassee[]): CoursePassee[] {
  if (!races || !Array.isArray(races) || races.length === 0) return [];
  const valid = races.filter(r => r && r.date);
  // Sort descending (newest to oldest)
  valid.sort((a, b) => parseDateTimestamp(b.date) - parseDateTimestamp(a.date));
  // Keep the 10 most recent
  return valid.slice(0, 10);
}

export async function getRacesFromFirestore(dateStr: string): Promise<Reunion[] | null> {
  try {
    const q = query(collection(db, 'races'), where('date', '==', dateStr));
    const racesSnapshot = await getDocs(q);
    
    if (racesSnapshot.empty) {
      return null;
    }

    const reunionsMap = new Map<number, Reunion>();

    for (const docSnap of racesSnapshot.docs) {
      const raceData = docSnap.data();
      const reunionNum = raceData.reunionNum || 1;
      
      if (!reunionsMap.has(reunionNum)) {
        reunionsMap.set(reunionNum, {
          numOfficiel: reunionNum,
          nomHippodrome: raceData.track || raceData.hippodrome || 'Unknown',
          pays: raceData.pays || 'FRA',
          disciplinePrincipale: raceData.discipline || 'PLAT',
          date: dateStr,
          courses: []
        });
      }

      const reunion = reunionsMap.get(reunionNum)!;
      reunion.courses.push({
        numOfficiel: raceData.number || raceData.numOfficiel || 1,
        nom: raceData.name || raceData.nom || 'Course',
        heureDepart: raceData.heureDepart || '13h50',
        distance: raceData.distance || 1600,
        discipline: raceData.discipline || 'PLAT',
        nbPartants: raceData.nbPartants || 0,
        isQuinte: !!raceData.isQuinte,
        allocation: raceData.allocations || raceData.allocation || 0,
        isArriveeDefinitive: !!raceData.isArriveeDefinitive,
        ordreArrivee: raceData.ordreArrivee,
        statutCourse: raceData.statutCourse || 'A_VENIR'
      });
    }

    return Array.from(reunionsMap.values());
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'races');
    return null;
  }
}

/**
 * Retrieve horse profile directly from the database
 * with its maximum 10 last races strictly in chronological order.
 */
export async function getHorseDetailsByName(name: string): Promise<Partial<Participant> | null> {
  const normKey = normalizeHorseKey(name);
  if (!normKey) return null;

  try {
    // 1. Direct doc lookup by normalized key
    const docRef = doc(db, 'horses', normKey);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as Partial<Participant>;
      return {
        ...data,
        coursesPassees: sortChronoMax10(data.coursesPassees),
      };
    }

    // 2. Query by nom
    const q1 = query(collection(db, 'horses'), where('nom', '==', name.trim().toUpperCase()), limit(1));
    const s1 = await getDocs(q1);
    if (!s1.empty) {
      const data = s1.docs[0].data() as Partial<Participant>;
      return {
        ...data,
        coursesPassees: sortChronoMax10(data.coursesPassees),
      };
    }

    // 3. Query by name (legacy field)
    const q2 = query(collection(db, 'horses'), where('name', '==', name.trim().toUpperCase()), limit(1));
    const s2 = await getDocs(q2);
    if (!s2.empty) {
      const data = s2.docs[0].data() as Partial<Participant>;
      return {
        ...data,
        coursesPassees: sortChronoMax10(data.coursesPassees),
      };
    }

    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `horses/${normKey}`);
    return null;
  }
}

function cleanFirestorePayload<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        result[key] = value.map(item => (typeof item === 'object' && item !== null ? cleanFirestorePayload(item) : item));
      } else if (typeof value === 'object' && value !== null) {
        result[key] = cleanFirestorePayload(value);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}

/**
 * Save horse profile directly to the database
 * guaranteeing maximum 10 past races in chronological order.
 */
export async function saveHorseToFirestore(horse: Partial<Participant>): Promise<void> {
  if (!horse || !horse.nom) return;
  const normKey = normalizeHorseKey(horse.nom);
  if (!normKey) return;

  const chronoPastRaces = sortChronoMax10(horse.coursesPassees);

  const rawPayload: any = {
    ...horse,
    nom: horse.nom.trim().toUpperCase(),
    coursesPassees: chronoPastRaces,
    nbCoursesCarriere: horse.nbCoursesCarriere || chronoPastRaces.length,
    nbVictoires: horse.nbVictoires ?? chronoPastRaces.filter(r => r.rang === 1 || r.rang === '1').length,
    nbPlaces: horse.nbPlaces ?? chronoPastRaces.filter(r => r.rang === 2 || r.rang === 3).length,
    updatedAt: new Date().toISOString(),
  };

  const payload = cleanFirestorePayload(rawPayload);

  try {
    const docRef = doc(db, 'horses', normKey);
    await setDoc(docRef, payload, { merge: true });
    console.log(`[Firestore DB] Cheval sauvegardé en base : ${horse.nom} (${chronoPastRaces.length} courses passées chronologiques)`);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `horses/${normKey}`);
  }
}

/**
 * Seed all champion horses into Firestore database
 */
export async function seedInitialHorses(horsesMap: Record<string, Partial<Participant>>): Promise<number> {
  let count = 0;
  for (const [key, horse] of Object.entries(horsesMap)) {
    try {
      await saveHorseToFirestore({
        ...horse,
        nom: horse.nom || key,
      });
      count++;
    } catch (e) {
      console.warn(`[Firestore DB] Erreur lors de l'enregistrement de ${key}:`, e);
    }
  }
  return count;
}
