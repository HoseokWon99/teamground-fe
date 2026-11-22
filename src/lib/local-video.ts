// Demo-only storage: files stay in this browser, never uploaded to S3.
const prefix = "local-video:";
export const isLocalVideo = (value: string) => /^local-video:[a-f0-9-]{36}$/.test(value);
async function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("teamground-video-files", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("files");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("브라우저에 영상 파일을 저장하지 못했습니다."));
  });
}
export async function storeLocalVideo(file: File): Promise<string> {
  const key = prefix + crypto.randomUUID();
  // WebKit can reject file-backed Blob/File values during IndexedDB serialization.
  // Read bytes before opening the transaction so it cannot become inactive.
  const stored = { bytes: await file.arrayBuffer(), type: file.type || (/\.mp4$/i.test(file.name) ? "video/mp4" : "video/webm") };
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("files", "readwrite");
      tx.objectStore("files").put(stored, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error("브라우저 저장 공간이 부족하거나 저장할 수 없습니다."));
      tx.onabort = () => reject(new Error("영상 저장이 취소되었습니다."));
    });
    return key;
  } finally { db.close(); }
}
export async function readLocalVideo(key: string): Promise<Blob | undefined> {
  const db = await database();
  try {
    return await new Promise<Blob | undefined>((resolve, reject) => {
      const request = db.transaction("files").objectStore("files").get(key);
      request.onsuccess = () => {
        const stored: unknown = request.result;
        // Keep files created by the previous Blob-based implementation readable.
        if (stored === undefined || stored instanceof Blob) return resolve(stored);
        if (stored && typeof stored === "object" && "bytes" in stored &&
            stored.bytes instanceof ArrayBuffer && "type" in stored &&
            (stored.type === "video/mp4" || stored.type === "video/webm")) {
          return resolve(new Blob([stored.bytes], { type: stored.type }));
        }
        reject(new Error("저장된 영상 파일을 읽을 수 없습니다."));
      };
      request.onerror = () => reject(request.error);
    });
  } finally { db.close(); }
}
export async function deleteLocalVideo(key: string): Promise<void> {
  if (!isLocalVideo(key)) return;
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("files", "readwrite");
      tx.objectStore("files").delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally { db.close(); }
}
