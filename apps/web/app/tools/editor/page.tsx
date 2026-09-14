"use client";

import React, { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import ToolShell from "@/components/ToolShell";
import Dropzone from "@/components/Dropzone";
import { download, formatBytes } from "@/lib/image";
import type {
  EditorItem,
  FilterState,
  FramePreset,
  EditorCanvasHandle,
} from "@/components/editor/EditorCanvas";

// Dynamic import untuk komponen kanvas Konva dengan SSR dimatikan
const EditorCanvas = dynamic(
  () => import("@/components/editor/EditorCanvas"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-96 w-full items-center justify-center rounded-xl bg-slate-100 text-slate-400">
        <div className="flex flex-col items-center gap-2">
          <svg className="h-8 w-8 animate-spin text-indigo-600" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-xs font-medium">Memuat Kanvas Editor...</span>
        </div>
      </div>
    ),
  }
);

// 24+ Emoji Populer untuk Pustaka Stiker
const STICKER_EMOJIS = [
  "😀", "😂", "😍", "😎", "🥳", "🤩",
  "🚀", "🔥", "⭐", "💯", "❤️", "✨",
  "🎉", "👍", "💡", "🎨", "🐱", "🐶",
  "🍕", "🌈", "🏆", "💥", "⚡", "💎",
  "👑", "🎈", "☕", "📸", "🎯", "🍀",
];

// 6 Preset Bingkai Cantik
const FRAME_PRESETS: FramePreset[] = [
  { id: "none", name: "Tanpa Bingkai", stroke: "transparent", strokeWidth: 0 },
  { id: "black", name: "Klasik Hitam", stroke: "#0f172a", strokeWidth: 14 },
  { id: "gold", name: "Emas Elegan", stroke: "#d97706", strokeWidth: 18 },
  { id: "white", name: "Modern Putih", stroke: "#ffffff", strokeWidth: 22 },
  { id: "indigo", name: "Neon Indigo", stroke: "#4f46e5", strokeWidth: 16 },
  { id: "emerald", name: "Hijau Emerald", stroke: "#059669", strokeWidth: 16 },
  { id: "rose", name: "Aksen Rose", stroke: "#e11d48", strokeWidth: 16 },
];

