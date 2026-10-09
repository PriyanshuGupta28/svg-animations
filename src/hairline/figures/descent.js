/**
 * Descent: gradient descent as a marble on a pin-cushion. A square tray holds
 * a grid of short pillars whose heights make a landscape with two valleys, and
 * a marble rests in the shallower one. The pointer, projected onto a fixed
 * plane, presses a dip into the surface: each pillar sinks by its distance to
 * it, on its own spring, down to a floor of no change. The marble then walks
 * downhill, cell by cell on the target heights, to the lowest point it can
 * reach, and rolls there on a spring. The marble is the bright mark. The
 * slider is the dip's radius, in cells.
 */
const {
  Cam, clamp, facing, fit, hull, lerp, open, poly, prism, proj, rings, rrect, ringAt, run, unproj,
  spring, stepS, disposer, mk, pointer, put, register, solid,
} = HL;

const N = 9, CELL = 14, FOOT = 11, EXT = N * CELL, PAD = 7, WALL = 7, DIP = 28, MR = 7, ZHIT = 12;
const REST = [2, 5];

/** The share of the full dip at u radii from the pointer: 1 at the centre, 0 at the edge and beyond. */
const press = (u) => (u >= 1 ? 0 : (1 - u * u) ** 2);
const G = (u, v, cu, cv, s) => Math.exp(-((u - cu) ** 2 + (v - cv) ** 2) / s);
/** The landscape: a slope falling toward the viewer, with a deep valley to the right and a shallower one to the left. */
const land = (u, v) => 3 + 24 * (1 - (u + v) / 2) - 13 * G(u, v, 0.72, 0.4, 0.03) - 9 * G(u, v, 0.28, 0.62, 0.025) + 6 * G(u, v, 0.5, 0.52, 0.02);

