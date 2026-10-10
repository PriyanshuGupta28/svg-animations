// Builds the shadcn registry into public/r: one item per figure plus the shared `linework` core,
// so `npx shadcn@latest add <site>/r/<slug>.json` installs a figure. Run before `next dev` and `next build`.
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";

const SITE =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

const read = (p) => readFile(new URL(`../${p}`, import.meta.url), "utf8");
const out = new URL("../public/r/", import.meta.url);

const catalog = await read("src/lib/animations.ts");
const topicLabel = Object.fromEntries([...catalog.matchAll(/slug: "([^"]+)", label: "([^"]+)"/g)].map((m) => [m[1], m[2]]));
const figures = [...catalog.matchAll(/slug: "([^"]+)", title: "([^"]+)", topic: "([^"]+)"/g)].map(
  ([, slug, title, topic]) => ({ slug, title, topic }),
);

const pascal = (title) => title.replace(/[^A-Za-z0-9 ]/g, "").replace(/(^|\s+)(\w)/g, (_, __, c) => c.toUpperCase());

const core = {
  $schema: "https://ui.shadcn.com/schema/registry-item.json",
  name: "linework",
  type: "registry:component",
  title: "Linework core",
  description: "The engine and React wrapper every Linework figure runs on.",
  files: [
    { path: "registry/lib/kernel.js", type: "registry:lib", target: "@lib/linework/kernel.js", content: await read("src/hairline/kernel.js") },
    { path: "registry/lib/index.ts", type: "registry:lib", target: "@lib/linework/index.ts", content: await read("registry/lib/index.ts") },
    {
      path: "registry/components/linework-figure.tsx",
      type: "registry:component",
      target: "@components/linework/linework-figure.tsx",
      content: await read("registry/components/linework-figure.tsx"),
    },
  ],
};

const items = await Promise.all(
  figures.map(async ({ slug, title, topic }) => {
    const source = await read(`src/hairline/figures/${slug}.js`);
    const means = source.match(/means: "([^"]+)"/)?.[1] ?? `${title}, an interactive isometric line figure.`;
    const component = pascal(title);
    return {
      $schema: "https://ui.shadcn.com/schema/registry-item.json",
      name: slug,
      type: "registry:component",
      title,
      description: means,
      categories: [topicLabel[topic]],
      registryDependencies: [`${SITE}/r/linework.json`],
      files: [
        {
          path: `registry/figures/${slug}-figure.js`,
          type: "registry:lib",
          target: `@lib/linework/figures/${slug}-figure.js`,
          // the figure reads the engine's globals, so it loads the engine itself
          content: `import "../index";\n\n${source}`,
        },
        {
          path: `registry/components/${slug}.tsx`,
          type: "registry:component",
          target: `@components/linework/${slug}.tsx`,
          content: `"use client";

import "@/lib/linework/figures/${slug}-figure";

import { LineworkFigure, type LineworkFigureProps } from "@/components/linework/linework-figure";

/** ${title}: ${means} */
export function ${component}(props: LineworkFigureProps) {
  return <LineworkFigure name="${slug}" label="${title}" {...props} />;
}
`,
        },
      ],
      meta: { component, topic },
    };
  }),
);

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
const write = (name, data) => writeFile(new URL(name, out), JSON.stringify(data, null, 2));
await write("linework.json", core);
await Promise.all(items.map((item) => write(`${item.name}.json`, item)));
await write("registry.json", {
  $schema: "https://ui.shadcn.com/schema/registry.json",
  name: "linework",
  homepage: SITE,
  // the index lists items without their sources; JSON.stringify drops the undefined keys
  items: [core, ...items].map((item) => ({
    ...item,
    $schema: undefined,
    files: item.files.map((file) => ({ ...file, content: undefined })),
  })),
});
console.log(`registry: ${items.length} figures + core -> public/r (${SITE})`);
