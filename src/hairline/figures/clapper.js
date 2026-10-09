/**
 * Clapper: a film slate standing on its edge, turned a little from the
 * viewer. The board is ruled into the slate's fields; a fixed stick runs
 * along its top, and a hinged clapstick lies on it, both striped on the
 * diagonal, the stripes running opposite ways. The pointer's height opens the
 * clapstick on a spring: high is wide open, low claps it shut. At rest it is
 * held slightly open and the hinge pin is bright. The slider is the widest
 * the clapstick opens, in degrees.
 */
const {
  Cam, clamp, facing, fillet, fit, poly, prism, proj, rad, rings, seg, spring, stepS,
  mk, place, pointer, put, register, disposer, solid,
} = HL;

const W = 120, H = 72, TK = 5, SH = 11, LIP = 0.6, PHI = -35, REST = 10, ST = 15, SL = 7;
const U = [Math.cos(rad(PHI)), Math.sin(rad(PHI))], N = [-U[1], U[0]];

/** A ring in the board's own frame (u along it, n through it), turned into the world. */
const turn = (ring) => ring.map((q) => ({
  u: q.u * U[0] + q.v * N[0], v: q.u * U[1] + q.v * N[1], nu: q.nu * U[0] + q.nv * N[0], nv: q.nu * U[1] + q.nv * N[1],
}));

/** Diagonal stripes across a stick, as parallelograms in its own (a, b); dir sets the slant. */
function stripes(dir) {
  const out = [];
  for (let a = 6; a + 8 + SL < W - 4; a += ST) {
    const s0 = dir > 0 ? 0 : SL, s1 = dir > 0 ? SL : 0;
    out.push([[a + s0, 1.6], [a + s0 + 7, 1.6], [a + s1 + 7, SH - 1.6], [a + s1, SH - 1.6]]);
  }
  return out;
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let max = value;
  const C = Cam(45, 0.5, 1.95);
  const B3 = (u, n, z) => [u * U[0] + n * N[0], u * U[1] + n * N[1], z];
  const cs = Math.cos(rad(40)), sn = Math.sin(rad(40));
  fit(C, [B3(0, 0, 0), B3(W, TK, 0), B3(W, 0, H + 2 * SH), B3(0, TK, H + 2 * SH),
    B3(W * cs - SH * sn, -LIP, H + SH + W * sn + SH * cs), B3(W * cs, TK, H + SH + W * sn)], 200, 166);
  const P = proj(C), front = facing(C);
  const at = (u, n, z) => P(...B3(u, n, z));

  const g = mk("g", {}, svg);
  const [bo, bi] = rings(0, 0, W, TK, 2.5, 1);
  put(solid(g), prism(P, front, turn(bo), turn(bi), 0, H));
  // the slate's fields: two rules across, a divider, and the bottom row split in three
  const fz = (k) => H * k, fs = (u0, z0, u1, z1) => seg(at(u0, TK, z0), at(u1, TK, z1));
  mk("path", {
    class: "nf lo",
    d: fs(6, fz(0.66), W - 6, fz(0.66)) + fs(6, fz(0.36), W - 6, fz(0.36)) + fs(W / 2, fz(0.36), W / 2, fz(0.66)) +
      fs(W / 3, 4, W / 3, fz(0.36)) + fs((2 * W) / 3, 4, (2 * W) / 3, fz(0.36)),
  }, g);
  const [so, si] = rings(0, -LIP, W, TK + LIP, 2.5, 1);
  put(solid(g), prism(P, front, turn(so), turn(si), H, H + SH));
  mk("path", { class: "nf lo", d: stripes(1).map((q) => poly(q.map(([a, b]) => at(a, TK + LIP, H + b)))).join("") }, g);

  // the clapstick, hinged at the fixed stick's top-left corner
  const shape = fillet([[0, 0], [W, 0], [W, SH], [0, SH]], [1, 2, 2, 2.5]);
  const back = mk("path", { class: "lo" }, g), face = mk("path", { class: "sil" }, g), marks = mk("path", { class: "nf lo" }, g);
  const pin = mk("circle", { r: 1.9, class: "dot" }, g);
  const sp = spring(REST);
  let drawn = NaN, over = null;

  function draw(th) {
    if (th === drawn) return;
    drawn = th;
    const c = Math.cos(rad(th)), s = Math.sin(rad(th));
    const w = (a, b, n) => at(a * c - b * s, n, H + SH + a * s + b * c);
    back.setAttribute("d", poly(shape.map(([a, b]) => w(a, b, -LIP))));
    face.setAttribute("d", poly(shape.map(([a, b]) => w(a, b, TK + LIP))));
    marks.setAttribute("d", stripes(-1).map((q) => poly(q.map(([a, b]) => w(a, b, TK + LIP)))).join(""));
    place(pin, w(3.5, 3.5, TK + LIP));
  }

  const B = register(stage, (dt) => { const m = stepS(sp, dt); draw(Math.max(0, sp.x)); return m; });
  bag.add(B.unregister);

  // The pointer's height on the stage, read against fixed screen lines: nothing that moves is tested.
  const yLo = at(W / 2, TK, 0)[1] - 24, yHi = at(W / 2, TK, H + 2 * SH)[1] - 50;
  function retarget(p) {
    over = p;
    sp.t = p ? max * clamp((yLo - p[1]) / (yLo - yHi), 0, 1) : REST;
    face.classList.toggle("hi", !!p);
    pin.setAttribute("class", p ? "dot m" : "dot");
    read.textContent = p ? `open ${Math.round(sp.t)}°` : "rest";
    B.wake();
  }

  bag.add(pointer(stage, { move: retarget, leave: () => retarget(null) }));
  bag.add(() => svg.replaceChildren());
  retarget(null);

  return {
    set: (v) => { max = v; if (over) retarget(over); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "clapper",
  means: "A film slate: the pointer's height opens the clapstick on its hinge, and bringing it low claps it shut.",
  rules: [1, 3, 5, 8],
  range: [16, 28, 40],
  tour: [[200, 60], [200, 285], [200, 160], null],
  mount,
});
