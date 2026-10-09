/**
 * Crowd: followers as pawns on a rounded plinth, each a foot, a tapered body
 * and a round head. At rest they cluster unevenly round one taller, bright
 * pawn, the influencer, and lean a little towards it. The pointer is put on
 * the ground; every pawn leans towards it and stands taller, the more the
 * nearer, on its own springs, and the nearest takes the bright stroke. The
 * slider is the radius, in cells.
 */
const {
  Cam, circ, clamp, facing, fit, hull, open, poly, prism, proj, rings, run, unproj, spring, stepS,
  mk, pointer, put, register, disposer, solid,
} = HL;

const N = 7, CELL = 16, EXT = N * CELL, PB = 6, LEAN = 11, H0 = 14, IN = [3, 2];

/** The share of the answer at u radii from the pointer: 1 → .31 at 42% → .09 beyond. */
const falloff = (u) =>
  u <= 0 ? 1 : u <= 0.417 ? 1 - (u / 0.417) * 0.6875 : u <= 1 ? 0.3125 - ((u - 0.417) / 0.583) * 0.2185 : 0.094;
/** A fixed scatter: a number in [0, 1) for each cell and salt. */
const hash = (i, j, s) => { const x = Math.sin(i * 127.1 + j * 311.7 + s * 74.7) * 43758.5453; return x - Math.floor(x); };

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  const C = Cam(45, 0.5, 1.9);
  fit(C, [[-6, -6, -PB], [EXT + 6, EXT + 6, -PB], [EXT + 6, -6, -PB], [-6, EXT + 6, -PB], [0, 0, 36], [EXT, 0, 36]], 200, 170);
  const P = proj(C), front = facing(C);
  let R = value * CELL, over = null;

  const g = mk("g", {}, svg);
  const [pr, pi] = rings(-6, -6, EXT + 6, EXT + 6, 10, 2.2);
  put(solid(g), prism(P, front, pr, pi, -PB, 0));

  // Who turned up: always the cells by the influencer, fewer further out.
  const pawns = [];
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const d = Math.hypot(i - IN[0], j - IN[1]), star = d === 0;
    if (!star && hash(i, j, 1) > (d < 1.6 ? 0.95 : d < 2.9 ? 0.7 : 0.3)) continue;
    const x = (i + 0.5) * CELL + (star ? 0 : (hash(i, j, 2) - 0.5) * 6), y = (j + 0.5) * CELL + (star ? 0 : (hash(i, j, 3) - 0.5) * 6);
    const s = star ? 1.4 : 0.85 + hash(i, j, 4) * 0.2;
    pawns.push({ i, j, x, y, s, star, lx: spring(0, { eps: 0.02 }), ly: spring(0, { eps: 0.02 }), h: spring(1, { eps: 0.005 }), drawn: "" });
  }
  // The rest pose: followers lean towards the influencer, the near ones more.
  const star = pawns.find((p) => p.star);
  for (const p of pawns) {
    const dx = star.x - p.x, dy = star.y - p.y, d = Math.hypot(dx, dy) || 1, k = p.star ? 0 : 2.6 * clamp(30 / d, 0.4, 1);
    p.rx = (dx / d) * k; p.ry = (dy / d) * k;
    p.lx.x = p.lx.t = p.rx; p.ly.x = p.ly.t = p.ry;
  }
  // Back to front by x + y.
  pawns.sort((a, b) => a.x + a.y - (b.x + b.y));
  for (const p of pawns) { const pg = mk("g", {}, g); p.el = [solid(pg), solid(pg), solid(pg)]; }

  const ring = (r) => circ(r, 16);
  function drawPawn(p) {
    const key = p.lx.x.toFixed(2) + p.ly.x.toFixed(2) + p.h.x.toFixed(3);
    if (key === p.drawn) return;
    p.drawn = key;
    const s = p.s, top = H0 * s * p.h.x, hr = 3.4 * s, hc = top + hr * 0.8;
    const sx = p.lx.x / (hc + hr), sy = p.ly.x / (hc + hr);
    const at = (rg, z) => rg.map((q) => P(p.x + q.u + sx * z, p.y + q.v + sy * z, z));
    const tap = (foot, z0, tp, z1, inner) => ({ sil: poly(hull(at(foot, z0).concat(at(tp, z1)))), crease: open(at(run(inner, front), z1)) });
    put(p.el[0], tap(ring(5 * s), 0, ring(5 * s), 2.4 * s, ring(4 * s)));
    put(p.el[1], tap(ring(3.3 * s), 2.4 * s, ring(1.6 * s), top, ring(1.1 * s)));
    let ball = [];
    for (let a = -1.2; a <= 1.21; a += 0.4) ball = ball.concat(at(ring(hr * Math.cos(a)), hc + hr * Math.sin(a)));
    put(p.el[2], { sil: poly(hull(ball)), crease: "" });
  }

  const B = register(stage, (dt) => {
    let m = false;
    for (const p of pawns) {
      if (stepS(p.lx, dt)) m = true;
      if (stepS(p.ly, dt)) m = true;
      if (stepS(p.h, dt)) m = true;
      drawPawn(p);
    }
    return m;
  });
  bag.add(B.unregister);

  function retarget() {
    let near = star, nd = Infinity;
    for (const p of pawns) {
      if (!over) { p.lx.t = p.rx; p.ly.t = p.ry; p.h.t = 1; continue; }
      const dx = over[0] - p.x, dy = over[1] - p.y, d = Math.hypot(dx, dy) || 1, f = falloff(d / R);
      const lean = Math.min(LEAN * f, d * 0.6);
      p.lx.t = (dx / d) * lean; p.ly.t = (dy / d) * lean; p.h.t = 1 + 0.8 * f;
      if (d < nd) { nd = d; near = p; }
    }
    for (const p of pawns) for (const e of p.el) e.sil.classList.toggle("hi", p === near);
    read.textContent = !over ? "rest" : near.star ? "influencer" : `follower ${near.i + 1}·${near.j + 1}`;
    B.wake();
  }

  bag.add(pointer(stage, {
    move: (q) => {
      const w = unproj(C, q[0], q[1], 0);
      over = w[0] < -10 || w[1] < -10 || w[0] > EXT + 10 || w[1] > EXT + 10 ? null : w;
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
  name: "crowd",
  means: "Followers crowd round one influencer; near the pointer they lean towards it and stand taller.",
  rules: [1, 3, 5, 8],
  range: [1.5, 3, 5],
  tour: [[264, 185], [198, 238], [92, 182], null],
  mount,
});
