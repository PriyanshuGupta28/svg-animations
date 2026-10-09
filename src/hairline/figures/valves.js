/**
 * Valves: a rollout as a pipe manifold on a skid. One header pipe feeds five
 * branch lines, each through a flanged globe valve with a rising stem and a
 * handwheel that turns as it climbs. Scrub and pick: the pointer's x sets how
 * far every valve stands open, on one spring per valve; its y picks a valve,
 * whose wheel takes the bright edge. At rest the valves stand open unevenly,
 * valve 2 bright. The slider is the stem's full travel, in world units.
 */
const {
  Cam, circ, clamp, fit, hull, open, poly, prism, proj, facing, ringAt, rings, run, seg,
  spring, stepS, disposer, mk, place, pointer, put, register, solid,
} = HL;

const N = 5, PITCH = 26, X0 = 4, ZC = 14, RH = 5, RB = 3.5, VY = 22, YE = 50, WZ = 34, WR = 9;
const REST = [0.05, 0.55, 0.2, 0.75, 0], MARK = 1;
const XS = Array.from({ length: N }, (_, i) => X0 + i * PITCH), XE = XS[N - 1] + 12;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let travel = value;

  const C = Cam(45, 0.5, 2.0);
  fit(C, [[-14, -10, -3], [XE + 8, YE + 8, -3], [XE + 8, -10, -3], [-14, YE + 8, -3], [XS[0] - WR, VY - WR, WZ + 28], [XS[N - 1] + WR, VY - WR, WZ + 28]], 200, 166);
  const P = proj(C), front = facing(C);
  const box = (parent, x0, y0, x1, y1, r, b, z0, z1) => { const s = solid(parent); const [o, i] = rings(x0, y0, x1, y1, r, b); put(s, prism(P, front, o, i, z0, z1)); return s; };
  /** A pipe lying along x or y from c0 to c1 (c1 the nearer end), centred on `other` and ZC: the hull of its two end circles, and the near end as its crease. */
  const tube = (parent, axis, c0, c1, other, r) => {
    const end = (s) => Array.from({ length: 24 }, (_, k) => {
      const t = (k / 24) * 2 * Math.PI, o = other + r * Math.cos(t), z = ZC + r * Math.sin(t);
      return axis === "x" ? P(s, o, z) : P(o, s, z);
    });
    const s = solid(parent);
    put(s, { sil: poly(hull(end(c0).concat(end(c1)))), crease: poly(end(c1)) });
  };
  const at = (ring, x, y) => ring.map((q) => ({ ...q, u: q.u + x, v: q.v + y }));

  const g = mk("g", {}, svg);
  // the skid, the header on its two saddles, then each branch back to front
  box(g, -14, -10, XE + 8, YE + 8, 4, 2, -3, 0);
  for (const x of [XS[0] - 8, XS[N - 1] + 6]) box(g, x - 3, -4, x + 3, 4, 1.2, 0.8, 0, ZC - RH);
  tube(g, "x", -8, XE, 0, RH);

  const rimO = circ(WR, 28), rimI = circ(WR - 1.3, 28), hub = circ(1.6, 12);
  const valves = XS.map((x, i) => {
    const vg = mk("g", {}, g);
    tube(vg, "y", 3.6, VY - 6.5, x, RB);
    tube(vg, "y", VY - 6.5, VY - 5, x, RB + 3);
    tube(vg, "y", VY - 5, VY + 5, x, RB + 2);
    tube(vg, "y", VY + 5, VY + 6.5, x, RB + 3);
    // bolts on the near flange's face
    for (let k = 0; k < 6; k++) {
      const t = (k / 6) * 2 * Math.PI + 0.5;
      place(mk("circle", { r: 0.7, class: "dot off" }, vg), P(x + 5.2 * Math.cos(t), VY + 6.5, ZC + 5.2 * Math.sin(t)));
    }
    box(vg, x - 2.5, YE - 12, x + 2.5, YE - 8, 1.2, 0.8, 0, ZC - RB);
    tube(vg, "y", VY + 6.5, YE - 1.5, x, RB);
    tube(vg, "y", YE - 1.5, YE, x, RB + 2);
    // bonnet and packing gland over the body
    box(vg, x - 3.5, VY - 4, x + 3.5, VY + 4, 1.6, 0.8, ZC + 4, WZ - 6);
    box(vg, x - 2.2, VY - 2.2, x + 2.2, VY + 2.2, 1.4, 0.6, WZ - 6, WZ - 4);
    const stem = solid(vg), rim = mk("path", { class: "nf sil" }, vg), lip = mk("path", { class: "nf lo" }, vg);
    const spokes = mk("path", { class: "nf" }, vg), boss = solid(vg);
    return { x, i, stem, rim, lip, spokes, boss, sp: spring(REST[i]), drawn: NaN };
  });

  function draw(v) {
    const o = v.sp.x * travel;
    if (o === v.drawn) return;
    v.drawn = o;
    const z = WZ + o, x = v.x, a = o * 0.35;
    const [sr, si] = rings(x - 1.2, VY - 1.2, x + 1.2, VY + 1.2, 1.1, 0.4);
    put(v.stem, prism(P, front, sr, si, WZ - 4, z + 2));
    v.rim.setAttribute("d", poly(ringAt(P, at(rimO, x, VY), z)) + poly(ringAt(P, at(rimI, x, VY), z)));
    v.lip.setAttribute("d", open(ringAt(P, run(at(rimO, x, VY), front), z - 1.2)));
    let d = "";
    for (let k = 0; k < 3; k++) {
      const t = a + (k * 2 * Math.PI) / 3, c = Math.cos(t), s = Math.sin(t);
      d += seg(P(x + 1.6 * c, VY + 1.6 * s, z), P(x + (WR - 1.3) * c, VY + (WR - 1.3) * s, z));
    }
    v.spokes.setAttribute("d", d);
    put(v.boss, prism(P, front, at(hub, x, VY), at(circ(1, 12), x, VY), z - 0.6, z + 0.8));
  }

  const B = register(stage, (dt) => {
    let m = false;
    for (const v of valves) { if (stepS(v.sp, dt)) m = true; draw(v); }
    return m;
  });
  bag.add(B.unregister);

  // static bands, read from the rest pose: x across the wheels scrubs the opening, y down the figure picks a valve
  const L = P(XS[0], VY, WZ)[0] - 20, R = P(XS[N - 1], VY, WZ)[0] + 20;
  const Y0 = P(XS[0], VY, WZ)[1], Y1 = P(XS[N - 1], VY, WZ)[1], T = Y0 - 45, Bt = P(XS[N - 1], YE, 0)[1];
  const hit = ([sx, sy]) => {
    if (sx < L - 40 || sx > R + 40 || sy < T || sy > Bt) return null;
    return { a: clamp(Math.round(((sy - Y0) / (Y1 - Y0)) * (N - 1)), 0, N - 1), t: clamp((sx - L) / (R - L), 0, 1) };
  };

  let act = null;
  function setActive(h) {
    const a = h ? h.a : -1, j = a < 0 ? MARK : a;
    for (const v of valves) {
      v.sp.t = h ? h.t : REST[v.i];
      v.rim.classList.toggle("hi", v.i === j);
    }
    const txt = h ? `valve ${a + 1} · ${Math.round(h.t * 100)}%` : "rest";
    if (txt !== act) { act = txt; read.textContent = txt; }
    B.wake();
  }

  bag.add(pointer(stage, { move: (p) => setActive(hit(p)), leave: () => setActive(null) }));
  bag.add(() => svg.replaceChildren());
  setActive(null);

  return {
    set: (v) => { travel = v; for (const k of valves) k.drawn = NaN; B.wake(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "valves",
  means: "A rollout as a pipe manifold: the pointer's x opens every valve, its y picks one, and its handwheel climbs as it turns.",
  rules: [1, 3, 5, 8],
  range: [10, 18, 26],
  tour: [[201, 151], [128, 115], [275, 188], null],
  mount,
});
