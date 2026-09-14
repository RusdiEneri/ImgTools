"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import ToolShell from "@/components/ToolShell";
import Dropzone from "@/components/Dropzone";
import { fileToBitmap, toCanvas, canvasToBlob, download, formatBytes } from "@/lib/image";

type GridPosition = "tl" | "tc" | "tr" | "ml" | "mc" | "mr" | "bl" | "bc" | "br";

export default function TandaAirPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [activeFileIndex, setActiveFileIndex] = useState<number>(0);
  const [baseBitmap, setBaseBitmap] = useState<ImageBitmap | null>(null);

  // Mode: "text" atau "logo"
  const [mode, setMode] = useState<"text" | "logo">("text");

  // State Teks
  const [text, setText] = useState<string>("© GambarKu");
  const [fontFamily, setFontFamily] = useState<string>("sans-serif");
  const [fontSize, setFontSize] = useState<number>(42);
  const [textColor, setTextColor] = useState<string>("#ffffff");
  const [rotation, setRotation] = useState<number>(0);

  // State Logo
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoBitmap, setLogoBitmap] = useState<ImageBitmap | null>(null);
  const [logoScale, setLogoScale] = useState<number>(30); // 30% dari lebar gambar

  // Common State
  const [opacity, setOpacity] = useState<number>(75);
  const [position, setPosition] = useState<GridPosition>("br"); // default kanan bawah

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const currentFile = files[activeFileIndex] || null;

  // Muat base bitmap saat berkas aktif berubah
  useEffect(() => {
    if (!currentFile) {
      setBaseBitmap(null);
      return;
    }

    let isMounted = true;
    fileToBitmap(currentFile)
      .then((bmp) => {
        if (isMounted) {
          setBaseBitmap(bmp);
        } else {
          bmp.close();
        }
      })
      .catch((err: unknown) => {
        setErrorMsg(err instanceof Error ? err.message : "Gagal membaca berkas gambar.");
      });

    return () => {
      isMounted = false;
    };
  }, [currentFile]);

  // Muat logo bitmap saat logoFile berubah
  useEffect(() => {
    if (!logoFile) {
      setLogoBitmap(null);
      return;
    }

    let isMounted = true;
    fileToBitmap(logoFile)
      .then((bmp) => {
        if (isMounted) {
          setLogoBitmap(bmp);
        } else {
          bmp.close();
        }
      })
      .catch(() => {
        setErrorMsg("Gagal memuat logo gambar. Pastikan format file PNG atau gambar valid.");
      });

    return () => {
      isMounted = false;
    };
  }, [logoFile]);

  // Render watermark pada kanvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !baseBitmap) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Atur dimensi kanvas sesuai resolusi asli gambar
    canvas.width = baseBitmap.width;
    canvas.height = baseBitmap.height;

    // Gambar background dasar
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(baseBitmap, 0, 0);

    const W = canvas.width;
    const H = canvas.height;
    const padding = Math.max(16, Math.round(Math.min(W, H) * 0.04));

    ctx.save();
    ctx.globalAlpha = Math.max(0.05, Math.min(1, opacity / 100));

    if (mode === "text") {
      if (!text.trim()) {
        ctx.restore();
        return;
      }

      // Hitung ukuran font proporsional (menggunakan fontSize relatif terhadap lebar gambar jika perlu)
      const scaledFontSize = Math.max(12, Math.round(fontSize * (Math.min(W, H) / 800)));
      ctx.font = `bold ${scaledFontSize}px ${fontFamily}`;

      const metrics = ctx.measureText(text);
      const textW = metrics.width;
      const textH = scaledFontSize;

      // Koordinat jangkar tengah untuk rotasi
      let anchorX = W / 2;
      let anchorY = H / 2;

      switch (position) {
        case "tl": anchorX = padding + textW / 2; anchorY = padding + textH / 2; break;
        case "tc": anchorX = W / 2; anchorY = padding + textH / 2; break;
        case "tr": anchorX = W - padding - textW / 2; anchorY = padding + textH / 2; break;
        case "ml": anchorX = padding + textW / 2; anchorY = H / 2; break;
        case "mc": anchorX = W / 2; anchorY = H / 2; break;
        case "mr": anchorX = W - padding - textW / 2; anchorY = H / 2; break;
        case "bl": anchorX = padding + textW / 2; anchorY = H - padding - textH / 2; break;
        case "bc": anchorX = W / 2; anchorY = H - padding - textH / 2; break;
        case "br": anchorX = W - padding - textW / 2; anchorY = H - padding - textH / 2; break;
      }

      ctx.translate(anchorX, anchorY);
      ctx.rotate((rotation * Math.PI) / 180);

      // Bayangan teks agar terbaca jelas di berbagai kontras latar
      ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      ctx.fillStyle = textColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, 0, 0);

    } else if (mode === "logo" && logoBitmap) {
      // Hitung dimensi logo berdasarkan skala %
      const targetLogoW = Math.max(20, Math.round(W * (logoScale / 100)));
      const logoRatio = logoBitmap.height / logoBitmap.width;
      const targetLogoH = Math.round(targetLogoW * logoRatio);

      let anchorX = W / 2;
      let anchorY = H / 2;

      switch (position) {
        case "tl": anchorX = padding + targetLogoW / 2; anchorY = padding + targetLogoH / 2; break;
        case "tc": anchorX = W / 2; anchorY = padding + targetLogoH / 2; break;
        case "tr": anchorX = W - padding - targetLogoW / 2; anchorY = padding + targetLogoH / 2; break;
        case "ml": anchorX = padding + targetLogoW / 2; anchorY = H / 2; break;
        case "mc": anchorX = W / 2; anchorY = H / 2; break;
        case "mr": anchorX = W - padding - targetLogoW / 2; anchorY = H / 2; break;
        case "bl": anchorX = padding + targetLogoW / 2; anchorY = H - padding - targetLogoH / 2; break;
        case "bc": anchorX = W / 2; anchorY = H - padding - targetLogoH / 2; break;
        case "br": anchorX = W - padding - targetLogoW / 2; anchorY = H - padding - targetLogoH / 2; break;
      }

      ctx.translate(anchorX, anchorY);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.drawImage(logoBitmap, -targetLogoW / 2, -targetLogoH / 2, targetLogoW, targetLogoH);
    }

    ctx.restore();
  }, [baseBitmap, mode, text, fontFamily, fontSize, textColor, rotation, logoBitmap, logoScale, opacity, position]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Fungsi utilitas untuk memproses satu gambar
  const processImageBlob = async (targetFile: File): Promise<Blob> => {
    const bmp = await fileToBitmap(targetFile);
    const canvas = toCanvas(bmp.width, bmp.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Gagal menginisialisasi konteks 2D kanvas");

    ctx.drawImage(bmp, 0, 0);

    const W = canvas.width;
    const H = canvas.height;
    const padding = Math.max(16, Math.round(Math.min(W, H) * 0.04));

    ctx.save();
    ctx.globalAlpha = Math.max(0.05, Math.min(1, opacity / 100));

    if (mode === "text") {
      const scaledFontSize = Math.max(12, Math.round(fontSize * (Math.min(W, H) / 800)));
      ctx.font = `bold ${scaledFontSize}px ${fontFamily}`;
      const metrics = ctx.measureText(text);
      const textW = metrics.width;
      const textH = scaledFontSize;

      let anchorX = W / 2;
      let anchorY = H / 2;

      switch (position) {
        case "tl": anchorX = padding + textW / 2; anchorY = padding + textH / 2; break;
        case "tc": anchorX = W / 2; anchorY = padding + textH / 2; break;
        case "tr": anchorX = W - padding - textW / 2; anchorY = padding + textH / 2; break;
        case "ml": anchorX = padding + textW / 2; anchorY = H / 2; break;
        case "mc": anchorX = W / 2; anchorY = H / 2; break;
        case "mr": anchorX = W - padding - textW / 2; anchorY = H / 2; break;
        case "bl": anchorX = padding + textW / 2; anchorY = H - padding - textH / 2; break;
        case "bc": anchorX = W / 2; anchorY = H - padding - textH / 2; break;
        case "br": anchorX = W - padding - textW / 2; anchorY = H - padding - textH / 2; break;
      }

      ctx.translate(anchorX, anchorY);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      ctx.fillStyle = textColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, 0, 0);

    } else if (mode === "logo" && logoBitmap) {
      const targetLogoW = Math.max(20, Math.round(W * (logoScale / 100)));
      const logoRatio = logoBitmap.height / logoBitmap.width;
      const targetLogoH = Math.round(targetLogoW * logoRatio);

      let anchorX = W / 2;
      let anchorY = H / 2;

      switch (position) {
        case "tl": anchorX = padding + targetLogoW / 2; anchorY = padding + targetLogoH / 2; break;
        case "tc": anchorX = W / 2; anchorY = padding + targetLogoH / 2; break;
        case "tr": anchorX = W - padding - targetLogoW / 2; anchorY = padding + targetLogoH / 2; break;
        case "ml": anchorX = padding + targetLogoW / 2; anchorY = H / 2; break;
        case "mc": anchorX = W / 2; anchorY = H / 2; break;
        case "mr": anchorX = W - padding - targetLogoW / 2; anchorY = H / 2; break;
        case "bl": anchorX = padding + targetLogoW / 2; anchorY = H - padding - targetLogoH / 2; break;
        case "bc": anchorX = W / 2; anchorY = H - padding - targetLogoH / 2; break;
        case "br": anchorX = W - padding - targetLogoW / 2; anchorY = H - padding - targetLogoH / 2; break;
      }

      ctx.translate(anchorX, anchorY);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.drawImage(logoBitmap, -targetLogoW / 2, -targetLogoH / 2, targetLogoW, targetLogoH);
    }

    ctx.restore();
    bmp.close();

    const outputType = targetFile.type || "image/jpeg";
    return canvasToBlob(canvas, outputType, 0.95);
  };

  // Unduh gambar aktif saat ini
  const handleDownloadSingle = async () => {
    if (!currentFile) return;
    setIsProcessing(true);
    setErrorMsg("");

    try {
      const blob = await processImageBlob(currentFile);
      const dotIndex = currentFile.name.lastIndexOf(".");
      const baseName = dotIndex !== -1 ? currentFile.name.substring(0, dotIndex) : currentFile.name;
      const ext = dotIndex !== -1 ? currentFile.name.substring(dotIndex) : ".jpg";
      download(blob, `${baseName}-watermark${ext}`);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal mengunduh gambar.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Unduh seluruh gambar jika multi-file
  const handleDownloadAll = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setErrorMsg("");

    try {
      for (let i = 0; i < files.length; i++) {
        const fileItem = files[i];
        const blob = await processImageBlob(fileItem);
        const dotIndex = fileItem.name.lastIndexOf(".");
        const baseName = dotIndex !== -1 ? fileItem.name.substring(0, dotIndex) : fileItem.name;
        const ext = dotIndex !== -1 ? fileItem.name.substring(dotIndex) : ".jpg";
        download(blob, `${baseName}-watermark${ext}`);
        // Jeda kecil untuk kelancaran download batch browser
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal memproses batch tanda air.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ToolShell
      title="Tanda Air Gambar (Watermark)"
      description="Tambahkan teks kustom atau logo cap hak cipta pada gambar Anda dengan presisi posisi 9 titik grid."
      badge="Di browser"
    >
      <div className="space-y-8">
        {files.length === 0 ? (
          <Dropzone
            multiple={true}
            accept="image/*"
            onFiles={(incomingFiles) => {
              setFiles(incomingFiles);
              setActiveFileIndex(0);
            }}
            title="Tarik & letakkan foto dasar untuk diberi tanda air"
            subtitle="Mendukung satu atau banyak foto sekaligus (multi-file)"
          />
        ) : (
          <div className="space-y-6">
            {/* Header berkas terpilih & batch selector */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 truncate max-w-xs sm:max-w-md">
                    {currentFile?.name}
                  </h4>
                  <p className="text-xs text-slate-500">
                    Total Berkas: <span className="font-semibold text-indigo-600">{files.length}</span> • Ukuran Aktif: {currentFile ? formatBytes(currentFile.size) : "-"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setFiles([]);
                  setBaseBitmap(null);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-rose-600"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Ganti Gambar
              </button>
            </div>

            {/* Thumbnail selector jika multi-file */}
            {files.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                <span className="text-xs font-semibold text-slate-500 shrink-0">Pratinjau Berkas:</span>
                {files.map((f, idx) => (
                  <button
                    key={`${f.name}-${idx}`}
                    type="button"
                    onClick={() => setActiveFileIndex(idx)}
                    className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      activeFileIndex === idx
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    #{idx + 1} {f.name.length > 14 ? f.name.substring(0, 12) + "..." : f.name}
                  </button>
                ))}
              </div>
            )}

            {/* Workspace: Kontrol & Kanvas */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Panel Pengaturan (Kiri) */}
              <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-6">
                {/* Mode Selector */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Tipe Tanda Air
                  </label>
                  <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
                    <button
                      type="button"
                      onClick={() => setMode("text")}
                      className={`rounded-lg py-2 text-xs font-semibold transition ${
                        mode === "text"
                          ? "bg-white text-indigo-700 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Mode Teks
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("logo")}
                      className={`rounded-lg py-2 text-xs font-semibold transition ${
                        mode === "logo"
                          ? "bg-white text-indigo-700 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Mode Logo / Gambar
                    </button>
                  </div>
                </div>

                {/* Pengaturan Mode Teks */}
                {mode === "text" ? (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label htmlFor="watermark-text" className="text-xs font-medium text-slate-700">
                        Teks Tanda Air
                      </label>
                      <input
                        id="watermark-text"
                        type="text"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Contoh: Hak Cipta © 2026"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label htmlFor="font-family" className="text-xs font-medium text-slate-700">
                          Gaya Font
                        </label>
                        <select
                          id="font-family"
                          value={fontFamily}
                          onChange={(e) => setFontFamily(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                        >
                          <option value="sans-serif">Sans-serif (Modern)</option>
                          <option value="serif">Serif (Klasik)</option>
                          <option value="monospace">Monospace (Kode)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="text-color" className="text-xs font-medium text-slate-700">
                          Warna Teks
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            id="text-color"
                            type="color"
                            value={textColor}
                            onChange={(e) => setTextColor(e.target.value)}
                            className="h-8 w-8 cursor-pointer rounded border border-slate-300 p-0.5"
                          />
                          <span className="text-xs font-mono text-slate-600 uppercase">{textColor}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-slate-700 font-medium">
                        <span>Ukuran Teks</span>
                        <span className="text-indigo-600 font-bold">{fontSize} px</span>
                      </div>
                      <input
                        type="range"
                        min="16"
                        max="120"
                        value={fontSize}
                        onChange={(e) => setFontSize(Number(e.target.value))}
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-slate-700 font-medium">
                        <span>Sudut Rotasi</span>
                        <span className="text-indigo-600 font-bold">{rotation}°</span>
                      </div>
                      <input
                        type="range"
                        min="-45"
                        max="45"
                        value={rotation}
                        onChange={(e) => setRotation(Number(e.target.value))}
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>-45°</span>
                        <span>0° (Datar)</span>
                        <span>+45°</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Pengaturan Mode Logo */
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700">
                        Unggah Berkas Logo (PNG Transparan Direkomendasikan)
                      </label>
                      <input
                        type="file"
                        accept="image/png,image/webp,image/jpeg,image/svg+xml"
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            setLogoFile(e.target.files[0]);
                          }
                        }}
                        className="block w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-slate-700 font-medium">
                        <span>Skala Ukuran Logo</span>
                        <span className="text-indigo-600 font-bold">{logoScale}%</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        value={logoScale}
                        onChange={(e) => setLogoScale(Number(e.target.value))}
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-slate-700 font-medium">
                        <span>Sudut Rotasi Logo</span>
                        <span className="text-indigo-600 font-bold">{rotation}°</span>
                      </div>
                      <input
                        type="range"
                        min="-45"
                        max="45"
                        value={rotation}
                        onChange={(e) => setRotation(Number(e.target.value))}
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>
                  </div>
                )}

                {/* Slider Opasitas */}
                <div className="space-y-1.5 border-t border-slate-100 pt-4">
                  <div className="flex justify-between text-xs text-slate-700 font-medium">
                    <span>Tingkat Opasitas (Transparansi)</span>
                    <span className="text-indigo-600 font-bold">{opacity}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={opacity}
                    onChange={(e) => setOpacity(Number(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>

                {/* 9 Titik Grid Posisi */}
                <div className="space-y-2 border-t border-slate-100 pt-4">
                  <label className="text-xs font-semibold text-slate-700">
                    Posisi Penempatan (9 Titik Grid)
                  </label>
                  <div className="grid grid-cols-3 gap-2 w-36 mx-auto">
                    {[
                      { id: "tl", label: "↖" },
                      { id: "tc", label: "↑" },
                      { id: "tr", label: "↗" },
                      { id: "ml", label: "←" },
                      { id: "mc", label: "•" },
                      { id: "mr", label: "→" },
                      { id: "bl", label: "↙" },
                      { id: "bc", label: "↓" },
                      { id: "br", label: "↘" },
                    ].map((btn) => (
                      <button
                        key={btn.id}
                        type="button"
                        onClick={() => setPosition(btn.id as GridPosition)}
                        className={`h-10 w-10 rounded-lg text-sm font-bold flex items-center justify-center transition ${
                          position === btn.id
                            ? "bg-indigo-600 text-white shadow-md ring-2 ring-indigo-300"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                        title={btn.id.toUpperCase()}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tombol Aksi Download */}
                <div className="space-y-2 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleDownloadSingle}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Terapkan & Unduh Gambar Aktif
                  </button>

                  {/* Opsi Batch jika multi-file */}
                  {files.length > 1 && (
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={handleDownloadAll}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Terapkan & Unduh Semua ({files.length} Gambar)
                    </button>
                  )}
                </div>

                {errorMsg && (
                  <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
                    {errorMsg}
                  </div>
                )}
              </div>

              {/* Panel Pratinjau Kanvas Live (Kanan) */}
              <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-slate-900/5 p-4 flex flex-col items-center justify-center min-h-[480px]">
                <div className="mb-2 w-full flex items-center justify-between text-xs text-slate-500 px-1">
                  <span>Pratinjau Kanvas Live</span>
                  {baseBitmap && (
                    <span>{baseBitmap.width} × {baseBitmap.height} px</span>
                  )}
                </div>

                <div className="relative max-h-[540px] max-w-full overflow-auto rounded-xl shadow-sm border border-slate-300/60 bg-white flex items-center justify-center">
                  <canvas
                    ref={canvasRef}
                    className="max-h-[520px] max-w-full h-auto w-auto object-contain block"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ToolShell>
  );
}
