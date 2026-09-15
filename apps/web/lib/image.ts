/**
 * Image processing engine implemented entirely on the client-side using
 * HTML5 Canvas and createImageBitmap. Zero network calls.
 */

/**
 * Konversi File atau Blob ke ImageBitmap.
 */
export async function fileToBitmap(file: File | Blob): Promise<ImageBitmap> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      // Fallback ke HTMLImageElement jika createImageBitmap gagal
    }
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      createImageBitmap(img).then(resolve).catch(reject);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Gagal membaca berkas gambar"));
    };
    img.src = url;
  });
}

/**
 * Buat elemen HTMLCanvasElement dengan ukuran lebar dan tinggi yang ditentukan.
 */
export function toCanvas(w: number, h: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w));
  canvas.height = Math.max(1, Math.round(h));
  return canvas;
}

/**
 * Wrapper Promise untuk kanvas toBlob.
 */
export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type = "image/jpeg",
  quality = 0.92
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Gagal mengonversi kanvas ke Blob"));
        }
      },
      type,
      quality
    );
  });
}

/**
 * Ubah ukuran gambar berdasarkan mode piksel atau persen.
 */
export async function resize(
  file: File | Blob,
  options: {
    width?: number;
    height?: number;
    percent?: number;
    keepRatio?: boolean;
  }
): Promise<Blob> {
  const bitmap = await fileToBitmap(file);
  const ow = bitmap.width;
  const oh = bitmap.height;

  let targetW = ow;
  let targetH = oh;

  if (options.percent !== undefined && options.percent > 0) {
    const scale = options.percent / 100;
    targetW = Math.round(ow * scale);
    targetH = Math.round(oh * scale);
  } else {
    const keep = options.keepRatio ?? true;
    if (options.width && options.height) {
      if (keep) {
        const ratio = Math.min(options.width / ow, options.height / oh);
        targetW = Math.round(ow * ratio);
        targetH = Math.round(oh * ratio);
      } else {
        targetW = Math.round(options.width);
        targetH = Math.round(options.height);
      }
    } else if (options.width) {
      targetW = Math.round(options.width);
      targetH = keep ? Math.round((options.width / ow) * oh) : oh;
    } else if (options.height) {
      targetH = Math.round(options.height);
      targetW = keep ? Math.round((options.height / oh) * ow) : ow;
    }
  }

  targetW = Math.max(1, targetW);
  targetH = Math.max(1, targetH);

  const canvas = toCanvas(targetW, targetH);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Gagal mendapatkan konteks 2D kanvas");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, targetW, targetH);

  bitmap.close();

  const type = file.type || "image/jpeg";
  return canvasToBlob(canvas, type, 0.92);
}

/**
 * Terapkan kuantisasi warna (color quantization) pada ImageData kanvas.
 * Mengurangi variasi warna pada kanal RGB/A untuk meningkatkan rasio kompresi DEFLATE pada format PNG.
 */
