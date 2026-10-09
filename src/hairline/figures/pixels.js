/**
 * Pixels: a monitor on its stand, its screen a matrix of 18 × 9 dots. At
 * rest the screen shows a rounded button drawn in lit pixels, with a dimmer
 * bar across its middle. The pointer, carried onto the screen's plane (which
 * never moves), lights the pixels it passes, which swell forward of the glass
 * and fade on their own decay,
 * bright to medium to off, and the button gives its light up while the
 * pointer paints. When the pointer leaves, the button glows back. The slider
 * is the afterglow, in seconds.
 */
const {
  Cam, facing, fit, hull, poly, prism, proj, rings, rrect, unproj,
  mk, place, pointer, put, register, disposer, solid,
} = HL;

const COLS = 18, ROWS = 9, PITCH = 8.6, W = 170, H = 92, ZB = 24, D = 6, BRUSH = 2.4;
const GX = (W - (COLS - 1) * PITCH) / 2, GZ = ZB + H - (H - (ROWS - 1) * PITCH) / 2;

/** The rest picture: a rounded button outline, lit, and a bar across it, dim. */
function restLevel(c, r) {
  const inX = c >= 4 && c <= 13, inR = r >= 2 && r <= 6, corner = (c === 4 || c === 13) && (r === 2 || r === 6);
  if (inX && inR && !corner && (c === 4 || c === 13 || r === 2 || r === 6)) return 1;
  if (r === 4 && c >= 7 && c <= 10) return 0.4;
  return 0;
}
/** A lit pixel swells and stands forward of the glass: its radius, to a tenth. */
const rad = (l) => Math.round(13 + 12 * l) / 10;
const cls = (l) => (l >= 0.6 ? "dot" : l >= 0.22 ? "dot m" : "dot off");

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let tau = value, over = null;
  const C = Cam(45, 0.5, 1.55);
  fit(C, [[0, -40, 0], [W, -40, 0], [0, 8, 0], [W, 8, 0], [0, 0, ZB + H], [W, -D, ZB + H]], 200, 166);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  const box = (x0, y0, x1, y1, r, b, z0, z1) => { const [o, i] = rings(x0, y0, x1, y1, r, b); put(solid(g), prism(P, front, o, i, z0, z1)); };
  // the stand: a foot on the desk, a neck behind the panel
  box(W / 2 - 34, -40, W / 2 + 34, 4, 9, 1.6, 0, 3);
  box(W / 2 - 9, -D - 12, W / 2 + 9, -D - 2, 4, 1.2, 3, ZB + 34);
  // the panel stands in the plane y = 0, its depth running back to y = -D
  const face = rrect(0, ZB, W, ZB + H, 7, 6), on = (ring, y) => ring.map((q) => P(q.u, y, q.v));
  mk("path", { class: "sil", d: poly(hull(on(face, 0).concat(on(face, -D)))) }, g);
  mk("path", { class: "nf lo", d: poly(on(rrect(1.2, ZB + 1.2, W - 1.2, ZB + H - 1.2, 6, 6), 0)) }, g);
  mk("path", { class: "nf lo", d: poly(on(rrect(GX - 5, ZB + 5, W - GX + 5, ZB + H - 5, 3, 4), 0)) }, g);

  const px = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const base = restLevel(c, r), el = mk("circle", { r: rad(base), class: cls(base) }, g);
    place(el, P(GX + c * PITCH, 4 * base, GZ - r * PITCH));
    px.push({ c, r, el, rest: base, L: base, k: cls(base), rr: rad(base) });
  }

  const B = register(stage, (dt) => {
    const f = Math.exp(-dt / tau);
    let m = false;
    for (const p of px) {
      const b = over ? 0 : p.rest;
      let L = b + (p.L - b) * f;
      if (Math.abs(L - b) < 0.02) L = b;
      if (over) {
        const d = Math.hypot(p.c - over[0], p.r - over[1]);
        if (d < BRUSH) L = Math.max(L, 1 - 0.5 * (d / BRUSH));
        else if (L !== b) m = true;
      } else if (L !== b) m = true;
      p.L = L;
      const k = cls(L);
      if (k !== p.k) { p.k = k; p.el.setAttribute("class", k); }
      const rr = rad(L);
      if (rr !== p.rr) { p.rr = rr; p.el.setAttribute("r", rr); place(p.el, P(GX + p.c * PITCH, 4 * L, GZ - p.r * PITCH)); }
    }
    return m;
  });
  bag.add(B.unregister);

  /** The pointer carried onto the screen's plane, y = 0, in pixel columns and rows; null off the screen. */
  function hit(s) {
    const a = unproj(C, s[0], s[1], 0), b = unproj(C, s[0], s[1], 10);
    const z = (10 * -a[1]) / (b[1] - a[1]), x = a[0] + ((b[0] - a[0]) * z) / 10;
    const c = (x - GX) / PITCH, r = (GZ - z) / PITCH;
    return c < -0.5 || c > COLS - 0.5 || r < -0.5 || r > ROWS - 0.5 ? null : [c, r];
  }

  function move(s) {
    over = s && hit(s);
    read.textContent = over ? `px ${Math.round(over[0]) + 1}·${Math.round(over[1]) + 1}` : "rest";
    B.wake();
  }
  bag.add(pointer(stage, { move, leave: () => move(null) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { tau = v; },
    destroy: bag.dispose,
  };
}

hairline({
  name: "pixels",
  means: "A screen of pixels: the pointer lights the ones it passes and they fade, until a button glows back.",
  rules: [1, 4, 5, 7],
  range: [0.2, 0.45, 0.9],
  tour: [[130, 152], [172, 153], [255, 140], null],
  mount,
});
