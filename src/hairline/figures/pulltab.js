/**
 * Pulltab: one standard can lying on the desk, close up, its lid turned toward
 * the viewer: the chime, the shoulder necking in to the rim, the countersunk
 * lid, the rivet, the pull tab with its finger hole, and the scored opening.
 * The pointer's x lifts the tab's tail on its rivet, on a spring, clamped to
 * the max lift; its nose levers down and pushes the scored panel into the can,
 * the panel swinging on its hinge by the rivet. At rest the tab is half raised
 * and bright. The slider is the max lift, in degrees.
 */
const {
  Cam, circ, clamp, fillet, fit, hull, open, poly, proj, rad, rrect, run,
  spring, stepS, disposer, mk, pointer, register,
} = HL;

const R = 11, H = 41, AZ = 50, TILT = -20, HINGE = 0.05, PANEL = 0.22, PUSH = 1.3, REST = 0.5;
const PROFILE = [[-H, 0.8], [2.4 - H, 1], [-6.5, 1], [-1.6, 0.83], [0, 0.86]];
const U = circ(1, 72), R2 = Math.SQRT1_2;
/** The can's axis, out through the lid, turned AZ degrees off the screen's right toward the viewer; h across it on the desk. */
const AX = R2 * (Math.cos(rad(AZ)) + Math.sin(rad(AZ))), AY = R2 * (Math.sin(rad(AZ)) - Math.cos(rad(AZ)));
const HX = -AY, HY = AX, CB = Math.cos(rad(TILT)), SB = Math.sin(rad(TILT));

/** The lid's parts in the tab's own frame (p along the tab toward the opening, q across), in units of R. */
const TAB = rrect(-0.66, -0.27, 0.27, 0.27, 0.22, 4).map((q) => [q.u, q.v]);
const HOLE = rrect(-0.56, -0.15, -0.22, 0.15, 0.14, 4).map((q) => [q.u, q.v]);
const OPEN = fillet([[PANEL, -0.15], [0.64, -0.29], [0.64, 0.29], [PANEL, 0.15]], [0.08, 0.2, 0.2, 0.08], 4);
/** Whether a world direction faces the 2:1 camera at azimuth 45. */
const faces = ([x, y, z]) => (x + y) * R2 * 0.866 + z * 0.5 > 0;
/** Twice the signed area of a screen polygon. */
const area = (pts) => pts.reduce((s, [x, y], i) => { const [u, v] = pts[(i + 1) % pts.length]; return s + x * v - u * y; }, 0);

/**
 * A world point of the can's own frame: p and q on the lid, in units of R, p along the tab toward the opening
 * (TILT degrees off straight up); w along the axis, out of the lid. The lid's centre is at the origin, R above the desk.
 */
function L(p, q, w) {
  const pu = p * R, qu = q * R;
  const ph = pu * SB + qu * CB, pz = pu * CB - qu * SB;
  return [ph * HX + w * AX, ph * HY + w * AY, R + pz];
}
/** A ring of radius r round the axis at w, as lid points. */
const ringL = (r, w, ring = U) => ring.map((s) => L(s.u * r, s.v * r, w));

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let max = value, over = false;
  const C = Cam(45, 0.5, 3.3);
  fit(C, [...ringL(1, -H), ...ringL(1, 0), L(-0.7, 0, R), L(0.7, 0, -R)], 200, 166);
  const P = proj(C), pts = (list) => list.map((w) => P(...w));

  const g = mk("g", {}, svg);
  mk("path", { d: poly(hull(PROFILE.flatMap(([w, r]) => pts(ringL(r, w))))), class: "sil" }, g);
  const fr = run(U, (s) => faces([(s.u * SB + s.v * CB) * HX, (s.u * SB + s.v * CB) * HY, s.u * CB - s.v * SB]));
  mk("path", { d: open(pts(ringL(1, -6.5, fr))), class: "nf lo" }, g);
  // the panel, inside, then the lid as one plate with the opening cut through it, so the panel shows only through the hole
  const panel = mk("path", { class: "nf lo" }, g);
  const rimPts = pts(ringL(0.86, 0)), openPts = pts(OPEN.map(([p, q]) => L(p, q, -0.8)));
  if (Math.sign(area(rimPts)) === Math.sign(area(openPts))) openPts.reverse();
  mk("path", { d: poly(rimPts) + poly(openPts) }, g);
  mk("path", { d: poly(pts(ringL(0.76, -0.8))), class: "nf lo" }, g);
  mk("path", { d: poly(pts(ringL(0.075, -0.4))), class: "nf" }, g);
  const back = mk("path", { class: "lo" }, g), tab = mk("path", { class: "sil hi" }, g), hole = mk("path", { class: "nf lo" }, g);
  const rivet = mk("path", { class: "nf" }, g);

  const sp = spring(REST, { eps: 0.002 });
  let drawn = NaN;
  function draw() {
    const f = clamp(sp.x, 0, 1);
    if (f === drawn) return;
    drawn = f;
    const phi = rad(f * max), psi = Math.min(phi * PUSH, rad(80));
    // the tab turns on its rivet: the tail comes out of the lid, the nose goes down into it
    const tp = (shape, dw) => poly(pts(shape.map(([p, q]) => L(HINGE + (p - HINGE) * Math.cos(phi), q, -0.4 + dw + (HINGE - p) * R * Math.sin(phi)))));
    back.setAttribute("d", tp(TAB, -0.9));
    tab.setAttribute("d", tp(TAB, 0));
    hole.setAttribute("d", tp(HOLE, 0));
    rivet.setAttribute("d", tp(rrect(-0.06, -0.06, 0.06, 0.06, 0.06, 3).map((s) => [s.u, s.v]), 0.2));
    // the panel swings in on its hinge by the rivet
    panel.setAttribute("d", poly(pts(OPEN.map(([p, q]) => L(PANEL + (p - PANEL) * Math.cos(psi), q, -0.8 - (p - PANEL) * R * Math.sin(psi))))));
  }

  const B = register(stage, (dt) => {
    const m = stepS(sp, dt);
    draw();
    return m;
  });
  bag.add(B.unregister);

  function retarget(x) {
    over = x !== null;
    sp.t = over ? clamp((x - 110) / 180, 0, 1) : REST;
    read.textContent = over ? `tab ${Math.round(sp.t * 100)}%` : "rest";
    B.wake();
  }

  bag.add(pointer(stage, { move: (p) => retarget(p[0]), leave: () => retarget(null) }));
  bag.add(() => svg.replaceChildren());
  retarget(null);

  return {
    set: (v) => { max = v; drawn = NaN; B.wake(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "pulltab",
  means: "A can's pull tab up close: the pointer lifts the tab on its rivet, and its nose pushes the scored panel into the can.",
  rules: [3, 5, 8, 9],
  range: [50, 75, 100],
  tour: [[140, 160], [290, 160], [220, 160], null],
  mount,
});
