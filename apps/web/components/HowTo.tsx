import React from "react";

export default function HowTo() {
  const steps = [
    {
      number: "1",
      title: "Pilih Gambar",
      description: "Unggah gambar dari perangkat atau seret & lepas berkas ke area dropzone.",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      number: "2",
      title: "Atur Opsi",
      description: "Sesuaikan parameter, kualitas kompresi, dimensi ukuran, atau mode sesuai kebutuhan.",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      ),
    },
    {
      number: "3",
      title: "Unduh Hasil",
      description: "Lihat pratinjau hasil pengolahan dan unduh langsung berkas gambar Anda secara instan.",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      ),
    },
  ];

  return (
    <div className="mt-12 border-t border-slate-200/80 pt-10">
      <div className="text-center mb-8">
        <h3 className="text-lg font-bold text-slate-900 sm:text-xl">
          Cara Menggunakan Alat Ini
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Tiga langkah mudah untuk menyelesaikan kebutuhan pengolahan gambar Anda.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {steps.map((step) => (
          <div
            key={step.number}
            className="relative flex flex-col items-center text-center rounded-2xl border border-slate-200/70 bg-white/70 p-6 shadow-sm backdrop-blur-sm transition hover:shadow-md hover:border-indigo-200"
          >
            {/* Badge Angka Langkah */}
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 mb-4 ring-4 ring-indigo-50/50 shadow-inner">
              {step.icon}
            </div>
            <div className="inline-flex items-center gap-1.5 mb-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white">
                {step.number}
              </span>
              <h4 className="text-sm font-bold text-slate-800">{step.title}</h4>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
