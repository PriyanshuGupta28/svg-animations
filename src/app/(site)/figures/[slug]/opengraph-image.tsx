import { figureBySlug, figures } from "@/lib/figures";
import { ogSize, renderOg } from "@/lib/og";

export const alt = "Linework: an interactive isometric line illustration";
export const size = ogSize;
export const contentType = "image/png";

export function generateStaticParams() {
  return figures.map((f) => ({ slug: f.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const figure = figureBySlug((await params).slug) ?? figures[0];
  return renderOg({
    eyebrow: `${figure.topicLabel} · linework`,
    title: figure.title,
    italic: "in one line.",
    footer: "npx shadcn add · a devsloka product",
  });
}
