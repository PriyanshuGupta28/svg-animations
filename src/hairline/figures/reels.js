/**
 * Reels: a flatbed splicing bench. Two film packs lie on platters, wound on
 * cores round spindles: the left one full, the right one thin. The film runs
 * on edge from one to the other past a rolling guide, perforated along both
 * edges and ruled into frames. The pointer pushes the film: entering it, or
 * moving along it, adds speed; friction bleeds it, and when it is slow a
 * spring settles the film on a sprocket detent, a whole frame at the guide.
 * The packs turn, and the film winds from one onto the other, so the left one
 * thins as the right one fills. The frame at the guide is outlined bright.
 * The slider is the coast: the friction, per second.
 */
const {
  Cam, circ, clamp, facing, fit, open, proj, prism, unproj, seg, rings,
  spring, stepS, reducedMotion, disposer, mk, pointer, place, put, register, solid,
} = HL;

const FR = 12, FY = 63, GATE = 90, Z0 = 3.5, Z1 = 13.5, CORE = 9, AREA = 2.4;
const REELS = [{ c: [40, 34], r0: 24, dir: -1 }, { c: [140, 40], r0: 17, dir: 1 }];
const SMIN = -FR * Math.floor((17 ** 2 - 12 ** 2) / AREA / FR), SMAX = FR * Math.floor((24 ** 2 - 12 ** 2) / AREA / FR);
const CATCH = 14, VMAX = 160, PR = 30;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let F = value;

  const C = Cam(45, 0.5, 1.68);
  fit(C, [[-2, -2, -6], [182, 82, -6], [182, -2, -6], [-2, 82, -6], [40, 34, 20], [140, 40, 20]], 200, 166);
  const P = proj(C), front = facing(C);
  const at = (ring, [cx, cy]) => ring.map((q) => ({ ...q, u: q.u + cx, v: q.v + cy }));
  const radius = (r, s) => Math.sqrt(r.r0 ** 2 + r.dir * AREA * s);

  const g = mk("g", {}, svg);
  const [br, bi] = rings(-2, -2, 182, 82, 8, 2.2);
  put(solid(g), prism(P, front, br, bi, -6, 0));
  for (const r of REELS) {
    put(solid(g), prism(P, front, at(circ(PR, 48), r.c), at(circ(PR - 1.6, 48), r.c), 0, Z0));
    r.pack = solid(g);
    r.ink = mk("path", { class: "nf lo" }, g);
    put(solid(g), prism(P, front, at(circ(CORE, 24), r.c), at(circ(CORE - 1.4, 24), r.c), Z1, Z1 + 1.2));
    put(solid(g), prism(P, front, at(circ(3, 16), r.c), at(circ(2, 16), r.c), Z1 + 1.2, Z1 + 6));
  }
  // the rolling guide, just behind the film, and its turning mark
  const GC = [GATE, FY - 4.2];
  put(solid(g), prism(P, front, at(circ(4, 20), GC), at(circ(3, 20), GC), 0, Z1 + 3));
  const groll = mk("path", { class: "nf lo" }, g);
  // the film on edge, its frame rules, the frame at the guide, its perforations
  const film = mk("path", { class: "sil" }, g), rules = mk("path", { class: "nf lo" }, g), gate = mk("path", { class: "nf hi" }, g);
  const perfs = [];
  for (let k = 0; k < 40; k++) for (const z of [Z0 + 1.4, Z1 - 1.4]) perfs.push({ k, z, el: mk("circle", { r: 0.75, class: "dot off" }, g) });

  let s = 0, vel = 0, sp = null, drawn = NaN;
  function draw() {
    if (s === drawn) return;
    drawn = s;
    const rl = radius(REELS[0], s), rr = radius(REELS[1], s);
    const A = [40, 34 + rl], M = [GATE, FY], Z = [140, 40 + rr];
    const la = GATE - 40, lb = Math.hypot(50, Z[1] - FY);
    // a point t along the film from its left end, at height z
    const on = (t, z) => {
      const t0 = clamp(t, 0, la + lb), [p, q, f] = t0 < la ? [A, M, t0 / la] : [M, Z, (t0 - la) / lb];
      return P(p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f, z);
    };
    film.setAttribute("d", "M" + [on(0, Z0), on(la, Z0), on(la + lb, Z0), on(la + lb, Z1), on(la, Z1), on(0, Z1)].join("L") + "Z");
    const ph = ((s % FR) + FR) % FR;
    let d = "";
    for (let t = la - FR / 2 + ph - FR * 6; t < la + lb; t += FR) if (t > 0) d += seg(on(t, Z0), on(t, Z1));
    rules.setAttribute("d", d);
    // the frame whose middle is nearest the guide, outlined
    const g0 = la - FR / 2 + ph - (ph > FR / 2 ? FR : 0);
    gate.setAttribute("d", open([on(g0, Z0), on(g0 + FR / 2, Z0), on(g0 + FR, Z0), on(g0 + FR, Z1), on(g0 + FR / 2, Z1), on(g0, Z1), on(g0, Z0)]));
    const pp = ((s % 4) + 4) % 4;
    for (const p of perfs) place(p.el, on(Math.min(p.k * 4 + pp + 2, la + lb - 1), p.z));
    REELS.forEach((r, i) => {
      const rad = i ? rr : rl, a = s / rad * -r.dir;
      put(r.pack, prism(P, front, at(circ(rad, 40), r.c), at(circ(rad - 1.2, 40), r.c), Z0, Z1));
      let w = "";
      for (let k = CORE + 3; k < rad - 2; k += 3.5) w += "M" + circ(k, 28).map((q) => P(r.c[0] + q.u, r.c[1] + q.v, Z1)).join("L") + "Z";
      w += seg(P(r.c[0] + CORE * Math.cos(a), r.c[1] + CORE * Math.sin(a), Z1), P(r.c[0] + (rad - 1.2) * Math.cos(a), r.c[1] + (rad - 1.2) * Math.sin(a), Z1));
      r.ink.setAttribute("d", w);
    });
    const ga = s / 4;
    groll.setAttribute("d", seg(P(GC[0], GC[1], Z1 + 3), P(GC[0] + 3 * Math.cos(ga), GC[1] + 3 * Math.sin(ga), Z1 + 3)));
  }

  let over = false;
  const name = () => (read.textContent = over ? `frame ${41 + Math.round(s / FR)}` : "rest");

  /** A spring onto the next sprocket detent in the direction of travel, inside the film's two ends. */
  function catchIt(ahead) {
    const n = s / FR;
    sp = spring(s);
    sp.t = clamp(FR * (vel > 0 ? Math.ceil(n + ahead) : vel < 0 ? Math.floor(n - ahead) : Math.round(n)), SMIN, SMAX);
    vel = 0;
  }

  const B = register(stage, (dt) => {
    let m = false;
    if (vel !== 0) {
      if (reducedMotion()) { s = clamp(s + vel / F, SMIN, SMAX); catchIt(0); }
      else {
        s += vel * dt;
        vel *= Math.exp(-F * dt);
        // a pack running out stops the film
        if (s < SMIN || s > SMAX) { s = clamp(s, SMIN, SMAX); vel = 0; catchIt(0); }
        else if (Math.abs(vel) < CATCH) catchIt(0.15);
      }
      m = true;
    }
    if (sp) { m = stepS(sp, dt) || m; s = sp.x; if (!m) sp = null; }
    draw();
    if (over) name();
    return m;
  });
  bag.add(B.unregister);

  function push(dv) {
    sp = null;
    vel = clamp(vel + dv, -VMAX, VMAX);
    B.wake();
  }

  // The pointer meets the plane at the film's middle height, which never moves.
  let prev = null;
  bag.add(pointer(stage, {
    move: (p) => {
      const [u, v] = unproj(C, p[0], p[1], (Z0 + Z1) / 2);
      over = u > -10 && u < 190 && v > -10 && v < 90;
      if (!over) { prev = null; name(); return; }
      // entering throws the film away from the side it came in; moving along it drags it
      push(prev === null ? 150 * clamp((GATE - u) / 50, -1, 1) : 6 * (u - prev));
      prev = u;
      name();
    },
    leave: () => { over = false; prev = null; name(); },
  }));
  bag.add(() => svg.replaceChildren());
  draw();
  name();

  return {
    set: (v) => { F = v; },
    destroy: bag.dispose,
  };
}

hairline({
  name: "reels",
  means: "Film wound between two reels on a splicing bench: push it, friction slows it, and a sprocket detent stops it on a frame.",
  rules: [1, 3, 5, 8],
  range: [3.2, 1.6, 0.7],
  tour: [[110, 150], [240, 190], [300, 200], null],
  mount,
});
