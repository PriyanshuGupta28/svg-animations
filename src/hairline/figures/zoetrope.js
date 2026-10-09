/**
 * Zoetrope: an open drum on a stem and a round base, its wall cut with twelve
 * slits; inside, on the far wall, twelve frames of a bouncing ball. The
 * pointer pushes the drum: entering it, or dragging round it, gives it a spin;
 * friction bleeds the spin, and when it is slow a detent spring catches it
 * with a slit square to the viewer. That slit takes the bright stroke and the
 * read-out names its frame. The slider is the coast: the friction, per second.
 *
 * The pattern: push the camera. Friction, then a spring; the hit test is the
 * drum's top plane, which never moves.
 */
const {
  Cam, circ, clamp, facing, fit, hull, open, poly, proj, prism, ringAt, rrect, run, unproj,
  spring, stepS, reducedMotion, disposer, mk, pointer, put, register, solid,
} = HL;

const K = 12, STEP = (2 * Math.PI) / K, R = 50, WT = 2.4, Z0 = 24, Z1 = 56, BR = 30, VIEW = Math.PI / 4;
const CATCH = 1.4, VMAX = 14, REST = VIEW + 2 * STEP;

const LR = (pts) => (pts[0][0] <= pts[pts.length - 1][0] ? pts : pts.slice().reverse());
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
/** The slit square to the viewer, when the drum has turned by rot. */
const facingSlit = (rot) => ((Math.round((VIEW - rot) / STEP) % K) + K) % K;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let F = value;

  const C = Cam(45, 0.5, 2.05), base = circ(BR, 48);
  fit(C, circ(R, 24).map((q) => [q.u, q.v, Z0]).concat([[0, 0, -6], [0, 0, Z1 + 10], [R, 0, Z1 + 10]]), 200, 166);
  const P = proj(C), front = facing(C);
  const outer = circ(R, 72), inner = circ(R - WT, 72);

  const g = mk("g", {}, svg);
  put(solid(g), prism(P, front, base, circ(BR - 2.2, 48), -6, 0));
  put(solid(g), prism(P, front, circ(5, 24), circ(3.8, 24), 0, Z0));
  // far half of the drum: its body, the rim's inner edge, the floor seam
  mk("path", { d: poly(hull(ringAt(P, outer, Z0).concat(ringAt(P, outer, Z1)))), class: "sil" }, g);
  mk("path", { d: poly(ringAt(P, inner, Z1)), class: "nf" }, g);
  mk("path", { d: open(ringAt(P, run(inner, (q) => !front(q)), Z0 + 2)), class: "nf lo" }, g);
  const strip = mk("path", { class: "nf lo" }, g);
  // near half: one opaque piece from the rim's inner edge down to the drum's foot
  const iF = LR(ringAt(P, run(inner, front), Z1)), oT = LR(ringAt(P, run(outer, front), Z1)), oB = LR(ringAt(P, run(outer, front), Z0));
  mk("path", { d: poly([...iF, oT[oT.length - 1], ...oB.slice().reverse(), oT[0]]), class: "fo" }, g);
  mk("path", { d: open(oT), class: "nf lo" }, g);
  mk("path", { d: open(iF), class: "nf" }, g);
  mk("path", { d: open([oT[0], ...oB, oT[oT.length - 1]]), class: "nf sil" }, g);
  const slits = [];
  for (let k = 0; k < K; k++) slits.push(mk("path", { class: "nf lo" }, g));
  // the finger peg on the rim, which the hand spins it by: painted last, it stands above everything
  const peg = solid(g), pegR = circ(3.6, 16), pegI = circ(2.4, 16);

  const slot = rrect(-1.5, Z1 - 22, 1.5, Z1 - 4, 1.5, 3), ball = circ(5, 12);
  const onWall = (a, r, s, z) => P(r * Math.cos(a + s / r), r * Math.sin(a + s / r), z);

  let rot = REST, vel = 0, sp = null, drawn = NaN, lit = -1;
  function draw() {
    if (rot === drawn) return;
    drawn = rot;
    const f = facingSlit(rot);
    let d = "";
    for (let k = 0; k < K; k++) {
      const a = rot + k * STEP, el = slits[k];
      // slits on the near wall; frames, half a step on, on the far inner wall
      el.setAttribute("d", front({ nu: Math.cos(a), nv: Math.sin(a) }) && Math.cos(wrap(a - VIEW)) > 0.2
        ? poly(slot.map((q) => onWall(a, R, q.u, q.v))) : "");
      const b = a + STEP / 2;
      if (!front({ nu: Math.cos(b), nv: Math.sin(b) })) {
        const h = Z0 + 7 + 20 * Math.abs(Math.sin(k * (Math.PI / K)));
        d += poly(ball.map((q) => onWall(b, R - WT - 0.4, q.u, h + q.v)));
      }
    }
    strip.setAttribute("d", d);
    const pa = rot + STEP / 2, at = (r) => r.map((q) => ({ ...q, u: q.u + (R - WT / 2) * Math.cos(pa), v: q.v + (R - WT / 2) * Math.sin(pa) }));
    put(peg, prism(P, front, at(pegR), at(pegI), Z1, Z1 + 8));
    if (f !== lit) {
      if (lit >= 0) slits[lit].classList.replace("hi", "lo");
      slits[f].classList.replace("lo", "hi");
      lit = f;
    }
  }

  let over = false;
  const name = () => (read.textContent = over ? `frame ${String(facingSlit(rot) + 1).padStart(2, "0")}` : "rest");

  /** A spring onto the next detent in the direction of travel. */
  function catchIt(ahead) {
    const n = (rot - VIEW) / STEP;
    sp = spring(rot);
    sp.t = VIEW + STEP * (vel > 0 ? Math.ceil(n + ahead) : vel < 0 ? Math.floor(n - ahead) : Math.round(n));
    vel = 0;
  }

  const B = register(stage, (dt) => {
    let m = false;
    if (vel !== 0) {
      // reduced motion: land where the coast would have ended
      if (reducedMotion()) { rot += vel / F; catchIt(0); }
      else {
        rot += vel * dt;
        vel *= Math.exp(-F * dt);
        if (Math.abs(vel) < CATCH) catchIt(0.15);
      }
      m = true;
    }
    if (sp) { m = stepS(sp, dt) || m; rot = sp.x; if (!m) sp = null; }
    draw();
    if (over) name();
    return m;
  });
  bag.add(B.unregister);

  /** A push: added to the spin, clamped. */
  function push(dv) {
    sp = null;
    vel = clamp(vel + dv, -VMAX, VMAX);
    B.wake();
  }

  // The pointer meets the drum's top plane, which never moves.
  let prev = null;
  bag.add(pointer(stage, {
    move: (p) => {
      const [u, v] = unproj(C, p[0], p[1], Z1), a = Math.atan2(v, u);
      over = Math.hypot(u, v) < R + 14;
      if (!over) { prev = null; name(); return; }
      // entering pushes the near wall sideways; dragging round the rim pushes along it
      push(prev === null ? 12 * clamp((u - v) / (R * 1.4), -1, 1) : 12 * wrap(a - prev));
      prev = a;
      name();
    },
    leave: () => { over = false; prev = null; name(); },
  }));
  bag.add(() => svg.replaceChildren());
  draw();
  name();

  return {
    set: (v) => { F = v; },
    destroy: bag.dispose,
  };
}

hairline({
  name: "zoetrope",
  means: "A zoetrope you push round: friction bleeds the spin and a detent stops it with one frame facing you.",
  rules: [1, 3, 5, 8],
  range: [3.2, 1.6, 0.7],
  tour: [[124, 150], [200, 186], [280, 150], null],
  mount,
});
