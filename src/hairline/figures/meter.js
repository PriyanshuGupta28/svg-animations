/**
 * Meter: usage-based billing as a utility meter standing on the desk. A boxy
 * housing, a terminal cover at its foot, and a glass face holding four
 * geared dials, each a ring of tick dots and a needle; under them the rim of
 * the spinning disc shows through its slot. The pointer's x sets the usage,
 * on a spring; the dials turn geared, each a tenth as fast as the one before
 * it and in the opposite sense, as a real register's do. At rest the needles
 * stand at uneven angles and the first one is bright. The slider is the
 * meter's full scale, in units.
 */
const {
  Cam, circ, clamp, fit, poly, prism, proj, rings, rrect, seg, facing,
  spring, stepS, disposer, mk, place, pointer, put, register, solid,
} = HL;

/** Housing width (x), depth (y) and height; the face is the y = D side. Dials: count, radius, where each sits on the face (u, w), first to last. */
const W = 116, D = 26, H = 128, ND = 4, RD = 20, NT = 10, F0 = 0.4213;
const AT = [[32, 99], [84, 99], [32, 55], [84, 55]];
/** The needle, in its own (across, along) plane: a slender blade from the hub to its point, and a round counterweight behind the hub. */
const ARC = Array.from({ length: 11 }, (_, i) => { const a = ((60 - 30 * i) * Math.PI) / 180; return [3.4 * Math.cos(a), -7.6 + 3.4 * Math.sin(a)]; });
const NEEDLE = [[0, RD - 1.5], [1.5, 2], [1.3, -4.2], ...ARC, [-1.3, -4.2], [-1.5, 2]];

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let max = value;
  const C = Cam(45, 0.5, 1.72);
  fit(C, [[0, 0, 0], [W, 0, 0], [0, D + 10, 0], [W, D + 10, 0], [0, 0, H], [W, D, H]], 200, 166);
  const P = proj(C), front = facing(C);
  /** A point on the face, u along it from its left end, w up it, standing o in front of it. */
  const F = (u, w, o = 0) => P(u, D + o, w);

  const g = mk("g", {}, svg);
  { const [r, i] = rings(0, 0, W, D, 7, 1.8); put(solid(g), prism(P, front, r, i, 0, H)); }
  // the glass, in a raised bezel, and the slot the disc's rim shows through
  mk("path", { d: poly(rrect(5, 29, W - 5, H - 3, 10, 5).map((q) => F(q.u, q.v, 0.6))), class: "nf" }, g);
  mk("path", { d: poly(rrect(W / 2 - 30, 22, W / 2 + 30, 26, 2, 4).map((q) => F(q.u, q.v))), class: "nf lo" }, g);
  const disc = mk("circle", { r: 1.3, class: "dot m" }, g);
  // the terminal cover at the foot, with its sealing screw
  { const [r, i] = rings(24, D, W - 24, D + 10, 4, 1.2); put(solid(g), prism(P, front, r, i, 0, 16)); }
  place(mk("circle", { r: 1.3, class: "dot off" }, g), P(W / 2, D + 10, 9));

  const dials = AT.map(([c, z], k) => {
    mk("path", { d: poly(circ(RD + 2.2, 32).map((q) => F(c + q.u, z + q.v, 0.3))), class: "nf lo" }, g);
    for (let t = 0; t < NT; t++) {
      const a = (t / NT) * 2 * Math.PI;
      place(mk("circle", { r: t ? 0.9 : 1.3, class: t ? "dot off" : "dot m" }, g), F(c + (RD + 0.2) * Math.sin(a), z + (RD + 0.2) * Math.cos(a), 0.3));
    }
    const el = mk("path", { class: k === 0 ? "sil hi" : "sil" }, g);
    place(mk("circle", { r: 1.1, class: "dot off" }, g), F(c, z, 0.5));
    return { c, z, el, dir: k % 2 ? -1 : 1 };
  });

  const sp = spring(F0, { eps: 0.0002 });
  /** Dial k's needle at usage U: the first dial counts thousands, the last units, alternate dials turning the other way. */
  function draw(U) {
    dials.forEach((d, k) => {
      const a = d.dir * ((U / 10 ** (ND - 1 - k)) % 10) / 10 * 2 * Math.PI, s = Math.sin(a), co = Math.cos(a);
      const at = (x, y) => F(d.c + x * co + y * s, d.z - x * s + y * co, 0.5);
      d.el.setAttribute("d", poly(NEEDLE.map(([x, y]) => at(x, y))) + seg(at(0, -7.6), at(0, 12)));
    });
    const t = (U / 10) * 2 * Math.PI;
    place(disc, F(W / 2 + 27 * Math.sin(t), 24, 0));
    disc.setAttribute("class", Math.cos(t) > 0 ? "dot m" : "dot off");
  }

  let drawn = NaN;
  const B = register(stage, (dt) => {
    const m = stepS(sp, dt), U = sp.x * max;
    if (U !== drawn) { drawn = U; draw(U); }
    return m;
  });
  bag.add(B.unregister);

  // the scrub reads the pointer's screen x against the face's two ends, which never move
  const x0 = F(12, 80)[0], x1 = F(W - 12, 80)[0];
  function retarget(p) {
    sp.t = p ? clamp((p[0] - x0) / (x1 - x0), 0, 1) : F0;
    read.textContent = p ? `usage ${Math.round(sp.t * max).toLocaleString("en-US")}` : "rest";
    B.wake();
  }

  bag.add(pointer(stage, { move: retarget, leave: () => retarget(null) }));
  bag.add(() => svg.replaceChildren());
  retarget(null);

  return {
    set: (v) => { max = v; B.wake(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "meter",
  means: "Usage billing as a utility meter: the pointer runs the usage up and down, and its four geared dials turn, each a tenth as fast.",
  rules: [1, 3, 5, 8],
  range: [1000, 5000, 9999],
  tour: [[150, 128], [254, 179], [200, 150], null],
  mount,
});
