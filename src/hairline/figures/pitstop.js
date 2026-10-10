/**
 * Pitstop: an open-wheel race car up on its front and rear jacks, long nose
 * and front wing, cockpit under a halo, sidepods, a rear wing on a pillar, and
 * four big exposed wheels on their hubs and wishbones. The pointer picks the
 * wheel whose resting hub is nearest it on screen; that wheel slides off its
 * hub outwards, the other three ease a little off theirs, staggered by how
 * many steps round the car they are from it, on the 700ms tween. At rest the
 * front left is half off and bright. The slider is the stagger, in ms.
 */
const {
  Cam, circ, facing, fit, hull, open, poly, prism, proj, ringAt, rings, rrect, run, seg,
  tween, tset, tval, tdone, disposer, mk, place, pointer, put, register, solid,
} = HL;

const LIFT = 7, R = 14, TW = 13, YW = 31, OFF = 22, EASE = 0.14, XR = 4, XF = 114, REST = 0, REST_OFF = 0.5;
/** The wheels: name, axle x, side (+1 is the near, left side). */
const WHEELS = [["FL", XF, 1], ["FR", XF, -1], ["RR", XR, -1], ["RL", XR, 1]];

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;

  const C = Cam(45, 0.5, 1.5);
  fit(C, [[-50, -YW - TW / 2 - OFF, 0], [184, YW + TW / 2 + OFF, 0], [-50, YW + OFF, 0], [184, -YW - OFF, 0], [-26, 0, 44 + LIFT]], 200, 170);
  const P = proj(C), front = facing(C), Pc = (x, y, z) => P(x, y, z + LIFT);

  const g = mk("g", {}, svg);
  /** A block of the car (or, with lift 0, of a jack): a rounded footprint stood from z0 to z1. */
  const block = (x0, y0, x1, y1, z0, z1, r, b, lift = LIFT) => {
    const [ring, inner] = rings(x0, y0, x1, y1, r, b);
    put(solid(g), prism(P, front, ring, inner, z0 + lift, z1 + lift));
  };
  /** A solid whose top is smaller than its foot: the nose, the engine cover. */
  const taper = (foot, top, z0, z1, b) => {
    const inner = rrect(top[0] + b, top[1] + b, top[2] - b, top[3] - b, Math.max(0.5, top[4] - b), 4);
    put(solid(g), {
      sil: poly(hull(ringAt(P, rrect(...foot, 4), z0 + LIFT).concat(ringAt(P, rrect(...top, 4), z1 + LIFT)))),
      crease: open(ringAt(P, run(inner, front), z1 + LIFT)),
    });
  };
  /** A disc in the car's x-z plane at side y: the samples of a wheel's face or its rim. */
  const disc = (x, y, r) => circ(r, 28).map((q) => Pc(x + q.u, y, R + q.v));

  /** A jack on the ground: a foot, a post up to the car, and a handle raised away from it. */
  const jack = (x, top, dir) => {
    block(x - 7, -8, x + 7, 8, 0, 3, 3, 1.2, 0);
    block(x - 3, -3, x + 3, 3, 3, top + LIFT, 1.5, 0.7, 0);
    mk("path", { d: seg(P(x + dir * 5, 0, 3), P(x + dir * 18, 0, 24)), class: "nf" }, g);
    mk("path", { d: seg(P(x + dir * 18, -6, 24), P(x + dir * 18, 6, 24)), class: "nf" }, g);
  };

  // the wheels: an axle stub with its two wishbones, and a tyre, its face, rim and nut
  const wheels = WHEELS.map(([name, x, side], i) => ({
    name, x, side, i, drawn: NaN, tw: tween(i === REST ? REST_OFF : 0),
    sx: P(x, side * YW, R + LIFT),
    hub: mk("path", { class: "nf" }, g), arms: mk("path", { class: "nf lo" }, g),
    tyre: mk("path", { class: "sil" }, g), face: mk("path", { class: "nf" }, g),
    rim: mk("path", { class: "nf lo" }, g), cap: mk("path", { class: "nf" }, g),
    nut: mk("circle", { r: 1.3, class: "dot m" }, g),
  }));
  const wheelParts = (w) => [w.tyre, w.face, w.rim, w.cap, w.nut];
  const hubParts = (w) => [w.arms, w.hub];
  // far side first: each far wheel, then its hub, which is nearer than it
  for (const w of wheels.filter((w) => w.side < 0).reverse()) { g.append(...wheelParts(w), ...hubParts(w)); }

  // rear: jack, crash structure, then the wing, far endplate to near
  jack(-30, 6, -1);
  block(-16, -5, 4, 5, 4, 11, 2.5, 1);
  block(-27, -24, -9, -22, 20, 44, 1, 0.4);
  block(-19, -1.5, -15, 1.5, 11, 33, 1, 0.5);
  block(-26, -22, -11, 22, 33, 36, 3, 1);
  block(-23, -22, -13, 22, 38, 41, 3, 1);
  block(-27, 22, -9, 24, 20, 44, 1, 0.4);
  // body: floor, sidepods, survival cell, engine cover to the airbox, nose
  block(-6, -21, 104, 21, 3, 5, 6, 1.5);
  block(26, -19, 76, 19, 5, 17, 7, 2);
  block(36, -9, 108, 9, 5, 21, 6, 1.6);
  taper([-8, -12, 64, 12, 8], [44, -3, 62, 3, 3], 17, 32, 1);
  taper([100, -6, 158, 6, 5], [104, -4, 132, 4, 4], 6, 19, 1);
  // cockpit opening, and the halo over it on its front pillar
  mk("path", { d: poly(ringAt(P, rrect(66, -6, 88, 6, 5, 5), 21 + LIFT)), class: "nf" }, g);
  mk("path", { d: poly(ringAt(P, rrect(62, -8, 90, 8, 8, 6), 28 + LIFT)) + seg(Pc(95, 0, 21), Pc(90, 0, 28)), class: "nf" }, g);
  // front wing with its endplates, and the front jack under the nose
  jack(162, 4, 1);
  block(138, -36, 158, -34, 2, 10, 1, 0.4);
  block(140, -34, 160, 34, 3, 5, 3, 1);
  block(141, -34, 152, 34, 6, 8, 3, 1);
  block(138, 34, 158, 36, 2, 10, 1, 0.4);
  // near side last: each near hub, then its wheel, rear before front
  for (const w of wheels.filter((w) => w.side > 0).reverse()) { g.append(...hubParts(w), ...wheelParts(w)); }

  function drawWheel(w, v) {
    if (v === w.drawn) return;
    w.drawn = v;
    const { x, side } = w, y = side * (YW + v * OFF), yi = y - side * TW / 2, yo = y + side * TW / 2, yv = Math.max(yi, yo);
    w.tyre.setAttribute("d", poly(hull(disc(x, yi, R).concat(disc(x, yo, R)))));
    w.face.setAttribute("d", poly(disc(x, yv, R)));
    w.rim.setAttribute("d", poly(disc(x, yv, R * 0.66)));
    w.cap.setAttribute("d", poly(disc(x, yv, R * 0.26)));
    place(w.nut, Pc(x, yv, R));
    // the hub stays on the car; the wishbones run from the body to it
    const hy = side * (YW - TW / 2 + 2), ry = side * (x === XR ? 13 : 8);
    w.hub.setAttribute("d", poly(hull(disc(x, side * 20, 3.2).concat(disc(x, hy, 3.2)))));
    w.arms.setAttribute("d", seg(Pc(x - 12, ry, R + 6), Pc(x, hy, R + 3)) + seg(Pc(x + 12, ry, R + 6), Pc(x, hy, R + 3))
      + seg(Pc(x - 12, ry, R - 6), Pc(x, hy, R - 3)) + seg(Pc(x + 12, ry, R - 6), Pc(x, hy, R - 3)));
  }

  const B = register(stage, (_dt, now) => {
    let m = false;
    for (const w of wheels) { drawWheel(w, tval(w.tw, now)); if (!tdone(w.tw, now)) m = true; }
    return m;
  });
  bag.add(B.unregister);

  /** Steps round the car between two wheels: one along a side or across an axle, two across a corner. */
  const steps = (a, b) => (a.x !== b.x) + (a.side !== b.side);
  let act = null;
  function setActive(a) {
    if (a === act) return;
    const now = performance.now(), mark = a < 0 ? REST : a, from = wheels[a >= 0 ? a : (act ?? -1) >= 0 ? act : REST];
    act = a;
    for (const w of wheels) {
      tset(w.tw, w.i === mark ? (a < 0 ? REST_OFF : 1) : a < 0 ? 0 : EASE, now, steps(w, from) * stag);
      w.tyre.classList.toggle("hi", w.i === mark); w.face.classList.toggle("hi", w.i === mark);
    }
    read.textContent = a < 0 ? "rest" : `wheel ${wheels[a].name}`;
    B.wake();
  }

  /** The wheel whose resting hub is nearest the pointer on screen. */
  const hit = ([x, y]) => wheels.reduce((b, w) => (Math.hypot(w.sx[0] - x, w.sx[1] - y) < Math.hypot(wheels[b].sx[0] - x, wheels[b].sx[1] - y) ? w.i : b), 0);

  bag.add(pointer(stage, { move: (p) => setActive(hit(p)), leave: () => setActive(-1) }));
  bag.add(() => svg.replaceChildren());
  setActive(-1);

  return {
    set: (v) => { stag = v; },
    destroy: bag.dispose,
  };
}

hairline({
  name: "pitstop",
  means: "A race car up on its jacks: the wheel under the pointer slides off its hub, and the other three ease off after it.",
  rules: [1, 2, 5, 8],
  range: [0, 60, 140],
  tour: [[100, 160], [200, 160], [300, 160], null],
  mount,
});
