/**
 * Cantower: a display pyramid of slim cans on a low riser, three tiers,
 * the floor one short a corner can, each upper can sitting on the lids below. Each
 * can steps in at its foot, necks in under a rolled rim, and has its pull tab
 * turned its own way. The pointer is held against the stack's resting
 * outline: the cans near it lift off their seats and lean away from it, the
 * farther the less, each on its own springs; a can is carried by the ones it
 * sits on, and neighbours' leans are clamped together so none passes through
 * another. At rest the top can sits askew and is bright. The slider is the
 * radius, in cans.
 */
const {
  Cam, circ, clamp, facing, fit, hull, open, poly, proj, rad, rings, rrect, run,
  spring, stepS, disposer, mk, pointer, put, prism, register, solid,
} = HL;

const R = 5, H = 26, PITCH = 12, TIERS = [3, 2, 1], LIFT = 13, LEAN = 12, DLEAN = 3.5, PB = 5, PE = 25;
const V = [0.612, 0.612, 0.5], SD = [Math.SQRT1_2, -Math.SQRT1_2, 0];
/** Rest: the top can sits off its seat a little, turned and leaning; one corner can of the floor tier has been taken. */
const TOP = { dx: 1.6, dy: -1.2, lean: 4 }, GONE = [PITCH, -PITCH];

