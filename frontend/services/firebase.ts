import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  serverTimestamp 
} from 'firebase/firestore';

const env = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyAu-Bhai8PpCrhvWmlI-Vl-IgWVRbKc2k8",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "truewear-29356.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "truewear-29356",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "truewear-29356.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "526211621020",
  appId: env.VITE_FIREBASE_APP_ID || "1:526211621020:web:745f817a1d8492b6348d59",
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || "G-45V79TDC3R"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);

export interface SavedStrategyRun {
  id?: string;
  circuitId: string;
  driverCode: string;
  model: string;
  recommendedPitLap: number;
  projectedCliffLap: number;
  totalRaceTimeDelta: number;
  strategyAction: string;
  primaryReason: string;
  createdAt?: any;
}

/**
 * Persist a strategy simulation to Firestore
 */
export async function saveStrategyRun(run: Omit<SavedStrategyRun, 'id' | 'createdAt'>): Promise<string> {
  try {
    const colRef = collection(db, 'strategy_runs');
    const docRef = await addDoc(colRef, {
      ...run,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.warn('[TRUEWEAR] Firestore save warning (database might still be provisioning):', error);
    throw error;
  }
}

/**
 * Fetch recent saved strategy runs
 */
export async function getRecentStrategyRuns(count: number = 5): Promise<SavedStrategyRun[]> {
  try {
    const colRef = collection(db, 'strategy_runs');
    const q = query(colRef, orderBy('createdAt', 'desc'), limit(count));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as SavedStrategyRun[];
  } catch (error) {
    console.warn('[TRUEWEAR] Firestore fetch warning:', error);
    return [];
  }
}

export default app;
