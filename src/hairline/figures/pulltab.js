/**
 * Pulltab: one standard can standing on the desk, close up: the chime at its
 * foot, the shoulder necking in to the rolled rim, the countersunk lid, the
 * rivet, the pull tab with its finger hole, and the scored opening to the
 * front right. The pointer's x lifts the tab's tail on its rivet, on a spring,
 * clamped to the max lift; its nose levers down and pushes the scored panel
 * into the can, the panel swinging on its hinge by the rivet. At rest the tab
 * is just caught up and bright. The slider is the max lift, in degrees.
 */
const {
  Cam, circ, clamp, facing, fillet, fit, hull, open, poly, proj, rad, ringAt, rrect, run,
  spring, stepS, disposer, mk, pointer, register,
} = HL;

const R = 11, H = 38, HINGE = 0.05, PANEL = 0.22, PUSH = 1.3, REST = 0.3, TK = 0.9;
/** The can's profile, bottom up, as [height, radius in units of R]: chime, body, shoulder, neck, rim. */
const PROFILE = [[0, 0.8], [2.4, 1], [H - 6.5, 1], [H - 1.6, 0.83], [H, 0.86]];
const R2 = Math.SQRT1_2;

/** The lid's parts in the tab's own frame (p along the tab toward the opening, q across), in units of R. */
const TAB = rrect(-0.66, -0.27, 0.27, 0.27, 0.22, 4).map((q) => [q.u, q.v]);
const HOLE = rrect(-0.56, -0.15, -0.22, 0.15, 0.14, 4).map((q) => [q.u, q.v]);
const OPEN = fillet([[PANEL, -0.15], [0.64, -0.29], [0.64, 0.29], [PANEL, 0.15]], [0.08, 0.2, 0.2, 0.08], 4);
/** Twice the signed area of a screen polygon. */
const area = (pts) => pts.reduce((s, [x, y], i) => { const [u, v] = pts[(i + 1) % pts.length]; return s + x * v - u * y; }, 0);

/** A world point on the lid: p along x (down to the right on screen) and q along y, in units of R; w up from the lid's top. */
const L = (p, q, w) => [p * R, q * R, H + w];

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let max = value, over = false;
  const C = Cam(45, 0.5, 6.5);
  const D = R * R2;
  fit(C, [[D, D, 0], [D, -D, 0], [-D, D, 0], [-D, -D, H], [D, -D, H], [-D, D, H], L(-0.4, 0, 8)], 200, 166);
  const P = proj(C), front = facing(C), pts = (list) => list.map((w) => P(...w));
  const ring = (r) => circ(r * R, 72);

  // the body: its silhouette, and one crease where the shoulder starts
  const g = mk("g", {}, svg);
  mk("path", { d: poly(hull(PROFILE.flatMap(([z, r]) => ringAt(P, ring(r), z)))), class: "sil" }, g);
  // the panel, inside, then the neck's near wall and the lid as one plate with the opening cut through it, so the panel shows only through the hole
  const panel = mk("path", { class: "nf lo" }, g);
  mk("path", { d: poly([...ringAt(P, run(ring(0.84), front), H), ...ringAt(P, run(ring(0.96), front), H - 5).reverse()]), class: "fo" }, g);
  mk("path", { d: open(ringAt(P, run(ring(1), front), H - 6.5)), class: "nf lo" }, g);
  const rimPts = ringAt(P, ring(0.86), H), openPts = pts(OPEN.map(([p, q]) => L(p, q, -0.8)));
  if (Math.sign(area(rimPts)) === Math.sign(area(openPts))) openPts.reverse();
  mk("path", { d: poly(rimPts) + poly(openPts) }, g);
  mk("path", { d: poly(ringAt(P, ring(0.76), H - 0.8)), class: "nf lo" }, g);
  mk("path", { d: poly(pts(circ(0.075, 12).map((s) => L(s.u, s.v, -0.4)))), class: "nf" }, g);
  const back = mk("path", { class: "lo" }, g), tab = mk("path", { class: "sil hi" }, g), hole = mk("path", { class: "nf lo" }, g);
  const rivet = mk("path", { class: "nf" }, g);

  const sp = spring(REST, { eps: 0.002 });
  let drawn = NaN;
  function draw() {
    const f = clamp(sp.x, 0, 1);
    if (f === drawn) return;
    drawn = f;
    const phi = rad(f * max), psi = Math.min(phi * PUSH, rad(80)), s = Math.sin(phi), c = Math.cos(phi);
    // the tab turns on its rivet: the tail comes up out of the lid, the nose goes down into it; its back sits a thickness under its face
    const tp = (shape, t) => poly(pts(shape.map(([p, q]) => L(HINGE + (p - HINGE) * c - (t * s) / R, q, -0.4 + (HINGE - p) * R * s - t * c))));
    back.setAttribute("d", tp(TAB, TK));
    tab.setAttribute("d", tp(TAB, 0));
    hole.setAttribute("d", tp(HOLE, 0));
    rivet.setAttribute("d", tp(rrect(-0.06, -0.06, 0.06, 0.06, 0.06, 3).map((q) => [q.u, q.v]), -0.2));
    // the panel swings in on its hinge by the rivet
    panel.setAttribute("d", poly(pts(OPEN.map(([p, q]) => L(PANEL + (p - PANEL) * Math.cos(psi), q, -0.8 - (p - PANEL) * R * Math.sin(psi))))));
  }

  const B = register(stage, (dt) => {
    const m = stepS(sp, dt);
    draw();
    return m;
  });
  bag.add(B.unregister);

  const caption = () => (over ? `tab ${Math.round(sp.t * max)}°` : "rest");
  function retarget(x) {
    over = x !== null;
    sp.t = over ? clamp((x - 110) / 180, 0, 1) : REST;
    read.textContent = caption();
    B.wake();
  }

  bag.add(pointer(stage, { move: (p) => retarget(p[0]), leave: () => retarget(null) }));
  bag.add(() => svg.replaceChildren());
  retarget(null);

  return {
    set: (v) => { max = v; drawn = NaN; read.textContent = caption(); B.wake(); },
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
