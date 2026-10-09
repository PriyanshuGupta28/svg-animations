/**
 * Knobs: an effects panel holding a 4 × 3 grid of rotary knobs. Each is a
 * tapered cap with a pointer fin across its top, standing in a ring of
 * tick dots; the tick the fin points at is lit. The pointer is read on the
 * panel, which never moves: every knob turns its fin towards it on a
 * spring, the near ones fully, the far ones only part way, and the nearest
 * takes the bright stroke. At rest the knobs hold a patch, each at its own
 * setting. The slider is the falloff, in world units: how far the pull reaches.
 */
const {
  Cam, clamp, facing, fit, hull, open, poly, prism, proj, rings, ringAt, rrect, run, unproj,
  spring, stepS, flatDot, mk, place, pointer, put, register, disposer, solid,
} = HL;

const COLS = 4, ROWS = 3, G = 36, RF = 10.5, RT = 8, H = 10, RK = 14.5, NT = 12;
const X1 = COLS * G, Y1 = ROWS * G, M = 4;
// a patch as it was left, in degrees: not a pattern
const REST = [210, 300, 160, 20, 250, 90, 330, 120, 40, 190, 280, 140];
const MARK = 6, FH = 4, FIN = rings(-RT + 2, -1.8, RT + 3, 1.8, 1.8, 0.6);
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let L = value, over = null;
  const C = Cam(45, 0.5, 1.68);
  fit(C, [[-M, -M, -7], [X1 + M, Y1 + M, -7], [X1 + M, -M, -7], [-M, Y1 + M, -7], [G / 2, G / 2, H + FH]], 200, 166);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  const [pr, pi] = rings(-M, -M, X1 + M, Y1 + M, 9, 2.2);
  put(solid(g), prism(P, front, pr, pi, -7, 0));

  const ks = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const i = r * COLS + c, a0 = (REST[i] * Math.PI) / 180;
    ks.push({ i, c, r, cx: c * G + G / 2, cy: r * G + G / 2, a0, sp: spring(a0, { eps: 0.002 }), drawn: NaN, lit: -1 });
  }
  // back to front, by x + y of each knob's centre
  for (const k of ks.slice().sort((a, b) => a.cx + a.cy - (b.cx + b.cy))) {
    const grp = mk("g", {}, g);
    k.ticks = [];
    for (let t = 0; t < NT; t++) {
      const a = (t / NT) * 2 * Math.PI, el = flatDot(grp, C, 0.85, "dot off");
      place(el, P(k.cx + RK * Math.cos(a), k.cy + RK * Math.sin(a), 0));
      k.ticks.push(el);
    }
    // the tapered cap: the hull of its foot and its smaller top
    const ring = (rr, n) => rrect(k.cx - rr, k.cy - rr, k.cx + rr, k.cy + rr, rr, n);
    k.el = solid(grp);
    put(k.el, { sil: poly(hull(ringAt(P, ring(RF, 6), 0).concat(ringAt(P, ring(RT, 6), H)))), crease: open(ringAt(P, run(ring(RT - 1, 6), front), H)) });
    k.fin = solid(grp);
    k.tip = flatDot(grp, C, 1.1, "dot m");
  }

  function draw(k) {
    const a = k.sp.x;
    if (a === k.drawn) return;
    k.drawn = a;
    const ca = Math.cos(a), sa = Math.sin(a);
    // the pointer fin across the top, turned to a, its tip past the cap's edge
    const turn = (ring) => ring.map((q) => ({ u: k.cx + q.u * ca - q.v * sa, v: k.cy + q.u * sa + q.v * ca, nu: q.nu * ca - q.nv * sa, nv: q.nu * sa + q.nv * ca }));
    put(k.fin, prism(P, front, turn(FIN[0]), turn(FIN[1]), H, H + FH));
    place(k.tip, P(k.cx + (RT + 1.2) * ca, k.cy + (RT + 1.2) * sa, H + FH));
    const lit = ((Math.round((a / (2 * Math.PI)) * NT) % NT) + NT) % NT;
    if (lit !== k.lit) {
      if (k.lit >= 0) k.ticks[k.lit].setAttribute("class", "dot off");
      k.lit = lit; k.ticks[lit].setAttribute("class", "dot m");
    }
  }

  const B = register(stage, (dt) => {
    let m = false;
    for (const k of ks) { if (stepS(k.sp, dt)) m = true; draw(k); }
    return m;
  });
  bag.add(B.unregister);

  function retarget() {
    let near = MARK, bd = Infinity;
    for (const k of ks) {
      let to = k.a0;
      if (over) {
        const dx = over[0] - k.cx, dy = over[1] - k.cy, d = Math.hypot(dx, dy);
        if (d < bd) { bd = d; near = k.i; }
        // near knobs point straight at it; far ones turn only part way
        to = k.a0 + clamp(Math.exp(-Math.max(0, d - G * 0.6) / L), 0.12, 1) * wrap(Math.atan2(dy, dx) - k.a0);
      }
      k.sp.t = k.sp.x + wrap(to - k.sp.x);
    }
    ks.forEach((k) => { k.el.sil.classList.toggle("hi", k.i === near); k.fin.sil.classList.toggle("hi", k.i === near); });
    const k = ks[near];
    read.textContent = over ? `knob ${k.c + 1}·${k.r + 1}` : "rest";
    B.wake();
  }

  // The panel never moves: the pointer is read on it.
  bag.add(pointer(stage, {
    move: (p) => {
      const q = unproj(C, p[0], p[1], 0);
      over = q[0] > -M - 8 && q[0] < X1 + M + 8 && q[1] > -M - 8 && q[1] < Y1 + M + 8 ? q : null;
      retarget();
    },
    leave: () => { over = null; retarget(); },
  }));
  bag.add(() => svg.replaceChildren());
  retarget();

  return {
    set: (v) => { L = v; if (over) retarget(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "knobs",
  means: "A panel of rotary knobs: each turns its pointer fin towards the pointer, the near ones all the way, the far ones only part way.",
  rules: [1, 3, 5, 9],
  range: [16, 60, 140],
  tour: [[136, 152], [286, 172], [198, 188], null],
  mount,
});
