import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Buramkan Wajah & Sensor Area Foto (AI) | ImgTools",
  description: "Sensor wajah secara otomatis dengan deteksi YOLOv8 Face atau tandai area manual dengan gaya Gaussian Blur atau Pixelate.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
