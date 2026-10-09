/**
 * Robotarm: an agent as a desk robot arm. A round base, a turntable, two links
 * on pinned joints and a two-finger gripper that always hangs straight down.
 * The pointer, projected onto the desk (which never moves), is the target:
 * its bearing and distance go to two springs, the yaw and the reach, clamped
 * between a near limit and the slider's far one, and every frame a two-link
 * solve bends the arm to put the wrist over it. At rest the arm reaches over
 * a small cube on the desk and the gripper is the bright mark.
 */
const {
  Cam, circ, clamp, facing, fit, hull, poly, prism, proj, rings, unproj,
  spring, stepS, disposer, flatDot, mk, place, pointer, put, register, solid,
} = HL;

const M = 80, HS = 17, L1 = 46, L2 = 42, RMIN = 24, GL = 18, CUBE = [56, -20], CS = 12, WZ = CS + GL + 2;
const REST_YAW = Math.atan2(CUBE[1], CUBE[0]), REST_RHO = Math.hypot(CUBE[0], CUBE[1]);

const add = (a, b, s) => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s];

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let rmax = value;
  const C = Cam(45, 0.5, 1.8);
  fit(C, [[-M, 0, -3], [M, 0, -3], [0, -M, -3], [0, M, -3], [0, 0, HS + L1 + 6]], 200, 166);
  const P = proj(C), front = facing(C), pp = (pts) => pts.map((q) => P(q[0], q[1], q[2]));

  /** A link: a stadium from A to B, half width w, as a plate t thick across the horizontal v; pins at its ends. */
  function slab(A, B, w, v, t, pins) {
    const l = Math.hypot(B[0] - A[0], B[1] - A[1], B[2] - A[2]), d = [(B[0] - A[0]) / l, (B[1] - A[1]) / l, (B[2] - A[2]) / l];
    const p = [-d[2] * v[1], d[2] * v[0], d[0] * v[1] - d[1] * v[0]];
    const face = (o, r) => {
      const pts = [];
      for (let k = 0; k <= 8; k++) {
        const a = -Math.PI / 2 + (k * Math.PI) / 8, c = Math.cos(a) * r, s = Math.sin(a) * r;
        pts.push(add(add(add(B, d, c), p, s), v, o));
      }
      for (let k = 0; k <= 8; k++) {
        const a = Math.PI / 2 + (k * Math.PI) / 8, c = Math.cos(a) * r, s = Math.sin(a) * r;
        pts.push(add(add(add(A, d, c), p, s), v, o));
      }
      return pts;
    };
    const near = front({ u: 0, v: 0, nu: v[0], nv: v[1] }) ? t : -t;
    let crease = poly(pp(face(near, w - 1)));
    for (const J of pins) {
      const ring = [];
      for (let k = 0; k < 12; k++) { const a = (k * Math.PI) / 6; ring.push(add(add(add(J, d, Math.cos(a) * w * 0.45), p, Math.sin(a) * w * 0.45), v, near)); }
      crease += poly(pp(ring));
    }
    return { sil: poly(hull(pp(face(t, w).concat(face(-t, w))))), crease };
  }

  const g = mk("g", {}, svg);
  // a round desk mat, the arm's whole envelope
  put(solid(g), prism(P, front, circ(M, 64), circ(M - 2, 64), -3, 0));
  const plumb = flatDot(g, C, 1, "dot m");

  // The parts that trade places in depth as the arm turns, each in its own group.
  const base = mk("g", {}, g);
  put(solid(base), prism(P, front, circ(19, 32), circ(17.6, 32), 0, 6));
  put(solid(base), prism(P, front, circ(14, 32), circ(12.8, 32), 6, 10));
  put(solid(base), prism(P, front, circ(7, 24), circ(6, 24), 10, HS - 3));
  const notch = flatDot(base, C, 1, "dot m");
  const cube = mk("g", {}, g);
  const [cr, ci] = rings(CUBE[0] - CS / 2, CUBE[1] - CS / 2, CUBE[0] + CS / 2, CUBE[1] + CS / 2, 2.4, 1);
  put(solid(cube), prism(P, front, cr, ci, 0, CS));
  const upper = solid(g), fore = solid(g), hand = mk("g", {}, g);
  const palm = solid(hand), fingers = [solid(hand), solid(hand)];
  for (const s of [palm, ...fingers]) s.sil.classList.add("hi");

  const yaw = spring(REST_YAW), rho = spring(REST_RHO);
  let drawn = "", order = "";
  // depth toward the viewer at this camera: nearer is larger
  const depth = (q) => 0.612 * (q[0] + q[1]) + 0.5 * q[2];

  function draw() {
    const key = yaw.x + "," + rho.x;
    if (key === drawn) return;
    drawn = key;
    const e = [Math.cos(yaw.x), Math.sin(yaw.x), 0], n = [-e[1], e[0], 0];
    // two-link solve, elbow up, for the wrist at reach rho and height WZ
    const S = [0, 0, HS], dz = WZ - HS, D = clamp(Math.hypot(rho.x, dz), L1 - L2 + 1, L1 + L2 - 1);
    const al = Math.atan2(dz, rho.x) + Math.acos((L1 * L1 + D * D - L2 * L2) / (2 * L1 * D));
    const E = add(add(S, e, L1 * Math.cos(al)), [0, 0, 1], L1 * Math.sin(al));
    const W = [e[0] * rho.x, e[1] * rho.x, WZ];
    put(upper, slab(S, E, 6.5, n, 5, [S]));
    put(fore, slab(E, W, 5.5, n, 4, [E, W]));
    const at = (ring) => ring.map((s) => ({ ...s, u: s.u + W[0], v: s.v + W[1] }));
    put(palm, prism(P, front, at(circ(5.5, 20)), at(circ(4.5, 20)), WZ - 10, WZ - 5));
    fingers.forEach((f, j) => {
      const top = add(W, n, j ? 3.4 : -3.4);
      put(f, slab(add(top, [0, 0, 1], -10), add(top, [0, 0, 1], -GL + 1.5), 1.8, n, 0.9, []));
    });
    place(plumb, P(W[0], W[1], 0));
    place(notch, P(10 * e[0], 10 * e[1], 10));
    const parts = [[base, [0, 0, 5]], [cube, [CUBE[0], CUBE[1], CS / 2]], [upper.g, add(S, E, 1).map((c) => c / 2)],
      [fore.g, add(E, W, 1).map((c) => c / 2)], [hand, [W[0], W[1], WZ - 6]]].sort((a, b) => depth(a[1]) - depth(b[1]));
    const o = parts.map((q) => q[1].join()).join("|");
    if (o !== order) { order = o; for (const [el] of parts) g.append(el); }
  }

  const B = register(stage, (dt) => {
    const m = stepS(yaw, dt) | stepS(rho, dt);
    draw();
    return !!m;
  });
  bag.add(B.unregister);

  function aim(to, reach) {
    // turn the short way round: retarget to the nearest equal angle
    yaw.t += Math.atan2(Math.sin(to - yaw.t), Math.cos(to - yaw.t));
    rho.t = reach;
    B.wake();
  }
  let over = null;
  function retarget() {
    if (!over) { aim(REST_YAW, REST_RHO); read.textContent = "rest"; return; }
    const r = clamp(Math.hypot(over[0], over[1]), RMIN, rmax);
    aim(Math.atan2(over[1], over[0]), r);
    read.textContent = `reach ${Math.round((r / (L1 + L2)) * 100)}%`;
  }

  bag.add(pointer(stage, {
    move: (p) => { over = unproj(C, p[0], p[1], 0); retarget(); },
    leave: () => { over = null; retarget(); },
  }));
  bag.add(() => svg.replaceChildren());
  draw();

  return {
    set: (v) => { rmax = v; if (over) retarget(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "robotarm",
  means: "An agent as a desk robot arm: it turns and bends to reach over the point under the pointer, as far as its reach allows.",
  rules: [1, 3, 5, 8],
  range: [48, 62, 76],
  tour: [[111, 198], [175, 141], [200, 256], null],
  mount,
});
