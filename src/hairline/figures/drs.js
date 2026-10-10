/**
 * DRS: the rear wing of a race car seen from in front and above. Two endplates
 * with louvre slits up front, a notch cut from the front and one from the rear
 * corner; between them the mainplane, the upper flap with a gurney lip on its
 * trailing edge, the actuator pod on the mainplane and its rod up to the flap;
 * below, the beam wing and a single pylon on the crash structure. The
 * pointer's x opens the flap about its trailing edge on a spring, from closed
 * to the slider's widest; the slot between mainplane and flap opens with it. At rest the flap stands slightly open, its outline bright.
 * The slider is the widest the flap opens, in degrees.
 */
const {
  Cam, clamp, fillet, fit, hull, lerp, open, poly, prism, proj, facing, rad, rings, seg,
  spring, stepS, disposer, mk, pointer, put, register, solid,
} = HL;

const SPAN = 110, T = 2.2, XC = SPAN / 2, REST = 6, X0 = 160, X1 = 285;
/** The flap: chord, pitch when closed, and the pivot near its trailing edge, in the (y, z) plane of the wing's section. */
const FC = 29, FP = 55, PIV = [14, 63];
/** The endplate's outline in (y, z), forward is -y: a top rising to the rear, a notch cut from the front, one from the lower rear. */
const PLATE = [[-30, 9], [-30, 16], [-14, 20], [-14, 27], [-36, 32], [-36, 52], [-26, 64], [20, 70], [20, 38], [11, 30], [11, 9]];
const PLATE_R = [1.5, 2, 3, 3, 2, 6, 6, 3, 3, 3, 1.5];

