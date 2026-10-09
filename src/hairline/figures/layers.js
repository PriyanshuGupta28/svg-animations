/**
 * Layers: a UI taken apart into five plates stacked over each other: the
 * background (a dot grid), the layout (its regions outlined), the components
 * (cards and a button standing proud), the copy (rules of lines) and, on top,
 * the overlay with a tooltip. At rest the stack is slightly exploded and the
 * overlay is bright. The pointer's x scrubs the gap between plates, on one
 * spring; its y picks a plate, read against the gap's target, and that plate
 * takes the bright edge. The slider is the largest gap, in world units.
 */
const {
  Cam, clamp, facing, fit, lerp, poly, prism, proj, rings, rrect, seg, spring, stepS,
  flatDot, mk, place, pointer, put, register, disposer, solid,
} = HL;

const X1 = 120, Y1 = 90, TH = 2.4, GMIN = 3, GREST = 24, MARK = 4;
const NAMES = ["background", "layout", "components", "copy", "overlay"];
// Raised parts, by layer: [x0, y0, x1, y1, r, height]
const RAISED = {
  2: [[8, 22, 40, 52, 3, 4], [46, 22, 78, 52, 3, 4], [84, 22, 112, 52, 3, 4], [70, 70, 108, 80, 5, 3]],
  4: [[58, 40, 96, 54, 7, 4]],
};

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let gmax = value, scr = null;
  const C = Cam(45, 0.5, 1.3);
  const zTop = (i, gap) => i * (gap + TH);
  fit(C, [[0, 0, 0], [X1, Y1, 0], [X1, 0, 0], [0, Y1, 0], [0, 0, zTop(4, 36) + TH + 4]], 200, 166);
  const P = proj(C), front = facing(C);
  const gap = spring(GREST, { eps: 0.02 });
  const [pr, pi] = rings(0, 0, X1, Y1, 8, 1.6);
  const xl = P(0, Y1, 0)[0], xr = P(X1, 0, 0)[0];

  const g = mk("g", {}, svg);
  const layers = NAMES.map((name, i) => {
    const grp = mk("g", {}, g), plate = solid(grp);
    const L = { i, plate, lo: mk("path", { class: "nf lo" }, grp), md: mk("path", { class: "nf" }, grp), dots: [], raised: [] };
    if (i === 0) for (let k = 0; k < 35; k++) L.dots.push(flatDot(grp, C, 0.7, k === 24 ? "dot m" : "dot off"));
    if (i === 4) for (let k = 0; k < 3; k++) L.dots.push(flatDot(grp, C, 1.4, "dot off"));
    for (const r of RAISED[i] || []) L.raised.push({ r, rg: rings(r[0], r[1], r[2], r[3], r[4], 1), el: solid(grp) });
    return L;
  });

  /** The flat marks on each layer's top at height z: [dim, medium] path strings. */
  function marks(i, z) {
    const s = (a, b, c, d) => seg(P(a, b, z), P(c, d, z)), box = (a, b, c, d, r) => poly(rrect(a, b, c, d, r, 3).map((q) => P(q.u, q.v, z)));
    if (i === 1) return [box(8, 8, 112, 18, 3) + box(8, 22, 34, 82, 3) + box(38, 22, 112, 82, 3), ""];
    if (i === 2) return ["", ""];
    if (i === 3) {
      let lo = "";
      for (let k = 0; k < 7; k++) lo += s(14, 30 + k * 7, k % 3 === 2 ? 70 : 106, 30 + k * 7);
      return [lo, s(14, 18, 76, 18)];
    }
    if (i === 4) return [s(64, 47, 90, 47) + s(3, 15, X1 - 3, 15), ""];
    return ["", ""];
  }

  let drawn = NaN;
  function draw(gp) {
    if (gp === drawn) return;
    drawn = gp;
    for (const L of layers) {
      const z0 = zTop(L.i, gp), z1 = z0 + TH;
      put(L.plate, prism(P, front, pr, pi, z0, z1));
      const [lo, md] = marks(L.i, z1);
      L.lo.setAttribute("d", lo); L.md.setAttribute("d", md);
      L.dots.forEach((d, k) => place(d, L.i ? P(9 + k * 5.5, 8, z1) : P(14 +(k % 7) * 15.3, 14 + Math.floor(k / 7) * 15.5, z1)));
      for (const R of L.raised) put(R.el, prism(P, front, R.rg[0], R.rg[1], z1, z1 + R.r[5]));
    }
  }

  const B = register(stage, (dt) => { const m = stepS(gap, dt); draw(gap.x); return m; });
  bag.add(B.unregister);

  function retarget() {
    let pick = MARK;
    if (!scr) gap.t = GREST;
    else {
      gap.t = lerp(GMIN, gmax, clamp((scr[0] - xl) / (xr - xl), 0, 1));
      // y picks against the gap's target, never the stack on screen
      let bd = Infinity;
      for (const L of layers) {
        const d = Math.abs(P(X1 / 2, Y1 / 2, zTop(L.i, gap.t) + TH)[1] - scr[1]);
        if (d < bd) { bd = d; pick = L.i; }
      }
    }
    for (const L of layers) L.plate.sil.classList.toggle("hi", L.i === pick);
    read.textContent = scr ? `layer ${pick + 1}` : "rest";
    B.wake();
  }

  bag.add(pointer(stage, {
    move: (p) => { scr = p; retarget(); },
    leave: () => { scr = null; retarget(); },
  }));
  bag.add(() => svg.replaceChildren());
  retarget();

  return {
    set: (v) => { gmax = v; if (scr) retarget(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "layers",
  means: "A UI pulled apart into its layers: the pointer's x spreads the stack, its y picks a layer.",
  rules: [1, 4, 6, 8],
  range: [18, 27, 36],
  tour: [[285, 110], [135, 262], [210, 170], null],
  mount,
});
