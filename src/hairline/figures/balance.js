/**
 * Balance: an A/B test as a beam balance. A stepped foot, a pillar, a beam on
 * a pivot cap, and two pans hung plumb from its ends on three strings each,
 * each holding a small stack of weights: A at the far end, B at the near one.
 * The pointer is put on the ground; its x tips the beam toward that side on a
 * spring, clamped to the max tilt, and the needle in front of the pillar
 * swings across its scale. At rest the beam leans toward B and B's pan is
 * bright. The slider is the max tilt, in degrees.
 */
const {
  Cam, clamp, facing, fit, hull, open, poly, prism, proj, rad, ringAt, rings, rrect, run, seg, unproj,
  spring, stepS, disposer, mk, pointer, put, register, solid,
} = HL;

const L = 56, H = 64, HANG = 34, PR = 16, PD = 4.5, BT = 2.4, NL = 22, NY = 6, REST = 0.45, TOP = 18;
/** Weights per pan, bottom up, [radius, height]: A then B. */
const STACK = [[[8, 4], [6, 3.5]], [[9, 4], [7.5, 3.5], [6, 3.5]]];

/** A run of points ordered left to right on screen. */
const LR = (pts) => (pts[0][0] <= pts[pts.length - 1][0] ? pts : pts.slice().reverse());
const R2 = Math.SQRT1_2;
/**
 * A world point of the beam's frame, tilted th radians about the pivot: u along the beam, which runs
 * across the screen (A left, B right), v toward the viewer, dz across the beam.
 */
