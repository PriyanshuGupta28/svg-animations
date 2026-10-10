/**
 * Convertible: a two-door roadster with a soft top. The top is a fan of four
 * bows pivoting on the body's sides behind the seats, the fabric stretched
 * between their bars. The pointer's x scrubs the fold: right is closed,
 * latched to the windscreen header; left is open, the bows stacked flat on the
 * tonneau. Each bow rides its own spring to a target staggered from the
 * leading bow back, so the fold ripples. At rest the top is part folded, the
 * leading bow standing up and bright. The slider is the stagger: how far the
 * last bow lags the first, as a share of the fold.
 */
const {
  Cam, clamp, facing, fillet, fit, hull, lerp, open, poly, prism, proj, rad, rings, rrect, run, seg,
  spring, stepS, disposer, mk, pointer, put, register, solid,
} = HL;

/** The car's length, half width, wheel radius, axles and belt; the top's half width and pivot; the pointer's span; the rest fold. */
const L = 100, HW = 20, WR = 7.2, AX = [19, 78], ZB = 15, TW = 16, PX = 38, PZ = 16, X0 = 120, X1 = 290, REST = 0.36;
/** Each bow: its arm from the pivot, and its angle closed and folded (degrees from forward, up through vertical to back). */
const BOWS = [[27, 22.8, 169], [18.9, 37.5, 172], [11.2, 80, 175], [12.4, 166, 178]];

