/**
 * Dominoes: sharing as a spiral of dominoes set out on a rounded board,
 * winding outwards from the middle. Each domino is a thin upright slab with a
 * bevelled face and the line across its middle. The pointer picks a domino;
 * it and every one after it topple outwards along the spiral, in turn, each
 * landing on the next; leaving stands them back up, staggered from where they
 * fell. At rest the first domino leans, poised, and is bright. The slider is
 * the stagger, in ms.
 */
const {
  Cam, facing, fit, hull, poly, proj, prism, rad, rings, rrect, seg, unproj,
  tween, tset, tval, tdone, disposer, mk, pointer, put, register, solid,
} = HL;

const MID = 92, BX = [12, 4, 158, 162], W = 12, T = 3.6, H = 21, D = 15, FALL = 58, LAST = 84, POISE = 10;
// The camera looks from +x, +y and above: the side of a face it can see.
const VIEW = [0.612, 0.612, 0.5];

/** The spiral, cut into dominoes D apart: each a centre and the way it falls. */
function spiral() {
  const out = [];
  let acc = D, prev = null;
  for (let f = 0; f <= 9.2; f += 0.01) {
    const r = 13 + 6.4 * f, p = [MID + r * Math.cos(f + 2.2), MID + r * Math.sin(f + 2.2)];
    if (prev) acc += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
    prev = p;
    if (acc >= D) {
      acc = 0;
      const dr = 6.4, tx = dr * Math.cos(f + 2.2) - r * Math.sin(f + 2.2), ty = dr * Math.sin(f + 2.2) + r * Math.cos(f + 2.2), l = Math.hypot(tx, ty);
      out.push({ x: p[0], y: p[1], t: [tx / l, ty / l] });
    }
  }
  return out;
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;
  const C = Cam(45, 0.5, 1.55);
  const [x0, y0, x1, y1] = BX;
  fit(C, [[x0, y0, -6], [x1, y1, -6], [x1, y0, -6], [x0, y1, -6], [x0, y0, H], [x1, y0, H]], 200, 166);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  const [br, bi] = rings(x0, y0, x1, y1, 14, 2.2);
  put(solid(g), prism(P, front, br, bi, -6, 0));

  const ds = spiral().map((d, i) => ({ ...d, i, th: tween(i === 0 ? POISE : 0), drawn: NaN }));
  const N = ds.length;
  for (const d of ds.slice().sort((a, b) => a.x + a.y - (b.x + b.y))) d.el = solid(mk("g", {}, g));

  const edge = rrect(-W / 2, 0, W / 2, H, 2, 3), bevel = rrect(-W / 2 + 1.3, 1.3, W / 2 - 1.3, H - 1.3, 1, 3);
  /** Domino d tipped th degrees forward about its front foot. */
  function draw(d, th) {
    if (th === d.drawn) return;
    d.drawn = th;
    const c = Math.cos(rad(th)), s = Math.sin(rad(th)), [tx, ty] = d.t, nx = -ty, ny = tx;
    const at = (tt, nn, zz) => {
      const t2 = T / 2 + (tt - T / 2) * c + zz * s, z2 = -(tt - T / 2) * s + zz * c;
      return P(d.x + tx * t2 + nx * nn, d.y + ty * t2 + ny * nn, z2);
    };
    const face = (ring, tt) => ring.map((q) => at(tt, q.u, q.v));
    const sil = poly(hull(face(edge, -T / 2).concat(face(edge, T / 2))));
    // the broad face the camera sees: its normal is the tangent tipped forward
    const tt = (tx * VIEW[0] + ty * VIEW[1]) * c - VIEW[2] * s > 0 ? T / 2 : -T / 2;
    put(d.el, { sil, crease: poly(face(bevel, tt)) + seg(at(tt, -W / 2 + 2.6, H / 2), at(tt, W / 2 - 2.6, H / 2)) });
  }

  const L = register(stage, (_dt, now) => {
    let m = false;
    for (const d of ds) { draw(d, tval(d.th, now)); if (!tdone(d.th, now)) m = true; }
    return m;
  });
  bag.add(L.unregister);

  /** The domino whose resting middle is nearest the pointer, on the plane halfway up; -1 off the spiral. */
  function hit(p) {
    const [x, y] = unproj(C, p[0], p[1], H / 2);
    let best = -1, bd = 11;
    for (const d of ds) { const e = Math.hypot(d.x - x, d.y - y); if (e < bd) { bd = e; best = d.i; } }
    return best;
  }

  let act = null;
  function setActive(a) {
    if (a === act) return;
    const now = performance.now(), from = a >= 0 ? a : act ?? 0;
    act = a;
    for (const d of ds) {
      const to = a >= 0 && d.i >= a ? (d.i === N - 1 ? LAST : FALL) : a < 0 && d.i === 0 ? POISE : 0;
      tset(d.th, to, now, Math.abs(d.i - from) * stag);
      d.el.sil.classList.toggle("hi", d.i === (a < 0 ? 0 : a));
    }
    read.textContent = a < 0 ? "rest" : `share ${String(a + 1).padStart(2, "0")}`;
    L.wake();
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
  name: "dominoes",
  means: "A spiral of dominoes: the one under the pointer falls, and every one after it follows in turn.",
  rules: [1, 2, 5, 8],
  range: [25, 45, 80],
  tour: [[192, 153], [228, 199], [253, 126], null],
  mount,
});
