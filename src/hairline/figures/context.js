/**
 * Context: an AI's context window as a rectangular frame lying across a long
 * tape of token tiles. The tiles inside the frame stand up, unevenly, as the
 * text the model can see; the ones outside lie flat and dim. The pointer's x
 * slides the tape through the frame on a spring, and the newest token inside
 * takes the bright stroke. At rest the tape is partway through and the frame
 * is bright. The slider is the window's width, in world units.
 */
const {
  Cam, clamp, facing, fit, prism, proj, rings, unproj, spring, stepS,
  disposer, mk, pointer, put, register, solid,
} = HL;

/** Tape run, tile pitch, tile half-length and half-width, tape half-width, frame bar, frame inner half-width, tallest tile. */
const XA = 0, XB = 192, WC = (XA + XB) / 2, PT = 12, TL = 4.6, TY = 10, TW = 14, FB = 7, FY = 19, TH = 30, ZT = 1.6;
const NT = 64, SMIN = 14 * PT, SMAX = (NT - 14) * PT, REST = 23.4 * PT;

/** How tall token k stands when fully inside: uneven, as words are. */
const tall = (k) => TH * (0.5 + 0.5 * Math.abs(Math.sin(k * 2.39 + 0.7)));

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let W = value, over = false;
  const C = Cam(45, 0.5, 1.95);
  fit(C, [[XA - 6, -FY - FB, 0], [XB + 6, FY + FB, 0], [XB + 6, -FY - FB, 0], [XA - 6, FY + FB, 0], [WC, -FY, TH + ZT]], 200, 170);
  const P = proj(C), front = facing(C);
  const sp = spring(REST, { eps: 0.02 });

  const g = mk("g", {}, svg);
  // the tape, lying the whole run
  put(solid(g), prism(P, front, ...rings(XA - 6, -TW, XB + 6, TW, 4, 1.2), 0, ZT));
  // paint order, back to front: tiles before the frame, its far bar and side, tiles inside, its near side and bar, tiles past it
  const gBefore = mk("g", {}, g), farBar = solid(g), farSide = solid(g), gIn = mk("g", {}, g);
  const nearSide = solid(g), nearBar = solid(g), gAfter = mk("g", {}, g);
  const bars = [farBar, farSide, nearSide, nearBar], groups = [gBefore, gIn, gAfter];
  const tiles = [];
  for (let k = 0; k < NT; k++) tiles.push({ k, el: solid(gBefore), grp: 0, drawn: "" });

  function drawFrame() {
    const x0 = WC - W / 2, x1 = WC + W / 2, z = ZT + 3.4;
    put(farBar, prism(P, front, ...rings(x0 - FB, -FY - FB, x0, FY + FB, 2.4, 1), 0, z));
    put(farSide, prism(P, front, ...rings(x0 - 1, -FY - FB, x1 + 1, -FY, 2, 0.9), 0, z - 0.6));
    put(nearSide, prism(P, front, ...rings(x0 - 1, FY, x1 + 1, FY + FB, 2, 0.9), 0, z - 0.6));
    put(nearBar, prism(P, front, ...rings(x1, -FY - FB, x1 + FB, FY + FB, 2.4, 1), 0, z));
  }

  /** The newest token inside the window with the tape at s. */
  const newest = (s) => Math.floor((s + W / 2 - TL) / PT);

  function draw(s) {
    const act = over ? newest(sp.t) : -1;
    let moved = false;
    for (const t of tiles) {
      const xc = WC + t.k * PT - s, x0 = WC - W / 2, x1 = WC + W / 2;
      let a = Math.max(xc - TL, XA), b = Math.min(xc + TL, XB);
      // a tile passing under a bar is cut where the bar covers it, like a strip into a slot
      for (const [lo, hi] of [[x0 - FB, x0], [x1, x1 + FB]]) if (a < hi && b > lo) { if (xc < (lo + hi) / 2) b = Math.min(b, lo); else a = Math.max(a, hi); }
      if (b - a < 0.6) { if (t.drawn) { t.el.g.setAttribute("display", "none"); t.drawn = ""; } continue; }
      // inside the window the tile stands; across a bar it falls; outside it lies flat
      const f = clamp((W / 2 - Math.abs(xc - WC) + TL) / (2 * TL), 0, 1), h = ZT + 1.2 + (tall(t.k) - 1.2) * f;
      const grp = b <= x0 - FB + 0.01 ? 0 : a >= x1 + FB - 0.01 ? 2 : 1;
      const cls = t.k === act ? "sil hi" : f > 0.5 ? "sil" : "lo", id = [a, b, h, cls].join();
      if (grp !== t.grp) { t.grp = grp; moved = true; }
      if (id === t.drawn) continue;
      if (!t.drawn) t.el.g.removeAttribute("display");
      t.drawn = id;
      put(t.el, prism(P, front, ...rings(a, -TY, b, TY, Math.min(1.8, (b - a) / 2), Math.min(0.7, (b - a) / 3)), ZT, h));
      t.el.sil.setAttribute("class", cls);
    }
    if (moved) for (const t of tiles) groups[t.grp].append(t.el.g);
    bars.forEach((b) => b.sil.classList.toggle("hi", act < 0));
  }

  let drawn = NaN;
  const B = register(stage, (dt) => {
    const m = stepS(sp, dt);
    if (sp.x !== drawn) { drawn = sp.x; draw(sp.x); }
    return m;
  });
  bag.add(B.unregister);

  function retarget(p) {
    over = !!p;
    if (p) {
      const x = unproj(C, p[0], p[1], 0)[0];
      sp.t = SMIN + clamp((x - XA) / (XB - XA), 0, 1) * (SMAX - SMIN);
    } else sp.t = REST;
    read.textContent = over ? `token ${newest(sp.t)}` : "rest";
    drawn = NaN;
    B.wake();
  }

  bag.add(pointer(stage, { move: retarget, leave: () => retarget(null) }));
  bag.add(() => svg.replaceChildren());
  drawFrame();
  retarget(null);

  return {
    set: (v) => { W = v; drawFrame(); for (const t of tiles) t.drawn = t.drawn && "x"; drawn = NaN; B.wake(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "context",
  means: "A context window as a frame over a tape of tokens: the tokens inside stand up, and the pointer slides the tape through.",
  rules: [1, 3, 5, 8],
  range: [36, 60, 96],
  tour: [[123, 128], [288, 211], [206, 169], null],
  mount,
});
