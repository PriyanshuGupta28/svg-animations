import type { MetadataRoute } from "next";

import { topics } from "@/lib/animations";
import { figures } from "@/lib/figures";
import { SITE_URL } from "@/lib/site";

// ponytail: one build date for every page; per-page dates from git history if they ever matter
const lastModified = new Date();

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, lastModified, changeFrequency: "weekly", priority: 1 },
    ...topics.map((t) => ({
      url: `${SITE_URL}/topics/${t.slug}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...figures.map((f) => ({
      url: `${SITE_URL}/figures/${f.slug}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
