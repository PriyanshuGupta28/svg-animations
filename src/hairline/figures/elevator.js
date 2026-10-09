/**
 * Elevator: a building cut open, four levels of a stack: a basement of
 * database drums, a floor of service racks, a floor with a patch panel of API
 * ports, and a rooftop with a screen on legs. Beside it an open shaft of four
 * posts holds the car on its cable. The pointer's height calls the car to a
 * floor, read from static bands of the building; the car travels on a spring,
 * and when it lands its doors slide open on the 700ms tween. The slider is
 * the motor: the spring's stiffness, damped in proportion, so the car's
 * travel time is what changes.
 */
const {
  Cam, circ, clamp, facing, fit, open, poly, prism, proj, ringAt, rings, rrect, run, seg,
  spring, stepS, tween, tset, tval, tdone, disposer, mk, place, pointer, put, register, solid,
} = HL;

const H = 30, SL = 3, BX = 84, BY = 30, TOPZ = 4 * H + 2, REST = 1, CH = 24;
const SX0 = 88, SX1 = 118, SY0 = 0, SY1 = 30, CX0 = 92, CX1 = 114, CY0 = 9, CY1 = 27;
const damp = (k) => 1.8 * Math.sqrt(k);

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  const C = Cam(45, 0.5, 1.82);
  fit(C, [[0, 0, 0], [SX1, SY1, 0], [SX1, 0, 0], [0, BY, 0], [0, 0, TOPZ + 4], [SX1, 0, TOPZ + 4]], 200, 166);
  const P = proj(C), front = facing(C);
  const g = mk("g", {}, svg);
  const box = (x0, y0, x1, y1, r, b, z0, z1, cls) => {
    const el = solid(g), [o, i] = rings(x0, y0, x1, y1, r, b);
    put(el, prism(P, front, o, i, z0, z1));
    if (cls) el.sil.classList.add(cls);
    return el;
  };
  const line = (d) => mk("path", { d, class: "nf lo" }, g);
  const onY = (ring, y) => poly(ring.map((q) => P(q.u, y, q.v)));

  // The building, floor by floor from the basement up: slab, the walls of the cut, then what the floor holds.
  const slabs = [];
  for (let f = 0; f < 4; f++) {
    const z = f * H;
    slabs.push(box(0, 0, BX, BY, 3, 1.4, z, z + SL));
    if (f < 3) { box(0, 0, BX, 2, 1, 0.5, z + SL, z + H); box(0, 0, 2, BY, 1, 0.5, z + SL, z + H); }
    const z0 = z + SL;
    if (f === 0) for (const x of [18, 36, 54]) {
      const mv = (r) => circ(r, 32).map((q) => ({ ...q, u: q.u + x, v: q.v + 15 })), o = mv(7);
      put(solid(g), prism(P, front, o, mv(5.8), z0, z0 + 15));
      line([5, 10].map((k) => open(ringAt(P, run(o, front), z0 + k))).join(""));
    }
    if (f === 1) for (const x of [12, 32, 52]) {
      box(x, 6, x + 13, 18, 1.6, 0.8, z0, z0 + 21);
      line([5, 9, 13].map((k) => seg(P(x + 2.5, 18, z0 + k), P(x + 10.5, 18, z0 + k))).join(""));
    }
    if (f === 2) {
      box(10, 10, 72, 17, 2, 0.9, z0, z0 + 10);
      for (let k = 0; k < 8; k++) place(mk("circle", { r: 1.2, class: "dot off" }, g), P(15 + k * 7.4, 17, z0 + 5));
    }
    if (f === 3) {
      for (const x of [22, 58]) box(x - 1.5, 11.5, x + 1.5, 14.5, 1.4, 0.5, z0, z0 + 12);
      box(12, 12, 68, 14, 1, 0.5, z0 + 10, z0 + 32);
      line([16, 21, 26].map((k) => seg(P(17, 14, z0 + k), P(k === 26 ? 44 : 63, 14, z0 + k))).join(""));
    }
  }

  // The shaft: a pit, three posts behind the car, the car on its cable, the near post, the cap.
  box(SX0, SY0, SX1, SY1, 3, 1.2, -SL, 0);
  for (const [x, y] of [[SX0 + 1.5, SY0 + 1.5], [SX1 - 1.5, SY0 + 1.5], [SX0 + 1.5, SY1 - 1.5]]) box(x - 1.5, y - 1.5, x + 1.5, y + 1.5, 1.5, 0.5, 0, TOPZ);
  // the counterweight rides the back of the shaft, opposite the car
  const cw = solid(g), cwc = mk("path", { class: "nf lo" }, g), [wo, wi] = rings(97, 1.5, 109, 6, 1.5, 0.7);
  const car = solid(g), [co, ci] = rings(CX0, CY0, CX1, CY1, 2, 1);
  const frame = mk("path", { class: "nf lo" }, g), doors = mk("path", { class: "nf" }, g), cable = mk("path", { class: "nf lo" }, g);
  box(SX1 - 3, SY1 - 3, SX1, SY1, 1.5, 0.5, 0, TOPZ);
  box(SX0, SY0, SX1, SY1, 3, 1.2, TOPZ, TOPZ + 4);

  const sp = spring(REST * H + SL, { k: value, c: damp(value) }), door = tween(1);
  let drawn = "";
  function draw(z, o) {
    const key = z.toFixed(2) + "," + o.toFixed(3);
    if (key === drawn) return;
    drawn = key;
    put(car, prism(P, front, co, ci, z, z + CH));
    const wz = 3 * H + 2 * SL - z;
    put(cw, prism(P, front, wo, wi, wz, wz + 16));
    cwc.setAttribute("d", seg(P(103, 3.7, wz + 16), P(103, 3.7, TOPZ)));
    frame.setAttribute("d", onY(rrect(CX0 + 3, z + 2, CX1 - 3, z + 20, 1.2, 3), CY1));
    const m = (CX0 + CX1) / 2, w = (m - CX0 - 3) * 0.85 * o;
    doors.setAttribute("d", onY(rrect(CX0 + 3, z + 2, m - w, z + 20, 0.8, 2), CY1) + onY(rrect(m + w, z + 2, CX1 - 3, z + 20, 0.8, 2), CY1));
    cable.setAttribute("d", seg(P(m, (CY0 + CY1) / 2, z + CH), P(m, (CY0 + CY1) / 2, TOPZ)));
  }

  const B = register(stage, (dt, now) => {
    const m = stepS(sp, dt);
    // the doors open only once the car has landed, and shut as soon as it is called away
    tset(door, Math.abs(sp.x - sp.t) < 0.4 && Math.abs(sp.v) < 2 ? 1 : 0, now, 0);
    draw(sp.x, clamp(tval(door, now), 0, 1));
    return m || !tdone(door, now);
  });
  bag.add(B.unregister);

  // Hit bands: the pointer's height against each floor's middle on the building's front. They never move.
  const mids = [0, 1, 2, 3].map((f) => P(BX / 2, BY, f * H + H / 2)[1]);
  const xl = P(0, BY, 0)[0] - 10, xr = P(SX1, 0, 0)[0] + 10, yT = P(0, 0, TOPZ)[1] - 10, yB = P(BX, BY, 0)[1] + 10;
  function hit([x, y]) {
    if (x < xl || x > xr || y < yT || y > yB) return -1;
    let best = 0;
    mids.forEach((v, f) => { if (Math.abs(y - v) < Math.abs(y - mids[best])) best = f; });
    return best;
  }

  let act = null;
  function call(f) {
    if (f === act) return;
    act = f;
    sp.t = (f < 0 ? REST : f) * H + SL;
    slabs.forEach((s, i) => s.sil.classList.toggle("hi", i === f));
    car.sil.classList.toggle("hi", f < 0);
    read.textContent = f < 0 ? "rest" : "floor " + f;
    B.wake();
  }

  bag.add(pointer(stage, { move: (p) => call(hit(p)), leave: () => call(-1) }));
  bag.add(() => svg.replaceChildren());
  call(-1);

  return {
    set: (v) => { sp.k = v; sp.c = damp(v); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "elevator",
  means: "A building cut open, database to rooftop UI: the pointer's height calls the car to a floor, and its doors open there.",
  rules: [1, 3, 5, 8],
  range: [40, 100, 220],
  tour: [[159, 99], [159, 240], [159, 146], null],
  mount,
});
