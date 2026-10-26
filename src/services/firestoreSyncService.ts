import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const CHUNK_SIZE = 25; // items per chunk document (aligned with useDataActions.ts)

export const firestoreSyncService = {
  /**
   * Reads chunked items from Firestore
   */
  async readChunkedData<T>(metaDocName: string, chunkPrefix: string, legacyDocName?: string): Promise<{ items: T[]; success: boolean }> {
    if (!db) return { items: [], success: false };

    try {
      const metaSnap = await getDoc(doc(db, 'store_data', metaDocName));
      if (metaSnap.exists()) {
        const numChunks = metaSnap.data().numChunks || 1;
        const fetchPromises = [];

        for (let i = 0; i < numChunks; i++) {
          fetchPromises.push(
            (async () => {
              try {
                const chunkSnap = await getDoc(doc(db, 'store_data', `${chunkPrefix}_${i}`));
                if (chunkSnap.exists() && Array.isArray(chunkSnap.data().items)) {
                  return chunkSnap.data().items as T[];
                }
              } catch (e) {
                console.warn(`[firestoreSyncService] Failed to fetch chunk ${chunkPrefix}_${i}`, e);
              }
              return [] as T[];
            })()
          );
        }

        const chunkResults = await Promise.all(fetchPromises);
        const combined = chunkResults.flat();
        return { items: combined, success: true };
      } else if (legacyDocName) {
        // Fallback to legacy unchunked doc
        const legacySnap = await getDoc(doc(db, 'store_data', legacyDocName));
        if (legacySnap.exists() && Array.isArray(legacySnap.data().items)) {
          return { items: legacySnap.data().items as T[], success: true };
        }
      }
    } catch (err) {
      console.warn(`[firestoreSyncService] Error reading chunked data for ${metaDocName}:`, err);
    }

    return { items: [], success: false };
  },

  /**
   * Writes chunked items to Firestore cleanly with meta doc tracking and stale chunk cleanup
   */
  async writeChunkedData<T>(metaDocName: string, chunkPrefix: string, items: T[]): Promise<boolean> {
    if (!db) return false;

    try {
      const numChunks = Math.max(1, Math.ceil(items.length / CHUNK_SIZE));

      // Write meta doc
      await setDoc(doc(db, 'store_data', metaDocName), {
        numChunks,
        count: items.length,
        totalItems: items.length,
        updatedAt: new Date().toISOString()
      });

      // Write chunk docs
      const writePromises = [];
      for (let i = 0; i < numChunks; i++) {
        const chunkItems = items.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        writePromises.push(
          setDoc(doc(db, 'store_data', `${chunkPrefix}_${i}`), {
            items: chunkItems,
            count: chunkItems.length,
            chunkIndex: i,
            updatedAt: new Date().toISOString()
          })
        );
      }

      // Clean up any orphaned higher chunks (up to 15)
      for (let i = numChunks; i < 16; i++) {
        writePromises.push(
          deleteDoc(doc(db, 'store_data', `${chunkPrefix}_${i}`)).catch(() => undefined)
        );
      }

      await Promise.all(writePromises);
      return true;
    } catch (err) {
      console.error(`[firestoreSyncService] Failed writing chunked data for ${metaDocName}:`, err);
      throw err;
    }
  }
};

export default firestoreSyncService;
