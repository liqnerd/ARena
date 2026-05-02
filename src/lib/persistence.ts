import type { Project } from '@/types/project';

const DB_NAME = 'arena';
const DB_VERSION = 1;
const STORE_PROJECTS = 'projects';
const STORE_ASSETS = 'assets';
const STORE_META = 'meta';
const META_KEY_LAST_PROJECT = 'lastProjectId';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_ASSETS)) {
        db.createObjectStore(STORE_ASSETS);
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx<T>(
  storeNames: string | string[],
  mode: IDBTransactionMode,
  work: (...stores: IDBObjectStore[]) => Promise<T> | T,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(storeNames, mode);
        const stores = (
          Array.isArray(storeNames) ? storeNames : [storeNames]
        ).map((n) => transaction.objectStore(n));
        let result: T;
        Promise.resolve(work(...stores)).then(
          (r) => {
            result = r;
          },
          (err) => reject(err),
        );
        transaction.oncomplete = () => resolve(result);
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      }),
  );
}

const reqAsPromise = <T>(req: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

export async function saveProject(project: Project): Promise<void> {
  await tx([STORE_PROJECTS, STORE_META], 'readwrite', async (projects, meta) => {
    await reqAsPromise(projects.put(project));
    await reqAsPromise(meta.put(project.id, META_KEY_LAST_PROJECT));
  });
}

export async function loadProject(id: string): Promise<Project | null> {
  return tx(STORE_PROJECTS, 'readonly', async (s) => {
    const r = await reqAsPromise<Project | undefined>(s.get(id));
    return r ?? null;
  });
}

export async function loadLastProject(): Promise<Project | null> {
  const id = await tx(STORE_META, 'readonly', async (s) =>
    reqAsPromise<string | undefined>(s.get(META_KEY_LAST_PROJECT)),
  );
  if (!id) return null;
  return loadProject(id);
}

export async function listProjects(): Promise<Project[]> {
  return tx(STORE_PROJECTS, 'readonly', async (s) =>
    reqAsPromise<Project[]>(s.getAll()),
  );
}

export async function deleteProject(id: string): Promise<void> {
  await tx(STORE_PROJECTS, 'readwrite', async (s) => {
    await reqAsPromise(s.delete(id));
  });
}

export async function putAssetBlob(id: string, blob: Blob): Promise<void> {
  await tx(STORE_ASSETS, 'readwrite', async (s) => {
    await reqAsPromise(s.put(blob, id));
  });
}

export async function getAssetBlob(id: string): Promise<Blob | null> {
  return tx(STORE_ASSETS, 'readonly', async (s) => {
    const r = await reqAsPromise<Blob | undefined>(s.get(id));
    return r ?? null;
  });
}

export async function deleteAssetBlob(id: string): Promise<void> {
  await tx(STORE_ASSETS, 'readwrite', async (s) => {
    await reqAsPromise(s.delete(id));
  });
}
