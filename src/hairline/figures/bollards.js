/**
 * Bollards: a firewall as two staggered rows of retractable security bollards
 * across a road between kerbs. Each bollard is a post with a rounded cap, a
 * reflective band under it and a sleeve collar flush with the road. The
 * pointer is projected onto the road, which never moves, and the bollards near
 * it sink into their sleeves, the farther the less, each on its own spring and
 * clamped above the collar. At rest the line stands with one gap partly open
 * and one band bright. The slider is the radius, in world units.
 */
const {
  Cam, circ, clamp, fit, facing, open, poly, prism, proj, rings, ringAt, run, seg, unproj,
  spring, stepS, disposer, mk, pointer, put, register, solid,
} = HL;

/** Road length and width, kerb width and height, post radius, full height, lowest height, the rows' x. */
const L = 108, W = 96, KW = 8, KH = 4, PR = 5, H = 36, LOW = 2.5, RX = [48, 59];
/** Posts in order across the road, alternating rows, with their rest heights: posts 6 and 7 are down, their neighbours on the way. */
const REST = [H, H, H, H, 27, 9, 3, 19, H, H, H];
const POSTS = REST.map((h0, i) => ({ i, x: RX[i % 2], y: 6 + i * 8.4, h0 }));
const MARK = 3;

/** The share of the full drop at u radii from the pointer: 1 out to 20%, .31 at 55%, 0 at the edge and beyond. */
const falloff = (u) => (u <= 0.2 ? 1 : u <= 0.55 ? 1 - ((u - 0.2) / 0.35) * 0.69 : u <= 1 ? 0.31 * (1 - (u - 0.55) / 0.45) : 0);

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let R = value, over = null;

  const C = Cam(45, 0.5, 2.15);
  fit(C, [[0, -KW, -5], [L, W + KW, -5], [L, -KW, -5], [0, W + KW, -5], [RX[0], 0, H + 3], [RX[1], W, H + 3]], 200, 172);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  // the road slab, its lane marks, then the far kerb
  const [sr, si] = rings(0, -KW, L, W + KW, 6, 2);
  put(solid(g), prism(P, front, sr, si, -5, 0));
  let lane = "";
  for (let x = 5; x < L - 8; x += 15) if (x + 9 < RX[0] - 8 || x > RX[1] + 8) lane += seg(P(x, W / 2, 0), P(x + 9, W / 2, 0));
  lane += seg(P(RX[0] - 12, 2, 0), P(RX[0] - 12, W - 2, 0)) + seg(P(RX[1] + 12, 2, 0), P(RX[1] + 12, W - 2, 0));
  mk("path", { d: lane, class: "nf lo" }, g);
  const [k1, k1i] = rings(0, -KW, L, 0, 2.5, 1);
  put(solid(g), prism(P, front, k1, k1i, 0, KH));

  const body = circ(PR, 20), crease = circ(PR - 1, 20), cap = circ(PR - 1.3, 20), capIn = circ(PR - 2.1, 20);
  const collar = circ(PR + 2, 20), band = run(body, front);
  const posts = POSTS.slice().sort((a, b) => a.x + a.y - (b.x + b.y)).map((p) => {
    const pg = mk("g", {}, g), at = (ring) => ring.map((q) => ({ ...q, u: q.u + p.x, v: q.v + p.y }));
    mk("path", { d: poly(ringAt(P, at(collar), 0)), class: "nf lo" }, pg);
    mk("path", { d: poly(ringAt(P, at(circ(PR + 0.8, 20)), 0)), class: "lo" }, pg);
    return {
      ...p, rb: at(body), rc: at(crease), rk: at(cap), rki: at(capIn), rband: at(band),
      el: solid(pg), top: solid(pg), band: mk("path", { class: "nf" }, pg), sp: spring(p.h0, { eps: 0.04 }), drawn: NaN,
    };
  });
  const byIndex = posts.slice().sort((a, b) => a.i - b.i);

  // the near kerb last: it covers the foot of every post behind it
  const [k2, k2i] = rings(0, W, L, W + KW, 2.5, 1);
  put(solid(g), prism(P, front, k2, k2i, 0, KH));

  function draw(p) {
    const h = clamp(p.sp.x, LOW, H);
    if (h === p.drawn) return;
    p.drawn = h;
    put(p.el, prism(P, front, p.rb, p.rc, 0, h));
    put(p.top, prism(P, front, p.rk, p.rki, h, h + 1.8));
    // the reflective band: two rings round the front, a hand under the cap, hidden once it sinks into the sleeve
    const z0 = h - 4, z1 = h - 7.5;
    p.band.setAttribute("d", (z0 > 0.5 ? open(ringAt(P, p.rband, z0)) : "") + (z1 > 0.5 ? open(ringAt(P, p.rband, z1)) : ""));
  }

  const B = register(stage, (dt) => {
    let m = false;
    for (const p of posts) { if (stepS(p.sp, dt)) m = true; draw(p); }
    return m;
  });
  bag.add(B.unregister);

  function retarget() {
    let near = null, nd = Infinity;
    for (const p of posts) {
      if (!over) { p.sp.t = p.h0; continue; }
      const d = Math.hypot(p.x - over[0], p.y - over[1]);
      p.sp.t = clamp(H - (H - LOW) * falloff(d / R), LOW, H);
      if (d < nd) { nd = d; near = p; }
    }
    const lit = near || byIndex[MARK];
    for (const p of posts) { p.band.classList.toggle("hi", p === lit); p.top.sil.classList.toggle("hi", p === lit); }
    read.textContent = near ? `post ${near.i + 1} · ${near.sp.t < H * 0.35 ? "down" : near.sp.t < H * 0.9 ? "half" : "up"}` : "rest";
    B.wake();
  }

  bag.add(pointer(stage, {
    move: (p) => {
      const [x, y] = unproj(C, p[0], p[1], 0);
      over = x > -10 && x < L + 10 && y > -KW - 6 && y < W + KW + 6 ? [x, y] : null;
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
  name: "bollards",
  means: "A firewall as a line of security bollards across a road: the ones near the pointer sink into the ground, the farther the less.",
  rules: [1, 3, 5, 9],
  range: [20, 32, 48],
  tour: [[145, 210], [200, 182], [255, 155], null],
  mount,
});
