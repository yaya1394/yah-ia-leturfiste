import { REAL_CHAMPIONS, getProgramme, getCourseDetail, getHorseArchive } from '../server/pmuService.js';
import { seedInitialHorses } from '../server/firestoreService.js';

async function seed() {
  console.log("Démarrage du remplissage des fiches de chevaux en base de données Firestore...");
  
  // 1. Enregistrer tous les grands champions avec leurs 10 dernières courses
  const count1 = await seedInitialHorses(REAL_CHAMPIONS);
  console.log(`✅ ${count1} champions authentiques enregistrés en base Firestore.`);

  // 2. Extraire et enregistrer les partants officiels d'Aujourd'hui, Hier et Demain
  const dates = ['14102026', '13102026', '15102026'];
  let extraCount = 0;

  for (const dStr of dates) {
    try {
      const prog = await getProgramme(dStr);
      for (const reunion of (prog || []).slice(0, 3)) {
        for (const c of (reunion.courses || []).slice(0, 3)) {
          const detail = await getCourseDetail(dStr, reunion.numOfficiel, c.numOfficiel);
          if (detail && detail.participants) {
            for (const p of detail.participants) {
              if (p.nom) {
                // getHorseArchive récupère, garantit 10 courses chronologiques et sauvegarde en base Firestore
                await getHorseArchive(p.nom);
                extraCount++;
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn(`Erreur lors du traitement pour ${dStr}:`, e);
    }
  }

  console.log(`✅ Total de fiches chevaux remplies en base de données : ${count1 + extraCount}`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Erreur de seed:", err);
  process.exit(1);
});
