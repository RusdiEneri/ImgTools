import JSZip from "jszip";
import { download } from "./image";

export interface BatchProgress<T = unknown> {
  current: number;
  total: number;
  percent: number; // 0 - 100
  currentItem?: T;
}

export interface ProcessQueueOptions<T> {
  concurrency?: number;
  onProgress?: (progress: BatchProgress<T>) => void;
}

/**
 * Memproses antrean berkas/item secara konkruen dengan batasan tertentu (default concurrency = 2)
 * dan memberikan callback progress global (0-100%).
 */
export async function processQueue<T, R>(
  items: T[],
  handler: (item: T, index: number) => Promise<R>,
  options?: ProcessQueueOptions<T>
): Promise<R[]> {
  const concurrency = Math.max(1, options?.concurrency ?? 2);
  const total = items.length;
  let completed = 0;
  const results: R[] = new Array(total);

  if (total === 0) return [];

  // Panggil onProgress 0% di awal
  options?.onProgress?.({
    current: 0,
    total,
    percent: 0,
  });

  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < total) {
      const idx = nextIndex++;
      const item = items[idx];
      try {
        const res = await handler(item, idx);
        results[idx] = res;
      } finally {
        completed++;
        const percent = Math.round((completed / total) * 100);
        options?.onProgress?.({
          current: completed,
          total,
          percent,
          currentItem: item,
        });
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, total) }, () => worker());
  await Promise.all(workers);

  return results;
}

/**
 * Mengompres kumpulan berkas hasil menjadi satu berkas ZIP dan otomatis memicu unduhan.
 */
export async function downloadZip(
  files: { name: string; blob: Blob }[],
  zipFilename: string = "gambar-imgtools.zip"
): Promise<void> {
  const zip = new JSZip();
  files.forEach((file) => {
    zip.file(file.name, file.blob);
  });
  const content = await zip.generateAsync({ type: "blob" });
  download(content, zipFilename);
}
