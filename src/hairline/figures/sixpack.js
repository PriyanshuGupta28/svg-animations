/**
 * Sixpack: six standard cans held at the neck by a plastic ring carrier, three
 * by two. Each can has a chime at its foot, a necked-in shoulder, a rim, and a
 * lid with a rivet, a pull tab and its scored opening. The pointer picks a can,
 * tested on the cans' resting outlines; it pulls up out of its ring, which
 * stretches after it, and the others tilt toward it as the web tugs them,
 * staggered outwards on the 700ms tween. At rest one can is partly pulled and
 * bright. The slider is the stagger, in ms.
 */
const {
  Cam, circ, facing, fillet, fit, hull, open, poly, proj, rad, ringAt, rrect, run, seg,
  tween, tset, tval, tdone, disposer, mk, place, pointer, register,
} = HL;

const R = 11, H = 41, PITCH = 2 * R + 0.8, ZW = H - 4, LIFT = 24, AJAR = 11, TILT = 7, MARK = 4;
/** The can's profile, bottom up, as [height, radius]: chime, body, shoulder, neck, rim. */
const PROFILE = [[0, 0.8], [2.4, 1], [H - 6.5, 1], [H - 1.6, 0.83], [H, 0.86]];
const U = circ(1, 40), SPIN = [20, 75, 150, 210, 300, 120];

/** The lid's parts in the tab's own frame (p along the tab, q across), in units of R: the tab, its finger hole, the scored opening. */
const LID = {
  tab: rrect(-0.66, -0.26, 0.2, 0.26, 0.2, 3).map((q) => [q.u, q.v]),
  hole: rrect(-0.56, -0.14, -0.24, 0.14, 0.13, 3).map((q) => [q.u, q.v]),
  open: fillet([[0.25, -0.15], [0.68, -0.3], [0.68, 0.3], [0.25, 0.15]], [0.08, 0.2, 0.2, 0.08], 3),
};

