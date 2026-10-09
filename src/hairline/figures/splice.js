/**
 * Splice: a strip of nine film frames lying on a ruled cutting mat. Each
 * frame is a rounded plate with three perforations along both edges and a
 * picture in dim line: a ball over a floor, bouncing from frame to frame. The
 * pointer picks a frame and the strip is cut there: the frames either side
 * slide apart from the cut, staggered outwards from it, the chosen one lifts
 * and takes the bright stroke, and a dashed cut line shows on the mat under
 * it. At rest the strip already has a small cut, a frame half lifted. The
 * slider is the stagger, in ms.
 */
const {
  Cam, circ, facing, fit, poly, prism, proj, rings, rrect, seg,
  tween, tset, tval, tdone, disposer, mk, pointer, put, register, solid,
} = HL;

const N = 9, PITCH = 16.5, FW = 15, FD = 24, T = 1.4, GAP = 8, SPREAD = 1.5, LIFT = 12, REST_A = 5, REST_K = 0.35;
const MX0 = -23, MX1 = (N - 1) * PITCH + FW + 23, MY0 = -12, MY1 = FD + 12;
/** How far frame i slides when the cut is at a: away from it, a little more the farther it is. */
const shift = (i, a) => (i === a ? 0 : Math.sign(i - a) * (GAP + SPREAD * Math.abs(i - a)));

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;

  const C = Cam(45, 0.5, 1.9);
  fit(C, [[MX0, MY0, -3], [MX1, MY1, -3], [MX1, MY0, -3], [MX0, MY1, -3], [REST_A * PITCH, 0, LIFT + T]], 200, 170);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  const [mr, mi] = rings(MX0, MY0, MX1, MY1, 6, 1.8);
  put(solid(g), prism(P, front, mr, mi, -3, 0));
  // the mat's grid, every 20, inside a margin
  let grid = "";
  for (let x = MX0 + 8; x <= MX1 - 8; x += 16.5) grid += seg(P(x, MY0 + 6, 0), P(x, MY1 - 6, 0));
  for (let y = MY0 + 6; y <= MY1 - 6; y += 15) grid += seg(P(MX0 + 6, y, 0), P(MX1 - 6, y, 0));
  mk("path", { d: grid, class: "nf lo" }, g);
  const cut = mk("path", { class: "dash" }, g);

  // each frame in its own [u, v]: the picture window, four sprocket slots along each edge, and a ball over a floor
  const slot = (u, v) => rrect(u, v, u + 1.8, v + 1.4, 0.5, 2);
  const shapes = (i) => [rrect(1.6, 4.6, FW - 1.6, FD - 4.6, 1.5, 3), ...[0, 1, 2, 3].flatMap((k) => [slot(1.3 + k * 3.4, 1.6), slot(1.3 + k * 3.4, FD - 3)]),
    circ(2, 12).map((q) => ({ u: q.u + 4.2 + i * 0.85, v: q.v + FD - 8.2 - 8 * Math.abs(Math.cos((i * Math.PI) / 4)) }))];
  const frames = [];
  for (let i = 0; i < N; i++) {
    const el = solid(g), pic = mk("path", { class: "nf lo" }, el.g);
    const [ring, inner] = rings(0, 0, FW, FD, 2.4, 0.8);
    frames.push({ i, el, pic, shp: shapes(i), ring, inner, x: tween(i * PITCH + REST_K * shift(i, REST_A)), z: tween(i === REST_A ? LIFT * 0.45 : 0), dx: NaN, dz: NaN });
  }

  function draw(f, x, z) {
    if (x === f.dx && z === f.dz) return;
    f.dx = x; f.dz = z;
    const mv = (r) => r.map((q) => ({ ...q, u: q.u + x }));
    put(f.el, prism(P, front, mv(f.ring), mv(f.inner), z, z + T));
    const h = z + T;
    f.pic.setAttribute("d", f.shp.map((s) => poly(s.map((q) => P(x + q.u, q.v, h)))).join("") + seg(P(x + 2.6, FD - 6.2, h), P(x + FW - 2.6, FD - 6.2, h)));
  }

  const B = register(stage, (_dt, now) => {
    let m = false;
    for (const f of frames) { draw(f, tval(f.x, now), tval(f.z, now)); if (!tdone(f.x, now) || !tdone(f.z, now)) m = true; }
    return m;
  });
  bag.add(B.unregister);

  // hit: the frames' resting centres on screen, which never move
  const centres = frames.map((f) => P(f.i * PITCH + FW / 2, FD / 2, 0));
  function hit([x, y]) {
    let best = -1, bd = 30;
    centres.forEach((c, i) => { const d = Math.hypot(c[0] - x, c[1] - y); if (d < bd) { bd = d; best = i; } });
    return best;
  }

  let act = -1;
  function setActive(a) {
    if (a === act) return;
    const now = performance.now(), from = a >= 0 ? a : REST_A, b = a >= 0 ? a : REST_A, k = a >= 0 ? 1 : REST_K;
    act = a;
    for (const f of frames) {
      const delay = Math.abs(f.i - from) * stag;
      tset(f.x, f.i * PITCH + k * shift(f.i, b), now, delay);
      tset(f.z, f.i === b ? LIFT * (a >= 0 ? 1 : 0.45) : 0, now, delay);
      f.el.sil.classList.toggle("hi", f.i === b);
    }
    const cx = b * PITCH + FW / 2;
    cut.setAttribute("d", seg(P(cx, MY0 + 3, 0), P(cx, MY1 - 3, 0)));
    read.textContent = a >= 0 ? `cut ${a + 1}` : "rest";
    B.wake();
  }

  bag.add(pointer(stage, { move: (p) => setActive(hit(p)), leave: () => setActive(-1) }));
  bag.add(() => svg.replaceChildren());
  act = -2;
  setActive(-1);

  return {
    set: (v) => { stag = v; },
    destroy: bag.dispose,
  };
}

hairline({
  name: "splice",
  means: "A strip of film frames on a cutting mat: the pointer cuts it at a frame, and the two ends slide apart from the cut.",
  rules: [1, 2, 4, 8],
  range: [0, 40, 80],
  tour: [[125, 125], [179, 152], [262, 194], null],
  mount,
});