const norm = (a) => { const l = Math.hypot(...a); return a.map((x) => x / l); };
/** A can's frame: base centre b, axis a; w(u, v, h) in world, h from the foot up. */
function frame(b, a) {
  const e1 = norm([a[2], 0, -a[0]]), e2 = [a[1] * e1[2] - a[2] * e1[1], a[2] * e1[0] - a[0] * e1[2], a[0] * e1[1] - a[1] * e1[0]];
  return (u, v, h) => [0, 1, 2].map((k) => b[k] + u * e1[k] + v * e2[k] + h * a[k]);
}
const CS = circ(1, 22), TAB = rrect(-0.7, -1.1, 2.6, 1.1, 1, 3);
const PROF = [[0, R * 0.8], [1.4, R], [H - 4, R], [H - 1.2, R * 0.8], [H, R * 0.8]];
/** A slim can: stepped foot, neck taper, a shoulder crease, the rolled rim (two rings), the lid and its tab turned by `tab` degrees. */
function canPaths(P, w, tab) {
  const at = (h, r) => CS.map((q) => P(...w(q.u * r, q.v * r, h)));
  const o = w(0, 0, 0), out = (q) => { const p = w(q.nu, q.nv, 0); return (p[0] - o[0]) * V[0] + (p[1] - o[1]) * V[1] + (p[2] - o[2]) * V[2] > 0; };
  const c = Math.cos(rad(tab)), s = Math.sin(rad(tab));
  return {
    sil: poly(hull(PROF.flatMap(([h, r]) => at(h, r)))),
    cr: open(run(CS, out).map((q) => P(...w(q.u * R, q.v * R, H - 4)))),
    rim: poly(at(H, R * 0.8)) + poly(at(H - 0.2, R * 0.66)),
    lid: poly(TAB.map((q) => P(...w(q.u * c - q.v * s, q.u * s + q.v * c, H - 0.2)))),
  };
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let rad0 = value;

  const S = 2.75, C = Cam(45, 0.5, S);
  const zTop = TIERS.length * H;
  fit(C, [[-PE, -PE, -PB], [PE, PE, -PB], [PE, -PE, -PB], [-PE, PE, -PB], [-PE, PE, H], [PE, -PE, H], [0, 0, zTop + LIFT + 3]], 200, 166);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  const [pr, pi] = rings(-PE, -PE, PE, PE, 7, 2);
  put(solid(g), prism(P, front, pr, pi, -PB, 0));

  // the cans, tier by tier from the floor, and by ascending x + y in a tier, so nearer and higher cans paint later
  const cans = [];
  TIERS.forEach((n, t) => {
    const list = [];
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) list.push([(i - (n - 1) / 2) * PITCH, (j - (n - 1) / 2) * PITCH]);
    list.sort((a, b) => a[0] + a[1] - b[0] - b[1]);
    for (const [x, y] of list) {
      if (t === 0 && x === GONE[0] && y === GONE[1]) continue;
      const el = { g: mk("g", {}, g) };
      el.sil = mk("path", { class: "sil" }, el.g); el.cr = mk("path", { class: "nf lo" }, el.g);
      el.rim = mk("path", { class: "nf" }, el.g); el.lid = mk("path", { class: "nf lo" }, el.g);
      const top = t === TIERS.length - 1;
      cans.push({ t, x: x + (top ? TOP.dx : 0), y: y + (top ? TOP.dy : 0), z: t * H, el, tab: (cans.length * 67) % 360,
        rl: top ? TOP.lean : 0, lift: spring(0), lean: spring(top ? TOP.lean : 0), drawn: "" });
    }
  });
  // what each can sits on, and its neighbours in its own tier
  for (const c of cans) {
    c.on = cans.filter((d) => d.t === c.t - 1 && Math.abs(d.x - c.x) < PITCH && Math.abs(d.y - c.y) < PITCH);
    c.nb = cans.filter((d) => d !== c && d.t === c.t && Math.hypot(d.x - c.x, d.y - c.y) < PITCH * 1.5);
    const p = P(c.x, c.y, c.z + H / 2);
    c.sx = p[0]; c.sy = p[1]; c.top = P(c.x, c.y, c.z + H)[1] - R * S * 0.5; c.bot = P(c.x, c.y, c.z)[1] + R * S * 0.5;
  }

  function draw(c) {
    const lf = c.lift.x, ln = c.lean.x, key = lf.toFixed(2) + "," + ln.toFixed(2);
    if (key === c.drawn) return;
    c.drawn = key;
    const s = Math.sin(rad(ln)), a = [SD[0] * s, SD[1] * s, Math.cos(rad(ln))];
    const w = frame([c.x, c.y, c.z + lf + R * Math.abs(s)], a), d = canPaths(P, w, c.tab);
    for (const k of ["sil", "cr", "rim", "lid"]) c.el[k].setAttribute("d", d[k]);
  }

  const B = register(stage, (dt) => {
    let m = false;
    for (const c of cans) { if (stepS(c.lift, dt)) m = true; if (stepS(c.lean, dt)) m = true; draw(c); }
    return m;
  });
  bag.add(B.unregister);

  // hit: the last-painted can whose resting outline on screen holds the pointer
  const half = R * S * 0.95;
  const hit = ([sx, sy]) => cans.reduce((b, c, i) => (Math.abs(sx - c.sx) < half && sy > c.top && sy < c.bot ? i : b), -1);

  let over = null;
  function retarget() {
    const a = over ? hit(over) : -1, Rs = rad0 * PITCH * S;
    const tl = cans.map((c) => (over ? LEAN * clamp((c.sx - over[0]) / (Rs * 0.35), -1, 1) * Math.max(0, 1 - Math.hypot(c.sx - over[0], c.sy - over[1]) / Rs) : c.rl));
    // neighbours lean nearly together, so no top swings into the can beside it
    for (let pass = 0; pass < 4; pass++) cans.forEach((c, i) => c.nb.forEach((d) => {
      const j = cans.indexOf(d), e = tl[i] - tl[j];
      if (Math.abs(e) > DLEAN) { const f = (Math.abs(e) - DLEAN) / 2 * Math.sign(e); tl[i] -= f; tl[j] += f; }
    }));
    cans.forEach((c, i) => {
      const own = over ? LIFT * Math.max(0, 1 - Math.hypot(c.sx - over[0], c.sy - over[1]) / Rs) ** 1.4 : 0;
      // a can is carried by what it sits on: never below the highest seat under it
      const seat = c.on.reduce((m, d) => Math.max(m, d.lift.t + R * Math.abs(Math.sin(rad(d.lean.t)))), 0);
      c.lift.t = clamp(Math.max(own, seat), 0, LIFT + 4);
      c.lean.t = clamp(tl[i], -LEAN, LEAN);
      c.el.sil.classList.toggle("hi", i === (a < 0 ? cans.length - 1 : a));
    });
    read.textContent = a < 0 ? "rest" : `can ${a + 1}`;
    B.wake();
  }

  bag.add(pointer(stage, {
    move: (p) => { over = p; retarget(); },
    leave: () => { over = null; retarget(); },
  }));
  bag.add(() => svg.replaceChildren());
  retarget();

  return {
    set: (v) => { rad0 = v; retarget(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "cantower",
  means: "A pyramid of slim cans: the cans near the pointer lift off their seats and lean away, the farther the less.",
  rules: [1, 3, 5, 6],
  range: [1.2, 2, 3],
  tour: [[153, 217], [223, 141], [200, 93], null],
  mount,
});
