import { animations, topics } from "@/lib/animations";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

import { ogSize, renderOg } from "@/lib/og";

export const alt = `${SITE_NAME}: ${SITE_TAGLINE}`;
export const size = ogSize;
export const contentType = "image/png";

export default function Image() {
  return renderOg({
    eyebrow: "Line illustrations for product pages",
    title: "Product art,",
    italic: "drawn in one line.",
    footer: `${animations.length} figures · ${topics.length} topics · by Devsloka`,
  });
}
