/**
 * Testtubes: a test run as a lab rack of seven round-bottomed tubes, held by
 * two shelves between two end posts. Some tubes hold a result, drawn as a dim
 * fill line inside the glass. The pointer picks a tube, tested on each tube's
 * resting body; it lifts out of the rack and its neighbours rise a
 * little, staggered outwards from it on the 700ms tween. At rest the tubes sit
 * at uneven heights and the one that failed is bright. The slider is the
 * stagger, in ms.
 */
const {
  Cam, circ, facing, fit, hull, open, poly, prism, proj, ringAt, rings, run,
  tween, tset, tval, tdone, disposer, mk, pointer, put, register, solid,
} = HL;

const N = 7, PITCH = 15, R = 4.6, LEN = 62, SEAT = 3, LIFT = 42, NUDGE = [0, 10, 4];
const ZL = [15, 17.5], ZT = [40, 43], X0 = -8, X1 = (N - 1) * PITCH + 8, YW = 9;
/** Rest: how far each tube sits above its seat, and where its result fills to (0 for none). */
const REST = [0, 8, 3, 14, 1, 6, 0], FILL = [24, 0, 32, 18, 0, 28, 12], FAIL = 3;

const at = (ring, cx) => ring.map((q) => ({ ...q, u: q.u + cx, v: q.v }));

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;

  const C = Cam(45, 0.5, 2.1);
  fit(C, [[X0 - 4, -YW - 2, 0], [X1 + 4, YW + 2, 0], [X1 + 4, -YW - 2, 0], [X0 - 4, YW + 2, 0], [0, 0, SEAT + LIFT + LEN], [X1, 0, SEAT + LIFT + LEN]], 200, 166);
  const P = proj(C), front = facing(C);
  const tubeRing = circ(R, 20), fillRing = circ(R - 0.9, 20), holeRing = circ(R + 1.3, 20);

  const g = mk("g", {}, svg);
  const box = (x0, y0, x1, y1, z0, z1, r, b) => { const [o, i] = rings(x0, y0, x1, y1, r, b); put(solid(g), prism(P, front, o, i, z0, z1)); };
  box(X0 - 4, -YW - 2, X1 + 4, YW + 2, 0, SEAT, 3, 1.2);
  box(X0 - 4, -YW, X0, YW, SEAT, ZT[1] + 4, 2, 0.8);

  // Each tube is cut in three by the shelves: below, between, above; each piece is painted in its layer.
  const tubes = [];
  for (let i = 0; i < N; i++) tubes.push({ i, x: i * PITCH, pieces: [], z: tween(REST[i]), drawn: NaN });
  const layer = (lo, hi) => { for (const t of tubes) { const pg = mk("g", {}, g); t.pieces.push({ lo, hi, sil: mk("path", { class: "sil" }, pg), res: mk("path", { class: "nf lo" }, pg), mouth: mk("path", { class: "nf" }, pg) }); } };
  const shelf = ([z0, z1]) => {
    box(X0, -YW, X1, YW, z0, z1, 2.5, 1);
    mk("path", { d: tubes.map((t) => poly(ringAt(P, at(holeRing, t.x), z1))).join(""), class: "nf lo" }, g);
  };
  layer(-Infinity, ZL[0]); shelf(ZL);
  layer(ZL[1], ZT[0]); shelf(ZT);
  layer(ZT[1], Infinity);
  box(X1, -YW, X1 + 4, YW, SEAT, ZT[1] + 4, 2, 0.8);

  /** One piece of a tube whose bottom is at zb: the glass between lo and hi, with its round bottom if that falls inside. */
  function drawPiece(t, k, zb) {
    const z0 = Math.max(zb, k.lo), z1 = Math.min(zb + LEN, k.hi);
    if (z1 <= z0) { k.sil.setAttribute("d", ""); k.res.setAttribute("d", ""); k.mouth.setAttribute("d", ""); return; }
    const pts = ringAt(P, at(tubeRing, t.x), z1);
    for (let s = 0; s <= 6; s++) {
      const a = (s / 6) * (Math.PI / 2), z = zb + R - R * Math.sin(a);
      if (z >= z0) pts.push(...ringAt(P, at(circ(Math.max(R * Math.cos(a), 0.2), 20), t.x), z));
    }
    if (z0 > zb + R) pts.push(...ringAt(P, at(tubeRing, t.x), z0));
    k.sil.setAttribute("d", poly(hull(pts)));
    const zf = zb + FILL[t.i];
    k.res.setAttribute("d", FILL[t.i] && zf > z0 && zf < z1 ? open(ringAt(P, at(run(fillRing, front), t.x), zf)) : "");
    k.mouth.setAttribute("d", zb + LEN <= k.hi ? poly(ringAt(P, at(fillRing, t.x), zb + LEN)) : "");
  }

  const B = register(stage, (_dt, now) => {
    let m = false;
    for (const t of tubes) {
      const zb = SEAT + tval(t.z, now);
      if (!tdone(t.z, now)) m = true;
      if (zb === t.drawn) continue;
      t.drawn = zb;
      for (const k of t.pieces) drawPiece(t, k, zb);
    }
    return m;
  });
  bag.add(B.unregister);

  // hit: the tube whose resting body, on screen, holds the pointer; nearest centre in screen x
  const half = (P(PITCH, 0, 0)[0] - P(0, 0, 0)[0]) / 2;
  function hit([sx, sy]) {
    let best = -1, bd = half;
    for (const t of tubes) {
      const top = P(t.x, 0, SEAT + REST[t.i] + LEN)[1] - 8, bot = P(t.x, 0, SEAT + REST[t.i])[1] + 8, d = Math.abs(sx - P(t.x, 0, 0)[0]);
      if (sy >= top && sy <= bot && d < bd) { bd = d; best = t.i; }
    }
    return best;
  }

  let act = null;
  function setActive(a) {
    if (a === act) return;
    const now = performance.now(), from = a >= 0 ? a : act >= 0 ? act : FAIL;
    act = a;
    for (const t of tubes) {
      const d = Math.abs(t.i - from);
      tset(t.z, a < 0 ? REST[t.i] : t.i === a ? LIFT : REST[t.i] + (NUDGE[d] || 0), now, d * stag);
      for (const k of t.pieces) k.sil.classList.toggle("hi", t.i === (a < 0 ? FAIL : a));
    }
    read.textContent = a < 0 ? "rest" : `tube ${a + 1} · ${a === FAIL ? "fail" : "pass"}`;
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
  name: "testtubes",
  means: "A rack of test tubes, one failed: the tube under the pointer lifts out, and its neighbours rise a little in turn.",
  rules: [1, 2, 4, 5],
  range: [0, 45, 90],
  tour: [[133, 140], [200, 173], [245, 195], null],
  mount,
});