function W(u, v, dz, th) {
  const a = u * Math.cos(th) + dz * Math.sin(th);
  return [(a + v) * R2, (v - a) * R2, H - u * Math.sin(th) + dz * Math.cos(th)];
}
/** A circle as a ring of rrect samples, centred on (x, y). */
const disc = (x, y, r, n = 6) => rrect(x - r, y - r, x + r, y + r, r, n);

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let max = value, over = null;
  const C = Cam(45, 0.5, 1.95);
  const box = [[-22, -22, -6], [22, 22, -6]];
  for (const s of [-1, 1]) for (const a of [-TOP, TOP]) {
    const [ex, ey, ez] = W(s * L, 0, 0, rad(a));
    box.push([ex - PR, ey - PR, ez - HANG - PD], [ex + PR, ey + PR, ez - HANG - PD], [ex, ey, ez + 3]);
    box.push(W(0, NY, NL + 5, rad(a)));
  }
  fit(C, box, 200, 166);
  const P = proj(C), front = facing(C);
  const tp = (u, v, dz, th) => P(...W(u, v, dz, th));
  /** Whether a beam-frame ring sample faces the camera. */
  const bfront = (q) => front({ nu: (q.nu + q.nv) * R2, nv: (q.nv - q.nu) * R2 });

  const gA = mk("g", {}, svg), gM = mk("g", {}, svg), gB = mk("g", {}, svg);

  // the stand, which never moves: a stepped foot, the pillar, the pivot cap
  put(solid(gM), prism(P, front, disc(0, 0, 22, 14), disc(0, 0, 20, 14), -6, 0));
  put(solid(gM), prism(P, front, disc(0, 0, 11, 8), disc(0, 0, 9.6, 8), 0, 3));
  put(solid(gM), prism(P, front, disc(0, 0, 3.4, 4), disc(0, 0, 2.4, 4), 3, H - 6));
  put(solid(gM), prism(P, front, ...rings(-4.5, -4.5, 4.5, 4.5, 4.5, 1.2), H - 7, H - BT));
  // the needle's scale: an arc with three ticks, just in front of the pillar
  let sc = "";
  for (const f of [-22, 0, 22]) sc += seg(tp(0, NY - 0.5, NL + 1, rad(f)), tp(0, NY - 0.5, NL + 4, rad(f)));
  const arc = [];
  for (let f = -24; f <= 24; f += 4) arc.push(tp(0, NY - 0.5, NL + 2.5, rad(f)));
  mk("path", { d: sc + open(arc), class: "nf lo" }, gM);
  const beam = solid(gM), needle = mk("path", { class: "sil" }, gM);
  const [br, bi] = rings(-L - 3, -BT, L + 3, BT, BT, 1);

  const pans = [0, 1].map((i) => {
    const pg = i ? gB : gA;
    const back = mk("path", { class: "nf" }, pg), body = mk("path", { class: "sil" }, pg), mouth = mk("path", { class: "nf" }, pg);
    const weights = STACK[i].map(() => solid(pg)), knob = solid(pg);
    const wall = mk("path", { class: "fo" }, pg), lip = mk("path", { class: "nf" }, pg);
    const side = mk("path", { class: "nf sil" }, pg), fore = mk("path", { class: "nf" }, pg);
    return { i, s: i ? 1 : -1, back, body, mouth, weights, knob, wall, lip, side, fore };
  });

  function drawPan(k, th) {
    const [ex, ey, ez] = W(k.s * L, 0, -BT, th);
    const z1 = ez - HANG, z0 = z1 - PD;
    const top = disc(ex, ey, PR, 10), foot = disc(ex, ey, PR - 5, 8), inner = disc(ex, ey, PR - 1.6, 10);
    // three strings from the hook to the rim, the far ones painted behind the pan
    let bd = "", fd = "";
    for (const a of [90, 210, 330]) {
      const c = Math.cos(rad(a)), s = Math.sin(rad(a)), sg = seg(P(ex, ey, ez), P(ex + (PR - 1) * c, ey + (PR - 1) * s, z1));
      if (front({ nu: c, nv: s })) fd += sg; else bd += sg;
    }
    k.back.setAttribute("d", bd);
    k.fore.setAttribute("d", fd);
    k.body.setAttribute("d", poly(hull(ringAt(P, foot, z0).concat(ringAt(P, top, z1)))));
    k.mouth.setAttribute("d", poly(ringAt(P, inner, z1)));
    let z = z0 + 1;
    STACK[k.i].forEach(([r, h], j) => {
      put(k.weights[j], prism(P, front, disc(ex, ey, r, 4), disc(ex, ey, r - 1, 4), z, z + h));
      z += h;
    });
    put(k.knob, prism(P, front, disc(ex, ey, 2.2, 3), disc(ex, ey, 1.4, 3), z, z + 2.5));
    const iF = LR(ringAt(P, run(inner, front), z1)), oT = LR(ringAt(P, run(top, front), z1)), oB = LR(ringAt(P, run(foot, front), z0));
    k.wall.setAttribute("d", poly([...iF, oT[oT.length - 1], ...oB.slice().reverse(), oT[0]]));
    k.lip.setAttribute("d", open(iF));
    k.side.setAttribute("d", open([oT[0], ...oB, oT[oT.length - 1]]));
  }

  const sp = spring(REST * max);
  let drawn = NaN;
  function draw() {
    if (sp.x === drawn) return;
    drawn = sp.x;
    const th = rad(sp.x);
    put(beam, {
      sil: poly(hull(br.map((q) => tp(q.u, q.v, BT, th)).concat(br.map((q) => tp(q.u, q.v, -BT, th))))),
      crease: open(run(bi, bfront).map((q) => tp(q.u, q.v, BT, th))),
    });
    needle.setAttribute("d", poly([tp(-1.6, NY, 1, th), tp(1.6, NY, 1, th), tp(0, NY, NL, th)]));
    for (const k of pans) drawPan(k, th);
  }

  const B = register(stage, (dt) => {
    const m = stepS(sp, dt);
    draw();
    return m;
  });
  bag.add(B.unregister);

  function retarget() {
    const u = over ? clamp((over[0] - over[1]) * R2 / L, -1, 1) : REST, side = u >= 0 ? 1 : 0;
    sp.t = u * max;
    for (const k of pans) { k.lip.classList.toggle("hi", k.i === side); k.mouth.classList.toggle("hi", k.i === side); }
    read.textContent = over ? `${side ? "B" : "A"} +${Math.round(Math.abs(u) * 20)}%` : "rest";
    B.wake();
  }

  bag.add(pointer(stage, {
    move: (p) => { over = unproj(C, p[0], p[1], 0); retarget(); },
    leave: () => { over = null; retarget(); },
  }));
  bag.add(() => svg.replaceChildren());
  retarget();

  return {
    set: (v) => { max = v; retarget(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "balance",
  means: "An A/B test as a beam balance: the beam tips toward the side under the pointer, and that pan's lead is read out.",
  rules: [1, 3, 4, 5],
  range: [6, 12, 18],
  tour: [[300, 219], [100, 219], [235, 219], null],
  mount,
});
