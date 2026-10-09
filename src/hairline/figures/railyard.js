/**
 * Railyard: Git branches as a rail yard. A lead track, a ladder, four switches fanning into five sidings
 * that end at buffer stops. The pointer picks a siding (fixed bands on the ground); the switches on the way
 * throw toward it, staggered outwards, and the wagon rolls onto it, backing out to the switch first when it
 * stands on another branch. Rest: wagon half into siding 3, switches set unevenly, siding 3 bright.
 */
const {
  Cam, fit, facing, hull, open, poly, prism, proj, ringAt, rings, seg, unproj, lerp, rad,
  tween, tset, tval, tdone, disposer, mk, pointer, put, register, solid,
} = HL;

const N = 5, G = 17, D = 24, RT = 11, LEAD = 40, GA = 3, SP = 4.6, BL = 12;
const END = [150, 158, 152, 142, 130];
const REST_T = [0, 0, 1, 0.4], MARK = 2;
const WL = 28, WW = 13, WZ0 = 5, WZ1 = 14;

/** A polyline with its cumulative length. */
function path(pts) {
  const cum = [0];
  for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
  return { pts, cum, len: cum[cum.length - 1] };
}
/** [x, y, hx, hy]: the point at distance s along a path, and its heading. */
function at(pa, s) {
  const { pts, cum } = pa;
  let k = 1;
  while (k < pts.length - 1 && cum[k] < s) k++;
  const a = pts[k - 1], b = pts[k], l = cum[k] - cum[k - 1] || 1, f = Math.min(Math.max((s - cum[k - 1]) / l, 0), 1);
  return [lerp(a[0], b[0], f), lerp(a[1], b[1], f), (b[0] - a[0]) / l, (b[1] - a[1]) / l];
}
const slice = (pa, s0, s1) => path([at(pa, s0), ...pa.pts.filter((_, k) => pa.cum[k] > s0 && pa.cum[k] < s1), at(pa, s1)].map((q) => [q[0], q[1]]));

/** The route from the lead to siding a, corners rounded; sc is where its turnout begins. */
function route(a) {
  const raw = a === 0 ? [[-LEAD, 0], [END[0], 0]] : [[-LEAD, 0], [0, 0], [a * D, a * G], [END[a], a * G]];
  const out = [raw[0]];
  let ic = -1;
  for (let k = 1; k < raw.length - 1; k++) {
    const A = raw[k - 1], B = raw[k], C2 = raw[k + 1];
    const u = (p) => { const l = Math.hypot(p[0] - B[0], p[1] - B[1]); return [B[0] + (p[0] - B[0]) / l * RT, B[1] + (p[1] - B[1]) / l * RT]; };
    const t1 = u(A), t2 = u(C2);
    ic = out.length;
    for (let j = 0; j <= 8; j++) { const f = j / 8, g = 1 - f; out.push([g * g * t1[0] + 2 * g * f * B[0] + f * f * t2[0], g * g * t1[1] + 2 * g * f * B[1] + f * f * t2[1]]); }
  }
  out.push(raw[raw.length - 1]);
  const pa = path(out);
  pa.sc = a === 0 ? LEAD - RT : pa.cum[ic];
  return pa;
}

