/**
 * Funnel: a conversion funnel as a stack of five hollow tapered bowls, widest
 * at the top (visits) and narrowing down to paid, over a short spout. Each
 * bowl is a cone with a rolled rim and an open foot that sits in the mouth of
 * the one below. The pointer's x scrubs the gap between the bowls on a spring;
 * its y picks a bowl, tested on each bowl's target rim, and that rim takes the
 * bright edge. At rest the stack is loosely exploded, gaps uneven, with the
 * third bowl bright. The slider is the largest gap.
 */
const {
  Cam, circ, clamp, fit, facing, hull, open, poly, prism, proj, ringAt, run, unproj,
  spring, stepS, disposer, mk, pointer, put, register, solid,
} = HL;

/** Rim radius per bowl, top to bottom; each foot sits just inside the next rim. */
const R = [60, 47, 37, 28, 20], N = R.length, FOOT = [48.5, 38.5, 29.5, 21.5, 9];
const H = 11, WT = 2.4, SP = 18, SR = 4.5, MARK = 2;
/** Gap under each bowl at rest, as a share of the largest gap: a stack left loose, unevenly. */
const REST = [0.55, 0.2, 0.8, 0.35];

/** A run of points ordered left to right on screen. */
const LR = (pts) => (pts[0][0] <= pts[pts.length - 1][0] ? pts : pts.slice().reverse());

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let gmax = value;

  const C = Cam(45, 0.5, 1.62);
  const ext = [];
  for (let k = 0; k < 8; k++) {
    const c = Math.cos(k * Math.PI / 4), s = Math.sin(k * Math.PI / 4);
    ext.push([R[0] * c, R[0] * s, SP + N * H + 4 * 26], [SR * c, SR * s, 0]);
  }
  fit(C, ext, 200, 166);
  const P = proj(C), front = facing(C);

  /** Bottom of each bowl, from a list of gaps (gaps[i] lies under bowl i). */
  const bases = (gaps) => {
    const z = [];
    z[N - 1] = SP;
    for (let i = N - 2; i >= 0; i--) z[i] = z[i + 1] + H + gaps[i];
    return z;
  };

  const g = mk("g", {}, svg);
  put(solid(g), prism(P, front, circ(SR, 20), circ(SR - 1.2, 20), 0, SP + 1));

  // the bottom bowl first, so each wider bowl above covers the mouth below it
  const bowls = [];
  for (let i = N - 1; i >= 0; i--) {
    const bg = mk("g", {}, g);
    const k = {
      i, top: circ(R[i], 48), inner: circ(R[i] - WT, 48), foot: circ(FOOT[i], 40), hole: circ(FOOT[i] - WT, 40),
      body: mk("path", { class: "sil" }, bg), mouth: mk("path", { class: "nf" }, bg), hollow: mk("path", { class: "nf lo" }, bg),
      wall: mk("path", { class: "fo" }, bg), bead: mk("path", { class: "nf lo" }, bg),
      lip: mk("path", { class: "nf" }, bg), drawn: NaN,
    };
    bowls[i] = k;
  }
  const gaps = REST.map((r) => spring(r * value));

  function draw(k, z0) {
    if (z0 === k.drawn) return;
    k.drawn = z0;
    const z1 = z0 + H;
    k.body.setAttribute("d", poly(hull(ringAt(P, k.foot, z0).concat(ringAt(P, k.top, z1)))));
    k.mouth.setAttribute("d", poly(ringAt(P, k.inner, z1)));
    k.hollow.setAttribute("d", poly(ringAt(P, k.hole, z0 + 1.5)));
    const iF = LR(ringAt(P, run(k.inner, front), z1)), oT = LR(ringAt(P, run(k.top, front), z1)), oB = LR(ringAt(P, run(k.foot, front), z0));
    k.wall.setAttribute("d", poly([...iF, oT[oT.length - 1], ...oB.slice().reverse(), oT[0]]));
    // a rolled bead just under the rim
    k.bead.setAttribute("d", open(LR(ringAt(P, run(k.top, front), z1 - 2.6))));
    k.lip.setAttribute("d", open(iF));
  }

  const B = register(stage, (dt) => {
    let m = false;
    for (const s of gaps) if (stepS(s, dt)) m = true;
    const z = bases(gaps.map((s) => s.x));
    for (const k of bowls) draw(k, z[k.i]);
    return m;
  });
  bag.add(B.unregister);

  // The pointer's x across the top rim sets how far apart the bowls stand.
  const cx = P(0, 0, 0)[0], half = Math.abs(P(R[0] * Math.SQRT1_2, -R[0] * Math.SQRT1_2, 0)[0] - cx);
  const share = (sx) => clamp((sx - cx + half) / (2 * half), 0, 1);

  /** The bowl whose TARGET rim, unprojected at its own height, holds the pointer nearest its middle; -1 for none. */
  function hit([sx, sy]) {
    const z = bases(gaps.map((s) => s.t));
    let best = -1, bd = Infinity;
    for (const k of bowls) {
      const [x, y] = unproj(C, sx, sy, z[k.i] + H), d = Math.hypot(x, y);
      if (d < R[k.i] + 4 && d / R[k.i] < bd) { bd = d / R[k.i]; best = k.i; }
    }
    return best;
  }

  let act = null;
  function setActive(a) {
    if (a === act) return;
    act = a;
    for (const k of bowls) {
      const on = k.i === (a < 0 ? MARK : a);
      k.lip.classList.toggle("hi", on); k.mouth.classList.toggle("hi", on);
    }
    read.textContent = a < 0 ? "rest" : `stage ${a + 1} · ${Math.round((100 * R[a]) / R[0])}%`;
  }

  function move(p) {
    const s = share(p[0]);
    gaps.forEach((sp) => { sp.t = s * gmax; });
    setActive(hit(p));
    B.wake();
  }
  function leave() {
    gaps.forEach((sp, i) => { sp.t = REST[i] * gmax; });
    setActive(-1);
    B.wake();
  }

  bag.add(pointer(stage, { move, leave }));
  bag.add(() => svg.replaceChildren());
  setActive(-1);

  return {
    set: (v) => { gmax = v; if (act < 0) leave(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "funnel",
  means: "A conversion funnel as stacked, tapering bowls: the pointer's x pulls the stages apart, its height picks one.",
  rules: [1, 3, 4, 5],
  range: [10, 18, 26],
  tour: [[150, 160], [225, 210], [245, 250], null],
  mount,
});
