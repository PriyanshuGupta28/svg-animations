/**
 * Pour: a standard can held over a straight glass. The can has its chime, a
 * necked-in shoulder, a rim, and a lid with a rivet, a pull tab and the open
 * mouth on the side toward the glass. The pointer's x tilts the can on a
 * spring, clamped from upright to 120°; past 70° a dashed stream falls from
 * the mouth, and the level in the glass, a line round its inside, rises with
 * the tilt. At rest the can leans 40° and the glass's rim is bright. The
 * slider is the most the glass fills, as a share of its height.
 */
const {
  Cam, clamp, fillet, fit, hull, open, poly, proj, rad, rrect, run, seg, circ,
  spring, stepS, disposer, mk, place, pointer, register,
} = HL;

const R = 11, H = 41, GR = 14, GH = 46, PZ = GH + 27, REACH = 18.5, AZ = 35, MAX = 120, REST = 40, POUR = 70, LOW = 0.18;
const PROFILE = [[0, 0.8], [2.4, 1], [H - 6.5, 1], [H - 1.6, 0.83], [H, 0.86]];
const U = circ(1, 64), R2 = Math.SQRT1_2;
/** The pour runs from the can toward the glass, turned AZ degrees off the screen's right toward the viewer. */
const DX = R2 * (Math.cos(rad(AZ)) + Math.sin(rad(AZ))), DY = R2 * (Math.sin(rad(AZ)) - Math.cos(rad(AZ)));
/** The glass stands on the desk at the origin; the can turns about its middle, held above and behind it. */
const PX = -REACH * DX, PY = -REACH * DY;

/** The lid's parts in the tab's own frame (p along the tab, toward the mouth; q across), in units of R. */
const LID = {
  tab: rrect(-0.66, -0.26, 0.2, 0.26, 0.2, 3).map((q) => [q.u, q.v]),
  hole: rrect(-0.56, -0.14, -0.24, 0.14, 0.13, 3).map((q) => [q.u, q.v]),
  open: fillet([[0.25, -0.15], [0.68, -0.3], [0.68, 0.3], [0.25, 0.15]], [0.08, 0.2, 0.2, 0.08], 3),
};
/** Whether a world direction faces the 2:1 camera at azimuth 45. */
const faces = ([x, y, z]) => (x + y) * R2 * 0.866 + z * 0.5 > 0;

