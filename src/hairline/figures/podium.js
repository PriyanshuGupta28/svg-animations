/**
 * Podium: search results as a staircase of eight slabs stepping down from
 * rank 1 at the back. Each slab's top is ruled like a result, a title over two
 * lines of snippet, and its rank is a dot code in a 4 × 2 grid. The pointer
 * picks a slab by its rest top; it rises and steps forward, and the others
 * sink back a little, staggered outwards from it on the 700ms lift curve. At
 * rest rank 1 is bright. The slider is the stagger, in ms.
 */
const {
  Cam, facing, fit, prism, proj, rings, seg, unproj,
  tween, tset, tval, tdone, disposer, mk, place, pointer, put, register, solid,
} = HL;

const N = 8, W = 66, D = 15, PITCH = 18, LIFT = 10, FWD = 14, SINK = 4, BACK = 3;
/** At rest the top result already stands a little forward of the rest. */
const RX = (i) => (i === 0 ? 7 : 0);
const Y1 = (N - 1) * PITCH + D, H = (i) => 6 + (N - 1 - i) * 6.5;
/** Title and snippet lengths for each result, so no two tops read the same. */
const TITLE = [30, 24, 34, 20, 28, 36, 22, 26], SNIP = [40, 34, 44, 30, 38, 42, 28, 36];

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;

  const C = Cam(45, 0.5, 1.62);
  fit(C, [[-6, -6, -4], [W + FWD + 6, -6, -4], [-6, Y1 + 6, -4], [W + FWD + 6, Y1 + 6, -4], [0, 0, H(0) + LIFT], [W + FWD, 0, H(0) + LIFT]], 200, 166);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  const [br, bi] = rings(-6, -6, W + FWD + 6, Y1 + 6, 8, 2.2);
  put(solid(g), prism(P, front, br, bi, -4, 0));

  // Back to front: rank 1 at the back is painted first.
  const slabs = [];
  for (let i = 0; i < N; i++) {
    const el = solid(g), title = mk("path", { class: "nf" }, el.g), snip = mk("path", { class: "nf lo" }, el.g);
    const dots = [];
    for (let k = 0; k < 8; k++) dots.push(mk("circle", { r: 1.05, class: "dot " + (k === i ? "m" : "off") }, el.g));
    slabs.push({ i, y0: i * PITCH, h: H(i), el, title, snip, dots, x: tween(RX(i)), z: tween(0), drawn: "" });
  }

  function draw(s, dx, dz) {
    const key = dx + "," + dz;
    if (key === s.drawn) return;
    s.drawn = key;
    const z = s.h + dz, y = s.y0;
    const [ring, inner] = rings(dx, y, dx + W, y + D, 3, 1.1);
    put(s.el, prism(P, front, ring, inner, 0, z));
    const at = (u, v) => P(dx + u, y + v, z);
    s.title.setAttribute("d", seg(at(5, 4.2), at(5 + TITLE[s.i], 4.2)));
    s.snip.setAttribute("d", seg(at(5, 8), at(5 + SNIP[s.i], 8)) + seg(at(5, 11), at(5 + SNIP[s.i] * 0.7, 11)));
    s.dots.forEach((el, k) => place(el, at(W - 16 + (k % 4) * 3.6, 5.6 + Math.floor(k / 4) * 3.8)));
  }

  const B = register(stage, (_dt, now) => {
    let m = false;
    for (const s of slabs) { draw(s, tval(s.x, now), tval(s.z, now)); if (!tdone(s.x, now) || !tdone(s.z, now)) m = true; }
    return m;
  });
  bag.add(B.unregister);

  /** Each slab's rest top, unprojected onto its own height: the one the point lands nearest, ties to the nearer slab. */
  function hit(p) {
    let best = -1, bd = 6;
    for (const s of slabs) {
      const [u, v] = unproj(C, p[0], p[1], s.h);
      const d = Math.max(0, RX(s.i) - u, u - RX(s.i) - W) + Math.max(0, s.y0 - v, v - s.y0 - D);
      if (d <= bd) { bd = d; best = s.i; }
    }
    return best;
  }

  let act = null;
  function setActive(a) {
    if (a === act) return;
    const now = performance.now(), from = a >= 0 ? a : act ?? 0;
    act = a;
    for (const s of slabs) {
      const delay = Math.abs(s.i - from) * stag, on = s.i === a;
      tset(s.x, a < 0 ? RX(s.i) : on ? FWD : -BACK, now, delay);
      tset(s.z, a < 0 ? 0 : on ? LIFT : -SINK, now, delay);
      s.el.sil.classList.toggle("hi", a < 0 ? s.i === 0 : on);
      s.dots[s.i].classList.toggle("m", !on);
    }
    read.textContent = a < 0 ? "rest" : `rank ${String(a + 1).padStart(2, "0")}`;
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
  name: "podium",
  means: "Search results as a staircase from rank 1: the one under the pointer rises and steps forward as the rest sink back.",
  rules: [1, 2, 8, 10],
  range: [0, 40, 90],
  tour: [[182, 168], [264, 90], [140, 207], null],
  mount,
});
