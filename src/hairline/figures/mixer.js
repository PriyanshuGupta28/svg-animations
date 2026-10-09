/**
 * Mixer: a mixing desk of eight channel strips. Each strip has two small
 * knobs at the far end, a long fader slot with scale ticks, a fader cap that
 * rides it, and a dot meter beside the slot that reads the fader's level.
 * The pointer is read on the desk's top, which never moves; faders near it
 * slide up their slots on springs, falling off with distance. At rest the
 * desk holds an uneven mix and the loudest cap is bright. The slider is the
 * radius, in world units.
 */
const {
  Cam, clamp, facing, fit, prism, proj, rings, ringAt, poly, seg, unproj, spring, stepS,
  flatDot, mk, place, pointer, put, register, disposer, solid,
} = HL;

const N = 8, PX = 18, YT = 28, YB = 92, CZ = 7, ND = 6;
const X1 = N * PX, DX0 = -4, DX1 = X1 + 4, DY0 = -6, DY1 = 102;
const REST = [0.52, 0.68, 0.4, 0.86, 0.62, 0.28, 0.5, 0.36];
const KA = [[30, 160], [100, 60], [200, 20], [140, 90], [60, 220], [250, 120], [10, 300], [170, 40]];
const MARK = 3;
const cxOf = (i) => i * PX + PX / 2;
const yOf = (lv) => YB - 4 - clamp(lv, 0, 1) * (YB - YT - 8);
/** Share of full travel at u radii: 1 → .31 at 42% → .09 beyond. */
const falloff = (u) =>
  u <= 0 ? 1 : u <= 0.417 ? 1 - (u / 0.417) * 0.6875 : u <= 1 ? 0.3125 - ((u - 0.417) / 0.583) * 0.2185 : 0.094;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let R = value, over = null;
  const C = Cam(45, 0.5, 1.7);
  fit(C, [[DX0, DY0, -7], [DX1, DY1, -7], [DX1, DY0, -7], [DX0, DY1, -7], [DX0, DY0, 6]], 200, 166);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  const [dr, di] = rings(DX0, DY0, DX1, DY1, 8, 2.2);
  put(solid(g), prism(P, front, dr, di, -7, 0));

  const ch = [];
  for (let i = 0; i < N; i++) {
    const cx = cxOf(i), grp = mk("g", {}, g);
    // two knobs at the far end of the strip, each with its pointer notch
    [6, 17].forEach((ky, k) => {
      const [kr, ki] = rings(cx - 3.6, ky - 3.6, cx + 3.6, ky + 3.6, 3.6, 0.8);
      put(solid(grp), prism(P, front, kr, ki, 0, 3.4));
      const a = (KA[i][k] * Math.PI) / 180;
      mk("path", { class: "nf", d: seg(P(cx, ky, 3.4), P(cx + 2.8 * Math.cos(a), ky + 2.8 * Math.sin(a), 3.4)) }, grp);
    });
    // the slot, sunk in the desk, and its scale ticks
    const [sr] = rings(cx - 1.6, YT, cx + 1.6, YB, 1.6, 0.4);
    mk("path", { class: "nf", d: poly(ringAt(P, sr, 0)) }, grp);
    let t = "";
    for (let k = 0; k <= 6; k++) { const y = YT + 4 + (k * (YB - YT - 8)) / 6; t += seg(P(cx - 6.5, y, 0), P(cx - (k % 3 ? 5 : 4), y, 0)); }
    mk("path", { class: "nf lo", d: t }, grp);
    // the meter: a column of dots beside the slot, lit from the bottom
    const dots = [];
    for (let k = 0; k < ND; k++) {
      const el = flatDot(grp, C, 1.1, "dot off");
      place(el, P(cx + 6.5, YB - 6 - k * ((YB - YT - 12) / (ND - 1)), 0));
      dots.push(el);
    }
    const cap = solid(grp);
    ch.push({ i, cx, dots, lit: -1, cap, grip: mk("path", { class: "nf lo" }, cap.g), sp: spring(REST[i], { eps: 0.002 }), drawn: NaN });
  }

  function draw(c) {
    const lv = c.sp.x;
    if (lv === c.drawn) return;
    c.drawn = lv;
    const y = yOf(lv), [cr, ci] = rings(c.cx - 5.5, y - 3.8, c.cx + 5.5, y + 3.8, 2, 1);
    put(c.cap, prism(P, front, cr, ci, 0, CZ));
    c.grip.setAttribute("d", seg(P(c.cx - 4, y, CZ), P(c.cx + 4, y, CZ)));
    const lit = Math.round(clamp(lv, 0, 1) * ND);
    if (lit !== c.lit) { c.lit = lit; c.dots.forEach((d, k) => d.setAttribute("class", k < lit ? "dot m" : "dot off")); }
  }

  const B = register(stage, (dt) => {
    let m = false;
    for (const c of ch) { if (stepS(c.sp, dt)) m = true; draw(c); }
    return m;
  });
  bag.add(B.unregister);

  function retarget() {
    let near = MARK;
    if (over) {
      near = clamp(Math.floor(over[0] / PX), 0, N - 1);
      for (const c of ch) c.sp.t = 0.08 + 0.86 * falloff(Math.abs(c.cx - over[0]) / R);
    } else for (const c of ch) c.sp.t = REST[c.i];
    ch.forEach((c) => c.cap.sil.classList.toggle("hi", c.i === near));
    read.textContent = over ? `ch ${near + 1}` : "rest";
    B.wake();
  }

  // The desk's top never moves: the pointer is read on it.
  bag.add(pointer(stage, {
    move: (p) => {
      const q = unproj(C, p[0], p[1], 0);
      over = q[0] > DX0 && q[0] < DX1 && q[1] > DY0 - 10 && q[1] < DY1 ? q : null;
      retarget();
    },
    leave: () => { over = null; retarget(); },
  }));
  bag.add(() => svg.replaceChildren());
  retarget();

  return {
    set: (v) => { R = v; if (over) retarget(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "mixer",
  means: "A mixing desk: the faders near the pointer slide up their slots, the farther the less.",
  rules: [1, 3, 5, 9],
  range: [14, 30, 56],
  tour: [[144, 129], [205, 163], [240, 189], null],
  mount,
});
