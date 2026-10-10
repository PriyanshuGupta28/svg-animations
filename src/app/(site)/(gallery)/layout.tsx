import { ArrowDownIcon } from "lucide-react";

import { CopyCommand } from "@/components/copy-command";
import { HairlineFigure } from "@/components/hairline-figure";
import { Plus, Rule } from "@/components/rule";
import { GalleryHeading, TopicTabs } from "@/components/topic-tabs";
import { animations, topics } from "@/lib/animations";

const counts: Record<string, number> = {};
for (const a of animations) counts[a.topic] = (counts[a.topic] ?? 0) + 1;

/** Hero, marquee and the collection, shared by the home page and every topic page so the tabs stay mounted between them. */
export default function GalleryLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Rule index="01" label="Index" note="isometric · one stroke" />

      <section className="grid items-center gap-10 px-5 pt-14 pb-16 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:pt-20 lg:pb-24">
        <div className="rise">
          <p className="mb-6 flex items-center gap-3 font-mono text-[11px] tracking-[0.18em] text-muted uppercase">
            <Plus className="size-2.5" />
            Line illustrations for product pages
          </p>
          <h1 className="font-serif text-[clamp(3rem,7.5vw,5.75rem)] leading-[0.92] tracking-[-0.02em]">
            Product art,
            <br />
            <em className="text-muted">drawn in</em>
            <br />
            one line.
          </h1>
          <p className="mt-8 max-w-md text-[15px] leading-relaxed text-muted">
            Interactive isometric illustrations in the quiet, line-drawn style of modern product landing pages.
            Each figure turns one idea into one object, and it answers the cursor: a drawer slides, a dial spins,
            a zipper closes.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <a
              href="#gallery"
              className="group inline-flex h-12 items-center gap-4 rounded-full bg-ink pr-2 pl-6 text-sm text-paper shadow-[0_10px_24px_-12px_rgba(0,0,0,0.45)] transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(.32,.72,0,1)] hover:-translate-y-px hover:shadow-[0_16px_32px_-14px_rgba(0,0,0,0.5)] active:translate-y-0"
            >
              Browse the collection
              {/* the arrow drops out of its chip and a second one follows it in */}
              <span className="relative grid size-8 place-items-center overflow-hidden rounded-full bg-paper text-ink">
                <ArrowDownIcon className="size-3.5 transition-transform duration-500 ease-[cubic-bezier(.32,.72,0,1)] group-hover:translate-y-8" />
                <ArrowDownIcon className="absolute size-3.5 -translate-y-8 transition-transform duration-500 ease-[cubic-bezier(.32,.72,0,1)] group-hover:translate-y-0" />
              </span>
            </a>
            <CopyCommand slug="zipper" />
          </div>
        </div>

        <figure className="rise relative [animation-delay:120ms]">
          <span className="crop crop-tl" />
          <span className="crop crop-tr" />
          <span className="crop crop-bl" />
          <span className="crop crop-br" />
          <div className="overflow-hidden rounded-[28px] border border-line bg-plate shadow-[0_40px_80px_-48px_rgba(0,0,0,0.35)]">
            <HairlineFigure slug="zipper" label="Zipper animation" />
          </div>
          <figcaption className="mt-4 flex justify-between font-mono text-[10px] tracking-[0.16em] text-muted uppercase">
            <span>fig. 01 — zipper</span>
            <span>git · merge</span>
          </figcaption>
        </figure>
      </section>

      <Rule index="02" label="Topics" note={`${topics.length} subjects`} />

      <div className="marquee py-5" aria-hidden="true">
        <div className="marquee-track">
          {[0, 1].map((copy) => (
            <span key={copy} className="flex shrink-0 items-center">
              {topics.map((t) => (
                <span key={t.slug} className="flex items-center font-serif text-2xl whitespace-nowrap italic">
                  <span className="px-6">{t.label}</span>
                  <span className="font-mono text-sm not-italic opacity-40">*</span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      <Rule index="03" label="Collection" note={`${animations.length} figures`} />

      <section id="gallery" className="scroll-mt-4 px-5 pt-16 pb-20 sm:px-8">
        <GalleryHeading counts={counts} total={animations.length} />

        <div className="sticky top-3 z-30 mb-10">
          <TopicTabs counts={counts} total={animations.length} />
        </div>

        {children}
      </section>
    </>
  );
}
