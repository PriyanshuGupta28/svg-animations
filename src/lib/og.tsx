import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

export const ogSize = { width: 1200, height: 630 };

const font = (file: string) => readFile(join(process.cwd(), "src/app/fonts", file));

const PAPER = "#f5f4f0", INK = "#18181b", MUTED = "#71717a", LINE = "#d9d8d2";

/** An exploded stack of three rounded isometric plates, drawn in the figures' own single stroke. */
function Plates() {
  // one plate: a rounded rhombus top and its thickness, at height y
  const plate = (y: number, hi: boolean) => (
    <g key={y} fill={PAPER} stroke={hi ? INK : "#a4a4ac"} strokeWidth={hi ? 2.2 : 1.6} strokeLinejoin="round">
      <path d={`M40 ${y + 120} L200 ${y + 40} Q210 ${y + 35} 220 ${y + 40} L380 ${y + 120} Q390 ${y + 125} 380 ${y + 130} L220 ${y + 210} Q210 ${y + 215} 200 ${y + 210} L40 ${y + 130} Q30 ${y + 125} 40 ${y + 120} Z`} />
      <path d={`M32 ${y + 126} L32 ${y + 144} Q32 ${y + 149} 40 ${y + 153} L200 ${y + 233} Q210 ${y + 238} 220 ${y + 233} L380 ${y + 153} Q388 ${y + 149} 388 ${y + 144} L388 ${y + 126}`} fill="none" />
      <path d={`M80 ${y + 125} L210 ${y + 60} L340 ${y + 125} L210 ${y + 190} Z`} fill="none" stroke={LINE} strokeWidth={1.2} />
    </g>
  );
  return (
    <svg width="420" height="470" viewBox="0 0 420 470">
      {plate(200, false)}
      {plate(110, false)}
      {plate(20, true)}
    </svg>
  );
}

export async function renderOg({ eyebrow, title, italic, footer }: { eyebrow: string; title: string; italic: string; footer: string }) {
  const [serif, serifItalic, mono] = await Promise.all([
    font("InstrumentSerif-Regular.ttf"),
    font("InstrumentSerif-Italic.ttf"),
    font("GeistMono-Regular.ttf"),
  ]);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: PAPER,
          backgroundImage: "radial-gradient(#d4d3cd 1.4px, transparent 1.4px)",
          backgroundSize: "28px 28px",
          padding: "64px 72px",
          color: INK,
          fontFamily: "Serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 20 9 17V13l6-3V6l6-3" />
              <circle cx="21" cy="3" r="1.6" fill={INK} stroke="none" />
            </svg>
            <span style={{ fontSize: 34, fontStyle: "italic" }}>linework</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontFamily: "Mono", fontSize: 20, letterSpacing: 4, color: MUTED, textTransform: "uppercase", marginBottom: 24 }}>
              {eyebrow}
            </span>
            <span style={{ fontSize: 104, lineHeight: 0.95, letterSpacing: -2 }}>{title}</span>
            <span style={{ fontSize: 104, lineHeight: 0.95, letterSpacing: -2, fontStyle: "italic", color: MUTED }}>{italic}</span>
          </div>
          <span style={{ fontFamily: "Mono", fontSize: 18, letterSpacing: 3, color: MUTED, textTransform: "uppercase" }}>{footer}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center" }}>
          <Plates />
        </div>
      </div>
    ),
    {
      ...ogSize,
      fonts: [
        { name: "Serif", data: serif, weight: 400, style: "normal" },
        { name: "Serif", data: serifItalic, weight: 400, style: "italic" },
        { name: "Mono", data: mono, weight: 400, style: "normal" },
      ],
    },
  );
}
