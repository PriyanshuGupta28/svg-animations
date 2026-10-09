/**
 * Switchboard: a tray of twelve toggle switches, the controls of a settings
 * panel made solid. Each is a pill-shaped track with a round knob standing
 * proud of it, and an indicator dot beside its far end. At rest some are on
 * and some off. The pointer is projected onto the tracks' plane; every toggle
 * within the radius flips, staggered outwards from the pointer by distance,
 * and flips back when the pointer moves on. The knob of the nearest toggle
 * takes the bright stroke. The slider is the radius, in world units.
 */
const {
  Cam, facing, fit, prism, proj, rings, unproj, lerp, tween, tset, tval, tdone,
  flatDot, mk, place, pointer, put, register, disposer, solid,
} = HL;

const COLS = 3, ROWS = 4, TL = 36, TW = 13, PX = 46, PY = 22, TZ = 2.2, KR = 5.4, KZ = 6.6, STEP = 40;
const X1 = (COLS - 1) * PX + TL, Y1 = (ROWS - 1) * PY + TW;
// The panel as it was left: not a pattern, a set of choices.
const ON = [1, 1, 0, 0, 1, 0, 1, 0, 0, 0, 1, 1];
const MARK = 4;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  const C = Cam(45, 0.5, 1.86);
  fit(C, [[-9, -9, -6], [X1 + 9, Y1 + 9, -6], [X1 + 9, -9, -6], [-9, Y1 + 9, -6], [0, 0, KZ]], 200, 166);
  const P = proj(C), front = facing(C);
  let R = value, over = null, near = -1;

  const g = mk("g", {}, svg);
  const [tr, ti] = rings(-9, -9, X1 + 9, Y1 + 9, 10, 2.2);
  put(solid(g), prism(P, front, tr, ti, -6, 0));

  const sw = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const i = r * COLS + c, x0 = c * PX, y0 = r * PY;
    sw.push({ i, c, r, x0, y0, cx: x0 + TL / 2, cy: y0 + TW / 2, on: ON[i], pos: tween(ON[i]), drawn: NaN });
  }
  // Back to front: by x + y of each toggle's middle.
  for (const s of sw.slice().sort((a, b) => a.cx + a.cy - (b.cx + b.cy))) {
    const grp = mk("g", {}, g);
    s.led = flatDot(grp, C, 1.3, s.on ? "dot m" : "dot off");
    place(s.led, P(s.x0 + TL + 4.6, s.cy, 0));
    const [ring, inner] = rings(s.x0, s.y0, s.x0 + TL, s.y0 + TW, TW / 2, 0.9);
    put(solid(grp), prism(P, front, ring, inner, 0, TZ));
    s.knob = solid(grp);
  }

  function drawKnob(s, t) {
    if (t === s.drawn) return;
    s.drawn = t;
    const kx = lerp(s.x0 + TW / 2, s.x0 + TL - TW / 2, t);
    const [ring, inner] = rings(kx - KR, s.cy - KR, kx + KR, s.cy + KR, KR, 1.1);
    put(s.knob, prism(P, front, ring, inner, TZ, KZ));
  }

  const B = register(stage, (_dt, now) => {
    let m = false;
    for (const s of sw) { drawKnob(s, tval(s.pos, now)); if (!tdone(s.pos, now)) m = true; }
    return m;
  });
  bag.add(B.unregister);

  function retarget() {
    const now = performance.now();
    let best = -1, bd = Infinity;
    for (const s of sw) {
      const d = over ? Math.hypot(s.cx - over[0], s.cy - over[1]) : Infinity;
      if (d < bd) { bd = d; best = s.i; }
      const flip = d < R;
      s.want = flip ? 1 - s.on : s.on;
      tset(s.pos, s.want, now, over ? (d / PY) * STEP : 0);
      s.led.setAttribute("class", s.want ? "dot m" : "dot off");
    }
    near = best;
    const lit = over ? near : MARK;
    for (const s of sw) s.knob.sil.classList.toggle("hi", s.i === lit);
    const s = sw[near];
    read.textContent = over ? `toggle ${s.c + 1}·${s.r + 1} · ${s.want ? "on" : "off"}` : "rest";
    B.wake();
  }

  bag.add(pointer(stage, {
    move: (p) => { over = unproj(C, p[0], p[1], TZ); retarget(); },
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
  name: "switchboard",
  means: "A panel of toggle switches: the ones near the pointer flip, spreading outwards from it.",
  rules: [1, 2, 3, 5],
  range: [16, 48, 72],
  tour: [[168, 88], [215, 143], [241, 214], null],
  mount,
});
