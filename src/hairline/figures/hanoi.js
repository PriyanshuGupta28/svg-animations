/**
 * Hanoi: a rebase as a Tower of Hanoi, a base board with three pegs and five
 * tapered discs, the commits. The pointer picks a peg, tested on each peg's
 * resting place on screen; it is the new base: its discs stay, and the others
 * lift clear, cross and are replayed on top of them, nearest peg first,
 * staggered outwards from the peg chosen on the 700ms tween. At rest the discs
 * are split 3·1·1 and the top disc of the first peg is bright. The slider is
 * the stagger, in ms.
 */
const {
  Cam, clamp, circ, facing, fit, hull, lerp, open, poly, prism, proj, ringAt, rings, rrect, run,
  tween, tset, tval, tdone, disposer, mk, pointer, put, register, solid,
} = HL;

const GAP = 64, DH = 7.5, PEG_H = 5 * DH + 6, CLEAR = PEG_H + 1, PR = 2.6, BX = 36, BY = 33, T = 700;
const PX = [0, GAP, 2 * GAP];
/** Disc radius by size, 1 the smallest. */
const RAD = (s) => 9 + 4 * s;
/** At rest: each peg's discs, bottom to top, by size. */
const REST = [[5, 4, 2], [3], [1]];
const MARK = 0;

