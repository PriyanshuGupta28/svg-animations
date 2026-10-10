/**
 * Bubbles: a chat as six speech bubbles standing on a window's floor, thick
 * rounded slabs in two staggered columns, the user's on the right and the
 * assistant's on the left, each standing on the tip of its tail, a composer
 * bar with its send button at the near end. Each bubble carries its message as
 * ruled lines; the newest, the assistant's, is still typing, three dots. The
 * pointer picks a bubble by its resting face; it lifts and comes forward, and
 * the others part from it, staggered outwards on the 700ms tween. At rest the
 * heights are uneven and the typing bubble is bright. The slider is the
 * stagger, in ms.
 */
const {
  Cam, facing, fillet, fit, hull, open, poly, prism, proj, rings, rrect, run, seg,
  tween, tset, tval, tdone, disposer, mk, place, pointer, put, register, solid,
} = HL;

/** Spacing along the chat, slab thickness, column edge, body floor, lift, forward step and the parting. */
const G = 21, TK = 4.5, YE = 56, YF = 64, ZB = 2, LIFT = 12, FWD = 5, PART = 9, MARK = 5;
const MSG = [
  { ai: 0, w: 40, h: 18 }, { ai: 1, w: 52, h: 34 }, { ai: 0, w: 34, h: 15 },
  { ai: 1, w: 48, h: 44 }, { ai: 0, w: 44, h: 24 }, { ai: 1, w: 30, h: 14, typing: 1 },
];
const X0 = -12, XC = (MSG.length - 1) * G + TK + 16, X1 = XC + 20;

/** Even-odd test of a screen point against a closed polygon. */
function inside([x, y], pts) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;
  const C = Cam(45, 0.5, 1.72);
  fit(C, [[X0, -YF, 0], [X1, YF, 0], [X1, -YF, 0], [X0, YF, 0], [-PART, YE, ZB + 34 + LIFT], [3 * G + FWD, YE, ZB + 44 + LIFT]], 200, 170);
  const P = proj(C), front = facing(C);
  /** A ring upright in the plane x = const: u along y, v up z. */
  const at = (ring, x, dz) => ring.map((q) => P(x, q.u, q.v + dz));

  const g = mk("g", {}, svg);
  // the window's floor
  put(solid(g), prism(P, front, ...rings(X0, -YF, X1, YF, 9, 2), 0, 2));

  const bub = MSG.map((m, i) => {
    const y0 = m.ai ? YE - m.w : -YE, y1 = m.ai ? YE : -YE + m.w;
    const body = rrect(y0, ZB, y1, ZB + m.h, Math.min(7, m.h / 2), 5);
    const inner = rrect(y0 + 1.4, ZB + 1.4, y1 - 1.4, ZB + m.h - 1.4, Math.min(5.6, m.h / 2 - 1.4), 5);
    // the tail: a flare out of the body's outer foot, its tip on the floor
    const o = m.ai ? y1 : y0, s = m.ai ? -1 : 1;
    const tail = fillet([[o + s * 12, ZB], [o - s * 9, ZB], [o + s * 2, ZB + 12]], [1.5, 0.8, 2], 3).map(([u, v]) => ({ u, v }));
    const lines = [];
    if (!m.typing) for (let z = ZB + m.h - 6; z > ZB + 4; z -= 5.5) lines.push([z, z - 5.5 > ZB + 4 ? 1 : 0.55]);
    const grp = mk("g", {}, g);
    const tl = mk("path", { class: "sil" }, grp), el = solid(grp), ln = mk("path", { class: "nf lo" }, grp);
    const dots = m.typing ? [0, 1, 2].map(() => mk("circle", { r: 1.6, class: "dot m" }, grp)) : [];
    return { m, i, y0, y1, body, inner, tail, lines, tl, el, ln, dots, dx: tween(0), dz: tween(0), drawn: "" };
  });

  // the composer: a low bar across the near end, its send button on the user's side
  put(solid(g), prism(P, front, ...rings(XC, -YE, X1 - 4, YE, 6, 1.4), 2, 6));
  mk("path", { class: "nf lo", d: poly(rrect(XC + 3, -YE + 17, X1 - 7, YE - 4, 4, 4).map((q) => P(q.u, q.v, 6))) }, g);
  put(solid(g), prism(P, front, ...rings(XC + 3, -YE + 3, X1 - 7, -YE + 13, 5, 1.2), 6, 8.5));

  /** Bubble b's slab pushed dx along the chat and lifted dz: hull of its back and front faces, the crease on its front. */
  function draw(b, dx, dz) {
    const id = dx + "," + dz;
    if (id === b.drawn) return;
    b.drawn = id;
    const xb = b.i * G + dx, xf = xb + TK;
    b.tl.setAttribute("d", poly(hull(at(b.tail, xb, dz).concat(at(b.tail, xf, dz)))));
    put(b.el, {
      sil: poly(hull(at(b.body, xb, dz).concat(at(b.body, xf, dz)))),
      crease: open(at(run(b.inner, (q) => 0.61 * q.nu + 0.5 * q.nv > 0), xf, dz)),
    });
    b.ln.setAttribute("d", b.lines.map(([z, f]) => seg(P(xf, b.y0 + 6, z + dz), P(xf, b.y0 + 6 + (b.y1 - b.y0 - 12) * f, z + dz))).join(""));
    b.dots.forEach((el, k) => place(el, P(xf, (b.y0 + b.y1) / 2 + (k - 1) * 7, ZB + b.m.h / 2 + dz)));
  }

  // hit regions: each bubble's resting slab on screen; they never move, and the nearest one wins
  const hits = bub.map((b) => hull(at(b.body, b.i * G, 0).concat(at(b.body, b.i * G + TK, 0))));
  const hit = (p) => { for (let i = bub.length - 1; i >= 0; i--) if (inside(p, hits[i])) return i; return -1; };

  const B = register(stage, (_dt, now) => {
    let m = false;
    for (const b of bub) { draw(b, tval(b.dx, now), tval(b.dz, now)); if (!tdone(b.dx, now) || !tdone(b.dz, now)) m = true; }
    return m;
  });
  bag.add(B.unregister);

  let act = null;
  function setActive(a) {
    if (a === act) return;
    const now = performance.now(), from = a >= 0 ? a : act >= 0 ? act : MARK;
    act = a;
    for (const b of bub) {
      const d = b.i - a, delay = Math.abs(b.i - from) * stag;
      const dx = a < 0 ? 0 : d === 0 ? FWD : Math.sign(d) * PART * Math.max(0.3, 1 - (Math.abs(d) - 1) * 0.3);
      tset(b.dx, dx, now, delay);
      tset(b.dz, a >= 0 && d === 0 ? LIFT : 0, now, delay);
      const on = a < 0 ? b.i === MARK : d === 0;
      b.el.sil.classList.toggle("hi", on); b.tl.classList.toggle("hi", on);
      b.dots.forEach((el) => el.setAttribute("class", a < 0 || d === 0 ? "dot" : "dot m"));
    }
    read.textContent = a < 0 ? "rest" : `msg ${a + 1} · ${MSG[a].ai ? "ai" : "you"}`;
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
  name: "bubbles",
  means: "A chat as speech bubbles standing in two columns: the message under the pointer lifts forward and the rest part from it.",
  rules: [1, 2, 5, 8],
  range: [0, 45, 90],
  tour: [[113, 118], [161, 127], [262, 135], null],
  mount,
});
