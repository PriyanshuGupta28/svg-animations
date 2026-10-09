/**
 * Ringlight: a creator's ring light on a stand: a weighted round base, a
 * pole, the ring itself with a circle of LEDs set in its face, and a phone
 * clamped in the middle on a short stem. The pointer is read round the ring,
 * on the ring's own plane: the LEDs near the angle it points at light up, and
 * when it moves on they fade. Paint and decay. At rest a short arc is left
 * glowing at the top right, its head bright. The slider is the afterglow, in
 * seconds.
 */
const {
  Cam, circ, facing, fit, hull, open, poly, prism, proj, rad, rrect, reducedMotion,
  mk, place, pointer, put, register, disposer, solid,
} = HL;

const PHI = -35, RO = 62, RI = 47, RT = 3, ZC = 108, NL = 36, RL = (RO + RI) / 2;
const U = [Math.cos(rad(PHI)), Math.sin(rad(PHI))], N = [-U[1], U[0]];
const B3 = (u, n, z) => [u * U[0] + n * N[0], u * U[1] + n * N[1], z];
/** The rest arc: a head at the top right and a tail fading behind it. */
const REST = Array.from({ length: NL }, (_, i) => (i === 5 ? 1 : i >= 1 && i < 5 ? 0.3 + i * 0.07 : 0));
const cls = (l) => (l > 0.7 ? "dot" : l > 0.25 ? "dot m" : "dot off");

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let tau = value;
  const C = Cam(45, 0.5, 1.6);
  fit(C, [[-26, -26, 0], [26, 26, 0], [26, -26, 0], [-26, 26, 0], B3(-RO, 0, ZC), B3(RO, 0, ZC), B3(0, 0, ZC + RO), B3(0, -RT, ZC + RO)], 200, 166);
  const P = proj(C), front = facing(C);
  const at = (u, n, z) => P(...B3(u, n, z));
  /** A circle in the ring's plane at offset n, as screen points, from the top going clockwise. */
  const loop = (r, n, k = 72) => Array.from({ length: k }, (_, j) => {
    const a = rad(90 - (j / k) * 360);
    return at(r * Math.cos(a), n, ZC + r * Math.sin(a));
  });

  const g = mk("g", {}, svg);
  put(solid(g), prism(P, front, circ(26, 48), circ(24.4, 48), 0, 5));
  put(solid(g), prism(P, front, circ(2.8, 24), circ(1.8, 24), 5, ZC - RO + 2));

  // The ring: one solid, the hull of its two faces, with the front face's hole cut through it.
  const fo = loop(RO, RT), fi = loop(RI, RT), bi = loop(RI, -RT);
  const ring = solid(g);
  ring.sil.setAttribute("d", poly(hull(fo.concat(loop(RO, -RT)))) + poly(fi.slice().reverse()));
  ring.cr.setAttribute("d", poly(fo));
  // Through the hole, the ring's inner wall: the arc of the back's inner edge that the hole shows.
  const O = at(0, RT, ZC), eu = at(1, RT, ZC), ez = at(0, RT, ZC + 1);
  const a = [eu[0] - O[0], eu[1] - O[1]], b = [ez[0] - O[0], ez[1] - O[1]], det = a[0] * b[1] - a[1] * b[0];
  /** A screen point, as (u, z) on the ring's front face, about its centre. */
  const inv = ([x, y]) => [((x - O[0]) * b[1] - (y - O[1]) * b[0]) / det, (a[0] * (y - O[1]) - a[1] * (x - O[0])) / det];
  const seen = bi.map((q) => Math.hypot(...inv(q)) < RI);
  const s0 = seen.findIndex((v, j) => v && !seen[(j + bi.length - 1) % bi.length]);
  const wall = [];
  for (let j = 0; s0 >= 0 && j < bi.length && seen[(s0 + j) % bi.length]; j++) wall.push(bi[(s0 + j) % bi.length]);
  mk("path", { class: "nf lo", d: wall.length > 1 ? open(wall) : "" }, g);

  const leds = Array.from({ length: NL }, (_, i) => {
    const el = mk("circle", { r: (1.2 + 3.3 * REST[i]).toFixed(1), class: cls(REST[i]) }, g), ang = rad(90 - (i / NL) * 360);
    place(el, at(RL * Math.cos(ang), RT, ZC + RL * Math.sin(ang)));
    return { el, lev: REST[i], c: cls(REST[i]), r: (1.2 + 3.3 * REST[i]).toFixed(1), e: 0 };
  });

  // The phone, clamped on a stem standing up from the ring's inner edge.
  const flat = (pts, n) => poly(pts.map((q) => at(q.u, n, q.v)));
  mk("path", { d: flat(rrect(-2, ZC - RI - 1, 2, ZC - 20, 1.6, 3), RT + 2) }, g);
  mk("path", { class: "lo", d: flat(rrect(-12, ZC - 23, 12, ZC + 23, 3.5, 5), RT + 3) }, g);
  mk("path", { class: "sil", d: flat(rrect(-12, ZC - 23, 12, ZC + 23, 3.5, 5), RT + 5.5) }, g);
  mk("path", { class: "nf lo", d: flat(rrect(-10, ZC - 20, 10, ZC + 20, 2, 5), RT + 5.5) }, g);

  let over = false;
  const B = register(stage, (dt) => {
    let m = false;
    const k = reducedMotion() ? 0 : Math.exp(-dt / tau), k0 = reducedMotion() ? 0 : Math.exp(-dt / 0.15);
    for (let i = 0; i < NL; i++) {
      const d = leds[i], t = Math.max(d.e, over ? 0 : REST[i]);
      // what the pointer painted fades on the afterglow; what it did not, the rest arc, gives way at once
      if (d.e >= d.lev && d.e > 0.05) d.p = true;
      d.lev = d.e >= d.lev ? d.e : t + (d.lev - t) * (over && !d.p ? k0 : k);
      if (Math.abs(d.lev - t) < 0.01) { d.lev = t; if (!over) d.p = false; } else m = true;
      const c = cls(d.lev), rr = (1.2 + 3.3 * d.lev).toFixed(1);
      if (c !== d.c) { d.c = c; d.el.setAttribute("class", c); }
      if (rr !== d.r) { d.r = rr; d.el.setAttribute("r", rr); }
    }
    return m;
  });
  bag.add(B.unregister);

  function aim(p) {
    const q = p && inv(p), r = q ? Math.hypot(q[0], q[1]) : 0;
    over = !!q && r > RI * 0.5 && r < RO * 1.4;
    let near = 0;
    if (over) {
      const s = (((90 - (Math.atan2(q[1], q[0]) * 180) / Math.PI) / 360) * NL + NL) % NL;
      near = Math.round(s) % NL;
      leds.forEach((d, i) => { const x = Math.min(Math.abs(i - s), NL - Math.abs(i - s)); d.e = Math.exp(-((x / 3.4) ** 2)); });
    } else leds.forEach((d) => { d.e = 0; });
    read.textContent = over ? `led ${near + 1}` : "rest";
    B.wake();
  }

  bag.add(pointer(stage, { move: aim, leave: () => aim(null) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { tau = v; },
    destroy: bag.dispose,
  };
}

hairline({
  name: "ringlight",
  means: "A ring light on its stand: the LEDs nearest where the pointer aims round the ring light up, and fade as it moves on.",
  rules: [1, 4, 5, 7],
  range: [0.25, 0.8, 2],
  tour: [[114, 115], [199, 40], [262, 181], null],
  mount,
});