function quantizeCanvas(canvas: HTMLCanvasElement, quality: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  // Jika kualitas sangat tinggi (>= 0.98), lewati kuantisasi
  if (quality >= 0.98) return;

  const step = Math.max(2, Math.round((1 - quality) * 32));
  const halfStep = Math.floor(step / 2);

  const len = data.length;
  for (let i = 0; i < len; i += 4) {
    data[i] = Math.min(255, Math.floor((data[i] + halfStep) / step) * step);
    data[i + 1] = Math.min(255, Math.floor((data[i + 1] + halfStep) / step) * step);
    data[i + 2] = Math.min(255, Math.floor((data[i + 2] + halfStep) / step) * step);
    if (data[i + 3] > 0 && data[i + 3] < 255) {
      data[i + 3] = Math.min(255, Math.floor((data[i + 3] + halfStep) / step) * step);
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

/**
 * Kompres gambar dengan slider kualitas atau target ukuran KB (binary search).
 * Menjamin hasil kompresi tidak akan pernah lebih besar dari berkas aslinya.
 */
export async function compress(
  file: File | Blob,
  options: {
    quality?: number;
    maxKB?: number;
    format?: string;
  } = {}
): Promise<Blob> {
  const originalSize = file.size;
  const bitmap = await fileToBitmap(file);
  const origW = bitmap.width;
  const origH = bitmap.height;

  const inputMime = file.type || "image/jpeg";
  let targetFormat = options.format || "auto";

  if (targetFormat === "auto" || targetFormat === "original") {
    targetFormat = inputMime;
  }

  const isAuto = options.format === "auto" || !options.format;
  const isPng = targetFormat === "image/png";

  // Helper untuk membuat kanvas dan menggambar bitmap dengan skala tertentu
  const makeCanvas = (scale = 1.0, isJpeg = false): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } => {
    const w = Math.max(1, Math.round(origW * scale));
    const h = Math.max(1, Math.round(origH * scale));
    const canvas = toCanvas(w, h);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Gagal mendapatkan konteks 2D kanvas");

    if (isJpeg) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, w, h);
    return { canvas, ctx };
  };

  // 1. Mode Target Ukuran KB
  if (options.maxKB !== undefined && options.maxKB > 0) {
    const targetBytes = options.maxKB * 1024;
    bitmap.close();

    // Jika target sudah lebih besar dari file asli, pertahankan file asli
    if (originalSize <= targetBytes && !options.format) {
      return file;
    }

    let activeFormat = targetFormat;
    if (isPng && isAuto) {
      activeFormat = "image/webp";
    } else if (isPng && targetFormat === "image/png") {
      for (const scale of [1.0, 0.85, 0.7, 0.5, 0.35]) {
        for (const q of [0.75, 0.5, 0.25, 0.1]) {
          const { canvas } = makeCanvas(scale, false);
          quantizeCanvas(canvas, q);
          const candidate = await canvasToBlob(canvas, "image/png");
          if (candidate.size <= targetBytes) {
            return candidate;
          }
        }
      }
      if (isAuto) activeFormat = "image/webp";
    }

    // Binary search kualitas
    let low = 0.05;
    let high = 0.98;
    let bestBlob: Blob | null = null;

    const isJpeg = activeFormat === "image/jpeg";
    const { canvas } = makeCanvas(1.0, isJpeg);

    for (let i = 0; i < 8; i++) {
      const mid = (low + high) / 2;
      const currentBlob = await canvasToBlob(canvas, activeFormat, mid);
      if (currentBlob.size <= targetBytes) {
        bestBlob = currentBlob;
        low = mid;
      } else {
        high = mid;
      }
    }

    // Jika kualitas 0.05 masih melebihi batas, lakukan downscale bertahap
    if (!bestBlob || bestBlob.size > targetBytes) {
      for (const scale of [0.8, 0.6, 0.45, 0.3]) {
        const { canvas: scaledCanvas } = makeCanvas(scale, isJpeg);
        const candidate = await canvasToBlob(scaledCanvas, activeFormat, 0.6);
        if (candidate.size <= targetBytes) {
          bestBlob = candidate;
          break;
        }
      }
    }

    if (bestBlob && bestBlob.size < originalSize) {
      return bestBlob;
    }

    return originalSize <= (bestBlob?.size ?? Infinity) ? file : (bestBlob ?? file);
  }

  // 2. Mode Slider Kualitas
  let q = 0.85;
  if (options.quality !== undefined) {
    q = options.quality > 1 ? options.quality / 100 : options.quality;
    q = Math.max(0.01, Math.min(1, q));
  }

  let resultBlob: Blob;

  if (targetFormat === "image/jpeg") {
    const { canvas } = makeCanvas(1.0, true);
    resultBlob = await canvasToBlob(canvas, "image/jpeg", q);
    bitmap.close();
  } else if (targetFormat === "image/webp") {
    const { canvas } = makeCanvas(1.0, false);
    resultBlob = await canvasToBlob(canvas, "image/webp", q);
    bitmap.close();
  } else {
    // targetFormat === "image/png"
    const { canvas } = makeCanvas(1.0, false);
    quantizeCanvas(canvas, q);
    resultBlob = await canvasToBlob(canvas, "image/png");

    // Jika hasil PNG malah lebih besar dari file asli:
    if (resultBlob.size >= originalSize) {
      // Coba skala dimensi sedikit jika user meminta kualitas < 0.9
      if (q < 0.9) {
        for (const scale of [0.9, 0.8, 0.7]) {
          const { canvas: sCanvas } = makeCanvas(scale, false);
          quantizeCanvas(sCanvas, q);
          const candidate = await canvasToBlob(sCanvas, "image/png");
          if (candidate.size < originalSize) {
            resultBlob = candidate;
            break;
          }
        }
      }

      // Jika format "auto" dan PNG tetap tidak bisa lebih kecil:
      if (isAuto && resultBlob.size >= originalSize) {
        const { canvas: wCanvas } = makeCanvas(1.0, false);
        const webpCandidate = await canvasToBlob(wCanvas, "image/webp", q);
        if (webpCandidate.size < originalSize) {
          resultBlob = webpCandidate;
        }
      }
    }

    bitmap.close();
  }

  // ATURAN EMAS: Hasil kompresi TIDAK BOLEH lebih besar dari berkas asli!
  if (resultBlob.size >= originalSize) {
    return file;
  }

  return resultBlob;
}

/**
 * Potong kanvas berdasarkan koordinat x, y, lebar w, dan tinggi h.
 */
export async function crop(
  file: File | Blob,
  cropRect: { x: number; y: number; w: number; h: number }
): Promise<Blob> {
  const bitmap = await fileToBitmap(file);
  const cropW = Math.max(1, Math.round(cropRect.w));
  const cropH = Math.max(1, Math.round(cropRect.h));
  const cropX = Math.max(0, Math.round(cropRect.x));
  const cropY = Math.max(0, Math.round(cropRect.y));

  const canvas = toCanvas(cropW, cropH);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Gagal mendapatkan konteks 2D kanvas");

  ctx.drawImage(bitmap, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

  bitmap.close();

  const type = file.type || "image/jpeg";
  return canvasToBlob(canvas, type, 0.95);
}

/**
 * Putar gambar berdasarkan derajat (deg) dan opsi flip horizontal/vertikal.
 */
export async function rotate(
  file: File | Blob,
  deg: number,
  flipH = false,
  flipV = false
): Promise<Blob> {
  const bitmap = await fileToBitmap(file);
  const rad = ((deg % 360) * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));

  const newW = Math.round(bitmap.width * cos + bitmap.height * sin);
  const newH = Math.round(bitmap.width * sin + bitmap.height * cos);

  const canvas = toCanvas(newW, newH);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Gagal mendapatkan konteks 2D kanvas");

  ctx.translate(newW / 2, newH / 2);
  ctx.rotate(rad);
  ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
  ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);

  bitmap.close();

  const type = file.type || "image/jpeg";
  return canvasToBlob(canvas, type, 0.95);
}

/**
 * Konversi gambar ke format target (JPEG, PNG, atau WEBP).
 * Jika mengonversi ke JPEG, latar belakang transparan otomatis diisi warna putih solid.
 */
export async function convert(
  file: File | Blob,
  format: "image/jpeg" | "image/png" | "image/webp",
  quality = 0.92
): Promise<Blob> {
  const bitmap = await fileToBitmap(file);
  const canvas = toCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Gagal mendapatkan konteks 2D kanvas");

  if (format === "image/jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(bitmap, 0, 0);

  bitmap.close();

  const q = quality > 1 ? quality / 100 : quality;
  return canvasToBlob(canvas, format, Math.max(0.01, Math.min(1, q)));
}

/**
 * Unduh Blob sebagai berkas di peramban, lalu batalkan ObjectURL setelah 4 detik.
 */
export function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Batalkan URL objek setelah 4 detik untuk mencegah kebocoran memori
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 4000);
}

/**
 * Format jumlah byte menjadi string ukuran yang mudah dibaca (Bytes, KB, MB, GB).
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}
