import { Collection } from "@/components/collection";
import { JsonLd } from "@/components/json-ld";
import { figures } from "@/lib/figures";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

export default function Home() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: SITE_NAME,
          url: SITE_URL,
          description: SITE_DESCRIPTION,
          publisher: { "@id": "https://devsloka.in/#organization" },
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: figures.length,
            itemListElement: figures.map((f, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: f.title,
              url: `${SITE_URL}/figures/${f.slug}`,
            })),
          },
        }}
      />
      <Collection />
    </>
  );
}