const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const home = (s) => REST.findIndex((st) => st.includes(s));

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;
  const C = Cam(45, 0.5, 1.5);
  const ZMAX = CLEAR + 5 * DH;
  fit(C, [[-BX, -BY, -8], [PX[2] + BX, BY, -8], [PX[2] + BX, -BY, -8], [-BX, BY, -8], [0, 0, ZMAX], [PX[2], 0, ZMAX]], 200, 166);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  const br = rrect(-BX, -BY, PX[2] + BX, BY, 12, 14), bi = rrect(2 - BX, 2 - BY, PX[2] + BX - 2, BY - 2, 10, 14);
  put(solid(g), prism(P, front, br, bi, -8, 0));
  const pegs = PX.map((x) => {
    const [r, i] = rings(x - PR, -PR, x + PR, PR, PR, 0.8);
    const rod = solid(g), tip = solid(g);
    put(rod, prism(P, front, r, i, 0, PEG_H));
    return { x, r, i, rod, tip, z0: NaN };
  });

  // the discs by size, each a short bevelled cylinder: a foot, a narrower top, and one crease
  const discs = [1, 2, 3, 4, 5].map((s) => {
    const R = RAD(s), p = home(s), z = REST[p].indexOf(s) * DH;
    return { s, foot: circ(R, 40), top: circ(R - 1.6, 40), inner: circ(R - 2.8, 40), el: solid(g), x0: PX[p], z0: z, x1: PX[p], z1: z, fly: z, u: tween(1), v: tween(1), drawn: "" };
  });

  /** Where a disc is: on its u tween it rises to its own lane and crosses; on its v tween it drops. */
  function at(d, now) {
    const u = tval(d.u, now), v = tval(d.v, now);
    return [lerp(d.x0, d.x1, smooth((u - 0.4) / 0.6)), v > 0 ? lerp(d.fly, d.z1, v) : lerp(d.z0, d.fly, smooth(u / 0.4))];
  }

  let order = "";
  function draw(now) {
    const items = [];
    for (const d of discs) {
      const [x, z] = at(d, now);
      d.x = x; d.z = z;
      const key = x + "," + z;
      if (key !== d.drawn) {
        d.drawn = key;
        const on = (ring, zz) => ringAt(P, ring.map((q) => ({ ...q, u: q.u + x })), zz);
        d.el.sil.setAttribute("d", poly(hull(on(d.foot, z + 0.6).concat(on(d.top, z + DH)))));
        d.el.cr.setAttribute("d", open(on(run(d.inner, front), z + DH)));
      }
      // a disc above the pegs is painted over everything grounded; the rest by x, then height
      items.push([z >= PEG_H ? 1e6 + x * 1000 + z : x * 1000 + z, d.el.g]);
    }
    for (const pg of pegs) {
      // the peg's tip, from the top of the highest disc threaded on it, painted over that disc
      const on = discs.filter((d) => Math.abs(d.x - pg.x) < 0.5 && d.z + DH < PEG_H);
      const z0 = on.length ? Math.max(...on.map((d) => d.z + DH)) : 0;
      if (z0 !== pg.z0) { pg.z0 = z0; put(pg.tip, prism(P, front, pg.r, pg.i, z0, PEG_H)); }
      items.push([pg.x * 1000 - 1, pg.rod.g], [pg.x * 1000 + z0 - DH + 0.5, pg.tip.g]);
    }
    items.sort((a, b) => a[0] - b[0]);
    const key = items.map((it) => it[0]).join();
    if (key !== order) { order = key; for (const [, el] of items) g.appendChild(el); }
  }

  /**
   * Moves the settled discs to peg a's rebase (or home for -1). Each moving disc gets its own lane
   * above the pegs, ranked by where it lands. A disc leaves after any disc above it on its peg that
   * crosses higher, or once one that crosses lower is gone; it drops no sooner than any disc that
   * lands under it. So no disc passes through another, from any pose to any other.
   */
  let want = -1, shown = -1;
  function go(a) {
    const now = performance.now(), ref = a >= 0 ? a : shown >= 0 ? shown : MARK;
    shown = a;
    const by = [0, 1, 2].sort((p, q) => Math.abs(p - a) - Math.abs(q - a) || p - q);
    const slot = new Map();
    if (a < 0) discs.forEach((d) => slot.set(d, [home(d.s), REST[home(d.s)].indexOf(d.s)]));
    else { let k = 0; for (const p of by) for (const s of REST[p]) slot.set(discs[s - 1], [a, k++]); }
    const mv = discs.filter((d) => PX[slot.get(d)[0]] !== d.x1 || slot.get(d)[1] * DH !== d.z1);
    for (const d of mv) Object.assign(d, { x0: d.x1, z0: d.z1, x1: PX[slot.get(d)[0]], z1: slot.get(d)[1] * DH });
    mv.sort((p, q) => p.z1 - q.z1 || p.z0 - q.z0).forEach((d, i) => { d.fly = CLEAR + i * DH; });
    for (const d of [...mv].sort((p, q) => q.z0 - p.z0)) {
      d.su = Math.abs(home(d.s) - ref) * stag;
      for (const y of mv) if (y.x0 === d.x0 && y.z0 > d.z0) d.su = Math.max(d.su, y.fly > d.fly ? y.su : y.su + T);
    }
    for (const d of [...mv].sort((p, q) => p.z1 - q.z1)) {
      d.sv = d.su + T;
      for (const y of mv) if (y.x1 === d.x1 && y.z1 < d.z1) d.sv = Math.max(d.sv, y.sv);
      d.u = tween(0); tset(d.u, 1, now, d.su);
      d.v = tween(0); tset(d.v, 1, now, d.sv);
    }
  }

  const B = register(stage, (_dt, now) => {
    draw(now);
    if (discs.some((d) => !tdone(d.u, now) || !tdone(d.v, now))) return true;
    // a new choice waits for the discs to settle, then starts from there
    if (want !== shown) { go(want); return true; }
    return false;
  });
  bag.add(B.unregister);

  /** The peg whose resting place on screen is nearest the pointer's x, within the board's height; -1 for none. */
  function hit([sx, sy]) {
    let best = -1, bd = Infinity;
    PX.forEach((x, p) => {
      const [cx, cy] = P(x, 0, PEG_H / 2), d = Math.abs(sx - cx);
      if (d < bd && d < GAP * 0.6 && Math.abs(sy - cy) < 80) { bd = d; best = p; }
    });
    return best;
  }

  function setActive(a) {
    want = a;
    for (const d of discs) d.el.sil.classList.toggle("hi", a < 0 && d.s === REST[MARK][REST[MARK].length - 1]);
    pegs.forEach((pg, p) => { pg.rod.sil.classList.toggle("hi", p === a); pg.tip.sil.classList.toggle("hi", p === a); });
    read.textContent = a < 0 ? "rest" : `peg ${a + 1} · ${5 - REST[a].length}`;
    B.wake();
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
  name: "hanoi",
  means: "A rebase as a Tower of Hanoi: the discs on the other pegs lift and are replayed on top of the peg under the pointer.",
  rules: [1, 2, 5, 8],
  range: [0, 45, 90],
  tour: [[200, 168], [132, 135], [268, 202], null],
  mount,
});
