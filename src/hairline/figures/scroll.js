/**
 * Scroll: a long landing page as a paper scroll lying on the desk. The sheet
 * is wound on a wooden roller at the far end and fixed to a second, bare
 * roller at its leading edge; both rollers carry a neck and a turned knob at
 * each end. The sheet is ruled in dim lines of uneven length, broken into
 * sections by full-width dividers. The pointer's x drags the leading roller
 * on a spring: the sheet unrolls behind it, its rules riding out of the roll,
 * and the wound roll thins as it pays out. At rest it lies half unrolled and
 * the leading roller is bright. The slider is the longest it unrolls, in
 * world units.
 */
const {
  Cam, circ, clamp, fit, hull, lerp, poly, proj, seg,
  spring, stepS, disposer, mk, pointer, put, register, solid,
} = HL;

const W = 90, LMAX = 130, CORE = 4.6, LEAD = 5, NECK = 2.8, FIN = 6, LMIN = 30, RULE = 5.5, SMAX = 260, REST = 0.62;
/** Each roller along y: [y0, y1, radius] for the far knob, far neck, the body, near neck, near knob; the body's radius is filled in. */
const PARTS = [[-13, -7.5, FIN], [-8.5, 0.5, NECK], [0, W, 0], [W - 0.5, W + 8.5, NECK], [W + 7.5, W + 13, FIN]];
const ring = circ(1, 24);

/** The paper still wound on the far roller, as its radius, with length l of a sheet of length max paid out. */
const wound = (l, max) => Math.sqrt(CORE * CORE + 1.1 * Math.max(0, max - l));
/** Rule k's share of the width: uneven, like lines of copy; every eighth is a section divider. */
const share = (k) => (k % 8 === 0 ? 1 : 0.35 + 0.6 * Math.abs(Math.sin(k * 2.17 + 0.6)));

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let max = value, px = null;
  const C = Cam(45, 0.5, 1.95);
  const top = wound(0, LMAX) * 2;
  fit(C, [[-14, -13, 0], [-14, W + 13, 0], [LMAX + 8, -13, 0], [LMAX + 8, W + 13, 0], [-14, -13, top], [0, W + 13, top]], 200, 166);
  const P = proj(C);

  const g = mk("g", {}, svg);
  const sheet = mk("path", { class: "sil" }, g), rules = mk("path", { class: "nf lo" }, g), divs = mk("path", { class: "nf" }, g);
  const roller = () => PARTS.map(() => solid(g));
  const far = roller(), lead = roller();
  lead[2].sil.classList.add("hi");

  /** One roller at x, its body of radius rb: each part a cylinder with its ends eased, its near end as the crease. */
  function drawRoller(els, x, rb) {
    const cz = Math.max(rb, FIN);
    PARTS.forEach(([y0, y1, r0], i) => {
      const r = r0 || rb, e = Math.min(0.9, r * 0.25), cap = (y, rr) => ring.map((q) => P(x + q.u * rr, y, cz + q.v * rr));
      const pts = [...cap(y0, r - e), ...cap(y0 + e, r), ...cap(y1 - e, r), ...cap(y1, r - e)];
      put(els[i], { sil: poly(hull(pts)), crease: poly(cap(y1, r - e - 0.5)) });
    });
  }

  const sp = spring(max * REST, { eps: 0.05 });
  let drawn = NaN;
  function draw() {
    const l = sp.x;
    if (l === drawn) return;
    drawn = l;
    sheet.setAttribute("d", poly([P(0, 0, 0.4), P(l, 0, 0.4), P(l, W, 0.4), P(0, W, 0.4)]));
    let r = "", d = "";
    for (let k = 1, s = RULE; s < Math.min(l, SMAX); k++, s += RULE) {
      const x = l - s, f = share(k), line = seg(P(x, 5, 0.4), P(x, 5 + f * (W - 10), 0.4));
      if (f === 1) d += line; else r += line;
    }
    rules.setAttribute("d", r); divs.setAttribute("d", d);
    drawRoller(far, 0, wound(l, max));
    drawRoller(lead, l, LEAD);
  }

  const B = register(stage, (dt) => { const m = stepS(sp, dt); draw(); return m; });
  bag.add(B.unregister);

  function retarget() {
    // the pointer's x is where the leading roller lies on screen, between its shortest and longest
    const x0 = P(LMIN, W / 2, 0)[0], x1 = P(max, W / 2, 0)[0];
    sp.t = px === null ? max * REST : lerp(LMIN, max, clamp((px - x0) / (x1 - x0), 0, 1));
    read.textContent = px === null ? "rest" : `scroll ${Math.round((100 * sp.t) / max)}%`;
    drawn = NaN;
    B.wake();
  }

  bag.add(pointer(stage, { move: (p) => { px = p[0]; retarget(); }, leave: () => { px = null; retarget(); } }));
  bag.add(() => svg.replaceChildren());
  retarget();

  return {
    set: (v) => { max = v; retarget(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "scroll",
  means: "A long page as a paper scroll: the pointer drags the leading roller, and the sheet unrolls behind it, section by section.",
  rules: [3, 5, 6, 8],
  range: [90, 110, 130],
  tour: [[259, 209], [170, 164], [218, 188], null],
  mount,
});
