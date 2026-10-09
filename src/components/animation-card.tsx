import { HairlineFigure } from "@/components/hairline-figure";

type AnimationCardProps = {
  slug: string;
  title: string;
};

export function AnimationCard({ slug, title }: AnimationCardProps) {
  return (
    <article className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="border-b border-zinc-200 px-5 py-4 text-sm font-medium dark:border-zinc-800">
        {title}
      </h2>
      <HairlineFigure slug={slug} label={`${title} animation`} />
    </article>
  );
}
