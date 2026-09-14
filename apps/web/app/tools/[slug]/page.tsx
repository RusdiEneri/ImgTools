import React from "react";
import { notFound } from "next/navigation";
import { TOOLS } from "@/lib/tools";
import ToolShell from "@/components/ToolShell";
import ToolWorkspace from "./ToolWorkspace";

interface ToolPageProps {
  params: {
    slug: string;
  };
}

export function generateStaticParams() {
  return TOOLS.map((tool) => ({
    slug: tool.slug,
  }));
}

export function generateMetadata({ params }: ToolPageProps) {
  const tool = TOOLS.find((t) => t.slug === params.slug);
  if (!tool) return { title: "Alat Tidak Ditemukan — ImgTools" };

  return {
    title: `${tool.name} Gambar Online Gratis — ImgTools`,
    description: `${tool.description} Layanan utilitas pengolahan gambar ${tool.name.toLowerCase()} cepat, gratis, dan aman langsung di browser Anda.`,
    keywords: [tool.name, "alat gambar online", "edit foto gratis", "imgtools", tool.slug],
    openGraph: {
      title: `${tool.name} — Alat Gambar Online | ImgTools`,
      description: tool.description,
      type: "website",
    },
  };
}

export default function ToolPage({ params }: ToolPageProps) {
  const tool = TOOLS.find((t) => t.slug === params.slug);

  if (!tool) {
    notFound();
  }

  return (
    <ToolShell
      title={tool.name}
      description={tool.description}
      badge={tool.badge}
    >
      <ToolWorkspace tool={tool} />
    </ToolShell>
  );
}
