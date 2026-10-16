import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

type Environment = Record<string, string | undefined>;
const processEnv = (globalThis as typeof globalThis & { process?: { env?: Environment } }).process?.env ?? {};
const viteEnv = (import.meta as ImportMeta & { env?: Environment }).env ?? {};
const env = { ...processEnv, ...viteEnv };

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

const missingFirebaseOptions = Object.entries(firebaseConfig)
  .filter(([key, value]) => ['apiKey', 'projectId', 'appId'].includes(key) && !value)
  .map(([key]) => key);

if (missingFirebaseOptions.length) {
  throw new Error(`Configuration Firebase manquante. Renseignez VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID et VITE_FIREBASE_APP_ID dans .env.local.`);
}

const app = initializeApp(firebaseConfig);
const databaseId = env.VITE_FIRESTORE_DATABASE_ID;
export const db = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
export const auth = getAuth();
