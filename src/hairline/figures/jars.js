/**
 * Jars: a key-value store as a two-shelf rack of lidded jars, five to a
 * shelf, each a different height and girth, with a shoulder, a neck and a
 * screw lid. The pointer picks a jar, tested on each jar's resting outline;
 * it lifts and its lid pops up, while the jars beside it on its shelf shift
 * aside and the ones on the other shelf settle, staggered by distance on the
 * 700ms tween. At rest one jar's lid sits ajar and bright. The slider is the
 * stagger, in ms.
 */
const {
  Cam, circ, facing, fit, hull, open, poly, prism, proj, ringAt, rings, run,
  tween, tset, tval, tdone, disposer, mk, pointer, put, register, solid,
} = HL;

const NJ = 5, PITCH = 27, X = NJ * PITCH, ZS = 82, PT = 4, SH = 3, NK = 3, LH = 5;
const LIFT = 6, POP = 9, AJAR = 4, SLIDE = 3, MARK = [1, 2];
/** Body heights and radii, per shelf (0 is the lower), per jar. */
const H = [[28, 34, 20, 30, 25], [30, 22, 36, 26, 32]];
const R = [[9, 8, 10.5, 8.5, 9.5], [8.5, 10, 9, 10, 8]];

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;

  const S = 1.6, C = Cam(45, 0.5, S);
  fit(C, [[-8, -15, -PT], [X + 8, 15, -PT], [X + 8, -15, 0], [-8, 15, 0], [-8, -15, ZS + 50], [X, 0, ZS + 36 + SH + NK + LH + LIFT + POP]], 200, 166);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg), jars = [];
  const plank = (z) => { const [o, i] = rings(-8, -15, X + 8, 15, 5, 1.6); put(solid(g), prism(P, front, o, i, z - PT, z)); };
  const shelf = (b) => {
    for (let i = 0; i < NJ; i++) {
      const jg = mk("g", {}, g), r = R[b][i], nr = r * 0.78;
      jars.push({
        b, i, r, h: H[b][i], z0: b * ZS, cx: i * PITCH + PITCH / 2, body: solid(jg), lid: solid(jg),
        foot: circ(r, 32), neck: circ(nr, 24), lidO: circ(nr + 1.6, 24), lidI: circ(nr + 0.6, 24),
        dx: tween(0), up: tween(0), pop: tween(i === MARK[1] && b === MARK[0] ? AJAR : 0), drawn: "",
      });
    }
  };
  plank(0);
  // two posts at the back corners hold the upper shelf
  for (const x of [-3, X + 3]) { const [o, i] = rings(x - 2.5, -13.5, x + 2.5, -8.5, 2.5, 0.8); put(solid(g), prism(P, front, o, i, 0, ZS - PT)); }
  shelf(0);
  plank(ZS);
  shelf(1);

  const at = (ring, cx) => ring.map((q) => ({ ...q, u: q.u + cx }));
  function draw(j, now) {
    const dx = tval(j.dx, now), up = tval(j.up, now), pop = tval(j.pop, now), key = dx + "," + up + "," + pop;
    if (key === j.drawn) return;
    j.drawn = key;
    const cx = j.cx + dx, z0 = j.z0 + up, zb = z0 + j.h, zn = zb + SH + NK;
    const foot = at(j.foot, cx), neck = at(j.neck, cx);
    // the glass: body, shoulder and neck in one hull; the crease is the shoulder line
    put(j.body, {
      sil: poly(hull(ringAt(P, foot, z0).concat(ringAt(P, foot, zb), ringAt(P, neck, zn)))),
      crease: open(ringAt(P, run(foot, front), zb)),
    });
    put(j.lid, prism(P, front, at(j.lidO, cx), at(j.lidI, cx), zn - 2 + pop, zn - 2 + LH + pop));
  }

  const B = register(stage, (_dt, now) => {
    let m = false;
    for (const j of jars) { draw(j, now); if (!tdone(j.dx, now) || !tdone(j.up, now) || !tdone(j.pop, now)) m = true; }
    return m;
  });
  bag.add(B.unregister);

  /** The jar whose resting outline on screen holds the pointer, nearest its axis; -1 for none. */
  const half = (PITCH / 2) * S * Math.SQRT1_2;
  function hit([sx, sy]) {
    let best = -1, bd = Infinity;
    jars.forEach((j, n) => {
      const [ax, bot] = P(j.cx, j.r, j.z0), top = P(j.cx, -j.r, j.z0 + j.h + SH + NK + LH)[1], d = Math.abs(sx - ax);
      if (d < half && sy > top - 4 && sy < bot + 2 && d < bd) { bd = d; best = n; }
    });
    return best;
  }

  let act = -2;
  const mark = jars.findIndex((j) => j.b === MARK[0] && j.i === MARK[1]);
  function setActive(a) {
    if (a === act) return;
    const now = performance.now(), from = jars[a >= 0 ? a : act >= 0 ? act : mark];
    act = a;
    const p = a >= 0 ? jars[a] : null;
    for (const j of jars) {
      const delay = (Math.abs(j.i - from.i) + Math.abs(j.b - from.b)) * stag, same = p && j.b === p.b && j !== p;
      tset(j.dx, same ? Math.sign(j.i - p.i) * SLIDE / Math.abs(j.i - p.i) : 0, now, delay);
      tset(j.up, j === p ? LIFT : 0, now, delay);
      tset(j.pop, j === p ? POP : !p && j === jars[mark] ? AJAR : 0, now, delay);
      j.lid.sil.classList.toggle("hi", j === (p || jars[mark]));
    }
    read.textContent = p ? `key ${p.b + 1}·${p.i + 1}` : "rest";
    B.wake();
  }

  bag.add(pointer(stage, { move: (pt) => setActive(hit(pt)), leave: () => setActive(-1) }));
  bag.add(() => svg.replaceChildren());
  setActive(-1);

  return {
    set: (v) => { stag = v; },
    destroy: bag.dispose,
  };
}

hairline({
  name: "jars",
  means: "A key-value store as a shelf of lidded jars: the one under the pointer lifts and pops its lid, its neighbours shift aside.",
  rules: [1, 2, 5, 8],
  range: [0, 45, 90],
  tour: [[200, 75], [139, 183], [261, 111], null],
  mount,
});
