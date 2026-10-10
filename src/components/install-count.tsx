"use client";

import { useEffect, useState } from "react";

type Installs = { enabled: boolean; total: number; counts: Record<string, number> };

// one request per page, however many counts it shows
let pending: Promise<Installs | null> | null = null;
const load = () => (pending ??= fetch("/api/installs").then((r) => (r.ok ? r.json() : null), () => null));

/** The install counts, fetched once per page and shared by every caller; null until they arrive. */
export function useInstalls() {
  const [data, setData] = useState<Installs | null>(null);
  useEffect(() => {
    let live = true;
    load().then((d) => live && setData(d));
    return () => {
      live = false;
    };
  }, []);
  return data;
}

const format = (n: number) => new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);

/** "128 installs" for one figure, or the total when no slug is given. Shows 0 until counts arrive, or when counting is off. */
export function InstallCount({
  slug,
  prefix = "",
  suffix = "",
  className = "",
  numberClassName = "",
}: {
  slug?: string;
  prefix?: string;
  suffix?: string;
  className?: string;
  /** Styles just the number, to set it apart from the words round it. */
  numberClassName?: string;
}) {
  const data = useInstalls();
  const n = !data ? 0 : slug ? (data.counts[slug] ?? 0) : data.total;
  return (
    <span className={className}>
      {prefix}
      <span className={numberClassName}>{format(n)}</span> {n === 1 ? "install" : "installs"}
      {suffix}
    </span>
  );
}
