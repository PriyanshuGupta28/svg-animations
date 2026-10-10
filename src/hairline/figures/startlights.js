/**
 * Startlights: the start gantry of a motor race, a beam on two posts with
 * five light pods hanging under it, each pod two round lamps. The
 * pointer's x lights the pods left to right, tested against their resting
 * centres: each lamp's lens rings open from its middle on the 700ms tween,
 * staggered pod by pod from the lit edge. The leading pod is bright. Leaving is
 * lights out: every lamp goes dark at once, then the gantry returns to rest,
 * two pods lit. The slider is the stagger, in ms.
 */
const {
  Cam, circ, fit, poly, prism, proj, facing, rings,
  tween, tset, tval, tdone, disposer, mk, place, pointer, put, register, solid,
} = HL;

const N = 5, PW = 24, PITCH = 30, PX = 8, PD = 4, PZ0 = 17, PZ1 = 64, BZ = 72, R = 10.2;
/** Each pod's two lamp heights, and a lens's fresnel rings as shares of its radius: they open from the middle when lit. */
const LZ = [52, 29], LENS = [0.84, 0.68, 0.52, 0.36, 0.2], XL = -12, XR = PX + (N - 1) * PITCH + PW + PX + 4, REST = 2, HOLD = 1300;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;

  const C = Cam(45, 0.5, 1.98);
  fit(C, [[XL - 4, -9, 0], [XR + 4, 9, 0], [XL, -6, BZ], [XR, 6, BZ], [XR, 9, 0]], 200, 166);
  const P = proj(C), front = facing(C);
  const lamp = (cx, cz, r) => circ(r, 28).map((q) => P(cx + q.u, PD + 0.3, cz + q.v));

  const g = mk("g", {}, svg);
  const box = (x0, y0, x1, y1, z0, z1, r, b, cls) => {
    const s = solid(g), [ring, inner] = rings(x0, y0, x1, y1, r, b);
    put(s, prism(P, front, ring, inner, z0, z1));
    if (cls) s.sil.classList.add(cls);
    return s;
  };
  // the left post and its foot, back to front
  box(XL - 3, -8, XL + 11, 8, 0, 3, 3, 1.2);
  box(XL + 1, -4, XL + 8, 4, 3, BZ - 8, 2.5, 1);

  const pods = [];
  for (let i = 0; i < N; i++) {
    const x0 = PX + i * PITCH, cx = x0 + PW / 2;
    const body = box(x0, -PD, x0 + PW, PD, PZ0, PZ1, 4, 1.2);
    const lamps = LZ.map((cz) => {
      mk("path", { d: poly(lamp(cx, cz, R)), class: "nf" }, g);
      const lens = LENS.map(() => mk("path", { class: "nf" }, g));
      const dot = mk("circle", { r: 0, class: "dot m" }, g);
      place(dot, P(cx, PD + 0.3, cz));
      return { cz, lens, dot };
    });
    pods.push({ cx, body, lamps, tw: tween(i < REST ? 1 : 0), drawn: NaN, sx: P(cx, PD, (PZ0 + PZ1) / 2)[0] });
  }
  // the right post and its foot, then the beam over everything
  box(XR - 8, -4, XR - 1, 4, 3, BZ - 8, 2.5, 1);
  box(XR - 11, -8, XR + 3, 8, 0, 3, 3, 1.2);
  box(XL - 2, -6, XR + 2, 6, BZ - 8, BZ, 4, 1.6);

  function drawPod(p, v) {
    if (v === p.drawn) return;
    p.drawn = v;
    for (const l of p.lamps) {
      l.lens.forEach((el, k) => el.setAttribute("d", v > 0.03 ? poly(lamp(p.cx, l.cz, R * LENS[k] * v)) : ""));
      l.dot.setAttribute("r", (1.6 * v).toFixed(2));
    }
  }

  let out = -1;
  const B = register(stage, (_dt, now) => {
    if (out >= 0 && now - out > HOLD) setLit(-1);
    let m = out >= 0;
    for (const p of pods) { drawPod(p, tval(p.tw, now)); if (!tdone(p.tw, now)) m = true; }
    return m;
  });
  bag.add(B.unregister);

  let lit = null;
  /** Lights n pods (0 is lights out, -1 is rest); the change runs pod by pod away from the lit edge. */
  function setLit(n) {
    if (n === lit) return;
    const now = performance.now(), want = n < 0 ? REST : n, from = lit === null || lit < 0 ? REST : lit;
    out = n === 0 ? now : -1;
    lit = n;
    pods.forEach((p, i) => {
      const on = i < want, delay = n === 0 ? 0 : on ? Math.max(0, i - from) * stag : Math.max(0, from - 1 - i) * stag;
      tset(p.tw, on ? 1 : 0, now, delay);
      const lead = i === want - 1;
      p.body.sil.classList.toggle("hi", lead);
      for (const l of p.lamps) {
        for (const el of l.lens) el.classList.toggle("hi", lead);
        l.dot.classList.toggle("m", !lead);
      }
    });
    read.textContent = n < 0 ? "rest" : n === 0 ? "lights out" : `light ${n} of ${N}`;
    B.wake();
  }

  /** The pods lit: those whose resting centre the pointer has passed, from the first. */
  const hit = ([x]) => 1 + pods.slice(1).filter((p, i) => x > (pods[i].sx + p.sx) / 2).length;

  bag.add(pointer(stage, { move: (p) => setLit(hit(p)), leave: () => { if (lit > 0) setLit(0); } }));
  bag.add(() => svg.replaceChildren());
  setLit(-1);

  return {
    set: (v) => { stag = v; },
    destroy: bag.dispose,
  };
}

hairline({
  name: "startlights",
  means: "A start gantry: the pointer lights the five pods one by one, left to right, and leaving is lights out.",
  rules: [1, 2, 5, 8],
  range: [30, 110, 220],
  tour: [[116, 100], [200, 142], [284, 184], null],
  mount,
});
