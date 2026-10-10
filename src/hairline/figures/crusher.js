/**
 * Crusher: a bench hydraulic press, a bed, two round columns, a crown with
 * its cylinder on top, a rod and a round platen, over one tall can standing
 * on the bed. The pointer's height lowers the ram on a spring, clamped to the
 * slider's reach; the can's wall takes up the travel in folds, its body
 * shortening while the same length of wall buckles out and in as rings. The
 * neck, the lid and the foot keep their shape. At rest the platen hangs
 * just clear of the lid and its face is bright. The slider is the deepest crush.
 */
const {
  Cam, circ, clamp, facing, fit, open, poly, prism, proj, ringAt, rings, rrect, run,
  spring, stepS, disposer, mk, pointer, put, register, solid,
} = HL;

const R = 12, H = 55, FOOT = 2.5, NECK = 7, NF = 4, PT = 5, PR = 13.5, RR = 4.5;
const XP = 32, BED = 6, GAP = 16, ZC = H + GAP + PT + 22, CW = 10, CY = 24;
const LR = (pts) => (pts[0][0] <= pts[pts.length - 1][0] ? pts : pts.slice().reverse());

/** The can's profile crushed by c (share of its height): [z, radius], foot to rim. The wall keeps its length; what it loses in height it folds out and in. */
function profile(c) {
  const Lb = H - FOOT - NECK, Lc = Math.max(Lb - c * H, 2), s = Lb / (2 * NF), v = Lc / (2 * NF);
  const d = 0.55 * Math.sqrt(Math.max(s * s - v * v, 0)), pts = [[0, R - 2.6], [FOOT, R]];
  for (let k = 1; k < 2 * NF; k++) pts.push([FOOT + k * v, R + d * (k % 2 ? 1 : -0.35)]);
  const zt = FOOT + Lc;
  pts.push([zt, R], [zt + NECK - 3, R - 2.4], [zt + NECK - 1, R - 2.2], [zt + NECK, R - 2.2]);
  return pts;
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let maxC = value;

  const C = Cam(45, 0.5, 1.9);
  fit(C, [[-XP - 10, -20, 0], [XP + 10, 20, 0], [XP + 10, -20, 0], [-XP - 10, 20, 0], [-XP - 6, 0, ZC + CW], [XP + 6, 0, ZC + CW], [0, 0, ZC + CW + CY + 3]], 200, 166);
  const P = proj(C), front = facing(C);
  const g = mk("g", {}, svg);
  const box = (x0, y0, x1, y1, r, b, z0, z1) => { const [o, i] = rings(x0, y0, x1, y1, r, b); put(solid(g), prism(P, front, o, i, z0, z1)); };
  const post = (x, r, z0, z1, n) => put(solid(g), prism(P, front, circ(r, n).map((q) => ({ ...q, u: q.u + x })), circ(r - 0.8, n).map((q) => ({ ...q, u: q.u + x })), z0, z1));

  // back to front: the bed with its two slots, the far column, the can, the platen and rod, the near column, the crown, the cylinder
  box(-XP - 10, -20, XP + 10, 20, 5, 1.6, 0, BED);
  mk("path", { d: [-20, 20].map((x) => poly(rrect(x - 3, -14, x + 3, 14, 2.5, 4).map((q) => P(q.u, q.v, BED)))).join(""), class: "nf lo" }, g);
  post(-XP, 4, BED, ZC, 16);
  const can = { sil: mk("path", { class: "sil" }, g), folds: mk("path", { class: "nf lo" }, g), lid: mk("path", { class: "nf" }, g), tab: mk("path", { class: "nf" }, g) };
  const platen = solid(g), rod = solid(g);
  platen.sil.classList.add("hi");
  post(XP, 4, BED, ZC, 16);
  box(-XP - 6, -10, XP + 6, 10, 5, 1.6, ZC, ZC + CW);
  put(solid(g), prism(P, front, circ(11, 32), circ(9.4, 32), ZC + CW, ZC + CW + CY));
  post(0, 6, ZC + CW + CY, ZC + CW + CY + 3, 20);

  /** s is the ram's travel: it closes the gap first, then every unit more crushes the can by the same. */
  function draw(s) {
    const c = Math.max(s - GAP, 0) / H, pr = profile(c), at = (r, z) => ringAt(P, circ(r, 24), z), zt = pr[pr.length - 1][0];
    const lefts = [], rights = [];
    for (const [z, r] of pr) {
      const q = at(r, BED + z).slice().sort((a, b) => a[0] - b[0]);
      lefts.push(q[0]); rights.push(q[q.length - 1]);
    }
    const foot = LR(ringAt(P, run(circ(pr[0][1], 24), front), BED)), top = LR(ringAt(P, run(circ(R - 2.2, 24), (q) => !front(q)), BED + zt));
    can.sil.setAttribute("d", poly([...foot, ...rights, ...top.reverse(), ...lefts.reverse()]));
    // the neck's shoulder always; a fold only once it has buckled out or in
    const rings2 = pr.slice(2, -3).filter(([, r], k, a) => k === a.length - 1 || Math.abs(r - R) > 0.3);
    can.folds.setAttribute("d", rings2.map(([z, r]) => open(ringAt(P, run(circ(r, 24), front), BED + z))).join(""));
    can.lid.setAttribute("d", poly(at(R - 3.2, BED + zt - 0.4)));
    can.tab.setAttribute("d", poly(rrect(-2, -2.4, 6, 2.4, 2, 4).map((q) => P(q.u, q.v, BED + zt - 0.3))));
    const zp = BED + H + GAP - s;
    put(platen, prism(P, front, circ(PR, 32), circ(PR - 1.4, 32), zp, zp + PT));
    put(rod, prism(P, front, circ(RR, 16), circ(RR - 0.8, 16), zp + PT, ZC));
  }

  const sp = spring(0, { eps: 0.02 });
  let drawn = NaN;
  const B = register(stage, (dt) => {
    const m = stepS(sp, dt);
    if (sp.x !== drawn) { drawn = sp.x; draw(sp.x); }
    return m;
  });
  bag.add(B.unregister);

  // the pointer's screen height, read from the platen's resting face down to the can's foot
  const yTop = P(0, 0, BED + H + GAP)[1], yFoot = P(0, 0, BED)[1];
  function retarget(p) {
    sp.t = p ? clamp(((p[1] - yTop) / (yFoot - yTop)) * (H + GAP), 0, GAP + maxC * H) : 0;
    read.textContent = p ? `crush ${Math.round((Math.max(sp.t - GAP, 0) / H) * 100)}%` : "rest";
    B.wake();
  }

  bag.add(pointer(stage, { move: retarget, leave: () => retarget(null) }));
  bag.add(() => svg.replaceChildren());
  retarget(null);

  return {
    set: (v) => { maxC = v; sp.t = Math.min(sp.t, GAP + v * H); B.wake(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "crusher",
  means: "A press over a tall can: the pointer lowers the ram, and the can's wall folds into rings as it gives way.",
  rules: [3, 5, 8, 9],
  range: [0.3, 0.5, 0.7],
  tour: [[200, 170], [200, 195], [200, 240], null],
  mount,
});
