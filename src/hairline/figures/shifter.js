/**
 * Shifter: a six-speed manual gear lever on its console. A trim plate holds
 * an H-pattern gate: a neutral rail across, three columns of two gears and
 * reverse out on the left, and a lever with a round knob rises through a
 * gaiter boot. The pointer picks a gear, tested against the gate ends on the
 * plate, which never move; the lever travels the gate path, back to neutral,
 * along the rail and out, on the 700ms tween. At rest it sits in second, that
 * gate bright. The slider is the travel time, in ms.
 */
const {
  Cam, circ, facing, fillet, fit, hull, open, poly, prism, proj, rings, run, unproj,
  tween, tset, tval, tdone, disposer, mk, pointer, put, register, solid,
} = HL;

/** The gate's columns across (a) and its depth forward (b); the slot's half width; the plate top; the knob's height and how far it swings per unit of gate. */
const A = [-19, -6.5, 6.5, 19], D = 11, SW = 2, ZP = 19.5, ZK = 56, AMP = 1.55, KR = 6.5;
/** The gears: reverse out on the left, then 1–2, 3–4, 5–6; each its gate end [a, b]. */
const GEARS = [["R", A[0], D], ["1", A[1], D], ["2", A[1], -D], ["3", A[2], D], ["4", A[2], -D], ["5", A[3], D], ["6", A[3], -D]];
const REST = 2;

/** Gate (a, b) to world: a runs across the console to the screen's right, b forward, away from the viewer. */
const W = (a, b) => [-b, -a];

/** The H as one closed outline, round at every gate end. */
function gate() {
  const [a0, a1, a2, a3] = A, s = SW;
  const pts = [[a0 - s, -s], [a0 - s, D], [a0 + s, D], [a0 + s, s]];
  for (const a of [a1, a2]) pts.push([a - s, s], [a - s, D], [a + s, D], [a + s, s]);
  pts.push([a3 - s, s], [a3 - s, D], [a3 + s, D], [a3 + s, -D], [a3 - s, -D], [a3 - s, -s]);
  for (const a of [a2, a1]) pts.push([a + s, -s], [a + s, -D], [a - s, -D], [a - s, -s]);
  const ends = new Set([1, 2, 5, 6, 9, 10, 13, 14, 15, 16, 19, 20, 23, 24]);
  return fillet(pts, pts.map((_, k) => (ends.has(k) ? s : 0.7)), 4);
}

