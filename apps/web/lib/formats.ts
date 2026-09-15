import UTIF from "utif2";
import { parseGIF, decompressFrames } from "gifuct-js";
import { fileToBitmap } from "./image";

/**
 * Decode file HEIC/HEIF menjadi ImageBitmap menggunakan heic2any.
 * Diimpor secara dinamis untuk kompatibilitas Next.js SSR.
 */
export async function decodeHeic(file: File | Blob): Promise<ImageBitmap> {
  const heic2any = (await import("heic2any")).default;
  const result = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.95,
  });

  const singleBlob = Array.isArray(result) ? result[0] : result;
  return await createImageBitmap(singleBlob);
}

/**
 * Decode file TIFF/TIF menjadi ImageBitmap menggunakan utif2.
 */
export async function decodeTiff(file: File | Blob): Promise<ImageBitmap> {
  const buffer = await file.arrayBuffer();
  const ifds = UTIF.decode(buffer);

  if (!ifds || ifds.length === 0) {
    throw new Error("Berkas TIFF rusak atau tidak mengandung layer gambar.");
  }

  const firstIFD = ifds[0];
  UTIF.decodeImage(buffer, firstIFD);

  const rgba = UTIF.toRGBA8(firstIFD);
  const width = firstIFD.width;
  const height = firstIFD.height;

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Gagal menginisialisasi konteks kanvas untuk TIFF");

  const imgData = ctx.createImageData(width, height);
  imgData.data.set(rgba);
  ctx.putImageData(imgData, 0, 0);

  return await createImageBitmap(canvas);
}

/**
 * Decode frame-frame GIF animasi beserta delay waktu per frame menggunakan gifuct-js.
 */
export async function decodeGifFrames(
  file: File | Blob
): Promise<{ bitmap: ImageBitmap; delayMs: number }[]> {
  const buffer = await file.arrayBuffer();
  const parsedGif = parseGIF(buffer);
  const frames = decompressFrames(parsedGif, true);

  if (!frames || frames.length === 0) {
    throw new Error("Berkas GIF tidak mengandung frame gambar.");
  }

  const gifWidth = parsedGif.lsd.width;
  const gifHeight = parsedGif.lsd.height;

  const compositeCanvas = document.createElement("canvas");
  compositeCanvas.width = Math.max(1, gifWidth);
  compositeCanvas.height = Math.max(1, gifHeight);
  const compositeCtx = compositeCanvas.getContext("2d");
  if (!compositeCtx) throw new Error("Gagal membuat konteks kanvas GIF");

  const result: { bitmap: ImageBitmap; delayMs: number }[] = [];

  for (const f of frames) {
    // Buat kanvas sementara untuk patch frame saat ini
    const patchCanvas = document.createElement("canvas");
    patchCanvas.width = Math.max(1, f.dims.width);
    patchCanvas.height = Math.max(1, f.dims.height);
    const patchCtx = patchCanvas.getContext("2d");
    if (!patchCtx) continue;

    const patchData = patchCtx.createImageData(f.dims.width, f.dims.height);
    patchData.data.set(f.patch);
    patchCtx.putImageData(patchData, 0, 0);

    // Gambar patch ke kanvas komposit
    compositeCtx.drawImage(patchCanvas, f.dims.left, f.dims.top);

    // Buat salinan kanvas untuk frame ini
    const frameCanvas = document.createElement("canvas");
    frameCanvas.width = gifWidth;
    frameCanvas.height = gifHeight;
    const frameCtx = frameCanvas.getContext("2d");
    if (!frameCtx) continue;

    frameCtx.drawImage(compositeCanvas, 0, 0);
    const bmp = await createImageBitmap(frameCanvas);

    result.push({
      bitmap: bmp,
      delayMs: f.delay ? f.delay * 10 : 100, // gifuct-js delay dalam ratusan detik (10ms unit)
    });
  }

  return result;
}

/**
 * Decode file SVG menjadi ImageBitmap via <img> + kanvas dengan sanitasi ketat:
 * Menolak tag <script> dan handler event on* untuk keamanan.
 */
export async function decodeSvg(file: File | Blob): Promise<ImageBitmap> {
  const text = await file.text();

  // Sanitasi ketat: tolak script dan inline event handlers
  if (
    /<\s*script\b[^>]*>/i.test(text) ||
    /\bon[a-zA-Z]+\s*=/i.test(text) ||
    /javascript:/i.test(text)
  ) {
    throw new Error(
      "Berkas SVG ditolak: mengandung kode skrip atau event handler yang berpotensi tidak aman."
    );
  }

  const blob = new Blob([text], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const img = new Image();

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Gagal membaca berkas vektor SVG."));
    img.src = url;
  });

  URL.revokeObjectURL(url);

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, img.naturalWidth || 800);
  canvas.height = Math.max(1, img.naturalHeight || 600);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Gagal menginisialisasi kanvas untuk SVG");

  ctx.drawImage(img, 0, 0);
  return await createImageBitmap(canvas);
}

/**
 * Helper Universal: mendeteksi format berkas dan memanggil decoder yang sesuai.
 */
export async function universalDecode(file: File): Promise<ImageBitmap> {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();

  if (name.endsWith(".heic") || name.endsWith(".heif") || type.includes("heic") || type.includes("heif")) {
    return await decodeHeic(file);
  }

  if (name.endsWith(".tiff") || name.endsWith(".tif") || type.includes("tiff")) {
    return await decodeTiff(file);
  }

  if (name.endsWith(".svg") || type.includes("svg")) {
    return await decodeSvg(file);
  }

  if (name.endsWith(".gif") || type.includes("gif")) {
    const frames = await decodeGifFrames(file);
    return frames[0].bitmap;
  }

  // Format standar JPG, PNG, WEBP, BMP
  return await fileToBitmap(file);
}
