/**
 * Cylinders: a week of metrics as a row of seven graduated measuring
 * cylinders, each on a round foot, with a spouted lip and dim graduations up
 * its front. Each holds a level, drawn as the liquid's surface ellipse over two dim sides.
 * The pointer is put on the ground; the levels near it rise and the far ones
 * sink toward a third of rest, falling off with distance along the row, each
 * on its own spring and clamped under the lip.
 * At rest the levels make an uneven week with day 4 the high, its level
 * bright. The slider is the radius, in cylinders.
 */
const {
  Cam, clamp, facing, fit, hull, open, poly, prism, proj, rad, ringAt, rrect, seg, unproj,
  spring, stepS, disposer, mk, pointer, put, register, solid,
} = HL;

const N = 7, PITCH = 26, GR = 8, FR = 11.5, Z0 = 4, HT = 104, TOPL = 94, RISE = 72, SPOUT = 135;
const REST = [34, 48, 40, 70, 55, 30, 24], MARK = 3;
const R2 = Math.SQRT1_2, GZ = HT - 14;

/** The share of the full rise at u radii from the pointer: a cone from 1 down to a floor of .08 at the radius and beyond. */
const falloff = (u) => Math.max(0.08, 1 - u);
/** A circle as a ring of rrect samples, centred on (x, y). */
const disc = (x, y, r, n = 8) => rrect(x - r, y - r, x + r, y + r, r, n);
/** The lip: a ring of radius r round (x, y), drawn out into a spout toward SPOUT degrees. */
function lipRing(x, y, r) {
  const out = [];
  for (let k = 0; k < 48; k++) {
    const a = (k / 48) * 2 * Math.PI, c = Math.cos(a), s = Math.sin(a), rr = r + 3.4 * Math.max(0, Math.cos(a - rad(SPOUT))) ** 12;
    out.push({ u: x + rr * c, v: y + rr * s, nu: c, nv: s });
  }
  return out;
}
/** A level, in percent of the graduated height, as a height. */
const zOf = (pct) => Z0 + 3 + (pct / 100) * GZ;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let R = value * PITCH, over = null;
  const E = ((N - 1) / 2) * PITCH + FR;
  const C = Cam(45, 0.5, 1.5);
  fit(C, [[-E * R2, E * R2, 0], [E * R2, -E * R2, 0], [-E * R2, E * R2, HT + 1], [E * R2, -E * R2, HT + 1], [FR, FR, 0], [-FR, -FR, HT]], 200, 166);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg), cyl = [];
  for (let i = 0; i < N; i++) {
    const s = (i - (N - 1) / 2) * PITCH, x = s * R2, y = -s * R2;
    put(solid(g), prism(P, front, disc(x, y, FR, 10), disc(x, y, FR - 1.6, 10), 0, 3));
    const body = disc(x, y, GR, 10);
    mk("path", { d: poly(hull(ringAt(P, body, Z0 - 1).concat(ringAt(P, body, HT - 2)))), class: "sil" }, g);
    // graduations up the front: every tenth, the fifth and tenth longer
    let d = "";
    for (let k = 1; k <= 10; k++) {
      const z = zOf(k * 10), a1 = k % 5 ? 46 : 70, pts = [];
      for (let a = 24; a <= a1; a += 11.5) pts.push(P(x + GR * Math.cos(rad(a)), y + GR * Math.sin(rad(a)), z));
      d += open(pts);
    }
    mk("path", { d, class: "nf lo" }, g);
    const side = mk("path", { class: "nf lo" }, g), level = mk("path", { class: "nf" }, g);
    put(solid(g), prism(P, front, lipRing(x, y, GR + 1.2), disc(x, y, GR - 0.2, 10), HT - 2, HT));
    mk("path", { d: poly(ringAt(P, disc(x, y, GR - 1.2, 10), HT)), class: "nf" }, g);
    cyl.push({ i, s, x, y, side, level, sp: spring(REST[i]), drawn: NaN });
  }

  function drawCyl(c) {
    if (c.sp.x === c.drawn) return;
    c.drawn = c.sp.x;
    const z = zOf(c.sp.x), q = (GR - 2.4) * R2;
    c.level.setAttribute("d", poly(ringAt(P, disc(c.x, c.y, GR - 2.4, 10), z)));
    // the liquid column's two sides, at the glass's left and right on screen, from the floor up to the level
    c.side.setAttribute("d", seg(P(c.x - q, c.y + q, Z0), P(c.x - q, c.y + q, z)) + seg(P(c.x + q, c.y - q, Z0), P(c.x + q, c.y - q, z)));
  }

  const B = register(stage, (dt) => {
    let m = false;
    for (const c of cyl) { if (stepS(c.sp, dt)) m = true; drawCyl(c); }
    return m;
  });
  bag.add(B.unregister);

  function retarget() {
    // along the row the ground point and the screen x agree, so the pick never depends on a level
    const t = over ? (over[0] - over[1]) * R2 : 0;
    const a = over ? clamp(Math.round(t / PITCH + (N - 1) / 2), 0, N - 1) : MARK;
    for (const c of cyl) {
      c.sp.t = over ? clamp(REST[c.i] * 0.3 + RISE * falloff(Math.abs(t - c.s) / R), 0, TOPL) : REST[c.i];
      c.level.classList.toggle("hi", c.i === a);
    }
    read.textContent = over ? `day ${a + 1} · ${Math.round(cyl[a].sp.t)}%` : "rest";
    B.wake();
  }

  bag.add(pointer(stage, {
    move: (p) => { over = unproj(C, p[0], p[1], 0); retarget(); },
    leave: () => { over = null; retarget(); },
  }));
  bag.add(() => svg.replaceChildren());
  retarget();

  return {
    set: (v) => { R = v * PITCH; retarget(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "cylinders",
  means: "A week of metrics as graduated cylinders: the levels near the pointer rise, falling off along the row.",
  rules: [1, 3, 5, 9],
  range: [1.5, 3, 4.5],
  tour: [[278, 234], [122, 234], [200, 234], null],
  mount,
});
