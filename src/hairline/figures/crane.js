/**
 * Crane: a deploy as a container gantry crane over a quay. Five stacks of
 * shipping containers, ribbed sides, door ends and corner castings, stand in
 * columns of uneven height under a portal of four legs and two girders. The
 * pointer picks a stack, tested on each stack's own resting top; the trolley
 * travels over it on the 700ms tween and the spreader lowers onto it, riding
 * up over any taller stack on the way. At rest the trolley is parked over
 * stack 5, spreader half down, and that stack's top is bright. The slider is
 * how long the spreader waits before it lowers, in ms.
 */
const {
  Cam, clamp, facing, fit, lerp, prism, proj, rings, seg, unproj,
  tween, tset, tval, tdone, disposer, mk, place, pointer, put, register, solid,
} = HL;

const HTS = [2, 4, 3, 1, 2], N = 5, W = 13, L = 34, H = 12, PITCH = 17, MARK = 4;
const GZ = 70, GT = 7, TT = 6, LX = [-10, (N - 1) * PITCH + W + 10], LY = [-5, L + 5];
const top = (c) => HTS[c] * H, xc = (c) => c * PITCH + W / 2;
const RIDE = Math.max(...HTS) * H + 10, half = (c) => lerp(top(c) + 1, RIDE, 0.5);

