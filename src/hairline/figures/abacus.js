/**
 * Abacus: a model's weights as a soroban lying on the desk. A frame with four
 * corner posts holds six rods, a divider bar across them, one heaven bead and
 * four earth beads on each. The pointer is put on the plane of the rods; its x
 * pulls the beads of nearby rods toward it, each bead on its own spring, the
 * pull falling off with distance across the rods. At rest each rod holds a
 * digit, an uneven learned vector, and rod 4 (a 9) is bright. The slider is
 * the falloff radius, in rods.
 */
const {
  Cam, clamp, fit, hull, lerp, open, poly, prism, proj, rings, unproj, spring, stepS,
  disposer, mk, pointer, put, register, solid, facing,
} = HL;

const N = 6, PITCH = 15, Y = N * PITCH, LX = 92, FW = 6, FH = 8, PH = 11, ZR = 5.5;
const XD = 26, DW = 4, BW = 6.6;
const H0 = 0, H1 = XD - DW / 2, E0 = XD + DW / 2, E1 = LX;
/** The digit each rod holds at rest: an uneven vector, not a pattern. */
const DIGITS = [2, 7, 4, 9, 1, 6], MARK = 3;
/** A bead's profile along the rod: [offset, radius], rounded ends, a ridge in the middle. */
const PROFILE = [[-3.2, 2], [-2.7, 3.4], [-1.8, 4.5], [-0.7, 5], [0.7, 5], [1.8, 4.5], [2.7, 3.4], [3.2, 2]];

const ry = (j) => PITCH / 2 + j * PITCH;
/** The share of full pull at u radii across the rods: 1 → .31 at 42% → .09 at the edge and beyond. */
const falloff = (u) =>
  u <= 0 ? 1 : u <= 0.417 ? 1 - (u / 0.417) * 0.6875 : u <= 1 ? 0.3125 - ((u - 0.417) / 0.583) * 0.2185 : 0.094;
