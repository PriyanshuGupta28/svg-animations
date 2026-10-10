"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { useEffect, useRef, useState, type CSSProperties } from "react";

import { isTopicSlug, topics, type TopicSlug } from "@/lib/animations";

type TopicTabsProps = {
  counts: Record<string, number>;
  total: number;
};

/** The topic of the current /topics/<slug> page, or undefined on the home page. */
export function useActiveTopic(): TopicSlug | undefined {
  const slug = usePathname().split("/")[2];
  return isTopicSlug(slug) ? slug : undefined;
}

export function GalleryHeading({ counts, total }: TopicTabsProps) {
  const active = useActiveTopic();
  const label = active ? topics.find((t) => t.slug === active)!.label : "The collection";
  return (
    <div className="mb-8 flex items-end justify-between gap-6">
      <h2 className="font-serif text-4xl tracking-tight sm:text-5xl">{label}</h2>
      <p className="pb-1 font-mono text-[11px] tracking-[0.14em] text-muted uppercase">
        {String(active ? counts[active] : total).padStart(2, "0")} figures
      </p>
    </div>
  );
}

const options = [{ slug: undefined, label: "All" }, ...topics];

export function TopicTabs({ counts, total }: TopicTabsProps) {
  const active = useActiveTopic();
  const scrollerRef = useRef<HTMLElement>(null);
  const activeRef = useRef<HTMLAnchorElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  // which ends still have tabs hidden past them: drives the fades and the arrows
  useEffect(() => {
    const strip = scrollerRef.current;
    if (!strip) return;
    const update = () => {
      const max = strip.scrollWidth - strip.clientWidth;
      setEdges({ left: strip.scrollLeft > 2, right: strip.scrollLeft < max - 2 });
    };
    update();
    strip.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(strip);
    return () => {
      strip.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, []);

  const nudge = (dir: -1 | 1) => {
    const strip = scrollerRef.current;
    strip?.scrollBy({ left: dir * strip.clientWidth * 0.6, behavior: "smooth" });
  };

  // centre the active tab by scrolling the strip only; scrollIntoView would move the page too
  useEffect(() => {
    const strip = scrollerRef.current, tab = activeRef.current;
    if (!strip || !tab) return;
    const s = strip.getBoundingClientRect(), t = tab.getBoundingClientRect();
    strip.scrollTo({ left: strip.scrollLeft + t.left - s.left - (s.width - t.width) / 2, behavior: "smooth" });
  }, [active]);

  return (
    <div className="relative rounded-full border border-line bg-paper/70 shadow-[0_1px_0_rgba(0,0,0,0.02),0_12px_32px_-16px_rgba(0,0,0,0.18)] backdrop-blur-xl">
      <nav
        ref={scrollerRef}
        aria-label="Filter by topic"
        className="tabs-fade relative overflow-x-auto rounded-full scrollbar-none"
        style={{ "--fade-l": edges.left ? "96px" : "0px", "--fade-r": edges.right ? "96px" : "0px" } as CSSProperties}
      >
        <ul className="flex w-max gap-1 p-1">
          {options.map(({ slug, label }) => {
            const current = slug === active;
            const count = slug ? counts[slug] : total;
            return (
              <li key={label} className="relative">
                <Link
                  ref={current ? activeRef : undefined}
                  href={slug ? `/topics/${slug}#gallery` : "/#gallery"}
                  scroll={false}
                  aria-current={current ? "page" : undefined}
                  className={`relative z-10 flex items-center gap-2 rounded-full px-4 py-2 text-[13px] whitespace-nowrap transition-colors duration-300 ${
                    current ? "text-paper" : "text-muted hover:text-ink"
                  }`}
                >
                  {current && (
                    <motion.span
                      layoutId="tab-pill"
                      className="absolute inset-0 -z-10 rounded-full bg-ink"
                      transition={{ type: "spring", stiffness: 420, damping: 36 }}
                    />
                  )}
                  {label}
                  <span
                    className={`font-mono text-[10px] tabular-nums transition-opacity ${
                      current ? "opacity-60" : "opacity-40"
                    }`}
                  >
                    {String(count).padStart(2, "0")}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 left-0 z-10 w-28 rounded-l-full bg-linear-to-r from-paper from-30% to-transparent transition-opacity duration-300 ${edges.left ? "opacity-100" : "opacity-0"}`}
      />
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 right-0 z-10 w-28 rounded-r-full bg-linear-to-l from-paper from-30% to-transparent transition-opacity duration-300 ${edges.right ? "opacity-100" : "opacity-0"}`}
      />
      <ScrollButton dir={-1} shown={edges.left} onClick={() => nudge(-1)} />
      <ScrollButton dir={1} shown={edges.right} onClick={() => nudge(1)} />
    </div>
  );
}

function ScrollButton({ dir, shown, onClick }: { dir: -1 | 1; shown: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      tabIndex={shown ? 0 : -1}
      aria-hidden={!shown}
      aria-label={dir < 0 ? "Scroll topics left" : "Scroll topics right"}
      className={`absolute top-1/2 z-20 grid size-8 -translate-y-1/2 place-items-center rounded-full border border-line bg-plate text-ink shadow-[0_4px_12px_-4px_rgba(0,0,0,0.18)] transition-[opacity,transform,border-color] duration-300 ease-[cubic-bezier(.32,.72,0,1)] hover:border-line-strong active:scale-90 ${
        dir < 0 ? "left-1.5" : "right-1.5"
      } ${shown ? "opacity-100" : "pointer-events-none scale-75 opacity-0"}`}
    >
      <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={dir < 0 ? "M10 3.5 5.5 8l4.5 4.5" : "M6 3.5 10.5 8 6 12.5"} />
      </svg>
    </button>
  );
}
