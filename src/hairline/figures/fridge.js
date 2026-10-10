/**
 * Fridge: a small glass-door drinks fridge, two wire shelves of tall cans
 * inside, a vent grille along its foot. The door hangs on the left: a framed
 * glass panel with a pull handle by its free edge. The pointer's x scrubs the
 * door open on a spring, clamped to the slider's swing; the cans stay put.
 * The body is an opaque shell painted over the inside, so the cans show only
 * through the opening and the glass. At rest the door stands ajar and its
 * free edge is bright. The slider is the widest swing, in degrees.
 */
const {
  Cam, circ, clamp, facing, fit, hull, open, poly, prism, proj, rad, ringAt, rings, rrect, run,
  spring, stepS, disposer, mk, pointer, register,
} = HL;

const W = 64, D = 48, HF = 104, WT = 4, ZO = [13, HF - 6], ZD = [10, HF - 1], T = 3, REST = 25;
const R = 5.5, CH = 25, ZS = [14, 56];
/** The cans: [x, y, shelf]. One shelf full, the other with a gap and one pushed back. */
const CANS = [[11, 34, 0], [24, 36, 0], [37, 35, 0], [50, 33, 0], [36, 16, 1], [11, 35, 1], [24, 34, 1], [49, 36, 1]];
const PROF = [[0, R - 1.4], [1, R], [CH - 4, R], [CH - 1.6, R - 1.3], [CH, R - 1.2]];

