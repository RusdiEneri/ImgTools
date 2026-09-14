import { ImageResponse } from "next/og";
import { html as satoriHtml } from "satori-html";

export const runtime = "edge";

interface RequestPayload {
  html?: string;
  url?: string;
  width?: number;
  height?: number;
  format?: "png" | "svg";
}

export async function POST(req: Request) {
  try {
    const body: RequestPayload = await req.json();

    const width = Number(body.width) || 1200;
    const height = Number(body.height) || 630;
    const format = body.format === "svg" ? "svg" : "png";

    let vnode: React.ReactElement | null = null;

    // 1. Jika URL diberikan, ambil konten halaman via https://r.jina.ai/<url>
    if (body.url && body.url.trim()) {
      let targetUrl = body.url.trim();
      if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
        targetUrl = `https://${targetUrl}`;
      }

      const jinaUrl = `https://r.jina.ai/${encodeURI(targetUrl)}`;
      let pageText = "";

      try {
        const jinaRes = await fetch(jinaUrl, {
          headers: {
            Accept: "text/plain",
          },
        });

        if (!jinaRes.ok) {
          throw new Error(`Status ${jinaRes.status} dari pembaca Jina AI`);
        }

        pageText = await jinaRes.text();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Koneksi ke URL gagal";
        return new Response(
          JSON.stringify({
            error: `Gagal mengambil konten dari URL '${targetUrl}': ${msg}. Pastikan situs publik dan dapat diakses.`,
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Ekstrak Title dan cuplikan dari respon Jina
      let title = targetUrl;
      const titleMatch = pageText.match(/Title:\s*(.+)/i);
      if (titleMatch && titleMatch[1]) {
        title = titleMatch[1].trim();
      }

      // Ambil beberapa paragraf teks bersih
      const lines = pageText
        .split("\n")
        .filter((l) => !l.startsWith("Title:") && !l.startsWith("URL Source:") && !l.startsWith("Markdown") && l.trim().length > 0)
        .slice(0, 6)
        .join(" ");

      const snippet = lines.length > 320 ? lines.substring(0, 317) + "..." : lines || "Halaman berhasil dibaca via reader engine.";

      // Render web snapshot card yang indah dan profesional
      vnode = (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            height: "100%",
            backgroundColor: "#0f172a",
            color: "#f8fafc",
            padding: "48px",
            fontFamily: "sans-serif",
            justifyContent: "space-between",
          }}
        >
          {/* Bar Mockup Browser */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              borderBottom: "1px solid #334155",
              paddingBottom: "24px",
            }}
          >
            <div style={{ display: "flex", gap: "8px" }}>
              <div style={{ width: "16px", height: "16px", borderRadius: "50%", backgroundColor: "#ef4444" }} />
              <div style={{ width: "16px", height: "16px", borderRadius: "50%", backgroundColor: "#f59e0b" }} />
              <div style={{ width: "16px", height: "16px", borderRadius: "50%", backgroundColor: "#10b981" }} />
            </div>
            <div
              style={{
                display: "flex",
                backgroundColor: "#1e293b",
                padding: "8px 18px",
                borderRadius: "10px",
                fontSize: "16px",
                color: "#94a3b8",
                flex: 1,
              }}
            >
              🔒 {targetUrl}
            </div>
          </div>

          {/* Konten Halaman */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "18px",
              marginTop: "24px",
              flex: 1,
            }}
          >
            <div
              style={{
                fontSize: "40px",
                fontWeight: "bold",
                color: "#38bdf8",
                lineHeight: 1.2,
              }}
            >
              {title}
            </div>
            <div
              style={{
                fontSize: "22px",
                color: "#cbd5e1",
                lineHeight: 1.6,
                maxHeight: "320px",
                overflow: "hidden",
              }}
            >
              {snippet}
            </div>
          </div>

          {/* Footer Card */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: "1px solid #334155",
              paddingTop: "20px",
              fontSize: "15px",
              color: "#64748b",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontWeight: "bold", color: "#6366f1" }}>ImgTools</span>
              <span>• Web Snapshot Generator</span>
            </div>
            <span>Didukung r.jina.ai engine</span>
          </div>
        </div>
      );
    } else if (body.html && body.html.trim()) {
      // 2. Jika kode HTML kustom diberikan, parse menggunakan satori-html
      const parsedElement = satoriHtml(body.html.trim());
      vnode = parsedElement as unknown as React.ReactElement;
    } else {
      return new Response(
        JSON.stringify({ error: "Harap berikan parameter 'html' atau 'url'." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Render lewat ImageResponse; jika format "svg" kembalikan header image/svg+xml
    return new ImageResponse(vnode, {
      width,
      height,
      headers: format === "svg" ? { "content-type": "image/svg+xml" } : undefined,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Terjadi kesalahan internal pada server";
    return new Response(
      JSON.stringify({ error: errorMsg }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
