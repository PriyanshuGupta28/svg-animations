/**
 * Watch: a smartwatch lying face up on its strap, a rounded square case with
 * a knurled digital crown and a side button, the strap's holes on one end
 * and its buckle on the other. On the glass, a ring of twelve complication
 * dots round three activity arcs. The pointer pushes it: entering the face, or
 * moving round it on the glass's plane, which never moves, adds spin; the
 * crown, the arcs and the ring turn together, friction bleeds it, and a detent catches
 * the ring on a whole tick. At rest it has stopped on tick 7 and the crown is
 * bright. The slider is the coast: the friction, per second.
 */
const {
  Cam, circ, clamp, facing, fillet, fit, hull, open, poly, prism, proj, rrect, run, seg, unproj,
  spring, stepS, reducedMotion, disposer, flatDot, mk, place, pointer, put, register, solid,
} = HL;

const N = 12, STEP = (2 * Math.PI) / N, CW = 24, CL = 28, ZS = 2.5, ZT = 12, RR = 14.5;
const KX0 = CW - 0.5, KX1 = CW + 5, KY = -7, KZ = 7.2, KR = 3.6, CATCH = 1.2, VMAX = 14, REST = 7 * STEP;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let F = value;
  const C = Cam(45, 0.5, 3.0);
  fit(C, [[-15, -50, 0], [15, -50, 0], [-15, 50, 0], [15, 50, 0], [-CW, -CL, ZT], [KX1, KY, ZT], [CW, CL, ZT]], 200, 166);
  const P = proj(C), front = facing(C);
  // toward the eye: the world direction the projection flattens, taken upward; the crown's axis lies along x
  const o = P(0, 0, 0), [ex, ey, ez] = [P(1, 0, 0), P(0, 1, 0), P(0, 0, 1)].map((p) => [p[0] - o[0], p[1] - o[1]]);
  const eye = [ey[0] * ez[1] - ez[0] * ey[1], ez[0] * ex[1] - ex[0] * ez[1], ex[0] * ey[1] - ey[0] * ex[1]];
  const up = eye[2] < 0 ? -1 : 1, sees = (ny, nz) => up * (ny * eye[1] + nz * eye[2]) > 0;
  const loop = (ring, z) => poly(ring.map((q) => P(q.u, q.v, z)));

  const g = mk("g", {}, svg);
  // the strap, flat on the desk: holes toward the viewer, the buckle and its keeper at the far end
  const sr = rrect(-16, -50, 16, 50, 7, 10), si = rrect(-14.8, -48.8, 14.8, 48.8, 5.8, 10);
  put(solid(g), prism(P, front, sr, si, 0, ZS));
  let marks = "";
  for (let y = 32; y <= 44; y += 4) marks += loop(circ(1.2, 10).map((q) => ({ u: q.u, v: q.v + y })), ZS);
  marks += loop(rrect(-11, -47, 11, -39, 3, 4), ZS) + seg(P(0, -47, ZS), P(0, -39, ZS));
  marks += seg(P(-15, -34, ZS), P(15, -34, ZS)) + seg(P(-15, -31, ZS), P(15, -31, ZS));
  mk("path", { class: "nf lo", d: marks }, g);

  // the case, its glass and the index at twelve
  // large rounds, so their rings are built with more steps
  const cr = rrect(-CW, -CL, CW, CL, 12, 14), ci = rrect(-CW + 1.4, -CL + 1.4, CW - 1.4, CL - 1.4, 10.6, 14);
  put(solid(g), prism(P, front, cr, ci, ZS, ZT));
  mk("path", { class: "nf lo", d: loop(rrect(-CW + 3.5, -CL + 3.5, CW - 3.5, CL - 3.5, 9, 6), ZT) + seg(P(0, -RR - 5, ZT), P(0, -RR - 2.5, ZT)) }, g);
  // what turns: three activity arcs of different lengths, and the ring of twelve dots
  const face = mk("path", { class: "nf" }, g), ARCS = [[11.5, 0.8], [8.5, 0.6], [5.5, 0.4]];
  const dots = [];
  for (let k = 0; k < N; k++) dots.push(flatDot(g, C, 1.15, k ? "dot off" : "dot m"));

  // the side button, flush in the right wall, and the crown standing out of it
  mk("path", { class: "nf lo", d: poly(rrect(4, 4.8, 14, 9.6, 2.4, 3).map((q) => P(CW + 0.1, q.u, q.v))) }, g);
  const crown = solid(g), knurl = mk("path", { class: "nf lo" }, g);
  const cap = circ(KR, 24), capIn = circ(KR - 0.7, 24);
  const onX = (x, q) => P(x, KY + q.u, KZ + q.v);
  // a cylinder on its side: the hull of its two end caps, the crease on the cap that faces out
  crown.sil.setAttribute("d", poly(hull(cap.map((q) => onX(KX0, q)).concat(cap.map((q) => onX(KX1, q))))));
  crown.cr.setAttribute("d", open(run(capIn, (q) => sees(q.u, q.v)).map((q) => onX(KX1, q))));

  let rot = REST, vel = 0, sp = null, drawn = NaN, over = false;
  const tick = () => ((Math.round(rot / STEP) % N) + N) % N;
  const on = (r, a) => [r * Math.sin(a), -r * Math.cos(a)];
  function draw() {
    if (rot === drawn) return;
    drawn = rot;
    dots.forEach((el, k) => { const [x, y] = on(RR, rot + k * STEP); place(el, P(x, y, ZT)); });
    // each arc a band, its two edges joined by round ends
    face.setAttribute("d", ARCS.map(([r, share], k) => {
      const a0 = rot * (1 + k * 0.5), out = [], back = [];
      for (let i = 0; i <= 24; i++) {
        const a = a0 + 2 * Math.PI * share * (i / 24), [x0, y0] = on(r + 1.1, a), [x1, y1] = on(r - 1.1, a);
        out.push(P(x0, y0, ZT)); back.unshift(P(x1, y1, ZT));
      }
      return poly(fillet(out.concat(back), out.concat(back).map((_, i) => (i === 0 || i === 24 || i === 25 || i === 49 ? 1.1 : 0)), 3));
    }).join(""));
    let d = "";
    for (let j = 0; j < 10; j++) {
      const a = 1.5 * rot + j * (Math.PI / 5), ny = Math.cos(a), nz = Math.sin(a);
      if (sees(ny, nz)) d += seg(P(KX0 + 1, KY + KR * ny, KZ + KR * nz), P(KX1 - 0.6, KY + KR * ny, KZ + KR * nz));
    }
    knurl.setAttribute("d", d);
  }
  function mark() {
    crown.sil.classList.toggle("hi", !over);
    dots[0].setAttribute("class", over ? "dot" : "dot m");
    read.textContent = over ? `tick ${tick()}` : "rest";
  }

  /** A spring onto the next detent in the direction of travel. */
  function catchIt(ahead) {
    const n = rot / STEP;
    sp = spring(rot);
    sp.t = STEP * (vel > 0 ? Math.ceil(n + ahead) : vel < 0 ? Math.floor(n - ahead) : Math.round(n));
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
    if (over) mark();
    return m;
  });
  bag.add(B.unregister);

  function push(dv) {
    sp = null;
    vel = clamp(vel + dv, -VMAX, VMAX);
    B.wake();
  }

  // The pointer meets the glass's plane, which never moves.
  let prev = null;
  bag.add(pointer(stage, {
    move: (p) => {
      const [u, v] = unproj(C, p[0], p[1], ZT), a = Math.atan2(v, u);
      over = Math.abs(u) < CW + 8 && Math.abs(v) < CL + 6;
      if (!over) { prev = null; mark(); return; }
      // entering flicks it the way the hand came in; moving round the face pushes along it
      push(prev === null ? 9 * clamp((u - v) / (CW * 1.4), -1, 1) : 10 * wrap(a - prev));
      prev = a;
      mark();
    },
    leave: () => { over = false; prev = null; mark(); },
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
  name: "watch",
  means: "A smartwatch on its strap: push it round, the crown and a ring of dots turn, friction slows them, a detent catches a tick.",
  rules: [1, 3, 5, 8],
  range: [3.2, 1.6, 0.7],
  tour: [[130, 146], [238, 141], [205, 175], null],
  mount,
});
