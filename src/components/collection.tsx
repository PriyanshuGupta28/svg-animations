import { AnimationCard } from "@/components/animation-card";
import { animations, topics, type TopicSlug } from "@/lib/animations";

const labelOf = Object.fromEntries(topics.map((t) => [t.slug, t.label]));

export function Collection({ topic }: { topic?: TopicSlug }) {
  const visible = topic ? animations.filter((a) => a.topic === topic) : animations;
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {visible.map(({ slug, title, topic: t }, i) => (
        <AnimationCard key={slug} slug={slug} title={title} topic={labelOf[t]} index={i + 1} />
      ))}
    </div>
  );
}
