/**
 * Conveyor: a build pipeline as a belt running through three arched hoods,
 * build, test and deploy, each numbered by the dots over its mouth. Sealed
 * crates (artifacts), each with its build number as a 3 × 2 dot code on the
 * lid, are made inside the first hood and leave inside the last. The belt
 * never stops; hovering it slows the belt on a spring so a crate can be read.
 * The pointer is tested by marching its eye ray through the scene from near to
 * far, so the nearest thing under it answers. At rest the test hood is bright.
 * The slider is the slowed rate, in world units a second.
 */
const {
  Cam, fit, facing, open, poly, hull, prism, proj, rings, ringAt, rrect, run, seg, unproj,
  spring, stepS, reducedMotion, disposer, mk, place, pointer, put, register, solid,
} = HL;

const BW = 32, BZ = 16, DK = 5, CD = 22, CW = 20, CH = 14, LG = 26, GAP = 78, YP = 7, HH = 48;
const PITCH = 34, POOL = 9, SLAT = 10, FAST = 24, MARK = 1;
const LID = BZ + CH, CY0 = (BW - CD) / 2, CY1 = CY0 + CD, X = 3 * LG + 2 * GAP;
const XS = [0, 1, 2].map((i) => i * (LG + GAP)), XE = XS.map((x) => x + LG);

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let slow = value, s = 40 * PITCH + 58, ray = null, over = false, txt = "";
  const rate = spring(FAST);

  const C = Cam(45, 0.5, 1.38);
  fit(C, [[0, -YP, 0], [X, BW + YP, 0], [X, -YP, 0], [0, BW + YP, 0], [0, -YP, HH], [X, -YP, HH]], 200, 166);
  const P = proj(C), front = facing(C);
  /** An arch's profile in (y, z), standing at x. */
  const at = (ring, x) => ring.map((q) => P(x, q.u, q.v));
  /** A ring with a round top and nearly square feet: both rrects' halves, in order round the middle. */
  const arch = (u0, v0, u1, v1, rt, rb) => {
    const m = (v0 + v1) / 2, c = (u0 + u1) / 2, ang = (q) => Math.atan2(q.v - m, q.u - c);
    return rrect(u0, v0, u1, v1, rt, 10).filter((q) => q.v >= m).concat(rrect(u0, v0, u1, v1, rb, 10).filter((q) => q.v < m)).sort((a, b) => ang(a) - ang(b));
  };
  const prof = arch(-YP, 0, BW + YP, HH, 21, 3), profIn = arch(-YP + 2, 2, BW + YP - 2, HH - 2, 19, 1.5);
  const mouth = arch(-1, BZ - DK - 1, BW + 1, LID + 6, 12, 2);

  // Back to front: hood 1, then each gap (legs, belt, slats, crates) followed by the next hood.
  const g = mk("g", {}, svg), hoods = [], gaps = [];
  for (let i = 0; i < 3; i++) {
    if (i > 0) {
      const gg = mk("g", {}, g), x0 = XE[i - 1], x1 = XS[i], xm = (x0 + x1) / 2;
      put(solid(gg), prism(P, front, ...rings(xm - 3, 5, xm + 3, BW - 5, 2, 0.8), 0, BZ - DK));
      put(solid(gg), prism(P, front, ...rings(x0, 0, x1 + 4, BW, 1, 0.8), BZ - DK, BZ));
      gaps.push({ x0, x1, slats: mk("path", { class: "nf lo" }, gg), cr: mk("g", {}, gg) });
    }
    const el = solid(g);
    // the hood: an arch run along the belt; its near face carries the mouth and the stage's dots
    put(el, {
      sil: poly(hull(at(prof, XS[i]).concat(at(prof, XE[i])))),
      crease: open(at(run(profIn, (q) => 0.61 * q.nu + 0.5 * q.nv > 0), XE[i])),
    });
    mk("path", { class: "nf", d: poly(at(mouth, XE[i])) }, el.g);
    for (let d = 0; d <= i; d++) place(mk("circle", { r: 1.2, class: "dot m" }, el.g), P(XE[i], BW / 2 + (d - i / 2) * 5, LID + 12));
    hoods.push(el);
  }

  const slots = [];
  for (let n = 0; n < POOL; n++) {
    const grp = mk("g", {}, g), el = solid(grp), seam = mk("path", { class: "nf lo" }, grp), dots = [];
    for (let b = 0; b < 6; b++) dots.push(mk("circle", { r: 1.05, class: "dot off" }, grp));
    slots.push({ grp, el, seam, dots, k: null, j: -1, a: 0, b: 0 });
  }
  const id = (k) => ((k % 64) + 64) % 64;

  /** Crate k, cut where it is inside a hood; returns whether any of it shows. */
  function draw(sl, k, actK) {
    const xc = s - k * PITCH;
    let a = Math.max(xc - CW / 2, 0), b = Math.min(xc + CW / 2, X);
    for (let i = 0; i < 3; i++) if (a < XE[i] && b > XS[i]) { if (a < XS[i]) b = Math.min(b, XS[i]); else a = Math.max(a, XE[i]); }
    if (b - a < 0.6) { sl.j = -1; sl.grp.setAttribute("display", "none"); return; }
    const j = (a + b) / 2 < XS[1] ? 0 : 1;
    // a crate entering a gap is the farthest in it, so it goes first in that gap's paint order
    if (j !== sl.j || k !== sl.k) { gaps[j].cr.prepend(sl.grp); sl.grp.removeAttribute("display"); }
    Object.assign(sl, { k, j, a, b });
    const [ring, inner] = rings(a, CY0, b, CY1, Math.min(2.4, (b - a) / 2), Math.min(1.1, (b - a) / 3));
    put(sl.el, prism(P, front, ring, inner, BZ, LID));
    sl.seam.setAttribute("d", open(ringAt(P, run(ring, front), LID - 3)));
    sl.el.sil.classList.toggle("hi", k === actK);
    sl.dots.forEach((el, n) => {
      const x = xc + ((n % 3) - 1) * 5.5, on = (id(k) >> n) & 1;
      el.setAttribute("r", x > a + 1.5 && x < b - 1.5 ? 1.05 : 0);
      el.setAttribute("class", on ? (k === actK ? "dot" : "dot m") : "dot off");
      place(el, P(x, BW / 2 + (Math.floor(n / 3) - 0.5) * 6, LID));
    });
  }

  /** What the pointer's ray meets first, near to far: a hood, a crate, else the crate nearest along the belt. */
  function pick() {
    if (!ray) return null;
    for (const [x, y, z] of ray) {
      for (let i = 0; i < 3; i++) if (x > XS[i] && x < XE[i] && y > -YP && y < BW + YP) return { gate: i };
      if (z <= LID && z >= BZ && y > CY0 && y < CY1) for (const sl of slots) if (sl.j >= 0 && x > sl.a && x < sl.b) return { k: sl.k };
    }
    let best = null, bd = Infinity;
    const x = ray[Math.round((HH - LID) / 1.5)][0];
    for (const sl of slots) if (sl.j >= 0 && Math.abs((sl.a + sl.b) / 2 - x) < bd) { bd = Math.abs((sl.a + sl.b) / 2 - x); best = { k: sl.k }; }
    return best;
  }

  const B = register(stage, (dt) => {
    const m = stepS(rate, dt);
    if (!reducedMotion()) s += rate.x * dt;
    const act = over ? pick() : null, actK = act && act.k != null ? act.k : null;
    const kHi = Math.floor((s + CW / 2) / PITCH), live = new Set();
    for (let k = kHi; k > kHi - POOL; k--) { const sl = slots[((k % POOL) + POOL) % POOL]; live.add(sl); draw(sl, k, actK); }
    for (const sl of slots) if (!live.has(sl)) { sl.j = -1; sl.grp.setAttribute("display", "none"); }
    for (const gp of gaps) {
      let d = "";
      for (let x = gp.x0 + 2 + (((s % SLAT) + SLAT) % SLAT); x < gp.x1; x += SLAT) d += seg(P(x, 3, BZ), P(x, BW - 3, BZ));
      gp.slats.setAttribute("d", d);
    }
    hoods.forEach((h, i) => h.sil.classList.toggle("hi", act ? act.gate === i : i === MARK));
    const t = !act ? "rest" : act.gate != null ? `gate ${act.gate + 1}` : `build ${id(act.k)}`;
    if (t !== txt) read.textContent = txt = t;
    return !reducedMotion() || m;
  });
  bag.add(B.unregister);

  function retarget() { rate.t = over ? slow : FAST; B.wake(); }
  bag.add(pointer(stage, {
    move: ([sx, sy]) => {
      // the eye ray as world samples, near (high) to far (low); the scene it is tested against never moves
      ray = [];
      for (let z = HH; z >= 0; z -= 1.5) { const [x, y] = unproj(C, sx, sy, z); ray.push([x, y, z]); }
      over = ray.some(([x, y]) => x > 0 && x < X && y > -YP && y < BW + YP);
      retarget();
    },
    leave: () => { over = false; ray = null; retarget(); },
  }));
  bag.add(() => svg.replaceChildren());
  retarget();

  return {
    set: (v) => { slow = v; retarget(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "conveyor",
  means: "A build pipeline as a belt through three hoods: build, test, deploy. Hovering slows the belt so one artifact can be read.",
  rules: [1, 4, 7, 10],
  range: [2, 5, 10],
  tour: [[149, 133], [196, 135], [239, 178], null],
  mount,
});
