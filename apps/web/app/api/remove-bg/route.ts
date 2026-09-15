import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 120; // Mendukung durasi eksekusi Vercel hingga 120s

const REMBG_URL = (
  process.env.NEXT_PUBLIC_REMBG_URL || "https://ilhamdev-rembg.hf.space"
).replace(/\/+$/, "");

export async function POST(req: NextRequest) {
  try {
    let dataUrl = "";
    let modelName = "birefnet-portrait";
    let alphaMatting = false;

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json(
          { error: "Berkas gambar 'file' wajib disertakan." },
          { status: 400 }
        );
      }

      const modelVal = formData.get("model_name");
      if (typeof modelVal === "string" && modelVal) {
        modelName = modelVal;
      }

      const alphaVal = formData.get("alpha_matting");
      if (alphaVal === "true" || alphaVal === "1") {
        alphaMatting = true;
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const mime = file.type || "image/png";
      dataUrl = `data:${mime};base64,${buffer.toString("base64")}`;
    } else if (contentType.includes("application/json")) {
      const body = await req.json();
      if (!body.image) {
        return NextResponse.json(
          { error: "Parameter 'image' (base64) wajib disertakan." },
          { status: 400 }
        );
      }
      dataUrl = body.image.startsWith("data:")
        ? body.image
        : `data:image/png;base64,${body.image}`;
      if (body.model_name) modelName = body.model_name;
      if (body.alpha_matting !== undefined) alphaMatting = Boolean(body.alpha_matting);
    } else {
      return NextResponse.json(
        { error: "Content-Type harus multipart/form-data atau application/json." },
        { status: 415 }
      );
    }

    // Panggil Hugging Face Space ilhamdev/rembg
    const hfToken = process.env.NEXT_PUBLIC_HF_TOKEN || process.env.HF_TOKEN;
    const reqHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (hfToken) {
      reqHeaders["Authorization"] = `Bearer ${hfToken}`;
    }

    const postRes = await fetch(`${REMBG_URL}/gradio_api/call/remove_bg`, {
      method: "POST",
      headers: reqHeaders,
      body: JSON.stringify({
        data: [dataUrl, modelName, alphaMatting],
      }),
    });

    if (!postRes.ok) {
      const errText = await postRes.text().catch(() => "");
      return NextResponse.json(
        { error: `Gradio Space error (HTTP ${postRes.status}): ${errText.slice(0, 200)}` },
        { status: 502 }
      );
    }

    const { event_id } = await postRes.json();
    if (!event_id) {
      return NextResponse.json(
        { error: "Tidak menerima event_id dari Hugging Face Space." },
        { status: 502 }
      );
    }

    // Stream GET SSE response
    const streamHeaders: Record<string, string> = {};
    if (hfToken) {
      streamHeaders["Authorization"] = `Bearer ${hfToken}`;
    }

    const streamRes = await fetch(
      `${REMBG_URL}/gradio_api/call/remove_bg/${event_id}`,
      { headers: streamHeaders }
    );
    if (!streamRes.ok || !streamRes.body) {
      return NextResponse.json(
        { error: "Gagal membaca stream hasil dari Space." },
        { status: 502 }
      );
    }

    const reader = streamRes.body.getReader();
    const decoder = new TextDecoder();
    let bufferStr = "";
    let resultDataUrl = "";
    let isError = false;
    let remoteErr = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      bufferStr += decoder.decode(value, { stream: true });
      const lines = bufferStr.split("\n");
      bufferStr = lines.pop() ?? "";

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith("event: error")) {
          isError = true;
        } else if (line.startsWith("data:")) {
          const rawData = line.slice(5).trim();
          if (isError) {
            try {
              const errObj = JSON.parse(rawData);
              remoteErr =
                typeof errObj === "object" && errObj?.error
                  ? errObj.error
                  : rawData;
            } catch {
              remoteErr = rawData;
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
              // Lanjutkan parsing
            }
          }
        }
      }

      if (isError || resultDataUrl) {
        reader.cancel();
        break;
      }
    }

    if (isError) {
      return NextResponse.json(
        { error: remoteErr || "Hugging Face Space melaporkan kesalahan saat pemrosesan gambar." },
        { status: 429 }
      );
    }

    if (!resultDataUrl) {
      return NextResponse.json(
        { error: "Tidak ada gambar hasil yang diterima dari Space." },
        { status: 500 }
      );
    }

    // Konversi base64 kembali ke binary PNG
    const base64Data = resultDataUrl.includes(",")
      ? resultDataUrl.split(",", 2)[1]
      : resultDataUrl;
    const outputBuffer = Buffer.from(base64Data, "base64");

    return new NextResponse(outputBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Kesalahan pada /api/remove-bg:", err);
    return NextResponse.json(
      { error: err.message || "Terjadi kesalahan internal pada server." },
      { status: 500 }
    );
  }
}
