/**
 * Carlift: a sports car on a two-post workshop lift. Two columns stand either
 * side of it, each with a carriage and two arms swung under the sills to round
 * pads. The pointer's height raises the car on a spring, clamped to the
 * slider's highest; the carriages, the arms and a dashed drop under each front
 * pad ride with it. At rest the car sits a little off the floor, the pads
 * bright. The slider is the lift's highest, in metres.
 */
const {
  Cam, clamp, facing, fillet, fit, hull, lerp, open, poly, prism, proj, rings, rrect, run, seg,
  spring, stepS, disposer, mk, pointer, put, register, solid,
} = HL;

/** World units per metre; the car's length, half width, wheel radius and axles; the roof, the column's place, size and height; the rest lift. */
const M = 22, L = 98, HW = 19, WR = 7.4, AX = [17, 80], ZR = 26;
const XC = 47, YC = HW + 9, CS = 4, CH = 64, REST = 8, Y_LO = 250, Y_HI = 80;
const PADS = [[XC - 24, HW - 1.5], [XC + 22, HW - 1.5]];

/** The body's top line along its length: a high tail, the belt, and the hood falling to the nose. */
const zt = (u) => (u < 68 ? lerp(17.5, 16, u / 68) : lerp(16, 10.5, (u - 68) / (L - 68)));

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let top = value * M;
  const C = Cam(45, 0.5, 1.86);
  fit(C, [[-6, -YC - 9, -3], [L + 6, YC + 9, -3], [L + 6, -YC - 9, -3], [-6, YC + 9, -3], [XC, -YC, CH], [XC, YC, CH], [0, 0, ZR + 1.8 * M]], 200, 166);
  const P = proj(C), front = facing(C);
  const sp = spring(REST, { eps: 0.03 });

  const g = mk("g", {}, svg);
  // the workshop floor
  { const [r, i] = rings(-6, -YC - 9, L + 6, YC + 9, 10, 2); put(solid(g), prism(P, front, r, i, -3, 0)); }

  /** A column on its base plate: side -1 is the far one, painted before the car, 1 the near one, after it. */
  const column = (sg) => {
    const cg = mk("g", {}, g), yc = sg * YC;
    { const [r, i] = rings(XC - 8, yc - 7, XC + 8, yc + 7, 3, 1); put(solid(cg), prism(P, front, r, i, 0, 1.6)); }
    const carriage = solid(cg);
    { const [r, i] = rings(XC - CS, yc - CS, XC + CS, yc + CS, 2, 1); put(solid(cg), prism(P, front, r, i, 1.6, CH)); }
    if (sg < 0) cg.append(carriage.g);
    return { cg, carriage, sg };
  };
  /** The arms of one column, from its carriage to the two pads under that sill, each a plate with its thickness line, then the pads. */
  const armsOf = (sg) => ({
    sg, guide: mk("path", { class: "dash nf" }, g),
    arms: PADS.map(() => ({ under: mk("path", { class: "lo" }, g), face: mk("path", { class: "sil" }, g) })),
    pads: PADS.map(() => { const s = solid(g); s.sil.classList.add("hi"); return s; }),
  });
  const cols = [column(-1)], arms = [armsOf(-1), armsOf(1)];

  // the car: far tyres, body, arches, cabin with windscreen and side window, headlights, near wheels
  const tyre = () => ({ sil: mk("path", { class: "sil" }, g), rim: mk("path", { class: "nf" }, g), spokes: mk("path", { class: "nf lo" }, g) });
  const farW = AX.map(tyre), body = solid(g), arch = mk("path", { class: "nf lo" }, g), cabin = solid(g);
  const glass = mk("path", { class: "nf lo" }, g), lamps = mk("path", { class: "nf" }, g), nearW = AX.map(tyre);
  cols.push(column(1));

  const foot = rrect(0, -HW, L, HW, 9, 5), bTop = rrect(2, -HW + 1.5, L - 2, HW - 1.5, 8, 5), bIn = rrect(3.5, -HW + 3, L - 3.5, HW - 3, 6.5, 5);
  const cFoot = rrect(24, -HW + 2.5, 70, HW - 2.5, 6, 5), cTop = rrect(38, -HW + 5.5, 54, HW - 5.5, 5, 5), cIn = rrect(39.5, -HW + 7, 52.5, HW - 7, 3.5, 5);
  const circle = (cx, y, cz, r) => Array.from({ length: 24 }, (_, k) => [cx + r * Math.cos(k * Math.PI / 12), y, cz + r * Math.sin(k * Math.PI / 12)]);

  function drawCar(d) {
    const W = (x, y, z) => P(x, y, z + d), at = (pts) => pts.map((p) => W(...p));
    const wheel = (w, cx, yo, yi) => {
      w.sil.setAttribute("d", poly(hull(at(circle(cx, yo, WR, WR).concat(circle(cx, yi, WR, WR))))));
      w.rim.setAttribute("d", poly(at(circle(cx, yo, WR, WR * 0.62))));
      w.spokes.setAttribute("d", [0, 1, 2, 3, 4].map((k) => { const a = k * 1.2566 + 0.3; return seg(W(cx + 1.4 * Math.cos(a), yo, WR + 1.4 * Math.sin(a)), W(cx + 4.8 * Math.cos(a), yo, WR + 4.8 * Math.sin(a))); }).join(""));
    };
    AX.forEach((cx, k) => wheel(farW[k], cx, -HW + 0.5, -HW + 6));
    put(body, { sil: poly(hull(foot.map((q) => W(q.u, q.v, 4)).concat(bTop.map((q) => W(q.u, q.v, zt(q.u)))))), crease: open(run(bIn, front).map((q) => W(q.u, q.v, zt(q.u)))) });
    arch.setAttribute("d", AX.map((cx) => open(at(circle(cx, HW, WR, WR + 2).filter((p) => p[2] > WR - 2.5)))).join(""));
    put(cabin, { sil: poly(hull(cFoot.map((q) => W(q.u, q.v, zt(q.u))).concat(cTop.map((q) => W(q.u, q.v, ZR))))), crease: open(run(cIn, front).map((q) => W(q.u, q.v, ZR))) });
    // the windscreen on the cabin's sloped front, the side window on its near flank
    const ws = fillet([[-14, 0], [-11.5, 16], [11.5, 16], [14, 0]], [1.5, 1.5, 1.5, 1.5], 3).map(([y, t]) => [lerp(68, 54.6, t / 16), y, lerp(17.2, ZR - 0.8, t / 16)]);
    const yz = (z) => lerp(HW - 2.5, HW - 5.5, (z - 16.3) / (ZR - 16.3)) + 0.05;
    const sw = [[30, 18.4], [64, 18.4], [55.4, 24.6], [40, 24.6]];
    glass.setAttribute("d", poly(ws.map((p) => W(...p))) + poly(fillet(sw, [1.5, 2.5, 1.5, 3], 3).map(([u, z]) => W(u, yz(z), z))));
    lamps.setAttribute("d", [-1, 1].map((s) => poly(fillet([[-3.5, 8.6], [3.5, 9.4], [3.5, 10.6], [-3.5, 9.9]], [1, 0.6, 0.6, 1], 3).map(([y, z]) => W(L - 1.4 * (z - 4) / 7 + 0.2, s * (HW - 6.5) + y, z)))).join(""));
    AX.forEach((cx, k) => wheel(nearW[k], cx, HW + 0.4, HW - 5.5));
  }

  function drawLift(d) {
    const zc = d + 4 - 2.2;
    for (const c of cols) {
      const yi = c.sg * (YC - CS), ya = yi - c.sg * 2.6, yb = yi + c.sg * 0.3;
      const [r, i] = rings(XC - 7, Math.min(ya, yb), XC + 7, Math.max(ya, yb), 1.4, 0.6);
      put(c.carriage, prism(P, front, r, i, zc - 7, zc + 3));
    }
    for (const a of arms) {
      const y0 = a.sg * (YC - CS - 1);
      a.guide.setAttribute("d", seg(P(PADS[1][0], a.sg * PADS[1][1], 0), P(PADS[1][0], a.sg * PADS[1][1], zc)));
      PADS.forEach(([px, py], k) => {
        const y1 = a.sg * py, dx = px - XC, dy = y1 - y0, n = Math.hypot(dx, dy), ox = (-dy / n) * 1.6, oy = (dx / n) * 1.6;
        const q = fillet([[XC + ox, y0 + oy], [px + ox, y1 + oy], [px - ox, y1 - oy], [XC - ox, y0 - oy]], [1, 1, 1, 1], 2);
        a.arms[k].under.setAttribute("d", poly(q.map(([x, y]) => P(x, y, zc - 1.4))));
        a.arms[k].face.classList.add("hi");
        a.arms[k].face.setAttribute("d", poly(q.map(([x, y]) => P(x, y, zc))));
        const [r, i] = rings(px - 2.8, y1 - 2.8, px + 2.8, y1 + 2.8, 2.8, 0.8);
        put(a.pads[k], prism(P, front, r, i, zc, zc + 2.2));
      });
    }
  }

  let drawn = NaN;
  const B = register(stage, (dt) => {
    const m = stepS(sp, dt);
    if (sp.x !== drawn) { drawn = sp.x; drawLift(sp.x); drawCar(sp.x); }
    return m;
  });
  bag.add(B.unregister);

  let over = null;
  function retarget() {
    sp.t = over === null ? REST : clamp(((Y_LO - over) / (Y_LO - Y_HI)) * top, 0, top);
    read.textContent = over === null ? "rest" : `lift ${(sp.t / M).toFixed(1)} m`;
    B.wake();
  }

  bag.add(pointer(stage, { move: (p) => { over = p[1]; retarget(); }, leave: () => { over = null; retarget(); } }));
  bag.add(() => svg.replaceChildren());
  retarget();

  return {
    set: (v) => { top = v * M; retarget(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "carlift",
  means: "A sports car on a two-post lift: the pointer's height raises it, the arms and carriages riding up the columns with it.",
  rules: [1, 3, 5, 6],
  range: [1.2, 1.5, 1.8],
  tour: [[197, 146], [200, 90], [200, 230], null],
  mount,
});
