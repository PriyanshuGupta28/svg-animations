/**
 * Keyring: a bunch of six keys on a split ring, lying on the desk. Every key
 * has its own bow, round, square or wide, a hole the ring runs through, a
 * shoulder, a milled groove and a blade cut with its own bitting. The pointer
 * picks a key, tested against the keys' resting outlines on the desk; it
 * swings up off the pile on the ring, and the others fan aside from it,
 * staggered outwards on the 700ms tween. At rest the bunch lies fanned
 * unevenly with one key half raised and bright. The slider is the stagger, in ms.
 */
const {
  Cam, fillet, fit, poly, proj, rad, seg, unproj, circ, ringAt,
  tween, tset, tval, tdone, disposer, mk, pointer, register,
} = HL;

/** Ring radius, how far each bow runs behind its hole, plate thickness, the lifted pitch and the rest pitch of the marked key. */
const R = 12, HB = 4.5, TK = 2, LIFT = 46, REST_UP = 11, FAN = 18, MARK = 2;
/** The keys in fan order: resting angle on the desk, bow width, bow length, bow corner, blade length, blade width, bitting depths. */
const KEYS = [
  { th: 132, bw: 15, bl: 10.5, br: 7.5, L: 27, w: 7, cuts: [2.2, 1, 2.6, 1.4] },
  { th: 164, bw: 13, bl: 11, br: 2.4, L: 33, w: 7.5, cuts: [1.2, 2.6, 1.8, 2.4, 1] },
  { th: 197, bw: 18, bl: 10, br: 4.5, L: 31, w: 7, cuts: [2.4, 1.6, 2.8, 1, 2] },
  { th: 232, bw: 10, bl: 8.5, br: 5, L: 19, w: 5.5, cuts: [1.6, 1, 2] },
  { th: 266, bw: 14, bl: 13, br: 6, L: 35, w: 7.5, cuts: [1, 2.4, 1.6, 2.8, 1.2, 2] },
  { th: 310, bw: 12.5, bl: 11.5, br: 3.4, L: 25, w: 6.5, cuts: [2.2, 1.4, 2.6] },
];

/** A key's outline in its own plane: u runs from its hole out along the blade, v across it; the bitting is on +v. */
function outline({ bw, bl, br, L, w, cuts }) {
  const e = bl + L, s = w / 2, bc = Math.min(br, 3);
  const pts = [[-HB, -bw / 2], [bl, -bw / 2], [bl, -s], [e - 3, -s], [e, -s + 2.6], [e - 4.5, s]];
  const radii = [br, bc, 0.6, 0.8, 0.8, 0.6];
  for (let c = 0, u = e - 7; u > bl + 4; c++, u -= 3.4) { pts.push([u, s - cuts[c % cuts.length]], [u - 1.7, s]); radii.push(0.5, 0.4); }
  pts.push([bl, s], [bl, bw / 2], [-HB, bw / 2]);
  radii.push(0.6, bc, br);
  return fillet(pts, radii, 3);
}

