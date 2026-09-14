import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hapus Latar Belakang Foto Otomatis (AI) | ImgTools",
  description: "Hapus background gambar secara otomatis dengan presisi potongan piksel menggunakan model AI RMBG-1.4.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
