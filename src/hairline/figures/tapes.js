/**
 * Tapes: a podcast's episode archive, nine cassettes standing on edge in a
 * rack. Each has its shell with the head opening along its foot, a label
 * recess, a window with two reel hubs, and its episode number as one lit dot
 * in a row of nine on the label. The pointer picks a tape by its resting top
 * edge; it slides up out of the rack and tilts out, while the tapes before it
 * lean back and the ones after lean forward, staggered outwards from it on the
 * 700ms lift curve. At rest the tapes lean unevenly and episode 07 sits half
 * out, bright. The slider is the stagger, in ms.
 */
const {
  Cam, clamp, fillet, fit, hull, open, poly, prism, proj, rad, rings, rrect, seg, facing,
  tdone, tset, tval, tween, disposer, mk, place, pointer, put, register, solid,
} = HL;

const N = 9, W = 64, H = 40, G = 13, TK = 6, LIFT = 26, OUT = 8, BACK = -24, FWD = 18, REF = -12, STAR = 6;
const REST = [-11, -14, -10, -13, -9, -12, -6, -12, -9];
const SHAPE = fillet([[3, 0], [W - 3, 0], [W, 3], [W, H], [0, H], [0, 3]], [1.5, 1.5, 1.5, 3, 3, 1.5]);
const Y0 = -TK - 8, Y1 = (N - 1) * G + 8;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;

  const C = Cam(45, 0.5, 1.72);
  fit(C, [[-6, Y0, -6], [W + 6, Y1, -6], [W + 6, Y0, -6], [-6, Y1, -6], [0, Y0, H + LIFT], [W, Y0, H + LIFT]], 200, 166);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  const [bo, bi] = rings(-6, Y0, W + 6, Y1, 6, 1.8);
  put(solid(g), prism(P, front, bo, bi, -6, 0));
  // the rack's slots: a groove across the plinth under each tape
  mk("path", { class: "nf lo", d: Array.from({ length: N }, (_, i) => seg(P(-2, i * G - TK / 2, 0), P(W + 2, i * G - TK / 2, 0))).join("") }, g);

  const tapes = [];
  for (let i = 0; i < N; i++) {
    const grp = mk("g", {}, g);
    const body = solid(grp);
    const head = mk("path", { class: "nf lo" }, grp), label = mk("path", { class: "nf lo" }, grp);
    const win = mk("path", { class: "nf" }, grp), hubs = mk("path", { class: "nf lo" }, grp);
    const code = Array.from({ length: N }, (_, k) => mk("circle", { r: 0.95, class: "dot " + (k === i ? "m" : "off") }, grp));
    tapes.push({ i, body, head, label, win, hubs, code, a: tween(REST[i]), z: tween(i === STAR ? OUT : 0), drawn: "" });
  }

  /** Tape i leaning th degrees (negative leans back) and lifted by lift. */
  function draw(t, th, lift) {
    const key = th + "," + lift;
    if (key === t.drawn) return;
    t.drawn = key;
    const yb = t.i * G, s = Math.sin(rad(th)), c = Math.cos(rad(th));
    const w = (u, v) => P(u, yb + v * s, v * c + lift);
    const wb = (u, v) => P(u, yb + v * s - TK * c, v * c + TK * s + lift);
    const face = SHAPE.map((p) => w(p[0], p[1]));
    const flat = (ring) => poly(ring.map((q) => w(q.u, q.v)));
    const disc = (cu, cv, r) => poly(Array.from({ length: 14 }, (_, k) => w(cu + r * Math.cos((k / 14) * 6.283), cv + r * Math.sin((k / 14) * 6.283))));
    t.body.sil.setAttribute("d", poly(hull(face.concat(SHAPE.map((p) => wb(p[0], p[1]))))));
    t.body.cr.setAttribute("d", poly(face));
    t.head.setAttribute("d", open([w(9, 0), w(14, 7), w(W - 14, 7), w(W - 9, 0)]));
    t.label.setAttribute("d", flat(rrect(5, 11, W - 5, H - 4, 2.5, 4)));
    t.win.setAttribute("d", flat(rrect(17, 15, W - 17, 25, 4, 4)));
    t.hubs.setAttribute("d", disc(23, 20, 3.4) + disc(W - 23, 20, 3.4));
    t.code.forEach((el, k) => place(el, w(W / 2 + (k - 4) * 3.4, H - 8)));
  }

  const B = register(stage, (_dt, now) => {
    let m = false;
    for (const t of tapes) { draw(t, tval(t.a, now), tval(t.z, now)); if (!tdone(t.a, now) || !tdone(t.z, now)) m = true; }
    return m;
  });
  bag.add(B.unregister);

  // hit bands along the tapes' top edges at a fixed reference lean: they never move, and nothing draws them
  const top = (i) => P(W / 2, i * G + H * Math.sin(rad(REF)), H * Math.cos(rad(REF)));
  const c0 = top(0), c1 = top(1), d = [c1[0] - c0[0], c1[1] - c0[1]];
  const px0 = P(0, 0, 0), px1 = P(1, 0, 0), ex = [px1[0] - px0[0], px1[1] - px0[1]];
  const HALF = W / 2 + 6, det = d[0] * ex[1] - d[1] * ex[0];
  function hit([x, y]) {
    const qx = x - c0[0], qy = y - c0[1];
    const s = (qx * ex[1] - qy * ex[0]) / det, r = (d[0] * qy - d[1] * qx) / det;
    if (Math.abs(r) > HALF || s < -0.6 || s > N + 1.5) return -1;
    return clamp(Math.round(s), 0, N - 1);
  }

  let act = null;
  function setActive(a) {
    if (a === act) return;
    const now = performance.now(), from = a >= 0 ? a : act ?? STAR;
    act = a;
    for (const t of tapes) {
      const i = t.i, delay = Math.abs(i - from) * stag;
      const th = a < 0 ? REST[i] : i < a ? BACK : i > a ? FWD : 6;
      tset(t.a, th, now, delay);
      tset(t.z, a < 0 ? (i === STAR ? OUT : 0) : i === a ? LIFT : 0, now, delay);
      const on = a < 0 ? i === STAR : i === a;
      t.body.sil.classList.toggle("hi", on);
      t.code[i].setAttribute("class", on ? "dot" : "dot m");
    }
    read.textContent = a < 0 ? "rest" : `ep ${String(a + 1).padStart(2, "0")}`;
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
  name: "tapes",
  means: "A podcast's archive of cassettes in a rack: the episode under the pointer slides up out of it, and its neighbours lean away.",
  rules: [1, 2, 5, 10],
  range: [0, 40, 90],
  tour: [[204, 149], [150, 178], [262, 120], null],
  mount,
});
