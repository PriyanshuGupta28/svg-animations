/**
 * Trophy: a championship cup on a turntable plinth. A tapered bowl on a knotted
 * stem, two handles, a stepped square base with a plate on its front. The
 * pointer pushes the platter round, so the plate turns to the pointer, on a
 * spring. Let go, the spin coasts on and friction bleeds it, then a detent
 * catches the nearest of four faces. The slider is the coast, in seconds.
 */
const {
  Cam, circ, clamp, facing, fit, hull, open, poly, prism, proj, rad, ringAt, rrect, run, unproj,
  spring, stepS, reducedMotion, disposer, mk, flatDot, place, pointer, put, register, solid,
} = HL;

const RP = 54, ZP = 9, ZT = ZP + 4, STEPS = [[19, 0, 6], [14, 6, 11], [9.5, 11, 15]], BOWL = [[6, 56], [15, 66], [19.5, 78], [21, 94]];
const VIEW = 45, FRONT = 22; // VIEW faces the viewer; the detents sit at FRONT + 90k, a three-quarter turn off it
const HANDLE = Array.from({ length: 13 }, (_, k) => 110 - k * 18.3).map((t) => [20 + 9 * Math.cos(rad(t)), 80 + 10 * Math.sin(rad(t))]);

/** A ring turned th degrees about the axis: positions and normals both. */
function turn(ring, th) {
  const c = Math.cos(rad(th)), s = Math.sin(rad(th));
  return ring.map((q) => ({ u: q.u * c - q.v * s, v: q.u * s + q.v * c, nu: q.nu * c - q.nv * s, nv: q.nu * s + q.nv * c }));
}
const wrap = (d) => ((((d + 180) % 360) + 360) % 360) - 180;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let coast = value;

  const C = Cam(45, 0.5, 1.72);
  fit(C, [[-RP, -RP, 0], [RP, RP, 0], [RP, -RP, 0], [-RP, RP, 0], [0, 0, ZT + BOWL[3][1]]], 200, 166);
  const P = proj(C), front = facing(C);
  const at = (r, phi, z) => P(r * Math.cos(rad(phi)), r * Math.sin(rad(phi)), z);

  const g = mk("g", {}, svg);
  put(solid(g), prism(P, front, circ(RP, 64), circ(RP - 2.2, 64), 0, ZP));
  const ticks = [0, 1, 2, 3].map((k) => { const d = flatDot(g, C, 1.3, "dot off"); place(d, at(RP - 4.5, FRONT + 90 * k, ZP)); return d; });
  put(solid(g), prism(P, front, circ(RP - 9, 64), circ(RP - 11, 64), ZP, ZT));
  const notch = flatDot(g, C, 1, "dot m");
  const steps = STEPS.map(() => solid(g)), plate = mk("path", { class: "nf" }, g);
  const stem = solid(g), knot = solid(g);
  put(stem, prism(P, front, circ(3, 16), circ(2.2, 16), ZT + 15, ZT + BOWL[0][1]));
  put(knot, prism(P, front, circ(5.5, 20), circ(4.3, 20), ZT + 28, ZT + 32));
  const handles = [mk("path", {}, g), mk("path", {}, g)];
  const bowl = mk("path", { class: "sil" }, g), mouth = mk("path", { class: "nf" }, g), lip = mk("path", { class: "nf lo" }, g);
  {
    const rs = BOWL.map(([r, z]) => ringAt(P, circ(r, 48), ZT + z)).flat();
    bowl.setAttribute("d", poly(hull(rs)));
    mouth.setAttribute("d", poly(ringAt(P, circ(BOWL[3][0], 48), ZT + BOWL[3][1])));
    lip.setAttribute("d", open(ringAt(P, run(circ(BOWL[3][0] - 2, 48), (q) => !front(q)), ZT + BOWL[3][1] - 1.5)));
  }

  let th = FRONT, om = 0, mode = "rest", drawn = NaN, sp = spring(FRONT);

  function draw() {
    if (th === drawn) return;
    drawn = th;
    STEPS.forEach(([h, z0, z1], k) => {
      const o = rrect(-h, -h, h, h, 3, 4), i = rrect(-h + 1.2, -h + 1.2, h - 1.2, h - 1.2, 1.8, 4);
      put(steps[k], prism(P, front, turn(o, th), turn(i, th), ZT + z0, ZT + z1));
    });
    // the plate: set into the front face of the bottom step
    const c = Math.cos(rad(th)), s = Math.sin(rad(th)), f = (t, z) => P(19 * c - t * s, 19 * s + t * c, ZT + z);
    plate.setAttribute("d", Math.cos(rad(th - VIEW)) > 0.15 ? poly([f(-9, 1.6), f(9, 1.6), f(9, 4.4), f(-9, 4.4)]) : "");
    place(notch, at(RP - 13, th, ZT));
    // two handles, each painted behind the bowl or in front of it by which side it is on
    [90, -90].forEach((d, k) => {
      const phi = th + d, near = Math.cos(rad(phi - VIEW)) > 0;
      const out = HANDLE.map(([r, z]) => at(r, phi, ZT + z)), inn = HANDLE.map(([r, z]) => at(r - 2.6, phi, ZT + z));
      handles[k].setAttribute("d", poly(out.concat(inn.reverse())));
      if (near) mouth.after(handles[k]); else bowl.before(handles[k]);
    });
  }

  const face = (a) => ((Math.round(wrap(a - FRONT) / 90) % 4) + 4) % 4;
  const B = register(stage, (dt) => {
    const was = th;
    if (mode === "push" || mode === "catch") {
      const m = stepS(sp, dt);
      th = sp.x;
      om = dt > 0 ? (th - was) / dt : 0;
      if (!m && mode === "catch") mode = "rest";
    } else if (mode === "coast") {
      om *= Math.exp(-dt / coast);
      th += om * dt;
      if (Math.abs(om) < 40 || reducedMotion()) {
        mode = "catch"; sp = spring(th); sp.t = th + wrap(FRONT + face(th) * 90 - th);
      }
    }
    draw();
    return mode !== "rest";
  });
  bag.add(B.unregister);

  /** Where the pointer is round the axis, on the platter's top, which never moves; null off the plinth. */
  function aim(p) {
    const [u, v] = unproj(C, p[0], p[1], ZT), d = Math.hypot(u, v);
    return d > RP + 12 ? null : (Math.atan2(v, u) * 180) / Math.PI;
  }

  function lightFace(k) {
    ticks.forEach((d, i) => d.setAttribute("class", i === k ? "dot" : "dot off"));
    plate.classList.toggle("hi", k < 0);
  }

  function move(p) {
    const phi = aim(p);
    if (phi === null) return leave();
    if (mode !== "push") { sp = spring(th); mode = "push"; }
    sp.t = th + wrap(phi - th);
    const k = face(sp.t);
    lightFace(k);
    read.textContent = `face ${k + 1}`;
    B.wake();
  }
  function leave() {
    if (mode === "push") mode = "coast";
    lightFace(-1);
    read.textContent = "rest";
    B.wake();
  }

  bag.add(pointer(stage, { move, leave }));
  bag.add(() => svg.replaceChildren());
  lightFace(-1);
  draw();

  return {
    set: (v) => { coast = clamp(v, 0.1, 3); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "trophy",
  means: "A trophy on a turntable: the pointer pushes it round, friction bleeds the spin, and a detent catches it on a face.",
  rules: [3, 5, 6, 8],
  range: [0.25, 0.6, 1.2],
  tour: [[271, 212], [127, 181], [200, 240], null],
  mount,
});
