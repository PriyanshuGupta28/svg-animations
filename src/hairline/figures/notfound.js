/**
 * Not found: an empty state for a 404. A card-file drawer pulled out of its
 * cabinet, holding a run of index cards and three divider tabs, every card and
 * tab blank, and the label holder on the drawer front empty. The pointer is a
 * field along the run: the cards near it riffle open, the ones behind leaning
 * back and the ones in front tipping forward, the nearest lifting, falling off
 * with distance on a spring per card. At rest the run is split at one divider,
 * whose edge is bright. The slider is the falloff radius, in cards.
 */
const {
  Cam, clamp, facing, fillet, fit, hull, open, poly, prism, proj, rad, ringAt, rings, rrect, run,
  spring, stepS, disposer, mk, pointer, put, register, solid,
} = HL;

const N = 11, W = 58, H = 38, G = 8, TK = 1.4, TW = 16, TH = 7, TABS = [5, 21, 37];
const DIV = { 2: 0, 6: 1, 9: 2 }, MARK = 6, REST = -12, LIFT = 14, AMP = 22;
const X0 = -5, X1 = W + 5, Y0 = 0, Y1 = 12 + (N - 1) * G + 10, WH = 20, WR = 5, WT = 2.2;
const yb = (i) => 12 + i * G;
const hash = (i) => { const s = Math.sin(i * 12.9898 + 4.1) * 43758.5453; return s - Math.floor(s); };
/** Rest lean: split at the marked divider, the cards behind it lying back, the ones in front tipped forward. */
const lean0 = (i) => (i <= MARK ? -9 - 7 * hash(i) : 5 + 4 * hash(i));
/** Share of the full riffle at u radii: 1 → .31 at 42% → .09 beyond. */
const falloff = (u) =>
  u <= 0 ? 1 : u <= 0.417 ? 1 - (u / 0.417) * 0.6875 : u <= 1 ? 0.3125 - ((u - 0.417) / 0.583) * 0.2185 : 0.094;
const LR = (pts) => (pts[0][0] <= pts[pts.length - 1][0] ? pts : pts.slice().reverse());

