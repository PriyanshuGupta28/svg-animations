/**
 * Queue: a message queue as a conveyor. Crates (messages) come out of a
 * producer's hatch, ride a belt on two legs through a gate, and go into a
 * worker box at the near end. Each crate carries its id as a 3 × 2 dot code
 * on its lid. The belt never stops; hovering it slows the belt on a spring so
 * a crate can be read, and the crate under the pointer takes the bright
 * stroke. At rest the gate is bright. The slider is the rate, in world units
 * a second.
 */
const {
  Cam, fit, facing, poly, prism, proj, rings, rrect, seg, unproj,
  spring, stepS, tween, tset, tval, tdone, reducedMotion, mk, pointer, place, put, register, disposer, solid,
} = HL;

const PX1 = 34, WX0 = 168, BZ = 20, BW = 34, CW = 23, CH = 17, PITCH = 31, POOL = 7, LIFT = 9, GX = 100, SLOW = 0.08, SLAT = 12;
const CY0 = (BW - CW) / 2, CY1 = CY0 + CW, LID = BZ + CH;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  const C = Cam(45, 0.5, 1.45);
  fit(C, [[-6, -10, 0], [206, BW + 10, 0], [206, -10, 0], [-6, BW + 10, 0], [-6, -10, 56], [206, -10, 56]], 200, 166);
  const P = proj(C), front = facing(C);
  let over = null, act = null, s = 6 * PITCH + 14;
  const rate = spring(value);
  const box = (x0, y0, x1, y1, z0, z1, r, b, cls) => { const el = solid(g); put(el, prism(P, front, ...rings(x0, y0, x1, y1, r, b), z0, z1)); if (cls) el.sil.setAttribute("class", cls); return el; };
  /** A rounded outline on a face: x = const (u along y, v up z) or y = const (u along x). */
  const onX = (ring, x) => poly(ring.map((q) => P(x, q.u, q.v))), onY = (ring, y) => poly(ring.map((q) => P(q.u, y, q.v)));

  const g = mk("g", {}, svg);
  // the producer, with the hatch the crates come out of
  box(-6, -8, PX1, BW + 8, 0, 44, 6, 2);
  mk("path", { class: "nf lo", d: onX(rrect(CY0 - 3, BZ - 1, CY1 + 3, LID + 4, 3, 4), PX1) }, g);
  for (const x of [56, 146]) box(x - 3, 4, x + 3, BW - 4, 0, BZ - 6, 2, 0.8);
  box(GX - 2.5, -10, GX + 2.5, -5, 0, 56, 1.6, 0.6);
  box(PX1, 0, WX0 + 8, BW, BZ - 6, BZ, 3, 1.4);
  const slats = mk("path", { class: "nf lo" }, g);

  // what is sorted by depth each frame: the crates, the gate's near post and its bar
  const slots = [];
  for (let n = 0; n < POOL; n++) {
    const grp = mk("g", {}, g), el = solid(grp), dots = [];
    for (let b = 0; b < 6; b++) dots.push(mk("circle", { r: 1.05, class: "dot off" }, grp));
    slots.push({ grp, el, dots, z: tween(0) });
  }
  const nearPost = mk("g", {}, g), bar = mk("g", {}, g);
  put(solid(nearPost), prism(P, front, ...rings(GX - 2.5, BW + 4, GX + 2.5, BW + 9, 1.6, 0.6), 0, 56));
  const barEl = solid(bar);
  put(barEl, prism(P, front, ...rings(GX - 3, -10, GX + 3, BW + 10, 2.4, 0.9), 50, 56));

  // the worker: everything that reaches it goes in behind it
  box(WX0, -8, 206, BW + 8, 0, 50, 7, 2.2);
  mk("path", { class: "nf lo", d: onY(rrect(WX0 + 8, 12, 198, 38, 3, 4), BW + 8) }, g);
  mk("path", { class: "nf lo", d: onY(rrect(WX0 + 13, 26, 193, 29, 1.5, 4), BW + 8) }, g);
  place(mk("circle", { r: 1.3, class: "dot m" }, g), P(199, BW + 8, 44));

  const xOf = (k) => PX1 + s - k * PITCH;
  function draw(sl, k, now) {
    const xc = xOf(k), x0 = Math.max(xc - CW / 2, PX1), x1 = xc + CW / 2;
    sl.el.sil.classList.toggle("hi", k === act);
    tset(sl.z, k === act ? LIFT : 0, now, 0);
    const z = tval(sl.z, now);
    put(sl.el, prism(P, front, ...rings(x0, CY0, x1, CY1, Math.min(2.4, (x1 - x0) / 2), Math.min(1.1, (x1 - x0) / 3)), BZ + z, LID + z));
    // the id, k mod 64, in six dots: lit bits medium, or bright on the crate read
    sl.dots.forEach((el, b) => {
      const x = xc + ((b % 3) - 1) * 5.2, on = ((((k % 64) + 64) % 64) >> b) & 1;
      el.setAttribute("r", x > x0 + 1.5 ? 1.05 : 0);
      el.setAttribute("class", on ? (k === act ? "dot" : "dot m") : "dot off");
      place(el, P(x, BW / 2 + (Math.floor(b / 3) - 0.5) * 5.5, LID + z));
    });
  }

  let order = "";
  const B = register(stage, (dt, now) => {
    const m = stepS(rate, dt);
    if (!reducedMotion()) s += rate.x * dt;
    // The crates on the belt: from the hatch (xc - CW/2 < PX1 still cut) to inside the worker.
    const kHi = Math.floor((s + CW / 2 - 1.5) / PITCH), ks = [];
    for (let k = kHi; k > kHi - POOL; k--) if (xOf(k) - CW / 2 < WX0 + 4) ks.push(k);
    act = null;
    if (over) for (const k of ks) { const xc = xOf(k); if (over[0] > Math.max(xc - CW / 2, PX1) && over[0] < xc + CW / 2 && over[1] > CY0 - 2 && over[1] < CY1 + 2) act = k; }
    const shown = new Set(ks.map((k) => ((k % POOL) + POOL) % POOL));
    slots.forEach((sl, n) => { if (!shown.has(n)) { put(sl.el, { sil: "", crease: "" }); sl.dots.forEach((el) => el.setAttribute("r", 0)); } });
    for (const k of ks) draw(slots[((k % POOL) + POOL) % POOL], k, now);
    let d = "";
    for (let x = PX1 + 3 + (s % SLAT); x < WX0; x += SLAT) d += seg(P(x, 3, BZ), P(x, BW - 3, BZ));
    slats.setAttribute("d", d);
    // Back to front by x + y: farther crates first, the near post once a crate is past it, the bar after the post.
    const items = ks.map((k) => [xOf(k) + BW / 2, slots[((k % POOL) + POOL) % POOL].grp]).concat([[GX + BW + 6, nearPost], [GX + BW + 7, bar]]);
    items.sort((a, b) => a[0] - b[0]);
    const key = items.map((i) => (i[1] === nearPost ? "n" : i[1] === bar ? "b" : slots.indexOf(i[1]))).join();
    if (key !== order) { order = key; let prev = slats; for (const [, el] of items) { prev.after(el); prev = el; } }
    barEl.sil.classList.toggle("hi", act === null);
    read.textContent = act === null ? "rest" : "msg " + String(((act % 100) + 100) % 100).padStart(2, "0");
    return !reducedMotion() || m || slots.some((sl) => !tdone(sl.z, now));
  });
  bag.add(B.unregister);

  function retarget() { rate.t = over ? value * SLOW : value; B.wake(); }
  bag.add(pointer(stage, {
    move: (p) => {
      const w = unproj(C, p[0], p[1], LID);
      over = w[0] < PX1 || w[0] > WX0 || w[1] < -10 || w[1] > BW + 10 ? null : w;
      retarget();
    },
    leave: () => { over = null; retarget(); },
  }));
  bag.add(() => svg.replaceChildren());
  retarget();

  return {
    set: (v) => { value = v; retarget(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "queue",
  means: "A message queue as a conveyor: crates ride through a gate to a worker; hovering slows the belt so one message can be read.",
  rules: [1, 4, 7, 10],
  range: [10, 22, 40],
  tour: [[159, 134], [200, 155], [240, 176], null],
  mount,
});
