/**
 * Speakerwall: a 3 × 3 stack of speaker cabinets. Each has on its front
 * a woofer (a surround, a cone and a dust cap) and a small tweeter
 * above it. The pointer is read on the plane of the front faces, which never
 * moves: the cone it passes pushes out, and its neighbours less, and each
 * relaxes back on its own decay, so a stroke leaves a ripple. At rest one
 * cone is still out, bright, with a fading tail beside it. The slider is the
 * afterglow, in seconds.
 */
const {
  Cam, facing, fit, hull, poly, prism, proj, rings, reducedMotion,
  mk, place, pointer, put, register, disposer, solid,
} = HL;

const COLS = 3, ROWS = 3, W = 50, H = 40, D = 20, GP = 1.5, RW = 16, RC = 6, OUT = 20;
const X1 = COLS * W, Z1 = ROWS * H, MARK = 5;
// the rest: one cone left out, and the two it last shook, fading
const REST = [0, 0, 0.18, 0, 0, 0.9, 0, 0, 0.4];

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let tau = value, over = -1;
  const C = Cam(45, 0.5, 1.5);
  fit(C, [[0, 0, 0], [X1, D + OUT, 0], [X1, 0, 0], [0, D + OUT, 0], [0, 0, Z1], [X1, D, Z1], [0, D, Z1]], 200, 166);
  const P = proj(C);
  const front = facing(C);
  /** A circle on a front face, centred (cx, cz), at depth y. */
  const disc = (cx, cz, r, y, n = 32) => Array.from({ length: n }, (_, j) => {
    const a = (j / n) * 2 * Math.PI;
    return P(cx + r * Math.cos(a), y, cz + r * Math.sin(a));
  });

  const g = mk("g", {}, svg), cabs = [];
  // back to front: column by column from the left, each from the bottom up
  for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
    const i = (ROWS - 1 - r) * COLS + c, x0 = c * W + GP, x1 = (c + 1) * W - GP, z0 = r * H + GP, z1 = (r + 1) * H - GP;
    const grp = mk("g", {}, g);
    const [br, bi] = rings(x0, 0, x1, D, 3, 1.2);
    const box = prism(P, front, br, bi, z0, z1);
    put(solid(grp), box);
    const wx = x0 + 19.5, wz = z0 + 18.5;
    mk("path", { class: "nf", d: poly(disc(wx, wz, RW + 1.2, D)) }, grp);
    // the tweeter, with its dome
    mk("path", { class: "nf", d: poly(disc(x1 - 7.5, z1 - 8, 3.6, D, 20)) }, grp);
    place(mk("circle", { r: 1.1, class: "dot off" }, grp), P(x1 - 7.5, D + 0.6, z1 - 8));
    const cone = mk("path", {}, grp), cap = mk("path", { class: "sil" }, grp);
    cabs[i] = { i, c, r, wx, wz, cone, cap, lev: REST[i], e: 0, drawn: NaN };
  }

  function draw(k) {
    const l = Math.round(k.lev * 200) / 200;
    if (l === k.drawn) return;
    k.drawn = l;
    const cp = disc(k.wx, k.wz, RC, D + 0.4 + OUT * l);
    k.cone.setAttribute("d", poly(hull(disc(k.wx, k.wz, RW, D).concat(cp))));
    k.cap.setAttribute("d", poly(cp));
  }
  cabs.forEach(draw);

  const B = register(stage, (dt) => {
    let m = false;
    const kd = reducedMotion() ? 0 : Math.exp(-dt / tau), ku = reducedMotion() ? 0 : Math.exp(-dt / 0.07);
    for (const k of cabs) {
      const t = Math.max(k.e, over < 0 ? REST[k.i] : 0);
      // a push lands fast; letting go fades on the afterglow
      k.lev = t + (k.lev - t) * (t > k.lev ? ku : kd);
      if (Math.abs(k.lev - t) < 0.004) k.lev = t; else m = true;
      draw(k);
    }
    return m;
  });
  bag.add(B.unregister);

  // the front faces' plane never moves: the pointer is read on it, as (x, z)
  const O = P(0, D, 0), eu = P(1, D, 0), ez = P(0, D, 1);
  const a = [eu[0] - O[0], eu[1] - O[1]], b = [ez[0] - O[0], ez[1] - O[1]], det = a[0] * b[1] - a[1] * b[0];
  function aim(p) {
    over = -1;
    if (p) {
      const x = ((p[0] - O[0]) * b[1] - (p[1] - O[1]) * b[0]) / det, z = (a[0] * (p[1] - O[1]) - a[1] * (p[0] - O[0])) / det;
      if (x >= 0 && x < X1 && z >= 0 && z < Z1) over = (ROWS - 1 - Math.floor(z / H)) * COLS + Math.floor(x / W);
    }
    for (const k of cabs) {
      if (over < 0) { k.e = 0; continue; }
      const o = cabs[over], d = Math.abs(k.c - o.c) + Math.abs(k.r - o.r);
      k.e = [1, 0.62, 0.34, 0.16, 0.08][d];
    }
    const lit = over < 0 ? MARK : over;
    cabs.forEach((k) => k.cap.classList.toggle("hi", k.i === lit));
    read.textContent = over < 0 ? "rest" : `cab ${cabs[over].c + 1}·${ROWS - cabs[over].r}`;
    B.wake();
  }

  bag.add(pointer(stage, { move: aim, leave: () => aim(null) }));
  bag.add(() => svg.replaceChildren());
  aim(null);

  return {
    set: (v) => { tau = v; },
    destroy: bag.dispose,
  };
}

hairline({
  name: "speakerwall",
  means: "A wall of speaker cabinets: the cones the pointer passes push out, and relax as the sound decays.",
  rules: [1, 4, 5, 7],
  range: [0.3, 0.9, 2.2],
  tour: [[195, 111], [142, 189], [248, 190], null],
  mount,
});
