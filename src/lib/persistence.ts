import type { FontData } from '../store';

const DB_NAME = 'kumiko-font-editor';
const STORE_NAME = 'drafts';
const DRAFT_KEY = 'autosave';

const openDatabase = async () => {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const loadDraft = async () => {
  const database = await openDatabase();

  return new Promise<FontData | null>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(DRAFT_KEY);

    request.onsuccess = () => resolve((request.result as FontData | undefined) ?? null);
    request.onerror = () => reject(request.error);
  });
};

export const saveDraft = async (fontData: FontData) => {
  const database = await openDatabase();

  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(fontData, DRAFT_KEY);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};
