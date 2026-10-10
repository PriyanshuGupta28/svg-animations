/**
 * Crate: a plastic drinks crate, open at the top, its grid of dividers
 * holding two rows of four tall cans, a hand-hold cut through each end. Each
 * can is a 500ml can: 2.8 times as tall as it is wide, its top necked in to a
 * rim, a pull tab on the lid, a chamfered foot round its dome. The pointer
 * picks a can, tested on each can's resting outline; it lifts clear of its
 * cell and its neighbours lift a little, staggered outwards on the 700ms
 * tween. At rest the cans stand at uneven heights and one is bright. The
 * slider is the stagger, in ms.
 */
const {
  Cam, circ, facing, fit, hull, open, poly, prism, proj, ringAt, rings, rrect, run,
  tween, tset, tval, tdone, disposer, mk, pointer, put, register, solid,
} = HL;

const NX = 4, NY = 2, PITCH = 22, R = 9.5, H = 54, WH = 15, FL = 3, LIFT = 34, NUDGE = [0, 10, 5];
const X1 = NX * PITCH, Y1 = NY * PITCH, WT = 2.4;
/** Rest: how far each can stands above its floor, row by row; and the one that is bright. */
const REST = [[2, 9, 0, 5], [6, 0, 13, 3]], MARK = [1, 2];
/** The can's profile, foot to rim: [z, radius]. The foot chamfers in round the dome; the neck steps in to the rim. */
const PROF = [[0, R - 2.6], [2, R], [H - 9, R], [H - 3.5, R - 2.5], [H - 1.2, R - 2.3], [H, R - 2.3]];

const at = (ring, cx, cy) => ring.map((q) => ({ ...q, u: q.u + cx, v: q.v + cy }));

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;

  const S = 2.1, C = Cam(45, 0.5, S);
  const tops = [];
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) tops.push([i * PITCH + PITCH / 2, j * PITCH + PITCH / 2, FL + LIFT + H]);
  fit(C, [[-WT, -WT, 0], [X1 + WT, Y1 + WT, 0], [X1 + WT, -WT, 0], [-WT, Y1 + WT, 0], ...tops], 200, 166);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  // The crate: one body whose crease is the rim's inner edge, a skirt line, a hand-hold through each end, and the grid of cells.
  const [outer, inner] = rings(-WT, -WT, X1 + WT, Y1 + WT, 4, 1.6);
  put(solid(g), prism(P, front, outer, inner, 0, WH));
  mk("path", { d: open(ringAt(P, run(outer, front), 5)), class: "nf lo" }, g);
  const onEnd = (ring) => poly(ring.map((q) => P(X1 + WT, q.u, q.v)));
  mk("path", { d: onEnd(rrect(Y1 / 2 - 12, WH - 10, Y1 / 2 + 12, WH - 4, 3, 5)), class: "nf" }, g);
  mk("path", { d: onEnd(rrect(Y1 / 2 - 10.6, WH - 8.8, Y1 / 2 + 10.6, WH - 5.2, 1.8, 5)), class: "nf lo" }, g);
  const cells = [];
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
    const x0 = i * PITCH, y0 = j * PITCH;
    cells.push(poly(ringAt(P, rrect(x0 + 0.8, y0 + 0.8, x0 + PITCH - 0.8, y0 + PITCH - 0.8, 3, 4), WH)));
  }
  mk("path", { d: cells.join(""), class: "nf" }, g);

  // The cans, by ascending i + j, so a nearer can is painted over a farther one. Only what stands above the crate's rim is drawn.
  const cans = [];
  for (let s = 0; s <= NX + NY - 2; s++) for (let j = 0; j < NY; j++) {
    const i = s - j;
    if (i < 0 || i >= NX) continue;
    const cg = mk("g", {}, g);
    cans.push({
      i, j, cx: i * PITCH + PITCH / 2, cy: j * PITCH + PITCH / 2, rest: REST[j][i], z: tween(REST[j][i]), drawn: NaN,
      sil: mk("path", { class: "sil" }, cg), lid: mk("path", { class: "nf" }, cg), neck: mk("path", { class: "nf lo" }, cg),
      tab: mk("path", { class: "nf" }, cg), hole: mk("path", { class: "nf lo" }, cg),
    });
  }

  function draw(c, zb) {
    const pts = [];
    for (let k = 0; k < PROF.length; k++) {
      const [z, r] = PROF[k], zz = zb + z;
      if (zz >= WH) pts.push(...ringAt(P, at(circ(r, 24), c.cx, c.cy), zz));
      else if (k + 1 < PROF.length && zb + PROF[k + 1][0] > WH) pts.push(...ringAt(P, at(circ(R, 24), c.cx, c.cy), WH));
    }
    const zt = zb + H;
    c.sil.setAttribute("d", poly(hull(pts)));
    c.lid.setAttribute("d", poly(ringAt(P, at(circ(R - 3.2, 24), c.cx, c.cy), zt - 0.6)));
    c.neck.setAttribute("d", open(ringAt(P, at(run(circ(R, 24), front), c.cx, c.cy), zb + H - 9)));
    const flat = (ring) => poly(ring.map((q) => P(c.cx + q.u, c.cy + q.v, zt - 0.5)));
    c.tab.setAttribute("d", flat(rrect(-1.5, -2, 5.5, 2, 2, 4)));
    c.hole.setAttribute("d", flat(rrect(-5.4, -1.6, -2, 1.6, 1.4, 4)));
  }

  const B = register(stage, (_dt, now) => {
    let m = false;
    for (const c of cans) {
      const zb = FL + tval(c.z, now);
      if (!tdone(c.z, now)) m = true;
      if (zb !== c.drawn) { c.drawn = zb; draw(c, zb); }
    }
    return m;
  });
  bag.add(B.unregister);

  // hit: among the cans whose resting outline on screen holds the pointer, the nearest one, which is painted on top
  const half = (PITCH / 2) * S * Math.SQRT1_2;
  function hit([sx, sy]) {
    let best = null;
    for (const c of cans) {
      const [ax, bot] = P(c.cx, c.cy, 0), top = P(c.cx, c.cy, FL + c.rest + H)[1] - R * S * 0.5;
      if (Math.abs(sx - ax) < half && sy > top && sy < bot) best = c;
    }
    return best;
  }

  const mark = cans.find((c) => c.j === MARK[0] && c.i === MARK[1]);
  let act;
  function setActive(a) {
    if (a === act) return;
    const now = performance.now(), from = a || act || mark;
    act = a;
    for (const c of cans) {
      const d = Math.hypot(c.i - from.i, c.j - from.j);
      tset(c.z, !a ? c.rest : c === a ? LIFT : NUDGE[Math.round(d)] || 0, now, d * stag);
      c.sil.classList.toggle("hi", c === (a || mark));
    }
    read.textContent = a ? `can ${a.j + 1}·${a.i + 1}` : "rest";
    B.wake();
  }

  bag.add(pointer(stage, { move: (p) => setActive(hit(p)), leave: () => setActive(null) }));
  bag.add(() => svg.replaceChildren());
  setActive(null);

  return {
    set: (v) => { stag = v; },
    destroy: bag.dispose,
  };
}

hairline({
  name: "crate",
  means: "A crate of tall cans: the can under the pointer lifts out of its cell, and its neighbours rise a little in turn.",
  rules: [1, 2, 5, 6],
  range: [0, 45, 90],
  tour: [[135, 150], [233, 137], [233, 199], null],
  mount,
});
