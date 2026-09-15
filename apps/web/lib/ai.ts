export const AI_URL = process.env.NEXT_PUBLIC_AI_URL ?? "";
export const REMBG_URL = (
  process.env.NEXT_PUBLIC_REMBG_URL || "https://ilhamdev-rembg.hf.space"
).replace(/\/+$/, "");

export type RembgModel =
  | "birefnet-portrait"
  | "birefnet-general"
  | "isnet-general-use"
  | "u2net_human_seg";

export interface RemoveBgOptions {
  model?: RembgModel | string;
  alphaMatting?: boolean;
  onProgress?: (message: string) => void;
  timeoutMs?: number;
}

/**
 * Konversi File atau Blob ke Data URL Base64.
 */
export function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Konversi Data URL Base64 ke objek Blob.
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(",");
  if (parts.length < 2) {
    throw new Error("Data URL tidak valid.");
  }
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "image/png";
  const binary = atob(parts[1]);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return new Blob([array], { type: mime });
}

/**
 * Mengirim berkas dan parameter tambahan ke endpoint backend AI umum.
 * Menggunakan FormData dan AbortController dengan batas waktu tertentu (default 120 detik).
 * Melempar Error dengan atribut "detail" jika server mengembalikan pesan error.
 */
export async function aiPost(
  path: string,
  file: File | Blob,
  extra?: Record<string, string | number | boolean>,
  timeoutMs: number = 120000
): Promise<Blob> {
  const baseUrl = AI_URL.replace(/\/+$/, "");
  if (!baseUrl) {
    const err = new Error(
      "Alamat server AI (NEXT_PUBLIC_AI_URL) belum dikonfigurasi. Silakan periksa berkas .env.local."
    );
    (err as unknown as { detail: string }).detail = err.message;
    throw err;
  }

  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${baseUrl}${cleanPath}`;

  const formData = new FormData();
  if (file instanceof File) {
    formData.append("file", file, file.name);
  } else {
    formData.append("file", file, "image.png");
  }

  if (extra) {
    for (const [key, val] of Object.entries(extra)) {
      if (val !== undefined && val !== null) {
        formData.append(key, String(val));
      }
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    if (!res.ok) {
      let errorDetail = `Server AI mengembalikan kesalahan HTTP ${res.status}`;
      try {
        const errorJson = await res.json();
        if (errorJson && errorJson.detail) {
          errorDetail =
            typeof errorJson.detail === "string"
              ? errorJson.detail
              : JSON.stringify(errorJson.detail);
        }
      } catch {
        const errorText = await res.text();
        if (errorText) errorDetail = errorText;
      }
      const err = new Error(errorDetail);
      (err as unknown as { detail: string }).detail = errorDetail;
      throw err;
    }

    return await res.blob();
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      const abortErr = new Error(
        `Permintaan ke server AI melebihi batas waktu (${timeoutMs / 1000} detik). Server mungkin sedang dalam proses cold start.`
      );
      (abortErr as unknown as { detail: string }).detail = abortErr.message;
      throw abortErr;
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Hapus latar belakang gambar menggunakan Hugging Face Space ilhamdev/rembg (ZeroGPU BiRefNet).
 * Langsung terhubung ke endpoint Gradio Space dengan fallback ke route internal /api/remove-bg.
 */
export async function removeBg(
  file: File | Blob,
  options?: RemoveBgOptions
): Promise<Blob> {
  const modelName = options?.model || "birefnet-portrait";
  const alphaMatting = options?.alphaMatting ?? false;
  const timeoutMs = options?.timeoutMs ?? 120000;
  const onProgress = options?.onProgress;

  try {
    onProgress?.("Menyiapkan berkas gambar...");
    const dataUrl = await fileToDataUrl(file);

    onProgress?.("Menghubungi Hugging Face Space ilhamdev/rembg (ZeroGPU)...");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const hfToken =
        process.env.NEXT_PUBLIC_HF_TOKEN || process.env.HF_TOKEN;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (hfToken) {
        headers["Authorization"] = `Bearer ${hfToken}`;
      }

      // 1. Kirim antrian proses ke endpoint Gradio Space
      const postRes = await fetch(`${REMBG_URL}/gradio_api/call/remove_bg`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          data: [dataUrl, modelName, alphaMatting],
        }),
        signal: controller.signal,
      });

      if (!postRes.ok) {
        const errText = await postRes.text().catch(() => "");
        throw new Error(
          `Gradio Space mengembalikan HTTP ${postRes.status}: ${errText.slice(0, 150)}`
        );
      }

      const { event_id } = await postRes.json();
      if (!event_id) {
        throw new Error("Tidak menerima event_id dari Hugging Face Space.");
      }

      onProgress?.("Sedang memproses pemotongan background di GPU...");

      // 2. Stream respons SSE untuk mengambil hasil akhir
      const streamHeaders: Record<string, string> = {};
      if (hfToken) {
        streamHeaders["Authorization"] = `Bearer ${hfToken}`;
      }

      const streamRes = await fetch(
        `${REMBG_URL}/gradio_api/call/remove_bg/${event_id}`,
        {
          headers: streamHeaders,
          signal: controller.signal,
        }
      );

      if (!streamRes.ok || !streamRes.body) {
        throw new Error("Gagal membaca stream hasil dari Space.");
      }

      const reader = streamRes.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let resultDataUrl = "";
      let isErrorEvent = false;
      let remoteErrorMessage = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.startsWith("event: heartbeat")) {
            onProgress?.("AI sedang bekerja memotong piksel...");
          } else if (line.startsWith("event: error")) {
            isErrorEvent = true;
          } else if (line.startsWith("data:")) {
            const rawData = line.slice(5).trim();
            if (isErrorEvent) {
              try {
                const errObj = JSON.parse(rawData);
                remoteErrorMessage =
                  typeof errObj === "object" && errObj?.error
                    ? errObj.error
                    : rawData;
              } catch {
                remoteErrorMessage = rawData;
              }
              break;
            }
            if (rawData && rawData !== "null") {
              try {
                const parsed = JSON.parse(rawData);
                if (Array.isArray(parsed) && parsed[0]) {
                  resultDataUrl = parsed[0];
                  break;
                }
              } catch {
                // Abaikan jika bukan JSON
              }
            }
          }
        }

        if (isErrorEvent || resultDataUrl) {
          reader.cancel();
          break;
        }
      }

      if (isErrorEvent) {
        throw new Error(
          remoteErrorMessage ||
            "Hugging Face Space melaporkan kesalahan saat pemrosesan."
        );
      }

      if (!resultDataUrl) {
        throw new Error("Tidak ada data gambar transparan yang diterima dari Space.");
      }

      onProgress?.("Selesai! Mengonversi hasil...");
      return dataUrlToBlob(resultDataUrl);
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (directErr: unknown) {
    console.warn(
      "Koneksi langsung ke Space ilhamdev/rembg mengalami kendala, mencoba via route fallback internal...",
      directErr
    );

    // Fallback: Panggil route Next.js /api/remove-bg
    onProgress?.("Mencoba jalur cadangan server internal...");
    const fallbackFormData = new FormData();
    if (file instanceof File) {
      fallbackFormData.append("file", file, file.name);
    } else {
      fallbackFormData.append("file", file, "image.png");
    }
    fallbackFormData.append("model_name", modelName);
    fallbackFormData.append("alpha_matting", String(alphaMatting));

    const fallbackRes = await fetch("/api/remove-bg", {
      method: "POST",
      body: fallbackFormData,
    });

    if (!fallbackRes.ok) {
      let msg = `Gagal memproses gambar (HTTP ${fallbackRes.status})`;
      try {
        const errJson = await fallbackRes.json();
        if (errJson?.error) msg = errJson.error;
      } catch {
        // Abaikan
      }
      const err = new Error(msg);
      (err as unknown as { detail: string }).detail = msg;
      throw err;
    }

    return await fallbackRes.blob();
  }
}

/**
 * Tingkatkan resolusi gambar (Super-Resolution 2x atau 4x).
 */
export async function upscale(
  file: File | Blob,
  scale: number = 2,
  maxSide: number = 2048
): Promise<Blob> {
  return aiPost("/api/upscale", file, { scale, max_side: maxSide });
}

/**
 * Tingkatkan ketajaman dan kejernihan detail gambar.
 */
export async function enhance(
  file: File | Blob,
  strength: number = 1
): Promise<Blob> {
  return aiPost("/api/enhance", file, { strength });
}

/**
 * Deteksi dan buramkan wajah serta area sensor manual.
 */
export async function faceBlur(
  file: File | Blob,
  blur: number = 25,
  mode: "gaussian" | "pixelate" = "gaussian",
  boxes?: number[][]
): Promise<Blob> {
  const extra: Record<string, string | number | boolean> = {
    blur,
    mode,
  };
  if (boxes && boxes.length > 0) {
    extra.boxes = JSON.stringify(boxes);
  }
  return aiPost("/api/face-blur", file, extra);
}

/**
 * Konversi berkas citra kamera RAW ke JPEG kualitas 92.
 */
export async function rawToJpg(file: File | Blob): Promise<Blob> {
  return aiPost("/api/raw-to-jpg", file);
}

/**
 * Bangunkan server AI (cold start ping) dengan batas waktu 5 detik.
 * Mengabaikan error dan mengembalikan status boolean.
 */
export async function wakeUp(): Promise<boolean> {
  const baseUrl = AI_URL.replace(/\/+$/, "");
  if (!baseUrl) return false;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(`${baseUrl}/health`, {
      method: "GET",
      signal: controller.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Ping status Hugging Face Space ilhamdev/rembg dengan batas waktu 6 detik.
 */
export async function wakeUpRembg(): Promise<boolean> {
  if (!REMBG_URL) return false;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(`${REMBG_URL}/gradio_api/info`, {
      method: "GET",
      signal: controller.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}