/** A card's outline, upright in its own plane; a divider carries a tab. */
function outline(i) {
  if (!(i in DIV)) return fillet([[0, 0], [W, 0], [W, H], [0, H]], [1, 1, 2.6, 2.6]);
  const t0 = TABS[DIV[i]];
  return fillet([[0, 0], [W, 0], [W, H], [t0 + TW, H], [t0 + TW, H + TH], [t0, H + TH], [t0, H], [0, H]],
    [1, 1, 2.6, 1.6, 2.4, 2.4, 1.6, 2.6]);
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let R = value, over = null;

  const C = Cam(45, 0.5, 1.72);
  fit(C, [[X0 - 7, -34, WH + 14], [X1 + 7, -34, -6], [X1 + 3, Y1 + 4, -3], [X0 - 7, Y1 + 4, -3],
    [X0 - 7, -34, -6], [0, yb(MARK), H + TH + LIFT], [W, yb(MARK), H + LIFT]], 200, 166);
  const P = proj(C), front = facing(C);
  const g = mk("g", {}, svg);
  const onFace = (ring, y) => poly(ring.map((q) => P(q.u, y, q.v)));

  // the cabinet, and the opening the drawer slides out of
  const [cr, ci] = rings(X0 - 7, -34, X1 + 7, Y0, 4, 1.8);
  put(solid(g), prism(P, front, cr, ci, -6, WH + 14));
  mk("path", { d: onFace(rrect(X0 - 2, -2.5, X1 + 2, WH + 3, 3, 5), Y0), class: "nf lo" }, g);

  // the drawer's far half
  const outer = rrect(X0, Y0, X1, Y1, WR, 6), inner = rrect(X0 + WT, Y0 + WT, X1 - WT, Y1 - WT, WR - WT, 6);
  mk("path", { d: poly(hull(ringAt(P, outer, 0).concat(ringAt(P, outer, WH)))), class: "sil" }, g);
  mk("path", { d: poly(ringAt(P, inner, WH)), class: "nf" }, g);
  mk("path", { d: open(ringAt(P, run(inner, (q) => !front(q)), 2.5)), class: "nf lo" }, g);

  const cards = [];
  for (let i = 0; i < N; i++) {
    const grp = mk("g", {}, g), y = yb(i);
    const back = mk("path", { class: "lo" }, grp), face = mk("path", { class: "sil" }, grp);
    // the lean is clamped so a card never passes the drawer's ends
    const lo = -Math.asin(Math.min(1, (y - Y0 - 3) / H)) * 180 / Math.PI;
    const hi = Math.asin(Math.min(1, (Y1 - 3 - y) / H)) * 180 / Math.PI;
    const th0 = clamp(lean0(i), lo, hi);
    cards.push({ i, y, shape: outline(i), back, face, th0, lo, hi, a: spring(th0, { eps: 0.05 }), z: spring(0, { eps: 0.04 }), drawn: "" });
  }

  // the drawer's near walls and its front: taller than the sides, an empty label holder over a cup pull
  const iF = LR(ringAt(P, run(inner, front), WH)), oT = LR(ringAt(P, run(outer, front), WH)), oB = LR(ringAt(P, run(outer, front), 0));
  mk("path", { d: poly([...iF, oT[oT.length - 1], ...oB.slice().reverse(), oT[0]]), class: "fo" }, g);
  mk("path", { d: open(iF), class: "nf" }, g);
  mk("path", { d: open([oT[0], ...oB, oT[oT.length - 1]]), class: "nf sil" }, g);
  const [fr, fi] = rings(X0 - 3, Y1, X1 + 3, Y1 + 4, 1.8, 0.8);
  put(solid(g), prism(P, front, fr, fi, -3, WH + 6));
  const hx = (X0 + X1) / 2, FY = Y1 + 4;
  mk("path", { d: onFace(rrect(hx - 12, 14, hx + 12, 22, 1.6, 4), FY), class: "nf" }, g);
  mk("path", { d: onFace(rrect(hx - 10.4, 15.4, hx + 10.4, 20.6, 1, 4), FY), class: "nf lo" }, g);
  mk("path", { d: onFace(rrect(hx - 8, 4, hx + 8, 9.5, 2.6, 5), FY), class: "nf" }, g);

  function draw(cd) {
    const th = cd.a.x, lift = Math.max(0, cd.z.x), key = th + "," + lift;
    if (key === cd.drawn) return;
    cd.drawn = key;
    const s = Math.sin(rad(th)), c = Math.cos(rad(th));
    cd.face.setAttribute("d", poly(cd.shape.map(([u, v]) => P(u, cd.y + v * s, v * c + lift))));
    cd.back.setAttribute("d", poly(cd.shape.map(([u, v]) => P(u, cd.y + v * s - TK * c, v * c + TK * s + lift))));
  }

  const B = register(stage, (dt) => {
    let m = false;
    for (const cd of cards) { if (stepS(cd.a, dt) | stepS(cd.z, dt)) m = true; draw(cd); }
    return m;
  });
  bag.add(B.unregister);

  // the hit band: oblique strips along the RESTING top edges, which never move
  const top = (i) => P(W / 2, yb(i) + H * Math.sin(rad(REST)), H * Math.cos(rad(REST)));
  const c0 = top(0), c1 = top(1), d = [c1[0] - c0[0], c1[1] - c0[1]];
  const px0 = P(0, 0, 0), px1 = P(1, 0, 0), ex = [px1[0] - px0[0], px1[1] - px0[1]];
  const HALF = W / 2 + 6, det = d[0] * ex[1] - d[1] * ex[0];
  /** Where along the run the point lies, in cards; null off the drawer. */
  function hit([x, y]) {
    const qx = x - c0[0], qy = y - c0[1];
    const s = (qx * ex[1] - qy * ex[0]) / det, r = (d[0] * qy - d[1] * qx) / det;
    return Math.abs(r) > HALF || s < -1 || s > N ? null : clamp(s, 0, N - 1);
  }

  function retarget() {
    const k = over === null ? -1 : Math.round(over);
    for (const cd of cards) {
      if (over === null) { cd.a.t = cd.th0; cd.z.t = 0; } else {
        const f = falloff(Math.abs(cd.i - over) / R);
        cd.a.t = clamp(-8 + clamp((cd.i - over) / 0.7, -1, 1) * AMP * f, cd.lo, cd.hi);
        cd.z.t = LIFT * f;
      }
      cd.face.classList.toggle("hi", cd.i === (k < 0 ? MARK : k));
    }
    read.textContent = k < 0 ? "rest" : `card ${N - k} · 0`;
    B.wake();
  }

  bag.add(pointer(stage, {
    move: (p) => { over = hit(p); retarget(); },
    leave: () => { over = null; retarget(); },
  }));
  bag.add(() => svg.replaceChildren());
  retarget();

  return {
    set: (v) => { R = v; retarget(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "notfound",
  means: "Not found: a card file pulled open, every card blank. The cards near the pointer riffle open, less the farther they lie.",
  rules: [1, 3, 5, 8],
  range: [1.5, 3, 5],
  tour: [[200, 135], [239, 116], [150, 160], null],
  mount,
});
