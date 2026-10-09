/**
 * Sieve: an empty state for "no results". A stack of three test sieves on a
 * catch pan, meshes graded coarse to fine from the top down, every one bare.
 * The pointer picks a part, tested on each part's resting rim; the ones above
 * it lift away, staggered outwards from it on the 700ms tween, so its empty
 * mesh shows. At rest the stack is slightly loosened and the top rim is
 * bright. The slider is the stagger, in ms.
 */
const {
  Cam, fit, facing, hull, open, poly, prism, proj, ringAt, circ, run, seg, unproj,
  tween, tset, tval, tdone, disposer, mk, pointer, put, register, solid,
} = HL;

const N = 4, R = 44, WT = 3, H = 12, SK = 3, OPEN = 30;
/** Mesh pitch per sieve, top to bottom; the pan has none. */
const MESH = [11, 7.5, 5];
/** Gap under each part at rest, top to bottom: a stack left a little loose. */
const GAP = [13, 4, 1.5, 0];
const MARK = 0;

/** A run of points ordered left to right on screen. */
const LR = (pts) => (pts[0][0] <= pts[pts.length - 1][0] ? pts : pts.slice().reverse());

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;

  // rest bases, from the pan up
  const base = [];
  for (let i = N - 1, z = 0; i >= 0; i--) { z += GAP[i] + (i < N - 1 ? SK : 0); base[i] = z; z += H; }

  const C = Cam(45, 0.5, 2.05);
  fit(C, [[-R, -R, 0], [R, R, 0], [R, -R, 0], [-R, R, 0], [-R, -R, base[0] + H + OPEN], [R, -R, base[0] + H + OPEN]], 200, 166);
  const P = proj(C), front = facing(C);
  const outer = circ(R, 40), inner = circ(R - WT, 40);
  const footRing = circ(R - 3, 40), footInner = circ(R - 4.2, 40);

  const g = mk("g", {}, svg), parts = [];
  // the pan first, then each sieve above it, so a higher part covers the one below
  for (let i = N - 1; i >= 0; i--) {
    const pg = mk("g", {}, g), skirt = i < N - 1 ? solid(pg) : null;
    const body = mk("path", { class: "sil" }, pg), mouth = mk("path", { class: "nf" }, pg);
    const mesh = mk("path", { class: "nf lo" }, pg), seam = mk("path", { class: "nf lo" }, pg);
    const wall = mk("path", { class: "fo" }, pg), bead = mk("path", { class: "nf lo" }, pg);
    const lip = mk("path", { class: "nf" }, pg), side = mk("path", { class: "nf sil" }, pg);
    parts[i] = { i, skirt, body, mouth, mesh, seam, wall, bead, lip, side, lift: tween(0), drawn: NaN };
  }

  /** The mesh: two sets of chords across the inner circle, at height z. */
  function meshD(pitch, z) {
    const r = R - WT, n = Math.floor(r / pitch);
    let d = "";
    for (let k = -n; k <= n; k++) {
      const c = k * pitch, h = Math.sqrt(r * r - c * c);
      d += seg(P(-h, c, z), P(h, c, z)) + seg(P(c, -h, z), P(c, h, z));
    }
    return d;
  }

  function draw(k, lift) {
    if (lift === k.drawn) return;
    k.drawn = lift;
    const z0 = base[k.i] + lift, z1 = z0 + H, zf = z0 + 2;
    if (k.skirt) put(k.skirt, prism(P, front, footRing, footInner, z0 - SK, z0));
    k.body.setAttribute("d", poly(hull(ringAt(P, outer, z0).concat(ringAt(P, outer, z1)))));
    k.mouth.setAttribute("d", poly(ringAt(P, inner, z1)));
    k.mesh.setAttribute("d", k.i < N - 1 ? meshD(MESH[k.i], zf) : "");
    k.seam.setAttribute("d", open(ringAt(P, run(inner, (q) => !front(q)), zf)));
    const iF = LR(ringAt(P, run(inner, front), z1)), oT = LR(ringAt(P, run(outer, front), z1)), oB = LR(ringAt(P, run(outer, front), z0));
    k.wall.setAttribute("d", poly([...iF, oT[oT.length - 1], ...oB.slice().reverse(), oT[0]]));
    // a rolled bead just under the rim, as a test sieve has
    k.bead.setAttribute("d", open(LR(ringAt(P, run(outer, front), z1 - 2.5))));
    k.lip.setAttribute("d", open(iF));
    k.side.setAttribute("d", open([oT[0], ...oB, oT[oT.length - 1]]));
  }

  const B = register(stage, (_dt, now) => {
    let m = false;
    for (const k of parts) { draw(k, tval(k.lift, now)); if (!tdone(k.lift, now)) m = true; }
    return m;
  });
  bag.add(B.unregister);

  /** The part whose resting rim, unprojected at its own height, holds the pointer nearest its middle; -1 for none. */
  function hit([sx, sy]) {
    let best = -1, bd = R + 4;
    for (const k of parts) {
      const [x, y] = unproj(C, sx, sy, base[k.i] + H), d = Math.hypot(x, y);
      if (d < bd) { bd = d; best = k.i; }
    }
    return best;
  }

  let act = null;
  function setActive(a) {
    if (a === act) return;
    const now = performance.now(), from = a >= 0 ? a : act >= 0 ? act : MARK;
    act = a;
    for (const k of parts) {
      tset(k.lift, k.i < a ? OPEN : 0, now, Math.abs(k.i - from) * stag);
      const on = k.i === (a < 0 ? MARK : a);
      k.lip.classList.toggle("hi", on); k.mouth.classList.toggle("hi", on);
    }
    read.textContent = a < 0 ? "rest" : a === N - 1 ? "pan · 0" : `sieve ${a + 1} · 0`;
    B.wake();
  }

  bag.add(pointer(stage, { move: (p) => setActive(hit(p)), leave: () => setActive(-1) }));
  bag.add(() => svg.replaceChildren());
  setActive(-1);

  return {
    set: (v) => { stag = v; },
    destroy: bag.dispose,
  };
}

hairline({
  name: "sieve",
  means: "No results: a stack of graded sieves, every mesh bare. The ones above the sieve under the pointer lift to show it empty.",
  rules: [1, 2, 5, 6],
  range: [0, 45, 90],
  tour: [[200, 174], [200, 240], [200, 207], null],
  mount,
});
