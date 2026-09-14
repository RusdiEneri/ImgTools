"use client";

import React, { useState, useEffect } from "react";
import ToolShell from "@/components/ToolShell";
import { download, formatBytes } from "@/lib/image";

// Preset Resolusi Populer
const SIZE_PRESETS = [
  { label: "1200 × 630", width: 1200, height: 630, desc: "Open Graph (Facebook / Twitter)" },
  { label: "1080 × 1080", width: 1080, height: 1080, desc: "Persegi (Instagram Post)" },
  { label: "1920 × 1080", width: 1920, height: 1080, desc: "Full HD Landscape" },
];

const DEFAULT_HTML_SAMPLE = `<div style="display: flex; flex-direction: column; width: 100%; height: 100%; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #db2777 100%); padding: 60px; justify-content: space-between; font-family: sans-serif; color: white;">
  <div style="display: flex; align-items: center; justify-content: space-between;">
    <div style="display: flex; align-items: center; gap: 12px; background: rgba(255, 255, 255, 0.15); padding: 8px 20px; border-radius: 9999px;">
      <span style="font-size: 16px; font-weight: bold; color: #a5f3fc;">⚡ Satori Renderer</span>
    </div>
    <span style="font-size: 16px; opacity: 0.8;">ImgTools Pro</span>
  </div>

  <div style="display: flex; flex-direction: column; gap: 16px;">
    <h1 style="font-size: 52px; font-weight: 800; line-height: 1.15; margin: 0;">
      Konversi HTML ke Gambar Cepat & Tajam
    </h1>
    <p style="font-size: 24px; opacity: 0.9; margin: 0; max-width: 800px; line-height: 1.5;">
      Ubah potongan kode HTML/CSS inline atau tautan website menjadi gambar beresolusi tinggi tanpa Puppeteer.
    </p>
  </div>

  <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255, 255, 255, 0.2); padding-top: 24px;">
    <span style="font-size: 18px; font-weight: 600;">Dibuat dengan GambarKu</span>
    <span style="font-size: 16px; opacity: 0.7;">100% Bebas Chromium</span>
  </div>
</div>`;

