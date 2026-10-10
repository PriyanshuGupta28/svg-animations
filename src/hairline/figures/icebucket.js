/**
 * Icebucket: a round ice bucket, flared from its foot to a rolled rim, a loop
 * handle on either side, packed with lumps of ice and five slim cans leaning
 * out against the rim at their own angles. Each can steps in at its foot,
 * necks in under a rolled rim and has a pull tab; the ice hides what is
 * below it. The pointer picks a can, tested on each can's resting axis; it
 * stands up and lifts clear of the ice, and the others tilt aside, away from
 * it round the ring, staggered by distance on the 700ms tween. At rest the
 * can leaning furthest is bright. The slider is the stagger, in ms.
 */
const {
  Cam, circ, clamp, facing, fit, hull, open, poly, prism, proj, rad, ringAt, rrect, run,
  tween, tset, tval, tdone, disposer, mk, pointer, put, register, solid,
} = HL;

const R = 5, H = 26, RB = 23, RT = 30, ZT = 30, ZI = 24, ZB = 18, RC = 13, LIFT = 20, AWAY = [0, 24, 11];
const AZ = [45, 117, 189, 261, 333], LEAN = [13, 16, 10, 14, 22], MARK = 4, V = [0.612, 0.612, 0.5];
/** Lumps of ice, packed on a spiral round the middle and kept clear of the cans: x, y, half size, turn, height above the ice. */
const ICE = [];
for (let k = 0; k < 60 && ICE.length < 22; k++) {
  const r = 3 + 23 * Math.sqrt(k / 60), a = k * 2.39996, x = r * Math.cos(a), y = r * Math.sin(a);
  if (AZ.some((az) => Math.hypot(x - 15 * Math.cos(rad(az)), y - 15 * Math.sin(rad(az))) < 8)) continue;
  ICE.push([x, y, 2.6 + (k % 3) * 0.6, (k * 37) % 90, 1.2 + (k % 4) * 0.6]);
}

