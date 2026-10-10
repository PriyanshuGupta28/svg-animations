/**
 * Hopper: an LLM's output as a token hopper. A tapered hopper on two posts,
 * heaped with tiles, pours them from its spout in a stream: each tile drops,
 * tumbling a little and spreading from the next as it falls, lands on a
 * sloped chute, slides down it and tips off the end into a bin. Each tile
 * carries its id as a 2 × 2 dot code on its face. The pour never stops;
 * hovering the stream slows it on a spring so one token can be read, and the
 * tile nearest the pointer takes the bright stroke. At rest the hopper is
 * bright. The slider is the rate, in world units a second.
 */
const {
  Cam, fit, facing, tween, tset, tval, tdone, hull, lerp, open, poly, prism, proj, ringAt, rings, rrect, run,
  spring, stepS, reducedMotion, disposer, mk, place, pointer, put, register, solid,
} = HL;

/** Tile half-size and thickness, spout exit and half-width, hopper foot/top, chute top, length, slope and half-width, bin. */
const TS = 5.5, TK = 3.4, ZS = 76, SH = 7.5, ZH0 = 86, ZH1 = 108, HF = 9.5, HT = 21;
const ZC = 30, LC = 72, TA = 0.3, CW = 7.5, BX0 = LC - 6, BX1 = LC + 40, BY = 24, BH = 9, AC = 0.006, LIFT = 14;
const AL = Math.atan(TA), DROP = ZS - ZC, UF = 1.5 * DROP, US = (Math.sqrt(1 + 4 * AC * LC) - 1) / (2 * AC), UE = UF + US, UD = 20, UEND = UE + UD;
const PITCH = 15, POOL = Math.ceil(UEND / PITCH) + 1, SLOW = 0.06, START = 214 * PITCH + 70;
const PILE = [[LC + 7, 11, 0.1, 2], [LC + 10, -9, -0.12, 2], [LC + 16, 3, 0.25, 4.6], [LC + 21, -10, 0.08, 2], [LC + 26, 10, -0.2, 2], [LC + 30, -1, 0.1, 2]];
const LR = (pts) => (pts[0][0] <= pts[pts.length - 1][0] ? pts : pts.slice().reverse());
const depth = (x, y, z) => 0.612 * (x + y) + 0.5 * z;
const bits = (k) => ((k % 16) + 16) % 16;