/** An inverted aerofoil's section from its leading edge: a closed loop of [y, z], camber bulging down. */
function foil(le, c, pitch, th, cam, tail) {
  const d = [Math.cos(rad(pitch)), Math.sin(rad(pitch))], n = [-d[1], d[0]], up = [], lo = [];
  for (let i = 0; i <= 12; i++) {
    const s = (1 - Math.cos((Math.PI * i) / 12)) / 2, h = th * 2.6 * Math.sqrt(s) * (1 - s) + tail, k = -cam * 4 * s * (1 - s);
    const at = (t) => [le[0] + s * c * d[0] + t * n[0], le[1] + s * c * d[1] + t * n[1]];
    up.push(at(k + h)); lo.push(at(k - h));
  }
  return { loop: up.concat(lo.reverse()), up, d, n };
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let max = value, px = null;

  const C = Cam(45, 0.5, 1.94);
  fit(C, [[0, 42, 0], [SPAN + T, 36, 70], [0, -20, 70], [SPAN + T, -20, 0], [SPAN + T, 42, 0]], 200, 166);
  // the wing's sections are written with forward as -y; P0 is the camera, P mirrors y so the wing faces the eye
  const P0 = proj(C), front = facing(C), P = (x, y, z) => P0(x, -y, z);
  const g = mk("g", {}, svg);

  /** A section extruded across the span: its silhouette, and one dim line along its upper surface. */
  const across = (loop) => poly(hull(loop.map(([y, z]) => P(T, y, z)).concat(loop.map(([y, z]) => P(SPAN, y, z)))));
  const along = ([y, z]) => seg(P(T + 0.5, y, z), P(SPAN - 0.5, y, z));
  const element = (f) => { const s = solid(g); s.sil.setAttribute("d", across(f.loop)); s.cr.setAttribute("d", along(f.up[2])); return s; };

  const outline = fillet(PLATE, PLATE_R, 4);
  const slit = (y0, z0, y1, z1, w) => {
    const L = Math.hypot(y1 - y0, z1 - z0), ny = (-(z1 - z0) / L) * w / 2, nz = ((y1 - y0) / L) * w / 2;
    return fillet([[y0 + ny, z0 + nz], [y1 + ny, z1 + nz], [y1 - ny, z1 - nz], [y0 - ny, z0 - nz]], [0.7, 0.7, 0.7, 0.7], 3);
  };
  // louvres slanting back at the top-front
  const cuts = [0, 1, 2, 3].map((i) => slit(-28 + i * 4.4, 46, -24 + i * 4.4, 60, 1.7));
  /** An endplate standing at x: its far face dim, its near face the silhouette, the cut-outs on it. */
  const endplate = (x) => {
    mk("path", { d: poly(outline.map(([y, z]) => P(x, y, z))), class: "lo" }, g);
    mk("path", { d: poly(outline.map(([y, z]) => P(x + T, y, z))), class: "sil" }, g);
    mk("path", { d: cuts.map((c) => poly(c.map(([y, z]) => P(x + T, y, z)))).join(""), class: "nf lo" }, g);
  };
  const block = (x0, y0, x1, y1, z0, z1, r, b) => {
    const [ring, inner] = rings(x0, -y1, x1, -y0, r, b), s = solid(g);
    put(s, prism(P0, front, ring, inner, z0, z1));
    return s;
  };

  // far endplate, the crash structure and its pylon, the beam wing; then the rod, the flap, the mainplane and its pod
  endplate(0);
  block(XC - 9, -42, XC + 9, 6, 0, 8, 4, 1.4);
  block(XC - 1.3, -26, XC + 1.3, -8, 8, 34, 1.2, 0.5);
  element(foil([-22, 12], 16, 10, 1.4, 1.2, 0.35));
  const rod = mk("path", { class: "nf" }, g);
  const flap = solid(g), lip = mk("path", { class: "nf lo" }, g);
  flap.sil.classList.add("hi");
  element(foil([-29, 33], 24, 10, 2, 3, 0.4));
  // the actuator pod riding the mainplane, which pushes the flap through the rod
  block(XC - 3.2, -22, XC + 3.2, -6, 37, 43.5, 3.2, 1);
  endplate(SPAN);

  const sp = spring(REST);
  let drawn = NaN;
  function draw() {
    const th = sp.x;
    if (th === drawn) return;
    drawn = th;
    const p = FP - th, d = [Math.cos(rad(p)), Math.sin(rad(p))];
    const f = foil([PIV[0] - FC * d[0], PIV[1] - FC * d[1]], FC, p, 1.8, 2.4, 0.3);
    // the gurney: a short tab standing up off the trailing edge, part of the flap's outline
    const te = [PIV[0], PIV[1]], tab = [te[0] + f.n[0] * 2, te[1] + f.n[1] * 2], back = [tab[0] - f.d[0] * 0.9, tab[1] - f.d[1] * 0.9];
    flap.sil.setAttribute("d", across(f.loop.concat([tab, back])));
    flap.cr.setAttribute("d", along(f.up[2]));
    lip.setAttribute("d", along(f.up[11]));
    const lo = f.loop[19];
    rod.setAttribute("d", open([P(XC, -8, 43.5), P(XC, lo[0], lo[1])]));
  }

  const B = register(stage, (dt) => { const m = stepS(sp, dt); draw(); return m; });
  bag.add(B.unregister);

  function retarget() {
    sp.t = px === null ? REST : lerp(0, max, clamp((px - X0) / (X1 - X0), 0, 1));
    const a = Math.round(sp.t);
    read.textContent = px === null ? "rest" : a < 1 ? "closed" : `DRS ${a}°`;
    B.wake();
  }

  bag.add(pointer(stage, { move: (q) => { px = q[0]; retarget(); }, leave: () => { px = null; retarget(); } }));
  bag.add(() => svg.replaceChildren());
  draw();
  retarget();

  return {
    set: (v) => { max = v; retarget(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "drs",
  means: "A race car's rear wing: the pointer's x opens the DRS flap, from closed to its widest, and the slot under it opens with it.",
  rules: [1, 3, 5, 8],
  range: [24, 38, 52],
  tour: [[153, 86], [292, 155], [222, 120], null],
  mount,
});