/** A run of points ordered left to right on screen. */
const LR = (pts) => (pts[0][0] <= pts[pts.length - 1][0] ? pts : pts.slice().reverse());

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  const C = Cam(45, 0.5, 1.6);
  fit(C, [[-PAD, -PAD, 0], [EXT + PAD, EXT + PAD, 0], [EXT + PAD, -PAD, 0], [-PAD, EXT + PAD, 0], [0, 0, 30]], 200, 166);
  const P = proj(C), front = facing(C);
  let R = value * CELL, over = null;

  // The tray: a block whose mouth is drawn first, the pillars inside it, then the near wall over them.
  const g = mk("g", {}, svg);
  const outer = rrect(-PAD, -PAD, EXT + PAD, EXT + PAD, 9, 6), inner = rrect(-PAD + 3, -PAD + 3, EXT + PAD - 3, EXT + PAD - 3, 6, 6);
  mk("path", { d: poly(hull(ringAt(P, outer, -4).concat(ringAt(P, outer, WALL)))), class: "sil" }, g);
  mk("path", { d: poly(ringAt(P, inner, WALL)), class: "nf lo" }, g);

  const cols = [], at = (i, j) => cols[clamp(i, 0, N - 1) * N + clamp(j, 0, N - 1)];
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const h0 = land(i / (N - 1), j / (N - 1));
    const x0 = i * CELL + (CELL - FOOT) / 2, y0 = j * CELL + (CELL - FOOT) / 2;
    const [ring, crease] = rings(x0, y0, x0 + FOOT, y0 + FOOT, 2.6, 0.9);
    cols[i * N + j] = { i, j, h0, ring, crease, sp: spring(h0, { eps: 0.04 }), el: null, drawn: NaN };
  }
  // diagonal by diagonal from the far corner, so appending is painting back to front
  for (let s = 0; s <= 2 * (N - 1); s++) for (let i = 0; i < N; i++) {
    const j = s - i;
    if (j >= 0 && j < N) at(i, j).el = solid(g);
  }

  const iF = LR(ringAt(P, run(inner, front), WALL)), oT = LR(ringAt(P, run(outer, front), WALL)), oB = LR(ringAt(P, run(outer, front), -4));
  mk("path", { d: poly([...iF, oT[oT.length - 1], ...oB.slice().reverse(), oT[0]]), class: "fo" }, g);
  mk("path", { d: open(iF), class: "nf" }, g);
  mk("path", { d: open([oT[0], ...oB, oT[oT.length - 1]]), class: "nf sil" }, g);

  // The marble: a disc for the sphere's outline and the near half of its equator, moved in the paint
  // order to just after the pillar it sits on, so the pillars in front still cover it.
  const marble = mk("g", {}, g);
  const ball = mk("ellipse", { class: "sil hi" }, marble), eq = mk("path", { class: "nf lo" }, marble);
  const RS = Math.abs(P(MR / Math.SQRT2, -MR / Math.SQRT2, 0)[0] - P(0, 0, 0)[0]);
  const mx = spring((REST[0] + 0.5) * CELL), my = spring((REST[1] + 0.5) * CELL);
  let mt = REST, mcell = null, mdrawn = "";

  /** The surface under a world point: the pillars' heights, blended between cell centres. */
  function surface(x, y) {
    const fx = clamp(x / CELL - 0.5, 0, N - 1), fy = clamp(y / CELL - 0.5, 0, N - 1);
    const i = Math.min(Math.floor(fx), N - 2), j = Math.min(Math.floor(fy), N - 2), a = fx - i, b = fy - j;
    return lerp(lerp(at(i, j).sp.x, at(i + 1, j).sp.x, a), lerp(at(i, j + 1).sp.x, at(i + 1, j + 1).sp.x, a), b);
  }
  function drawMarble() {
    const c = at(Math.floor(mx.x / CELL), Math.floor(my.x / CELL));
    if (c !== mcell) { mcell = c; c.el.g.after(marble); }
    const [sx, sy] = P(mx.x, my.x, surface(mx.x, my.x) + MR), key = sx + "," + sy;
    if (key === mdrawn) return;
    mdrawn = key;
    ball.setAttribute("cx", sx); ball.setAttribute("cy", sy); ball.setAttribute("rx", RS); ball.setAttribute("ry", RS);
    eq.setAttribute("d", `M${sx - RS} ${sy}A${RS} ${RS / 2} 0 0 0 ${sx + RS} ${sy}`);
  }
  function drawCol(c) {
    const h = Math.max(1, c.sp.x);
    if (h === c.drawn) return;
    c.drawn = h;
    put(c.el, prism(P, front, c.ring, c.crease, 0, h));
  }

  const B = register(stage, (dt) => {
    let m = stepS(mx, dt) | stepS(my, dt);
    for (const c of cols) { if (stepS(c.sp, dt)) m = true; drawCol(c); }
    drawMarble();
    return !!m;
  });
  bag.add(B.unregister);

  /** Steepest descent on the target heights, from the marble's target cell to a local minimum. */
  function descend([i, j]) {
    for (;;) {
      let best = at(i, j);
      for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
        const ni = i + di, nj = j + dj;
        if (ni >= 0 && nj >= 0 && ni < N && nj < N && at(ni, nj).sp.t < best.sp.t - 0.01) best = at(ni, nj);
      }
      if (best.i === i && best.j === j) return [i, j];
      i = best.i; j = best.j;
    }
  }

  function retarget() {
    for (const c of cols) {
      if (!over) { c.sp.t = c.h0; continue; }
      const dx = (c.i + 0.5) * CELL - over[0], dy = (c.j + 0.5) * CELL - over[1];
      // the pressed floor still slopes to the centre, so the marble never stalls on a flat
      const p = press(Math.hypot(dx, dy) / R);
      c.sp.t = p > 0 ? Math.max(1 + 4 * (1 - p), c.h0 - DIP * p) : c.h0;
    }
    mt = over ? descend(mt) : REST;
    mx.t = (mt[0] + 0.5) * CELL; my.t = (mt[1] + 0.5) * CELL;
    read.textContent = over ? `loss ${(at(mt[0], mt[1]).sp.t / 30).toFixed(2)}` : "rest";
    B.wake();
  }

  bag.add(pointer(stage, {
    move: (p) => {
      const q = unproj(C, p[0], p[1], ZHIT);
      over = q[0] < -PAD || q[1] < -PAD || q[0] > EXT + PAD || q[1] > EXT + PAD ? null : q;
      retarget();
    },
    leave: () => { over = null; retarget(); },
  }));
  bag.add(() => svg.replaceChildren());
  retarget();

  return {
    set: (v) => { R = v * CELL; if (over) retarget(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "descent",
  means: "Gradient descent: the pointer presses a dip into a pin-cushion landscape and the marble rolls downhill into the lowest place it can reach.",
  rules: [1, 3, 5, 8],
  range: [2, 3.5, 5],
  tour: [[184, 158], [240, 170], [192, 202], null],
  mount,
});
