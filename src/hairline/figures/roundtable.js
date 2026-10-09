/**
 * Roundtable: a podcast table with four mics on short stands, set round a
 * small recorder in the middle, each mic's cable running across the table to
 * it. Each mic is a capsule with a grille of rings at its outer end, on a
 * weighted base, and each host's number is a row of dots on the table in
 * front of their mic. The pointer, read on the table's top, picks the nearest
 * mic, the one speaking: it rises and tilts up, its grille bright, while the
 * others dip a little, staggered by how far round the table they sit. At rest
 * the mics sit at uneven tilts and host 2's is bright. The slider is the
 * stagger, in ms.
 */
const {
  Cam, circ, fit, hull, open, poly, prism, proj, rad, rings, rrect, unproj, facing,
  tween, tset, tval, tdone, disposer, mk, flatDot, place, pointer, put, register, solid,
} = HL;

const N = 4, R = 64, TOP = 30, RM = 44, STEM = 14, LIFT = 9, UP = 48, DIP = -16, STAR = 1;
const REST = [6, 14, -2, 9];
const PHI = [0, 90, 180, 270];
const V = [0.612, 0.612, 0.5];
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
/** Two unit vectors square to the axis d. */
function frame(d) {
  const h = Math.hypot(d[0], d[1]) || 1, e1 = [-d[1] / h, d[0] / h, 0];
  return [e1, [d[1] * e1[2] - d[2] * e1[1], d[2] * e1[0] - d[0] * e1[2], d[0] * e1[1] - d[1] * e1[0]]];
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;
  const C = Cam(45, 0.5, 1.98);
  fit(C, [[-R, 0, 0], [R, 0, 0], [0, -R, TOP], [0, R, 0], [-RM, 0, TOP + STEM + LIFT + 18], [0, -RM, TOP + STEM + LIFT + 18]], 200, 170);
  const P = proj(C), front = facing(C);
  /** A ring round axis d through o, at t along it, radius r: world points from angle a0 over span. */
  const loop = (o, d, t, r, a0 = 0, span = 360, n = 22) => {
    const [e1, e2] = frame(d);
    return Array.from({ length: n + (span < 360 ? 1 : 0) }, (_, k) => {
      const a = rad(a0 + (span * k) / n), c = Math.cos(a) * r, s = Math.sin(a) * r;
      return P(o[0] + d[0] * t + e1[0] * c + e2[0] * s, o[1] + d[1] * t + e1[1] * c + e2[1] * s, o[2] + d[2] * t + e1[2] * c + e2[2] * s);
    });
  };
  /** The half of a ring that faces the viewer, as an open line. */
  const half = (o, d, t, r) => { const [e1, e2] = frame(d); return open(loop(o, d, t, r, (Math.atan2(dot3(e2, V), dot3(e1, V)) * 180) / Math.PI - 90, 180, 12)); };

  const g = mk("g", {}, svg);
  put(solid(g), prism(P, front, circ(26, 40), circ(24.5, 40), 0, 3));
  put(solid(g), prism(P, front, circ(6, 20), circ(5, 20), 3, TOP - 4));
  put(solid(g), prism(P, front, circ(R, 72), circ(R - 2.2, 72), TOP - 4, TOP));

  const home = (k, r) => [r * Math.cos(rad(PHI[k])), r * Math.sin(rad(PHI[k]))];
  // cables lie on the table, each swinging round from its mic's base to the recorder's side
  for (let k = 0; k < N; k++) {
    const [ax, ay] = home(k, RM), b = home(k, 13), c = home((k + 1) % N, RM * 0.55);
    const pts = Array.from({ length: 16 }, (_, j) => { const t = j / 15, u = 1 - t; return P(u * u * ax + 2 * u * t * c[0] + t * t * b[0], u * u * ay + 2 * u * t * c[1] + t * t * b[1], TOP + 0.3); });
    mk("path", { class: "nf lo", d: open(pts) }, g);
  }
  const mics = PHI.map((phi, k) => {
    const t = rad(phi + 90), [hx, hy] = home(k, RM + 16);
    const dots = Array.from({ length: k + 1 }, (_, j) => { const d = flatDot(g, C, 1.1, "dot off"), o = (j - k / 2) * 4; place(d, P(hx + o * Math.cos(t), hy + o * Math.sin(t), TOP)); return d; });
    return { k, dots, p: tween(REST[k]), z: tween(0), drawn: "" };
  });
  const order = [...mics.map((m) => { const [x, y] = home(m.k, RM); return [x + y, m]; }), [0, null]].sort((a, b) => a[0] - b[0]);
  for (const [, m] of order) {
    if (!m) { // the recorder: a low box with its screen and four input dots on top
      const [ro, ri] = rings(-13, -9, 13, 9, 3.5, 1.2);
      put(solid(g), prism(P, front, ro, ri, TOP, TOP + 6));
      mk("path", { class: "nf lo", d: poly(rrect(-9, -5.5, 2, 5.5, 1.5, 3).map((q) => P(q.u, q.v, TOP + 6))) }, g);
      [-3.5, 3.5].forEach((v) => [6, 9.5].forEach((u) => place(flatDot(g, C, 0.9, "dot m"), P(u, v, TOP + 6))));
      continue;
    }
    const [mx, my] = home(m.k, RM), base = solid(g);
    const [bo, bi] = [circ(6.5, 22).map((q) => ({ ...q, u: q.u + mx, v: q.v + my })), circ(5.3, 22).map((q) => ({ ...q, u: q.u + mx, v: q.v + my }))];
    put(base, prism(P, front, bo, bi, TOP, TOP + 2.5));
    m.stem = mk("path", {}, g); m.yoke = mk("path", { class: "nf" }, g); m.body = solid(g); m.grille = mk("path", { class: "nf lo" }, g);
  }

  function draw(m, pitch, lift) {
    const key = pitch + "," + lift;
    if (key === m.drawn) return;
    m.drawn = key;
    const [mx, my] = home(m.k, RM), o = [mx, my, TOP + 2.5 + STEM + lift], c = Math.cos(rad(pitch));
    const d = [Math.cos(rad(PHI[m.k])) * c, Math.sin(rad(PHI[m.k])) * c, Math.sin(rad(pitch))];
    m.stem.setAttribute("d", poly(hull(loop([mx, my, TOP + 2.5], [0, 0, 1], 0, 1.4, 0, 360, 10).concat(loop([o[0], o[1], o[2] - 8], [0, 0, 1], 0, 1.4, 0, 360, 10)))));
    const end = dot3(d, V) > 0 ? 14 : -10, [e1] = frame(d), Y = (s, z) => P(o[0] + e1[0] * s, o[1] + e1[1] * s, o[2] + z);
    m.yoke.setAttribute("d", open([Y(7.5, 0), Y(7.5, -8), Y(-7.5, -8), Y(-7.5, 0)]));
    put(m.body, { sil: poly(hull(loop(o, d, -10, 6.2).concat(loop(o, d, 14, 6.2)))), crease: poly(loop(o, d, end, 4.8)) });
    m.grille.setAttribute("d", [4, 7.3, 10.6].map((t) => half(o, d, t, 6.2)).join(""));
  }

  const B = register(stage, (_dt, now) => {
    let mv = false;
    for (const m of mics) { draw(m, tval(m.p, now), tval(m.z, now)); if (!tdone(m.p, now) || !tdone(m.z, now)) mv = true; }
    return mv;
  });
  bag.add(B.unregister);

  // hit test on the table's top, which never moves: the nearest mic's resting place
  function hit(p) {
    const [x, y] = unproj(C, p[0], p[1], TOP), r = Math.hypot(x, y);
    if (r < 15 || r > R + 12) return -1;
    let best = 0;
    mics.forEach((m) => { const [a, b] = home(m.k, RM), [c, e] = home(best, RM); if (Math.hypot(x - a, y - b) < Math.hypot(x - c, y - e)) best = m.k; });
    return best;
  }

  let act = null;
  function setActive(a) {
    if (a === act) return;
    const now = performance.now(), from = a >= 0 ? a : act ?? STAR;
    act = a;
    for (const m of mics) {
      const i = m.k, gap = Math.min(Math.abs(i - from), N - Math.abs(i - from)), on = a < 0 ? i === STAR : i === a;
      tset(m.p, a < 0 ? REST[i] : i === a ? UP : DIP, now, gap * stag);
      tset(m.z, i === a ? LIFT : 0, now, gap * stag);
      m.body.sil.classList.toggle("hi", on);
      m.grille.setAttribute("class", on ? "nf hi" : "nf lo");
      m.dots.forEach((el) => el.setAttribute("class", i === a ? "dot m" : "dot off"));
    }
    read.textContent = a < 0 ? "rest" : `host ${a + 1}`;
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
  name: "roundtable",
  means: "Four mics round a podcast table: the one nearest the pointer rises to speak, and the others dip in turn.",
  rules: [1, 2, 4, 10],
  range: [0, 60, 140],
  tour: [[262, 193], [138, 131], [262, 131], null],
  mount,
});