const norm = (a) => { const l = Math.hypot(...a); return a.map((x) => x / l); };
function frame(b, a) {
  const e1 = norm([a[2], 0, -a[0]]), e2 = [a[1] * e1[2] - a[2] * e1[1], a[2] * e1[0] - a[0] * e1[2], a[0] * e1[1] - a[1] * e1[0]];
  return (u, v, h) => [0, 1, 2].map((k) => b[k] + u * e1[k] + v * e2[k] + h * a[k]);
}
const circle = (r, n = 40) => rrect(-r, -r, r, r, r, n / 4);
const CS = circ(1, 22), TAB = rrect(-0.7, -1.1, 2.6, 1.1, 1, 3);
const PROF = [[0, R * 0.8], [1.4, R], [H - 4, R], [H - 1.2, R * 0.8], [H, R * 0.8]];
const radiusAt = (h) => { for (let k = 1; k < PROF.length; k++) if (h <= PROF[k][0]) { const [h0, r0] = PROF[k - 1], [h1, r1] = PROF[k]; return r0 + ((h - h0) / (h1 - h0)) * (r1 - r0); } return R * 0.8; };
/** A slim can, drawn only from height h0 of its own axis up: what stands above the ice. */
function canPaths(P, w, tab, h0) {
  const at = (h, r) => CS.map((q) => P(...w(q.u * r, q.v * r, h)));
  const o = w(0, 0, 0), out = (q) => { const p = w(q.nu, q.nv, 0); return (p[0] - o[0]) * V[0] + (p[1] - o[1]) * V[1] + (p[2] - o[2]) * V[2] > 0; };
  const c = Math.cos(rad(tab)), s = Math.sin(rad(tab)), cut = clamp(h0, 0, H - 2);
  const prof = [[cut, radiusAt(cut)], ...PROF.filter(([h]) => h > cut)];
  return {
    sil: poly(hull(prof.flatMap(([h, r]) => at(h, r)))),
    cr: H - 4 > cut ? open(run(CS, out).map((q) => P(...w(q.u * R, q.v * R, H - 4)))) : "",
    rim: poly(at(H, R * 0.8)) + poly(at(H - 0.2, R * 0.66)),
    lid: poly(TAB.map((q) => P(...w(q.u * c - q.v * s, q.u * s + q.v * c, H - 0.2)))),
  };
}
/** A loop handle standing out from the wall at azimuth az: an outer and an inner rounded D, in the wall's radial plane. */
function handle(P, az) {
  const cx = Math.cos(rad(az)), cy = Math.sin(rad(az)), at = (r, z) => P(r * cx, r * cy, z);
  const d = (r0, r1, z0, z1, n) => { const pts = []; for (let k = 0; k <= n; k++) { const t = (k / n) * Math.PI; pts.push(at(r0 + (r1 - r0) * Math.sin(t), (z0 + z1) / 2 + ((z1 - z0) / 2) * Math.cos(t))); } return pts; };
  const w = RB + ((RT - RB) * (ZT - 9)) / ZT - 1.5;
  return poly(d(w, w + 9, ZT - 15, ZT - 3, 14)) + poly(d(w + 0.3, w + 6.6, ZT - 12.6, ZT - 5.4, 12));
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;

  const C = Cam(45, 0.5, 3.1);
  const E = (RT + 7) * Math.SQRT1_2, F = RB * Math.SQRT1_2;
  fit(C, [[-E, E, ZT], [E, -E, ZT], [F, F, 0], [-F, -F, ZT], [-9, -9, ZB + LIFT + H]], 200, 166);
  const P = proj(C), front = facing(C);
  const foot = circle(RB), top = circle(RT), bead = circle(RT + 1.6), lip = circle(RT - 1);

  const g = mk("g", {}, svg);
  // far: the handles, the body, the rim's inside edge and the ice's line round the back wall
  for (const az of [135, 315]) mk("path", { d: handle(P, az), class: "nf" }, g);
  const body = hull(ringAt(P, foot, 0).concat(ringAt(P, top, ZT - 2), ringAt(P, bead, ZT), ringAt(P, lip, ZT + 1)));
  mk("path", { d: poly(body), class: "sil" }, g);
  mk("path", { d: poly(ringAt(P, lip, ZT + 1)), class: "nf" }, g);
  mk("path", { d: open(ringAt(P, run(circle(RT - 3), (q) => !front(q)), ZI)), class: "nf lo" }, g);

  // the cans and the lumps of ice, by ascending x + y, so nearer ones paint later
  const items = [];
  AZ.forEach((az, i) => items.push({ k: "can", i, d: Math.cos(rad(az)) * RC + Math.sin(rad(az)) * RC }));
  ICE.forEach((q) => items.push({ k: "ice", q, d: q[0] + q[1] }));
  items.sort((a, b) => a.d - b.d);
  const cans = [];
  for (const it of items) {
    if (it.k === "ice") {
      const [x, y, s, t, h] = it.q, ct = Math.cos(rad(t)), st = Math.sin(rad(t));
      const turn = (ring) => ring.map((p) => ({ u: x + p.u * ct - p.v * st, v: y + p.u * st + p.v * ct, nu: p.nu * ct - p.nv * st, nv: p.nu * st + p.nv * ct }));
      put(solid(g), prism(P, front, turn(rrect(-s, -s, s, s, s * 0.55, 3)), turn(rrect(-s + 0.8, -s + 0.8, s - 0.8, s - 0.8, s * 0.55 - 0.8, 3)), ZI - 2, ZI + h));
      continue;
    }
    const i = it.i, el = { g: mk("g", {}, g) };
    el.sil = mk("path", { class: "sil" }, el.g); el.cr = mk("path", { class: "nf lo" }, el.g);
    el.rim = mk("path", { class: "nf" }, el.g); el.lid = mk("path", { class: "nf lo" }, el.g);
    cans[i] = { i, az: AZ[i], el, tab: (i * 97 + 30) % 360, lift: tween(0), lean: tween(LEAN[i]), swing: tween(0), drawn: "" };
  }

  // near: one opaque piece from the rim's inner edge down the front wall to the foot, then the rolled rim's two lines
  const LR = (pts) => (pts[0][0] <= pts[pts.length - 1][0] ? pts : pts.slice().reverse());
  const iF = LR(ringAt(P, run(lip, front), ZT + 1)), oT = LR(ringAt(P, run(bead, front), ZT)), oB = LR(ringAt(P, run(foot, front), 0));
  mk("path", { d: poly([...iF, oT[oT.length - 1], ...oB.slice().reverse(), oT[0]]), class: "fo" }, g);
  // the body's outline again, below the rim's two ends, over the near piece's edge
  const yth = Math.min(iF[0][1], iF[iF.length - 1][1]), k0 = body.findIndex((p) => p[1] < yth), rot = body.slice(k0).concat(body.slice(0, k0));
  mk("path", { d: open(rot.filter((p) => p[1] >= yth)) + open(iF), class: "nf sil" }, g);
  mk("path", { d: open(LR(ringAt(P, run(top, front), ZT - 2))), class: "nf lo" }, g);
  mk("path", { d: open(LR(ringAt(P, run(circle(RB + 0.2), front), 2.5)).slice(2, -2)), class: "nf lo" }, g);

  /** Can c's axis at lift z, lean th and swing sw: its base point and direction. */
  function axis(c, z, th, sw) {
    const a = rad(c.az + sw), s = Math.sin(rad(th));
    return { b: [RC * Math.cos(rad(c.az)), RC * Math.sin(rad(c.az)), ZB + z], a: [s * Math.cos(a), s * Math.sin(a), Math.cos(rad(th))] };
  }
  function draw(c, now) {
    const z = tval(c.lift, now), th = tval(c.lean, now), sw = tval(c.swing, now), key = [z, th, sw].map((v) => v.toFixed(2)).join();
    if (key === c.drawn) return;
    c.drawn = key;
    const { b, a } = axis(c, z, th, sw), d = canPaths(P, frame(b, a), c.tab, (ZI + 1 - b[2]) / a[2]);
    for (const k of ["sil", "cr", "rim", "lid"]) c.el[k].setAttribute("d", d[k]);
  }

  const B = register(stage, (_dt, now) => {
    let m = false;
    for (const c of cans) { draw(c, now); if (!tdone(c.lift, now) || !tdone(c.lean, now) || !tdone(c.swing, now)) m = true; }
    return m;
  });
  bag.add(B.unregister);

  // hit: the can whose resting axis, from the ice to its lid, passes nearest the pointer on screen
  const segs = cans.map((c) => { const { b, a } = axis(c, 0, LEAN[c.i], 0), t0 = (ZI - b[2]) / a[2]; return [P(...b.map((v, k) => v + a[k] * t0)), P(...b.map((v, k) => v + a[k] * H))]; });
  function hit([sx, sy]) {
    let best = -1, bd = 16;
    segs.forEach(([p, q], i) => {
      const dx = q[0] - p[0], dy = q[1] - p[1], t = clamp(((sx - p[0]) * dx + (sy - p[1]) * dy) / (dx * dx + dy * dy), 0, 1);
      const dd = Math.hypot(sx - p[0] - t * dx, sy - p[1] - t * dy);
      if (dd < bd) { bd = dd; best = i; }
    });
    return best;
  }

  let act = null;
  function setActive(a) {
    if (a === act) return;
    const now = performance.now(), from = a >= 0 ? a : act >= 0 ? act : MARK, n = cans.length;
    act = a;
    for (const c of cans) {
      const off = ((c.i - from + n + Math.floor(n / 2)) % n) - Math.floor(n / 2), dist = Math.abs(off), delay = dist * stag;
      const picked = a >= 0 && c.i === a, aside = a >= 0 && !picked;
      tset(c.lift, picked ? LIFT : 0, now, delay);
      tset(c.lean, picked ? 0 : aside ? LEAN[c.i] + 4 : LEAN[c.i], now, delay);
      tset(c.swing, aside ? Math.sign(off) * AWAY[dist] : 0, now, delay);
      c.el.sil.classList.toggle("hi", c.i === (a >= 0 ? a : MARK));
    }
    read.textContent = a >= 0 ? `can ${a + 1}` : "rest";
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
  name: "icebucket",
  means: "An ice bucket of slim cans: the can under the pointer stands up out of the ice, and the others tilt aside in turn.",
  rules: [1, 2, 5, 6],
  range: [0, 50, 100],
  tour: [[141, 141], [233, 114], [200, 168], null],
  mount,
});