/** Earth bead k (0 nearest the divider) packed against the divider, or against the far end. */
const eIn = (k) => E0 + BW / 2 + k * BW, eOut = (k) => E1 - BW / 2 - (3 - k) * BW;
const hIn = H1 - BW / 2, hOut = H0 + BW / 2;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let R = value;
  const C = Cam(45, 0.5, 1.95);
  fit(C, [[-FW - 1.5, -FW - 1.5, 0], [LX + FW + 1.5, Y + FW + 1.5, 0], [LX + FW + 1.5, -FW - 1.5, 0], [-FW - 1.5, Y + FW + 1.5, 0], [-FW, -FW, PH]], 200, 166);
  const P = proj(C), front = facing(C);

  // The view direction, from the projection: the world vector P flattens to a point, pointing up.
  const o = P(0, 0, 0), e = [P(1, 0, 0), P(0, 1, 0), P(0, 0, 1)].map((q) => [q[0] - o[0], q[1] - o[1]]);
  let view = [e[1][0] * e[2][1] - e[2][0] * e[1][1], e[2][0] * e[0][1] - e[0][0] * e[2][1], e[0][0] * e[1][1] - e[1][0] * e[0][1]];
  if (view[2] < 0) view = view.map((v) => -v);
  // The bead's outline and the front half of its ridge, relative to its centre, on screen.
  const pts = [], ridge = [];
  for (const [dx, r] of PROFILE) for (let s = 0; s < 16; s++) {
    const t = (s / 16) * 2 * Math.PI, q = P(dx, r * Math.cos(t), ZR + r * Math.sin(t));
    pts.push([q[0] - P(0, 0, ZR)[0], q[1] - P(0, 0, ZR)[1]]);
  }
  // walked from the ridge's back-most point, so its front half comes out in one run
  const back = Math.atan2(view[2], view[1]) + Math.PI;
  for (let s = 0; s <= 48; s++) {
    const t = back + (s / 48) * 2 * Math.PI;
    if (Math.cos(t) * view[1] + Math.sin(t) * view[2] < 0) continue;
    const q = P(0, 5 * Math.cos(t), ZR + 5 * Math.sin(t));
    ridge.push([q[0] - P(0, 0, ZR)[0], q[1] - P(0, 0, ZR)[1]]);
  }
  const outline = hull(pts);
  const at = (rel, c) => rel.map((q) => [q[0] + c[0], q[1] + c[1]]);

  const g = mk("g", {}, svg);
  const block = (x0, y0, x1, y1, r, z0, z1) => { const [a, b] = rings(x0, y0, x1, y1, r, 1.2); put(solid(g), prism(P, front, a, b, z0, z1)); };
  const post = (x, y) => block(x - FW / 2 - 1.5, y - FW / 2 - 1.5, x + FW / 2 + 1.5, y + FW / 2 + 1.5, 3, 0, PH);
  // back to front: far post, the two far bars, the side posts, rods, heaven beads, divider, earth beads, the near bars, the near post
  post(-FW / 2, -FW / 2);
  block(1.5, -FW, LX - 1.5, 0, 2, 0, FH);
  block(-FW, 1.5, 0, Y - 1.5, 2, 0, FH);
  post(LX + FW / 2, -FW / 2);
  post(-FW / 2, Y + FW / 2);
  const rods = [];
  for (let j = 0; j < N; j++) rods.push(mk("path", { class: "nf", d: open([P(0, ry(j), ZR), P(LX, ry(j), ZR)]) }, g));
  const heaven = mk("g", {}, g);
  block(XD - DW / 2, 0, XD + DW / 2, Y, 1.6, 1.5, FH + 0.5);
  const earth = mk("g", {}, g);
  block(LX, 1.5, LX + FW, Y - 1.5, 2, 0, FH);
  block(1.5, Y, LX - 1.5, Y + FW, 2, 0, FH);
  post(LX + FW / 2, Y + FW / 2);

  // Each rod: one heaven bead, then four earth beads, 0 nearest the divider; rest from its digit.
  const beads = [], byRod = [];
  for (let j = 0; j < N; j++) {
    const d = DIGITS[j], row = [];
    row.push({ j, sec: heaven, x0: d >= 5 ? hIn : hOut });
    for (let k = 0; k < 4; k++) row.push({ j, k, sec: earth, x0: k < d % 5 ? eIn(k) : eOut(k) });
    for (const b of row) { b.sp = spring(b.x0, { eps: 0.03 }); b.el = solid(b.sec); b.drawn = NaN; beads.push(b); }
    byRod.push(row);
  }

  function drawBead(b) {
    if (b.sp.x === b.drawn) return;
    b.drawn = b.sp.x;
    const c = P(b.sp.x, ry(b.j), ZR);
    put(b.el, { sil: poly(at(outline, c)), crease: open(at(ridge, c)) });
  }
  /** Within each section, the nearer bead (larger x + y) is painted later. */
  function order(sec) {
    const list = beads.filter((b) => b.sec === sec).sort((a, b) => a.sp.x + ry(a.j) - b.sp.x - ry(b.j));
    if (list.some((b, i) => sec.children[i] !== b.el.g)) list.forEach((b) => sec.appendChild(b.el.g));
  }

  const B = register(stage, (dt) => {
    let m = false;
    for (const b of beads) { if (stepS(b.sp, dt)) m = true; drawBead(b); }
    order(heaven); order(earth);
    return m;
  });
  bag.add(B.unregister);

  let over = null;
  function light(a) {
    rods.forEach((r, j) => r.classList.toggle("hi", j === a));
    for (const b of beads) b.el.sil.classList.toggle("hi", b.j === a);
  }
  function retarget() {
    const inside = over && over[0] > -FW && over[0] < LX + FW && over[1] > -FW && over[1] < Y + FW;
    if (!inside) {
      for (const b of beads) b.sp.t = b.x0;
      light(MARK); read.textContent = "rest"; B.wake();
      return;
    }
    const [px, py] = over;
    for (const row of byRod) {
      const f = falloff(Math.abs(py - ry(row[0].j)) / (R * PITCH));
      row[0].sp.t = lerp(row[0].x0, clamp(px, hOut, hIn), f);
      for (let k = 0; k < 4; k++) row[k + 1].sp.t = lerp(row[k + 1].x0, clamp(px + (k - 1.5) * BW, eIn(k), eOut(k)), f);
    }
    // the rod under the pointer, read as an abacus: the heaven bead at the divider is 5, each earth bead there 1
    const a = clamp(Math.floor(py / PITCH), 0, N - 1), row = byRod[a];
    let n = row[0].sp.t >= hIn - 1 ? 5 : 0;
    for (let k = 0; k < 4 && row[k + 1].sp.t <= eIn(k) + 1; k++) n++;
    light(a); read.textContent = `rod ${a + 1} · ${n}`;
    B.wake();
  }

  bag.add(pointer(stage, {
    move: (p) => { over = unproj(C, p[0], p[1], ZR); retarget(); },
    leave: () => { over = null; retarget(); },
  }));
  bag.add(() => svg.replaceChildren());
  retarget();

  return {
    set: (v) => { R = v; if (over) retarget(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "abacus",
  means: "Weights as an abacus on the desk: the pointer pulls the beads of nearby rods toward it, less the farther the rod.",
  rules: [1, 3, 5, 8],
  range: [0.7, 1.5, 3],
  tour: [[161, 135], [251, 159], [222, 207], null],
  mount,
});