export default function HtmlKeGambarPage() {
  const [activeTab, setActiveTab] = useState<"url" | "html">("url");

  // State Input
  const [urlInput, setUrlInput] = useState<string>("https://example.com");
  const [htmlInput, setHtmlInput] = useState<string>(DEFAULT_HTML_SAMPLE);

  // State Pengaturan
  const [selectedSize, setSelectedSize] = useState(SIZE_PRESETS[0]);
  const [format, setFormat] = useState<"png" | "svg">("png");

  // State Hasil
  const [isRendering, setIsRendering] = useState(false);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    return () => {
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, [resultUrl]);

  const handleRender = async () => {
    setIsRendering(true);
    setErrorMsg("");

    try {
      const payload = {
        width: selectedSize.width,
        height: selectedSize.height,
        format,
        ...(activeTab === "url" ? { url: urlInput } : { html: htmlInput }),
      };

      const res = await fetch("/api/html-to-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let errDetails = "Gagal memproses gambar";
        try {
          const errData = await res.json();
          errDetails = errData.error || errDetails;
        } catch {
          // Fallback ke status teks
          errDetails = res.statusText || errDetails;
        }
        throw new Error(errDetails);
      }

      const blob = await res.blob();
      setResultBlob(blob);

      if (resultUrl) URL.revokeObjectURL(resultUrl);
      setResultUrl(URL.createObjectURL(blob));
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan saat merender gambar.");
    } finally {
      setIsRendering(false);
    }
  };

  const handleDownload = () => {
    if (!resultBlob) return;
    const ext = format === "svg" ? ".svg" : ".png";
    const prefix = activeTab === "url" ? "web-snapshot" : "html-render";
    download(resultBlob, `${prefix}-${Date.now()}${ext}`);
  };

  return (
    <ToolShell
      title="HTML ke Gambar"
      description="Konversi cuplikan kode HTML/CSS atau tautan halaman web menjadi gambar PNG atau SVG beresolusi tinggi tanpa Puppeteer."
      badge="Di browser"
    >
      <div className="space-y-6">
        {/* Catatan Keterbatasan Satori */}
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 flex items-start gap-3.5 shadow-sm">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-sm">
            💡
          </div>
          <div className="text-xs text-indigo-950 space-y-1">
            <p className="font-semibold text-indigo-900">
              Catatan Keterbatasan Renderer Satori
            </p>
            <p className="text-slate-600">
              Mesin render mendukung penuh tata letak <strong>CSS Flexbox (`display: flex`)</strong>, warna gradien, border, dan CSS inline. Fitur seperti CSS Grid, Float, external web scripts, dan animasi tidak didukung.
            </p>
          </div>
        </div>

        {/* Tab Selector: URL vs HTML */}
        <div className="flex rounded-xl bg-slate-100 p-1 max-w-sm">
          <button
            type="button"
            onClick={() => setActiveTab("url")}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${
              activeTab === "url"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            🌐 Tautan Website (URL)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("html")}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${
              activeTab === "html"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            💻 Kode HTML / CSS
          </button>
        </div>

        {/* Form Input & Pengaturan */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
          {activeTab === "url" ? (
            /* Mode URL */
            <div className="space-y-2">
              <label htmlFor="url-input" className="text-xs font-semibold text-slate-700">
                Alamat URL Website
              </label>
              <div className="relative rounded-xl shadow-sm">
                <input
                  id="url-input"
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com"
                  className="block w-full rounded-xl border border-slate-300 py-2.5 pl-4 pr-12 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Konten halaman akan dibaca secara cerdas via engine pembaca Jina AI.
              </p>
            </div>
          ) : (
            /* Mode HTML */
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="html-editor" className="text-xs font-semibold text-slate-700">
                  Kode HTML / JSX (Gunakan CSS Inline)
                </label>
                <button
                  type="button"
                  onClick={() => setHtmlInput(DEFAULT_HTML_SAMPLE)}
                  className="text-[11px] font-medium text-indigo-600 hover:underline"
                >
                  Muat Contoh Template
                </button>
              </div>
              <textarea
                id="html-editor"
                rows={9}
                value={htmlInput}
                onChange={(e) => setHtmlInput(e.target.value)}
                className="block w-full rounded-xl border border-slate-300 p-3 font-mono text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50/50"
              />
            </div>
          )}

          {/* Pengaturan Resolusi & Format */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
            {/* Pilihan Resolusi */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Ukuran Resolusi Gambar
              </label>
              <div className="grid grid-cols-1 gap-2">
                {SIZE_PRESETS.map((sz) => (
                  <button
                    key={sz.label}
                    type="button"
                    onClick={() => setSelectedSize(sz)}
                    className={`flex items-center justify-between rounded-xl border p-2.5 text-xs text-left transition ${
                      selectedSize.label === sz.label
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700 font-bold"
                        : "border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div>
                      <p className="font-semibold">{sz.label}</p>
                      <p className="text-[10px] text-slate-400 font-normal">{sz.desc}</p>
                    </div>
                    {selectedSize.label === sz.label && (
                      <span className="text-indigo-600 font-bold">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Pilihan Format Output */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Format Berkas Output
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormat("png")}
                  className={`flex flex-col items-center justify-center rounded-xl border p-4 text-center transition ${
                    format === "png"
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700 font-bold ring-1 ring-indigo-300"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="text-lg">🖼️</span>
                  <span className="text-xs font-bold mt-1">PNG Image</span>
                  <span className="text-[10px] text-slate-400">Kompatibel universal</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormat("svg")}
                  className={`flex flex-col items-center justify-center rounded-xl border p-4 text-center transition ${
                    format === "svg"
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700 font-bold ring-1 ring-indigo-300"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="text-lg">📐</span>
                  <span className="text-xs font-bold mt-1">SVG Vector</span>
                  <span className="text-[10px] text-slate-400">Vektor dapat diskalakan</span>
                </button>
              </div>
            </div>
          </div>

          {/* Tombol Aksi Render */}
          <div className="pt-2">
            <button
              type="button"
              disabled={isRendering || (activeTab === "url" && !urlInput.trim()) || (activeTab === "html" && !htmlInput.trim())}
              onClick={handleRender}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {isRendering ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>{activeTab === "url" ? "Membaca & Merender Halaman..." : "Merender HTML..."}</span>
                </>
              ) : (
                <>
                  <span>Render {activeTab === "url" ? "dari URL" : "dari Kode HTML"}</span>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </>
              )}
            </button>
          </div>

          {errorMsg && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700">
              {errorMsg}
            </div>
          )}
        </div>

        {/* Hasil Render Gambar */}
        {resultBlob && resultUrl && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-100 pb-3">
              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                  ✓ Gambar Berhasil Dirender
                </span>
                <h4 className="mt-1 text-sm font-bold text-slate-900">
                  Pratinjau Hasil ({selectedSize.label} • {format.toUpperCase()})
                </h4>
                <p className="text-xs text-slate-500">
                  Ukuran Berkas: {formatBytes(resultBlob.size)}
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Unduh {format.toUpperCase()}
              </button>
            </div>

            <div className="flex justify-center rounded-xl bg-slate-900/10 p-3 border border-slate-200 overflow-auto max-h-[500px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resultUrl}
                alt="Hasil Render HTML"
                className="max-h-[460px] max-w-full object-contain rounded-lg shadow-md bg-white"
              />
            </div>
          </div>
        )}
      </div>
    </ToolShell>
  );
}
