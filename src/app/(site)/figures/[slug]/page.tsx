import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AnimationCard } from "@/components/animation-card";
import { CopyCommand } from "@/components/copy-command";
import { GetCode } from "@/components/get-code";
import { HairlineFigure } from "@/components/hairline-figure";
import { JsonLd } from "@/components/json-ld";
import { Rule } from "@/components/rule";
import { figureBySlug, figures } from "@/lib/figures";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return figures.map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({ params }: PageProps<"/figures/[slug]">): Promise<Metadata> {
  const figure = figureBySlug((await params).slug);
  if (!figure) return {};
  const title = `${figure.title}: ${figure.topicLabel} illustration`;
  const description = `${figure.means} An interactive isometric line illustration for ${figure.topicLabel}, installable as a React component with the shadcn CLI.`;
  const url = `/figures/${figure.slug}`;
  return {
    title,
    description,
    keywords: [figure.title, figure.topicLabel, "isometric illustration", "line art", "React component", "shadcn"],
    alternates: { canonical: url },
    openGraph: { type: "article", siteName: SITE_NAME, locale: "en_US", title: `${title} — ${SITE_NAME}`, description, url },
    twitter: { card: "summary_large_image", title: `${title} — ${SITE_NAME}`, description },
  };
}

export default async function FigurePage({ params }: PageProps<"/figures/[slug]">) {
  const figure = figureBySlug((await params).slug);
  if (!figure) notFound();
  const { slug, title, topic, topicLabel, means, component } = figure;
  const siblings = figures.filter((f) => f.topic === topic && f.slug !== slug);
  const index = figures.filter((f) => f.topic === topic).findIndex((f) => f.slug === slug) + 1;
  const url = `${SITE_URL}/figures/${slug}`;
  const usage = `import { ${component} } from "@/components/linework/${slug}";\n\nexport default function Page() {\n  return <${component} />;\n}`;

  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "SoftwareSourceCode",
            name: `${title} (${SITE_NAME})`,
            description: means,
            url,
            programmingLanguage: ["TypeScript", "JavaScript"],
            runtimePlatform: "React",
            keywords: [topicLabel, "isometric illustration", "SVG animation"],
            author: { "@type": "Organization", name: "Devsloka", url: "https://devsloka.in" },
            isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
              { "@type": "ListItem", position: 2, name: topicLabel, item: `${SITE_URL}/topics/${topic}` },
              { "@type": "ListItem", position: 3, name: title, item: url },
            ],
          },
        ]}
      />

      <Rule index="01" label="Figure" note={`${topicLabel} · ${String(index).padStart(2, "0")}`} />

      <section className="px-5 pt-10 pb-16 sm:px-8 lg:pb-20">
        <nav aria-label="Breadcrumb" className="mb-10 font-mono text-[11px] tracking-[0.14em] text-muted uppercase">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="transition-colors hover:text-ink">
                {SITE_NAME}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href={`/topics/${topic}`} className="transition-colors hover:text-ink">
                {topicLabel}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-ink">
              {title}
            </li>
          </ol>
        </nav>

        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-14">
          <div>
            <h1 className="font-serif text-[clamp(3rem,7vw,5.25rem)] leading-[0.92] tracking-[-0.02em]">{title}</h1>
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-muted">{means}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <CopyCommand slug={slug} />
              <GetCode slug={slug} title={title} />
            </div>
            <pre className="mt-6 overflow-x-auto rounded-xl border border-line bg-plate px-4 py-3 font-mono text-[12px] leading-relaxed">
              <code>{usage}</code>
            </pre>
          </div>

          <figure className="overflow-hidden rounded-[28px] border border-line bg-plate shadow-[0_40px_80px_-48px_rgba(0,0,0,0.35)]">
            <HairlineFigure slug={slug} label={`${title} illustration`} />
          </figure>
        </div>
      </section>

      {siblings.length > 0 && (
        <>
          <Rule index="02" label={`More in ${topicLabel}`} note={`${siblings.length} more`} />
          <section className="px-5 pt-12 pb-20 sm:px-8">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {siblings.map((f, i) => (
                <AnimationCard key={f.slug} slug={f.slug} title={f.title} topic={f.topicLabel} index={i + 1} />
              ))}
            </div>
            <Link
              href={`/topics/${topic}`}
              className="mt-8 inline-flex font-mono text-[11px] tracking-[0.14em] text-muted uppercase transition-colors hover:text-ink"
            >
              All {topicLabel} figures →
            </Link>
          </section>
        </>
      )}
    </>
  );
}
