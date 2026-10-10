import { readFileSync } from "node:fs";
import { join } from "node:path";

import { animations, topics, type TopicSlug } from "@/lib/animations";

export type FigureInfo = {
  slug: string;
  title: string;
  topic: TopicSlug;
  topicLabel: string;
  /** The figure's own one-line description, from its `means` field. */
  means: string;
  /** The React component name it installs as. */
  component: string;
};

const pascal = (title: string) =>
  title.replace(/[^A-Za-z0-9 ]/g, "").replace(/(^|\s+)(\w)/g, (_, __, c: string) => c.toUpperCase());

// read once at build: every page that uses this is statically generated
export const figures: FigureInfo[] = animations.map(({ slug, title, topic }) => {
  const source = readFileSync(join(process.cwd(), "src/hairline/figures", `${slug}.js`), "utf8");
  return {
    slug,
    title,
    topic,
    topicLabel: topics.find((t) => t.slug === topic)!.label,
    means: source.match(/means: "([^"]+)"/)?.[1] ?? `${title}, an interactive isometric line illustration.`,
    component: pascal(title),
  };
});

export const figureBySlug = (slug: string) => figures.find((f) => f.slug === slug);
