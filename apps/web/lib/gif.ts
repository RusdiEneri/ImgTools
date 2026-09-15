import { GIFEncoder, quantize, applyPalette } from "gifenc";

export interface GifFrameInput {
  bitmap: ImageBitmap;
  delay: number; // millisecond
}

/**
 * Encode kumpulan frame ImageBitmap menjadi berkas GIF animasi menggunakan gifenc.
 * Menghasilkan Blob dengan tipe "image/gif".
 */
export async function encodeGif(
  frames: GifFrameInput[],
  width: number,
  quality = 10
): Promise<Blob> {
  if (frames.length === 0) {
    throw new Error("Dibutuhkan minimal satu frame untuk membuat GIF.");
  }

  const first = frames[0].bitmap;
  const ratio = first.height / first.width;
  const targetW = Math.max(10, Math.round(width));
  const targetH = Math.max(10, Math.round(targetW * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Gagal menginisialisasi konteks kanvas 2D untuk GIF");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const gif = GIFEncoder();

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];

    ctx.clearRect(0, 0, targetW, targetH);
    ctx.drawImage(frame.bitmap, 0, 0, targetW, targetH);

    const imageData = ctx.getImageData(0, 0, targetW, targetH);
    const rgba = imageData.data;

    const maxColors = Math.min(256, Math.max(32, Math.round(quality * 25.6)));

    // Kuantisasi warna dengan batas palet sesuai kualitas
    const palette = quantize(rgba, maxColors, {
      format: "rgba4444",
      maxColors,
    });

    const index = applyPalette(rgba, palette);

    // Tulis frame ke encoder (repeat: 0 berarti looping tak terbatas)
    gif.writeFrame(index, targetW, targetH, {
      palette,
      delay: Math.max(20, Math.round(frame.delay)),
      repeat: 0,
    });
  }

  gif.finish();
  const bytes = gif.bytes();

  return new Blob([bytes as BlobPart], { type: "image/gif" });
}
