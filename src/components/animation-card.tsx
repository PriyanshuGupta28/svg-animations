import Link from "next/link";

import { GetCode } from "@/components/get-code";
import { HairlineFigure } from "@/components/hairline-figure";

type AnimationCardProps = {
  slug: string;
  title: string;
  topic: string;
  index: number;
};

export function AnimationCard({ slug, title, topic, index }: AnimationCardProps) {
  return (
    <article className="group relative overflow-hidden rounded-[22px] border border-line bg-plate transition-[border-color,box-shadow,transform] duration-500 ease-[cubic-bezier(.32,.72,0,1)] hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[0_24px_48px_-28px_rgba(0,0,0,0.25)]">
      <HairlineFigure slug={slug} label={`${title} animation`} />
      <footer className="flex items-center justify-between gap-3 border-t border-line py-3 pr-3 pl-5">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h3 className="font-serif text-[22px] leading-none tracking-tight">
            <Link href={`/figures/${slug}`} className="underline decoration-transparent decoration-1 underline-offset-4 transition-colors hover:decoration-line-strong">
              {title}
            </Link>
          </h3>
          <p className="font-mono text-[10px] tracking-[0.14em] text-muted uppercase">
            {String(index).padStart(2, "0")} · {topic}
          </p>
        </div>
        <GetCode slug={slug} title={title} />
      </footer>
    </article>
  );
}