/** Where token u (path length) sits: bottom centre and tilt. It falls from the spout, slides the chute gathering speed, then tips into the bin. */
function at(u, k) {
  const tumble = 0.45 * Math.sin(k * 2.39 + 0.6);
  if (u < UF) { const w = u / UF; return [0, 0, ZS - DROP * (0.5 * w + 0.5 * w * w), lerp(tumble, AL, w)]; }
  if (u < UE) { const x = (u - UF) * (1 + AC * (u - UF)); return [x, 0, ZC - x * TA, AL]; }
  const w = (u - UE) / UD;
  return [LC + w * 14, 0, ZC - LC * TA - (ZC - LC * TA - 3) * w * w, lerp(AL, -tumble, w)];
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  const C = Cam(45, 0.5, 1.56);
  fit(C, [[-32, -26, 0], [BX1 + 4, 26, 0], [BX1 + 4, -26, 0], [-32, 26, 0], [-HT, -HT, ZH1], [HT, -HT, ZH1], [-HT, HT, ZH1]], 200, 164);
  const P = proj(C), front = facing(C);
  const rate = spring(value);
  let s = START, over = null, act = null, rateV = value, order = "", txt = "";
  const g = mk("g", {}, svg);
  const box = (x0, y0, x1, y1, z0, z1, r, b) => put(solid(g), prism(P, front, ...rings(x0, y0, x1, y1, r, b), z0, z1));
  /** A slab lying on the chute's slope: z0, z1 measured from the chute's floor at each x. */
  const slab = (x0, y0, x1, y1, z0, z1, r, b) => {
    const [ring, inner] = rings(x0, y0, x1, y1, r, b), w = (q, z) => P(q.u, q.v, ZC - q.u * TA + z);
    put(solid(g), { sil: poly(hull(ring.map((q) => w(q, z0)).concat(ring.map((q) => w(q, z1))))), crease: open(run(inner, front).map((q) => w(q, z1))) });
  };
  const tileRing = rings(-TS, -TS, TS, TS, 1.8, 0.9);
  /** A tile's silhouette, crease and dot points, at bottom centre (x, y, z) tilted th about y. */
  function tile(x, y, z, th) {
    const c = Math.cos(th), sn = Math.sin(th), w = (q, t) => P(x + q.u * c + t * sn, y + q.v, z - q.u * sn + t * c);
    const [ring, inner] = tileRing;
    return {
      sil: poly(hull(ring.map((q) => w(q, 0)).concat(ring.map((q) => w(q, TK))))),
      crease: open(run(inner, front).map((q) => w(q, TK))),
      dots: [0, 1, 2, 3].map((b) => w({ u: (b % 2 ? 1 : -1) * 2, v: (b < 2 ? -1 : 1) * 2 }, TK)),
    };
  }
  const mkTile = (parent) => { const grp = mk("g", {}, parent), el = solid(grp); return { grp, el, dots: [0, 1, 2, 3].map(() => mk("circle", { r: 1, class: "dot off" }, grp)) }; };
  const showTile = (t, q, k, hi) => {
    put(t.el, q);
    t.el.sil.classList.toggle("hi", hi);
    t.dots.forEach((el, b) => { place(el, q.dots[b]); el.setAttribute("class", (bits(k) >> b) & 1 ? (hi ? "dot" : "dot m") : "dot off"); });
  };

  // back to front: base, posts, chute leg, the bin's far half, the chute's floor and far wall
  box(-32, -26, BX1 + 4, 26, 0, 2, 8, 2);
  for (const y of [-16, 12]) box(-28, y, -23, y + 4, 2, ZH1 - 6, 1.6, 0.7);
  box(-28, -16, -23, 16, ZH1 - 14, ZH1 - 9, 1.6, 0.7);
  box(4, -3, 10, 3, 2, ZC - 3.6, 1.8, 0.8);
  const outer = rrect(BX0, -BY, BX1, BY, 6, 6), inner = rrect(BX0 + 2.4, -BY + 2.4, BX1 - 2.4, BY - 2.4, 3.6, 6);
  mk("path", { class: "sil", d: poly(hull(ringAt(P, outer, 2).concat(ringAt(P, outer, BH)))) }, g);
  mk("path", { class: "nf", d: poly(ringAt(P, inner, BH)) }, g);
  slab(-10, -CW - 2, LC, CW + 2, -2, 0, 2, 1);
  slab(-10, -CW - 2, LC, -CW, 0, 5, 1, 0.5);

  // the stream, sorted by depth each frame, then the bin's heap
  const tg = mk("g", {}, g), slots = [];
  for (let n = 0; n < POOL; n++) slots.push(Object.assign(mkTile(tg), { lift: tween(0) }));
  PILE.map(([x, y, th, z], i) => [x, y, th, z, i]).sort((a, b) => depth(a[0], a[1], a[3]) - depth(b[0], b[1], b[3]))
    .forEach(([x, y, th, z, i]) => showTile(mkTile(g), tile(x, y, z, th), 5 + i * 3, false));

  // the chute's near wall, the bin's near half, then the hopper over everything it pours into
  slab(-10, CW, LC, CW + 2, 0, 5, 1, 0.5);
  const iF = LR(ringAt(P, run(inner, front), BH)), oT = LR(ringAt(P, run(outer, front), BH)), oB = LR(ringAt(P, run(outer, front), 2));
  mk("path", { class: "fo", d: poly([...iF, oT[oT.length - 1], ...oB.slice().reverse(), oT[0]]) }, g);
  mk("path", { class: "nf lo", d: open(oT) }, g);
  mk("path", { class: "nf", d: open(iF) }, g);
  mk("path", { class: "nf sil", d: open([oT[0], ...oB, oT[oT.length - 1]]) }, g);
  box(-SH, -SH, SH, SH, ZS, ZH0 + 2, 2.4, 1);
  const foot = rrect(-HF, -HF, HF, HF, 4, 5), top = rrect(-HT, -HT, HT, HT, 6, 5), rim = rrect(-HT + 2, -HT + 2, HT - 2, HT - 2, 4, 5);
  const hop = solid(g);
  put(hop, { sil: poly(hull(ringAt(P, foot, ZH0).concat(ringAt(P, top, ZH1)))), crease: open(ringAt(P, run(rim, front), ZH1)) });
  mk("path", { class: "nf", d: poly(ringAt(P, rim, ZH1)) }, g);
  // the heap inside: tile tops lying just under the rim
  for (const [x, y] of [[-6, -7], [5, -9], [-9, 4], [3, 2], [-1, 12], [10, 8]]) mk("path", { class: "lo", d: poly(ringAt(P, rrect(x - TS, y - TS, x + TS, y + TS, 1.8, 3), ZH1 - 2.5)) }, g);

  // the stream's hit zone: the spout's mouth down the column to the chute and the bin; it never moves
  const zone = hull([[-SH, -SH, ZS], [SH, SH, ZS], [-SH, SH, ZS], [SH, -SH, ZS], [-10, -CW, ZC + 2], [-10, CW, ZC + 2], [LC, -CW, ZC - LC * TA], [LC, CW, ZC - LC * TA], [BX1, -BY, BH], [BX1, BY, BH], [BX0, BY, BH]].map((p) => P(...p)));
  const inside = ([x, y]) => {
    let c = false;
    for (let i = 0, j = zone.length - 1; i < zone.length; j = i++) {
      const [xi, yi] = zone[i], [xj, yj] = zone[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };

  let first = true;
  const B = register(stage, (dt, now) => {
    const m = stepS(rate, dt);
    if (!reducedMotion()) s += rate.x * dt;
    const live = [];
    for (let k = Math.floor(s / PITCH); s - k * PITCH <= UEND; k--) {
      const u = s - k * PITCH, [x, y, z, th] = at(u, k);
      live.push({ k, x, y, z, th, c: P(x, y, z + TK), sl: slots[((k % POOL) + POOL) % POOL] });
    }
    // the token read is the one whose place in the stream, unlifted, is nearest the pointer
    act = null;
    if (over) { let bd = Infinity; for (const t of live) { const dd = Math.hypot(t.c[0] - over[0], t.c[1] - over[1]); if (dd < bd) { bd = dd; act = t.k; } } }
    let lifting = false;
    for (const t of live) {
      tset(t.sl.lift, t.k === act ? 1 : 0, now, 0);
      const l = tval(t.sl.lift, now);
      if (!tdone(t.sl.lift, now)) lifting = true;
      t.q = tile(t.x, t.y, t.z + LIFT * l, lerp(t.th, 0, l));
      t.d = depth(t.x, t.y, t.z + LIFT * l);
    }
    const used = new Set(live.map((t) => t.sl));
    for (const sl of slots) sl.grp.setAttribute("display", used.has(sl) ? "inline" : "none");
    for (const t of live) showTile(t.sl, t.q, t.k, t.k === act);
    live.sort((a, b) => a.d - b.d);
    const key = live.map((t) => slots.indexOf(t.sl)).join();
    if (key !== order) { order = key; for (const t of live) tg.append(t.sl.grp); }
    hop.sil.classList.toggle("hi", act === null);
    const tx = act === null ? "rest" : "token " + act;
    if (tx !== txt) read.textContent = txt = tx;
    const more = first || m || lifting || !reducedMotion();
    first = false;
    return more;
  });
  bag.add(B.unregister);

  function retarget() { rate.t = over ? rateV * SLOW : rateV; B.wake(); }
  bag.add(pointer(stage, {
    move: (p) => { over = inside(p) ? p : null; retarget(); },
    leave: () => { over = null; retarget(); },
  }));
  bag.add(() => svg.replaceChildren());
  retarget();

  return {
    set: (v) => { rateV = v; retarget(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "hopper",
  means: "Tokens pour from a hopper down a chute into a bin; hovering the stream slows the pour so one token can be read.",
  rules: [1, 4, 7, 8],
  range: [16, 30, 52],
  tour: [[154, 135], [187, 193], [242, 243], null],
  mount,
});
