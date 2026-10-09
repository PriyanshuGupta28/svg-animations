/**
 * Loupe: a magnifying loupe held over a board of keyword tiles, each tile
 * ruled with a word or two. The pointer is projected onto the board; the loupe
 * rides over that ground point on springs, and the tiles under and near the
 * lens rise towards it, falling off with distance. The tile under the lens
 * takes the bright stroke; at rest the loupe is parked over one tile and the
 * board already swells beneath it. The slider is the lens radius.
 *
 * The lens rim is a ring: one opaque piece with a hole, the hole taken where
 * the rim's top and bottom openings overlap, so the far wall stays solid.
 */
const {
  Cam, clamp, circ, facing, fit, hull, open, poly, prism, proj, rings, ringAt, run, seg, unproj,
  spring, stepS, mk, pointer, put, register, disposer, solid,
} = HL;

const COLS = 7, ROWS = 5, PITCH = 18, T = 15, BX = (COLS - 1) * PITCH + T + 6, BY = (ROWS - 1) * PITCH + T + 6;
const ZL = 36, RH = 3.4, RW = 3.6, LIFT = 18, HLEN = 28, RMAX = 26, REST = [2, 1];
const CX0 = T / 2, CX1 = (COLS - 1) * PITCH + T / 2, CY1 = (ROWS - 1) * PITCH + T / 2;
const hash = (i, j, k) => { const s = Math.sin(i * 12.9898 + j * 78.233 + k * 37.719) * 43758.5453; return s - Math.floor(s); };
/** Share of the full lift at u lens-radii from the centre, down to a floor. */
const falloff = (u) => (u <= 0.5 ? 1 - u * 0.9 : u <= 1.4 ? 0.55 - (u - 0.5) * 0.5 : 0.1);
const shift = (ring, cx, cy) => ring.map((q) => ({ u: q.u + cx, v: q.v + cy, nu: q.nu, nv: q.nv }));
const area = (pts) => pts.reduce((s, p, k) => { const q = pts[(k + 1) % pts.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0);

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  const C = Cam(45, 0.5, 1.9);
  fit(C, [[-6, -6, -5], [BX, BY, -5], [BX, -6, -5], [-6, BY, -5],
    [CX0 - RMAX, CX0 - RMAX, ZL + RH], [CX1 + RMAX + HLEN, CY1, ZL], [CX1 + RMAX, CY1 + RMAX, ZL], [CX0 - RMAX, CY1 + RMAX, ZL]], 200, 162);
  const P = proj(C), front = facing(C);
  let R = value, over = null;

  const g = mk("g", {}, svg);
  const [br, bi] = rings(-6, -6, BX, BY, 8, 2.2);
  put(solid(g), prism(P, front, br, bi, -5, 0));

  const tiles = [];
  for (let s = 0; s <= COLS + ROWS - 2; s++) for (let i = 0; i < COLS; i++) {
    const j = s - i;
    if (j < 0 || j >= ROWS) continue;
    const x0 = i * PITCH, y0 = j * PITCH, h0 = 1.6 + 2.6 * hash(i, j, 0);
    const [ring, inner] = rings(x0, y0, x0 + T, y0 + T, 2.4, 0.9);
    const el = solid(g), words = mk("path", { class: "nf lo" }, el.g);
    // a keyword or two, ruled along the tile: lines of different lengths
    const lines = [[4.5, 3 + 8 * hash(i, j, 1)], [9, hash(i, j, 2) > 0.4 ? 2 + 7 * hash(i, j, 3) : 0]];
    tiles.push({ i, j, x0, y0, h0, ring, inner, el, words, lines, sp: spring(h0, { eps: 0.04 }), drawn: NaN });
  }

  // the loupe, painted last: it floats above everything on the board
  const lg = mk("g", {}, svg);
  const body = mk("path", { class: "fo" }, lg), rimS = mk("path", { class: "nf sil" }, lg);
  const rimC = mk("path", { class: "nf lo" }, lg), lip = mk("path", { class: "nf" }, lg), wall = mk("path", { class: "nf lo" }, lg);
  const handle = solid(lg), lx = spring(0), ly = spring(0);

  function drawLoupe(cx, cy) {
    const o = shift(circ(R, 40), cx, cy), n = shift(circ(R - RW, 40), cx, cy), z1 = ZL + RH;
    const sil = hull(ringAt(P, o, ZL).concat(ringAt(P, o, z1)));
    const hole = n.map((q) => P(q.u, q.v, front(q) ? z1 : ZL));
    if (Math.sign(area(hole)) === Math.sign(area(sil))) hole.reverse();
    body.setAttribute("d", poly(sil) + poly(hole));
    rimS.setAttribute("d", poly(sil));
    rimC.setAttribute("d", open(ringAt(P, run(shift(circ(R - 1, 40), cx, cy), front), z1)));
    lip.setAttribute("d", poly(ringAt(P, n, z1)));
    wall.setAttribute("d", open(ringAt(P, run(n, (q) => !front(q)), ZL)));
    const [hr, hi] = rings(cx + R - 1.5, cy - 3, cx + R + HLEN, cy + 3, 3, 0.9);
    put(handle, prism(P, front, hr, hi, ZL - 0.6, z1 + 0.6));
  }

  function drawTile(t) {
    const h = Math.max(0.6, t.sp.x);
    if (h === t.drawn) return;
    t.drawn = h;
    put(t.el, prism(P, front, t.ring, t.inner, 0, h));
    t.words.setAttribute("d", t.lines.filter((l) => l[1] > 0).map(([v, len]) => seg(P(t.x0 + 3, t.y0 + v, h), P(t.x0 + 3 + len, t.y0 + v, h))).join(""));
  }

  let drawnL = "";
  const B = register(stage, (dt) => {
    let m = stepS(lx, dt) | stepS(ly, dt);
    for (const t of tiles) { if (stepS(t.sp, dt)) m = true; drawTile(t); }
    const key = lx.x + "," + ly.x + "," + R;
    if (key !== drawnL) { drawnL = key; drawLoupe(lx.x, ly.x); }
    return !!m;
  });
  bag.add(B.unregister);

  function retarget() {
    const cx = over ? clamp(over[0], CX0, CX1) : REST[0] * PITCH + T / 2;
    const cy = over ? clamp(over[1], CX0, CY1) : REST[1] * PITCH + T / 2;
    lx.t = cx; ly.t = cy;
    const ci = clamp(Math.floor(cx / PITCH), 0, COLS - 1), cj = clamp(Math.floor(cy / PITCH), 0, ROWS - 1);
    for (const t of tiles) {
      const d = Math.hypot(t.x0 + T / 2 - cx, t.y0 + T / 2 - cy);
      t.sp.t = t.h0 + LIFT * falloff(d / (R * 1.7));
      t.el.sil.classList.toggle("hi", t.i === ci && t.j === cj);
    }
    read.textContent = over ? `tile ${ci + 1}·${cj + 1}` : "rest";
    B.wake();
  }

  bag.add(pointer(stage, {
    move: (p) => {
      const q = unproj(C, p[0], p[1], 3);
      over = q[0] < -14 || q[1] < -14 || q[0] > BX + 8 || q[1] > BY + 8 ? null : q;
      retarget();
    },
    leave: () => { over = null; retarget(); },
  }));
  bag.add(() => svg.replaceChildren());
  lx.x = lx.t = REST[0] * PITCH + T / 2; ly.x = ly.t = REST[1] * PITCH + T / 2;
  retarget();
  for (const t of tiles) t.sp.x = t.sp.t;

  return {
    set: (v) => { R = v; retarget(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "loupe",
  means: "A loupe over a board of keyword tiles: the tiles under the lens rise to meet it, less the farther they lie.",
  rules: [1, 3, 5, 6],
  range: [12, 19, 26],
  tour: [[150, 190], [290, 180], [241, 240], null],
  mount,
});
