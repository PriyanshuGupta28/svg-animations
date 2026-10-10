import Link from "next/link";

import { InstallOdometer } from "@/components/install-odometer";
import { Rule } from "@/components/rule";
import { animations, topics } from "@/lib/animations";


/** The frame every page shares: rails, header, colophon. */
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex-1 overflow-x-clip px-4 sm:px-6">
      {/* one fixed-width frame: rails down both sides, every section ruled off with a + where it meets them */}
      <div className="mx-auto max-w-6xl border-x border-line">
        <header className="flex items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/" className="logo flex items-center gap-2.5">
            <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 20 9 17V13l6-3V6l6-3" pathLength={1} className="logo-line" />
              <circle cx="21" cy="3" r="1.5" fill="currentColor" stroke="none" className="logo-dot" />
            </svg>
            <span className="font-serif text-[22px] leading-none italic">linework</span>
          </Link>
          <div className="flex items-center gap-5">
            <p className="hidden font-mono text-[11px] tracking-[0.14em] text-muted uppercase md:block">
              {animations.length} figures · {topics.length} topics
            </p>
            <InstallOdometer />
          </div>
        </header>
        {children}

        <Rule index="04" label="Colophon" note="a devsloka product" />

        <footer>
          <div className="grid gap-10 px-5 pt-14 pb-12 sm:px-8 md:grid-cols-[1.4fr_1fr] md:items-end">
            <div>
              <p className="mb-4 font-mono text-[10px] tracking-[0.18em] text-muted uppercase">Credits</p>
              <p className="max-w-xl font-serif text-[clamp(1.6rem,3.2vw,2.4rem)] leading-[1.1] tracking-tight">
                Figures made by{" "}
                <a
                  href="https://devsloka.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="italic underline decoration-line-strong decoration-1 underline-offset-[6px] transition-colors hover:decoration-ink"
                >
                  Devsloka
                </a>{" "}
                with the{" "}
                <a
                  href="https://hairline.lucasmarkes.com/skill"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="italic underline decoration-line-strong decoration-1 underline-offset-[6px] transition-colors hover:decoration-ink"
                >
                  Hairline skill
                </a>{" "}
                by Lucas Markes.
              </p>
            </div>
            {/* a colophon, the way a printed book closes */}
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 border-l border-line pl-6 text-[13px] md:justify-self-end">
              <dt className="pt-0.5 font-mono text-[10px] tracking-[0.16em] text-muted uppercase">Drawn</dt>
              <dd>{animations.length} figures, one stroke each</dd>
              <dt className="pt-0.5 font-mono text-[10px] tracking-[0.16em] text-muted uppercase">Method</dt>
              <dd>
                <a
                  href="https://hairline.lucasmarkes.com/skill"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-ink"
                >
                  Hairline skill
                </a>
              </dd>
              <dt className="pt-0.5 font-mono text-[10px] tracking-[0.16em] text-muted uppercase">Type</dt>
              <dd>Instrument Serif, Geist</dd>
              <dt className="pt-0.5 font-mono text-[10px] tracking-[0.16em] text-muted uppercase">Studio</dt>
              <dd><a href="https://devsloka.in" target="_blank" rel="noopener noreferrer" className="underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-ink">devsloka.in</a></dd>
              <dt className="pt-0.5 font-mono text-[10px] tracking-[0.16em] text-muted uppercase">Products</dt>
              <dd className="flex flex-wrap gap-x-3 gap-y-1">
                <a href="https://ui.devsloka.in" target="_blank" rel="noopener noreferrer" className="underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-ink">ui.devsloka.in</a>
                <a href="https://ascii.devsloka.in" target="_blank" rel="noopener noreferrer" className="underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-ink">ascii.devsloka.in</a>
              </dd>
              <dt className="pt-0.5 font-mono text-[10px] tracking-[0.16em] text-muted uppercase">Portfolio</dt>
              <dd><a href="https://priyanshukr.com" target="_blank" rel="noopener noreferrer" className="underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-ink">priyanshukr.com</a></dd>
            </dl>
          </div>
          <Rule />
          <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-6 font-mono text-[10px] tracking-[0.16em] text-muted uppercase sm:px-8">
            <a href="https://devsloka.in" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-ink">© Devsloka · linework</a>
            <span>no fills · no colour · one stroke</span>
          </div>
        </footer>
        <Rule />
      </div>
    </main>
  );
}
