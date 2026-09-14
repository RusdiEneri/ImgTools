import React from "react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200/80 bg-white text-slate-600">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Banner Jaminan Privasi */}
        <div className="mb-10 rounded-2xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50/90 via-teal-50/50 to-indigo-50/60 p-4 sm:p-4.5 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 text-center sm:text-left">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-slate-900">Jaminan Privasi & Keamanan Data 100%</p>
              <p className="text-xs text-slate-600 leading-relaxed">
                File diproses di browser Anda; hanya fitur AI (hapus background, tingkatkan, buramkan wajah) yang dikirim ke server — dan langsung dihapus setelah diproses.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Info Brand */}
          <div className="space-y-4 md:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-600 to-emerald-500 text-white shadow-sm">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-lg font-bold tracking-tight text-slate-900">
                Img<span className="text-indigo-600">Tools</span>
              </span>
            </Link>
            <p className="max-w-md text-sm leading-relaxed text-slate-500">
              Platform utilitas pemrosesan gambar profesional berbasis peramban. Seluruh proses pengeditan client-side berjalan cepat tanpa menyimpan data pribadi Anda.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              100% Aman & Menjaga Privasi Berkas
            </div>
          </div>

          {/* Kolom Alat Populer */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
              Alat Populer
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link href="/tools/kompres" className="transition hover:text-indigo-600">
                  Kompres Gambar
                </Link>
              </li>
              <li>
                <Link href="/tools/ubah-ukuran" className="transition hover:text-indigo-600">
                  Ubah Ukuran
                </Link>
              </li>
              <li>
                <Link href="/tools/potong" className="transition hover:text-indigo-600">
                  Potong Foto
                </Link>
              </li>
              <li>
                <Link href="/tools/konversi-ke-jpg" className="transition hover:text-indigo-600">
                  Konversi ke JPG
                </Link>
              </li>
              <li>
                <Link href="/tools/tanda-air" className="transition hover:text-indigo-600">
                  Tanda Air
                </Link>
              </li>
            </ul>
          </div>

          {/* Kolom Alat AI & Baru */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
              Kecerdasan Buatan (AI)
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link href="/tools/tingkatkan-gambar" className="inline-flex items-center gap-1.5 transition hover:text-indigo-600">
                  <span>Tingkatkan Gambar</span>
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">Baru!</span>
                </Link>
              </li>
              <li>
                <Link href="/tools/hapus-latar-belakang" className="inline-flex items-center gap-1.5 transition hover:text-indigo-600">
                  <span>Hapus Latar Belakang</span>
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">Baru!</span>
                </Link>
              </li>
              <li>
                <Link href="/tools/buramkan-wajah" className="inline-flex items-center gap-1.5 transition hover:text-indigo-600">
                  <span>Buramkan Wajah</span>
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">Baru!</span>
                </Link>
              </li>
              <li>
                <Link href="/tools/editor-foto" className="transition hover:text-indigo-600">
                  Editor Foto Lengkap
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-slate-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} ImgTools. Hak Cipta Dilindungi.</p>
          <div className="flex items-center gap-6">
            <span>Privasi & Keamanan</span>
            <span>Syarat Penggunaan</span>
            <span>Kontak Dukungan</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
