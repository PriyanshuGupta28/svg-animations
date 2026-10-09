/**
 * Dolly: a camera slider on the floor. Two rails run between two end blocks;
 * a carriage rides them, carrying a fluid head, a camera body with a
 * viewfinder hump, and a lens with its hood. The pointer's position along the
 * rail, projected onto the rails' plane, sets where the carriage goes, on a
 * spring; the camera pans as it travels to keep facing a subject off the
 * rail's middle. At rest the carriage sits a third of the way along, and the
 * hood is bright. The slider is the pan: how far the camera turns to follow.
 */
const {
  Cam, clamp, facing, fit, hull, poly, prism, proj, rad, rings, circ, unproj, spring, stepS,
  mk, pointer, put, register, disposer, solid,
} = HL;

const LEN = 150, GB = 18, RW = 3, RZ0 = 6, RZ1 = 9, EB = 13;
const CW = 28, CZ = 13, HZ = 16, BL = 24, BW = 15, BZ1 = 33;
const SUBJ = [LEN / 2, GB / 2 + 70], REST = 0.3 * LEN;

/** A ring turned by th degrees and moved to (x, y): positions and normals. */
function tr(ring, th, x, y) {
  const c = Math.cos(rad(th)), s = Math.sin(rad(th));
  return ring.map((q) => ({ u: x + q.u * c - q.v * s, v: y + q.u * s + q.v * c, nu: q.nu * c - q.nv * s, nv: q.nu * s + q.nv * c }));
}

/** A level cylinder along d from o (start) to o + len, radius r: its hull, and its front rim inset by b. */
function cyl(P, o, d, r, from, len, b) {
  const n = [-d[1], d[0]];
  const loop = (t, rr) => Array.from({ length: 28 }, (_, k) => {
    const a = (k / 28) * Math.PI * 2;
    return P(o[0] + d[0] * t + n[0] * rr * Math.cos(a), o[1] + d[1] * t + n[1] * rr * Math.cos(a), o[2] + rr * Math.sin(a));
  });
  return { sil: poly(hull(loop(from, r).concat(loop(from + len, r)))), crease: poly(loop(from + len, r - b)) };
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let gain = value;
  const C = Cam(45, 0.5, 1.92);
  fit(C, [[-EB, -7, 0], [LEN + EB, GB + 7, 0], [LEN + EB, -7, 0], [-EB, GB + 7, 0], [0, 0, BZ1 + 4], [LEN, 0, BZ1 + 4], [-6, 44, 24], [LEN + 6, 44, 24]], 200, 166);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  const block = (x0) => { const [o, i] = rings(x0, -7, x0 + EB, GB + 7, 4, 1.4); put(solid(g), prism(P, front, o, i, 0, RZ1 + 3)); };
  block(-EB);
  for (const y of [0, GB]) {
    const [o, i] = rings(0, y - RW / 2, LEN, y + RW / 2, RW / 2, 0.6);
    put(solid(g), prism(P, front, o, i, RZ0, RZ1));
  }
  const rig = mk("g", {}, g);
  const cart = solid(rig), head = solid(rig), body = solid(rig), hump = solid(rig), barrel = solid(rig), hood = solid(rig);
  block(LEN);

  const [co, ci] = rings(-CW / 2, -6, CW / 2, GB + 6, 4, 1.2);
  const [ho, hi] = [circ(6, 32), circ(4.6, 32)];
  const [bo, bi] = rings(-BL / 2, -BW / 2, BL / 2, BW / 2, 4, 1.2);
  const [vo, vi] = rings(-BL / 2 + 1, -4.5, -BL / 2 + 10, 4.5, 3, 1);
  const sp = spring(REST);
  let th0 = NaN, drawn = NaN, over = null;

  /** Where the camera faces from x: straight across the rail, turned towards the subject by the gain. */
  const aim = (x) => 90 + gain * ((Math.atan2(SUBJ[1] - GB / 2, SUBJ[0] - x) * 180) / Math.PI - 90);

  function draw(x) {
    const th = aim(x);
    if (x === drawn && th === th0) return;
    drawn = x; th0 = th;
    const cy = GB / 2, d = [Math.cos(rad(th)), Math.sin(rad(th))], o = [x, cy, (HZ + BZ1) / 2];
    put(cart, prism(P, front, tr(co, 0, x, 0), tr(ci, 0, x, 0), RZ1, CZ));
    put(head, prism(P, front, tr(ho, 0, x, cy), tr(hi, 0, x, cy), CZ, HZ));
    put(body, prism(P, front, tr(bo, th, x, cy), tr(bi, th, x, cy), HZ, BZ1));
    put(hump, prism(P, front, tr(vo, th, x, cy), tr(vi, th, x, cy), BZ1, BZ1 + 4));
    put(barrel, cyl(P, o, d, 6, BL / 2 - 1, 11, 1.4));
    put(hood, cyl(P, o, d, 7.6, BL / 2 + 10, 5, 1.8));
  }

  const B = register(stage, (dt) => {
    const m = stepS(sp, dt);
    draw(sp.x);
    return m;
  });
  bag.add(B.unregister);

  function retarget() {
    sp.t = over ? clamp(over[0], CW / 2 + 2, LEN - CW / 2 - 2) : REST;
    cart.sil.classList.toggle("hi", !!over);
    hood.sil.classList.toggle("hi", !over);
    read.textContent = over ? `track ${Math.round((sp.t / LEN) * 100)}` : "rest";
    B.wake();
  }

  bag.add(pointer(stage, {
    move: (p) => { over = unproj(C, p[0], p[1], RZ1); retarget(); },
    leave: () => { over = null; retarget(); },
  }));
  bag.add(() => svg.replaceChildren());
  retarget();

  return {
    set: (v) => { gain = v; B.wake(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "dolly",
  means: "A camera on a slider rail: the carriage follows the pointer along the track, and the camera pans to keep its subject.",
  rules: [1, 3, 5, 8],
  range: [0, 0.6, 1],
  tour: [[140, 134], [256, 192], [208, 168], null],
  mount,
});
