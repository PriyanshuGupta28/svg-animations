/**
 * Vending: a vending machine cut open behind its glass, three shelves of
 * spiral coils, each coil holding a row of slim cans, a keypad beside them and
 * a delivery bin below. The pointer picks a slot, tested on each slot's
 * resting front can; its coil turns one full turn, the cans ride forward, and
 * the front one tips off the end and drops into the bin, on one tween. At rest
 * one can hangs stuck on the lip of its coil, and that coil is bright. The
 * slider is the drop's duration, in ms.
 */
const {
  Cam, circ, facing, fillet, fit, hull, lerp, open, poly, proj, ringAt, rings, rrect, run,
  tween, tset, tval, tdone, disposer, mk, place, pointer, register, solid,
} = HL;

const R = 4.2, H = 20, NC = 5, NR = 3, CP = 13, RP = 30, PITCH = 11, RC = 6;
const WX0 = 7, WX1 = WX0 + 4 + NC * CP, X1 = 102, YF = 36, YC = 24, Z1 = 140, ZW0 = 34, ZW1 = 132;
const YFRONT = YC - R - 0.6, AX = 0.4, LIP = 0.3, MARK = 8, BIN = [38, 30, 10.4], ROWS = "ABC";
const V = [0.612, 0.612, 0.5];