/** The arc round one gate end, for its bright edge. */
const endArc = ([, a, b]) => {
  const g = Math.sign(b), out = [];
  for (let k = 0; k <= 10; k++) { const t = Math.PI * (1 - k / 10); out.push([a + SW * Math.cos(t), b - g * SW + g * SW * Math.sin(t)]); }
  return [[a - SW, b - g * 4], ...out, [a + SW, b - g * 4]];
};

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let dur = value;
  const C = Cam(45, 0.5, 2.3);
  fit(C, [[-30, -36, 0], [30, 36, 0], [-30, 36, 0], [30, -36, 0], [-D * AMP, A[0] * AMP, ZK + KR], [-D * AMP, A[3] * -AMP, ZK + KR], [D * AMP, A[3] * -AMP, ZK + KR]], 200, 170);
  const P = proj(C), front = facing(C);
  const at = (a, b, z) => P(...W(a, b), z);

  const g = mk("g", {}, svg);
  // the console: a rounded tunnel, its trim plate, the gate cut through it
  { const [r, i] = rings(-30, -36, 30, 36, 12, 2.2); put(solid(g), prism(P, front, r, i, 0, ZP - 2)); }
  { const [r, i] = rings(-20, -27, 20, 27, 6, 1.4); put(solid(g), prism(P, front, r, i, ZP - 2, ZP)); }
  mk("path", { d: poly(gate().map(([a, b]) => at(a, b, ZP))), class: "nf" }, g);
  const ends = GEARS.map((gr) => mk("path", { d: open(endArc(gr).map(([a, b]) => at(a, b, ZP))), class: "nf" }, g));

  // the lever: rod, boot, knob, painted in that order
  const rod = mk("path", { class: "sil" }, g), boot = solid(g), folds = mk("path", { class: "nf lo" }, g);
  const knob = mk("path", { class: "sil" }, g), band = mk("path", { class: "nf lo" }, g);
  const ring = (r, n) => circ(r, n);
  const disc = (a, b, z, r) => ring(r, 16).map((q) => { const [x, y] = W(a, b); return P(x + q.u, y + q.v, z); });
  const kr = Math.hypot(...[0, 1].map((k) => P(KR, 0, 0)[k] - P(0, 0, 0)[k]));
  const kRing = ring(KR, 24);

  function draw([a, b]) {
    const ka = a * AMP, kb = b * AMP, along = (t) => [a + (ka - a) * t, b + (kb - b) * t, ZP + (ZK - ZP) * t];
    rod.setAttribute("d", poly(hull(disc(a, b, ZP, 1.3).concat(disc(ka, kb, ZK, 1.3)))));
    const [ta, tb, tz] = along(0.28);
    put(boot, { sil: poly(hull(disc(a, b, ZP + 0.2, 5.2).concat(disc(ta, tb, tz, 2)))), crease: "" });
    folds.setAttribute("d", [0.09, 0.18].map((t) => { const [fa, fb, fz] = along(t); return open(disc(fa, fb, fz, 5.2 - (3.2 * t) / 0.28).slice(2, 11)); }).join(""));
    const c = at(ka, kb, ZK), pts = [];
    for (let k = 0; k < 28; k++) pts.push([c[0] + kr * Math.cos((k / 28) * 2 * Math.PI), c[1] + kr * Math.sin((k / 28) * 2 * Math.PI)]);
    knob.setAttribute("d", poly(pts));
    const [x, y] = W(ka, kb);
    band.setAttribute("d", open(run(kRing, front).map((q) => P(x + q.u, y + q.v, ZK - 1))));
  }

  // the path the lever takes: out of its gate to neutral, along the rail, into the new gate
  let pos = [GEARS[REST][1], GEARS[REST][2]], path = [pos, pos], tw = tween(1, dur), drawn = "";
  const walk = (t) => {
    const lens = path.slice(1).map((p, k) => Math.hypot(p[0] - path[k][0], p[1] - path[k][1])), total = lens.reduce((s, l) => s + l, 0);
    let d = t * total;
    for (let k = 0; k < lens.length; k++) {
      if (d <= lens[k] || k === lens.length - 1) { const f = lens[k] ? Math.min(1, d / lens[k]) : 1; return [path[k][0] + (path[k + 1][0] - path[k][0]) * f, path[k][1] + (path[k + 1][1] - path[k][1]) * f]; }
      d -= lens[k];
    }
    return path[path.length - 1];
  };

  const B = register(stage, (_dt, now) => {
    pos = walk(tval(tw, now));
    const id = pos.join();
    if (id !== drawn) { drawn = id; draw(pos); }
    return !tdone(tw, now);
  });
  bag.add(B.unregister);

  let act = -1;
  function choose(i) {
    if (i === act) return;
    act = i;
    const gi = i < 0 ? REST : i, [, ga, gb] = GEARS[gi];
    path = [pos, [pos[0], 0], [ga, 0], [ga, gb]];
    tw = tween(0, dur);
    tset(tw, 1, performance.now(), 0);
    ends.forEach((e, k) => e.classList.toggle("hi", k === gi));
    read.textContent = i < 0 ? "rest" : GEARS[i][0] === "R" ? "R" : `gear ${GEARS[i][0]}`;
    B.wake();
  }

  /** The gear whose gate end on the plate is nearest the pointer, within reach; -1 for none. */
  function hit([sx, sy]) {
    const [x, y] = unproj(C, sx, sy, ZP), a = -y, b = -x;
    let best = -1, bd = 13;
    GEARS.forEach(([, ga, gb], k) => { const d = Math.hypot(a - ga, b - gb); if (d < bd) { bd = d; best = k; } });
    return best;
  }

  bag.add(pointer(stage, { move: (p) => choose(hit(p)), leave: () => choose(-1) }));
  bag.add(() => svg.replaceChildren());
  choose(-1);

  return {
    set: (v) => { dur = v; },
    destroy: bag.dispose,
  };
}

hairline({
  name: "shifter",
  means: "A six-speed gear lever: the gear under the pointer is picked, and the lever travels the H gate to it through neutral.",
  rules: [1, 4, 8, 10],
  range: [400, 700, 1000],
  tour: [[200, 150], [240, 170], [160, 170], null],
  mount,
});
