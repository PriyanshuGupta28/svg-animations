import type { NextFetchEvent, NextRequest } from "next/server";

import { animations } from "@/lib/animations";
import { countInstall } from "@/lib/installs";

const slugs = new Set(animations.map((a) => a.slug));

/**
 * Counts installs: the shadcn CLI fetches /r/<figure>.json to install a figure (countInstall dedupes its
 * repeat fetches). Browsers (the site's own Manual tab, visitors) and crawlers send a Mozilla or bot user
 * agent and are left out; so is the shared engine item, so a figure counts once. The file itself is still
 * served as a static asset.
 */
export function proxy(request: NextRequest, event: NextFetchEvent) {
  const slug = request.nextUrl.pathname.match(/^\/r\/([a-z0-9-]+)\.json$/)?.[1];
  const agent = request.headers.get("user-agent") ?? "";
  if (slug && slugs.has(slug) && !/mozilla|bot|crawl|spider|preview/i.test(agent)) {
    const who = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "anon";
    event.waitUntil(countInstall(slug, who).catch(() => null));
  }
}

export const config = { matcher: "/r/:path*" };