/** Signed area of a screen polygon, to wind a hole against its outline. */
const area = (pts) => pts.reduce((s, p, k) => { const q = pts[(k + 1) % pts.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0);
const holed = (out, hole) => poly(out) + poly(Math.sign(area(out)) === Math.sign(area(hole)) ? hole.slice().reverse() : hole);

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let maxA = value;

  const C = Cam(45, 0.5, 2.05);
  const sw = (a, s, z) => [s * Math.cos(rad(a)) - T * Math.sin(rad(a)), D + s * Math.sin(rad(a)) + T * Math.cos(rad(a)), z];
  fit(C, [[0, 0, 0], [W, D, 0], [W, 0, 0], [0, 0, HF], sw(110, W, 0), sw(110, W, HF), sw(0, W, 0)], 200, 166);
  const P = proj(C), front = facing(C);
  const g = mk("g", {}, svg);

  // Inside, back to front: the back wall, then each shelf's wires, the cans standing on it.
  mk("path", { d: poly(rrect(WT, ZO[0], W - WT, ZO[1], 4, 5).map((q) => P(q.u, 3, q.v))), class: "nf lo" }, g);
  const can = (cx, cy, z0) => {
    const pts = [];
    for (const [z, r] of PROF) pts.push(...ringAt(P, circ(r, 20).map((q) => ({ ...q, u: q.u + cx, v: q.v + cy })), z0 + z));
    const at = (u, v) => P(cx + u, cy + v, z0 + CH - 0.4);
    mk("path", { d: poly(hull(pts)), class: "sil" }, g);
    mk("path", { d: poly(circ(R - 2.2, 20).map((q) => at(q.u, q.v))) + open(ringAt(P, run(circ(R, 20), front).map((q) => ({ ...q, u: q.u + cx, v: q.v + cy })), z0 + CH - 4)), class: "nf lo" }, g);
    mk("path", { d: poly(rrect(-1, -1.4, 3.6, 1.4, 1.3, 3).map((q) => at(q.u, q.v))), class: "nf" }, g);
  };
  ZS.forEach((zs, k) => {
    const wires = [];
    for (let x = WT + 6; x < W - WT; x += 6) wires.push(open([P(x, 4, zs), P(x, D - 2, zs)]));
    mk("path", { d: wires.join(""), class: "nf lo" }, g);
    mk("path", { d: poly(rrect(WT, 4, W - WT, D - 2, 2, 3).map((q) => P(q.u, q.v, zs))), class: "nf" }, g);
    CANS.filter((c) => c[2] === k).sort((a, b) => a[0] + a[1] - b[0] - b[1]).forEach(([x, y]) => can(x, y, zs));
  });

  // The shell: an opaque plate over everything but the opening, then its outline, the top's crease, the opening and the grille.
  const [outer, inner] = rings(0, 0, W, D, 6, 1.6);
  const shell = hull(ringAt(P, outer, 0).concat(ringAt(P, outer, HF)));
  const opening = rrect(WT, ZO[0], W - WT, ZO[1], 4, 5).map((q) => P(q.u, D, q.v));
  mk("path", { d: holed(shell, opening), class: "fo" }, g);
  const body = prism(P, front, outer, inner, 0, HF);
  mk("path", { d: body.sil, class: "nf sil" }, g);
  mk("path", { d: body.crease, class: "nf lo" }, g);
  mk("path", { d: poly(opening), class: "nf" }, g);
  mk("path", { d: [14, 26, 38, 50].map((x) => poly(rrect(x - 4.5, 3.5, x + 4.5, 6.5, 1.5, 3).map((q) => P(q.u, D, q.v)))).join(""), class: "nf lo" }, g);

  // The door: a frame round its glass, back face and front face, a handle, and its free edge. Which face is drawn last turns at 45°.
  const back = mk("path", { class: "lo" }, g), face = mk("path", { class: "sil" }, g), handle = mk("path", { class: "sil" }, g);
  const edge = mk("path", { class: "sil hi" }, g);
  const frame = rrect(0, ZD[0], W, ZD[1], 4, 5), glass = rrect(6, ZD[0] + 9, W - 7, ZD[1] - 6, 3, 5);
  const grip = rrect(ZD[0] + 34, 0, ZD[0] + 62, 4, 1.8, 4);
  const sp = spring(REST, { eps: 0.05 });
  let drawn = NaN, fwd = null;

  function draw(a) {
    const c = Math.cos(rad(a)), s = Math.sin(rad(a));
    const at = (u, z, n) => P(u * c - n * s, D + u * s + n * c, z);
    back.setAttribute("d", holed(frame.map((q) => at(q.u, q.v, 0)), glass.map((q) => at(q.u, q.v, 0))));
    face.setAttribute("d", holed(frame.map((q) => at(q.u, q.v, T)), glass.map((q) => at(q.u, q.v, T))));
    handle.setAttribute("d", poly(grip.map((q) => at(W - 3.5, q.u, T + q.v))));
    edge.setAttribute("d", poly([at(W, ZD[0] + 3, 0), at(W, ZD[1] - 3, 0), at(W, ZD[1] - 3, T), at(W, ZD[0] + 3, T)]));
    const f = a < 45;
    if (f !== fwd) {
      fwd = f;
      if (f) { back.after(face); face.after(handle); } else { back.before(face); face.before(handle); }
      g.append(edge);
      back.setAttribute("class", f ? "lo" : "sil");
      face.setAttribute("class", f ? "sil" : "lo");
    }
  }

  const B = register(stage, (dt) => {
    const m = stepS(sp, dt);
    if (sp.x !== drawn) { drawn = sp.x; draw(sp.x); }
    return m;
  });
  bag.add(B.unregister);

  // scrub: the pointer's screen x, read between where the free edge sits shut and where it sits at 90°
  const xShut = P(W, D, 0)[0], x90 = P(0, D + W, 0)[0];
  function retarget(p) {
    sp.t = p ? clamp((90 * (xShut - p[0])) / (xShut - x90), 0, maxA) : REST;
    read.textContent = p ? `door ${Math.round(sp.t)}°` : "rest";
    B.wake();
  }

  bag.add(pointer(stage, { move: retarget, leave: () => retarget(null) }));
  bag.add(() => svg.replaceChildren());
  retarget(null);

  return {
    set: (v) => { maxA = v; sp.t = Math.min(sp.t, v); B.wake(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "fridge",
  means: "A glass-door drinks fridge: the pointer's sideways reach swings the door open on its hinge, the cans waiting on the shelves.",
  rules: [3, 5, 6, 8],
  range: [60, 90, 110],
  tour: [[250, 193], [180, 193], [119, 193], null],
  mount,
});
