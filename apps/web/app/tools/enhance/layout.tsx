import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tingkatkan Ketajaman Foto (AI Enhance) | ImgTools",
  description: "Optimalkan ketajaman, kontras tekstur, dan kejernihan detail foto dengan AI Classical Restoration & Unsharp Masking.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
