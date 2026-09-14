import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Konversi dari JPG ke PNG & Pembuat GIF Animasi | ImgTools",
  description: "Ubah gambar JPG ke PNG atau gabungkan beberapa foto JPG menjadi animasi GIF bergerak secara instan.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
