/**
 * Plinko: a load balancer as an upright plinko board on a stand. A ball waits
 * on the top rail; a triangle of pegs scatters what falls; six bins at the
 * foot hold stacked balls, the load each server carries. At rest the load is
 * lopsided and the fullest bin is bright. The pointer's x along the board
 * sets where balls are dropped: the rail ball follows it on a spring, and the
 * bins near it fill higher, the farther the fewer, each on its own spring, so
 * the load visibly shifts. The slider is the spread, in world units.
 */
const {
  Cam, circ, clamp, facing, fit, hull, poly, prism, proj, rings, rrect,
  spring, stepS, disposer, mk, pointer, put, register, solid,
} = HL;

const W = 180, H = 188, NB = 6, BIN = W / NB, BR = 6.6, D = 13.4, FZ = 8, FIN = 78, DROP = 18, LMAX = 10, RAIL = 176, BY = 8.5;
const REST = [4, 9, 6, 3, 2, 1], MARK = 1;

/** The share of the full load at u spreads from the pointer: a straight fall to none at one spread, and nothing past it. */
const falloff = (u) => clamp(1 - u, 0, 1);

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let R = value, xw = null;
  const C = Cam(45, 0.5, 1.12);
  fit(C, [[-14, -24, -8], [W + 14, 18, -8], [W + 14, -24, -8], [-14, 18, -8], [0, -6, H], [W, -6, H]], 200, 166);
  const P = proj(C), front = facing(C);
  const S = (P(0, 0, 0)[1] - P(0, 0, 1)[1]) / Math.cos(Math.asin(0.5));
  /** A ring drawn upright in the plane y = const: u along x, v up z. */
  const up = (ring, y, dx = 0, dz = 0) => ring.map((q) => P(q.u + dx, y, q.v + dz));

  const g = mk("g", {}, svg);
  put(solid(g), prism(P, front, ...rings(-14, -24, W + 14, 18, 9, 2.2), -8, 0));
  // the board: a thick upright plate with a frame round its face
  const face = rrect(0, 0, W, H, 10, 6);
  put(solid(g), { sil: poly(hull(up(face, 0).concat(up(face, -6)))), crease: poly(up(rrect(4, 4, W - 4, H - 4, 7, 6), 0)) });
  /** A peg or a rail, standing out of the face from y 0 to y d. */
  const stud = (ring, d, dx, dz) => put(solid(g), { sil: poly(hull(up(ring, 0, dx, dz).concat(up(ring, d, dx, dz)))), crease: poly(up(ring, d, dx, dz)) });
  stud(rrect(8, RAIL - 3, W - 8, RAIL, 1.5, 4), 16, 0, 0);
  for (let r = 0; r < 5; r++) for (let k = 0; k < r + 2; k++) stud(circ(2.4, 12), 7, W / 2 + (k - (r + 1) / 2) * 27, RAIL - 18 - r * 14);
  stud(rrect(4, FZ - 4, W - 4, FZ, 1.5, 4), 16, 0, 0);

  // the bins: low fins, and the balls standing proud of them, painted after
  for (let i = 0; i <= NB; i++) { const x = clamp(i * BIN, 3, W - 3); put(solid(g), prism(P, front, ...rings(x - 1.2, 0, x + 1.2, 6, 1.2, 0.5), FZ, FIN)); }
  const bins = [];
  for (let i = 0; i < NB; i++) {
    const balls = [];
    for (let j = 0; j < LMAX + 1; j++) balls.push(mk("ellipse", { rx: 0, ry: 0 }, g));
    bins.push({ i, balls, sp: spring(REST[i], { eps: 0.01 }), drawn: NaN });
  }
  // the ball waiting on the rail
  const held = mk("ellipse", { rx: BR * S, ry: BR * S }, g), hx = spring(BIN * (MARK + 0.5));

  function drawBin(b) {
    const L = b.sp.x;
    if (L === b.drawn) return;
    b.drawn = L;
    b.balls.forEach((el, j) => {
      const f = clamp(L - j, 0, 1), on = L > j + 0.08;
      const [cx, cy] = P((b.i + 0.5) * BIN + ((j % 2) - 0.5) * D, BY, FZ + BR + Math.floor(j / 2) * D + DROP * (1 - f));
      el.setAttribute("rx", on ? BR * S : 0); el.setAttribute("ry", on ? BR * S : 0);
      el.setAttribute("cx", cx); el.setAttribute("cy", cy);
    });
  }
  let hd = NaN;
  const B = register(stage, (dt) => {
    let m = stepS(hx, dt);
    for (const b of bins) { if (stepS(b.sp, dt)) m = true; drawBin(b); }
    if (hx.x !== hd) { hd = hx.x; const [cx, cy] = P(hx.x, BY, RAIL + BR); held.setAttribute("cx", cx); held.setAttribute("cy", cy); }
    return m;
  });
  bag.add(B.unregister);

  function retarget() {
    const a = xw === null ? MARK : clamp(Math.floor(xw / BIN), 0, NB - 1);
    for (const b of bins) {
      b.sp.t = xw === null ? REST[b.i] : Math.round(LMAX * falloff(Math.abs((b.i + 0.5) * BIN - xw) / R));
      b.balls.forEach((el) => el.setAttribute("class", b.i === a ? "hi" : ""));
    }
    hx.t = xw === null ? BIN * (MARK + 0.5) : clamp(xw, 10, W - 10);
    read.textContent = xw === null ? "rest" : "bin " + (a + 1);
    B.wake();
  }

  // The pointer on the board's face plane, which never moves: x from the screen x, z from the screen y.
  const o = P(0, 6.5, 0), ux = P(1, 6.5, 0)[0] - o[0], uy = P(1, 6.5, 0)[1] - o[1], dz = P(0, 0, 0)[1] - P(0, 0, 1)[1];
  bag.add(pointer(stage, {
    move: ([sx, sy]) => {
      const x = (sx - o[0]) / ux, z = (o[1] + x * uy - sy) / dz;
      xw = x < -8 || x > W + 8 || z < -4 || z > H + 6 ? null : clamp(x, 0, W);
      retarget();
    },
    leave: () => { xw = null; retarget(); },
  }));
  bag.add(() => svg.replaceChildren());
  retarget();

  return {
    set: (v) => { R = v; retarget(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "plinko",
  means: "A load balancer as a plinko board: where the pointer drops the balls, the bins below it fill, the farther the fewer.",
  rules: [1, 3, 5, 8],
  range: [40, 75, 120],
  tour: [[133, 124], [229, 171], [181, 148], null],
  mount,
});
