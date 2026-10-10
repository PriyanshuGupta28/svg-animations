import { animations, topics, type TopicSlug } from "@/lib/animations";

// ponytail: set NEXT_PUBLIC_SITE_URL to the production domain; Vercel's own URL is the fallback
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const SITE_NAME = "Linework";
export const SITE_TAGLINE = "Product art, drawn in one line";
export const SITE_DESCRIPTION =
  "Interactive isometric line illustrations in the style of modern product landing pages. " +
  `${animations.length} figures across ${topics.length} topics, each one idea drawn as one object that answers the cursor.`;

export function topicMeta(slug: TopicSlug) {
  const label = topics.find((t) => t.slug === slug)!.label;
  const figures = animations.filter((a) => a.topic === slug).map((a) => a.title);
  return {
    label,
    figures,
    title: `${label} illustrations`,
    description: `${figures.length} interactive isometric line illustrations for ${label}: ${figures.join(", ")}. Line-drawn product art that answers the cursor.`,
  };
}
