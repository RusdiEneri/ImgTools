import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ubah Ukuran Gambar (Resize) Online Gratis | ImgTools",
  description: "Ubah dimensi lebar dan tinggi piksel foto atau persentase skala dengan mudah dan cepat langsung di peramban Anda.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