/** Whether screen point p falls inside polygon pts. */
function inside([x, y], pts) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;
  const C = Cam(45, 0.5, 2.8);
  const E = R + 3, X1 = 2 * PITCH + E, Y1 = PITCH + E;
  fit(C, [[-E, -E, 0], [X1, Y1, 0], [X1, -E, 0], [-E, Y1, 0], [-E, -E, H + LIFT], [X1, -E, H], [-E, Y1, H]], 200, 166);
  const P = proj(C), front = facing(C);

  /** A world point of a can standing at (cx, cy), lifted, its axis tilted by the small vector (ax, ay) in radians. */
  const frame = (cx, cy, lift, ax, ay) => {
    const th = Math.hypot(ax, ay), dx = th ? ax / th : 1, dy = th ? ay / th : 0, c = Math.cos(th), s = Math.sin(th);
    return (lx, ly, lz) => {
      const a = lx * dx + ly * dy, b = ly * dx - lx * dy;
      return P(cx + a * c * dx - b * dy + lz * s * dx, cy + a * c * dy + b * dx + lz * s * dy, lift - a * s + lz * c);
    };
  };
  const ring = (w, r, z, ring0 = U) => ring0.map((q) => w(q.u * r, q.v * r, z));

  const g = mk("g", {}, svg);
  // the carrier's outer edge, at neck height: the far run behind the cans, the near run in front of them
  const web = rrect(-E, -E, X1, Y1, E, 8);
  mk("path", { d: open(ringAt(P, run(web, (q) => !front(q)), ZW)), class: "nf" }, g);

  const cans = [];
  for (let k = 0; k < 6; k++) {
    const i = k % 3, j = Math.floor(k / 3);
    cans.push({ k, i, j, cx: i * PITCH, cy: j * PITCH, phi: rad(SPIN[k]), lift: tween(0), ax: tween(0), ay: tween(0), drawn: "" });
  }
  cans.sort((a, b) => a.i + a.j - (b.i + b.j));
  for (const cn of cans) {
    const cg = mk("g", {}, g);
    cn.sil = mk("path", { class: "sil" }, cg);
    cn.cr = mk("path", { class: "nf lo" }, cg);
    cn.rim = mk("path", { class: "nf" }, cg);
    cn.well = mk("path", { class: "nf lo" }, cg);
    cn.open = mk("path", { class: "nf lo" }, cg);
    cn.tab = mk("path", {}, cg);
    cn.hole = mk("path", { class: "nf lo" }, cg);
    cn.rivet = mk("circle", { r: 0.9, class: "dot off" }, cg);
    cn.loop = mk("path", { class: "nf" }, cg);
    cn.sleeve = mk("path", { class: "nf lo" }, cg);
    const w = frame(cn.cx, cn.cy, 0, 0, 0);
    cn.rest = hull(PROFILE.flatMap(([z, r]) => ring(w, r * R, z)));
  }
  mk("path", { d: open(ringAt(P, run(web, front), ZW)), class: "nf" }, g);

  function draw(cn, now) {
    const lift = tval(cn.lift, now), ax = tval(cn.ax, now), ay = tval(cn.ay, now), key = lift + "," + ax + "," + ay;
    if (key === cn.drawn) return;
    cn.drawn = key;
    const w = frame(cn.cx, cn.cy, lift, rad(ax), rad(ay)), fr = run(U, front);
    cn.sil.setAttribute("d", poly(hull(PROFILE.flatMap(([z, r]) => ring(w, r * R, z)))));
    cn.cr.setAttribute("d", open(ring(w, R, PROFILE[2][0], fr)));
    cn.rim.setAttribute("d", poly(ring(w, 0.86 * R, H)));
    cn.well.setAttribute("d", poly(ring(w, 0.76 * R, H - 0.8)));
    const cs = Math.cos(cn.phi), sn = Math.sin(cn.phi), lid = (pts) => poly(pts.map(([p, q]) => w(R * (p * cs - q * sn), R * (p * sn + q * cs), H - 0.8)));
    cn.open.setAttribute("d", lid(LID.open));
    cn.tab.setAttribute("d", lid(LID.tab));
    cn.hole.setAttribute("d", lid(LID.hole));
    place(cn.rivet, w(0, 0, H - 0.6));
    // the ring rides up on the neck; its hole in the web stays put, and the plastic between them stretches
    cn.loop.setAttribute("d", open(ring(w, 0.96 * R, ZW, fr)));
    if (lift < 0.4) { cn.sleeve.setAttribute("d", ""); return; }
    const w0 = frame(cn.cx, cn.cy, 0, 0, 0), r0 = R + 2.5;
    let d = open(ring(w0, r0, ZW, fr));
    for (const q of [fr[0], fr[fr.length - 1]]) d += seg(w0(q.u * r0, q.v * r0, ZW), w(q.u * 0.96 * R, q.v * 0.96 * R, ZW));
    cn.sleeve.setAttribute("d", d);
  }

  const B = register(stage, (_dt, now) => {
    let m = false;
    for (const cn of cans) { draw(cn, now); if (!tdone(cn.lift, now) || !tdone(cn.ax, now) || !tdone(cn.ay, now)) m = true; }
    return m;
  });
  bag.add(B.unregister);

  /** The frontmost can whose resting outline holds the pointer; -1 for none. */
  function hit(p) {
    let best = -1;
    cans.forEach((cn, n) => { if (inside(p, cn.rest)) best = n; });
    return best;
  }

  let act = -2;
  const mark = cans.findIndex((cn) => cn.k === MARK);
  function setActive(a) {
    if (a === act) return;
    const now = performance.now(), src = cans[a >= 0 ? a : act >= 0 ? act : mark], pick = cans[a >= 0 ? a : mark];
    const pull = a >= 0 ? LIFT : AJAR;
    act = a;
    for (const cn of cans) {
      const dx = pick.cx - cn.cx, dy = pick.cy - cn.cy, dd = Math.hypot(dx, dy) / PITCH;
      const delay = (Math.abs(cn.i - src.i) + Math.abs(cn.j - src.j)) * stag, t = cn === pick || !dd ? 0 : (TILT * pull) / LIFT / (dd * dd);
      tset(cn.lift, cn === pick ? pull : 0, now, delay);
      tset(cn.ax, cn === pick ? 0 : (t * dx) / (dd * PITCH), now, delay);
      tset(cn.ay, cn === pick ? 0 : (t * dy) / (dd * PITCH), now, delay);
      cn.sil.classList.toggle("hi", cn === pick);
    }
    read.textContent = a >= 0 ? `can ${pick.j + 1}·${pick.i + 1}` : "rest";
    B.wake();
  }

  bag.add(pointer(stage, { move: (pt) => setActive(hit(pt)), leave: () => setActive(-1) }));
  bag.add(() => svg.replaceChildren());
  setActive(-1);

  return {
    set: (v) => { stag = v; },
    destroy: bag.dispose,
  };
}

hairline({
  name: "sixpack",
  means: "Six cans in a ring carrier: the one under the pointer pulls up out of its ring, and the rest tilt after it.",
  rules: [1, 2, 5, 8],
  range: [0, 45, 90],
  tour: [[132, 134], [268, 157], [223, 185], null],
  mount,
});
