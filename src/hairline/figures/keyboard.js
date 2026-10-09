/**
 * Keyboard: a compact mechanical keyboard. A rounded case holds four rows of
 * sculpted keycaps, each tapering from its foot to a smaller top, with a wide
 * space bar and homing bars on F and J. The pointer is projected onto a plane
 * at key height, which never moves; keys near it press down on their springs,
 * falling off with distance from the key's footprint. At rest a few keys are
 * caught mid-keystroke and J is bright. The slider is the radius, in world units.
 */
const {
  Cam, clamp, facing, fit, hull, open, poly, proj, prism, ringAt, rings, rrect, run, seg, unproj,
  spring, stepS, mk, pointer, put, register, disposer, solid,
} = HL;

const U = 14, GAP = 1.8, IN = 2.3, PMAX = 7.5, CB = 6;
// A 40% layout, back row first: every row is eleven units wide.
const ROWS = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1.75, 1, 1, 1, 1, 1, 1, 1, 2.25],
  [2.25, 1, 1, 1, 1, 1, 1, 1, 1.75],
  [1.25, 1.25, 6.25, 1.25, 1],
];
const PROF = [11, 10, 9.6, 10.2]; // the sculpted profile: each row its own height
const HOME = ["1,4", "1,7"], MARK = "1,7";
// Caught mid-keystroke: the keys someone was typing when they let go.
const REST = { "0,6": 0.85, "1,2": 0.5, "2,5": 0.3, "0,9": 0.35, "3,2": 0.15 };
const W = 11 * U, D = ROWS.length * U;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  const C = Cam(45, 0.5, 1.9);
  fit(C, [[-CB, -CB, -9], [W + CB, D + CB, -9], [W + CB, -CB, -9], [-CB, D + CB, -9], [0, 0, 11]], 200, 166);
  const P = proj(C), front = facing(C);
  let R = value, over = null;

  const g = mk("g", {}, svg);
  const [cr, ci] = rings(-CB, -CB, W + CB, D + CB, 9, 2.2);
  put(solid(g), prism(P, front, cr, ci, -9, 0));

  // Row by row from the back, left to right: that is back to front at this camera.
  const keys = [];
  ROWS.forEach((row, r) => {
    let x = 0;
    row.forEach((w, c) => {
      const x0 = x * U + GAP / 2, x1 = (x + w) * U - GAP / 2, y0 = r * U + GAP / 2, y1 = (r + 1) * U - GAP / 2;
      x += w;
      const id = r + "," + c, el = solid(g);
      keys.push({
        r, c, x0, x1, y0, y1, h0: PROF[r], el, drawn: NaN, rest: (REST[id] || 0) * PMAX,
        foot: rrect(x0, y0, x1, y1, 2.8, 4),
        top: rrect(x0 + IN, y0 + IN, x1 - IN, y1 - IN, 2.2, 4),
        inner: rrect(x0 + IN + 0.9, y0 + IN + 0.9, x1 - IN - 0.9, y1 - IN - 0.9, 1.3, 4),
        bump: HOME.includes(id) ? mk("path", { class: "nf" }, el.g) : null,
        mark: id === MARK,
      });
    });
  });
  for (const k of keys) k.sp = spring(k.rest, { eps: 0.03 });

  function drawKey(k) {
    const h = k.h0 - k.sp.x;
    if (h === k.drawn) return;
    k.drawn = h;
    put(k.el, {
      sil: poly(hull(ringAt(P, k.foot, 0).concat(ringAt(P, k.top, h)))),
      crease: open(ringAt(P, run(k.inner, front), h)),
    });
    if (k.bump) {
      const cx = (k.x0 + k.x1) / 2, cy = k.y1 - IN - 2.2;
      k.bump.setAttribute("d", seg(P(cx - 2.6, cy, h), P(cx + 2.6, cy, h)));
    }
  }

  const B = register(stage, (dt) => {
    let m = false;
    for (const k of keys) { if (stepS(k.sp, dt)) m = true; drawKey(k); }
    return m;
  });
  bag.add(B.unregister);

  /** Distance from a ground point to a key's footprint: 0 anywhere over it, so the space bar presses whole. */
  const dist = (k, q) => Math.hypot(Math.max(k.x0 - q[0], 0, q[0] - k.x1), Math.max(k.y0 - q[1], 0, q[1] - k.y1));

  function retarget() {
    let near = null, bd = Infinity;
    for (const k of keys) {
      if (!over) { k.sp.t = k.rest; continue; }
      const d = dist(k, over);
      if (d < bd) { bd = d; near = k; }
      k.sp.t = PMAX * clamp(1.25 - d / R, 0, 1);
    }
    for (const k of keys) k.el.sil.classList.toggle("hi", near ? k === near : k.mark);
    read.textContent = near ? `key ${near.r + 1}·${near.c + 1}` : "rest";
    B.wake();
  }

  bag.add(pointer(stage, {
    move: (p) => {
      const q = unproj(C, p[0], p[1], 9);
      // Off the case, the keys go back to rest.
      over = q[0] > -CB && q[0] < W + CB && q[1] > -CB && q[1] < D + CB ? q : null;
      retarget();
    },
    leave: () => { over = null; retarget(); },
  }));
  bag.add(() => svg.replaceChildren());
  retarget();

  return {
    set: (v) => { R = v; if (over) retarget(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "keyboard",
  means: "A mechanical keyboard: the keys near the pointer press down on their springs, the farther the less.",
  rules: [1, 3, 5, 9],
  range: [10, 25, 38],
  tour: [[149, 149], [200, 138], [299, 167], null],
  mount,
});
