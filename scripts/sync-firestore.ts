import { syncFromFirestore } from '../src/seoHelper';

async function main() {
  console.log('🔄 Running workspace sync from Firestore before build...');
  try {
    const data = await syncFromFirestore();
    if (data) {
      console.log(`✅ Success! Synced ${data.apps?.length || 0} apps from Firestore.`);
    } else {
      console.warn('⚠️ Warning: Firestore sync returned empty or failed. Using existing local data.');
    }
  } catch (error) {
    console.error('❌ Failed to sync from Firestore:', error);
  }
}

main();
