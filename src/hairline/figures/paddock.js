/**
 * Paddock: a race team's garage, three race bikes side by side on rear paddock
 * stands in front of the back wall, noses towards the pit lane. Each bike has
 * its fairing, tank, tail, swingarm, exhaust and two wheels; each stand
 * hooks the swingarm with two arms off a crossbar on little wheels. The
 * pointer picks the bike whose resting centre is nearest it on screen: it
 * rolls forward off its stand, its rear wheel dropping to the floor, and the
 * others shift aside, staggered outwards from it on the 700ms tween. At rest
 * bike 2 is already half out, its fairing bright. The slider is the stagger.
 */
const {
  Cam, circ, fillet, fit, hull, open, poly, prism, proj, rings, run, seg,
  tween, tset, tval, tdone, disposer, mk, pointer, put, register, solid, facing,
} = HL;

const N = 3, SP = 58, TURN = -0.35, ROLL = 40, SHIFT = 10, WALL = 40, K = 0.7, LIFT = 4, REST_A = 1, REST_ROLL = 20;
const WR = [20 * K, 17 * K], WF = [105 * K, 17 * K], RT = 17 * K, HOOK = 12;
const TILT = Math.asin(LIFT / (WF[0] - WR[0]));

/** A capsule round the segment a–b, radius r, as an ordered outline in the bike's plane. */
function cap(a, b, r) {
  const t = Math.atan2(b[1] - a[1], b[0] - a[0]), pts = [];
  for (let k = 0; k <= 6; k++) { const s = t - Math.PI / 2 + (k * Math.PI) / 6; pts.push([b[0] + r * Math.cos(s), b[1] + r * Math.sin(s)]); }
  for (let k = 0; k <= 6; k++) { const s = t + Math.PI / 2 + (k * Math.PI) / 6; pts.push([a[0] + r * Math.cos(s), a[1] + r * Math.sin(s)]); }
  return pts;
}
const disc = (c, r, n = 24) => circ(r, n).map((q) => [c[0] + q.u, c[1] + q.v]);
const sc = (pts) => pts.map(([f, z]) => [f * K, z * K]);
const body = (pts, r) => fillet(sc(pts), pts.map(() => r * K), 3);

// The bike's parts, back to front: an outline in its plane (f forward, z up) and the span it takes across (+ is the near side).
const BIKE = [
  ["pipe", cap([36 * K, 26 * K], [14 * K, 37 * K], 2.4), -7, -3.6],
  ["fork", cap(WF, [93 * K, 52 * K], 1.8), -4.6, -2.4],
  ["rear", disc(WR, RT), -2.6, 2.6],
  ["front", disc(WF, RT), -2.4, 2.4],
  ["arm", cap(WR, [48 * K, 30 * K], 2.2), -4, 4],
  ["fork", cap(WF, [93 * K, 52 * K], 1.8), 2.4, 4.6],
  ["tail", body([[3, 51], [8, 55], [24, 52], [40, 46], [42, 40], [30, 38]], 2.5), -3.4, 3.4],
  ["tank", body([[38, 47], [52, 55], [66, 57], [70, 42], [44, 39]], 4), -5.2, 5.2],
  ["belly", body([[56, 34], [61, 9], [86, 9], [97, 30], [80, 38]], 4), -4.6, 4.6],
  ["fairing", body([[64, 44], [70, 60], [82, 64], [109, 50], [115, 43], [101, 36], [80, 35]], 4), -5.2, 5.2],
];
// The stand, which never pitches: its crossbar and far arm go behind the bike, its near arm in front.
const ARM = cap([-6, 2], [WR[0], WR[1] + LIFT - 1], 1.3);
const STAND_BACK = [["bar", disc([-6, 2], 1.6, 12), -8.5, 8.5], ["arm", ARM, -7.6, -6.2], ["wheel", disc([-6, 1.8], 1.8, 12), -9.6, -8.4]];
const STAND_FRONT = [["arm", ARM, 6.2, 7.6], ["wheel", disc([-6, 1.8], 1.8, 12), 8.4, 9.6], ["handle", cap([-6, 2], [-17, 13], 1.1), -0.6, 0.6]];

