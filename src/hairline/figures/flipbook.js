/**
 * Flipbook: a flipbook lying on a desk mat, its pages bound along one edge
 * under a clip. Each page carries one frame of a ball bouncing along a floor
 * line. The pointer's screen x scrubs the book: the pages before it have
 * flipped over towards the viewer, the page at it stands up mid-flip, and its
 * neighbours fan either side, staggered outwards from it on the 700ms lift
 * curve, so a scrub reads as a riffle. At rest one page stands, bright. The
 * slider is the stagger, in ms.
 *
 * Pages turn about the spine (the x axis). Painted by how far each page's
 * angle is from the view direction, so a fanned page always covers the right
 * ones; the clip goes in just before the pages lying face down in front.
 */
const {
  Cam, circ, clamp, facing, fit, lerp, poly, proj, prism, rad, rings, rrect, seg,
  tween, tset, tval, tdone, disposer, mk, pointer, put, register, solid,
} = HL;

const N = 14, W = 84, D = 58, T = 1.3, FAN = 30, VIEW = 141, CLIP = 4, BR = 4.5;
const ZTOP = N * T + 3, REST_A = 5.3, FLOOR = 12;

/** Page i's angle when page a stands: the pages before it flipped over, those after it still down, fanned. */
const angle = (i, a) => clamp(90 + (a - i) * FAN, 0, 180);
/** The frame on page i: a ball that travels along the spine and bounces twice. */
const Z = (i, th) => (th < 90 ? (N - 1 - i) * T : i * T);
const ball = (i) => [16 + (52 * i) / (N - 1), FLOOR + BR + 30 * Math.abs(Math.cos((Math.PI * 2 * i) / (N - 1)))];

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;

  const C = Cam(45, 0.5, 1.6);
  const box = [[-8, -D - 8, -5], [W + 8, D + 8, -5], [W + 8, -D - 8, -5], [-8, D + 8, -5], [0, 0, D + 12], [W, 0, D + 12]];
  fit(C, box, 200, 168);
  const P = proj(C), sb = box.map((p) => P(...p));
  const X0 = Math.min(...sb.map((p) => p[0])), X1 = Math.max(...sb.map((p) => p[0]));
  const Y0 = Math.min(...sb.map((p) => p[1])), Y1 = Math.max(...sb.map((p) => p[1]));
  const front = facing(C);

  const g = mk("g", {}, svg);
  const [mr, mi] = rings(-8, -D - 8, W + 8, D + 8, 9, 2.2);
  put(solid(g), prism(P, front, mr, mi, -5, 0));
  const leaf = mk("g", {}, g);
  const clip = solid(g);
  {
    const [cr, ci] = rings(-3, -CLIP, W + 3, CLIP, CLIP, 1.4);
    put(clip, prism(P, front, cr, ci, 0, ZTOP));
  }

  const shape = rrect(0, 3, W, D, 3, 4), dot = circ(BR, 12), pages = [];
  for (let i = 0; i < N; i++) {
    const grp = mk("g", {}, leaf);
    const face = mk("path", { class: "sil" }, grp), ink = mk("path", { class: "nf lo" }, grp);
    pages.push({ i, grp, face, ink, th: tween(angle(i, REST_A)), drawn: NaN, cur: 0 });
  }

  function draw(p, th) {
    p.cur = th;
    if (th === p.drawn) return;
    p.drawn = th;
    const z = lerp(Z(p.i, 0), Z(p.i, 180), th / 180), c = Math.cos(rad(th)), s = Math.sin(rad(th));
    const at = (u, v) => P(u, -v * c, z + v * s);
    p.face.setAttribute("d", poly(shape.map((q) => at(q.u, q.v))));
    // face down, the frame is on the underside
    if (th > VIEW) { p.ink.setAttribute("d", ""); return; }
    const [bu, bv] = ball(p.i);
    p.ink.setAttribute("d", seg(at(8, FLOOR), at(W - 8, FLOOR)) + poly(dot.map((q) => at(bu + q.u, bv + q.v))));
  }


  let order = "";
  /** Farthest from the view direction first; the clip before the pages lying in front of it. */
  function sortPages() {
    const key = (p) => -Math.abs(p.cur - VIEW) * 100 + lerp(Z(p.i, 0), Z(p.i, 180), p.cur / 180);
    const s = pages.slice().sort((a, b) => key(a) - key(b));
    const o = s.map((p) => p.i + (p.cur > 150 ? "f" : "")).join();
    if (o === order) return;
    order = o;
    for (const p of s) if (p.cur <= 150) leaf.append(p.grp);
    leaf.append(clip.g);
    for (const p of s) if (p.cur > 150) leaf.append(p.grp);
  }

  const B = register(stage, (_dt, now) => {
    let m = false;
    for (const p of pages) { draw(p, tval(p.th, now)); if (!tdone(p.th, now)) m = true; }
    sortPages();
    return m;
  });
  bag.add(B.unregister);

  let act = null;
  /** Page a stands (-1: back to the rest riffle). The stagger spreads out from it. */
  function setActive(a) {
    if (a === act) return;
    const now = performance.now(), from = a >= 0 ? a : Math.round(REST_A);
    act = a;
    for (const p of pages) {
      tset(p.th, angle(p.i, a >= 0 ? a : REST_A), now, Math.abs(p.i - from) * stag);
      p.face.classList.toggle("hi", p.i === (a >= 0 ? a : Math.floor(REST_A)));
    }
    read.textContent = a < 0 ? "rest" : `page ${String(a + 1).padStart(2, "0")}`;
    B.wake();
  }

  // The hit test is the figure's static box on screen: x scrubs, nothing drawn is measured.
  function hit([x, y]) {
    if (x < X0 || x > X1 || y < Y0 || y > Y1) return -1;
    return clamp(Math.round(((x - X0) / (X1 - X0)) * (N + 1) - 1), 0, N - 1);
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
  name: "flipbook",
  means: "A flipbook on a desk: the pointer scrubs its pages, flipping the ones before it and standing the one at it mid-turn.",
  rules: [1, 2, 5, 6],
  range: [0, 40, 90],
  tour: [[122, 214], [200, 166], [282, 150], null],
  mount,
});
