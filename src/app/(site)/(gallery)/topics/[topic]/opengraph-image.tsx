import { ogSize, renderOg } from "@/lib/og";
import { isTopicSlug, topics } from "@/lib/animations";
import { topicMeta } from "@/lib/site";

export const alt = "Linework: interactive isometric line illustrations for one topic";

export const size = ogSize;
export const contentType = "image/png";

export function generateStaticParams() {
  return topics.map((t) => ({ topic: t.slug }));
}

export default async function Image({ params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params;
  const slug = isTopicSlug(topic) ? topic : topics[0].slug;
  const { label, figures } = topicMeta(slug);
  return renderOg({
    eyebrow: `${String(figures.length).padStart(2, "0")} figures · linework`,
    title: label,
    italic: "in one line.",
    footer: figures.join(" · "),
  });
}
