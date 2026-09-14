import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tingkatkan Resolusi Gambar (AI Upscale 2× / 4×) | ImgTools",
  description: "Tingkatkan ketajaman dan resolusi gambar hingga 4× lebih tinggi dengan model deep-learning Swin2SR.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
