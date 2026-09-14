"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AI_URL } from "@/lib/ai";

interface AiStatusProps {
  compact?: boolean;
}

export default function AiStatus({ compact = false }: AiStatusProps) {
  const [status, setStatus] = useState<"not_configured" | "checking" | "ready" | "waking" | "offline">(
    !AI_URL ? "not_configured" : "checking"
  );
  const [retryCount, setRetryCount] = useState(0);

  const checkHealth = useCallback(async () => {
    if (!AI_URL) {
      setStatus("not_configured");
      return;
    }

    setStatus("checking");
    const baseUrl = AI_URL.replace(/\/+$/, "");

    // Jika lewat 3 detik belum ada respons, kemungkinan besar model sedang cold start
    const wakingTimer = setTimeout(() => {
      setStatus("waking");
    }, 2800);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch(`${baseUrl}/health`, {
        method: "GET",
        signal: controller.signal,
      });

      clearTimeout(wakingTimer);
      clearTimeout(timeoutId);

      if (res.ok) {
        setStatus("ready");
      } else {
        setStatus("offline");
      }
    } catch {
      clearTimeout(wakingTimer);
      clearTimeout(timeoutId);
      setStatus("offline");
    }
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth, retryCount]);

  // Jika URL belum dikonfigurasi
  if (status === "not_configured") {
    if (compact) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          AI Belum Dikonfigurasi
        </span>
      );
    }

    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-amber-900 shadow-sm backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-amber-900">Server AI Belum Dikonfigurasi</h4>
            <p className="text-xs text-amber-800 leading-relaxed">
              Fitur kecerdasan buatan membutuhkan backend Hugging Face Space aktif. Untuk menghubungkannya, buat berkas <code className="rounded bg-amber-200/70 px-1 py-0.5 font-mono text-[11px] text-amber-950">.env.local</code> di <code className="rounded bg-amber-200/70 px-1 py-0.5 font-mono text-[11px] text-amber-950">apps/web/</code> dengan isi:
            </p>
            <div className="mt-2 overflow-x-auto rounded-lg bg-amber-950/90 p-2.5 font-mono text-xs text-amber-100">
              <code>NEXT_PUBLIC_AI_URL=https://USERNAME-imgtools-ai.hf.space</code>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Tampilan status aktif
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1 shadow-sm text-xs backdrop-blur-sm">
      {status === "ready" && (
        <>
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="font-medium text-emerald-700">AI siap</span>
        </>
      )}

      {(status === "checking" || status === "waking") && (
        <>
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
          </span>
          <span className="font-medium text-amber-700">
            {status === "waking" ? "AI sedang bangun (cold start ±30 detik)…" : "Menghubungkan ke AI..."}
          </span>
        </>
      )}

      {status === "offline" && (
        <>
          <span className="h-2 w-2 rounded-full bg-rose-500" />
          <span className="font-medium text-rose-700">AI tidak terjangkau</span>
          <button
            type="button"
            onClick={() => setRetryCount((c) => c + 1)}
            className="ml-1 text-[11px] font-semibold text-indigo-600 underline hover:text-indigo-800"
          >
            Coba Lagi
          </button>
        </>
      )}
    </div>
  );
}
