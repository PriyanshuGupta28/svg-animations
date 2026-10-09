/**
 * Shards: a database drawn as a stack of six disk platters on a spindle, over
 * a round base. Each platter's shard number is a row of dots on its front rim.
 * At rest shard 4 stands a little out, as if just read, and is bright. The
 * pointer's height picks a platter, read from static bands up the resting
 * stack's front; it slides out sideways, its neighbours above lift a little to
 * let it go, staggered outwards from it on the 700ms tween. The slider is the
 * stagger, in ms.
 */
const {
  Cam, circ, clamp, facing, fit, poly, prism, proj, ringAt,
  tween, tset, tval, tdone, disposer, mk, place, pointer, put, register, solid,
} = HL;

const N = 6, R = 38, T = 8, PITCH = 12, Z0 = 9, OUT = 40, PART = 6, STUB = 10;
// At rest the stack is not quite square: shard 4 stands out, its neighbours less.
const REST = [0, 2.5, 7, 15, 4, 0], MARK = 3;
const TOP = Z0 + N * PITCH + PART + STUB;

/** A ring moved by dx along x. */
const shift = (ring, dx) => ring.map((q) => ({ ...q, u: q.u + dx }));

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;
  const C = Cam(45, 0.5, 2.05);
  fit(C, [[-R - 6, -R - 6, 0], [R + 6, R + 6, 0], [R + 6, -R - 6, 0], [-R - 6, R + 6, 0], [OUT + R, 0, Z0 + T], [0, 0, TOP]], 200, 166);
  const P = proj(C), front = facing(C);
  const disc = circ(R, 48), crease = circ(R - 1.6, 48);

  const g = mk("g", {}, svg);
  put(solid(g), prism(P, front, circ(R + 6, 48), circ(R + 4.2, 48), 0, Z0 - 3));
  // The spindle, painted first: every platter above it covers it, so it shows only in the gaps and over the top.
  const spindle = solid(g);
  put(spindle, prism(P, front, circ(4, 16), circ(3, 16), Z0 - 3, TOP));

  // Bottom to top: an upper platter covers the top of the one under it.
  const plates = REST.map((o, i) => {
    const grp = mk("g", {}, g), el = solid(grp);
    const dots = [];
    for (let k = 0; k <= i; k++) dots.push(mk("circle", { r: 1.05, class: "dot off" }, grp));
    // the top platter shows its hub, and the spindle's end standing through it while it is home
    const top = i === N - 1 ? { hub: mk("path", { class: "nf lo" }, grp), stub: solid(grp) } : null;
    return { i, el, dots, top, out: tween(o), up: tween(0), drawn: "" };
  });

  function draw(p, o, u) {
    const key = o + "," + u;
    if (key === p.drawn) return;
    p.drawn = key;
    const z0 = Z0 + p.i * PITCH + u;
    put(p.el, prism(P, front, shift(disc, o), shift(crease, o), z0, z0 + T));
    // the shard's number: i + 1 dots along the rim, centred on the side that faces the viewer
    if (p.top) {
      p.top.hub.setAttribute("d", poly(ringAt(P, shift(circ(10, 24), o), z0 + T)));
      put(p.top.stub, o < R * 0.5 ? prism(P, front, circ(4, 16), circ(3, 16), z0 + T, TOP) : { sil: "", crease: "" });
    }
    p.dots.forEach((el, k) => {
      const a = ((45 + (k - p.i / 2) * 9) * Math.PI) / 180;
      place(el, P(o + R * Math.cos(a), R * Math.sin(a), z0 + T / 2));
    });
  }

  const B = register(stage, (_dt, now) => {
    let m = false;
    for (const p of plates) { draw(p, tval(p.out, now), tval(p.up, now)); if (!tdone(p.out, now) || !tdone(p.up, now)) m = true; }
    return m;
  });
  bag.add(B.unregister);

  // Hit bands: the pointer's height over the resting stack's front rim. They never move.
  const rim = ringAt(P, disc, 0), dz = P(0, 0, 0)[1] - P(0, 0, 1)[1];
  const xs = rim.map((q) => q[0]), left = Math.min(...xs), right = Math.max(...xs);
  /** The front rim's screen y at screen x: the lowest rim point near it. */
  const rimY = (x) => Math.max(...rim.filter((q) => Math.abs(q[0] - x) < 6).map((q) => q[1]));
  function hit([x, y]) {
    if (x < left + 2 || x > right - 2) return -1;
    const z = (rimY(x) - y) / dz;
    if (z < Z0 - 2 || z > Z0 + N * PITCH + R * 0.7) return -1;
    return clamp(Math.floor((z - Z0 + (PITCH - T) / 2) / PITCH), 0, N - 1);
  }

  let act = null;
  function setActive(a) {
    if (a === act) return;
    const now = performance.now(), from = a >= 0 ? a : act >= 0 ? act : MARK;
    act = a;
    for (const p of plates) {
      const d = Math.abs(p.i - from), sel = a >= 0;
      const o = !sel ? REST[p.i] : p.i === a ? OUT : d === 1 ? OUT * 0.15 : 0;
      tset(p.out, o, now, d * stag);
      tset(p.up, sel && p.i > a ? PART : 0, now, d * stag);
      const lit = p.i === (sel ? a : MARK);
      p.el.sil.classList.toggle("hi", lit);
      p.dots.forEach((el) => el.setAttribute("class", lit ? "dot" : "dot m"));
    }
    read.textContent = a < 0 ? "rest" : "shard " + (a + 1);
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
  name: "shards",
  means: "A database as a stack of disk platters: the shard at the pointer's height slides out, and its neighbours part to let it go.",
  rules: [1, 2, 5, 9],
  range: [0, 45, 90],
  tour: [[200, 194], [200, 130], [200, 236], null],
  mount,
});