/** Writes one part, outline `pts` swept across from y0 to y1 through W(f, y, z), into its solid. */
function draw(el, pts, y0, y1, W) {
  const f = pts.map(([u, z]) => W(u, y1, z)), b = pts.map(([u, z]) => W(u, y0, z)), n = f.length;
  const d = [b[0][0] - f[0][0], b[0][1] - f[0][1]], cx = f.reduce((s, p) => s + p[0], 0) / n, cy = f.reduce((s, p) => s + p[1], 0) / n;
  // the near face's edge is a crease only where the far side shows past it
  const inside = f.map((p, i) => {
    const q = f[(i + 1) % n], o = f[(i + n - 1) % n];
    let nx = q[1] - o[1], ny = o[0] - q[0];
    if (nx * (p[0] - cx) + ny * (p[1] - cy) < 0) { nx = -nx; ny = -ny; }
    return nx * d[0] + ny * d[1] > 0;
  });
  put(el, { sil: poly(hull(f.concat(b))), crease: open(run(f.map((_, i) => ({ i })), (q) => inside[q.i]).map((q) => f[q.i])) });
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;
  const X1 = (N - 1) * SP;

  // The bikes face right and a little towards the viewer, the row stepping forward: G maps (f along the bikes, l along the row, z) into the world.
  const cs = Math.cos(TURN), sn = Math.sin(TURN), G0 = (f, l, z) => [f * cs - l * sn, f * sn + l * cs, z];
  const C = Cam(45, 0.5, 1.55);
  const L0 = -SHIFT - 34, L1 = X1 + SHIFT + 14, F0 = -24, F1 = WF[0] + RT + ROLL + 6;
  fit(C, [G0(F0, L0, 0), G0(F1, L0, 0), G0(F0, L1, 0), G0(F1, L1, 0), G0(F0, L0, WALL), G0(F1, L0, WALL)], 200, 166);
  const P = proj(C), front = facing(C), G = (f, l, z) => P(...G0(f, l, z));
  /** A ring laid out in (f, l), turned into the world, normals and all. */
  const turn = (ring) => ring.map((q) => ({ ...q, u: q.u * cs - q.v * sn, v: q.u * sn + q.v * cs, nu: q.nu * cs - q.nv * sn, nv: q.nu * sn + q.nv * cs }));

  const g = mk("g", {}, svg);
  // the garage: its floor, the pit-lane line along the open front, and the back wall with a panel seam
  const [fr, fi] = rings(F0, L0, F1, L1, 6, 1.6);
  put(solid(g), prism(P, front, turn(fr), turn(fi), -3, 0));
  mk("path", { d: seg(G(F1 - 8, L0 + 8, 0), G(F1 - 8, L1 - 6, 0)), class: "nf dash" }, g);
  const [wr, wi] = rings(F0, L0, F1, L0 + 4, 1.6, 0.8);
  put(solid(g), prism(P, front, turn(wr), turn(wi), 0, WALL));
  mk("path", { d: seg(G(F0, L0 + 4, WALL * 0.55), G(F1, L0 + 4, WALL * 0.55)), class: "nf lo" }, g);

  const bikes = [];
  for (let i = 0; i < N; i++) {
    const grp = mk("g", {}, g);
    const back = STAND_BACK.map(() => solid(grp)), parts = BIKE.map(() => solid(grp));
    const rims = mk("path", { class: "nf lo" }, grp), fore = STAND_FRONT.map(() => solid(grp));
    const fairing = parts[BIKE.findIndex(([n]) => n === "fairing")];
    bikes.push({ back, parts, rims, fore, fairing, roll: tween(i === REST_A ? REST_ROLL : 0), shift: tween(0), drawn: "" });
  }

  function pose(i, roll, shift) {
    const bk = bikes[i], key = `${roll.toFixed(3)} ${shift.toFixed(3)}`;
    if (key === bk.drawn) return;
    bk.drawn = key;
    const l = i * SP + shift;
    // the rear wheel leaves the stand's hooks over the first stretch of the roll
    const t = Math.min(1, roll / HOOK), a = TILT * (1 - t * t * (3 - 2 * t)), ca = Math.cos(a), sa = Math.sin(a);
    const Wb = (f, y, z) => { const dx = f - WF[0], dz = z - WF[1]; return G(roll + WF[0] + dx * ca + dz * sa, l + y, WF[1] - dx * sa + dz * ca); };
    const Ws = (f, y, z) => G(f, l + y, z);
    STAND_BACK.forEach(([, pts, y0, y1], k) => draw(bk.back[k], pts, y0, y1, Ws));
    BIKE.forEach(([, pts, y0, y1], k) => draw(bk.parts[k], pts, y0, y1, Wb));
    STAND_FRONT.forEach(([, pts, y0, y1], k) => draw(bk.fore[k], pts, y0, y1, Ws));
    const ring = (c, r, y) => poly(disc(c, r, 20).map(([f, z]) => Wb(f, y, z)));
    bk.rims.setAttribute("d", ring(WR, RT - 3.2, 2.7) + ring(WF, RT - 3.2, 2.5) + ring(WF, RT - 5.6, 2.6));
  }

  const B = register(stage, (_dt, now) => {
    let moving = false;
    bikes.forEach((bk, i) => {
      pose(i, tval(bk.roll, now), tval(bk.shift, now));
      if (!tdone(bk.roll, now) || !tdone(bk.shift, now)) moving = true;
    });
    return moving;
  });
  bag.add(B.unregister);

  // Hit: the bike whose resting centre is nearest the pointer on screen, within reach. Nothing moves the centres.
  const cen = bikes.map((_, i) => G(48, i * SP, 22));
  function hit([x, y]) {
    let best = -1, bd = 70;
    cen.forEach((c, i) => { const d = Math.hypot((x - c[0]) * 0.6, y - c[1]); if (d < bd) { bd = d; best = i; } });
    return best;
  }

  let act = -2;
  function setActive(a) {
    if (a === act) return;
    const now = performance.now(), from = a >= 0 ? a : act >= 0 ? act : REST_A;
    act = a;
    bikes.forEach((bk, i) => {
      const delay = Math.abs(i - from) * stag;
      const roll = a < 0 ? (i === REST_A ? REST_ROLL : 0) : i === a ? ROLL : 0;
      tset(bk.roll, roll, now, delay);
      tset(bk.shift, a < 0 || i === a ? 0 : Math.sign(i - a) * SHIFT, now, delay);
      bk.fairing.sil.classList.toggle("hi", a < 0 ? i === REST_A : i === a);
    });
    read.textContent = a < 0 ? "rest" : `bike ${a + 1}`;
    B.wake();
  }

  bag.add(pointer(stage, { move: (p) => setActive(hit(p)), leave: () => setActive(-1) }));
  bag.add(() => svg.replaceChildren());
  bikes.forEach((bk, i) => pose(i, i === REST_A ? REST_ROLL : 0, 0));
  setActive(-1);

  return {
    set: (v) => { stag = v; },
    destroy: bag.dispose,
  };
}

hairline({
  name: "paddock",
  means: "Race bikes on paddock stands in a garage: the one picked rolls forward off its stand, and the others shift aside in turn.",
  rules: [1, 2, 6, 8],
  range: [0, 40, 90],
  tour: [[223, 128], [148, 209], [186, 168], null],
  mount,
});
