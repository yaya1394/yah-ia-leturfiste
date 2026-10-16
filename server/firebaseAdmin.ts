import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize only if not already initialized
const projectId = process.env.FIREBASE_PROJECT_ID;
const databaseId = process.env.FIRESTORE_DATABASE_ID;
let app: App;
if (!getApps().length) {
  app = initializeApp(projectId ? { projectId } : {});
} else {
  app = getApps()[0];
}

export const db = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
