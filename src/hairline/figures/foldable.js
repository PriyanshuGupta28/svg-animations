/**
 * Foldable: a flip phone standing half-open on the desk like a tiny laptop,
 * the hinge across its middle, one screen running over the fold: content up
 * top, a scrubber, three buttons and a home bar below, a punch-hole camera at
 * the top edge. The pointer's x scrubs the fold on a spring, from nearly
 * closed to the slider's widest; the screen's rows ride each half. At rest it
 * stands open at 110°, the fold and the hinge's knuckle bright. The slider is
 * the widest the fold opens, in degrees.
 */
const {
  Cam, circ, clamp, fit, hull, lerp, open, poly, proj, rad, rrect, run, seg,
  spring, stepS, disposer, mk, pointer, register, solid,
} = HL;

const W = 70, L = 74, T = 3.2, MIN = 18, REST = 110, X0 = 110, X1 = 350;

/** A half's outline: big corners at its free end, tight ones at the hinge. */
function half(b) {
  const big = rrect(b, b, W - b, L - b, 10 - b, 6), small = rrect(b, b, W - b, L - b, 1.6 - b / 2, 6);
  return big.map((q, i) => (q.v < L / 2 ? small[i] : q));
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let max = value, px = null;
  const C = Cam(45, 0.5, 1.82);
  fit(C, [[0, -L, 0], [W, -L, 0], [0, L, 0], [W, L, 0], [0, 0, T + L], [W, 0, T + L]], 200, 166);
  const P = proj(C);
  // toward the eye: the world direction the projection flattens, taken upward
  const o = P(0, 0, 0), [a, b, c] = [P(1, 0, 0), P(0, 1, 0), P(0, 0, 1)].map((p) => [p[0] - o[0], p[1] - o[1]]);
  let eye = [b[0] * c[1] - c[0] * b[1], c[0] * a[1] - a[0] * c[1], a[0] * b[1] - b[0] * a[1]];
  if (eye[2] < 0) eye = eye.map((e) => -e);

  const ring = half(0), inner = half(1.1);
  // the screen's edge: open across the hinge, so it reads as one glass over the fold
  const se = run(rrect(3, -10, W - 3, L - 3, 7, 6), (q) => q.v >= 0);
  const edge = [{ u: se[0].u, v: 0.6 }, ...se, { u: se[se.length - 1].u, v: 0.6 }];
  const dot = (cu, cv, r) => circ(r, 14).map((q) => ({ u: cu + q.u, v: cv + q.v }));
  const lid = { // content: a media block, three rows, the camera punch
    loops: [rrect(7, 30, W - 7, L - 13, 4, 4), dot(W / 2, L - 6.5, 1.5)],
    lines: [[7, 22, W - 7], [7, 16, W * 0.55], [7, 10, W - 22]],
  };
  const base = { // controls: a scrubber, three buttons, two rows and the home bar
    loops: [dot(W / 2 - 17, 27, 5), dot(W / 2, 27, 5), dot(W / 2 + 17, 27, 5)],
    lines: [[7, 11, W - 7], [10, 44, W - 10], [10, 51, W * 0.6], [W / 2 - 9, L - 5, W / 2 + 9]],
  };

  const g = mk("g", {}, svg);
  [base, lid].forEach((h) => {
    const pg = mk("g", {}, g), el = solid(pg);
    Object.assign(h, { pg, el, scr: mk("path", { class: "nf lo" }, pg), ui: mk("path", { class: "nf lo" }, pg) });
  });
  // the fold where the two screens meet, on the base; and the knuckle at the hinge's end
  const fold = mk("path", { class: "nf" }, base.pg);
  const knuckle = mk("path", { class: "sil" }, g);
  knuckle.setAttribute("d", poly(circ(T * 0.8, 16).map((q) => P(W + 0.5, -T * 0.35 + q.u, T * 0.5 + q.v))));

  const at = (f, u, v, w) => P(u, v * f.d[0] + w * f.b[0], T + v * f.d[1] + w * f.b[1]);
  /** One half as a slab in the frame f: silhouette, crease on the face toward the eye, and the screen when it shows. */
  function slab(h, f) {
    const scr = -(f.b[0] * eye[1] + f.b[1] * eye[2]) > 0, w = scr ? 0 : T;
    h.el.sil.setAttribute("d", poly(hull(ring.map((q) => at(f, q.u, q.v, 0)).concat(ring.map((q) => at(f, q.u, q.v, T))))));
    const wall = (q) => q.nu * eye[0] + q.nv * (f.d[0] * eye[1] + f.d[1] * eye[2]) > 0;
    h.el.cr.setAttribute("d", open(run(inner, wall).map((q) => at(f, q.u, q.v, w))));
    h.scr.setAttribute("d", scr ? open(edge.map((q) => at(f, q.u, q.v, 0))) : "");
    h.ui.setAttribute("d", scr ? h.loops.map((lp) => poly(lp.map((q) => at(f, q.u, q.v, 0)))).join("")
      + h.lines.map(([u0, v, u1]) => seg(at(f, u0, v, 0), at(f, u1, v, 0))).join("") : "");
  }
  const F0 = { d: [1, 0], b: [0, -1] };
  slab(base, F0);
  fold.setAttribute("d", seg(at(F0, 4, 0.4, 0), at(F0, W - 4, 0.4, 0)));

  const sp = spring(REST);
  let drawn = NaN, behind = null;
  function draw() {
    const phi = sp.x;
    if (phi === drawn) return;
    drawn = phi;
    const cs = Math.cos(rad(phi)), sn = Math.sin(rad(phi));
    slab(lid, { d: [cs, sn], b: [-sn, cs] });
    // leaning back, the lid is behind the base; leaning over it, in front
    if ((phi > 90) !== behind) { behind = phi > 90; if (behind) lid.pg.after(base.pg); else base.pg.after(lid.pg); g.append(knuckle); }
  }

  const B = register(stage, (dt) => { const m = stepS(sp, dt); draw(); return m; });
  bag.add(B.unregister);

  function retarget() {
    sp.t = px === null ? REST : lerp(MIN, max, clamp((px - X0) / (X1 - X0), 0, 1));
    lid.el.sil.classList.toggle("hi", px !== null);
    fold.classList.toggle("hi", px === null); knuckle.classList.toggle("hi", px === null);
    read.textContent = px === null ? "rest" : `fold ${Math.round(sp.t)}°`;
    B.wake();
  }

  bag.add(pointer(stage, { move: (p) => { px = p[0]; retarget(); }, leave: () => { px = null; retarget(); } }));
  bag.add(() => svg.replaceChildren());
  draw();
  retarget();

  return {
    set: (v) => { max = v; retarget(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "foldable",
  means: "A foldable phone standing half-open: the pointer's x folds it, from nearly shut to flat, and the screen bends with it.",
  rules: [1, 3, 5, 8],
  range: [140, 160, 180],
  tour: [[140, 200], [330, 200], [230, 200], null],
  mount,
});
