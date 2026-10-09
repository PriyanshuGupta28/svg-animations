import Link from "next/link";

import { topics, type TopicSlug } from "@/lib/animations";

type TopicFilterProps = {
  active?: TopicSlug;
};

const options = [{ slug: undefined, label: "All" }, ...topics];

export function TopicFilter({ active }: TopicFilterProps) {
  return (
    <nav aria-label="Filter by topic" className="flex flex-wrap gap-2">
      {options.map(({ slug, label }) => {
        const current = slug === active;
        return (
          <Link
            key={label}
            href={slug ? `/?topic=${slug}` : "/"}
            scroll={false}
            aria-current={current ? "page" : undefined}
            className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
              current
                ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:border-zinc-600"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