export default function EditorPage() {
  const [file, setFile] = useState<File | null>(null);
  const [baseImage, setBaseImage] = useState<HTMLImageElement | null>(null);

  // Dimensi Kanvas Stage
  const [stageSize, setStageSize] = useState<{ width: number; height: number }>({
    width: 640,
    height: 480,
  });

  // State Objek Kanvas (Teks & Stiker)
  const [items, setItems] = useState<EditorItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Tab Menu Toolbar Kiri: "text" | "stickers" | "frames" | "filters" | "layers"
  const [activeTab, setActiveTab] = useState<"text" | "stickers" | "frames" | "filters" | "layers">("text");

  // State Filter Gambar Dasar
  const [filters, setFilters] = useState<FilterState>({
    grayscale: false,
    sepia: false,
    blur: 0,
    brightness: 0,
  });

  // State Bingkai Aktif
  const [activeFrame, setActiveFrame] = useState<FramePreset | null>(null);

  const canvasRef = useRef<EditorCanvasHandle | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Muat berkas gambar dasar
  useEffect(() => {
    if (!file) {
      setBaseImage(null);
      setItems([]);
      setSelectedId(null);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      setBaseImage(img);

      // Hitung skala stage proporsional (lebar maksimal ~720px, tinggi ~520px)
      const maxW = 680;
      const maxH = 500;
      const w = img.naturalWidth || 600;
      const h = img.naturalHeight || 400;

      const scale = Math.min(maxW / w, maxH / h, 1);
      const stageW = Math.round(w * scale);
      const stageH = Math.round(h * scale);

      setStageSize({ width: stageW, height: stageH });
    };
    img.src = url;

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  // Tambah Elemen Teks Baru
  const handleAddText = () => {
    const newItem: EditorItem = {
      id: `text-${Date.now()}`,
      type: "text",
      text: "Teks Baru",
      x: stageSize.width / 2 - 60,
      y: stageSize.height / 2 - 20,
      fontSize: 36,
      fontFamily: "sans-serif",
      fontStyle: "bold",
      fill: "#ffffff",
      stroke: "#000000",
      strokeWidth: 2,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
    };

    setItems((prev) => [...prev, newItem]);
    setSelectedId(newItem.id);
    setActiveTab("text");
  };

  // Tambah Stiker Emoji
  const handleAddSticker = (emoji: string) => {
    const newItem: EditorItem = {
      id: `sticker-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      type: "sticker",
      text: emoji,
      x: stageSize.width / 2 - 25,
      y: stageSize.height / 2 - 25,
      fontSize: 56,
      fontFamily: "sans-serif",
      fontStyle: "normal",
      fill: "#000000",
      stroke: "",
      strokeWidth: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
    };

    setItems((prev) => [...prev, newItem]);
    setSelectedId(newItem.id);
  };

  // Update item di state
  const handleUpdateItem = (id: string, updates: Partial<EditorItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  // Hapus item terpilih
  const handleDeleteSelected = () => {
    if (!selectedId) return;
    setItems((prev) => prev.filter((item) => item.id !== selectedId));
    setSelectedId(null);
  };

  // Layer Reordering: Naikkan satu tingkat
  const handleMoveUp = (id: string) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      if (idx === -1 || idx === prev.length - 1) return prev;
      const next = [...prev];
      const temp = next[idx];
      next[idx] = next[idx + 1];
      next[idx + 1] = temp;
      return next;
    });
  };

  // Layer Reordering: Turunkan satu tingkat
  const handleMoveDown = (id: string) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      if (idx <= 0) return prev;
      const next = [...prev];
      const temp = next[idx];
      next[idx] = next[idx - 1];
      next[idx - 1] = temp;
      return next;
    });
  };

  // Ekspor hasil edit ke PNG
  const handleExport = async () => {
    if (!canvasRef.current) return;
    setIsExporting(true);

    try {
      const blob = await canvasRef.current.exportBlob();
      const dotIndex = file ? file.name.lastIndexOf(".") : -1;
      const baseName = file && dotIndex !== -1 ? file.name.substring(0, dotIndex) : "gambar";
      download(blob, `${baseName}-diedit.png`);
    } catch {
      alert("Gagal mengekspor gambar.");
    } finally {
      setIsExporting(false);
    }
  };

  const selectedItem = items.find((i) => i.id === selectedId) || null;

  return (
    <ToolShell
      title="Editor Foto Lengkap"
      description="Edit gambar Anda dengan teks bebas, stiker emoji, bingkai estetik, dan efek filter visual langsung di browser."
      badge="Di browser"
    >
      <div className="space-y-6">
        {!file ? (
          <Dropzone
            multiple={false}
            accept="image/*"
            onFiles={(incomingFiles) => {
              if (incomingFiles.length > 0) {
                setFile(incomingFiles[0]);
              }
            }}
            title="Tarik & letakkan foto yang ingin diedit"
            subtitle="Mendukung JPG, PNG, WEBP, dan format foto lainnya"
          />
        ) : (
          <div className="space-y-4">
            {/* Header Toolbar Aksi Atas */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-sm">
                  🎨
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-800 truncate max-w-xs">
                    {file.name}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Dimensi Kanvas: {stageSize.width} × {stageSize.height} px • {formatBytes(file.size)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-rose-600 transition"
                >
                  Ganti Foto
                </button>

                <button
                  type="button"
                  disabled={isExporting}
                  onClick={handleExport}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  {isExporting ? (
                    <span>Mengekspor...</span>
                  ) : (
                    <>
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      <span>Unduh PNG</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Layout 3-Panel: Toolbar Kiri | Kanvas Tengah | Panel Kanan */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* 1. Toolbar Kiri (Navigasi Kategori) */}
              <div className="lg:col-span-2 flex lg:flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm overflow-x-auto">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("text");
                    if (!selectedItem || selectedItem.type !== "text") {
                      handleAddText();
                    }
                  }}
                  className={`flex flex-1 lg:flex-none items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold transition ${
                    activeTab === "text"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <span className="text-base">✍️</span>
                  <span>Teks</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("stickers")}
                  className={`flex flex-1 lg:flex-none items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold transition ${
                    activeTab === "stickers"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <span className="text-base">⭐</span>
                  <span>Stiker</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("frames")}
                  className={`flex flex-1 lg:flex-none items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold transition ${
                    activeTab === "frames"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <span className="text-base">🖼️</span>
                  <span>Bingkai</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("filters")}
                  className={`flex flex-1 lg:flex-none items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold transition ${
                    activeTab === "filters"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <span className="text-base">🪄</span>
                  <span>Filter</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("layers")}
                  className={`flex flex-1 lg:flex-none items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold transition ${
                    activeTab === "layers"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <span className="text-base">📑</span>
                  <span>Lapisan ({items.length})</span>
                </button>
              </div>

              {/* 2. Kanvas Tengah (Stage Konva) */}
              <div className="lg:col-span-7">
                <EditorCanvas
                  ref={canvasRef}
                  baseImage={baseImage}
                  stageWidth={stageSize.width}
                  stageHeight={stageSize.height}
                  items={items}
                  selectedId={selectedId}
                  onSelectId={setSelectedId}
                  onUpdateItem={handleUpdateItem}
                  filters={filters}
                  activeFrame={activeFrame}
                />
                <p className="mt-2 text-center text-[11px] text-slate-400">
                  Tip: Klik objek di kanvas untuk memunculkan transformer (geser, rotasi, atau ubah ukuran).
                </p>
              </div>

              {/* 3. Panel Properti Kanan */}
              <div className="lg:col-span-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
                {/* Tab Konten: TEKS */}
                {activeTab === "text" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Pengaturan Teks
                      </h4>
                      <button
                        type="button"
                        onClick={handleAddText}
                        className="text-[11px] font-semibold text-indigo-600 hover:underline"
                      >
                        + Teks Baru
                      </button>
                    </div>

                    {selectedItem && selectedItem.type === "text" ? (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-slate-600">
                            Isi Teks
                          </label>
                          <input
                            type="text"
                            value={selectedItem.text}
                            onChange={(e) => handleUpdateItem(selectedItem.id, { text: e.target.value })}
                            className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-slate-600">
                            Font
                          </label>
                          <select
                            value={selectedItem.fontFamily}
                            onChange={(e) => handleUpdateItem(selectedItem.id, { fontFamily: e.target.value })}
                            className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:outline-none"
                          >
                            <option value="sans-serif">Sans-serif</option>
                            <option value="serif">Serif</option>
                            <option value="monospace">Monospace</option>
                            <option value="Impact">Impact</option>
                            <option value="cursive">Cursive</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] text-slate-600 font-medium">
                            <span>Ukuran</span>
                            <span className="text-indigo-600 font-bold">{selectedItem.fontSize} px</span>
                          </div>
                          <input
                            type="range"
                            min="14"
                            max="96"
                            value={selectedItem.fontSize}
                            onChange={(e) => handleUpdateItem(selectedItem.id, { fontSize: Number(e.target.value) })}
                            className="w-full accent-indigo-600 cursor-pointer"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[11px] font-medium text-slate-600">
                              Warna
                            </label>
                            <input
                              type="color"
                              value={selectedItem.fill}
                              onChange={(e) => handleUpdateItem(selectedItem.id, { fill: e.target.value })}
                              className="h-8 w-full cursor-pointer rounded border border-slate-300 p-0.5"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-medium text-slate-600">
                              Outline
                            </label>
                            <input
                              type="color"
                              value={selectedItem.stroke || "#000000"}
                              onChange={(e) => handleUpdateItem(selectedItem.id, { stroke: e.target.value })}
                              className="h-8 w-full cursor-pointer rounded border border-slate-300 p-0.5"
                            />
                          </div>
                        </div>

                        {/* Format Tebal & Miring */}
                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              const isBold = selectedItem.fontStyle.includes("bold");
                              const isItalic = selectedItem.fontStyle.includes("italic");
                              const newStyle = isBold
                                ? isItalic ? "italic" : "normal"
                                : isItalic ? "bold italic" : "bold";
                              handleUpdateItem(selectedItem.id, { fontStyle: newStyle });
                            }}
                            className={`flex-1 rounded-lg border py-1.5 text-xs font-bold transition ${
                              selectedItem.fontStyle.includes("bold")
                                ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                                : "border-slate-200 text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            B (Tebal)
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const isBold = selectedItem.fontStyle.includes("bold");
                              const isItalic = selectedItem.fontStyle.includes("italic");
                              const newStyle = isItalic
                                ? isBold ? "bold" : "normal"
                                : isBold ? "bold italic" : "italic";
                              handleUpdateItem(selectedItem.id, { fontStyle: newStyle });
                            }}
                            className={`flex-1 rounded-lg border py-1.5 text-xs italic transition ${
                              selectedItem.fontStyle.includes("italic")
                                ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                                : "border-slate-200 text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            I (Miring)
                          </button>
                        </div>

                        {/* Hapus Objek */}
                        <button
                          type="button"
                          onClick={handleDeleteSelected}
                          className="w-full mt-2 rounded-lg border border-rose-200 bg-rose-50 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-100 transition"
                        >
                          Hapus Teks Ini
                        </button>
                      </div>
                    ) : (
                      <div className="rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-500 space-y-2">
                        <p>Klik tombol di bawah atau pilih teks di kanvas untuk mengeditnya.</p>
                        <button
                          type="button"
                          onClick={handleAddText}
                          className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
                        >
                          + Tambah Teks Baru
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab Konten: STIKER EMOJI */}
                {activeTab === "stickers" && (
                  <div className="space-y-3">
                    <div className="border-b border-slate-100 pb-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Pustaka Stiker Emoji
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Klik emoji untuk menambahkannya ke kanvas.
                      </p>
                    </div>

                    <div className="grid grid-cols-5 gap-1.5 max-h-56 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-200">
                      {STICKER_EMOJIS.map((emoji, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleAddSticker(emoji)}
                          className="h-10 w-10 flex items-center justify-center rounded-lg text-xl hover:bg-indigo-100 hover:scale-110 transition"
                          title={`Tambah ${emoji}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>

                    {selectedItem && selectedItem.type === "sticker" && (
                      <div className="space-y-3 border-t border-slate-100 pt-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-700">Stiker Terpilih:</span>
                          <span className="text-2xl">{selectedItem.text}</span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] text-slate-600 font-medium">
                            <span>Ukuran Stiker</span>
                            <span className="text-indigo-600 font-bold">{selectedItem.fontSize} px</span>
                          </div>
                          <input
                            type="range"
                            min="24"
                            max="120"
                            value={selectedItem.fontSize}
                            onChange={(e) => handleUpdateItem(selectedItem.id, { fontSize: Number(e.target.value) })}
                            className="w-full accent-indigo-600 cursor-pointer"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleDeleteSelected}
                          className="w-full rounded-lg border border-rose-200 bg-rose-50 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-100 transition"
                        >
                          Hapus Stiker Ini
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab Konten: BINGKAI */}
                {activeTab === "frames" && (
                  <div className="space-y-3">
                    <div className="border-b border-slate-100 pb-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Preset Bingkai Gambar
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Pilih bingkai dekoratif di tepi foto.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      {FRAME_PRESETS.map((frame) => (
                        <button
                          key={frame.id}
                          type="button"
                          onClick={() => setActiveFrame(frame.id === "none" ? null : frame)}
                          className={`flex items-center justify-between rounded-xl border p-2.5 text-xs font-medium transition ${
                            (activeFrame?.id === frame.id) || (!activeFrame && frame.id === "none")
                              ? "border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-400 font-bold"
                              : "border-slate-200 text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <span>{frame.name}</span>
                          {frame.strokeWidth > 0 ? (
                            <div
                              className="h-4 w-6 rounded border"
                              style={{ borderColor: frame.stroke, borderWidth: 3 }}
                            />
                          ) : (
                            <span className="text-[10px] text-slate-400">Kosong</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tab Konten: FILTER */}
                {activeTab === "filters" && (
                  <div className="space-y-4">
                    <div className="border-b border-slate-100 pb-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Filter Efek Visual
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Sesuaikan tampilan foto dasar dengan filter Konva.
                      </p>
                    </div>

                    {/* Grayscale Toggle */}
                    <label className="flex items-center justify-between cursor-pointer rounded-xl border border-slate-200 p-2.5 hover:bg-slate-50 transition">
                      <span className="text-xs font-medium text-slate-700">Hitam & Putih (Grayscale)</span>
                      <input
                        type="checkbox"
                        checked={filters.grayscale}
                        onChange={(e) => setFilters((prev) => ({ ...prev, grayscale: e.target.checked }))}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </label>

                    {/* Sepia Toggle */}
                    <label className="flex items-center justify-between cursor-pointer rounded-xl border border-slate-200 p-2.5 hover:bg-slate-50 transition">
                      <span className="text-xs font-medium text-slate-700">Nuansa Klasik (Sepia)</span>
                      <input
                        type="checkbox"
                        checked={filters.sepia}
                        onChange={(e) => setFilters((prev) => ({ ...prev, sepia: e.target.checked }))}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </label>

                    {/* Blur Slider */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-slate-600 font-medium">
                        <span>Efek Buram (Blur)</span>
                        <span className="text-indigo-600 font-bold">{filters.blur} px</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="30"
                        value={filters.blur}
                        onChange={(e) => setFilters((prev) => ({ ...prev, blur: Number(e.target.value) }))}
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>

                    {/* Brightness Slider */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-slate-600 font-medium">
                        <span>Kecerahan (Brightness)</span>
                        <span className="text-indigo-600 font-bold">{Math.round(filters.brightness * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="-0.5"
                        max="0.5"
                        step="0.05"
                        value={filters.brightness}
                        onChange={(e) => setFilters((prev) => ({ ...prev, brightness: Number(e.target.value) }))}
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>

                    {/* Reset Filter Button */}
                    <button
                      type="button"
                      onClick={() => setFilters({ grayscale: false, sepia: false, blur: 0, brightness: 0 })}
                      className="w-full rounded-lg border border-slate-200 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
                    >
                      Reset Semua Filter
                    </button>
                  </div>
                )}

                {/* Tab Konten: LAPISAN (LAYERS) */}
                {activeTab === "layers" && (
                  <div className="space-y-3">
                    <div className="border-b border-slate-100 pb-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Daftar Lapisan Objek
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Atur urutan tumpukan objek di atas kanvas.
                      </p>
                    </div>

                    {items.length === 0 ? (
                      <p className="py-6 text-center text-xs text-slate-400">
                        Belum ada teks atau stiker di atas kanvas.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {items
                          .slice()
                          .reverse()
                          .map((item, revIdx) => {
                            const actualIdx = items.length - 1 - revIdx;
                            const isSelected = selectedId === item.id;

                            return (
                              <div
                                key={item.id}
                                onClick={() => setSelectedId(item.id)}
                                className={`flex items-center justify-between rounded-xl border p-2 cursor-pointer transition ${
                                  isSelected
                                    ? "border-indigo-600 bg-indigo-50/50 shadow-sm"
                                    : "border-slate-200 hover:bg-slate-50"
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate max-w-[120px]">
                                  <span className="text-sm">
                                    {item.type === "sticker" ? item.text : "✍️"}
                                  </span>
                                  <span className="truncate text-xs font-medium text-slate-700">
                                    {item.type === "text" ? item.text : "Stiker"}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    disabled={actualIdx === items.length - 1}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMoveUp(item.id);
                                    }}
                                    className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-800 disabled:opacity-30"
                                    title="Naikkan Layer"
                                  >
                                    ▲
                                  </button>
                                  <button
                                    type="button"
                                    disabled={actualIdx === 0}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMoveDown(item.id);
                                    }}
                                    className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-800 disabled:opacity-30"
                                    title="Turunkan Layer"
                                  >
                                    ▼
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setItems((prev) => prev.filter((i) => i.id !== item.id));
                                      if (selectedId === item.id) setSelectedId(null);
                                    }}
                                    className="rounded p-1 text-slate-400 hover:bg-rose-100 hover:text-rose-600"
                                    title="Hapus"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </ToolShell>
  );
}
