import React from "react";
import Link from "next/link";
import HowTo from "./HowTo";

interface ToolShellProps {
  title: string;
  description: string;
  badge?: "Baru!" | "Di browser" | string;
  category?: string;
  children: React.ReactNode;
}

export default function ToolShell({
  title,
  description,
  badge,
  children,
}: ToolShellProps) {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50/60 pb-16 pt-6">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb & Tombol Kembali */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-slate-500">
          <Link
            href="/"
            className="inline-flex items-center gap-1 transition hover:text-indigo-600"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
              />
            </svg>
            <span>Kembali ke Beranda</span>
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-slate-400">Alat</span>
          <span className="text-slate-300">/</span>
          <span className="font-medium text-slate-700">{title}</span>
        </nav>

        {/* Header Tool */}
        <div className="mb-8 text-center sm:text-left">
          <div className="flex flex-wrap items-center gap-3 justify-center sm:justify-start">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              {title}
            </h1>
            {badge && (
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  badge === "Baru!"
                    ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-600/20"
                    : "bg-indigo-100 text-indigo-800 ring-1 ring-indigo-600/20"
                }`}
              >
                {badge}
              </span>
            )}
          </div>
          <p className="mt-2 text-base text-slate-600 max-w-2xl">
            {description}
          </p>
        </div>

        {/* Workspace Card Container */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
          {children}
        </div>

        {/* 3 Langkah Cara Menggunakan */}
        <HowTo />
      </div>
    </div>
  );
}
