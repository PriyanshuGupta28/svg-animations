import { topics } from "@/lib/animations";
import { figures } from "@/lib/figures";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

const install = (slug: string) => `npx shadcn@latest add ${SITE_URL}/r/${slug}.json`;

const intro = `# ${SITE_NAME}

> ${SITE_DESCRIPTION}

${SITE_NAME} is a library of interactive isometric line illustrations for product landing pages, in the quiet,
line-drawn style of modern product sites. Each figure is one object standing for one idea (a zipper for a git merge,
a vault dial for security) drawn in a single hairline stroke, and it answers the cursor. A product by Devsloka
(https://devsloka.in). Figures were drawn with the Hairline skill by Lucas Markes (https://hairline.lucasmarkes.com/skill).

## Install

Every figure is a shadcn registry item. Install one into a React / Next.js project with:

    ${install("<figure>")}

then render it: \`import { Zipper } from "@/components/linework/zipper"\` and \`<Zipper />\`.
The first figure also installs the shared engine into \`lib/linework\`. Props: \`readout\`, \`tour\`, \`label\`, \`className\`.
Registry index: ${SITE_URL}/r/registry.json`;

const topicSection = `## Topics

${topics
  .map((t) => {
    const names = figures.filter((f) => f.topic === t.slug).map((f) => f.title);
    return `- [${t.label}](${SITE_URL}/topics/${t.slug}): ${names.join(", ")}`;
  })
  .join("\n")}`;

/** The short index: what the site is, how to install, and one line per page. */
export function llmsTxt() {
  return `${intro}

${topicSection}

## Figures

${figures.map((f) => `- [${f.title}](${SITE_URL}/figures/${f.slug}): ${f.means} (${f.topicLabel})`).join("\n")}

## Optional

- [Full reference](${SITE_URL}/llms-full.txt): every figure with its install command and usage
- [Registry index](${SITE_URL}/r/registry.json): machine-readable list of every installable item
- [Sitemap](${SITE_URL}/sitemap.xml)
`;
}

/** The long form: every figure with its component name, install command and usage. */
export function llmsFullTxt() {
  return `${intro}

${topicSection}

## Figures

${figures
  .map(
    (f) => `### ${f.title}

- Topic: ${f.topicLabel}
- Page: ${SITE_URL}/figures/${f.slug}
- What it shows: ${f.means}
- Install: \`${install(f.slug)}\`
- Use: \`import { ${f.component} } from "@/components/linework/${f.slug}"\`, then \`<${f.component} />\``,
  )
  .join("\n\n")}
`;
}
