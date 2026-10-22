import type { Picture } from "../pictures/types.ts";

const DB_NAME = "linen.photos.v1";
const STORE = "photos";

export type PhotoRecord = {
  id: string;
  created: number;
  picture: Picture;
};

const memory = new Map<string, PhotoRecord>();
let loading: Promise<void> | null = null;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open photo storage"));
  });
}

export function loadPhotoCache(): Promise<void> {
  if (!loading) {
    loading = readAll().catch((error: unknown) => {
      loading = null;
      throw error;
    });
  }
  return loading;
}

async function readAll(): Promise<void> {
  const db = await openDb();
  const records = await new Promise<PhotoRecord[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).getAll();
    request.onsuccess = () => resolve((request.result as PhotoRecord[]) ?? []);
    request.onerror = () => reject(request.error ?? new Error("Could not read photos"));
  });
  db.close();
  for (const record of records) {
    if (record?.picture?.id && !memory.has(record.picture.id)) memory.set(record.picture.id, record);
  }
}

export function photoRecords(): PhotoRecord[] {
  return [...memory.values()].sort((a, b) => b.created - a.created);
}

export function photoById(id: string): Picture | undefined {
  return memory.get(id)?.picture;
}

export async function savePhoto(picture: Picture): Promise<void> {
  await loadPhotoCache();
  const record: PhotoRecord = { id: picture.id, created: Date.now(), picture };
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Could not save the photo"));
  });
  db.close();
  memory.set(picture.id, record);
}

export async function deletePhoto(id: string): Promise<void> {
  await loadPhotoCache();
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Could not delete the photo"));
  });
  db.close();
  memory.delete(id);
}
