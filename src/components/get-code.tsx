"use client";

import { CheckIcon, ChevronDownIcon, CopyIcon } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Drawer } from "vaul";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BlurSwap } from "@/components/blur-swap";
import { HairlineFigure } from "@/components/hairline-figure";
import { ScrollArea } from "@/components/ui/scroll-area";

import { useActiveTopic } from "@/components/topic-tabs";
import { animations, topics, type TopicSlug } from "@/lib/animations";

type RegistryFile = { target: string; content: string };
type RegistryItem = { files: RegistryFile[]; meta?: { component: string } };

const MANAGERS = {
  npm: "npx shadcn@latest add",
  pnpm: "pnpm dlx shadcn@latest add",
  yarn: "yarn dlx shadcn@latest add",
  bun: "bunx --bun shadcn@latest add",
} as const;

/** "@lib/linework/x.js" -> "lib/linework/x.js": where the file goes, as shadcn would place it. */
const where = (target: string) => target.replace(/^@(lib|components)\//, "$1/");

const pascal = (title: string) =>
  title.replace(/[^A-Za-z0-9 ]/g, "").replace(/(^|\s+)(\w)/g, (_, __, c: string) => c.toUpperCase());

const inTopic = (topic?: TopicSlug) => (topic ? animations.filter((a) => a.topic === topic) : animations);

export function GetCode({ slug: cardSlug, title: cardTitle }: { slug: string; title: string }) {
  const pageTopic = useActiveTopic();
  const [open, setOpen] = useState(false);
  const [side, setSide] = useState<"right" | "bottom">("right");
  const [slug, setSlug] = useState(cardSlug);
  const [topic, setTopic] = useState<TopicSlug | undefined>(pageTopic);
  const [tab, setTab] = useState<"install" | "manual">("install");
  const [pm, setPm] = useState<keyof typeof MANAGERS>("npm");
  const [manual, setManual] = useState<{ slug: string; files: RegistryFile[] } | null>(null);
  const [origin, setOrigin] = useState("");
  const content = useRef<HTMLDivElement>(null);

  const onOpenChange = (next: boolean) => {
    if (next) {
      // every open starts on the clicked card, filtered like the page it was opened from
      setSide(window.matchMedia("(min-width: 640px)").matches ? "right" : "bottom");
      setSlug(cardSlug);
      setTopic(pageTopic);
      setOrigin(window.location.origin);
    }
    setOpen(next);
  };

  const list = inTopic(topic);
  const index = Math.max(0, list.findIndex((a) => a.slug === slug));
  const step = (dir: -1 | 1) => setSlug(list[(index + dir + list.length) % list.length].slug);

  const changeTopic = (value: string) => {
    const next = (value || undefined) as TopicSlug | undefined;
    setTopic(next);
    const nextList = inTopic(next);
    if (!nextList.some((a) => a.slug === slug)) setSlug(nextList[0].slug);
  };

  // the manual tab reads the same registry JSON the CLI installs from
  useEffect(() => {
    if (!open || tab !== "manual" || manual?.slug === slug) return;
    let cancelled = false;
    Promise.all([fetch("/r/linework.json"), fetch(`/r/${slug}.json`)])
      .then((rs) => Promise.all(rs.map((r) => r.json() as Promise<RegistryItem>)))
      .then(([core, item]) => [...item.files, ...core.files])
      .catch(() => [])
      .then((files) => !cancelled && setManual({ slug, files }));
    return () => {
      cancelled = true;
    };
  }, [open, tab, slug, manual?.slug]);

  const title = animations.find((a) => a.slug === slug)?.title ?? cardTitle;
  const component = pascal(title);
  const command = `${MANAGERS[pm]} ${origin}/r/${slug}.json`;
  const usage = `import { ${component} } from "@/components/linework/${slug}";\n\nexport default function Page() {\n  return <${component} />;\n}`;
  const files = manual?.slug === slug ? manual.files : null;

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} direction={side}>
      <Drawer.Trigger
        aria-label={`Get the code for ${cardTitle}`}
        className="grid size-8 shrink-0 place-items-center rounded-full border border-line text-muted transition-colors hover:border-line-strong hover:text-ink"
      >
        <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5.5 4 1.5 8l4 4M10.5 4l4 4-4 4" />
        </svg>
      </Drawer.Trigger>

      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-paper/55 backdrop-blur-[6px]" />
        <Drawer.Content
          ref={content}
          aria-describedby={undefined}
          style={side === "right" ? ({ "--initial-transform": "calc(100% + 8px)" } as React.CSSProperties) : undefined}
          className={`fixed z-50 flex flex-col border border-line bg-plate text-ink shadow-[0_40px_120px_-40px_rgba(0,0,0,0.45)] outline-none ${
            side === "right"
              ? "inset-y-2 right-2 w-[min(640px,calc(100vw-16px))] rounded-[22px]"
              : "inset-x-0 bottom-0 max-h-[88dvh] rounded-t-[22px] border-b-0"
          }`}
        >
          {side === "bottom" && <div aria-hidden="true" className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-line-strong" />}

          <header className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
            <div className="min-w-0">
              <p className="font-mono text-[10px] tracking-[0.16em] text-muted uppercase">
                Get the code · {String(index + 1).padStart(2, "0")} / {String(list.length).padStart(2, "0")}
              </p>
              <Drawer.Title className="truncate font-serif text-[28px] leading-tight">{title}</Drawer.Title>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <IconButton label="Previous figure" onClick={() => step(-1)} d="M10 3.5 5.5 8l4.5 4.5" />
              <IconButton label="Next figure" onClick={() => step(1)} d="M6 3.5 10.5 8 6 12.5" />
              <Drawer.Close
                aria-label="Close"
                className="ml-1.5 grid size-8 place-items-center rounded-full border border-line text-muted transition-colors hover:text-ink"
              >
                <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
                  <path d="m3 3 10 10M13 3 3 13" />
                </svg>
              </Drawer.Close>
            </div>
          </header>

          <div className="flex items-center justify-between gap-3 border-b border-line px-6 pt-3">
            <div className="flex gap-1">
              {(["install", "manual"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  aria-pressed={tab === t}
                  className={`-mb-px border-b px-3 pb-2.5 text-[13px] capitalize transition-colors ${
                    tab === t ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            {/* not modal: the drawer already traps focus, and a second modal layer outlives the menu */}
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger
                aria-label="Filter figures by topic"
                className="mb-2 flex max-w-48 items-center gap-1.5 rounded-full border border-line bg-paper py-1 pr-2 pl-3 text-[12px] text-ink outline-none transition-colors hover:border-line-strong data-popup-open:border-line-strong"
              >
                <span className="truncate">{topic ? topics.find((t) => t.slug === topic)?.label : "All topics"}</span>
                <ChevronDownIcon className="size-3.5 shrink-0 text-muted" />
              </DropdownMenuTrigger>
              <DropdownMenuContent container={content} align="end" className="w-52 overflow-hidden p-0">
                <ScrollArea className="scroll-fade [--scroll-fade:28px] [&>[data-slot=scroll-area-viewport]]:max-h-72">
                  <DropdownMenuRadioGroup value={topic ?? ""} onValueChange={(v) => changeTopic(String(v))} className="p-1">
                    <DropdownMenuRadioItem value="" className="text-[13px]">
                      All topics
                    </DropdownMenuRadioItem>
                    <DropdownMenuSeparator />
                    {topics.map((t) => (
                      <DropdownMenuRadioItem key={t.slug} value={t.slug} className="text-[13px]">
                        {t.label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </ScrollArea>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <ScrollArea className="scroll-fade flex min-h-0 [--scroll-fade:64px] flex-1 flex-col [&>[data-slot=scroll-area-viewport]]:min-h-0 [&>[data-slot=scroll-area-viewport]]:flex-1">
            <div className="px-6 py-5">
              {/* a live preview; keyed so it remounts on the next figure, no-drag so using it never swipes the drawer shut */}
              <div data-vaul-no-drag className="mb-6 overflow-hidden rounded-2xl border border-line bg-plate">
                <div className="mx-auto w-full max-w-[420px]">
                  <HairlineFigure key={slug} slug={slug} label={`${title} preview`} />
                </div>
              </div>
              {tab === "install" ? (
                <div className="flex flex-col gap-6">
                  <Step n={1} label="Add it with the shadcn CLI">
                    <div className="mb-2 flex gap-1">
                      {(Object.keys(MANAGERS) as (keyof typeof MANAGERS)[]).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setPm(m)}
                          aria-pressed={pm === m}
                          className={`rounded-full px-3 py-1 font-mono text-[11px] transition-colors ${
                            pm === m ? "bg-ink text-paper" : "text-muted hover:text-ink"
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                    <Code text={command} />
                  </Step>
                  <Step n={2} label="Use it">
                    <Code text={usage} />
                  </Step>
                  <p className="text-[12px] leading-relaxed text-muted">
                    The first figure also installs the shared engine into <code className="font-mono">lib/linework</code>.
                    Props: <code className="font-mono">readout</code>, <code className="font-mono">tour</code>,{" "}
                    <code className="font-mono">label</code>, <code className="font-mono">className</code>.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  <p className="text-[12px] leading-relaxed text-muted">
                    Copy each file to the path shown. The last three are the shared engine; copy them once for all
                    figures. Needs <code className="font-mono">allowJs</code> in tsconfig, which Next.js has on by default.
                  </p>
                  {files === null ? (
                    <p className="font-mono text-[11px] text-muted">loading…</p>
                  ) : (
                    files.map((f) => (
                      <div key={f.target}>
                        <p className="mb-1.5 font-mono text-[11px] text-muted">{where(f.target)}</p>
                        <Code text={f.content} tall />
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function IconButton({ label, onClick, d }: { label: string; onClick: () => void; d: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid size-8 place-items-center rounded-full border border-line text-muted transition-[color,border-color,transform] hover:border-line-strong hover:text-ink active:scale-90"
    >
      <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={d} />
      </svg>
    </button>
  );
}

function Step({ n, label, children }: { n: number; label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2.5 flex items-center gap-2.5 text-[13px]">
        <span className="grid size-5 place-items-center rounded-full border border-line font-mono text-[10px] text-muted">{n}</span>
        {label}
      </p>
      {children}
    </div>
  );
}

function CopyLabel({ copied, className = "" }: { copied: boolean; className?: string }) {
  return (
    <span aria-hidden={className === "invisible" || undefined} className={`col-start-1 row-start-1 flex items-center gap-1.5 whitespace-nowrap ${className}`}>
      {copied ? <CheckIcon className="size-3" /> : <CopyIcon className="size-3" />}
      {copied ? "copied" : "copy"}
    </span>
  );
}

function Code({ text, tall = false }: { text: string; tall?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = () =>
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    }, () => {});
  return (
    // no-drag: selecting or side-scrolling code must not start a swipe-to-close
    <div data-vaul-no-drag className="group relative rounded-xl border border-line bg-paper">
      <ScrollArea className={`scroll-fade rounded-[inherit] [contain:inline-size] ${tall ? "[&>[data-slot=scroll-area-viewport]]:max-h-64" : ""}`}>
        <pre className="w-max min-w-full px-4 py-3 pr-20 font-mono text-[12px] leading-relaxed">
          <code>{text}</code>
        </pre>
      </ScrollArea>
      <motion.button
        type="button"
        onClick={copy}
        whileTap={{ scale: 0.92 }}
        className={`absolute top-2 right-2 rounded-full border bg-plate px-2.5 py-1 font-mono text-[10px] transition-colors ${
          copied ? "border-line-strong text-ink" : "border-line text-muted hover:text-ink"
        }`}
      >
        {/* the pill is always as wide as its longer state, so swapping never resizes it */}
        <span className="inline-grid">
          <CopyLabel copied className="invisible" />
          <span className="col-start-1 row-start-1 flex justify-center">
            <BlurSwap swapKey={copied ? "copied" : "copy"}>
              <CopyLabel copied={copied} />
            </BlurSwap>
          </span>
        </span>
      </motion.button>
    </div>
  );
}
