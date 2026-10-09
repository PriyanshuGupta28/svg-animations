/**
 * Hangers: an empty state for an empty cart or wishlist. A clothes rail, two
 * uprights on splayed feet and a top bar, holding six bare wire hangers, hung
 * a little unevenly and each swung its own way. The pointer picks a hanger,
 * tested on each hanger's resting plane; it lifts off the rail and settles
 * square, and its neighbours slide apart, staggered outwards from it on the
 * 700ms tween. At rest the fourth hanger is bright. The slider is the stagger, in ms.
 */
const {
  Cam, fillet, fit, facing, open, poly, prism, proj, rad, rings, unproj,
  tween, tset, tval, tdone, disposer, mk, pointer, put, register, solid,
} = HL;

const N = 6, X = 146, ZR = 70, RR = 2.2, RH = 3.6, F = 26;
/** A hanger in its own plane, (v along the rail's normal, w up): apex, shoulder line, half-width. */
const A = ZR - 13, B = A - 19, SW = 20;
/** Rest: uneven spacing along the rail, and each one swung a little its own way. */
const REST_X = [22, 37, 55, 69, 91, 112], REST_TH = [-7, 4, -2, 9, -5, 3];
const PART = 12, LIFT = 9, MARK = 3, S = 1.85;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;

  const C = Cam(45, 0.5, S);
  fit(C, [[-4, -F, 0], [X + 4, F, 0], [X + 4, -F, 0], [-4, F, 0], [-4, 0, ZR + RH + LIFT], [X + 4, 0, ZR + RH + LIFT], [0, -SW, B], [X, SW, B]], 200, 166);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  // an upright on its foot, painted far one first
  for (const x of [0, X]) {
    const [fr, fi] = rings(x - 3.2, -F, x + 3.2, F, 3.2, 1);
    put(solid(g), prism(P, front, fr, fi, 0, 4));
    const [pr, pi] = rings(x - 2, -2, x + 2, 2, 2, 0.7);
    put(solid(g), prism(P, front, pr, pi, 4, ZR));
  }

  // hook backs go behind the top bar, everything else of a hanger in front of it
  const hangers = [];
  for (let i = 0; i < N; i++) hangers.push({ i, back: mk("path", { class: "nf sil" }, g) });
  // the top bar: a tube along x, drawn as a rounded outline with one dim crease
  const a = P(-4, 0, ZR), b = P(X + 4, 0, ZR), dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
  const w = RR * S, n = [-dy / L * w, dx / L * w];
  mk("path", { d: poly(fillet([[a[0] + n[0], a[1] + n[1]], [b[0] + n[0], b[1] + n[1]], [b[0] - n[0], b[1] - n[1]], [a[0] - n[0], a[1] - n[1]]], [w, w, w, w])), class: "sil" }, g);
  mk("path", { d: open([[a[0] - n[0] * 0.4 + dx / L * w, a[1] - n[1] * 0.4 + dy / L * w], [b[0] - n[0] * 0.4 - dx / L * w, b[1] - n[1] * 0.4 - dy / L * w]]), class: "nf lo" }, g);
  for (const h of hangers) {
    h.hook = mk("path", { class: "nf sil" }, g);
    h.body = mk("path", { class: "nf sil" }, g);
    Object.assign(h, { x: tween(REST_X[h.i]), th: tween(REST_TH[h.i]), z: tween(0), drawn: "" });
  }

  // the hanger's wire, in its own plane: a hook round the bar, a neck, and the shoulder triangle with its bottom bar
  const arc = (d0, d1) => { const p = []; for (let d = d0; d <= d1; d += 15) p.push([RH * Math.cos(rad(d)), ZR + RH * Math.sin(rad(d))]); return p; };
  const HOOK_F = [[0, A], ...arc(-90, 90)], HOOK_B = arc(90, 225);
  const BODY = fillet([[0, A], [SW, B], [-SW, B]], [1.5, 4, 4]);

  function draw(h, x, th, z) {
    const key = x + "," + th + "," + z;
    if (key === h.drawn) return;
    h.drawn = key;
    const s = Math.sin(rad(th)), c = Math.cos(rad(th));
    const W = (pts) => pts.map(([v, u]) => P(x, v * c - (u - ZR) * s, ZR + v * s + (u - ZR) * c + z));
    h.back.setAttribute("d", open(W(HOOK_B)));
    h.hook.setAttribute("d", open(W(HOOK_F)));
    h.body.setAttribute("d", poly(W(BODY)));
  }

  const Bk = register(stage, (_dt, now) => {
    let m = false;
    for (const h of hangers) {
      draw(h, tval(h.x, now), tval(h.th, now), tval(h.z, now));
      if (!tdone(h.x, now) || !tdone(h.th, now) || !tdone(h.z, now)) m = true;
    }
    return m;
  });
  bag.add(Bk.unregister);

  /** The hanger whose resting plane holds the pointer nearest its middle; -1 for none. */
  const WC = (B + ZR + RH) / 2, HH = (ZR + RH - B) / 2 + 4;
  function hit([sx, sy]) {
    const u0 = unproj(C, sx, sy, 0), u1 = unproj(C, sx, sy, 1);
    let best = -1, bd = 1.15;
    for (let i = 0; i < N; i++) {
      const zz = (REST_X[i] - u0[0]) / (u1[0] - u0[0]), y = u0[1] + zz * (u1[1] - u0[1]);
      const d = Math.hypot(y / (SW + 4), (zz - WC) / HH);
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }

  let act = null;
  function setActive(a) {
    if (a === act) return;
    const now = performance.now(), from = a >= 0 ? a : act >= 0 ? act : MARK;
    act = a;
    for (const h of hangers) {
      const delay = Math.abs(h.i - from) * stag, off = a < 0 || h.i === a ? 0 : Math.sign(h.i - a) * PART;
      tset(h.x, REST_X[h.i] + off, now, delay);
      tset(h.th, h.i === a ? 0 : REST_TH[h.i], now, delay);
      tset(h.z, h.i === a ? LIFT : 0, now, delay);
      const on = h.i === (a < 0 ? MARK : a);
      for (const el of [h.back, h.hook, h.body]) el.classList.toggle("hi", on);
    }
    read.textContent = a < 0 ? "rest" : `hanger ${a + 1} · 0`;
    Bk.wake();
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
  name: "hangers",
  means: "An empty cart: a clothes rail of bare hangers. The one under the pointer lifts off, and its neighbours slide apart.",
  rules: [1, 2, 5, 9],
  range: [0, 45, 90],
  tour: [[153, 123], [195, 144], [251, 172], null],
  mount,
});
