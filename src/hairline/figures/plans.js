/**
 * Plans: SaaS pricing tiers as three nested crates, free inside pro inside
 * enterprise, each a slatted crate of four hinged walls on a floor. The
 * pointer picks a crate, read from each crate's rest top, which never moves;
 * the crates outside it fold their walls down flat, staggered outwards from
 * the pick on the 700ms tween, and the picked crate takes the bright edge.
 * At rest the enterprise crate stands ajar on its near-left side and the free
 * crate at the heart is bright. The slider is how far the walls fold, in
 * degrees.
 */
const {
  Cam, clamp, fillet, fit, poly, prism, proj, rad, rings, seg, unproj, facing,
  tween, tset, tval, tdone, disposer, mk, pointer, put, register, solid,
} = HL;

/** The crates, inside out: [half width, wall height, floor height, name]. */
const K = [[14, 14, 4, "free"], [30, 18, 2, "pro"], [50, 26, 0, "enterprise"]];
const SIDES = [[1, 0], [0, 1], [-1, 0], [0, -1]], T = 1.6, V = [0.612, 0.612, 0.5];
/** The rest pose, per crate and side (+x, +y, -x, -y): enterprise ajar on its near-left wall. */
const REST = [[0, 0, 0, 0], [0, 6, 0, 0], [14, 40, 0, 0]];

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let open = value;
  const C = Cam(45, 0.5, 1.78);
  const far = K[2][0] + K[2][1];
  fit(C, [[-far, -far, 0], [far, far, 0], [far, -far, 0], [-far, far, 0], [-50, -50, 26]], 200, 170);
  const P = proj(C), front = facing(C);

  /** A wall's outline in its own plane (s along the hinge, v up the wall). */
  const outline = (h, H) => fillet([[-h, 0], [h, 0], [h, H], [-h, H]], [0.6, 0.6, 2.4, 2.4]);
  /** Crate i, side j, folded phi degrees outward about its foot: the visible face, the hidden one, and its slat seam. */
  function wall(i, j, phi) {
    const [h, H, f] = K[i], [nx, ny] = SIDES[j], tx = -ny, ty = nx;
    const c = Math.cos(rad(phi)), s = Math.sin(rad(phi));
    const N = [nx * c, ny * c, -s], vis = N[0] * V[0] + N[1] * V[1] + N[2] * V[2] > 0;
    const at = (u, v, o) => P(nx * h + tx * u + v * s * nx - o * N[0], ny * h + ty * u + v * s * ny - o * N[1], f + v * c - o * N[2]);
    const shape = outline(h, H);
    const outer = poly(shape.map(([u, v]) => at(u, v, 0))), inner = poly(shape.map(([u, v]) => at(u, v, T)));
    const o = vis ? 0 : T;
    return { faceD: vis ? outer : inner, backD: vis ? inner : outer, seamD: seg(at(-h + 2.5, H * 0.48, o), at(h - 2.5, H * 0.48, o)) };
  }

  const g = mk("g", {}, svg);
  const crates = K.map(() => ({ walls: [] }));
  const mkWall = (i, j) => {
    const grp = mk("g", {}, g);
    const w = { i, j, back: mk("path", { class: "lo" }, grp), face: mk("path", { class: "sil" }, grp), seam: mk("path", { class: "nf lo" }, grp) };
    w.tw = tween(REST[i][j]); w.drawn = NaN;
    crates[i].walls.push(w);
  };
  const mkFloor = (i) => {
    const [h, , f] = K[i], [r, n] = rings(-h, -h, h, h, 2.5, 1);
    put(solid(g), prism(P, front, r, n, f, f + 2));
  };
  // back to front: the outer crate's far walls and floor, then the next crate in, then the near walls outwards
  for (let i = 2; i >= 0; i--) { mkWall(i, 2); mkWall(i, 3); mkFloor(i); }
  for (let i = 0; i <= 2; i++) { mkWall(i, 0); mkWall(i, 1); }
  const all = crates.flatMap((cr) => cr.walls);

  function draw(w, phi) {
    if (phi === w.drawn) return;
    w.drawn = phi;
    const q = wall(w.i, w.j, phi);
    w.face.setAttribute("d", q.faceD); w.back.setAttribute("d", q.backD); w.seam.setAttribute("d", q.seamD);
  }

  const B = register(stage, (_dt, now) => {
    let moving = false;
    for (const w of all) { draw(w, tval(w.tw, now)); if (!tdone(w.tw, now)) moving = true; }
    return moving;
  });
  bag.add(B.unregister);

  /** The innermost crate whose rest top holds the point; -1 outside them all. */
  function hit([sx, sy]) {
    for (let i = 0; i < 3; i++) {
      const [h, H, f] = K[i], [x, y] = unproj(C, sx, sy, f + H);
      if (Math.max(Math.abs(x), Math.abs(y)) < h + (i === 2 ? 30 : 5)) return i;
    }
    return -1;
  }

  let act = null;
  function setActive(a) {
    if (a === act) return;
    const now = performance.now(), from = a >= 0 ? a : act ?? 0;
    act = a;
    for (const w of all) {
      const phi = a < 0 ? REST[w.i][w.j] : w.i > a ? open : 0;
      tset(w.tw, phi, now, Math.abs(w.i - from) * 60);
      w.face.classList.toggle("hi", w.i === (a < 0 ? 0 : a));
    }
    read.textContent = a < 0 ? "rest" : `${K[a][3]} · ${a + 1} of 3`;
    B.wake();
  }

  bag.add(pointer(stage, { move: (p) => setActive(hit(p)), leave: () => setActive(-1) }));
  bag.add(() => svg.replaceChildren());
  setActive(-1);

  return {
    set: (v) => {
      open = clamp(v, 0, 90);
      if (act >= 0) { const now = performance.now(); for (const w of all) if (w.i > act) tset(w.tw, open, now, 0); B.wake(); }
    },
    destroy: bag.dispose,
  };
}

hairline({
  name: "plans",
  means: "Pricing tiers as nested crates, free inside pro inside enterprise: pick one and the crates around it fold their walls down.",
  rules: [1, 2, 4, 6],
  range: [40, 68, 88],
  tour: [[99, 134], [200, 171], [200, 146], null],
  mount,
});
