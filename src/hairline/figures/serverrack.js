/**
 * Serverrack: a server cabinet on a plinth, ten blades stacked in its front
 * opening. Each blade front has a vent slot and a status LED. At rest three
 * blades stand half out, where the last update stopped, and the farthest out
 * is bright. The pointer's height picks a blade, read from static bands up the
 * cabinet's front; the blades near it slide out, the farther the less,
 * staggered outwards from it on the 700ms tween. The slider is the reach, in blades.
 */
const {
  Cam, clamp, facing, fit, poly, prism, proj, rings, rrect,
  tween, tset, tval, tdone, disposer, mk, place, pointer, put, register, solid,
} = HL;

const N = 10, W = 64, DP = 54, Z0 = 12, PITCH = 11, BH = 8.4, TOP = Z0 + N * PITCH + 4;
const OUT = 30, MIN = 1.6, STEP = 45, BX0 = 5, BX1 = W - 5;
// Where the last update stopped: three blades left part way out.
const REST = [MIN, MIN, 11, MIN, MIN, MIN, 21, 7, MIN, MIN], MARK = 6;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let reach = value;
  const C = Cam(45, 0.5, 1.8);
  fit(C, [[0, 0, 0], [W, DP + OUT, 0], [W, 0, 0], [0, DP + OUT, Z0], [0, 0, TOP], [W, DP + OUT, Z0 + N * PITCH]], 200, 166);
  const P = proj(C), front = facing(C);
  /** A rounded outline drawn flat on a front plane, y = const: u runs along x, v up z. */
  const onFront = (ring, y) => poly(ring.map((q) => P(q.u, y, q.v)));

  const g = mk("g", {}, svg);
  const [pr, pi] = rings(4, 4, W - 4, DP - 4, 5, 1.6);
  put(solid(g), prism(P, front, pr, pi, 0, Z0 - 6));
  const [cr, ci] = rings(0, 0, W, DP, 6, 2.2);
  put(solid(g), prism(P, front, cr, ci, Z0 - 6, TOP));
  // The front opening the blades sit in, and the vent in the cabinet's top.
  mk("path", { d: onFront(rrect(BX0 - 2, Z0 - 2, BX1 + 2, Z0 + N * PITCH + 1, 2.4, 4), DP), class: "nf lo" }, g);
  mk("path", { d: poly(rrect(14, 14, W - 14, 26, 4, 4).map((q) => P(q.u, q.v, TOP))), class: "nf lo" }, g);

  // Bottom to top: an upper blade covers the top of the one under it.
  const blades = REST.map((o, i) => {
    const grp = mk("g", {}, g), el = solid(grp);
    const vent = mk("path", { class: "nf lo" }, grp);
    const led = mk("circle", { r: 1.25, class: "dot off" }, grp);
    return { i, z0: Z0 + i * PITCH, el, vent, led, out: tween(o), drawn: NaN };
  });

  function drawBlade(b, o) {
    if (o === b.drawn) return;
    b.drawn = o;
    const [ring, inner] = rings(BX0, DP - 1, BX1, DP + o, 1.6, 0.8);
    put(b.el, prism(P, front, ring, inner, b.z0, b.z0 + BH));
    const y = DP + o;
    b.vent.setAttribute("d", onFront(rrect(BX0 + 5, b.z0 + 2.9, BX0 + 30, b.z0 + 5.5, 1.3, 3), y));
    place(b.led, P(BX1 - 6, y, b.z0 + 4.2));
  }

  const B = register(stage, (_dt, now) => {
    let m = false;
    for (const b of blades) { drawBlade(b, tval(b.out, now)); if (!tdone(b.out, now)) m = true; }
    return m;
  });
  bag.add(B.unregister);

  // Hit bands: the pointer's height against the resting front's centre line. They never move.
  const mid = (z) => P(W / 2, DP, z)[1];
  const left = P(0, DP + OUT, 0)[0] - 10, right = P(W, 0, 0)[0] + 10;
  function hit([x, y]) {
    if (x < left || x > right) return -1;
    for (let i = 0; i < N; i++) if (y <= mid(Z0 + i * PITCH - 1.3) && y > mid(Z0 + (i + 1) * PITCH - 1.3)) return i;
    return -1;
  }

  let act = null;
  function setActive(a) {
    if (a === act) return;
    const now = performance.now(), from = a >= 0 ? a : act >= 0 ? act : MARK;
    act = a;
    for (const b of blades) {
      const d = Math.abs(b.i - from);
      const o = a < 0 ? REST[b.i] : Math.max(MIN, OUT * clamp(1 - Math.abs(b.i - a) / (reach + 1), 0, 1));
      tset(b.out, o, now, d * STEP);
      const lit = b.i === (a < 0 ? MARK : a);
      b.el.sil.classList.toggle("hi", lit);
      b.led.setAttribute("class", lit ? "dot" : o > 5 ? "dot m" : "dot off");
    }
    read.textContent = a < 0 ? "rest" : "blade " + String(a + 1).padStart(2, "0");
    B.wake();
  }

  bag.add(pointer(stage, { move: (p) => setActive(hit(p)), leave: () => setActive(-1) }));
  bag.add(() => svg.replaceChildren());
  setActive(-1);

  return {
    set: (v) => { reach = v; if (act >= 0) { const a = act; act = null; setActive(a); } },
    destroy: bag.dispose,
  };
}

hairline({
  name: "serverrack",
  means: "A server cabinet: the blades near the pointer's height slide out, the farther the less, staggered outwards from it.",
  rules: [1, 2, 3, 5],
  range: [0.5, 2, 4],
  tour: [[185, 178], [185, 110], [185, 230], null],
  mount,
});
