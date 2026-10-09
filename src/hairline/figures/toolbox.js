/**
 * Toolbox: an open cantilever toolbox. A deep box and three trays stacked on
 * it, joined on the near end by pairs of parallel arms, so as the arms swing
 * over, each tray steps up and out past the one below, a staircase of trays.
 * Each tray holds a foam insert cut to its tools, flush with its rim: sockets
 * in a row, a screwdriver, a grid of bits; the box holds two long rods. The
 * pointer's height sets how far the box opens, on a spring. At rest it stands
 * a little open and the top arm's pivot is bright. The slider is the widest
 * the arms swing, in degrees.
 */
const {
  Cam, clamp, fit, facing, poly, prism, proj, rad, ringAt, rings, rrect,
  spring, stepS, disposer, mk, place, pointer, put, register, solid,
} = HL;

const W = 44, D = 40, BZ = 28, TH = 8, L = 24, B0 = Math.asin(TH / L) * 180 / Math.PI, REST = 0.55;
const ARMS = [4, 12], BMAX = 120;
/** How far one tray sits from the one below, past where it sits closed, with the arms at b degrees. */
const step = (b) => [L * (Math.cos(rad(b)) - Math.cos(rad(B0))), L * (Math.sin(rad(b)) - Math.sin(rad(B0)))];
/** Each frame's foam cut-outs, as rounded rectangles [u0, v0, u1, v1, r] in its own x and y, kept to the end the next tray leaves bare. */
const CUTS = [
  [[24, 7, 29, 34, 2.5], [33, 7, 38, 34, 2.5]],
  [[33, 6, 37, 10, 2], [32.5, 13, 37.5, 18, 2.5], [32, 21, 38, 27, 3], [31.5, 29.5, 38.5, 36.5, 3.5]],
  [[30, 4, 38, 18, 4], [33, 18, 35, 35, 1]],
  [0, 1, 2, 3, 4, 5, 6, 7].map((k) => { const u = 8 + (k % 4) * 8, v = 14 + Math.floor(k / 4) * 9; return [u, v, u + 4, v + 4, 1]; }),
];

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let bmax = value;
  const [mx, mz] = step(BMAX), [px, pz] = step(90);
  const C = Cam(45, 0.5, 2.2);
  // The figure is written in its profile's frame (x along the box, y through it); the world turns it a
  // quarter, so the trays step out towards the viewer's left and the arms face down to the right.
  const turn = ([x, y, z]) => [y, -x, z];
  fit(C, [[0, 0, 0], [W, D, 0], [W, 0, 0], [0, D, 0], [3 * mx, 0, BZ + 3 * (TH + mz)], [3 * px, 0, BZ + 3 * (TH + pz)], [3 * mx, D, BZ + 3 * TH + 2 * mz], [0, 0, BZ + 3 * TH]].map(turn), 200, 166);
  const P0 = proj(C), f0 = facing(C);
  const P = (x, y, z) => P0(y, -x, z), front = (q) => f0({ u: q.v, v: -q.u, nu: q.nv, nv: -q.nu });

  // Back to front, bottom to top: the box, then each tray, each with its foam; the arms on the near end last.
  const g = mk("g", {}, svg);
  const frames = [0, 1, 2, 3].map((j) => {
    const el = solid(g), foam = mk("path", { class: "nf lo" }, g), cut = mk("path", { class: "nf" }, g);
    return { j, el, foam, cut };
  });
  const arms = [1, 2, 3].map(() => ARMS.map(() => mk("path", {}, g)));
  const pin = mk("circle", { r: 1.5, class: "dot" }, g);
  const sp = spring(REST);
  let drawn = NaN;

  /** A bar in the near end's plane (y = D + 1) from a to b, each [x, z]. */
  function bar(a, b) {
    const dx = b[0] - a[0], dz = b[1] - a[1], n = Math.hypot(dx, dz), c = dx / n, s = dz / n;
    return poly(rrect(-2, -1.5, n + 2, 1.5, 1.5, 3).map((q) => P(a[0] + q.u * c - q.v * s, D + 1, a[1] + q.u * s + q.v * c)));
  }

  function draw(o) {
    if (o === drawn) return;
    drawn = o;
    const [dx, dz] = step(B0 + o * (bmax - B0));
    const org = (j) => [j * dx, j === 0 ? 0 : BZ + (j - 1) * TH + j * dz];
    frames.forEach((f) => {
      const [x, z0] = org(f.j), z1 = f.j === 0 ? BZ : z0 + TH;
      const [ro, ri] = rings(x, 0, x + W, D, f.j === 0 ? 4 : 3, 1.2);
      put(f.el, prism(P, front, ro, ri, z0, z1));
      f.foam.setAttribute("d", poly(ringAt(P, rrect(x + 2.5, 2.5, x + W - 2.5, D - 2.5, 2, 4), z1)));
      f.cut.setAttribute("d", CUTS[f.j].map(([u0, v0, u1, v1, r]) => poly(ringAt(P, rrect(x + u0, v0, x + u1, v1, r, 4), z1))).join(""));
    });
    // each arm joins frame j - 1 at mid-height to frame j, L along at the arm's angle
    arms.forEach((pair, k) => {
      const lo = org(k), hi = org(k + 1), zl = (k === 0 ? BZ : lo[1] + TH) - TH / 2;
      pair.forEach((el, i) => el.setAttribute("d", bar([lo[0] + ARMS[i], zl], [hi[0] + ARMS[i] + L * Math.cos(rad(B0)), hi[1] + TH / 2])));
    });
    const top = org(3);
    place(pin, P(top[0] + ARMS[1] + L * Math.cos(rad(B0)), D + 1, top[1] + TH / 2));
  }

  const B = register(stage, (dt) => { const m = stepS(sp, dt); draw(clamp(sp.x, 0, 1.05)); return m; });
  bag.add(B.unregister);

  // The pointer's height on the stage, read against fixed screen lines: nothing that moves is tested.
  const yLo = P(W, D, 0)[1], yHi = P(0, 0, BZ + 3 * TH)[1] - 70;
  function retarget(p) {
    sp.t = p ? clamp((yLo - p[1]) / (yLo - yHi), 0, 1) : REST;
    frames[3].el.sil.classList.toggle("hi", !!p);
    pin.setAttribute("class", p ? "dot off" : "dot");
    read.textContent = p ? `open ${Math.round(sp.t * 100)}%` : "rest";
    B.wake();
  }

  bag.add(pointer(stage, { move: retarget, leave: () => retarget(null) }));
  bag.add(() => svg.replaceChildren());
  retarget(null);

  return {
    set: (v) => { bmax = v; drawn = NaN; B.wake(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "toolbox",
  means: "A cantilever toolbox: the pointer's height swings its arms, and three trays of tools step up and out of the box.",
  rules: [3, 5, 8, 9],
  range: [80, 100, 120],
  tour: [[200, 60], [200, 280], [200, 170], null],
  mount,
});