const shelfZ = (r) => 40 + (NR - 1 - r) * RP;
const colX = (c) => WX0 + 2 + (c + 0.5) * CP;
const norm = (a) => { const l = Math.hypot(...a); return a.map((x) => x / l); };
const area = (pts) => pts.reduce((s, p, i) => { const q = pts[(i + 1) % pts.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0);
/** A can's frame: centre c, axis a; returns w(u, v, h) in world, h from 0 at the base to H at the rim. */
function frame(c, a) {
  let e1 = [a[1], -a[0], 0];
  e1 = Math.hypot(...e1) < 1e-3 ? [1, 0, 0] : norm(e1);
  const e2 = [a[1] * e1[2] - a[2] * e1[1], a[2] * e1[0] - a[0] * e1[2], a[0] * e1[1] - a[1] * e1[0]];
  return (u, v, h) => [0, 1, 2].map((k) => c[k] + u * e1[k] + v * e2[k] + (h - H / 2) * a[k]);
}
const upright = (x, y, z) => frame([x, y, z + H / 2], [0, 0, 1]);

const CS = circ(1, 20), TAB = rrect(-0.6, -0.9, 2.1, 0.9, 0.8, 3);
/** A slim can: a body that steps in at the base and necks in under the rim, a shoulder crease, the rim, the lid and its pull tab. */
function canPaths(P, w) {
  const at = (h, r) => CS.map((q) => P(...w(q.u * r, q.v * r, h)));
  const prof = [[0, R * 0.8], [1.2, R], [H - 3.4, R], [H - 0.8, R * 0.82], [H, R * 0.82]];
  const o = w(0, 0, 0), out = (q) => { const p = w(q.nu, q.nv, 0); return (p[0] - o[0]) * V[0] + (p[1] - o[1]) * V[1] + (p[2] - o[2]) * V[2] > 0; };
  return {
    sil: poly(hull(prof.flatMap(([h, r]) => at(h, r)))),
    cr: open(run(CS, out).map((q) => P(...w(q.u * R, q.v * R, H - 3.4)))),
    rim: poly(at(H, R * 0.82)),
    lid: poly(at(H - 0.3, R * 0.6)) + poly(TAB.map((q) => P(...w((q.u + q.v) * 0.707, (q.v - q.u) * 0.707, H)))),
  };
}
function makeCan(parent) {
  const g = mk("g", {}, parent);
  return { g, sil: mk("path", { class: "sil" }, g), cr: mk("path", { class: "nf lo" }, g), rim: mk("path", { class: "nf" }, g), lid: mk("path", { class: "nf lo" }, g) };
}
function drawCan(el, d) { for (const k of ["sil", "cr", "rim", "lid"]) el[k].setAttribute("d", d ? d[k] : ""); }

/** Where slot (x, z)'s front can is at drop progress d: riding to the lip and tipping, then falling into the bin. Also the shift s of the cans behind it. */
function fallPose(x, z, d) {
  if (d <= AX) { const s = d / AX, th = (25 * s * s * Math.PI) / 180; return { s, c: [x, YFRONT + 5 * s, z + H / 2], a: [0, Math.sin(th), Math.cos(th)] }; }
  const f = ((d - AX) / (1 - AX)) ** 2, t0 = (25 * Math.PI) / 180, lip = [x, YFRONT + 5, z + H / 2];
  return { s: 1, c: lip.map((v, k) => lerp(v, BIN[k], f)), a: norm([f, (1 - f) * Math.sin(t0), (1 - f) * Math.cos(t0)]) };
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let dur = value;

  const C = Cam(45, 0.5, 1.62);
  fit(C, [[0, 0, 0], [X1, YF, 0], [X1, 0, 0], [0, YF, 0], [0, 0, Z1], [X1, 0, Z1]], 200, 166);
  const P = proj(C), front = facing(C);
  const face = (pts) => pts.map(([x, z]) => P(x, YF, z));
  const box = (x0, z0, x1, z1, r) => fillet([[x0, z0], [x1, z0], [x1, z1], [x0, z1]], [r, r, r, r]);

  const g = mk("g", {}, svg), inside = mk("g", {}, g);
  // the slots, bottom row first, so a shelf covers the tops of the cans in the row below it
  const slots = [];
  for (let r = NR - 1; r >= 0; r--) {
    const z = shelfZ(r), [sr, si] = rings(WX0, 2, WX1 + 10, YC, 1, 0.5);
    const sh = solid(inside);
    sh.sil.setAttribute("d", poly(hull(ringAt(P, sr, z - 2).concat(ringAt(P, sr, z)))));
    sh.cr.setAttribute("d", open(ringAt(P, run(si, front), z)));
    for (let c = 0; c < NC; c++) {
      const coil = mk("path", { class: "nf lo" }, inside), cans = [2, 1, 0].map(() => makeCan(inside));
      slots[r * NC + c] = { r, c, x: colX(c), z, coil, cans, d: tween(r * NC + c === MARK ? LIP : 0), to: 0, drawn: NaN };
    }
  }
  slots.forEach((sl) => { sl.fall = makeCan(inside); sl.to = tval(sl.d, 0); });
  const bin = makeCan(inside);
  drawCan(bin, null);

  // the cabinet: one opaque body with the window and the bin cut out of its front, so it hides all the inside but what shows through them
  const [ring, inner] = rings(0, 0, X1, YF, 4, 1.8);
  const body = hull(ringAt(P, ring, 0).concat(ringAt(P, ring, Z1)));
  const hole = (pts) => poly(Math.sign(area(pts)) === Math.sign(area(body)) ? pts.slice().reverse() : pts);
  mk("path", { d: poly(body) + hole(face(box(WX0, ZW0, WX1, ZW1, 3))) + hole(face(box(20, 6, 58, 21, 3))), class: "sil" }, g);
  mk("path", { d: open(ringAt(P, run(inner, front), Z1)), class: "nf lo" }, g);
  mk("path", { d: poly(face(box(WX0 - 3, ZW0 - 3, WX1 + 3, ZW1 + 3, 5))) + poly(face(box(17, 3, 61, 24, 5))), class: "nf lo" }, g);
  // the keypad column: a display, twelve keys, a coin slot
  const kx = WX1 + 9;
  mk("path", { d: poly(face(box(kx, 110, kx + 15, 120, 2))) + poly(face(box(kx + 6.5, 62, kx + 8.5, 72, 1))), class: "nf lo" }, g);
  for (let k = 0; k < 12; k++) place(mk("circle", { r: 1.1, class: "dot off" }, g), P(kx + 2.5 + (k % 3) * 5, YF, 102 - Math.floor(k / 3) * 6));

  function coilPath(sl, s) {
    const pts = [];
    for (let y = 2; y <= YC; y += 0.5) {
      const a = (2 * Math.PI * (y - YFRONT - PITCH / 2 - s * PITCH)) / PITCH;
      pts.push(P(sl.x + RC * Math.sin(a), y, sl.z + RC - RC * Math.cos(a)));
    }
    return open(pts);
  }
  function drawSlot(sl, d) {
    const fp = fallPose(sl.x, sl.z, d);
    sl.coil.setAttribute("d", coilPath(sl, fp.s));
    // cans behind the front one ride forward by s; the front one leaves the row once it is past the lip
    [2, 1].forEach((k, j) => { const y = YFRONT - (k - fp.s) * PITCH; drawCan(sl.cans[j], y > 2 + R ? canPaths(P, upright(sl.x, y, sl.z)) : null); });
    const fc = canPaths(P, frame(fp.c, fp.a));
    drawCan(sl.cans[2], d <= AX ? fc : null);
    drawCan(sl.fall, d > AX ? fc : null);
  }

  const B = register(stage, (_dt, now) => {
    let m = false;
    for (const sl of slots) {
      let v = tval(sl.d, now);
      if (tdone(sl.d, now) && v >= 0.999) { v = 0; sl.d = tween(0, dur); sl.to = 0; drawCan(bin, canPaths(P, frame(BIN, [1, 0, 0]))); }
      if (!tdone(sl.d, now)) m = true;
      if (v !== sl.drawn) { sl.drawn = v; drawSlot(sl, v); }
    }
    return m;
  });
  bag.add(B.unregister);

  // hit: the slot whose resting front can is nearest the pointer, within half a row
  const reach = Math.abs(P(0, 0, RP)[1] - P(0, 0, 0)[1]) / 2;
  function hit([sx, sy]) {
    let best = -1, bd = reach;
    slots.forEach((sl, i) => { const p = P(sl.x, YFRONT, sl.z + H / 2), dd = Math.hypot(sx - p[0], sy - p[1]); if (dd < bd) { bd = dd; best = i; } });
    return best;
  }

  let act = null;
  function setActive(a) {
    if (a === act) return;
    const now = performance.now(), lit = a < 0 ? MARK : a;
    act = a;
    slots.forEach((sl, i) => {
      const v = tval(sl.d, now), to = i === a || v > AX ? 1 : a < 0 && i === MARK ? LIP : 0;
      if (to !== sl.to) { sl.to = to; sl.d = tween(v, dur); tset(sl.d, to, now, 0); }
      sl.coil.setAttribute("class", i === lit ? "nf hi" : "nf lo");
      sl.cans[2].sil.classList.toggle("hi", i === lit); sl.fall.sil.classList.toggle("hi", i === lit);
    });
    read.textContent = a < 0 ? "rest" : `slot ${ROWS[slots[a].r]}${slots[a].c + 1}`;
    B.wake();
  }

  bag.add(pointer(stage, { move: (p) => setActive(hit(p)), leave: () => setActive(-1) }));
  bag.add(() => svg.replaceChildren());
  setActive(-1);

  return {
    set: (v) => { dur = v; },
    destroy: bag.dispose,
  };
}

hairline({
  name: "vending",
  means: "A vending machine of slim cans: the coil under the pointer turns, and its front can tips off and drops into the bin.",
  rules: [1, 5, 6, 8],
  range: [500, 900, 1400],
  tour: [[150, 120], [230, 160], [180, 210], null],
  mount,
});
