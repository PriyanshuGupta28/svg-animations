/**
 * Seats: seat-based licensing as a row of five office chairs, each on a
 * five-star base with casters, a gas column, a cushion and a rounded
 * backrest on its stem. The pointer stands on the floor; the chairs near it
 * swivel to face it, the farther the less (a spring per chair, the falloff
 * floored so the far ones still turn a little), and the nearest takes the
 * bright edge. At rest the chairs face the room at uneven angles, as left
 * after a meeting, and the third is bright. The slider is the reach.
 */
const {
  Cam, clamp, facing, fillet, fit, open, poly, prism, proj, rad, rrect, circ, seg, unproj,
  spring, stepS, disposer, mk, place, pointer, put, register, solid,
} = HL;

const N = 5, GAP = 38, Z0 = 22, Z1 = 27, BK = 11, BW = 10, BZ0 = 32, BZ1 = 56, BT = 2.2, LEG = 13, PICK = 26;
const REST = [72, 118, 96, 58, 166], LIT = 2, V = [0.612, 0.612, 0.5];
const BACK = fillet([[-BW, 0], [BW, 0], [BW, BZ1 - BZ0], [-BW, BZ1 - BZ0]], [3, 3, 7, 7], 5);
const CUSH = rrect(-11, -11, 11, 11, 5, 4), CUSHIN = rrect(-9.6, -9.6, 9.6, 9.6, 3.6, 4);

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let reach = value;
  const X = (i) => i * GAP;
  const C = Cam(45, 0.5, 2.02);
  const e = X(N - 1) + 17;
  fit(C, [[-17, -17, 0], [e, 17, 0], [-17, 17, 0], [e, -17, 0], [-17, -17, BZ1], [e, -17, BZ1]], 200, 170);
  const P = proj(C), front = facing(C);

  /** A ring turned by th radians about the chair's axis at x, normals turned with it. */
  const turn = (ring, th, x) => ring.map((q) => {
    const c = Math.cos(th), s = Math.sin(th);
    return { u: x + q.u * c - q.v * s, v: q.u * s + q.v * c, nu: q.nu * c - q.nv * s, nv: q.nu * s + q.nv * c };
  });

  const g = mk("g", {}, svg);
  const chairs = [];
  for (let i = 0; i < N; i++) {
    const x = X(i), cg = mk("g", {}, g);
    // the base, which never turns: five legs out to their casters, and the gas column
    const legs = ["", ""];
    for (let k = 0; k < 5; k++) {
      const a = rad(REST[i] + 18 + k * 72), ex = x + LEG * Math.cos(a), ey = LEG * Math.sin(a);
      legs[Math.cos(a) + Math.sin(a) > 0 ? 1 : 0] += seg(P(x, 0, 5), P(ex, ey, 3));
      place(mk("circle", { r: 1.4, class: "dot off" }, cg), P(ex, ey, 1.2));
    }
    // the far legs go behind the column, the near ones in front of it
    mk("path", { d: legs[0], class: "nf" }, cg);
    put(solid(cg), prism(P, front, turn(circ(1.8, 12), 0, x), turn(circ(1.1, 12), 0, x), 4, Z0));
    mk("path", { d: legs[1], class: "nf" }, cg);
    const top = mk("g", {}, cg);
    const seat = solid(top);
    const bg = mk("g", {}, top), stem = mk("path", { class: "nf" }, bg), bBack = mk("path", { class: "lo" }, bg), bFace = mk("path", { class: "sil" }, bg);
    chairs.push({ x, top, seat, stem, bg, bBack, bFace, sp: spring(rad(REST[i])), drawn: NaN });
  }

  function draw(ch, th) {
    if (th === ch.drawn) return;
    ch.drawn = th;
    const fx = Math.cos(th), fy = Math.sin(th), tx = -fy, ty = fx;
    put(ch.seat, prism(P, front, turn(CUSH, th, ch.x), turn(CUSHIN, th, ch.x), Z0, Z1));
    // the backrest: a rounded plate standing behind the cushion, two faces a plate's thickness apart
    const at = (s, v, o) => P(ch.x - fx * (BK + o) + tx * s, -fy * (BK + o) + ty * s, BZ0 + v);
    const vis = -(fx * V[0] + fy * V[1]) > 0, o0 = vis ? 0 : BT, o1 = vis ? BT : 0;
    ch.bBack.setAttribute("d", poly(BACK.map(([s, v]) => at(s, v, o0))));
    ch.bFace.setAttribute("d", poly(BACK.map(([s, v]) => at(s, v, o1))));
    const sb = (o, z) => P(ch.x - fx * o, -fy * o, z), so = BK + BT + 0.8;
    ch.stem.setAttribute("d", open([sb(11, Z0 + 1), sb(so, Z0 + 1), sb(so, BZ0 + 9)]));
    // facing the viewer, the backrest and its stem stand behind the cushion; facing away, in front of it
    const toward = fx + fy > 0;
    if (toward) { ch.top.prepend(ch.bg); ch.bg.prepend(ch.stem); } else { ch.top.append(ch.bg); ch.bg.append(ch.stem); }
  }

  const B = register(stage, (dt) => {
    let m = false;
    for (const ch of chairs) { if (stepS(ch.sp, dt)) m = true; draw(ch, ch.sp.x); }
    return m;
  });
  bag.add(B.unregister);

  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  let lit = -2;
  function light(k) {
    if (k === lit) return;
    lit = k;
    chairs.forEach((ch, i) => { const on = i === (k < 0 ? LIT : k); ch.seat.sil.classList.toggle("hi", on); ch.bFace.classList.toggle("hi", on); });
    read.textContent = k < 0 ? "rest" : `seat ${k + 1}`;
  }
  /** The pointer is read on the floor, which never moves; each chair turns toward it by a weight that falls off to a floor. */
  let last = null;
  function aim(p) {
    last = p;
    let near = -1, best = PICK;
    chairs.forEach((ch, i) => {
      const r0 = rad(REST[i]);
      if (!p) { ch.sp.t = r0; return; }
      const [px, py] = unproj(C, p[0], p[1], 0), d = Math.hypot(px - ch.x, py);
      const w = clamp(Math.exp(-2.8 * (d / reach) ** 2), 0.09, 1);
      ch.sp.t = r0 + w * wrap(Math.atan2(py, px - ch.x) - r0);
      if (d < best) { best = d; near = i; }
    });
    light(near);
    B.wake();
  }

  bag.add(pointer(stage, { move: aim, leave: () => aim(null) }));
  bag.add(() => svg.replaceChildren());
  aim(null);

  return {
    set: (v) => { reach = v; if (last) aim(last); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "seats",
  means: "Seat-based licensing as a row of office chairs: the ones near the pointer swivel round to face it, the farther the less.",
  rules: [1, 3, 4, 5],
  range: [40, 75, 130],
  tour: [[63, 179], [171, 233], [279, 287], null],
  mount,
});
