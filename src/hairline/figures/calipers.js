/**
 * Calipers: a test as a vernier caliper lying on the desk, measuring a small
 * machined block. A beam with its graduations, a fixed head with outside and
 * inside jaws, a slider carrying the other pair, a thumb wheel and the depth
 * rod that runs out of the beam's end as the jaws open. The pointer, put on
 * the ground, sets where the sliding jaw goes, on a spring; it stops at the
 * block and cannot close past it: the assertion. At rest the jaws stand a
 * little open and the block's measured face is bright. The slider is the
 * travel, in mm.
 */
const {
  Cam, clamp, facing, fillet, fit, open, poly, prism, proj, rings, circ, seg, unproj, spring, stepS,
  disposer, mk, pointer, put, register, solid,
} = HL;

const L = 100, T0 = 10, BW = 24.6, B0 = T0, B1 = T0 + BW, BY0 = 20, BY1 = 39, BH = 11;
const REST = B1 + 5, ZB = 3, ZS0 = 0.4, ZS1 = 5, ROD = 60;

/** The fixed part: head, beam, an outside jaw toward the viewer and a knife-edge inside jaw away from it. */
const FIXED = fillet(
  [[-8, -3], [4, -3], [8.5, -14], [T0, -14], [T0, 0], [L, 0], [L, 12], [T0, 12], [T0, 45], [6, 45], [2, 34], [-2, 16], [-8, 16]],
  [2.5, 1, 0.6, 0.4, 1, 1.5, 1.5, 1, 0.4, 0.8, 2, 2, 2.5],
);
/** The slider, at s = 0: its measuring faces lie on x = 0. */
const SLIDE = fillet(
  [[0, -14], [1.5, -14], [6, -3], [30, -3], [30, 16], [12, 16], [8, 34], [4, 45], [0, 45]],
  [0.4, 0.6, 1, 2.5, 2.5, 2, 2, 0.8, 0.4],
);

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let travel = value, over = null;

  const C = Cam(45, 0.5, 2.45);
  fit(C, [[-8, -14, 0], [L, -14, ZS1], [L + ROD, 7, 2], [-8, 45, 0], [T0 + ROD + 12, 45, 0], [B0, BY0, BH], [B1, BY0, BH]], 200, 166);
  const P = proj(C), front = facing(C);
  const flat = (pts, dx, z) => poly(pts.map(([x, y]) => P(x + dx, y, z)));
  /** A thin plate: its underside shows as the second line for its thickness. */
  const plate = (g) => ({ lo: mk("path", { class: "sil" }, g), up: mk("path", {}, g) });
  const setPlate = (pl, pts, dx, z0, z1) => { pl.lo.setAttribute("d", flat(pts, dx, z0)); pl.up.setAttribute("d", flat(pts, dx, z1)); };

  const g = mk("g", {}, svg);
  setPlate(plate(g), FIXED, 0, 0, ZB);
  // graduations along the beam's near edge: every 2 mm, long every 10; no digits
  let ticks = "";
  for (let x = T0 + 4; x <= L - 4; x += 2) ticks += seg(P(x, 12 - ((x - T0) % 10 === 0 ? 5 : 2.5), ZB), P(x, 11.4, ZB));
  mk("path", { d: ticks, class: "nf lo" }, g);
  mk("path", { d: seg(P(T0 + 2, 6, ZB), P(L - 3, 6, ZB)), class: "nf lo" }, g);

  // the block: a machined part with a bored hole; its measured face's edges take the bright stroke
  const blk = mk("g", {}, g);
  const [br, bi] = rings(B0, BY0, B1, BY1, 1.6, 1);
  put(solid(blk), prism(P, front, br, bi, 0, BH));
  const cx = (B0 + B1) / 2, cy = (BY0 + BY1) / 2;
  mk("path", { d: poly(circ(4.2, 24).map((q) => P(cx + q.u, cy + q.v, BH))), class: "nf lo" }, blk);
  mk("path", { d: open(circ(4.2, 24).filter((q) => q.v < 0.5 && q.u < 0.5).map((q) => P(cx + q.u, cy + q.v, BH - 2.2))), class: "nf lo" }, blk);
  const face = mk("path", { d: seg(P(B1, BY0 + 2, BH), P(B1, BY1 - 2, BH)) + seg(P(B1, BY0 + 2, 0), P(B1, BY1 - 2, 0)), class: "nf" }, blk);

  // the slider, its vernier, its thumb wheel; then the depth rod out of the beam's end
  const sg = mk("g", {}, g), sl = plate(sg), vern = mk("path", { class: "nf lo" }, sg);
  const wheel = solid(sg), knurl = mk("path", { class: "nf lo" }, sg);
  const rod = solid(g);
  const [wr, wi] = [circ(3.6, 20), circ(2.8, 20)];

  const sp = spring(REST, { eps: 0.02 });
  let drawn = NaN;
  function draw(s) {
    if (s === drawn) return;
    drawn = s;
    setPlate(sl, SLIDE, s, ZS0, ZS1);
    let v = "";
    for (let k = 0; k <= 10; k++) v += seg(P(s + 3 + k * 1.9, 12.6, ZS1), P(s + 3 + k * 1.9, k % 5 === 0 ? 15.4 : 14.2, ZS1));
    vern.setAttribute("d", v);
    const wx = s + 21, wy = 18.5;
    put(wheel, prism(P, front, wr.map((q) => ({ ...q, u: q.u + wx, v: q.v + wy })), wi.map((q) => ({ ...q, u: q.u + wx, v: q.v + wy })), 0.6, 5.6));
    let kn = "";
    for (let a = -1; a <= 3; a++) { const t = (a * Math.PI) / 7, x = wx + 3.6 * Math.cos(t), y = wy + 3.6 * Math.sin(t); kn += seg(P(x, y, 1.6), P(x, y, 4.6)); }
    knurl.setAttribute("d", kn);
    const [rr, ri] = rings(L - 2, 5, L + (s - T0), 7.2, 0.9, 0.4);
    put(rod, prism(P, front, rr, ri, 1, 2.4));
  }

  const B = register(stage, (dt) => { const m = stepS(sp, dt); draw(sp.x); return m; });
  bag.add(B.unregister);

  /** The jaw's target: the pointer's x on the ground, stopped by the block and by the travel. */
  function retarget() {
    sp.t = over ? clamp(over[0], B1, T0 + travel) : REST;
    const touch = !over || sp.t <= B1 + 0.05;
    face.classList.toggle("hi", touch);
    sl.lo.classList.toggle("hi", !touch);
    read.textContent = over ? `${(sp.t - T0).toFixed(1)} mm` : "rest";
    B.wake();
  }

  bag.add(pointer(stage, {
    move: (p) => { over = unproj(C, p[0], p[1], 0); retarget(); },
    leave: () => { over = null; retarget(); },
  }));
  bag.add(() => svg.replaceChildren());
  retarget();

  return {
    set: (v) => { travel = v; retarget(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "calipers",
  means: "A caliper measures a machined block: its jaw follows the pointer, and stops at the block, which it cannot close past.",
  rules: [1, 3, 4, 8],
  range: [36, 48, 60],
  tour: [[169, 185], [139, 170], [105, 153], null],
  mount,
});
