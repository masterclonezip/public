import { collection, doc, getDoc, getDocFromServer, getDocs, setDoc } from 'firebase/firestore';
import { db, isFirebaseReal } from '../lib/firebase';
import { AppConfig, GlobalSettings, NewsItem, VideoItem } from '../types';
import { mockApps, mockSettings, mockNews, mockVideos } from '../lib/lightFallback';

export const FETCH_TIMEOUT = 15000;

/**
 * Fetches backup data from the local Express API
 */
export async function fetchBackupData() {
  try {
    const isAdmin = typeof window !== 'undefined' && (window.location.pathname.startsWith('/admin') || window.location.pathname.startsWith('/masterworld'));
    const url = isAdmin ? '/api/v1/public/backup-data-full' : '/api/v1/public/backup-data';
    const res = await fetch(url);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("Failed to load background public backup data:", err);
  }
  return null;
}

/**
 * Fetches a single document from Firestore with a timeout
 */
export async function getFirestoreDoc<T>(collectionName: string, docId: string): Promise<T | null> {
  if (!isFirebaseReal || !db) return null;
  
  try {
    const docRef = doc(db, collectionName, docId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as T;
    }
  } catch (err) {
    console.error(`Error fetching ${collectionName}/${docId}:`, err);
  }
  return null;
}

/**
 * Saves data to Firestore
 */
export async function saveToFirestore<T>(collectionName: string, docId: string, data: T): Promise<void> {
  if (!isFirebaseReal || !db) throw new Error("Firebase not configured");
  
  const docRef = doc(db, collectionName, docId);
  await setDoc(docRef, data as any);
}

/**
 * Common data structure for all collections in our Firestore schema
 */
export interface CollectionData<T> {
  data: T[];
  last_updated?: string;
}
