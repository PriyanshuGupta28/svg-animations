/**
 * Timeline: an editing timeline made solid. A tray holds four tracks of clip
 * blocks: two video tracks whose clips are ruled into thumbnail frames, two
 * audio tracks whose clips carry a waveform of short rules. A playhead stands
 * across the tracks as a gantry: two posts, a crossbar and a cap, its line
 * dashed on the tray floor. The pointer's x moves the playhead on a spring;
 * the clips under it rise, the ones near it a little. The pointer's y picks
 * the track, and the clip under the playhead on that track takes the bright
 * stroke. The slider is the falloff's reach, in world units.
 */
const {
  Cam, clamp, facing, fit, prism, proj, rings, unproj, spring, stepS, seg,
  mk, pointer, put, register, disposer, solid,
} = HL;

const LEN = 160, LANE = 15, CW = 12, LIFT = 11, PZ = 24, REST = 58, YF = -10, YN = 4 * LANE + 4;
// two video tracks, then two audio tracks: [start, end] of each clip
const TRACKS = [
  [[8, 50], [84, 134]],
  [[0, 44], [48, 102], [106, 160]],
  [[0, 72], [78, 150]],
  [[18, 62], [68, 126]],
];
/** Share of the lift at u reaches from the playhead: a smooth shoulder to a floor of .1. */
const fall = (u) => (u >= 1 ? 0.1 : 0.1 + 0.9 * (0.5 + 0.5 * Math.cos(Math.PI * u)));

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let R = value, over = null;

  const C = Cam(45, 0.5, 1.6);
  fit(C, [[-8, YF - 6, -5], [LEN + 8, YN + 6, -5], [LEN + 8, YF - 6, -5], [-8, YN + 6, -5], [0, YF, PZ + 9], [LEN, YF, PZ + 9]], 200, 166);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  const [tr, ti] = rings(-8, YF - 6, LEN + 8, YN + 6, 8, 2);
  put(solid(g), prism(P, front, tr, ti, -5, 0));
  // the ruler along the far edge: a tick every 10, a long one every 40
  let ticks = "";
  for (let x = 0; x <= LEN; x += 10) ticks += seg(P(x, -3, 0), P(x, x % 40 ? -6 : -9, 0));
  mk("path", { d: ticks, class: "nf lo" }, g);
  const line = mk("path", { class: "dash" }, g);
  const far = solid(g);

  const clips = [];
  TRACKS.forEach((list, j) => list.forEach(([x0, x1], k) => {
    const y0 = j * LANE + 1.5, y1 = y0 + CW, [ring, inner] = rings(x0 + 1, y0, x1 - 1, y1, 2.6, 0.9);
    const h0 = 3 + ((j * 5 + k * 3) % 4) * 1;
    // video: frame rules every 9; audio: a waveform of short rules every 3.2
    const marks = [];
    if (j < 2) for (let x = x0 + 9; x < x1 - 3; x += 9) marks.push([x, 2, 2]);
    else for (let x = x0 + 4; x < x1 - 3; x += 3.2) {
      const a = (CW / 2 - 1.6) * (0.2 + 0.8 * Math.abs(Math.sin(x * 0.29 + j) * Math.sin(x * 0.07)));
      marks.push([x, CW / 2 - a, CW / 2 - a]);
    }
    const el = solid(g), ink = mk("path", { class: "nf lo" }, el.g);
    clips.push({ j, k, x0, x1, y0, y1, ring, inner, h0, marks, el, ink, sp: spring(h0, { eps: 0.04 }), drawn: NaN });
  }));

  const near = solid(g), bar = solid(g), cap = solid(g);
  const ph = spring(REST);
  let phDrawn = NaN;

  function drawClip(c) {
    const h = c.sp.x;
    if (h === c.drawn) return;
    c.drawn = h;
    put(c.el, prism(P, front, c.ring, c.inner, 0, h));
    c.ink.setAttribute("d", c.marks.map(([x, a, b]) => seg(P(x, c.y0 + a, h), P(x, c.y1 - b, h))).join(""));
  }
  function drawHead(x) {
    if (x === phDrawn) return;
    phDrawn = x;
    const post = (el, y) => { const [o, i] = rings(x - 1.7, y - 1.7, x + 1.7, y + 1.7, 1.7, 0.6); put(el, prism(P, front, o, i, 0, PZ)); };
    post(far, YF); post(near, YN);
    const [bo, bi] = rings(x - 2, YF - 2, x + 2, YN + 2, 2, 0.7);
    put(bar, prism(P, front, bo, bi, PZ, PZ + 3));
    const [co, ci] = rings(x - 5, YF - 5, x + 5, YF + 5, 3, 1.2);
    put(cap, prism(P, front, co, ci, PZ + 3, PZ + 8));
    line.setAttribute("d", seg(P(x, YF, 0), P(x, YN, 0)));
  }

  const B = register(stage, (dt) => {
    let m = stepS(ph, dt);
    for (const c of clips) { if (stepS(c.sp, dt)) m = true; drawClip(c); }
    drawHead(ph.x);
    return m;
  });
  bag.add(B.unregister);

  function retarget() {
    const px = over ? clamp(over[0], 0, LEN) : REST, j = over ? clamp(Math.floor(over[1] / LANE), 0, 3) : -1;
    ph.t = px;
    let pick = null;
    for (const c of clips) {
      const d = Math.max(0, c.x0 - px, px - c.x1);
      c.sp.t = c.h0 + (over ? 1 : 0.5) * LIFT * fall(d / R);
      if (c.j === j && d === 0) pick = c;
    }
    clips.forEach((c) => c.el.sil.classList.toggle("hi", c === pick));
    for (const s of [bar, cap]) s.sil.classList.toggle("hi", !pick);
    read.textContent = !over ? "rest" : pick ? `clip ${j + 1}·${pick.k + 1}` : `track ${j + 1}`;
    B.wake();
  }

  // the pointer meets the plane of the clips' resting tops, which never moves
  bag.add(pointer(stage, {
    move: (p) => { over = unproj(C, p[0], p[1], 5); retarget(); },
    leave: () => { over = null; retarget(); },
  }));
  bag.add(() => svg.replaceChildren());
  retarget();

  return {
    set: (v) => { R = v; retarget(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "timeline",
  means: "An editing timeline made solid: the playhead follows the pointer, and the clips under it rise.",
  rules: [1, 3, 5, 8],
  range: [12, 30, 60],
  tour: [[130, 150], [200, 169], [280, 196], null],
  mount,
});