/** Turn a ring of samples by ang about the origin and move it to (cx, cy). */
const rot = (ring, cx, cy, c, s) => ring.map((q) => ({ u: cx + q.u * c - q.v * s, v: cy + q.u * s + q.v * c, nu: q.nu * c - q.nv * s, nv: q.nu * s + q.nv * c }));

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;
  const routes = [];
  for (let a = 0; a < N; a++) routes.push(route(a));
  const sSw = routes.map((r) => r.sc);

  const C = Cam(45, 0.5, 1.9);
  fit(C, [[-LEAD, -14, 0], [END[1] + 5, 0, 0], [END[4] + 5, (N - 1) * G + GA + 3, 0], [-LEAD, 10, 0], [-LEAD, -14, 16], [END[1], 0, 14]], 200, 166);
  const P = proj(C), front = facing(C);

  // Track: sleepers under two rails, every piece flat on the ground, painted first.
  function trackD(pa) {
    const nr = pa.pts.map((_, k) => { const a = pa.pts[Math.max(k - 1, 0)], b = pa.pts[Math.min(k + 1, pa.pts.length - 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [-(b[1] - a[1]) / l, (b[0] - a[0]) / l]; });
    const rail = (o) => open(pa.pts.map((p, k) => P(p[0] + nr[k][0] * o, p[1] + nr[k][1] * o, 0)));
    let sl = "";
    for (let s = SP / 2; s < pa.len; s += SP) { const [x, y, hx, hy] = at(pa, s), o = GA + 2.2; sl += seg(P(x - hy * o, y + hx * o, 0), P(x + hy * o, y - hx * o, 0)); }
    return { rails: rail(GA) + rail(-GA), sl };
  }
  const g = mk("g", {}, svg), tg = mk("g", {}, g), lay = mk("g", {}, g);
  const pieces = [slice(routes[0], 0, sSw[0]), slice(routes[N - 1], sSw[0], sSw[N - 1])].map(trackD);
  const sidings = routes.map((r, a) => trackD(slice(r, sSw[a], r.len)));
  for (const t of [...pieces, ...sidings]) mk("path", { d: t.sl, class: "nf lo" }, tg);
  for (const t of pieces) mk("path", { d: t.rails, class: "nf sil" }, tg);
  const railEls = sidings.map((t) => mk("path", { d: t.rails, class: "nf sil" }, tg));

  // Solids stand on the track: switch stands, buffer stops, the wagon. Painted by x + y.
  const statics = [], switches = [];
  for (let i = 0; i < N - 1; i++) {
    const [x, y, hx, hy] = at(routes[i], sSw[i]), sd = i === 0 ? -1 : 1, o = GA + 7;
    const sx = x - hy * o * sd, sy = y + hx * o * sd, sgr = mk("g", {}, null);
    const [r0, r1] = rings(sx - 2, sy - 2, sx + 2, sy + 2, 1, 0.6);
    put(solid(sgr), prism(P, front, r0, r1, 0, 3));
    mk("path", { d: seg(P(sx, sy, 3), P(sx, sy, 10)), class: "nf sil" }, sgr);
    const disc = mk("path", { class: "sil" }, sgr), blade = mk("path", { class: "nf sil" }, tg);
    statics.push({ g: sgr, key: sx + sy });
    switches.push({ i, x, y, sx, sy, disc, blade, t: tween(REST_T[i]), drawn: NaN });
  }
  const buffers = [];
  for (let a = 0; a < N; a++) {
    const bgr = mk("g", {}, null), e = END[a], y = a * G;
    const [r0, r1] = rings(e - 1, y - GA - 3, e + 4, y + GA + 3, 1.5, 1);
    put(solid(bgr), prism(P, front, r0, r1, 0, 5));
    const [b0, b1] = rings(e - 3, y - GA - 2, e - 1, y + GA + 2, 0.8, 0.5);
    const bm = solid(bgr); put(bm, prism(P, front, b0, b1, 2.5, 4.5)); buffers.push(bm.sil);
    statics.push({ g: bgr, key: e + y });
  }
  statics.sort((p, q) => p.key - q.key).forEach((s) => lay.append(s.g));

  function drawSwitch(k, t) {
    if (t === k.drawn) return;
    k.drawn = t;
    // the target turns from edge-on (set for the ladder) to broadside (set for its siding)
    const ph = rad(lerp(45, -45, t)), e1 = [Math.cos(ph), Math.sin(ph)], pts = [];
    for (let j = 0; j < 16; j++) { const q = (j / 16) * Math.PI * 2, c = 3.2 * Math.cos(q); pts.push(P(k.sx + e1[0] * c, k.sy + e1[1] * c, 12.5 + 3.2 * Math.sin(q))); }
    k.disc.setAttribute("d", poly(pts));
    const th = at(routes[k.i + 1], sSw[k.i] + BL), dv = at(routes[k.i], sSw[k.i] + BL);
    k.blade.setAttribute("d", seg(P(k.x, k.y, 0), P(lerp(th[0], dv[0], t), lerp(th[1], dv[1], t), 0)));
  }

  // The wagon: an open box on a narrower underframe, two wheels showing, two stanchions on its side.
  const wg = mk("g", {}, lay), under = solid(wg), wheels = mk("path", { class: "" }, wg), body = solid(wg);
  const mouth = mk("path", { class: "nf lo" }, wg), ribs = mk("path", { class: "nf lo" }, wg);
  const [bo, bi] = rings(-WL / 2, -WW / 2, WL / 2, WW / 2, 2, 1.2), [uo, ui] = rings(-WL / 2 + 3, -WW / 2 + 2, WL / 2 - 3, WW / 2 - 2, 1.5, 0.8);
  const wag = { cur: MARK, want: MARK, w: tween(sSw[MARK] + 24), drawn: "", key: NaN };
  function drawWagon(s) {
    const key = wag.cur + "," + s;
    if (key === wag.drawn) return;
    wag.drawn = key;
    const [x, y, c, sn] = at(routes[wag.cur], s), R = (r) => rot(r, x, y, c, sn);
    put(under, prism(P, front, R(uo), R(ui), 2.5, WZ0));
    let wd = "";
    for (const f of [-8, 8]) {
      const pts = [], cx = x + c * f - sn * (WW / 2 - 1), cy = y + sn * f + c * (WW / 2 - 1);
      for (let j = 0; j < 14; j++) { const q = (j / 14) * Math.PI * 2; pts.push(P(cx + c * 3.4 * Math.cos(q), cy + sn * 3.4 * Math.cos(q), 3.4 + 3.4 * Math.sin(q))); }
      wd += poly(pts);
    }
    wheels.setAttribute("d", wd);
    put(body, { sil: poly(hull(ringAt(P, R(bo), WZ0).concat(ringAt(P, R(bo), WZ1)))), crease: "" });
    mouth.setAttribute("d", poly(ringAt(P, R(bi), WZ1)));
    const side = (f, z) => P(x + c * f - sn * WW / 2, y + sn * f + c * WW / 2, z);
    ribs.setAttribute("d", [-4.5, 4.5].map((f) => seg(side(f, WZ0 + 0.6), side(f, WZ1 - 0.6))).join(""));
    const k = x + y;
    if (k !== wag.key) {
      wag.key = k;
      const next = statics.find((st) => st.key > k);
      if (next) { if (wg.nextSibling !== next.g) next.g.before(wg); } else lay.append(wg);
    }
  }

  let act = null;
  /** Route the wagon: back out to the shared switch if it stands on another branch, then roll to the target. */
  function plan(now) {
    const tgt = act < 0 ? sSw[MARK] + 24 : routes[wag.want].len - 20;
    if (wag.want !== wag.cur) {
      const j = sSw[Math.min(wag.cur, wag.want)];
      if (tval(wag.w, now) > j + 1e-3) { tset(wag.w, j, now, 0); return; }
      wag.cur = wag.want;
    }
    tset(wag.w, tgt, now, 0);
  }

  const B = register(stage, (_dt, now) => {
    let m = false;
    for (const k of switches) { drawSwitch(k, tval(k.t, now)); if (!tdone(k.t, now)) m = true; }
    if (wag.cur !== wag.want && tdone(wag.w, now)) plan(now);
    drawWagon(tval(wag.w, now));
    return m || !tdone(wag.w, now) || wag.cur !== wag.want;
  });
  bag.add(B.unregister);
  /** The siding whose fixed band on the ground holds the pointer; -1 for none. */
  function hit([sx, sy]) {
    const [x, y] = unproj(C, sx, sy, 0), a = Math.round(y / G);
    if (a < 0 || a >= N || Math.abs(y - a * G) > G / 2) return -1;
    return x >= a * D - RT && x <= END[a] + 6 ? a : -1;
  }

  function setActive(a) {
    if (a === act) return;
    const now = performance.now(), from = a >= 0 ? a : act >= 0 ? act : MARK;
    act = a;
    for (const k of switches) {
      const to = a < 0 ? REST_T[k.i] : k.i < a ? 0 : k.i === a ? 1 : null;
      if (to !== null) tset(k.t, to, now, Math.abs(k.i - from) * stag);
    }
    railEls.forEach((el, i) => { const on = i === (a < 0 ? MARK : a); el.classList.toggle("hi", on); buffers[i].classList.toggle("hi", on); });
    wag.want = a < 0 ? MARK : a;
    plan(now);
    read.textContent = a < 0 ? "rest" : `branch ${a + 1}`;
    B.wake();
  }

  bag.add(pointer(stage, { move: (p) => setActive(hit(p)), leave: () => setActive(-1) }));
  bag.add(() => svg.replaceChildren());
  setActive(-1);

  return { set: (v) => { stag = v; }, destroy: bag.dispose };
}

hairline({
  name: "railyard",
  means: "Branches as a rail yard: the switches throw toward the siding under the pointer, and the wagon rolls onto it.",
  rules: [1, 2, 5, 8],
  range: [0, 45, 90],
  tour: [[181, 247], [286, 208], [224, 246], null],
  mount,
});
