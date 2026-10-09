/**
 * Devices: a phone, a tablet and a laptop on a desk, the same page on each,
 * ruled to its width: one column on the phone, two on the tablet, three on
 * the laptop. At rest the phone and tablet recline and the laptop's lid is
 * half shut, bright. The pointer picks a device by its resting centre; it
 * stands up and lifts toward the viewer (the laptop's lid opens wide), and the
 * others settle back, staggered by distance on the 700ms lift curve. The
 * slider is the stagger, in ms.
 */
const {
  Cam, fit, poly, proj, rings, prism, facing, rrect, seg,
  tween, tset, tval, tdone, disposer, mk, pointer, put, register, solid,
} = HL;

const K = 2.6, LD = 56, LT = 3;
// [name, x0, width, height, columns, corner, rest lean, picked lean, settled lean, picked lift]
const DEV = [
  ["phone", 0, 28, 54, 1, 5, -48, -8, -62, 12],
  ["tablet", 42, 58, 76, 2, 5, -40, -6, -56, 10],
  ["laptop", 116, 100, 64, 3, 3, 6, -24, 22, 0],
];
const MARK = 2;

/** The page ruled to w: a header bar, then n columns of lines; [medium, dim] as lists of [u0, v0, u1, v1]. */
function page(w, h, n) {
  const m = 7, gap = 5, cw = (w - 2 * m - (n - 1) * gap) / n, md = [[m, h - 10, w - m, h - 10]], lo = [];
  for (let c = 0; c < n; c++) {
    const u0 = m + c * (cw + gap);
    md.push([u0, h - 17, u0 + cw * 0.7, h - 17]);
    for (let v = h - 23, k = 0; v > 9; v -= 5, k++) lo.push([u0, v, u0 + cw * (k % 3 === 2 ? 0.55 : 1), v]);
  }
  return { md, lo };
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;

  const C = Cam(45, 0.5, 1.44);
  fit(C, [[-12, -LD - 14, -6], [230, -LD - 14, -6], [-12, 16, -6], [230, 16, -6], [0, -10, 76], [42, -8, 92], [116, -LD - 28, 67], [216, -LD - 28, 67]], 200, 166);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  const [dr, di] = rings(-12, -LD - 14, 230, 16, 10, 2.2);
  put(solid(g), prism(P, front, dr, di, -6, 0));

  // The laptop's base sits on the desk, keyboard and trackpad cut in its top.
  const L = DEV[2], lx0 = L[1], lx1 = L[1] + L[2];

  const devs = DEV.map((d, i) => {
    const grp = mk("g", {}, g);
    if (i === 2) {
      const [br, bi] = rings(lx0, -LD, lx1, 0, 4, 1.2);
      put(solid(grp), prism(P, front, br, bi, 0, LT));
      let keys = "";
      for (let r = 0; r < 4; r++) keys += seg(P(lx0 + 10, -LD + 8 + r * 6, LT), P(lx1 - 10, -LD + 8 + r * 6, LT));
      mk("path", { class: "nf lo", d: keys }, grp);
      mk("path", { class: "nf lo", d: poly(rrect(lx0 + 34, -16, lx1 - 34, -5, 2, 3).map((q) => P(q.u, q.v, LT))) }, grp);
    }
    const back = mk("path", { class: "lo" }, grp), face = mk("path", { class: "sil" }, grp);
    const scr = mk("path", { class: "nf lo" }, grp), md = mk("path", { class: "nf" }, grp), lo = mk("path", { class: "nf lo" }, grp);
    return {
      d, i, back, face, scr, md, lo, shape: rrect(0, 0, d[2], d[3], d[5], 4), inset: rrect(3, 3, d[2] - 3, d[3] - 3, Math.max(1, d[5] - 2.5), 4),
      lines: page(d[2], d[3], d[4]), a: tween(d[6]), z: tween(0), cx: P(d[1] + d[2] / 2, i === 2 ? -LD : 0, 0)[0],
    };
  });

  function draw(v, th, lift) {
    const [, x0] = v.d, yb = v.i === 2 ? -LD : 0, zb = v.i === 2 ? LT : 0, s = Math.sin(th * Math.PI / 180), c = Math.cos(th * Math.PI / 180);
    const w = (u, q) => P(x0 + u, yb + q * s, zb + q * c + lift);
    const wb = (u, q) => P(x0 + u, yb + q * s - K * c, zb + q * c + K * s + lift);
    v.back.setAttribute("d", poly(v.shape.map((q) => wb(q.u, q.v))));
    v.face.setAttribute("d", poly(v.shape.map((q) => w(q.u, q.v))));
    v.scr.setAttribute("d", poly(v.inset.map((q) => w(q.u, q.v))));
    const segs = (list) => list.map(([a, b, e, f]) => seg(w(a, b), w(e, f))).join("");
    v.md.setAttribute("d", segs(v.lines.md));
    v.lo.setAttribute("d", segs(v.lines.lo));
  }

  const B = register(stage, (_dt, now) => {
    let m = false;
    for (const v of devs) { draw(v, tval(v.a, now), tval(v.z, now)); if (!tdone(v.a, now) || !tdone(v.z, now)) m = true; }
    return m;
  });
  bag.add(B.unregister);

  let act = null;
  /** Picks device a (-1 lets go): it stands up, the others settle back, spreading out from it. */
  function setActive(a) {
    if (a === act) return;
    const now = performance.now(), from = a >= 0 ? a : act ?? MARK;
    act = a;
    for (const v of devs) {
      const delay = Math.abs(v.i - from) * stag, d = v.d;
      tset(v.a, a < 0 ? d[6] : v.i === a ? d[7] : d[8], now, delay);
      tset(v.z, v.i === a ? d[9] : 0, now, delay);
      v.face.classList.toggle("hi", v.i === (a < 0 ? MARK : a));
    }
    read.textContent = a < 0 ? "rest" : DEV[a][0];
    B.wake();
  }

  // A single row: the device whose resting centre is nearest the pointer's x.
  const hit = (p) => devs.reduce((b, v) => (Math.abs(v.cx - p[0]) < Math.abs(devs[b].cx - p[0]) ? v.i : b), 0);
  bag.add(pointer(stage, { move: (p) => setActive(hit(p)), leave: () => setActive(-1) }));
  bag.add(() => svg.replaceChildren());
  setActive(-1);

  return {
    set: (v) => { stag = v; },
    destroy: bag.dispose,
  };
}

hairline({
  name: "devices",
  means: "One page on a phone, a tablet and a laptop, ruled to each width: the device under the pointer stands up.",
  rules: [1, 2, 5, 8],
  range: [0, 50, 100],
  tour: [[112, 100], [184, 100], [300, 140], null],
  mount,
});
