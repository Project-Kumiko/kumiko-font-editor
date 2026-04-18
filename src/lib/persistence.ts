import type { FontData } from '../store';

const DB_NAME = 'kumiko-font-editor';
const STORE_NAME = 'projects';

export interface ProjectDraft {
  id: string;
  title: string;
  lastModified: number;
  fontData?: FontData;
  projectMetadata?: Record<string, unknown> | null;
  projectSourceFormat?: 'glyphs' | null;
}

export interface ProjectSummary {
  id: string;
  title: string;
  lastModified: number;
}

const openDatabase = async () => {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, 2);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (database.objectStoreNames.contains('drafts')) {
        database.deleteObjectStore('drafts');
      }
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const loadProject = async (id: string) => {
  const database = await openDatabase();
  return new Promise<ProjectDraft | null>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => resolve((request.result as ProjectDraft | undefined) ?? null);
    request.onerror = () => reject(request.error);
  });
};

export const saveProject = async (draft: ProjectDraft) => {
  const database = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(draft);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getAllProjects = async () => {
  const database = await openDatabase();
  return new Promise<ProjectSummary[]>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () =>
      resolve(
        (request.result as ProjectDraft[]).map((project) => ({
          id: project.id,
          title: project.title,
          lastModified: project.lastModified,
        }))
      );
    request.onerror = () => reject(request.error);
  });
};

export const deleteProject = async (id: string) => {
  const database = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};
