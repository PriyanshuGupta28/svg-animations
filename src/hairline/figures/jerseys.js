/**
 * Jerseys: a team's clothes rail, seven match jerseys on hangers, hung side on
 * along one rod. The pointer picks a jersey by its resting outline; it swings
 * round on its hook to face the viewer and lifts off the rod, while the others
 * slide apart along the rail, staggered outwards from it on the 700ms lift
 * curve. Each jersey's number is a dot code on its chest. The slider is the
 * stagger, in ms.
 */
const {
  Cam, fillet, fit, open, poly, prism, proj, rad, rings, seg, facing,
  tween, tset, tval, tdone, disposer, mk, place, pointer, put, register, solid,
} = HL;

const N = 7, G = 19, SPREAD = 13, LIFT = 12, FACE = -45, Z = 94, HANG = 36, TK = 1.4, STAR = 4;
const Y0 = -SPREAD - 14, Y1 = (N - 1) * G + SPREAD + 14, ROD = Z - HANG;
/** Resting twist on the hook, in degrees: each jersey hangs a little askew. */
const REST = Array.from({ length: N }, (_, i) => 13 * Math.sin(i * 1.9 + 0.5));
/** A jersey, flat in its own plane: u across, v up from the hem. Short sleeves, a V collar. */
const SHAPE = fillet(
  [[-15, 0], [15, 0], [15, 30], [25, 26], [28, 37], [11, 49], [5, 50], [0, 44], [-5, 50], [-11, 49], [-28, 37], [-25, 26], [-15, 30]],
  [2, 2, 1.5, 1.5, 1.5, 2, 1, 1.5, 1, 2, 1.5, 1.5, 1.5],
);
/** The hanger's stem and the hook that curls over the rod. */
const HOOK = [[0, 45], [0, ROD - 5]];
for (let t = -70; t <= 200; t += 30) HOOK.push([3.5 * Math.cos(rad(t)), ROD + 3.5 * Math.sin(rad(t))]);
const DOTS = Array.from({ length: 8 }, (_, k) => [((k % 4) - 1.5) * 3.6, 34 - Math.floor(k / 4) * 3.6]);

function inside([x, y], pts) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;

  // Fitted to the whole rack with a jersey lifted and turned at each end of the rail.
  const C = Cam(45, 0.5, 1.5);
  fit(C, [[-28, Y0, 0], [28, Y1, 0], [-28, Y1, 0], [28, Y0, 0], [0, Y0, Z + 4], [-20, -SPREAD + 20, Z + LIFT], [20, Y1 - 20, HANG + LIFT]], 200, 166);
  const P = proj(C), front = facing(C);

  /** Points of a jersey's plane: twisted a degrees on its hook at rail position y, lifted, t behind its face. */
  const frame = (y, a, lift) => {
    const c = Math.cos(rad(a)), s = Math.sin(rad(a));
    return (u, v, t = 0) => P(u * c + t * s, y + u * s - t * c, HANG + lift + v);
  };

  const g = mk("g", {}, svg);
  const upright = (y) => {
    const [fr, fi] = rings(-26, y - 3, 26, y + 3, 3, 1.1), [ur, ui] = rings(-1.8, y - 1.8, 1.8, y + 1.8, 1.8, 0.6);
    put(solid(g), prism(P, front, fr, fi, 0, 3));
    put(solid(g), prism(P, front, ur, ui, 3, Z + 1));
  };
  upright(Y0);
  const rods = [mk("path", { class: "nf sil" }, g)], items = [];
  for (let i = 0; i < N; i++) {
    const grp = mk("g", {}, g);
    const back = mk("path", { class: "lo" }, grp), face = mk("path", { class: "sil" }, grp);
    const seams = mk("path", { class: "nf lo" }, grp), hook = mk("path", { class: "nf" }, grp);
    const dots = DOTS.map((_, k) => mk("circle", { r: 1.05, class: "dot " + (k <= i ? "m" : "off") }, grp));
    const w = frame(i * G, REST[i], 0);
    items.push({ back, face, seams, hook, dots, y: tween(i * G), a: tween(REST[i]), z: tween(0), hit: SHAPE.map((p) => w(p[0], p[1])), drawn: "" });
    rods.push(mk("path", { class: "nf sil" }, g));
  }
  upright(Y1);

  function draw(it, y, a, lift) {
    const key = y + "," + a + "," + lift;
    if (key === it.drawn) return;
    it.drawn = key;
    const w = frame(y, a, lift);
    it.back.setAttribute("d", poly(SHAPE.map((p) => w(p[0], p[1], TK))));
    it.face.setAttribute("d", poly(SHAPE.map((p) => w(p[0], p[1]))));
    it.seams.setAttribute("d", seg(w(15, 30), w(11, 48)) + seg(w(-15, 30), w(-11, 48)) + open([w(-6, 47.5), w(0, 41.5), w(6, 47.5)]));
    it.hook.setAttribute("d", open(HOOK.map((p) => w(p[0], p[1]))));
    it.dots.forEach((el, k) => place(el, w(DOTS[k][0], DOTS[k][1])));
  }

  const B = register(stage, (_dt, now) => {
    let m = false;
    const ys = items.map((it) => {
      const y = tval(it.y, now);
      draw(it, y, tval(it.a, now), tval(it.z, now));
      if (!tdone(it.y, now) || !tdone(it.a, now) || !tdone(it.z, now)) m = true;
      return y;
    });
    // The rod in pieces, each painted just after the jersey behind it, so a jersey never covers the rod in front of it.
    const stops = [Y0, ...ys, Y1];
    rods.forEach((el, k) => el.setAttribute("d", seg(P(0, stops[k], Z), P(0, stops[k + 1], Z))));
    return m;
  });
  bag.add(B.unregister);

  /** The nearest jersey whose resting outline holds the point: what you see at rest is what you pick. */
  const hit = (p) => { for (let i = N - 1; i >= 0; i--) if (inside(p, items[i].hit)) return i; return -1; };

  let act = null;
  function setActive(a) {
    if (a === act) return;
    const now = performance.now(), from = a >= 0 ? a : act ?? STAR;
    act = a;
    items.forEach((it, i) => {
      const delay = Math.abs(i - from) * stag, off = a < 0 || i === a ? 0 : i < a ? -SPREAD : SPREAD;
      tset(it.y, i * G + off, now, delay);
      tset(it.a, i === a ? FACE : REST[i], now, delay);
      tset(it.z, i === a ? LIFT : 0, now, delay);
      const lit = a < 0 ? i === STAR : i === a;
      it.face.classList.toggle("hi", lit);
      it.dots.forEach((el, k) => { if (k <= i) el.setAttribute("class", lit ? "dot" : "dot m"); });
    });
    read.textContent = a < 0 ? "rest" : `jersey ${String(a + 1).padStart(2, "0")}`;
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
  name: "jerseys",
  means: "A rail of team jerseys: the one under the pointer swings round to face you and lifts, and the rest slide apart.",
  rules: [1, 2, 6, 10],
  range: [0, 40, 90],
  tour: [[246, 115], [201, 146], [140, 176], null],
  mount,
});
