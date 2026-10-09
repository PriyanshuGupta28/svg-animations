/**
 * Tiers: the full stack as a round tiered stand The database
 * at the bottom, widest, ringed with disk grooves; the server above it with
 * vent slots; the API with a row of ports; the UI on top, narrowest, with a
 * ruled screen on its lid. A spindle runs up the middle. The pointer's height
 * picks a tier, read from static bands of the rest pose; the tiers above it
 * lift apart on the 700ms tween, staggered outwards from it, and it takes the
 * bright edge. At rest the stand is slightly exploded and the screen is
 * bright. The slider is the gap the tiers open by.
 */
const {
  Cam, circ, clamp, facing, fit, open, poly, prism, proj, rad, ringAt, rrect, run, seg,
  tween, tset, tval, tdone, disposer, mk, place, pointer, put, register, solid,
} = HL;

// [radius, height, name], bottom to top
const T = [[54, 16, "db"], [43, 14, "server"], [33, 12, "api"], [23, 10, "ui"]];
const GMAX = 24, STEP = 45, REST = [0, 4, 9, 16], MARK = 3, VIEW = 45;
const BASE = T.map((_, i) => T.slice(0, i).reduce((s, t) => s + t[1], 0));
const TOP = BASE[3] + T[3][1];

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let gap = value;
  const C = Cam(45, 0.5, 1.9);
  fit(C, [[-54, -54, 0], [54, 54, 0], [54, -54, 0], [-54, 54, 0], [-23, -23, TOP + 3 * GMAX]], 200, 166);
  const P = proj(C), front = facing(C);
  const at = (r, phi, z) => P(r * Math.cos(rad(phi)), r * Math.sin(rad(phi)), z);

  const g = mk("g", {}, svg);
  const rod = circ(3.5, 20), rodIn = circ(2.6, 20);

  const tiers = T.map(([R, h], i) => {
    const grp = mk("g", {}, g), el = solid(grp);
    const ring = circ(R, R > 30 ? 64 : 48), inner = circ(R - 2.2, R > 30 ? 64 : 48);
    const t = { i, R, h, ring, inner, el, fr: run(ring, front), lift: tween(REST[i]), drawn: NaN };
    if (i === 0 || i === 1) t.lines = mk("path", { class: "nf lo" }, grp);
    if (i === 2) t.ports = [0, 1, 2, 3, 4, 5, 6].map(() => mk("circle", { r: 1.3, class: "dot off" }, grp));
    if (i === 3) { t.screen = mk("path", { class: "nf" }, grp); t.lines = mk("path", { class: "nf lo" }, grp); }
    // the spindle between this tier and the next, painted before the next covers its top
    if (i < 3) t.rod = solid(g);
    return t;
  });
  const scr = rrect(-14, -10, 14, 10, 3.5, 4);

  function drawTier(t, L) {
    const z0 = BASE[t.i] + L, z1 = z0 + t.h;
    put(t.el, prism(P, front, t.ring, t.inner, z0, z1));
    if (t.i === 0) t.lines.setAttribute("d", [0.34, 0.66].map((k) => open(ringAt(P, t.fr, z0 + t.h * k))).join(""));
    if (t.i === 1) {
      let d = "";
      for (let phi = VIEW - 66; phi <= VIEW + 66; phi += 12) d += seg(at(t.R, phi, z0 + 3.5), at(t.R, phi, z1 - 3.5));
      t.lines.setAttribute("d", d);
    }
    if (t.i === 2) t.ports.forEach((el, k) => place(el, at(t.R, VIEW + (k - 3) * 17, z0 + t.h / 2)));
    if (t.i === 3) {
      t.screen.setAttribute("d", poly(ringAt(P, scr, z1)));
      t.lines.setAttribute("d", [-5, 0, 5].map((y) => seg(P(-10, y, z1), P(y === 5 ? 2 : 10, y, z1))).join(""));
    }
  }

  const B = register(stage, (_dt, now) => {
    let m = false, changed = false;
    const Ls = tiers.map((t) => tval(t.lift, now));
    tiers.forEach((t, i) => {
      if (!tdone(t.lift, now)) m = true;
      if (Ls[i] !== t.drawn) { t.drawn = Ls[i]; drawTier(t, Ls[i]); changed = true; }
    });
    if (changed) tiers.forEach((t, i) => {
      if (!t.rod) return;
      const a = BASE[i] + Ls[i] + t.h, b = BASE[i + 1] + Ls[i + 1];
      put(t.rod, b - a > 0.3 ? prism(P, front, rod, rodIn, a, b) : { sil: "", crease: "" });
    });
    return m;
  });
  bag.add(B.unregister);

  // Hit bands: the pointer's height against the middle of each tier's resting front. They never move.
  const mids = tiers.map((t) => at(t.R, VIEW, BASE[t.i] + REST[t.i] + t.h / 2)[1]);
  const half = P(54, -54, 0)[0] - P(0, 0, 0)[0] + 8, cx = P(0, 0, 0)[0];
  const yLo = P(54, 54, 0)[1] + 8, yHi = P(-23, -23, TOP + REST[3])[1] - 30;
  function hit([x, y]) {
    if (Math.abs(x - cx) > half || y > yLo || y < yHi) return -1;
    let best = 0;
    mids.forEach((m, i) => { if (Math.abs(y - m) < Math.abs(y - mids[best])) best = i; });
    return best;
  }

  let act = null;
  function setActive(a) {
    if (a === act) return;
    const now = performance.now(), from = a >= 0 ? a : act >= 0 ? act : MARK;
    act = a;
    tiers.forEach((t, i) => {
      tset(t.lift, a < 0 ? REST[i] : i <= a ? 0 : (i - a) * clamp(gap, 0, GMAX), now, Math.abs(i - from) * STEP);
      t.el.sil.classList.toggle("hi", i === a);
    });
    tiers[3].screen.classList.toggle("hi", a < 0);
    read.textContent = a < 0 ? "rest" : "tier " + T[a][2];
    B.wake();
  }

  bag.add(pointer(stage, { move: (p) => setActive(hit(p)), leave: () => setActive(-1) }));
  bag.add(() => svg.replaceChildren());
  setActive(-1);

  return {
    set: (v) => { gap = v; if (act >= 0) { const a = act; act = null; setActive(a); } },
    destroy: bag.dispose,
  };
}

hairline({
  name: "tiers",
  means: "The full stack as a tiered stand: pick a tier and the layers above it lift apart, from the database up to the UI.",
  rules: [1, 2, 4, 5],
  range: [12, 18, 24],
  tour: [[200, 284], [200, 204], [200, 150], null],
  mount,
});
