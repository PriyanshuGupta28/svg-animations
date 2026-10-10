"use client";

import { useEffect, useState } from "react";

import { useInstalls } from "@/components/install-count";

const DIGITS = "0123456789";

/** "1284" -> "1.3k": the count as the header shows it. */
const compact = (n: number) =>
  new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n).toLowerCase();

/** One odometer wheel: a column of 0 to 9 behind a one-digit window, rolled to `digit`. */
function Wheel({ digit, delay }: { digit: number; delay: number }) {
  return (
    <span className="relative inline-block h-[1em] w-[0.62em] overflow-hidden leading-none">
      <span
        className="absolute inset-x-0 top-0 flex flex-col transition-transform duration-1400 ease-[cubic-bezier(.32,.72,0,1)] motion-reduce:transition-none"
        style={{ transform: `translateY(${-digit * 10}%)`, transitionDelay: `${delay}ms` }}
      >
        {[...DIGITS].map((d) => (
          <span key={d} className="h-[1em] text-center leading-none">
            {d}
          </span>
        ))}
      </span>
    </span>
  );
}

/**
 * The total install count as a mechanical odometer, framed by L-shaped corner brackets. Digits roll up
 * from zero once the count loads, the rightmost first; before the first install it reads "new" rather
 * than a zero. Beside it, an isometric tray drawn in one stroke, and an arrow that drops into it when
 * the count lands and again on hover.
 */
export function InstallOdometer() {
  const data = useInstalls();
  const total = data?.total ?? 0;
  const [rolled, setRolled] = useState(false);

  // a frame at zero first, so the wheels have somewhere to roll from
  useEffect(() => {
    if (!total) return;
    const id = requestAnimationFrame(() => setRolled(true));
    return () => cancelAnimationFrame(id);
  }, [total]);

  const text = compact(total);
  const chars = [...text];

  return (
    <div
      className="installs group relative flex h-8 items-center gap-2.5 border border-line bg-plate/70 pr-3.5 pl-2 backdrop-blur"
      title="Installs through the shadcn CLI"
      data-landed={data ? "" : undefined}
    >
      {/* L-shaped corner brackets, drawn over the frame like a viewfinder; they spread a little on hover */}
      {(["-top-px -left-px border-t border-l", "-top-px -right-px border-t border-r", "-bottom-px -left-px border-b border-l", "-right-px -bottom-px border-r border-b"] as const).map((corner, i) => (
        <span
          key={corner}
          aria-hidden="true"
          className={`pointer-events-none absolute size-2 border-ink/70 transition-transform duration-300 ease-[cubic-bezier(.32,.72,0,1)] ${corner} ${
            ["group-hover:-translate-1", "group-hover:translate-x-1 group-hover:-translate-y-1", "group-hover:-translate-x-1 group-hover:translate-y-1", "group-hover:translate-1"][i]
          }`}
        />
      ))}

      <svg viewBox="0 0 20 20" className="size-5 shrink-0 text-ink" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
        {/* an open isometric tray: back rim, then the front faces */}
        <path d="M3 11.5 10 8l7 3.5" className="opacity-40" />
        <path d="M3 11.5v3L10 18l7-3.5v-3L10 15z" />
        <path d="M10 15v3" className="opacity-40" />
        {/* the arrow that drops in */}
        <g className="installs-arrow">
          <path d="M10 2.5v8" />
          <path d="m7.5 8 2.5 2.5L12.5 8" />
        </g>
      </svg>

      {total > 0 ? (
        <>
          <span className="sr-only">{total} installs</span>
          <span aria-hidden="true" className="relative top-px flex font-mono text-[12px] text-ink tabular-nums">
            {chars.map((c, i) =>
              DIGITS.includes(c) ? (
                <Wheel key={chars.length - i} digit={rolled ? Number(c) : 0} delay={(chars.length - 1 - i) * 90} />
              ) : (
                <span key={`${chars.length - i}${c}`} className="leading-none">
                  {c}
                </span>
              ),
            )}
          </span>
          <span aria-hidden="true" className="font-mono text-[10px] tracking-[0.16em] text-muted uppercase">
            installs
          </span>
        </>
      ) : (
        <span className="font-mono text-[10px] tracking-[0.16em] text-muted uppercase">
          <span className="text-ink">new</span> · install via cli
        </span>
      )}
    </div>
  );
}
