/**
 * Coverage: a bed-of-nails test fixture. A rounded base plate with two tooling
 * posts and 6 × 4 spring test pins in staggered rows, each a collar pressed
 * into the plate and a plunger with a pointed crown. The pointer, carried onto
 * a fixed plane at the crowns' height, presses the pins it passes; each pin
 * then springs back on its own decay, the plunger following on a spring, and a
 * pin pressed past halfway takes the bright stroke. At rest an earlier pass
 * has left a trail of pins part-way down, its head still bright; when the
 * pointer leaves, that trail returns. The slider is the afterglow, in seconds.
 */
const {
  Cam, facing, fit, hull, open, poly, prism, proj, ringAt, rings, run, unproj,
  spring, stepS, disposer, mk, pointer, put, register, solid,
} = HL;

const COLS = 6, ROWS = 4, PITCH = 20, M = 13, PB = 7, CH = 4, UP = 16, DOWN = 0, TIP = 4.5, BRUSH = 34, ZH = CH + UP;
const X1 = (COLS - 0.5) * PITCH, Y1 = (ROWS - 1) * PITCH;
/** The rest picture: a trail an earlier pass left, fading behind its head (4·2, bright). */
const TRAIL = { "0,3": 0.16, "1,3": 0.3, "1,2": 0.42, "2,2": 0.52, "3,1": 0.92, "2,1": 0.26, "4,1": 0.2, "4,0": 0.1 };
const ext = (L) => UP - (UP - DOWN) * L;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let tau = value, over = null;
  const C = Cam(45, 0.5, 1.75);
  fit(C, [[-M, -M, -PB], [X1 + M, Y1 + M, -PB], [X1 + M, -M, -PB], [-M, Y1 + M, -PB], [-M, -M, ZH + TIP], [X1, -M, ZH + TIP + 6]], 200, 166);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  const [pr, pi] = rings(-M, -M, X1 + M, Y1 + M, 9, 2);
  put(solid(g), prism(P, front, pr, pi, -PB, 0));

  // two tooling posts at the left and right corners, then the pins, every other row set over by half a pitch
  // so no pin stands straight behind the next; all painted by x + y from the back, so each covers the ones behind
  const parts = [[X1 + M - 6, -M + 6], [-M + 6, Y1 + M - 6]], pins = [];
  for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) parts.push([(c + (r % 2) / 2) * PITCH, r * PITCH, c, r]);
  parts.sort((a, b) => a[0] + a[1] - b[0] - b[1]);
  for (const [x, y, c, r] of parts) {
    if (c === undefined) { const [o, i] = rings(x - 3.6, y - 3.6, x + 3.6, y + 3.6, 3.6, 1.1); put(solid(g), prism(P, front, o, i, 0, ZH + TIP + 6)); continue; }
    const rest = TRAIL[c + "," + r] || 0;
    const [co, ci] = rings(x - 5, y - 5, x + 5, y + 5, 5, 1.3);
    put(solid(g), prism(P, front, co, ci, 0, CH));
    const [ring, inner] = rings(x - 3, y - 3, x + 3, y + 3, 3, 0.8);
    pins.push({ c, r, x, y, ring, inner, rest, L: rest, sp: spring(ext(rest), { eps: 0.03 }), el: solid(g), drawn: NaN, hi: null });
  }

  /** A plunger: a shaft from the collar to z1 and a pointed crown above it, one silhouette, the shoulder as its crease. */
  function drawPin(p) {
    const h = Math.round(p.sp.x * 20) / 20;
    if (h !== p.drawn) {
      p.drawn = h;
      const z1 = CH + h;
      p.el.sil.setAttribute("d", poly(hull(ringAt(P, p.ring, CH).concat(ringAt(P, p.ring, z1), [P(p.x, p.y, z1 + TIP)]))));
      p.el.cr.setAttribute("d", open(ringAt(P, run(p.inner, front), z1)));
    }
    const hi = p.L >= 0.6;
    if (hi !== p.hi) { p.hi = hi; p.el.sil.classList.toggle("hi", hi); }
  }

  const B = register(stage, (dt) => {
    const f = Math.exp(-dt / tau);
    let m = false;
    for (const p of pins) {
      const b = over ? 0 : p.rest;
      let L = b + (p.L - b) * f;
      if (Math.abs(L - b) < 0.02) L = b;
      if (over) {
        const d = Math.hypot(p.x - over[0], p.y - over[1]);
        if (d < BRUSH) L = Math.max(L, 1 - 0.7 * (d / BRUSH));
        else if (L !== b) m = true;
      } else if (L !== b) m = true;
      p.L = L;
      p.sp.t = ext(L);
      if (stepS(p.sp, dt)) m = true;
      drawPin(p);
    }
    return m;
  });
  bag.add(B.unregister);

  /** The pointer on the fixed plane at the crowns' rest height; the pin under it is the nearest one's rest centre. */
  function move(s) {
    const w = s && unproj(C, s[0], s[1], ZH), was = over;
    over = w && w[0] > -M && w[0] < X1 + M && w[1] > -M && w[1] < Y1 + M ? w : null;
    // the rest mark gives its bright up the moment the pointer arrives
    if (over && !was) for (const p of pins) p.L = Math.min(p.L, 0.59);
    if (over) {
      const n = pins.reduce((a, p) => (Math.hypot(p.x - over[0], p.y - over[1]) < Math.hypot(a.x - over[0], a.y - over[1]) ? p : a));
      read.textContent = `pin ${n.c + 1}·${n.r + 1}`;
    } else read.textContent = "rest";
    B.wake();
  }
  bag.add(pointer(stage, { move, leave: () => move(null) }));
  bag.add(() => svg.replaceChildren());
  move(null);

  return {
    set: (v) => { tau = v; },
    destroy: bag.dispose,
  };
}

hairline({
  name: "coverage",
  means: "A bed-of-nails test fixture: the pointer presses the spring pins it passes, and each springs back on its own decay.",
  rules: [1, 4, 5, 7],
  range: [0.4, 0.9, 1.8],
  tour: [[107, 140], [194, 159], [282, 177], null],
  mount,
});
