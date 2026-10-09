import { AnimationCard } from "@/components/animation-card";
import { TopicFilter } from "@/components/topic-filter";
import { animations, isTopicSlug } from "@/lib/animations";

export default async function Home({ searchParams }: PageProps<"/">) {
  const { topic } = await searchParams;
  const active = isTopicSlug(topic) ? topic : undefined;
  const visible = active
    ? animations.filter((animation) => animation.topic === active)
    : animations;

  return (
    <main className="flex-1 bg-zinc-50 px-4 py-12 font-sans dark:bg-black">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <TopicFilter active={active} />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map(({ slug, title }) => (
            <AnimationCard key={slug} slug={slug} title={title} />
          ))}
        </div>
      </div>
    </main>
  );
}
