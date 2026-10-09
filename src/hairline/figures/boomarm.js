/**
 * Boomarm: a podcast mic on a boom arm clamped to the corner of a desk. Two
 * arm segments, each with its spring alongside, meet at an elbow hub; from the
 * tip hangs a shock-mount ring holding a capsule mic, its grille ringed with
 * lines, and a pop filter disc in front on a gooseneck. The pointer, read on
 * the desk, is where the speaker sits: the arm swings to it and reaches out
 * (two-link IK, clamped), and the mic tilts down to aim at it, all on springs.
 * At rest the pop filter is bright. The slider is the reach: how far the arm
 * may extend.
 */
const {
  Cam, clamp, fit, hull, open, poly, prism, proj, rad, rings, circ, unproj, spring, stepS, facing,
  mk, pointer, put, register, disposer, solid,
} = HL;

const BX = 4, BY = 100, ZS = 22, ZT = 40, L1 = 46, L2 = 46, DROP = 9, RING = 10;
const REST = -24, MOUTH = 16;
const V = [0.612, 0.612, 0.5];
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const add = (o, d, t) => [o[0] + d[0] * t, o[1] + d[1] * t, o[2] + d[2] * t];
function frame(d) {
  const h = Math.hypot(d[0], d[1]), e1 = h > 1e-6 ? [-d[1] / h, d[0] / h, 0] : [1, 0, 0];
  return [e1, [d[1] * e1[2] - d[2] * e1[1], d[2] * e1[0] - d[0] * e1[2], d[0] * e1[1] - d[1] * e1[0]]];
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let reach = value;
  const C = Cam(45, 0.5, 1.72);
  fit(C, [[-8, 4, -7], [100, 112, -7], [100, 4, -7], [-8, 112, -7], [BX, BY, 72], [BX + 40, BY, 72], [BX + 108, BY - 24, 22], [BX + 26, BY - 104, 22]], 200, 168);
  const P = proj(C), front = facing(C);
  const Pw = (p) => P(p[0], p[1], p[2]);
  /** A ring round axis d through o, at t along it, radius r, from angle a0 over span degrees. */
  const loop = (o, d, t, r, a0 = 0, span = 360, n = 22) => {
    const [e1, e2] = frame(d);
    return Array.from({ length: n + (span < 360 ? 1 : 0) }, (_, k) => {
      const a = rad(a0 + (span * k) / n), c = Math.cos(a) * r, s = Math.sin(a) * r;
      return Pw([o[0] + d[0] * t + e1[0] * c + e2[0] * s, o[1] + d[1] * t + e1[1] * c + e2[1] * s, o[2] + d[2] * t + e1[2] * c + e2[2] * s]);
    });
  };
  const facingA = (d) => { const [e1, e2] = frame(d); return (Math.atan2(dot3(e2, V), dot3(e1, V)) * 180) / Math.PI; };
  /** The near (or far) half of a ring, as an open line. */
  const half = (o, d, t, r, far) => open(loop(o, d, t, r, facingA(d) - 90 + (far ? 180 : 0), 180, 12));
  /** A cylinder from a to b, radius r: its hull, and the end facing the viewer as crease. */
  const tube = (a, b, r, b2 = 0) => {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), d = [(b[0] - a[0]) / L, (b[1] - a[1]) / L, (b[2] - a[2]) / L];
    return { sil: poly(hull(loop(a, d, 0, r, 0, 360, 16).concat(loop(a, d, L, r, 0, 360, 16)))), crease: b2 ? poly(loop(a, d, dot3(d, V) > 0 ? L : 0, r - b2, 0, 360, 16)) : "" };
  };

  const g = mk("g", {}, svg);
  const [dO, dI] = rings(-8, 4, 100, 112, 7, 2);
  put(solid(g), prism(P, front, dO, dI, -7, 0));
  const [cO, cI] = rings(BX - 9, BY - 9, BX + 9, BY + 9, 3, 1.2);
  put(solid(g), prism(P, front, cO, cI, 0, 6));
  put(solid(g), prism(P, front, circ(2.6, 16).map((q) => ({ ...q, u: q.u + BX, v: q.v + BY })), circ(1.6, 16).map((q) => ({ ...q, u: q.u + BX, v: q.v + BY })), 6, ZS));
  const S = {};
  for (const k of ["hub0", "arm1", "spr1", "hub1", "arm2", "spr2", "hub2", "stem", "ringB", "body", "grille", "rings", "ringF", "neck", "pop", "mesh"]) {
    if (k === "neck") S.popG = mk("g", {}, g);
    const at = /^(neck|pop|mesh)/.test(k) ? S.popG : g;
    S[k] = /^(spr|ring|rings|neck|mesh)/.test(k) ? mk("path", { class: k === "neck" ? "nf" : "nf lo" }, at) : solid(at);
  }
  let popFirst = false;

  const sy = spring(REST), sh = spring(Math.min(56, reach)), sp = spring(-18);
  let drawn = "", over = null;

  function draw() {
    const key = sy.x + "," + sh.x + "," + sp.x;
    if (key === drawn) return;
    drawn = key;
    const yaw = rad(sy.x), u = [Math.cos(yaw), Math.sin(yaw)], e = [-u[1], u[0], 0];
    const W = (h, z) => [BX + u[0] * h, BY + u[1] * h, ZS + z];
    const dz = ZT - ZS, r = clamp(Math.hypot(sh.x, dz), 14, L1 + L2 - 1);
    const a = Math.atan2(dz, Math.sqrt(Math.max(r * r - dz * dz, 0))) + Math.acos(clamp((L1 * L1 + r * r - L2 * L2) / (2 * L1 * r), -1, 1));
    const eh = L1 * Math.cos(a), ez = L1 * Math.sin(a), th = Math.sqrt(Math.max(r * r - dz * dz, 0));
    const s0 = W(0, 0), s1 = W(eh, ez), s2 = W(th, dz);
    const hub = (o, rr) => tube(add(o, e, -3.5), add(o, e, 3.5), rr, 1);
    put(S.hub0, hub(s0, 3.6)); put(S.arm1, tube(s0, s1, 2.2)); put(S.hub1, hub(s1, 3.6)); put(S.arm2, tube(s1, s2, 2)); put(S.hub2, hub(s2, 2.8));
    /** The spring along a segment: lifted off it, zigzagging, hooked on at both ends. */
    const spr = (p, q) => {
      const n = frame([q[0] - p[0], q[1] - p[1], q[2] - p[2]].map((v) => v / Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2])))[1];
      const at = (t, o) => Pw(add([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t], n, o));
      return open([at(0.18, 0), ...Array.from({ length: 13 }, (_, k) => at(0.24 + k * 0.035, 4 + (k % 2 ? 1.3 : -1.3))), at(0.72, 0)]);
    };
    S.spr1.setAttribute("d", spr(s0, s1)); S.spr2.setAttribute("d", spr(s1, s2));
    const p = rad(sp.x), d = [u[0] * Math.cos(p), u[1] * Math.cos(p), Math.sin(p)], m = [s2[0], s2[1], s2[2] - DROP - RING];
    put(S.stem, tube(s2, [m[0], m[1], m[2] + RING], 1.1));
    S.ringB.setAttribute("d", half(m, d, -2, RING, true));
    put(S.body, tube(add(m, d, -15), add(m, d, 5), 6.4, 1.4));
    put(S.grille, tube(add(m, d, 5), add(m, d, 18), 7.3, 1.6));
    S.rings.setAttribute("d", [8, 11, 14].map((t) => half(m, d, t, 7.3)).join(""));
    S.ringF.setAttribute("d", half(m, d, -2, RING, false));
    const lo = add(add(m, d, -2), [0, 0, 1], -RING), pd = add(add(m, d, 30), [0, 0, 1], -12);
    S.neck.setAttribute("d", open([lo, add(add(m, d, 6), [0, 0, 1], -RING - 4), add(add(m, d, 18), [0, 0, 1], -16), pd].map(Pw)));
    put(S.pop, { sil: poly(loop(m, d, 30, 12, 0, 360, 28)), crease: "" });
    S.mesh.setAttribute("d", poly(loop(m, d, 30, 10.2, 0, 360, 28)));
    // the pop filter goes behind the mic when the mic aims away from the viewer
    if ((dot3(d, V) < 0) !== popFirst) { popFirst = !popFirst; if (popFirst) S.ringB.before(S.popG); else S.ringF.after(S.popG); }
  }

  const B = register(stage, (dt) => {
    const mv = [sy, sh, sp].map((s) => stepS(s, dt)).some(Boolean);
    draw();
    return mv;
  });
  bag.add(B.unregister);

  function retarget() {
    if (over) {
      const dx = over[0] - BX, dy = over[1] - BY, dist = Math.hypot(dx, dy);
      sy.t = clamp((Math.atan2(dy, dx) * 180) / Math.PI, -75, -12);
      sh.t = clamp(dist * 0.8, 26, reach);
      sp.t = -clamp((Math.atan2(ZT - DROP - RING - MOUTH, Math.max(dist - sh.t, 6)) * 180) / Math.PI, 8, 45);
    } else { sy.t = REST; sh.t = Math.min(56, reach); sp.t = -18; }
    S.pop.sil.classList.toggle("hi", !over);
    S.grille.sil.classList.toggle("hi", !!over);
    read.textContent = over ? `aim ${Math.round(-sy.t)}°` : "rest";
    B.wake();
  }

  bag.add(pointer(stage, {
    move: (p) => { over = unproj(C, p[0], p[1], 0); retarget(); },
    leave: () => { over = null; retarget(); },
  }));
  bag.add(() => svg.replaceChildren());
  retarget();

  return {
    set: (v) => { reach = v; retarget(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "boomarm",
  means: "A podcast mic on a desk boom arm: the arm swings and reaches toward the pointer, and the mic tilts to aim at it.",
  rules: [1, 3, 5, 8],
  range: [44, 64, 84],
  tour: [[227, 236], [239, 181], [215, 157], null],
  mount,
});
