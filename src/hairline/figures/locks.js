/**
 * Locks: a CI/CD pipeline as a flight of four canal locks stepping down, each
 * a long stone basin holding water, closed at its lower end by a pair of mitre
 * gates, with a barge (the build) riding in one of them. The pointer picks a
 * lock, tested on each lock's own resting rim; the pipeline runs to it: every
 * lock up to it opens its gates and drops its water to the next level, the
 * rest close and fill, staggered outwards from the pointer on the 700ms tween,
 * and the barge moves down to it. At rest the run has stopped in lock 2, gates
 * half open and bright. The slider is the stagger, in ms.
 */
const {
  Cam, clamp, facing, fit, hull, lerp, open, poly, prism, proj, rad, ringAt, rings, rrect, run, seg, unproj,
  tween, tset, tval, tdone, disposer, mk, pointer, put, register, solid,
} = HL;

const N = 4, L = 48, GX = 2.5, BW = 34, ST = 9, WT = 3, LOW = 13, MITRE = 22;
const REST_T = [0, 0.45, 0, 0], REST_W = [0, 0.5, 0, 0], MARK = 1;
const X = N * L + (N - 1) * GX, PITCH = L + GX, CY = BW / 2;

/** A run of points ordered left to right on screen. */
const LR = (pts) => (pts[0][0] <= pts[pts.length - 1][0] ? pts : pts.slice().reverse());

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;
  const R0 = LOW + (N - 1) * ST;
  const C = Cam(45, 0.5, 1.7);
  fit(C, [[0, 0, 0], [X, BW, 0], [X, 0, 0], [0, BW, 0], [0, 0, R0 + 4], [L, 0, R0 + 6]], 200, 166);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg), locks = [];
  for (let i = 0; i < N; i++) {
    const x0 = i * PITCH, x1 = x0 + L, rim = LOW + (N - 1 - i) * ST;
    const outer = rrect(x0, 0, x1, BW, 5, 6), inner = rrect(x0 + WT, WT, x1 - WT, BW - WT, 2.5, 6);
    // far half: the block, the rim's inner edge; then the water and the gates; then the near wall over them
    mk("path", { d: poly(hull(ringAt(P, outer, 0).concat(ringAt(P, outer, rim)))), class: "sil" }, g);
    mk("path", { d: poly(ringAt(P, inner, rim)), class: "nf" }, g);
    const water = mk("path", { class: "lo" }, g), ripple = mk("path", { class: "nf lo" }, g);
    const leaves = [mk("path", { class: "sil" }, g), mk("path", { class: "sil" }, g)];
    const iF = LR(ringAt(P, run(inner, front), rim)), oT = LR(ringAt(P, run(outer, front), rim)), oB = LR(ringAt(P, run(outer, front), 0));
    const wall = mk("path", { d: poly([...iF, oT[oT.length - 1], ...oB.slice().reverse(), oT[0]]), class: "fo" }, g);
    mk("path", { d: open(oT), class: "nf lo" }, g);
    mk("path", { d: open(iF), class: "nf" }, g);
    mk("path", { d: open([oT[0], ...oB, oT[oT.length - 1]]), class: "nf sil" }, g);
    locks.push({ i, x0, x1, rim, inner, water, ripple, leaves, wall, gate: tween(REST_T[i]), lvl: tween(REST_W[i]), drawn: "" });
  }
  const level = (k, now) => lerp(k.rim - 1.5, k.rim - 1.5 - ST, tval(k.lvl, now));

  function drawLock(k, t, wz) {
    const key = t + "," + wz;
    if (key === k.drawn) return;
    k.drawn = key;
    const top = k.rim + 6, x = k.x0 + WT;
    k.water.setAttribute("d", poly(ringAt(P, k.inner, wz)));
    // two ripples near the far wall, where the water shows at any level
    k.ripple.setAttribute("d", seg(P(x + 22, WT + 2.5, wz), P(x + 32, WT + 2.5, wz)) + seg(P(x + 27, WT + 5, wz), P(x + 36, WT + 5, wz)) + seg(P(x + 6, WT + 4, wz), P(x + 14, WT + 4, wz)));
    // Two mitre leaves hinged on the walls at the lower end: closed they meet in a V pointing upstream, open they lie along the walls.
    const xg = k.x1 - WT - 0.8, half = BW / 2 - WT, phi = rad(lerp(MITRE, 90, t)), len = half / Math.cos(rad(MITRE));
    [[WT, 1], [BW - WT, -1]].forEach(([yh, s], j) => {
      const tip = [xg - len * Math.sin(phi), yh + s * len * Math.cos(phi)];
      k.leaves[j].setAttribute("d", poly([P(xg, yh, wz), P(tip[0], tip[1], wz), P(tip[0], tip[1], top), P(xg, yh, top)]));
    });
  }

  // The barge: a hull wider at the deck than at the keel, and a cabin aft. It is painted inside
  // whichever lock it floats in, before that lock's near wall, so the wall hides its waterline.
  const boat = { g: mk("g", {}, g), pos: tween(MARK), drawn: NaN, lock: -1 };
  const hullEl = solid(boat.g), cabin = solid(boat.g);
  function drawBoat(now) {
    const p = tval(boat.pos, now), j = clamp(Math.round(p), 0, N - 1), k = locks[j];
    const wz = lerp(level(locks[Math.floor(p)], now), level(locks[Math.ceil(p)], now), p - Math.floor(p));
    const key = p + "," + wz;
    if (key === boat.drawn) return;
    boat.drawn = key;
    if (j !== boat.lock) { boat.lock = j; k.wall.before(boat.g); }
    const bx = p * PITCH + L / 2 - 4, z0 = wz - 3, z1 = wz + 3.5;
    const foot = rrect(bx - 15, CY - 5, bx + 15, CY + 5, 4.5, 4), top = rrect(bx - 18, CY - 7.5, bx + 18, CY + 7.5, 7, 4);
    const inner = rrect(bx - 17, CY - 6.5, bx + 17, CY + 6.5, 6, 4);
    put(hullEl, { sil: poly(hull(ringAt(P, foot, z0).concat(ringAt(P, top, z1)))), crease: open(ringAt(P, run(inner, front), z1)) });
    const [cr, ci] = rings(bx - 13, CY - 5, bx - 1, CY + 5, 3, 0.9);
    put(cabin, prism(P, front, cr, ci, z1, z1 + 5.5));
  }

  const B = register(stage, (_dt, now) => {
    let m = !tdone(boat.pos, now);
    for (const k of locks) { drawLock(k, tval(k.gate, now), level(k, now)); if (!tdone(k.gate, now) || !tdone(k.lvl, now)) m = true; }
    drawBoat(now);
    return m;
  });
  bag.add(B.unregister);

  /** The lock whose resting rim, unprojected at its own height, holds the pointer nearest its middle; -1 for none. */
  function hit([sx, sy]) {
    let best = -1, bd = Infinity;
    for (const k of locks) {
      const [x, y] = unproj(C, sx, sy, k.rim);
      if (x < k.x0 - GX / 2 || x > k.x1 + GX / 2 || y < -4 || y > BW + 4) continue;
      const d = Math.abs(x - (k.x0 + k.x1) / 2);
      if (d < bd) { bd = d; best = k.i; }
    }
    return best;
  }

  let act = null;
  function setActive(a) {
    if (a === act) return;
    const now = performance.now(), from = a >= 0 ? a : act >= 0 ? act : MARK;
    act = a;
    for (const k of locks) {
      const delay = Math.abs(k.i - from) * stag, on = k.i <= a;
      tset(k.gate, a < 0 ? REST_T[k.i] : on ? 1 : 0, now, delay);
      tset(k.lvl, a < 0 ? REST_W[k.i] : on ? 1 : 0, now, delay);
      for (const el of k.leaves) el.classList.toggle("hi", k.i === (a < 0 ? MARK : a));
    }
    tset(boat.pos, a < 0 ? MARK : a, now, 0);
    read.textContent = a < 0 ? "rest" : `lock ${a + 1}`;
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
  name: "locks",
  means: "A pipeline as a flight of canal locks: up to the lock under the pointer, gates open and the water steps down.",
  rules: [1, 2, 5, 6],
  range: [0, 45, 90],
  tour: [[170, 137], [290, 224], [109, 94], null],
  mount,
});
