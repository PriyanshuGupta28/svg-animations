/**
 * Lean: a racing motorcycle on the apex kerb of a corner, a dashed racing
 * line curving through it. The pointer's x sets the lean angle, on a spring,
 * clamped to the slider's maximum: the bike rolls about the line its two
 * tyres touch, onto the tyres' edges, and the front tyre takes the bright
 * stroke. At rest it holds a 20° lean, the fairing bright. The slider is the
 * maximum lean, in degrees.
 */
const {
  Cam, circ, clamp, fillet, fit, hull, open, poly, proj, rad, run,
  spring, stepS, disposer, mk, pointer, put, register, solid,
} = HL;

const REST = 20, Z0 = 1.2, R = 150, CX = 60, KR0 = R - 14, KR1 = R + 5, KA = 32, LA = 44;
const HEAD = -85, WR = [20, 17], WF = [105, 17], RT = 17;
const PEG = [44, 25], HC = Math.cos(rad(HEAD)), HS = Math.sin(rad(HEAD));

/** A capsule round the segment a–b, radius r, as an ordered outline in the bike's plane. */
function cap(a, b, r) {
  const t = Math.atan2(b[1] - a[1], b[0] - a[0]), pts = [];
  for (let k = 0; k <= 6; k++) { const s = t - Math.PI / 2 + (k * Math.PI) / 6; pts.push([b[0] + r * Math.cos(s), b[1] + r * Math.sin(s)]); }
  for (let k = 0; k <= 6; k++) { const s = t + Math.PI / 2 + (k * Math.PI) / 6; pts.push([a[0] + r * Math.cos(s), a[1] + r * Math.sin(s)]); }
  return pts;
}
const disc = (c, r, n = 28) => circ(r, n).map((q) => [c[0] + q.u, c[1] + q.v]);
const body = (pts, r) => fillet(pts, pts.map(() => r), 3);

