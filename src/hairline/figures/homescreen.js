/**
 * Home Screen: a phone lying flat on the desk, a thick rounded slab with its
 * side buttons and a port in its bottom edge, a pill cut-out at the top of the
 * glass, a 4 × 5 grid of rounded app tiles and a dock of four. The pointer is
 * carried onto the glass (which never moves), and every tile takes its height
 * from its distance to it, on its own spring, the far ones held at a floor. At
 * rest the tiles swell toward one corner, as in edit mode, and the tallest is
 * bright. The slider is the radius, in tile pitches.
 */
const {
  Cam, clamp, facing, fit, hull, open, poly, prism, proj, ringAt, rings, rrect, run, seg, unproj,
  spring, stepS, disposer, mk, pointer, put, register, solid,
} = HL;

const W = 66, L = 132, ZG = 7, T = 11, PX = 14.5, PY = 15, COLS = 4, ROWS = 5, HMAX = 20;
const MX = (W - (COLS - 1) * PX - T) / 2, TOP = 18, DOCK = 107.5;

/** The share of full height at u radii from the pointer: a bell from 1, held at a floor of .09 from the edge on. */
const falloff = (u) => Math.max(0.09, Math.exp(-2.4 * u * u));

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let R = value * PX, over = null;
  const C = Cam(45, 0.5, 2.15);
  fit(C, [[0, 0, 0], [W + 2, 0, 0], [0, L, 0], [W + 2, L, 0], [MX, TOP, ZG + HMAX], [W - MX, TOP, ZG + HMAX]], 200, 166);
  const P = proj(C), front = facing(C);
  const flat = (ring, z) => poly(ringAt(P, ring, z));

  const g = mk("g", {}, svg);
  // The slab: a large round, so its rings are built with more steps.
  const body = rrect(0, 0, W, L, 11, 14), bodyIn = rrect(1.6, 1.6, W - 1.6, L - 1.6, 9.4, 14);
  const sil = poly(hull(ringAt(P, body, 0).concat(ringAt(P, body, ZG))));
  put(solid(g), { sil, crease: open(ringAt(P, run(bodyIn, front), ZG)) });
  // the glass's edge, the pill cut-out, the dock's tray and the home bar, all on the glass
  mk("path", { class: "nf lo", d: flat(rrect(3.2, 3.2, W - 3.2, L - 3.2, 8, 14), ZG) }, g);
  mk("path", { class: "nf", d: flat(rrect(W / 2 - 10, 6, W / 2 + 10, 11, 2.5, 4), ZG) }, g);
  mk("path", { class: "nf lo", d: flat(rrect(MX - 2.5, DOCK - 3, W - MX + 2.5, DOCK + T + 3, 5, 6), ZG) }, g);
  mk("path", { class: "nf lo", d: seg(P(W / 2 - 9, L - 6, ZG), P(W / 2 + 9, L - 6, ZG)) }, g);
  // the port in the bottom edge, and the buttons standing off the right side
  mk("path", { class: "nf lo", d: poly(rrect(W / 2 - 5, 2.4, W / 2 + 5, 4.6, 1.1, 3).map((q) => P(q.u, L, q.v))) }, g);
  for (const [y0, y1] of [[30, 44], [52, 60], [63, 71]]) {
    const [br, bi] = rings(W - 1, y0, W + 1.6, y1, 1.2, 0.4);
    put(solid(g), prism(P, front, br, bi, 2.2, 4.8));
  }

  const tiles = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const h0 = 1.2 + 9 * Math.exp(-((c - 0.2) ** 2 + (r - 0.9) ** 2) / 3.2) + 0.7 * ((c * 2 + r) % 3) / 2;
    tiles.push({ c, r, name: `app ${c + 1}·${r + 1}`, x: MX + c * PX, y: TOP + r * PY, h0 });
  }
  for (let c = 0; c < COLS; c++) tiles.push({ c, r: ROWS, name: `dock ${c + 1}`, x: MX + c * PX, y: DOCK, h0: 1.2 + 0.5 * (c % 2) });
  // back to front: ascending x + y
  tiles.sort((a, b) => a.x + a.y - (b.x + b.y));
  for (const t of tiles) {
    [t.ring, t.inner] = rings(t.x, t.y, t.x + T, t.y + T, 3, 1);
    t.sp = spring(t.h0, { eps: 0.04 }); t.el = solid(g); t.drawn = NaN;
  }
  const peak = tiles.reduce((a, b) => (b.h0 > a.h0 ? b : a));
  let lit = null;

  function draw(t) {
    const h = clamp(t.sp.x, 0.8, HMAX);
    if (h === t.drawn) return;
    t.drawn = h;
    put(t.el, prism(P, front, t.ring, t.inner, ZG, ZG + h));
  }
  function light(t) {
    if (t === lit) return;
    if (lit) lit.el.sil.classList.remove("hi");
    lit = t; lit.el.sil.classList.add("hi");
  }

  const B = register(stage, (dt) => {
    let m = false;
    for (const t of tiles) { if (stepS(t.sp, dt)) m = true; draw(t); }
    return m;
  });
  bag.add(B.unregister);

  function retarget() {
    let near = peak, nd = Infinity;
    for (const t of tiles) {
      if (!over) { t.sp.t = t.h0; continue; }
      const d = Math.hypot(t.x + T / 2 - over[0], t.y + T / 2 - over[1]);
      t.sp.t = clamp(HMAX * falloff(d / R), 0.8, HMAX);
      if (d < nd) { nd = d; near = t; }
    }
    light(near);
    read.textContent = over ? near.name : "rest";
    B.wake();
  }

  // The pointer on the glass's plane, which never moves; off the phone it lets go.
  function move(p) {
    const q = unproj(C, p[0], p[1], ZG);
    over = q[0] > -4 && q[0] < W + 4 && q[1] > -4 && q[1] < L + 4 ? q : null;
    retarget();
  }
  bag.add(pointer(stage, { move, leave: () => { over = null; retarget(); } }));
  bag.add(() => svg.replaceChildren());
  retarget();

  return {
    set: (v) => { R = v * PX; if (over) retarget(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "homescreen",
  means: "A phone's home screen: the app tiles near the pointer rise off the glass, the farther the less.",
  rules: [1, 3, 5, 9],
  range: [1, 2, 3.5],
  tour: [[206, 150], [273, 160], [160, 217], null],
  mount,
});
