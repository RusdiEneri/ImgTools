import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pembuat Meme Online Cepat & Lucu | ImgTools",
  description: "Buat meme kreatif dengan teks atas dan bawah font Impact klasik serta template meme populer di browser Anda.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