/** The world point of (u, v) on key k at angle th and pitch ph (degrees), on its underside, or its top when top. It pivots on its bow's back edge. */
function world(th, ph, u, v, top) {
  const c = Math.cos(rad(th)), s = Math.sin(rad(th)), cp = Math.cos(rad(ph)), sp = Math.sin(rad(ph));
  const r = R - HB + (u + HB) * cp - (top ? TK * sp : 0);
  return [c * r - s * v, s * r + c * v, (u + HB) * sp + (top ? TK * cp : 0)];
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;
  const shapes = KEYS.map(outline);

  // The camera is fitted to every key at rest and every key lifted, so no pose leaves the frame.
  const C = Cam(45, 0.5, 3.25), box = [];
  KEYS.forEach((k, i) => shapes[i].forEach(([u, v]) => { box.push(world(k.th - FAN, 0, u, v), world(k.th + FAN, 0, u, v), world(k.th, LIFT, u, v, true)); }));
  fit(C, box, 200, 170);
  const P = proj(C);

  const g = mk("g", {}, svg), ringG = mk("g", {}, g);
  mk("path", { d: poly(ringAt(P, circ(R + 1.1, 40), TK + 0.5)), class: "nf" }, ringG);
  mk("path", { d: poly(ringAt(P, circ(R - 1.1, 40), TK + 0.5)), class: "nf lo" }, ringG);

  const keys = KEYS.map((k, i) => {
    const kg = mk("g", {}, g);
    return {
      i, k, shape: shapes[i], g: kg, drawn: "",
      back: mk("path", { class: "lo" }, kg), face: mk("path", { class: "sil" }, kg),
      hole: mk("path", { class: "nf" }, kg), groove: mk("path", { class: "nf lo" }, kg),
      th: tween(k.th), ph: tween(i === MARK ? REST_UP : 0),
    };
  });
  const holeRing = circ(2, 12);

  function draw(key, th, ph) {
    const id = th + "," + ph;
    if (id === key.drawn) return;
    key.drawn = id;
    const { bl, L, w } = key.k, at = (u, v, top) => P(...world(th, ph, u, v, top));
    key.back.setAttribute("d", poly(key.shape.map(([u, v]) => at(u, v, false))));
    key.face.setAttribute("d", poly(key.shape.map(([u, v]) => at(u, v, true))));
    key.hole.setAttribute("d", poly(holeRing.map((q) => at(q.u, q.v, true))));
    key.groove.setAttribute("d", seg(at(bl + 2.5, -w * 0.18, true), at(bl + L - 5, -w * 0.18, true)));
  }

  /** Paint order: flat keys back to front by where they lie, then the ring over their bows, then any raised key. */
  function order(targets, up) {
    const depth = (th) => Math.sin(rad(th + 45));
    keys.filter((k) => !up[k.i]).sort((a, b) => depth(targets[a.i]) - depth(targets[b.i])).forEach((k) => g.append(k.g));
    g.append(ringG);
    keys.filter((k) => up[k.i]).forEach((k) => g.append(k.g));
  }

  const B = register(stage, (_dt, now) => {
    let m = false;
    for (const key of keys) { draw(key, tval(key.th, now), tval(key.ph, now)); if (!tdone(key.th, now) || !tdone(key.ph, now)) m = true; }
    return m;
  });
  bag.add(B.unregister);

  /** The key whose resting outline lies under the pointer on the desk, nearest its axis; -1 for none. */
  function hit([sx, sy]) {
    const [x, y] = unproj(C, sx, sy, 0);
    let best = -1, bd = Infinity;
    for (const { i, k } of keys) {
      const c = Math.cos(rad(k.th)), s = Math.sin(rad(k.th)), a = x * c + y * s - (R - HB), d = Math.abs(-x * s + y * c);
      if (a < -2 || a > HB + k.bl + k.L + 3 || d > k.bw / 2 + 2) continue;
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }

  let act = null;
  function setActive(a) {
    if (a === act) return;
    const now = performance.now(), from = a >= 0 ? a : act >= 0 ? act : MARK, targets = [], up = [];
    act = a;
    for (const key of keys) {
      const i = key.i, d = i - a;
      targets[i] = a < 0 || d === 0 ? key.k.th : key.k.th + Math.sign(d) * FAN * Math.max(0.35, 1 - (Math.abs(d) - 1) * 0.3);
      up[i] = a < 0 ? i === MARK : i === a;
      const delay = Math.abs(i - from) * stag;
      tset(key.th, targets[i], now, delay);
      tset(key.ph, up[i] ? (a < 0 ? REST_UP : LIFT) : 0, now, delay);
      key.face.classList.toggle("hi", up[i]);
    }
    order(targets, up);
    read.textContent = a < 0 ? "rest" : `key ${a + 1}`;
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
  name: "keyring",
  means: "A bunch of keys on a split ring: the key under the pointer swings up off the pile, and the rest fan aside from it.",
  rules: [1, 2, 6, 8],
  range: [0, 45, 90],
  tour: [[94, 199], [219, 178], [305, 173], null],
  mount,
});
