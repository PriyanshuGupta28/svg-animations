import { readInstalls } from "@/lib/installs";

// read fresh, but let the CDN hold each answer for a minute
export const dynamic = "force-dynamic";

export async function GET() {
  const counts = await readInstalls().catch(() => null);
  const total = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : 0;
  return Response.json(
    { enabled: counts !== null, total, counts: counts ?? {} },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
  );
}
