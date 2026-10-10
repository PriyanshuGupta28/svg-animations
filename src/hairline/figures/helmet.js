/**
 * Helmet: a race helmet on a display stand, a round base with a post. Its
 * shell has an eye port with the visor on a side pivot, held up at its first
 * detent, a chin bar with a vent, two brow vents and a spoiler at the back.
 * The pointer pushes it: entering, or moving round it on a plane through the
 * shell that never moves, adds spin; friction bleeds it, and a detent spring
 * catches it facing one of eight stops, dotted round the base. At rest it
 * looks three-quarters left, the visor bright. The slider is the coast: the
 * friction, per second.
 */
const {
  Cam, circ, clamp, fillet, fit, hull, open, poly, prism, proj, rad, run, unproj,
  spring, stepS, reducedMotion, disposer, flatDot, mk, place, pointer, put, register, solid, facing,
} = HL;

const A = 16, Bw = 13.5, Cz = 15, HC = 46, BR = 24, BZ = 4, PR = 3.5, VIS = rad(20), PIV = [-1, HC - 1];
const FLICK = 4, N = 8, STEP = (2 * Math.PI) / N, R0 = 2, REST = R0 * STEP, CATCH = 1.2, VMAX = 14, REACH = 30;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const cut = (u) => HC - 10 - 0.2 * u;
/** The shell's lowest elevation at azimuth az: where the ellipsoid meets the tilted cut. */
function floorEl(az) {
  let lo = -Math.PI / 2, hi = 0;
  for (let k = 0; k < 14; k++) {
    const m = (lo + hi) / 2, q = pos(az, m);
    if (q[2] < cut(q[0])) lo = m; else hi = m;
  }
  return hi;
}
/** The shell's surface: an ellipsoid whose lower front is drawn out into the chin bar. */
function pos(az, el, s = 1) {
  const ca = Math.cos(az), chin = 1 + 0.2 * Math.max(0, ca) ** 2 * Math.max(0, -Math.sin(el));
  return [s * A * chin * Math.cos(el) * ca, s * Bw * Math.cos(el) * Math.sin(az), HC + s * Cz * Math.sin(el)];
}
/** A point on the shell at azimuth az (0 forward), elevation el, scale s: local position and outward normal. */
function shell(az, el, s = 1) {
  const p = pos(az, el, s), h = 1e-3, pa = pos(az + h, el, s), pe = pos(az, el + h, s);
  const da = pa.map((v, i) => v - p[i]), de = pe.map((v, i) => v - p[i]);
  let n = [de[1] * da[2] - de[2] * da[1], de[2] * da[0] - de[0] * da[2], de[0] * da[1] - de[1] * da[0]];
  if (n[0] * p[0] + n[1] * p[1] + n[2] * (p[2] - HC) < 0) n = n.map((v) => -v);
  return { p, n };
}
/** A rounded patch on the shell, outlined in (azimuth, elevation) degrees, its long edges walked in small steps. */
function patch(az0, el0, az1, el1, r, s = 1) {
  const f = fillet([[az0, el0], [az1, el0], [az1, el1], [az0, el1]], [r, r, r, r], 5), out = [];
  f.forEach((a, i) => {
    const b = f[(i + 1) % f.length], k = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 4));
    for (let j = 0; j < k; j++) out.push(shell(rad(a[0] + ((b[0] - a[0]) * j) / k), rad(a[1] + ((b[1] - a[1]) * j) / k), s));
  });
  return out;
}
/** The visor swung up about its pivot by VIS. */
const lift = ({ p, n }) => {
  const c = Math.cos(VIS), s = Math.sin(VIS), du = p[0] - PIV[0], dz = p[2] - PIV[1];
  return { p: [PIV[0] + du * c - dz * s, p[1], PIV[1] + du * s + dz * c], n: [n[0] * c - n[2] * s, n[1], n[0] * s + n[2] * c] };
};
const SPOILER = [[-9, HC + 12], [-14.6, HC + 5.5], [-17.8, HC + 6.4], [-15, HC + 10.5], [-11, HC + 13]], SW = 5;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let F = value;
  const C = Cam(45, 0.5, 3.6);
  fit(C, [[-BR, -BR, 0], [BR, BR, 0], [BR, -BR, 0], [-BR, BR, 0], [-20, 0, HC + 17], [20, 0, HC + 17]], 200, 166);
  const P = proj(C), front = facing(C);
  const o = P(0, 0, 0), [ex, ey, ez] = [P(1, 0, 0), P(0, 1, 0), P(0, 0, 1)].map((q) => [q[0] - o[0], q[1] - o[1]]);
  let eye = [ey[0] * ez[1] - ez[0] * ey[1], ez[0] * ex[1] - ex[0] * ez[1], ex[0] * ey[1] - ey[0] * ex[1]];
  if (eye[2] < 0) eye = eye.map((v) => -v);

  const g = mk("g", {}, svg);
  // the stand: a round base with eight stops dotted round its top, and a post
  put(solid(g), prism(P, front, circ(BR, 48), circ(BR - 1.6, 48), 0, BZ));
  const dots = [];
  for (let k = 0; k < N; k++) {
    const a = REST + k * STEP, d = flatDot(g, C, 1.2, "dot off");
    place(d, P(19.5 * Math.cos(a), 19.5 * Math.sin(a), BZ));
    dots.push(d);
  }
  put(solid(g), prism(P, front, circ(PR, 20), circ(PR - 0.8, 20), BZ, HC - 6));

  const spoiler = solid(g), sh = mk("path", { class: "sil" }, g);
  const port = mk("path", { class: "nf" }, g), visorFill = mk("path", { class: "fo" }, g), visor = mk("path", { class: "nf" }, g);
  const marks = mk("path", { class: "nf lo" }, g);

  // the shell's samples, from its tilted lower edge to the crown
  const grid = [], edge = [];
  for (let i = 0; i < 36; i++) {
    const az = (i / 36) * 2 * Math.PI, e0 = floorEl(az);
    edge.push(shell(az, e0));
    for (let t = 0; t <= 8; t++) grid.push(shell(az, e0 + ((Math.PI / 2 - e0) * t) / 8));
  }
  const EYE = patch(-66, -24, 66, 6, 9), VISOR = patch(-80, -28, 80, 10, 11, 1.035).map(lift);
  const CHIN = patch(-13, -50, 13, -41, 3, 1.002), PIVOTS = [-1, 1].map((sd) => patch(sd * 80, -15, sd * 96, -1, 7, 1.04).map(lift));
  const VENTS = [-1, 1].map((sd) => patch(sd * 10, 34, sd * 20, 52, 4, 1.002));
  const GRILLE = [-6, 0, 6].map((a) => [shell(rad(a), rad(-48), 1.003), shell(rad(a), rad(-43), 1.003)]);

  let rot = REST, vel = 0, sp = null, drawn = NaN, over = false;
  const stop = (r) => ((Math.round(r / STEP) % N) + N) % N;
  function draw() {
    if (rot === drawn) return;
    drawn = rot;
    const c = Math.cos(rot), s = Math.sin(rot);
    const W = (p) => P(p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]);
    const sees = (n) => (n[0] * c - n[1] * s) * eye[0] + (n[0] * s + n[1] * c) * eye[1] + n[2] * eye[2] > 0;
    /** The parts of a curve on the shell that face the eye, as open subpaths. */
    const runs = (pts, closed = true) => {
      const list = closed ? pts.concat([pts[0]]) : pts;
      let d = "", cur = [];
      for (const q of list) {
        if (sees(q.n)) cur.push(W(q.p));
        else { if (cur.length > 1) d += open(cur); cur = []; }
      }
      return d + (cur.length > 1 ? open(cur) : "");
    };
    sh.setAttribute("d", poly(hull(grid.concat(VISOR).map((q) => W(q.p)))));
    port.setAttribute("d", runs(EYE));
    const showV = sees(lift(shell(0, rad(-8))).n);
    visorFill.setAttribute("d", showV ? poly(VISOR.map((q) => W(q.p))) : "");
    visor.setAttribute("d", runs(VISOR) + PIVOTS.map((q) => runs(q)).join(""));
    marks.setAttribute("d", [CHIN, ...VENTS].map((q) => runs(q)).join("") + GRILLE.map((q) => runs(q, false)).join("") + runs(edge));
    // the spoiler: a fin profile across the crown, its near face carrying the crease
    const back = [-c, -s], near = back[0] * eye[0] + back[1] * eye[1] > 0, side = s * eye[0] * -1 + c * eye[1] > 0 ? 1 : -1;
    const fN = SPOILER.map(([u, z]) => W([u, SW * side, z])), fF = SPOILER.map(([u, z]) => W([u, -SW * side, z]));
    const n = fN.length, cx = fN.reduce((a, p) => a + p[0], 0) / n, cy = fN.reduce((a, p) => a + p[1], 0) / n, dd = [fF[0][0] - fN[0][0], fF[0][1] - fN[0][1]];
    const inside = fN.map((p, i) => {
      const q = fN[(i + 1) % n], w = fN[(i + n - 1) % n];
      let nx = q[1] - w[1], ny = w[0] - q[0];
      if (nx * (p[0] - cx) + ny * (p[1] - cy) < 0) { nx = -nx; ny = -ny; }
      return nx * dd[0] + ny * dd[1] > 0;
    });
    put(spoiler, { sil: poly(hull(fN.concat(fF))), crease: open(run(fN.map((_, i) => ({ i })), (q) => inside[q.i]).map((q) => fN[q.i])) });
    if (near) marks.after(spoiler.g); else sh.before(spoiler.g);
  }
  function mark() {
    const k = stop(over && sp ? sp.t : rot);
    visor.classList.toggle("hi", !over);
    dots.forEach((d, i) => d.setAttribute("class", over && i === (k - R0 + N) % N ? "dot" : i === 0 && !over ? "dot m" : "dot off"));
    read.textContent = over ? `facing ${(((k - 1) * 45) % 360 + 360) % 360}°` : "rest";
  }

  /** A spring onto the next stop in the direction of travel, or back to rest once the pointer has gone. */
  function catchIt(ahead) {
    const n = rot / STEP;
    sp = spring(rot);
    sp.t = over ? STEP * (vel > 0 ? Math.ceil(n + ahead) : vel < 0 ? Math.floor(n - ahead) : Math.round(n)) : rot + wrap(REST - rot);
    vel = 0;
  }

  const B = register(stage, (dt) => {
    let m = false;
    if (vel !== 0) {
      if (reducedMotion()) { rot += vel / F; catchIt(0); }
      else {
        rot += vel * dt;
        vel *= Math.exp(-F * dt);
        if (Math.abs(vel) < CATCH) catchIt(0.15);
      }
      m = true;
    }
    if (sp) { m = stepS(sp, dt) || m; rot = sp.x; if (!m) sp = null; }
    draw();
    mark();
    return m;
  });
  bag.add(B.unregister);

  // The pointer meets a level plane through the shell's middle, which never moves.
  let prev = null;
  bag.add(pointer(stage, {
    move: (p) => {
      const [u, v] = unproj(C, p[0], p[1], HC - 4), a = Math.atan2(v, u);
      const was = over;
      over = Math.hypot(u, v) < REACH;
      if (!over) { prev = null; if (was && vel === 0) catchIt(0); mark(); B.wake(); return; }
      sp = null;
      vel = clamp(vel + (prev === null ? FLICK * clamp((u - v) / REACH, -1, 1) : 10 * wrap(a - prev)), -VMAX, VMAX);
      if (vel === 0) catchIt(0);
      prev = a;
      mark();
      B.wake();
    },
    leave: () => { over = false; prev = null; if (vel === 0) catchIt(0); mark(); B.wake(); },
  }));
  bag.add(() => svg.replaceChildren());
  draw();
  mark();

  return {
    set: (v) => { F = v; },
    destroy: bag.dispose,
  };
}

hairline({
  name: "helmet",
  means: "A race helmet on its stand: push it round, friction slows the spin, and a detent catches it facing one of eight stops.",
  rules: [1, 4, 5, 8],
  range: [3.2, 1.6, 0.7],
  tour: [[225, 128], [119, 103], [281, 103], null],
  mount,
});
