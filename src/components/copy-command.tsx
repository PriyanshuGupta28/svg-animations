"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";

import { BlurSwap } from "@/components/blur-swap";

/** The install command for one figure, shortened on screen and copied in full. */
export function CopyCommand({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () =>
    navigator.clipboard.writeText(`npx shadcn@latest add ${window.location.origin}/r/${slug}.json`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }, () => {});

  return (
    <motion.button
      type="button"
      onClick={copy}
      whileTap={{ scale: 0.97 }}
      aria-label={`Copy the install command for ${slug}`}
      className="group inline-flex h-12 items-center gap-3 rounded-full border border-line bg-plate pr-2 pl-5 font-mono text-[12px] text-muted transition-colors hover:border-line-strong hover:text-ink"
    >
      <span>
        <span className="text-ink/40">$</span> npx shadcn add <span className="text-ink">{slug}</span>
      </span>
      <span className="grid size-8 place-items-center rounded-full border border-line bg-paper transition-colors group-hover:border-line-strong">
        <BlurSwap swapKey={copied ? "copied" : "copy"}>
          {copied ? <CheckIcon className="size-3.5 text-ink" /> : <CopyIcon className="size-3.5" />}
        </BlurSwap>
      </span>
    </motion.button>
  );
}
