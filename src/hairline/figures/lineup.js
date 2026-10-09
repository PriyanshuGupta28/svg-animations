/**
 * Lineup: a round stage with a team of five set out on it, a gaming chair on
 * each of five pedestals along a slight arc, each chair turned its own way.
 * The pointer picks a pedestal by its resting place; it rises and its chair
 * turns to face the viewer, while the others step back, staggered outwards
 * from it on the 700ms lift curve. Each player's number is a row of dots taped
 * on the stage in front of them. The slider is the stagger, in ms.
 */
const {
  Cam, circ, facing, fillet, fit, open, poly, prism, proj, rad, rrect, seg,
  tween, tset, tval, tdone, disposer, mk, flatDot, place, pointer, put, register, solid,
} = HL;

const N = 5, AX = 55, AY = 55, RA = 135, SPAN = 18, RS = 112, RD = 15, LIFT = 16, BACK = 12, VIEW = 45, STAR = 2;
const H0 = [10, 14, 18, 13, 9], JIT = [-30, 22, -14, 28, -24];
const PHI = Array.from({ length: N }, (_, i) => 225 + (i - 2) * SPAN);
const REST = PHI.map((p, i) => p + 180 + JIT[i]);
/** The backrest, flat in its own plane: v across, w up from the seat. Side wings, a neck, a headrest. */
const BACKREST = fillet([[-9, 0], [9, 0], [10, 16], [6.5, 20], [6, 29], [-6, 29], [-6.5, 20], [-10, 16]], [2, 2, 3, 2, 3, 3, 2, 3]);
const SLOTS = [rrect(-4.6, 22, -1.6, 25, 1.2, 3), rrect(1.6, 22, 4.6, 25, 1.2, 3)];
const wrap = (d) => ((((d + 180) % 360) + 360) % 360) - 180;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;

  const C = Cam(45, 0.5, 1.5);
  fit(C, [[-RS, -RS, -8], [RS, RS, -8], [RS, -RS, -8], [-RS, RS, -8], [-40, -40, 18 + LIFT + 43]], 200, 170);
  const P = proj(C), front = facing(C);
  const home = (i, b) => [AX + (RA + b) * Math.cos(rad(PHI[i])), AY + (RA + b) * Math.sin(rad(PHI[i]))];
  /** A ring turned th degrees and moved to (x, y). */
  const tr = (ring, th, x, y) => {
    const c = Math.cos(rad(th)), s = Math.sin(rad(th));
    return ring.map((q) => ({ u: x + q.u * c - q.v * s, v: y + q.u * s + q.v * c, nu: q.nu * c - q.nv * s, nv: q.nu * s + q.nv * c }));
  };

  const g = mk("g", {}, svg);
  put(solid(g), prism(P, front, circ(RS, 72), circ(RS - 2.2, 72), -8, 0));
  const peds = [];
  for (let i = 0; i < N; i++) {
    // the player's number, as dots taped on the stage in front of the pedestal
    const [hx, hy] = home(i, -26), t = rad(PHI[i] + 90);
    const dots = Array.from({ length: i + 1 }, (_, k) => {
      const d = flatDot(g, C, 1.1, "dot off"), o = (k - i / 2) * 4;
      place(d, P(hx + o * Math.cos(t), hy + o * Math.sin(t), 0));
      return d;
    });
    peds.push({ i, dots, z: tween(0), a: tween(REST[i]), b: tween(0), drawn: "" });
  }
  // pedestals painted from the farthest resting place to the nearest
  for (const p of peds.slice().sort((m, n) => home(m.i, 0).reduce((s, v) => s + v) - home(n.i, 0).reduce((s, v) => s + v))) {
    const grp = mk("g", {}, g);
    p.drum = solid(grp);
    p.star = mk("path", { class: "nf lo" }, grp);
    p.gas = solid(grp);
    p.seatG = mk("g", {}, grp); p.seat = solid(p.seatG); p.arms = mk("path", { class: "nf" }, p.seatG);
    p.backG = mk("g", {}, grp);
    p.rear = mk("path", { class: "lo" }, p.backG); p.face = mk("path", { class: "sil" }, p.backG); p.slots = mk("path", { class: "nf lo" }, p.backG);
    p.near = null;
  }

  function draw(p, lift, th, b) {
    const key = lift + "," + th + "," + b;
    if (key === p.drawn) return;
    p.drawn = key;
    const [x, y] = home(p.i, b), h = H0[p.i] + lift, c = Math.cos(rad(th)), s = Math.sin(rad(th));
    const L = (u, v, z) => P(x + u * c - v * s, y + u * s + v * c, h + z);
    put(p.drum, prism(P, front, tr(circ(RD, 28), 0, x, y), tr(circ(RD - 1.6, 28), 0, x, y), 0, h));
    p.star.setAttribute("d", [0, 1, 2, 3, 4].map((k) => seg(L(0, 0, 1.5), L(9 * Math.cos(rad(72 * k + 36)), 9 * Math.sin(rad(72 * k + 36)), 1.5))).join(""));
    put(p.gas, prism(P, front, tr(circ(1.7, 10), 0, x, y), tr(circ(1.1, 10), 0, x, y), h + 1.5, h + 11));
    put(p.seat, prism(P, front, tr(rrect(-9, -9, 9, 9, 3.5, 4), th, x, y), tr(rrect(-7.8, -7.8, 7.8, 7.8, 2.3, 4), th, x, y), h + 11, h + 14));
    p.arms.setAttribute("d", [-10.5, 10.5].map((v) => open([L(-5, v, 14), L(-5, v, 20), L(5, v, 20)])).join(""));
    const B = (v, w, t = 0) => L(-9 - w * 0.12 - t, v, 14 + w);
    p.rear.setAttribute("d", poly(BACKREST.map((q) => B(q[0], q[1], 1.8))));
    p.face.setAttribute("d", poly(BACKREST.map((q) => B(q[0], q[1]))));
    p.slots.setAttribute("d", SLOTS.map((r) => poly(r.map((q) => B(q.u, q.v)))).join(""));
    // the backrest goes in front of the seat when the chair turns its back to the viewer
    const near = Math.cos(rad(th - VIEW)) < 0;
    if (near !== p.near) { p.near = near; if (near) p.seatG.after(p.backG); else p.seatG.before(p.backG); }
  }

  const Bk = register(stage, (_dt, now) => {
    let m = false;
    for (const p of peds) {
      draw(p, tval(p.z, now), tval(p.a, now), tval(p.b, now));
      if (!tdone(p.z, now) || !tdone(p.a, now) || !tdone(p.b, now)) m = true;
    }
    return m;
  });
  bag.add(Bk.unregister);

  // hit test: the pedestal whose resting centre is nearest the pointer's x, inside its resting height band
  const bands = peds.map((p) => { const [x, y] = home(p.i, 0); return [P(x, y, 0)[0], P(x, y, H0[p.i] + 46)[1] - 6, P(x, y, 0)[1] + 34]; });
  function hit([px, py]) {
    let best = -1;
    bands.forEach(([x, top, bot], i) => { if (py >= top && py <= bot && (best < 0 || Math.abs(x - px) < Math.abs(bands[best][0] - px))) best = i; });
    return best >= 0 && Math.abs(bands[best][0] - px) < 34 ? best : -1;
  }

  let act = null;
  function setActive(a) {
    if (a === act) return;
    const now = performance.now(), from = a >= 0 ? a : act ?? STAR;
    act = a;
    for (const p of peds) {
      const i = p.i, delay = Math.abs(i - from) * stag;
      tset(p.z, i === a ? LIFT : 0, now, delay);
      tset(p.a, i === a ? REST[i] + wrap(VIEW - REST[i]) : REST[i], now, delay);
      tset(p.b, a >= 0 && i !== a ? BACK : 0, now, delay);
      p.face.classList.toggle("hi", a < 0 ? i === STAR : i === a);
      p.dots.forEach((d) => d.setAttribute("class", i === a ? "dot m" : "dot off"));
    }
    read.textContent = a < 0 ? "rest" : `player ${a + 1}`;
    Bk.wake();
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
  name: "lineup",
  means: "Five players' chairs on a stage: the one under the pointer rises and turns to face you, and the others step back.",
  rules: [1, 2, 5, 10],
  range: [0, 40, 90],
  tour: [[263, 104], [81, 122], [200, 100], null],
  mount,
});