// The bike's parts, back to front: an outline in its plane (x along, z up) and the depth it spans across.
const PARTS = [
  ["puck", disc(PEG, 3.4, 16), -14.5, -12],
  ["peg", cap(PEG, [PEG[0] + 0.01, PEG[1]], 1.5), -12, -5],
  ["fork", cap(WF, [93, 52], 2.4), -6, -3],
  ["rear", disc(WR, RT), -3.5, 3.5],
  ["front", disc(WF, RT), -3.2, 3.2],
  ["arm", cap(WR, [48, 30], 3), -5, 5.5],
  ["fork", cap(WF, [93, 52], 2.4), 3, 6],
  ["tail", body([[3, 51], [8, 55], [24, 52], [40, 46], [42, 40], [30, 38]], 2.5), -4.5, 4.5],
  ["tank", body([[38, 47], [52, 55], [66, 57], [70, 42], [44, 39]], 4), -7, 7],
  ["belly", body([[56, 34], [61, 9], [86, 9], [97, 30], [80, 38]], 4), -6, 6],
  ["fairing", body([[64, 44], [70, 60], [82, 64], [109, 50], [115, 43], [101, 36], [80, 35]], 4), -7, 7],
  ["pipe", cap([36, 26], [14, 37], 2.6), 5.5, 9.5],
];

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let max = value;

  const C = Cam(45, 0.5, 1.72);
  const top = [[0, -60, 30], [115, -50, 36], [CX - (R) * Math.sin(rad(LA)), -R + R * Math.cos(rad(LA)), 0], [CX + R * Math.sin(rad(LA)), -R + R * Math.cos(rad(LA)), 0], [60, KR1 - R, 0], [110, 0, 62]];
  // the bike heads away, a little off the view, so its lean shows as a tilt
  const turn = ([x, y, z]) => [x * HC - y * HS, x * HS + y * HC, z];
  fit(C, top.map(turn), 200, 166);
  const P0 = proj(C), P = (x, y, z) => P0(...turn([x, y, z]));
  const arc = (r, a0, a1, z, n = 24) => Array.from({ length: n + 1 }, (_, k) => { const a = rad(a0 + ((a1 - a0) * k) / n); return P(CX + r * Math.sin(a), -R + r * Math.cos(a), z); });

  const g = mk("g", {}, svg);
  // the racing line, painted under the kerb; then the kerb, a low curved plate cut into blocks
  mk("path", { d: open(arc(R, -LA, LA, 0, 40)), class: "nf dash" }, g);
  const kb = [...arc(KR1, -KA, KA, 0), ...arc(KR0, KA, -KA, 0)], kt = [...arc(KR1, -KA, KA, Z0), ...arc(KR0, KA, -KA, Z0)];
  mk("path", { d: poly(kb), class: "lo" }, g);
  mk("path", { d: poly(kt), class: "sil" }, g);
  const blocks = [];
  for (let a = -KA + 4; a < KA; a += 4) { const [p, q] = [arc(KR1, a, a, Z0, 1)[0], arc(KR0, a, a, Z0, 1)[0]]; blocks.push(`M${p[0].toFixed(2)},${p[1].toFixed(2)}L${q[0].toFixed(2)},${q[1].toFixed(2)}`); }
  mk("path", { d: blocks.join(""), class: "nf lo" }, g);

  const els = PARTS.map(([name]) => ({ name, el: solid(g) }));
  const marks = mk("path", { class: "nf lo" }, g), brake = mk("path", { class: "nf" }, g);
  els.find((e) => e.name === "front").el.g.after(marks, brake);
  const fairing = els.find((e) => e.name === "fairing").el, tyre = els.find((e) => e.name === "front").el;

  /** The bike leaned th degrees towards the inside of the corner, rolled about the line its tyres touch. */
  function draw(th) {
    const ca = Math.cos(rad(th)), sa = Math.sin(rad(th));
    const W = (x, yb, zb) => P(x, yb * ca - zb * sa, Z0 + yb * sa + zb * ca);
    PARTS.forEach(([, pts, y0, y1], k) => {
      const f = pts.map(([x, z]) => W(x, y1, z)), b = pts.map(([x, z]) => W(x, y0, z)), n = f.length;
      const d = [b[0][0] - f[0][0], b[0][1] - f[0][1]], cx = f.reduce((s, p) => s + p[0], 0) / n, cy = f.reduce((s, p) => s + p[1], 0) / n;
      // the face's edge is a crease only where the far side shows past it
      const inside = f.map((p, i) => {
        const q = f[(i + 1) % n], o = f[(i + n - 1) % n];
        let nx = q[1] - o[1], ny = o[0] - q[0];
        if (nx * (p[0] - cx) + ny * (p[1] - cy) < 0) { nx = -nx; ny = -ny; }
        return nx * d[0] + ny * d[1] > 0;
      });
      const r = run(f.map((p, i) => ({ i })), (q) => inside[q.i]);
      put(els[k].el, { sil: poly(hull(f.concat(b))), crease: open(r.map((q) => f[q.i])) });
    });
    // rims on both wheels; the front disc brake and its caliper
    const ring = (c, rr, y) => poly(disc(c, rr, 24).map(([x, z]) => W(x, y, z)));
    marks.setAttribute("d", ring(WR, 12.5, 3.5) + ring(WF, 12.5, 3.2) + ring(WR, 2, 3.6) + ring(WF, 2, 3.4));
    brake.setAttribute("d", ring(WF, 8.5, 3.5) + poly(cap([WF[0] - 7, WF[1] + 5], [WF[0] - 3, WF[1] + 8.5], 1.6).map(([x, z]) => W(x, 4.2, z))));
  }

  const sp = spring(REST, { eps: 0.05 });
  let drawn = NaN, over = false;
  const B = register(stage, (dt) => {
    const m = stepS(sp, dt);
    if (sp.x !== drawn) { drawn = sp.x; draw(sp.x); }
    return m;
  });
  bag.add(B.unregister);

  let px = null;
  function retarget() {
    over = px !== null;
    sp.t = over ? clamp((px - 110) / 190, 0, 1) * max : REST;
    fairing.sil.classList.toggle("hi", !over);
    tyre.sil.classList.toggle("hi", over);
    read.textContent = over ? `lean ${Math.round(sp.t)}°` : "rest";
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
  name: "lean",
  means: "A racing bike on the apex kerb: the pointer sets how far it leans into the corner, rolling onto its tyres' edges.",
  rules: [1, 3, 5, 8],
  range: [40, 52, 60],
  tour: [[150, 160], [300, 160], [220, 160], null],
  mount,
});