/** How high the spreader must ride at trolley x, so it never passes through a stack: each stack's top, eased in as the spreader nears it. */
function cover(tx) {
  let z = 0;
  for (let c = 0; c < N; c++) {
    const s = clamp((PITCH + 6 - Math.abs(tx - xc(c))) / (PITCH + 6 - W), 0, 1);
    z = Math.max(z, (top(c) + 1) * s * s * (3 - 2 * s));
  }
  return z;
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let wait = value;

  const ZT = GZ + GT + TT + 7;
  const C = Cam(45, 0.5, 1.75);
  fit(C, [[LX[0] - 9, LY[0] - 10, -3], [LX[1] + 9, LY[1] + 10, -3], [LX[1] + 9, LY[0] - 10, -3], [LX[0] - 9, LY[1] + 10, -3],
    [LX[0] - 6, LY[0] - 3, GZ + GT], [LX[1] + 6, LY[0] - 3, GZ + GT], [xc(0) - 8, LY[0] - 5, ZT], [xc(N - 1) + 8, LY[0] - 5, ZT]], 200, 166);
  const P = proj(C), front = facing(C);
  const shape = (x0, y0, x1, y1, r, b, z0, z1) => { const [o, i] = rings(x0, y0, x1, y1, r, b); return prism(P, front, o, i, z0, z1); };
  const box = (parent, ...a) => { const s = solid(parent); put(s, shape(...a)); return s; };

  const g = mk("g", {}, svg);
  // the quay, and the crane's two rails along it
  box(g, LX[0] - 9, LY[0] - 10, LX[1] + 9, LY[1] + 10, 4, 2, -3, 0);
  mk("path", { d: LX.map((x) => seg(P(x, LY[0] - 8, 0), P(x, LY[1] + 8, 0))).join(""), class: "nf lo" }, g);
  /** A leg on its wheel bogie, from the quay up to the girder. */
  const leg = (x, y) => { box(g, x - 3.5, y - 7, x + 3.5, y + 7, 2, 1, 0, 5); box(g, x - 2.5, y - 2.5, x + 2.5, y + 2.5, 1.2, 0.8, 5, GZ); };
  const girder = (y) => box(g, LX[0] - 6, y - 3, LX[1] + 6, y + 3, 2, 1, GZ, GZ + GT);
  leg(LX[0], LY[0]); leg(LX[1], LY[0]); leg(LX[0], LY[1]);
  girder(LY[0]);

  // the stacks, back to front, each container bottom up: a ribbed long side, a door end, corner castings
  const cols = [];
  for (let c = 0; c < N; c++) {
    const cg = mk("g", {}, g), x0 = c * PITCH, x1 = x0 + W, xm = (x0 + x1) / 2;
    let last = null;
    for (let k = 0; k < HTS[c]; k++) {
      const z0 = k * H, z1 = z0 + H;
      last = box(cg, x0, 0, x1, L, 1.2, 1, z0, z1);
      let d = "";
      for (let y = 3; y < L - 1.5; y += 3.4) d += seg(P(x1, y, z0 + 1.4), P(x1, y, z1 - 1.4));
      for (const x of [x0 + 3, xm, x1 - 3]) d += seg(P(x, L, z0 + 1.2), P(x, L, z1 - 1.2));
      mk("path", { d, class: "nf lo" }, cg);
      for (const z of [z0 + 1, z1 - 1]) for (const p of [P(x1, 1, z), P(x1, L - 1, z), P(x0 + 1, L, z)]) place(mk("circle", { r: 0.7, class: "dot off" }, cg), p);
    }
    cols.push({ g: cg, top: last });
  }

  leg(LX[1], LY[1]);
  girder(LY[1]);

  // the spreader on its four ropes, painted inside the stack it hangs over; the trolley rides on top of everything
  const sg = mk("g", {}, g), spread = solid(sg), head = solid(sg), ropes = mk("path", { class: "nf" }, sg);
  const tg = mk("g", {}, g), trolley = solid(tg), house = solid(tg);
  const trol = tween(xc(MARK)), hoist = tween(half(MARK));
  let drawn = "", over = -1;

  function draw(now) {
    const x = tval(trol, now), z = Math.max(tval(hoist, now), cover(x)), key = x + "," + z;
    if (key === drawn) return;
    drawn = key;
    const j = clamp(Math.round((x - W / 2) / PITCH), 0, N - 1);
    if (j !== over) { over = j; cols[j].g.after(sg); }
    put(spread, shape(x - W / 2, 0.5, x + W / 2, L - 0.5, 1.2, 0.8, z, z + 2.5));
    put(head, shape(x - 3.5, L / 2 - 6, x + 3.5, L / 2 + 6, 1.2, 0.7, z + 2.5, z + 5.5));
    let d = "";
    for (const dx of [-2, 2]) for (const y of [L / 2 - 4, L / 2 + 4]) d += seg(P(x + dx, y, z + 5.5), P(x + dx, y, GZ + GT));
    ropes.setAttribute("d", d);
    put(trolley, shape(x - 10, LY[0] - 5, x + 10, LY[1] + 5, 2.5, 1.2, GZ + GT, GZ + GT + TT));
    put(house, shape(x - 8, L / 2 - 11, x + 8, L / 2 + 11, 2, 1, GZ + GT + TT, ZT));
  }

  const B = register(stage, (_dt, now) => { draw(now); return !tdone(trol, now) || !tdone(hoist, now); });
  bag.add(B.unregister);

  /** The stack whose resting top, unprojected at its own height, holds the pointer nearest its middle; -1 for none. */
  function hit([sx, sy]) {
    let best = -1, bd = Infinity;
    for (let c = 0; c < N; c++) {
      const [x, y] = unproj(C, sx, sy, top(c)), d = Math.abs(x - xc(c));
      if (d > PITCH / 2 || y < -3 || y > L + 3) continue;
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }

  let act = null;
  function setActive(a) {
    if (a === act) return;
    const now = performance.now(), j = a < 0 ? MARK : a;
    act = a;
    tset(trol, xc(j), now, 0);
    tset(hoist, a < 0 ? half(j) : top(j) + 1, now, wait);
    cols.forEach((k, i) => k.top.sil.classList.toggle("hi", i === j));
    read.textContent = a < 0 ? "rest" : `stack ${a + 1} · ${HTS[a]}`;
    B.wake();
  }

  bag.add(pointer(stage, { move: (p) => setActive(hit(p)), leave: () => setActive(-1) }));
  bag.add(() => svg.replaceChildren());
  setActive(-1);

  return {
    set: (v) => { wait = v; },
    destroy: bag.dispose,
  };
}

hairline({
  name: "crane",
  means: "A deploy as a gantry crane over stacked containers: the trolley runs to the stack under the pointer and lowers onto it.",
  rules: [1, 3, 5, 8],
  range: [0, 150, 400],
  tour: [[200, 170], [158, 168], [221, 217], null],
  mount,
});
