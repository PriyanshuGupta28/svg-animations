/**
 * Catalog: the index as a card-catalog cabinet, three drawers across and four
 * high under an overhanging top. Each drawer front has a label holder over a
 * pull; a drawer drawn out shows the index cards standing in it. The pointer
 * picks a drawer on the cabinet's front, at rest; it slides out, and its
 * neighbours come out a little, staggered by distance on the 700ms lift curve.
 * At rest a few drawers are left ajar, one of them bright. The slider is the
 * stagger, in ms.
 */
const {
  Cam, facing, fit, prism, proj, rings, rrect, poly, seg, unproj,
  tween, tset, tval, tdone, disposer, mk, pointer, put, register, solid,
} = HL;

const COLS = 3, ROWS = 4, PX = 30, PZ = 19, DEP = 56, OUT = 30, NEAR = 6, FAR = 2;
const WX = COLS * PX + 4, HZ = ROWS * PZ + 4, YF = DEP + 2;
/** Drawers left ajar at rest, by index (row from the bottom × COLS + column); the brightest one is MARK. */
const AJAR = [0, 3, 0, 0, 0, 0, 0, 11, 0, 4, 0, 0], MARK = 7;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;

  const C = Cam(45, 0.5, 1.85);
  fit(C, [[-3, -3, -5], [WX + 3, -3, -5], [-3, YF + OUT, -5], [WX + 3, YF + OUT, -5], [-3, -3, HZ + 4], [WX + 3, YF + OUT, HZ]], 200, 166);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  const box = (x0, y0, x1, y1, r, b, z0, z1) => { const [o, i] = rings(x0, y0, x1, y1, r, b); put(solid(g), prism(P, front, o, i, z0, z1)); };
  box(-3, -3, WX + 3, YF + 1, 3, 1.4, -5, 0);
  box(0, 0, WX, DEP, 2, 1.2, 0, HZ);

  // Bottom row first, left to right in each: the higher and the more to the right is nearer.
  const drawers = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const i = r * COLS + c, x0 = 2 + c * PX + 1.5, z0 = 2 + r * PZ + 1.5;
    const el = solid(g), cards = mk("path", { class: "nf lo" }, el.g);
    const label = mk("path", { class: "nf lo" }, el.g), pull = mk("path", { class: "nf" }, el.g);
    drawers.push({ i, c, r, x0, x1: x0 + PX - 3, z0, z1: z0 + PZ - 3, el, cards, label, pull, out: tween(AJAR[i]), drawn: NaN });
  }
  box(-2.5, -2.5, WX + 2.5, YF + 1.5, 3, 1.4, HZ, HZ + 4);

  function draw(d, out) {
    if (out === d.drawn) return;
    d.drawn = out;
    const [o, inn] = rings(d.x0, DEP, d.x1, YF + out, 1.6, 0.9);
    put(d.el, prism(P, front, o, inn, d.z0, d.z1));
    const yf = YF + out, xm = (d.x0 + d.x1) / 2, zm = (d.z0 + d.z1) / 2;
    const onFront = (ring) => ring.map((q) => P(q.u, yf, q.v));
    d.label.setAttribute("d", poly(onFront(rrect(xm - 6.5, zm + 1, xm + 6.5, zm + 5.5, 1, 3))));
    d.pull.setAttribute("d", poly(onFront(rrect(xm - 4, zm - 4.5, xm + 4, zm - 2, 1.2, 3))));
    let cs = "";
    for (let y = YF + 3; y < yf - 2; y += 3.2) cs += seg(P(d.x0 + 2.4, y, d.z1 + 1.2), P(d.x1 - 2.4, y, d.z1 + 1.2));
    d.cards.setAttribute("d", cs);
  }

  const B = register(stage, (_dt, now) => {
    let m = false;
    for (const d of drawers) { draw(d, tval(d.out, now)); if (!tdone(d.out, now)) m = true; }
    return m;
  });
  bag.add(B.unregister);

  /** The drawer under the point on the cabinet's front plane, which never moves; -1 off it. */
  function hit(p) {
    const a = unproj(C, p[0], p[1], 0), b = unproj(C, p[0], p[1], 10);
    const z = (10 * (YF - a[1])) / (b[1] - a[1]), x = a[0] + ((b[0] - a[0]) * z) / 10;
    const c = Math.floor((x - 2) / PX), r = Math.floor((z - 2) / PZ);
    return c < 0 || c >= COLS || r < 0 || r >= ROWS ? -1 : r * COLS + c;
  }

  let act = null;
  function setActive(a) {
    if (a === act) return;
    const now = performance.now(), from = drawers[a >= 0 ? a : act ?? MARK];
    act = a;
    for (const d of drawers) {
      const dist = Math.hypot(d.c - from.c, d.r - from.r);
      const to = a < 0 ? AJAR[d.i] : d.i === a ? OUT : dist < 1.5 ? NEAR : dist < 2.5 ? FAR : 0;
      tset(d.out, to, now, dist * stag);
      d.el.sil.classList.toggle("hi", d.i === (a < 0 ? MARK : a));
    }
    read.textContent = a < 0 ? "rest" : `drawer ${drawers[a].c + 1}·${ROWS - drawers[a].r}`;
    B.wake();
  }

  bag.add(pointer(stage, { move: (p) => setActive(hit(p)), leave: () => setActive(-1) }));
  bag.add(() => svg.replaceChildren());
  setActive(-1);

  return {
    set: (v) => { stag = v; },
    destroy: bag.dispose,
  };
}

hairline({
  name: "catalog",
  means: "The index as a card catalog: the drawer under the pointer slides out on its cards, and its neighbours follow a little.",
  rules: [1, 2, 6, 8],
  range: [0, 45, 90],
  tour: [[219, 150], [141, 202], [180, 191], null],
  mount,
});
