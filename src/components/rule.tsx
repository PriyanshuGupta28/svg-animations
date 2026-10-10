/** A plus mark: where a section rule crosses a rail. */
export function Plus({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 11 11" className={`shrink-0 text-ink/70 ${className}`} fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
      <path d="M5.5 0v11M0 5.5h11" />
    </svg>
  );
}

/** A section rule across the frame, running on faintly to the screen edges, with + marks on the rails and a small numbered label. */
export function Rule({ index, label, note }: { index?: string; label?: string; note?: string }) {
  return (
    <div className="relative h-px bg-line" aria-hidden="true">
      <span className="pointer-events-none absolute top-0 left-1/2 -z-10 h-px w-screen -translate-x-1/2 bg-line/60" />
      <Plus className="absolute -top-1.25 left-[-5.5px] size-2.75" />
      <Plus className="absolute -top-1.25 right-[-5.5px] size-2.75" />
      {label && (
        <span className="absolute top-0 left-5 -translate-y-1/2 bg-paper px-2 font-mono text-[10px] tracking-[0.16em] text-muted uppercase sm:left-8">
          <span className="text-ink">{index}</span> · {label}
        </span>
      )}
      {note && (
        <span className="absolute top-0 right-5 hidden -translate-y-1/2 bg-paper px-2 font-mono text-[10px] tracking-[0.16em] text-muted uppercase sm:right-8 sm:block">
          * {note}
        </span>
      )}
    </div>
  );
}
