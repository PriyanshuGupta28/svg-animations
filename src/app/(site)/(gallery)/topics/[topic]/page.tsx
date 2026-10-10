import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Collection } from "@/components/collection";
import { JsonLd } from "@/components/json-ld";
import { isTopicSlug, topics } from "@/lib/animations";
import { figures } from "@/lib/figures";
import { SITE_NAME, SITE_URL, topicMeta } from "@/lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return topics.map((t) => ({ topic: t.slug }));
}

export async function generateMetadata({ params }: PageProps<"/topics/[topic]">): Promise<Metadata> {
  const { topic } = await params;
  if (!isTopicSlug(topic)) return {};
  const { title, description } = topicMeta(topic);
  return {
    title,
    description,
    alternates: { canonical: `/topics/${topic}` },
    // these objects replace the root ones rather than merging, so the shared fields are repeated
    openGraph: { type: "website", siteName: SITE_NAME, locale: "en_US", title: `${title} — ${SITE_NAME}`, description, url: `/topics/${topic}` },
    twitter: { card: "summary_large_image", title: `${title} — ${SITE_NAME}`, description },
  };
}

export default async function TopicPage({ params }: PageProps<"/topics/[topic]">) {
  const { topic } = await params;
  if (!isTopicSlug(topic)) notFound();
  const { label, description } = topicMeta(topic);
  const url = `${SITE_URL}/topics/${topic}`;
  const inTopic = figures.filter((f) => f.topic === topic);
  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: `${label} illustrations`,
            url,
            description,
            isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
            mainEntity: {
              "@type": "ItemList",
              numberOfItems: inTopic.length,
              itemListElement: inTopic.map((f, i) => ({
                "@type": "ListItem",
                position: i + 1,
                name: f.title,
                url: `${SITE_URL}/figures/${f.slug}`,
              })),
            },
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
              { "@type": "ListItem", position: 2, name: label, item: url },
            ],
          },
        ]}
      />
      <Collection topic={topic} />
    </>
  );
}
