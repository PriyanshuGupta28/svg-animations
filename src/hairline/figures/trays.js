/**
 * Trays: an empty state for "inbox zero". A stack of three desk letter trays
 * on short risers, each open at the front with a scooped finger cut, every
 * one empty. The pointer picks a tray, tested on each tray's resting volume
 * from the top down; it slides out toward the viewer and its neighbours slide
 * a little less, staggered outwards from it on the 700ms tween. At rest the
 * trays stand drawn out by uneven amounts and the middle lip is bright. The
 * slider is the stagger, in ms.
 */
const {
  Cam, facing, fit, hull, lerp, open, poly, prism, proj, rings, rrect, run, unproj,
  tween, tset, tval, tdone, disposer, mk, pointer, put, register, solid,
} = HL;

const N = 3, W = 78, D = 96, H = 11, GAP = 9, WT = 2.4, WR = 5, M = 3;
/** The finger scoop in each front wall: centre, half width, depth. */
const SC = W / 2, SW = 21, SD = 7.5;
/** How far each tray is drawn out, top to bottom: at rest, and by distance from the one chosen. */
const REST = [9, 24, 3], OUT = 34, FALL = [1, 0.5, 0.22], MARK = 1;
/** Risers under each upper tray, on its side walls. */
const POSTS = [[1.5, 20], [1.5, D - 30], [W - 1.5, 20], [W - 1.5, D - 30]], PR = 2.6;

/** A run of points ordered left to right on screen. */
const LR = (pts) => (pts[0][0] <= pts[pts.length - 1][0] ? pts : pts.slice().reverse());
/** The ring with extra samples along its front edge, so the scoop can dip it. */
const dense = (ring) => ring.flatMap((a, j) => {
  const b = ring[(j + 1) % ring.length];
  if (!(a.nv > 0.99 && b.nv > 0.99)) return [a];
  return Array.from({ length: 24 }, (_, k) => ({ ...a, u: lerp(a.u, b.u, k / 24), v: lerp(a.v, b.v, k / 24) }));
});
/** How far the top edge drops at a front sample: a smooth raised-cosine scoop. */
const dip = (q) => (q.nv > 0.99 && Math.abs(q.u - SC) < SW ? (SD * (1 + Math.cos((Math.PI * (q.u - SC)) / SW))) / 2 : 0);

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;
  const base = Array.from({ length: N }, (_, i) => (N - 1 - i) * (H + GAP));
  const ZT = base[0] + H;

  const C = Cam(45, 0.5, 1.72);
  fit(C, [[0, 0, 0], [W, 0, 0], [0, D + OUT, 0], [W, D + OUT, 0], [0, 0, ZT], [W, 0, ZT]], 200, 166);
  const P = proj(C), front = facing(C);
  const outer = dense(rrect(0, 0, W, D, WR, 5)), inner = dense(rrect(WT, WT, W - WT, D - WT, WR - WT, 5));
  const at = (ring, s, z, scoop) => ring.map((q) => P(q.u, q.v + s, z - (scoop ? dip(q) : 0)));
  const fIn = run(inner, front), fOut = run(outer, front), back = run(inner, (q) => !front(q));

  // bottom tray first, each tray's risers before it, so a higher tray covers what is below
  const g = mk("g", {}, svg), trays = [];
  for (let i = N - 1; i >= 0; i--) {
    const posts = i < N - 1 ? POSTS.map(() => solid(g)) : [];
    const tg = mk("g", {}, g);
    const body = mk("path", { class: "sil" }, tg), mouth = mk("path", { class: "nf" }, tg);
    const seam = mk("path", { class: "nf lo" }, tg), wall = mk("path", { class: "fo" }, tg);
    const edge = mk("path", { class: "nf lo" }, tg), lip = mk("path", { class: "nf" }, tg);
    const side = mk("path", { class: "nf sil" }, tg);
    trays[i] = { i, posts, body, mouth, seam, wall, edge, lip, side, s: tween(REST[i]), drawn: NaN };
  }

  function draw(k, s) {
    if (s === k.drawn) return;
    k.drawn = s;
    const z0 = base[k.i], z1 = z0 + H;
    k.posts.forEach((el, j) => {
      const [x, y] = POSTS[j], [r, ri] = rings(x - PR, y + s - PR, x + PR, y + s + PR, PR, 0.7);
      put(el, prism(P, front, r, ri, z0 - GAP, z0));
    });
    k.body.setAttribute("d", poly(hull(at(outer, s, z0).concat(at(outer, s, z1)))));
    k.mouth.setAttribute("d", poly(at(inner, s, z1, true)));
    k.seam.setAttribute("d", open(at(back, s, z0 + 1.5)));
    const iF = LR(at(fIn, s, z1, true)), oT = LR(at(fOut, s, z1, true)), oB = LR(at(fOut, s, z0));
    k.wall.setAttribute("d", poly([...iF, oT[oT.length - 1], ...oB.slice().reverse(), oT[0]]));
    k.edge.setAttribute("d", open(oT));
    k.lip.setAttribute("d", open(iF));
    k.side.setAttribute("d", open([oT[0], ...oB, oT[oT.length - 1]]));
  }

  const B = register(stage, (_dt, now) => {
    let m = false;
    for (const k of trays) { draw(k, tval(k.s, now)); if (!tdone(k.s, now)) m = true; }
    return m;
  });
  bag.add(B.unregister);

  /** The topmost tray whose resting volume (with the gap over it) the pointer's ray passes through; -1 for none. */
  function hit([sx, sy]) {
    for (let i = 0; i < N; i++) {
      const zt = base[i] + H + (i > 0 ? GAP : 0);
      for (let z = base[i]; z <= zt; z += 1) {
        const [x, y] = unproj(C, sx, sy, z), v = y - REST[i];
        if (x > -M && x < W + M && v > -M && v < D + M) return i;
      }
    }
    return -1;
  }

  let act = null;
  function setActive(a) {
    if (a === act) return;
    const now = performance.now(), from = a >= 0 ? a : act >= 0 ? act : MARK;
    act = a;
    for (const k of trays) {
      const n = Math.abs(k.i - from);
      tset(k.s, a < 0 ? REST[k.i] : OUT * FALL[Math.abs(k.i - a)], now, n * stag);
      const on = k.i === (a < 0 ? MARK : a);
      k.lip.classList.toggle("hi", on); k.mouth.classList.toggle("hi", on);
    }
    read.textContent = a < 0 ? "rest" : `tray ${a + 1} · 0`;
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
  name: "trays",
  means: "Inbox zero: a stack of letter trays, every one empty. The tray under the pointer slides out, its neighbours a little less.",
  rules: [1, 2, 5, 6],
  range: [0, 45, 90],
  tour: [[218, 119], [106, 175], [256, 218], null],
  mount,
});
