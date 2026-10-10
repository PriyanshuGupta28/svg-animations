/**
 * Bento: a landing page's bento grid as a bento box lying on the desk. A
 * rounded tray with a thick rim, raised dividers cutting it into uneven
 * compartments, one wide, one tall, three small, and in each a rounded block
 * sitting on the floor. The pointer is carried onto the rim's plane, which
 * never moves; each block takes its height from its distance to it, on its own
 * spring, the far ones held at a floor, and the compartment under the pointer
 * is bright. The near wall is painted last, so it hides the blocks' feet. At
 * rest the blocks stand at uneven heights and the wide one is bright. The
 * slider is the radius, in world units.
 */
const {
  Cam, clamp, facing, fit, hull, open, poly, prism, proj, ringAt, rings, rrect, run, unproj,
  spring, stepS, disposer, mk, pointer, put, register, solid,
} = HL;

const W = 150, D = 110, WT = 5, WALL = 8, HMAX = 34, FLOOR = 3.5, IN = 3.2;
/** The compartments: their bounds (on divider centres or the inner wall), their name, their resting height. */
const CELLS = [
  [0, 0, 88, 58, "1·1", 23],
  [88, 0, 150, 58, "2·1", 10],
  [0, 58, 46, 110, "1·2", 15],
  [46, 58, 104, 110, "2·2", 5.5],
  [104, 58, 150, 110, "3·2", 18],
];
const DIVS = [[0, 57, 150, 59], [87, 0, 89, 57], [45, 59, 47, 110], [103, 59, 105, 110]];

/** The share of full height at u radii from the pointer: a bell from 1, held at a floor of .09, over the floor height. */
const falloff = (u) => Math.max(0.09, Math.exp(-1.6 * u * u));
/** Paint a before b when a lies wholly on the far side of b in x or y, and b not of a. */
const before = (a, b) => (a.x1 <= b.x0 || a.y1 <= b.y0) && !(b.x1 <= a.x0 || b.y1 <= a.y0);

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let R = value, over = null;
  const C = Cam(45, 0.5, 1.5);
  fit(C, [[-WT, -WT, 0], [W + WT, -WT, 0], [-WT, D + WT, 0], [W + WT, D + WT, 0], [IN, IN, HMAX], [W - IN, IN, HMAX], [IN, D - IN, HMAX]], 200, 166);
  const P = proj(C), front = facing(C);
  const at = (ring, z) => ringAt(P, ring, z);

  const g = mk("g", {}, svg);
  // the tray: its silhouette, the opening in the rim, and the floor's far edge seen through it
  const outer = rrect(-WT, -WT, W + WT, D + WT, 12, 14), inner = rrect(0, 0, W, D, 7, 14);
  mk("path", { class: "sil", d: poly(hull(at(outer, 0).concat(at(outer, WALL)))) }, g);
  mk("path", { d: poly(at(inner, WALL)) }, g);
  mk("path", { class: "nf lo", d: open(at(run(inner, (q) => !front(q)), 0)) }, g);

  // the contents, dividers and blocks, sorted so each is painted after everything behind it
  const items = DIVS.map(([x0, y0, x1, y1]) => ({ x0, y0, x1, y1, div: true }));
  for (const [cx0, cy0, cx1, cy1, name, h0] of CELLS) {
    const x0 = cx0 + IN, y0 = cy0 + IN, x1 = cx1 - IN, y1 = cy1 - IN;
    items.push({ x0, y0, x1, y1, cx0, cy0, cx1, cy1, name, h0, sp: spring(h0, { eps: 0.04 }), drawn: NaN });
  }
  const left = [...items];
  while (left.length) {
    const k = left.findIndex((a) => !left.some((b) => b !== a && before(b, a)));
    const it = left.splice(Math.max(0, k), 1)[0];
    it.el = solid(g);
    [it.ring, it.inner] = it.div ? rings(it.x0, it.y0, it.x1, it.y1, 1, 0.4) : rings(it.x0, it.y0, it.x1, it.y1, 4.5, 1.3);
    if (it.div) put(it.el, prism(P, front, it.ring, it.inner, 0, WALL));
  }
  const blocks = items.filter((it) => !it.div), mark = blocks[0];

  // the near wall, painted over the blocks' feet: filled, then its own edges
  const on = run(outer, front), ion = run(inner, front);
  const o0 = at(on, 0), oT = at(on, WALL), iT = at(ion, WALL);
  mk("path", { class: "fo", d: poly([...o0, oT[oT.length - 1], ...iT.reverse(), oT[0]]) }, g);
  mk("path", { class: "nf lo", d: open(oT) }, g);
  mk("path", { class: "nf", d: open(at(ion, WALL)) }, g);
  mk("path", { class: "sil nf", d: open([oT[0], ...o0, oT[oT.length - 1]]) }, g);

  function draw(b) {
    const h = clamp(b.sp.x, 1.5, HMAX);
    if (h === b.drawn) return;
    b.drawn = h;
    put(b.el, prism(P, front, b.ring, b.inner, 0, h));
  }

  const B = register(stage, (dt) => {
    let m = false;
    for (const b of blocks) { if (stepS(b.sp, dt)) m = true; draw(b); }
    return m;
  });
  bag.add(B.unregister);

  function retarget() {
    let pick = mark;
    for (const b of blocks) {
      if (!over) { b.sp.t = b.h0; continue; }
      const [x, y] = over, d = Math.hypot(Math.max(0, b.x0 - x, x - b.x1), Math.max(0, b.y0 - y, y - b.y1));
      b.sp.t = clamp(FLOOR + (HMAX - FLOOR) * falloff(d / R), FLOOR, HMAX);
      if (x >= b.cx0 && x <= b.cx1 && y >= b.cy0 && y <= b.cy1) pick = b;
    }
    blocks.forEach((b) => b.el.sil.classList.toggle("hi", b === pick));
    read.textContent = over ? `cell ${pick.name}` : "rest";
    B.wake();
  }

  // The pointer on the rim's plane, which never moves; off the tray it lets go.
  function move(p) {
    const q = unproj(C, p[0], p[1], WALL);
    over = q[0] > -WT && q[0] < W + WT && q[1] > -WT && q[1] < D + WT ? [clamp(q[0], 0, W), clamp(q[1], 0, D)] : null;
    retarget();
  }
  bag.add(pointer(stage, { move, leave: () => { over = null; retarget(); } }));
  bag.add(() => svg.replaceChildren());
  retarget();

  return {
    set: (v) => { R = v; if (over) retarget(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "bento",
  means: "A bento grid as a bento box: the blocks in the compartments near the pointer rise, the farther the less.",
  rules: [1, 3, 5, 6],
  range: [30, 50, 80],
  tour: [[274, 180], [224, 216], [114, 161], null],
  mount,
});
