import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

// Install counts. In production they live in one Redis hash (`installs`: slug -> count) over Upstash's
// REST API, with Upstash's own env names or the ones Vercel's marketplace integration sets.
// Without Redis, a local run (`dev`, `start`) keeps them in .installs.json so the counts work out of the
// box; on Vercel without Redis there is nowhere durable to write, so counting is off and the UI hides it.
const URL_ = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
const useRedis = Boolean(URL_ && TOKEN);
const useFile = !useRedis && !process.env.VERCEL;

export const installsEnabled = useRedis || useFile;

async function redis<T>(command: (string | number)[]): Promise<T | null> {
  const res = await fetch(URL_!, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!res.ok) return null;
  return ((await res.json()) as { result: T }).result;
}

// ponytail: local file store, read-modify-write with no lock; fine for one dev machine, Redis for real traffic
const FILE = join(process.cwd(), ".installs.json");
const readFileCounts = () =>
  readFile(FILE, "utf8").then((s) => JSON.parse(s) as Record<string, number>, () => ({}) as Record<string, number>);
const seenLocally = new Map<string, number>();

/**
 * Counts one install of `slug` by `who`. The shadcn CLI fetches an item more than once per install, so
 * the first fetch from an address marks it seen for two minutes and only that one is counted.
 */
export async function countInstall(slug: string, who: string) {
  const key = `seen:${who}:${slug}`;
  if (useRedis) {
    const first = await redis<string | null>(["SET", key, 1, "NX", "EX", 120]);
    if (first === "OK") await redis<number>(["HINCRBY", "installs", slug, 1]);
  } else if (useFile) {
    if ((seenLocally.get(key) ?? 0) > Date.now()) return;
    seenLocally.set(key, Date.now() + 120_000);
    const counts = await readFileCounts();
    counts[slug] = (counts[slug] ?? 0) + 1;
    await writeFile(FILE, JSON.stringify(counts, null, 2));
  }
}

/** Every figure's count, as { slug: count }; null when counting is off. */
export async function readInstalls(): Promise<Record<string, number> | null> {
  if (useFile) return readFileCounts();
  if (!useRedis) return null;
  // HGETALL comes back flat: [slug, count, slug, count, ...]
  const flat = await redis<string[]>(["HGETALL", "installs"]);
  if (!flat) return null;
  const counts: Record<string, number> = {};
  for (let i = 0; i < flat.length; i += 2) counts[flat[i]] = Number(flat[i + 1]);
  return counts;
}
