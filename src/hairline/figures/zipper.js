/**
 * Zipper: a merge as a large zipper lying on the desk, two tapes of teeth
 * and a slider with a pull tab. The pointer is projected onto the desk and its
 * x sets where the slider sits, on a spring: behind it the teeth interlock,
 * ahead of it the two tapes splay apart, to a clamped spread. At rest it is
 * zipped part way, the tapes splayed unevenly, the pull tab bright. The slider
 * is the spread, in world units.
 */
const {
  Cam, clamp, facing, fillet, fit, lerp, open, poly, prism, proj, rings, rrect, unproj,
  spring, stepS, disposer, mk, pointer, put, register, solid,
} = HL;

const NT = 20, PITCH = 9, L = NT * PITCH, TW = 15, TK = 1.2, TH = 3.4, HW = 2;
const LAM = 30, MOUTH = 9, SMIN = 8, SMAX = L - 2, REST = 0.42 * L;
const SIDES = [-1, 1], UNEVEN = [1, 0.58], X0 = -14, X1 = L + 12;

/** A ring narrowed towards its low-u end, about v = 0: the slider's body, which closes towards the teeth it has joined. */
const taper = (ring, u0, u1, k) => ring.map((q) => ({ ...q, v: q.v * lerp(k, 1, (q.u - u0) / (u1 - u0)) }));

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let spread = value;
  const C = Cam(45, 0.5, 1.95);
  const far = 44 * UNEVEN[1] + TW, near = 44 + TW;
  fit(C, [[X0, -TW, 0], [X0, TW, 0], [X1, -near, 0], [X1, far, 0], [SMIN, 0, 11]], 200, 166);
  const P = proj(C), front = facing(C);
  const sp = spring(REST, { eps: 0.02 });

  /** How far side j's tape has moved off the middle at x, with the slider at s: none behind it, rising to the spread ahead. */
  const off = (j, x, s) => (x <= s + MOUTH ? 0 : clamp(spread * UNEVEN[j] * (1 - Math.exp(-(x - s - MOUTH) / LAM)), 0, spread));

  const g = mk("g", {}, svg);
  // the tapes, the far one (y < 0) first; each a woven plate with a thickness line and a row of stitching
  const tapes = SIDES.map(() => ({ base: mk("path", { class: "lo" }, g), top: mk("path", { class: "sil" }, g), stitch: mk("path", { class: "nf lo" }, g) }));
  // the stop that holds both tapes at the closed end
  put(solid(g), (() => { const [r, i] = rings(-7, -5, -2, 5, 1.6, 0.7); return prism(P, front, r, i, TK, TH + 0.6); })());
  // the teeth, one row per tape, offset half a pitch so they interleave; painted by x
  const teeth = [];
  for (let i = 0; i < NT; i++) for (let j = 0; j < 2; j++) teeth.push({ j, x: i * PITCH + 2 + j * PITCH / 2, el: solid(g), drawn: NaN });
  // the top stops, one at the open end of each tape
  const stops = SIDES.map(() => ({ el: solid(g), drawn: NaN }));
  // the slider: body, the lug on its back, the pull tab lying down over the joined teeth
  const sl = mk("g", {}, g), body = solid(sl), lug = solid(sl);
  const tabBack = mk("path", { class: "lo" }, sl), tab = mk("path", { class: "sil hi" }, sl), slot = mk("path", { class: "nf" }, sl);
  let at = -1;

  function drawTapes(s) {
    SIDES.forEach((sg, j) => {
      const xs = [];
      for (let x = X0; x < X1; x += 3) xs.push(x);
      xs.push(X1);
      const inner = xs.map((x) => [x, sg * (1.5 + off(j, x, s))]), outer = xs.map((x) => [x, sg * (TW + off(j, x, s))]);
      const pts = [...inner, ...outer.reverse()], n = xs.length;
      const shape = fillet(pts, pts.map((_, k) => (k === 0 || k === n - 1 || k === n || k === 2 * n - 1 ? 2.5 : 0)), 3);
      tapes[j].base.setAttribute("d", poly(shape.map(([x, y]) => P(x, y, 0))));
      tapes[j].top.setAttribute("d", poly(shape.map(([x, y]) => P(x, y, TK))));
      tapes[j].stitch.setAttribute("d", open(xs.slice(1, -1).map((x) => P(x, sg * (TW - 3 + off(j, x, s)), TK))));
    });
  }

  function drawSlider(s) {
    const u0 = s - 12, u1 = s + MOUTH;
    const ring = taper(rrect(u0, -8.5, u1, 8.5, 4, 5), u0, u1, 0.62), inner = taper(rrect(u0 + 1.2, -7.3, u1 - 1.2, 7.3, 3, 5), u0, u1, 0.62);
    put(body, prism(P, front, ring, inner, 0, 7));
    const [lr, li] = rings(s - 5, -2.6, s + 2, 2.6, 1.6, 0.8);
    put(lug, prism(P, front, lr, li, 7, 9.4));
    // the tab slopes from the lug down to rest on the teeth behind, a slot through its far end
    const z = (u) => lerp(9.4, TH + 1.4, (s - u) / 26);
    const tr = rrect(s - 27, -4.6, s - 1, 4.6, 4, 4), hr = rrect(s - 23, -2, s - 13, 2, 2, 4);
    tabBack.setAttribute("d", poly(tr.map((q) => P(q.u, q.v, z(q.u) - 1.1))));
    tab.setAttribute("d", poly(tr.map((q) => P(q.u, q.v, z(q.u)))));
    slot.setAttribute("d", poly(hr.map((q) => P(q.u, q.v, z(q.u)))));
    // the slider is painted after every tooth it covers, before the ones splaying out ahead of it
    const k = teeth.findIndex((t) => t.x > u1 + 1), want = k < 0 ? teeth.length : k;
    if (want !== at) { at = want; (want ? teeth[want - 1].el.g : tapes[1].stitch).after(sl); }
  }

  function draw(s) {
    drawTapes(s);
    for (const t of teeth) {
      const o = off(t.j, t.x, s);
      if (o === t.drawn) continue;
      t.drawn = o;
      const sg = SIDES[t.j], a = sg * (-3.6 + o), b = sg * (5.5 + o);
      const [r, i] = rings(t.x - HW, Math.min(a, b), t.x + HW, Math.max(a, b), 1.4, 0.6);
      put(t.el, prism(P, front, r, i, TK, TH));
    }
    stops.forEach((st, j) => {
      const o = off(j, L + 3, s);
      if (o === st.drawn) return;
      st.drawn = o;
      const sg = SIDES[j], a = sg * (1.5 + o), b = sg * (6 + o);
      const [r, i] = rings(L + 1, Math.min(a, b), L + 8, Math.max(a, b), 1.6, 0.7);
      put(st.el, prism(P, front, r, i, TK, TH + 0.6));
    });
    drawSlider(s);
  }

  let drawn = NaN;
  const B = register(stage, (dt) => {
    const m = stepS(sp, dt);
    if (sp.x !== drawn) { drawn = sp.x; draw(sp.x); }
    return m;
  });
  bag.add(B.unregister);

  function retarget(over) {
    sp.t = over ? clamp(over[0], SMIN, SMAX) : REST;
    read.textContent = over ? `tooth ${Math.round(sp.t / PITCH)}` : "rest";
    B.wake();
  }

  bag.add(pointer(stage, { move: (p) => retarget(unproj(C, p[0], p[1], 0)), leave: () => retarget(null) }));
  bag.add(() => svg.replaceChildren());
  retarget(null);

  return {
    set: (v) => { spread = v; drawn = NaN; for (const t of [...teeth, ...stops]) t.drawn = NaN; B.wake(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "zipper",
  means: "A merge as a zipper: the slider follows the pointer, the teeth behind it lock and the two tapes ahead of it splay apart.",
  rules: [1, 3, 5, 8],
  range: [14, 26, 40],
  tour: [[116, 130], [254, 199], [185, 165], null],
  mount,
});