/** The body's top line along its length: a flat deck, then the hood falling to the nose. */
const zt = (u) => (u < 72 ? ZB : lerp(ZB, 10.5, (u - 72) / (L - 72)));
/** A bow's bar at angle a, on side y: the world point of its top. */
const tip = (b, a, y) => [PX + b[0] * Math.cos(rad(a)), y, PZ + b[0] * Math.sin(rad(a))];

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let lag = value, f = null;
  const C = Cam(45, 0.5, 2.5);
  const reach = [0, 30, 60, 90, 120, 150, 170].map((a) => tip(BOWS[0], a, 0));
  fit(C, [[0, -HW, 0], [L, -HW, 0], [0, HW, 0], [L, HW, 0], [PX, -TW, PZ + 27], [PX, TW, PZ + 27], ...reach], 200, 166);
  const P = proj(C), front = facing(C), at = (pts) => pts.map((p) => P(...p));
  const circle = (cx, y, cz, r) => Array.from({ length: 24 }, (_, k) => [cx + r * Math.cos(k * Math.PI / 12), y, cz + r * Math.sin(k * Math.PI / 12)]);

  const g = mk("g", {}, svg);
  const tyre = (cx, yo, yi) => {
    mk("path", { class: "sil", d: poly(hull(at(circle(cx, yo, WR, WR).concat(circle(cx, yi, WR, WR))))) }, g);
    mk("path", { class: "nf", d: poly(at(circle(cx, yo, WR, WR * 0.62))) }, g);
    mk("path", { class: "nf lo", d: [0, 1, 2, 3, 4].map((k) => { const a = k * 1.2566 + 0.3; return seg(P(cx + 1.4 * Math.cos(a), yo, WR + 1.4 * Math.sin(a)), P(cx + 4.6 * Math.cos(a), yo, WR + 4.6 * Math.sin(a))); }).join("") }, g);
  };
  AX.forEach((cx) => tyre(cx, -HW + 0.5, -HW + 6));

  // the body: a low tub, its deck crease, the arches, the doors, the headlamps
  const foot = rrect(0, -HW, L, HW, 10, 5), bTop = rrect(2, -HW + 1.5, L - 2, HW - 1.5, 9, 5), bIn = rrect(3.5, -HW + 3, L - 3.5, HW - 3, 7.5, 5);
  put(solid(g), { sil: poly(hull(foot.map((q) => P(q.u, q.v, 3.5)).concat(bTop.map((q) => P(q.u, q.v, zt(q.u)))))), crease: open(run(bIn, front).map((q) => P(q.u, q.v, zt(q.u)))) });
  const flank = (u, z) => P(u, HW + 0.05, z);
  mk("path", { class: "nf lo", d: AX.map((cx) => open(at(circle(cx, HW, WR, WR + 2).filter((p) => p[2] > WR - 2.5)))).join("")
    + [44, 69].map((u) => seg(flank(u, 5), flank(u, ZB - 0.6))).join("") + seg(flank(47, 12), flank(51, 12)) }, g);
  mk("path", { class: "nf", d: [-1, 1].map((s) => poly(fillet([[-3.5, 8.6], [3.5, 9.4], [3.5, 10.6], [-3.5, 9.9]], [1, 0.6, 0.6, 1], 3).map(([y, z]) => P(L - 1.4 * (z - 4) / 7 + 0.2, s * (HW - 6.5) + y, z)))).join("") }, g);
  // the cockpit opening and the boot lid, cut in the deck
  mk("path", { class: "nf lo", d: poly(rrect(40, -HW + 4, 71, HW - 4, 5, 4).map((q) => P(q.u, q.v, ZB))) + poly(rrect(3, -HW + 4.5, 15, HW - 4.5, 4, 4).map((q) => P(q.u, q.v, ZB))) }, g);
  // the tonneau the top stows into
  const tonneau = solid(g);
  { const [r, i] = rings(17, -TW - 1, 39, TW + 1, 4, 1); put(tonneau, prism(P, front, r, i, ZB, ZB + 1.2)); }
  // the top's far legs, behind the seats; then the seats, the far one first, a back and a headrest each
  const farLeg = BOWS.map(() => mk("path", { class: "sil nf" }, g));
  const seats = mk("g", {}, g);
  for (const c of [-8.5, 8.5]) {
    { const [r, i] = rings(43, c - 5.5, 47, c + 5.5, 2, 0.8); put(solid(seats), prism(P, front, r, i, 12, 21.5)); }
    { const [r, i] = rings(44, c - 3, 46.5, c + 3, 1.2, 0.5); put(solid(seats), prism(P, front, r, i, 22.3, 25)); }
  }
  // the fabric between bars, the rails and the bars: over the seats while it covers them, behind once it has folded past
  const top = mk("g", {}, g);
  const cloth = BOWS.slice(1).map(() => mk("path", { class: "fo" }, top));
  const farRail = mk("path", { class: "nf lo" }, top);
  const bar = BOWS.map(() => mk("path", { class: "sil nf" }, top));
  const nearRail = mk("path", { class: "nf lo" }, top), nearLeg = BOWS.map(() => mk("path", { class: "sil nf" }, g));
  let over = true;

  // the windscreen: a sloped frame round its glass
  const ws = (k) => fillet([[-HW + 1.5 + k, 0], [-TW + k, 11.2 - k], [TW - k, 11.2 - k], [HW - 1.5 - k, 0]].map(([y, t], j) => [y, j % 3 ? t : t + k]), [1.5, 2, 2, 1.5], 3)
    .map(([y, t]) => [lerp(71, 63, t / 11.2), y, ZB + 0.3 + t]);
  const screen = mk("path", { class: "sil nf", d: poly(at(ws(0))) }, g);
  mk("path", { class: "nf lo", d: poly(at(ws(1.4))) }, g);
  AX.forEach((cx) => tyre(cx, HW + 0.4, HW - 5.5));

  /** A bow's U: up one leg, across its bar, down the other, its two top corners rounded. */
  function bowPath(b, a) {
    const p0 = [PX, -TW, PZ], t0 = tip(b, a, -TW), t1 = tip(b, a, TW), p1 = [PX, TW, PZ];
    const near = (p, q, d) => { const n = Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]); return p.map((v, k) => v + ((q[k] - v) * Math.min(d, n / 2)) / n); };
    const corner = (p, c, q) => { const a1 = near(c, p, 2.4), a2 = near(c, q, 2.4); return [0, 0.25, 0.5, 0.75, 1].map((s) => a1.map((v, k) => (1 - s) ** 2 * v + 2 * s * (1 - s) * c[k] + s * s * a2[k])); };
    return { far: at([p0, ...corner(p0, t0, t1).slice(0, 3)]), top: at([...corner(p0, t0, t1).slice(2), ...corner(t0, t1, p1).slice(0, 3)]), near: at([...corner(t0, t1, p1).slice(2), p1]) };
  }

  const sp = BOWS.map(() => spring(0, { eps: 0.002 }));
  let drawn = "";
  function draw() {
    const ang = BOWS.map((b, i) => lerp(b[1], b[2], clamp(sp[i].x, 0, 1.05)));
    const id = ang.map((a) => a.toFixed(2)).join();
    if (id === drawn) return;
    drawn = id;
    const paths = BOWS.map((b, i) => bowPath(b, ang[i]));
    paths.forEach((q, i) => { farLeg[i].setAttribute("d", open(q.far)); bar[i].setAttribute("d", open(q.top)); nearLeg[i].setAttribute("d", open(q.near)); });
    const tops = (y) => BOWS.map((b, i) => P(...tip(b, ang[i], y)));
    const tf = tops(-TW), tn = tops(TW);
    cloth.forEach((el, i) => el.setAttribute("d", poly([tf[i], tf[i + 1], tn[i + 1], tn[i]])));
    farRail.setAttribute("d", open(tf));
    nearRail.setAttribute("d", open(tn));
    const cover = BOWS.some((b, i) => tip(b, ang[i], 0)[0] > 43);
    if (cover !== over) { over = cover; if (cover) seats.after(top); else top.after(seats); }
  }

  const B = register(stage, (dt) => { let m = false; for (const s of sp) m = stepS(s, dt) || m; draw(); return m; });
  bag.add(B.unregister);

  function retarget() {
    const v = f === null ? REST : f, n = BOWS.length - 1;
    sp.forEach((s, i) => { s.t = clamp((v - (lag * i) / n) / (1 - lag), 0, 1); });
    // the bright: the leading bow at rest; under the pointer, the bow mid-fold, the windscreen once latched, the tonneau once stowed
    let hi = f === null ? 0 : -1;
    if (f !== null && v > 0 && v < 1) hi = sp.reduce((best, s, i) => (Math.abs(s.t - 0.5) < Math.abs(sp[best].t - 0.5) ? i : best), 0);
    BOWS.forEach((_, i) => [farLeg[i], bar[i], nearLeg[i]].forEach((el) => el.classList.toggle("hi", i === hi)));
    screen.classList.toggle("hi", f !== null && v <= 0);
    tonneau.sil.classList.toggle("hi", f !== null && v >= 1);
    read.textContent = f === null ? "rest" : v <= 0 ? "closed" : v >= 1 ? "open" : `roof ${Math.round(v * 100)}%`;
    B.wake();
  }

  bag.add(pointer(stage, { move: (p) => { f = clamp((X1 - p[0]) / (X1 - X0), 0, 1); retarget(); }, leave: () => { f = null; retarget(); } }));
  bag.add(() => svg.replaceChildren());
  retarget();
  sp.forEach((s) => { s.x = s.t; });
  draw();

  return {
    set: (v) => { lag = v; retarget(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "convertible",
  means: "A roadster's soft top: the pointer's x folds it back into the tonneau, bow by bow, each on its own spring, so the fold ripples.",
  rules: [2, 3, 5, 8],
  range: [0.15, 0.3, 0.45],
  tour: [[200, 200], [110, 200], [300, 200], null],
  mount,
});
