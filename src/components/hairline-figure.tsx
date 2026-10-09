"use client";

import { useEffect, useRef } from "react";

import { loadFigure, mountFigure } from "@/hairline";

type HairlineFigureProps = {
  slug: string;
  label: string;
};

export function HairlineFigure({ slug, label }: HairlineFigureProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const readoutRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const readout = readoutRef.current;
    if (!stage || !readout) return;

    let cancelled = false;
    let unmount: (() => void) | undefined;
    loadFigure(slug).then((figure) => {
      if (!cancelled) unmount = mountFigure(stage, readout, figure);
    });

    return () => {
      cancelled = true;
      unmount?.();
    };
  }, [slug]);

  return (
    <div className="relative">
      <span
        ref={readoutRef}
        className="pointer-events-none absolute top-3 right-4 z-10 font-mono text-[11px] text-zinc-900 tabular-nums dark:text-zinc-200"
      />
      <div ref={stageRef} data-hairline={slug} role="img" aria-label={label} />
    </div>
  );
}
