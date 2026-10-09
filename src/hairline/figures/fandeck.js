/**
 * Fandeck: a designer's swatch fan lying half open on the desk. Nine long
 * strips, each ruled into six chips, stacked and pinned through one end by a
 * rivet. The pointer picks a strip by its resting angle round the rivet; the
 * strips above it swing on past it and the ones below gather in behind, so
 * the chosen strip lies open, staggered outwards from it on the 700ms lift
 * curve. At rest the rivet is bright. The slider is the stagger, in ms.
 */
const {
  Cam, clamp, facing, fit, prism, proj, rad, rrect, seg, unproj,
  tween, tset, tval, tdone, disposer, mk, pointer, put, register, solid,
} = HL;

const N = 9, L = 112, W = 22, T = 1.4, CHIPS = 6, GAP = 17, TIGHT = 4;
const HEAD = 15; // the strip's end beyond the rivet, where the hole is
/** Resting angles, in degrees round the rivet: half open, and opening a little faster towards the top. */
const REST = Array.from({ length: N }, (_, i) => 6 + 76 * (i / (N - 1)) ** 1.2);

/** A ring turned by th degrees about the rivet: positions and normals both. */
function turn(ring, th) {
  const c = Math.cos(rad(th)), s = Math.sin(rad(th));
  return ring.map((q) => ({ u: q.u * c - q.v * s, v: q.u * s + q.v * c, nu: q.nu * c - q.nv * s, nv: q.nu * s + q.nv * c }));
}

/** Where strip i lies when strip a is chosen (-1: everyone at rest). */
function angle(i, a) {
  if (a < 0 || i === a) return REST[i];
  return i < a ? REST[a] - GAP - (a - 1 - i) * TIGHT : REST[a] + GAP + (i - a - 1) * TIGHT;
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;

  // Fitted to every angle a strip can reach, so no pick leaves the frame.
  const C = Cam(45, 0.5, 1.95), arc = [];
  for (let th = -5; th <= 95; th += 5) {
    const c = Math.cos(rad(th)), s = Math.sin(rad(th));
    arc.push([L * c, L * s, 0], [(L + W / 2) * c - (W / 2) * s, (L + W / 2) * s + (W / 2) * c, 0]);
  }
  arc.push([-HEAD, -HEAD, 0], [0, 0, N * T + 2.2]);
  fit(C, arc, 200, 170);
  const P = proj(C), front = facing(C);
  const outer = rrect(-HEAD, -W / 2, L, W / 2, 5, 4), inner = rrect(-HEAD + 1.2, -W / 2 + 1.2, L - 1.2, W / 2 - 1.2, 3.8, 4);

  const g = mk("g", {}, svg), strips = [];
  // Bottom of the stack first: each strip lies on the one before it.
  for (let i = 0; i < N; i++) {
    const el = solid(g), chips = mk("path", { class: "nf lo" }, el.g);
    strips.push({ i, el, chips, th: tween(REST[i]), drawn: NaN, z0: i * T });
  }
  const pin = solid(g);
  {
    const ring = rrect(-6, -6, 6, 6, 6, 6), cap = rrect(-4.6, -4.6, 4.6, 4.6, 4.6, 6);
    put(pin, prism(P, front, ring, cap, N * T, N * T + 2.2));
  }

  function draw(s, th) {
    if (th === s.drawn) return;
    s.drawn = th;
    const z1 = s.z0 + T, c = Math.cos(rad(th)), sn = Math.sin(rad(th));
    put(s.el, prism(P, front, turn(outer, th), turn(inner, th), s.z0, z1));
    const at = (u, v) => P(u * c - v * sn, u * sn + v * c, z1);
    let d = "";
    for (let k = 1; k < CHIPS; k++) {
      const u = 14 + ((L - 16) * k) / CHIPS;
      d += seg(at(u, -W / 2 + 2.5), at(u, W / 2 - 2.5));
    }
    s.chips.setAttribute("d", d);
  }

  const B = register(stage, (_dt, now) => {
    let m = false;
    for (const s of strips) { draw(s, tval(s.th, now)); if (!tdone(s.th, now)) m = true; }
    return m;
  });
  bag.add(B.unregister);

  /** The strip whose resting angle is nearest the pointer, on the stack's middle plane; -1 off the fan. */
  function hit(p) {
    const [u, v] = unproj(C, p[0], p[1], (N * T) / 2), d = Math.hypot(u, v);
    const phi = (Math.atan2(v, u) * 180) / Math.PI;
    if (d < 12 || d > L + 10 || phi < REST[0] - 12 || phi > REST[N - 1] + 12) return -1;
    let best = 0;
    for (let i = 1; i < N; i++) if (Math.abs(REST[i] - phi) < Math.abs(REST[best] - phi)) best = i;
    return best;
  }

  let act = null;
  function setActive(a) {
    if (a === act) return;
    const now = performance.now(), from = a >= 0 ? a : act ?? 0;
    act = a;
    for (const s of strips) {
      tset(s.th, clamp(angle(s.i, a), -5, 95), now, Math.abs(s.i - from) * stag);
      s.el.sil.classList.toggle("hi", s.i === a);
    }
    pin.sil.classList.toggle("hi", a < 0);
    read.textContent = a < 0 ? "rest" : `strip ${String(a + 1).padStart(2, "0")}`;
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
  name: "fandeck",
  means: "A swatch fan pinned at one end: the strip under the pointer lies open as the others swing aside.",
  rules: [1, 2, 6, 8],
  range: [0, 40, 90],
  tour: [[300, 196], [230, 189], [112, 184], null],
  mount,
});
