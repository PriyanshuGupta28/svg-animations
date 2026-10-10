/**
 * Brochure: "above the fold" as a tri-fold brochure standing on the desk,
 * Z-folded, three tall panels hinged at two shared edges. The cover carries a
 * picture block over a few rules, the middle panel a column of rules, the last
 * a block at its foot. The pointer's x unfolds it on one spring: the first
 * fold opens, then the second follows, each angle clamped between nearly shut
 * and the slider's widest. The middle panel stands still and splits the
 * others, so the panel folded toward the eye is always painted after it and
 * the one folded away always before it. At rest it stands part open and the
 * second fold, its hinge and the panel it swings, is bright. The slider is
 * the widest a fold opens, in degrees.
 */
const {
  Cam, clamp, fit, hull, lerp, poly, proj, rad, rrect, seg,
  spring, stepS, disposer, mk, pointer, register, solid,
} = HL;

const PW = 50, H = 100, T = 1.4, MIN = 22, REST = 0.55, X0 = 100, X1 = 300, LAG = 0.6;
/** Each panel's printing in its own plane (u across, v up): blocks [u0, v0, u1, v1] and rules [u0, v, u1]. */
const PRINT = [
  { blocks: [[6, H - 40, PW - 6, H - 8]], rules: [[6, H - 48, PW - 6], [6, H - 54, PW - 14], [6, H - 66, PW - 10], [6, H - 72, PW - 20]] },
  { blocks: [], rules: [[6, H - 12, PW - 18], [6, H - 22, PW - 6], [6, H - 28, PW - 8], [6, H - 34, PW - 16], [6, H - 48, PW - 6], [6, H - 54, PW - 12], [6, H - 60, PW - 22]] },
  { blocks: [[10, 10, PW - 10, 20]], rules: [[6, H - 12, PW - 10], [6, H - 18, PW - 6], [6, H - 24, PW - 18], [6, H - 38, PW - 8]] },
];

/** The two fold angles at scrub t: the first opens over most of the scrub, the second follows behind it. */
const folds = (t, max) => [lerp(MIN, max, clamp(t / LAG, 0, 1)), lerp(MIN, max, clamp((t - (1 - LAG)) / LAG, 0, 1))];

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let max = value, px = null;
  const C = Cam(45, 0.5, 1.95);
  // each panel's frame: its hinge point, its direction across, for fold angles a (cover) and b (last)
  const frames = (a, b) => [
    { o: [-PW / 2, 0], d: [Math.cos(rad(a)), Math.sin(rad(a))] },
    { o: [-PW / 2, 0], d: [1, 0] },
    { o: [PW / 2, 0], d: [-Math.cos(rad(b)), -Math.sin(rad(b))] },
  ];
  const box = [];
  for (let a = MIN; a <= 180; a += 10) frames(a, a).forEach(({ o, d }) => [0, H].forEach((z) => box.push([o[0] + d[0] * PW, o[1] + d[1] * PW, z], [o[0], o[1], z])));
  fit(C, box, 200, 162);
  const P = proj(C);
  // toward the eye: the world direction the projection flattens, taken upward
  const z0 = P(0, 0, 0), [ax, ay, az] = [P(1, 0, 0), P(0, 1, 0), P(0, 0, 1)].map((p) => [p[0] - z0[0], p[1] - z0[1]]);
  let eye = [ay[0] * az[1] - az[0] * ay[1], az[0] * ax[1] - ax[0] * az[1], ax[0] * ay[1] - ay[0] * ax[1]];
  if (eye[2] < 0) eye = eye.map((e) => -e);

  const ring = rrect(0, 0, PW, H, 2.2, 4), inner = rrect(0.9, 0.9, PW - 0.9, H - 0.9, 1.5, 4);
  const g = mk("g", {}, svg);
  const panels = PRINT.map((pr) => {
    const el = solid(mk("g", {}, g));
    return { pr, el, ink: mk("path", { class: "nf lo" }, el.g) };
  });
  const hinges = [mk("path", { class: "nf" }, g), mk("path", { class: "nf" }, g)];
  // the middle panel splits the other two: paint the one on the far side of its plane first
  const toEye = eye[1] > 0, [near, far] = toEye ? [0, 2] : [2, 0];
  g.append(panels[far].el.g, panels[1].el.g, hinges[1], panels[near].el.g, hinges[0]);

  function drawPanel(p, { o, d }) {
    const n = [-d[1], d[0]], w = Math.sign(n[0] * eye[0] + n[1] * eye[1]) * T / 2 || T / 2;
    const at = (u, v, ww) => P(o[0] + d[0] * u + n[0] * ww, o[1] + d[1] * u + n[1] * ww, v);
    p.el.sil.setAttribute("d", poly(hull(ring.map((q) => at(q.u, q.v, -T / 2)).concat(ring.map((q) => at(q.u, q.v, T / 2))))));
    p.el.cr.setAttribute("d", poly(inner.map((q) => at(q.u, q.v, w))));
    p.ink.setAttribute("d", p.pr.blocks.map(([u0, v0, u1, v1]) => poly(rrect(u0, v0, u1, v1, 2.5, 3).map((q) => at(q.u, q.v, w)))).join("")
      + p.pr.rules.map(([u0, v, u1]) => seg(at(u0, v, w), at(u1, v, w))).join(""));
  }

  const sp = spring(REST, { eps: 0.002 });
  let drawn = NaN;
  function draw() {
    if (sp.x === drawn) return;
    drawn = sp.x;
    const [a, b] = folds(sp.x, max), fr = frames(a, b);
    panels.forEach((p, i) => drawPanel(p, fr[i]));
    hinges.forEach((h, i) => { const x = (i ? 1 : -1) * PW / 2; h.setAttribute("d", seg(P(x, 0, 0.6), P(x, 0, H - 0.6))); });
  }

  const B = register(stage, (dt) => { const m = stepS(sp, dt); draw(); return m; });
  bag.add(B.unregister);

  function retarget() {
    sp.t = px === null ? REST : clamp((px - X0) / (X1 - X0), 0, 1);
    const k = sp.t < 0.5 ? 0 : 1, ang = folds(sp.t, max)[k];
    // the fold being opened is the one bright thing: its hinge and the panel it swings
    const on = px === null ? 1 : k;
    hinges.forEach((h, i) => h.classList.toggle("hi", i === on));
    panels.forEach((p, i) => p.el.sil.classList.toggle("hi", i === on * 2));
    read.textContent = px === null ? "rest" : `fold ${k + 1} · ${Math.round(ang)}°`;
    drawn = NaN;
    B.wake();
  }

  bag.add(pointer(stage, { move: (p) => { px = p[0]; retarget(); }, leave: () => { px = null; retarget(); } }));
  bag.add(() => svg.replaceChildren());
  retarget();

  return {
    set: (v) => { max = v; retarget(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "brochure",
  means: "Above the fold as a tri-fold brochure standing on the desk: the pointer unfolds its panels, one fold and then the next.",
  rules: [3, 5, 6, 8],
  range: [140, 160, 180],
  tour: [[300, 160], [120, 160], [230, 160], null],
  mount,
});