/** The can tilted th degrees toward the glass: world points and world directions of its own frame, z up its axis from the chime. */
function canFrame(th) {
  const s = Math.sin(rad(th)), c = Math.cos(rad(th));
  const dir = (lx, ly, lz) => {
    const a = lx * DX + ly * DY, b = ly * DX - lx * DY;
    return [a * c * DX - b * DY + lz * s * DX, a * c * DY + b * DX + lz * s * DY, -a * s + lz * c];
  };
  const pt = (lx, ly, lz) => { const [x, y, z] = dir(lx, ly, lz - H / 2); return [PX + x, PY + y, PZ + z]; };
  return { pt, dir };
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let top = value, over = false;
  const C = Cam(45, 0.5, 3.0);
  const box = [[GR, GR, 0], [-GR, -GR, 0], [GR, -GR, GH], [-GR, GR, GH]];
  for (const th of [0, 40, 80, 120]) { const f = canFrame(th); for (const [x, y, z] of [[R, R, 0], [-R, -R, 0], [R, R, H], [-R, -R, H], [R, -R, H], [-R, R, 0]]) box.push(f.pt(x, y, z)); }
  fit(C, box, 200, 166);
  const P = proj(C);
  const ringAt = (r, z, ring = U) => ring.map((q) => P(q.u * r, q.v * r, z));

  // the glass: a tumbler a little narrower at its foot, with a thick floor, seen through
  const g = mk("g", {}, svg);
  mk("path", { d: poly(hull(ringAt(GR - 1.2, 0).concat(ringAt(GR, GH)))), class: "sil" }, g);
  mk("path", { d: poly(ringAt(GR - 2.6, 5)), class: "nf lo" }, g);
  const level = mk("path", { class: "nf" }, g);
  const rim = mk("path", { d: poly(ringAt(GR, GH)), class: "nf" }, g);
  mk("path", { d: poly(ringAt(GR - 1.3, GH)), class: "nf lo" }, g);
  const stream = mk("path", { class: "nf dash" }, g);

  const cg = mk("g", {}, svg);
  const sil = mk("path", { class: "sil" }, cg), cr = mk("path", { class: "nf lo" }, cg);
  const lidRim = mk("path", { class: "nf" }, cg), well = mk("path", { class: "nf lo" }, cg), mouth = mk("path", { class: "nf" }, cg);
  const tab = mk("path", {}, cg), hole = mk("path", { class: "nf lo" }, cg), rivet = mk("circle", { r: 1, class: "dot off" }, cg);

  const sp = spring(REST, { eps: 0.05 });
  /** How full the glass is at a tilt, as a share of its height: it rises from LOW as the can passes REST, to `top` at the far end. */
  const fill = (th) => LOW + (top - LOW) * clamp((th - REST) / (MAX - REST), 0, 1) ** 1.3;
  let drawn = NaN;
  function draw() {
    if (sp.x === drawn) return;
    drawn = sp.x;
    const th = clamp(sp.x, 0, MAX), f = canFrame(th), w = (x, y, z) => P(...f.pt(x, y, z));
    const ring = (r, z, rg = U) => rg.map((q) => w(q.u * r, q.v * r, z));
    sil.setAttribute("d", poly(hull(PROFILE.flatMap(([z, r]) => ring(r * R, z)))));
    cr.setAttribute("d", open(ring(R, PROFILE[2][0], run(U, (q) => faces(f.dir(q.u, q.v, 0))))));
    lidRim.setAttribute("d", poly(ring(0.86 * R, H)));
    well.setAttribute("d", poly(ring(0.76 * R, H - 0.8)));
    const lid = (pts) => poly(pts.map(([p, q]) => w(R * (p * DX - q * DY), R * (p * DY + q * DX), H - 0.8)));
    mouth.setAttribute("d", lid(LID.open));
    tab.setAttribute("d", lid(LID.tab));
    hole.setAttribute("d", lid(LID.hole));
    place(rivet, w(0, 0, H - 0.6));
    // the level, and the stream from the mouth straight down onto it once the can is past POUR
    const z = 5 + fill(th) * (GH - 9);
    level.setAttribute("d", poly(ringAt(GR - 1.6, z)));
    const [mx, my, mz] = f.pt(0.5 * R * DX, 0.5 * R * DY, H);
    stream.setAttribute("d", th > POUR && mz > z ? seg(P(mx, my, mz), P(mx, my, z)) : "");
  }

  const B = register(stage, (dt) => {
    const m = stepS(sp, dt);
    draw();
    return m;
  });
  bag.add(B.unregister);

  function retarget(x) {
    over = x !== null;
    sp.t = over ? clamp(((x - 90) / 220) * MAX, 0, MAX) : REST;
    rim.classList.toggle("hi", !over);
    level.classList.toggle("hi", over);
    read.textContent = over ? `pour ${Math.round(fill(sp.t) * 100)}%` : "rest";
    B.wake();
  }

  bag.add(pointer(stage, { move: (p) => retarget(p[0]), leave: () => retarget(null) }));
  bag.add(() => svg.replaceChildren());
  retarget(null);

  return {
    set: (v) => { top = v; drawn = NaN; if (over) read.textContent = `pour ${Math.round(fill(sp.t) * 100)}%`; B.wake(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "pour",
  means: "A can pouring into a glass: the pointer tilts the can, and past the tipping point the level in the glass rises.",
  rules: [3, 4, 5, 8],
  range: [0.55, 0.75, 0.92],
  tour: [[150, 160], [300, 160], [240, 160], null],
  mount,
});
