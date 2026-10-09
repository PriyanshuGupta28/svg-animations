/**
 * Vault: a floor safe in isometric, its thick door hung on two hinges, with a
 * big combination dial and a three-spoked handle. The pointer pushes the
 * dial: its movement round the dial's centre, read on the door's plane,
 * which never moves, adds spin; friction bleeds it, and once it is slow a
 * detent spring catches it on the nearest of forty stops, dotted on its rim.
 * Settled on the right stop, the handle turns and takes the bright stroke.
 * At rest the dial sits off zero and the handle is not square. The slider is
 * the coast, in seconds: how long a push keeps spinning.
 */
const {
  Cam, circ, fit, hull, open, poly, prism, proj, rings, rrect, run, seg, facing,
  spring, stepS, tween, tset, tval, tdone, reducedMotion, disposer, mk, place, pointer, put, register, solid,
} = HL;

const BX = 96, BY = 64, BZ0 = 6, BZ1 = 106, T = 5, YF = BY + T;
const DX0 = 9, DX1 = 87, DZ0 = 16, DZ1 = 98;
const DC = [44, 74], DR = 19, DD = 4, GR = 7.5, GD = 6, NS = 40, STEP = (2 * Math.PI) / NS;
const HC = [66, 38], SPOKE = 16, HUB = 5.5, KNOB = 3.2;
const SECRET = 24, REST_STOP = 33, H_REST = 0.22, H_OPEN = 1.27, PUSH = 3, CATCH = 0.6, REACH = DR + 14;
const vis = (q) => 0.612 * q.nu + 0.5 * q.nv > 0;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const stopOf = (th) => (((Math.round(th / STEP)) % NS) + NS) % NS;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let tau = value;

  const C = Cam(45, 0.5, 1.66);
  fit(C, [[0, 0, 0], [BX, BY, 0], [BX, 0, 0], [0, BY, 0], [0, 0, BZ1], [BX, 0, BZ1], [0, BY, BZ1], [DX0, YF + GD + DD, DZ1]], 200, 166);
  const P = proj(C), front = facing(C);

  // A ring of the door's plane (u along x, v up) at depth y, centred on c and turned by a.
  const onDoor = (ring, c, y, a = 0) => {
    const ca = Math.cos(a), sa = Math.sin(a);
    return ring.map((q) => P(c[0] + q.u * ca - q.v * sa, y, c[1] + q.u * sa + q.v * ca));
  };
  const turnN = (ring, a) => ring.map((q) => ({ ...q, nu: q.nu * Math.cos(a) - q.nv * Math.sin(a), nv: q.nu * Math.sin(a) + q.nv * Math.cos(a) }));
  /** A short solid standing out of the door from y0 to y1: silhouette, and the crease where its face meets its visible side. */
  const boss = (ring, inner, c, y0, y1, a = 0) => ({
    sil: poly(hull(onDoor(ring, c, y0, a).concat(onDoor(ring, c, y1, a)))),
    crease: open(onDoor(run(turnN(inner, a), vis), c, y1, a)),
  });

  const g = mk("g", {}, svg);
  // feet, then the body, then the hinges, then the door: back to front
  for (const [fx, fy] of [[6, 6], [BX - 18, 6], [6, BY - 18], [BX - 18, BY - 18]]) {
    const [r, i] = rings(fx, fy, fx + 12, fy + 12, 4, 1);
    put(solid(g), prism(P, front, r, i, 0, BZ0));
  }
  const [br, bi] = rings(0, 0, BX, BY, 7, 2.2);
  put(solid(g), prism(P, front, br, bi, BZ0, BZ1));
  const at = (ring, x, y) => ring.map((q) => ({ ...q, u: q.u + x, v: q.v + y }));
  for (const [z0, z1] of [[DZ0 + 8, DZ0 + 26], [DZ1 - 26, DZ1 - 8]]) {
    put(solid(g), prism(P, front, at(circ(3.6, 16), DX0 - 1, BY + 2.5), at(circ(2.8, 16), DX0 - 1, BY + 2.5), z0, z1));
  }
  // the door: a thick slab proud of the front
  const door = rrect(DX0, DZ0, DX1, DZ1, 6, 6), doorIn = rrect(DX0 + 1.5, DZ0 + 1.5, DX1 - 1.5, DZ1 - 1.5, 4.5, 6);
  const at0 = (ring, y) => ring.map((q) => P(q.u, y, q.v));
  put(solid(g), { sil: poly(hull(at0(door, BY).concat(at0(door, YF)))), crease: open(at0(run(doorIn, vis), YF)) });
  // a bolt-work plate seam and the fixed index above the dial
  mk("path", { d: poly(at0(rrect(DX0 + 6, DZ0 + 6, DX1 - 6, DZ1 - 6, 4, 5), YF)), class: "nf lo" }, g);
  mk("path", { d: seg(P(DC[0], YF, DC[1] + DR + 2), P(DC[0], YF, DC[1] + DR + 7)), class: "nf" }, g);

  // the dial: a wide disc with forty stops dotted on its face, and a grip on it
  const dial = solid(g);
  put(dial, boss(circ(DR, 40), circ(DR - 1, 40), DC, YF, YF + DD));
  const ticks = [];
  for (let k = 0; k < NS; k++) ticks.push(mk("circle", { r: k % 5 ? 0.6 : 1, class: k % 5 ? "dot off" : "dot m" }, g));
  const zero = mk("path", { class: "nf" }, g);
  const grip = solid(g);
  put(grip, boss(circ(GR, 24), circ(GR - 1, 24), DC, YF + DD, YF + DD + GD));
  const notch = mk("path", { class: "nf lo" }, g);

  // the handle: three spokes with knobbed ends round a hub
  const hg = mk("g", {}, g), spokes = [0, 1, 2].map(() => solid(hg)), knobs = [0, 1, 2].map(() => solid(hg)), hub = solid(hg);
  const bar = rings(0, -1.6, SPOKE, 1.6, 1.6, 0.5);

  function drawDial(th) {
    ticks.forEach((el, k) => {
      const a = Math.PI / 2 - k * STEP + th, r = DR - 2.6;
      place(el, P(DC[0] + r * Math.cos(a), YF + DD, DC[1] + r * Math.sin(a)));
    });
    const a = Math.PI / 2 + th, ca = Math.cos(a), sa = Math.sin(a);
    zero.setAttribute("d", seg(P(DC[0] + (GR + 1.5) * ca, YF + DD, DC[1] + (GR + 1.5) * sa), P(DC[0] + (DR - 5) * ca, YF + DD, DC[1] + (DR - 5) * sa)));
    notch.setAttribute("d", seg(P(DC[0] + 1.5 * ca, YF + DD + GD, DC[1] + 1.5 * sa), P(DC[0] + (GR - 1.5) * ca, YF + DD + GD, DC[1] + (GR - 1.5) * sa)));
  }
  function drawHandle(a) {
    for (let j = 0; j < 3; j++) {
      const s = a + (j * 2 * Math.PI) / 3, e = [HC[0] + SPOKE * Math.cos(s), HC[1] + SPOKE * Math.sin(s)];
      put(spokes[j], boss(bar[0], bar[1], HC, YF + 3, YF + 6, s));
      put(knobs[j], boss(circ(KNOB, 16), circ(KNOB - 0.8, 16), e, YF + 2, YF + 9));
    }
    put(hub, boss(circ(HUB, 20), circ(HUB - 1, 20), HC, YF, YF + 8));
  }

  // The dial's state: coasting (th, w) until slow, then a detent spring on the nearest stop.
  let th = REST_STOP * STEP, w = 0, sp = spring(th), coasting = false, over = false, last = null, open_ = false, dTh = NaN, dH = NaN;
  const handle = tween(H_REST);

  function settle() {
    coasting = false;
    sp = spring(th); sp.v = w; sp.t = stopOf(th) * STEP + Math.round((th - stopOf(th) * STEP) / (2 * Math.PI)) * 2 * Math.PI;
    if (!over) sp.t = th + wrap(REST_STOP * STEP - th);
    mark(stopOf(sp.t) === SECRET && over);
  }
  function mark(unlocked) {
    if (unlocked !== open_) { open_ = unlocked; tset(handle, unlocked ? H_OPEN : H_REST, performance.now(), 0); }
    grip.sil.classList.toggle("hi", !open_);
    dial.sil.classList.toggle("hi", over && !open_);
    for (const s of [hub, ...spokes, ...knobs]) s.sil.classList.toggle("hi", open_);
    read.textContent = over ? `stop ${stopOf(coasting ? th : sp.t)}` : "rest";
  }

  const B = register(stage, (dt, now) => {
    let m = false;
    if (coasting) {
      th += w * dt; w *= Math.exp(-dt / tau); m = true;
      if (Math.abs(w) < CATCH) settle();
      else if (over) read.textContent = `stop ${stopOf(th)}`;
    } else { m = stepS(sp, dt); th = sp.x; }
    if (th !== dTh) { dTh = th; drawDial(th); }
    const h = tval(handle, now);
    if (h !== dH) { dH = h; drawHandle(h); }
    return m || !tdone(handle, now);
  });
  bag.add(B.unregister);

  // The door never moves: the pointer is read on its plane, as an angle round the dial's centre.
  const o = P(0, YF, 0), ex = P(1, YF, 0), ez = P(0, YF, 1);
  const ax = [ex[0] - o[0], ex[1] - o[1]], az = [ez[0] - o[0], ez[1] - o[1]], det = ax[0] * az[1] - ax[1] * az[0];
  function onPlane([sx, sy]) {
    const qx = sx - o[0], qy = sy - o[1];
    return [(qx * az[1] - qy * az[0]) / det - DC[0], (ax[0] * qy - ax[1] * qx) / det - DC[1]];
  }

  function push(p) {
    const [u, v] = onPlane(p);
    over = true;
    if (Math.hypot(u, v) > REACH) { last = null; mark(open_ && !coasting); return; }
    const phi = Math.atan2(v, u), d = wrap(phi - (last ?? Math.PI / 2 + th));
    last = phi;
    if (Math.abs(d) < 1e-3) return;
    if (!coasting) { th = sp.x; w = sp.v; coasting = true; }
    w += d * PUSH;
    if (reducedMotion()) { th += w * tau; w = 0; settle(); }
    mark(false);
    B.wake();
  }

  bag.add(pointer(stage, {
    move: push,
    leave: () => { over = false; last = null; if (!coasting) settle(); else mark(false); B.wake(); },
  }));
  bag.add(() => svg.replaceChildren());
  drawDial(th); drawHandle(H_REST); mark(false);

  return {
    set: (v) => { tau = v; },
    destroy: bag.dispose,
  };
}

hairline({
  name: "vault",
  means: "A safe's combination dial: push it round, friction slows it, a detent catches a stop, and the right one turns the handle.",
  rules: [1, 4, 5, 8],
  range: [0.15, 0.35, 0.7],
  tour: [[155, 125], [139, 147], [163, 175], null],
  mount,
});
