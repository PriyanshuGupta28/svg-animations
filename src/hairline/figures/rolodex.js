/**
 * Rolodex: a rotary card file. Two side discs on feet stand on a low base,
 * an axle runs between them with a knob on the near end, and twenty cards
 * radiate from the axle, each with an index tab stepped across its top edge.
 * The cards part around the one standing upright, the card being read. The
 * pointer pushes the wheel: entering it, or moving across it, adds spin;
 * friction bleeds the spin, and when it is slow a detent spring catches it
 * with one card upright. That card takes the bright stroke and the read-out
 * names it. The slider is the coast: the friction, per second.
 *
 * The pattern: push the camera. Friction, then a spring; the hit test is a
 * fixed disc round the axle's screen point, which never moves.
 */
const {
  Cam, clamp, facing, fillet, fit, hull, poly, prism, proj, rings,
  spring, stepS, reducedMotion, disposer, mk, pointer, put, register, solid,
} = HL;

const K = 20, STEP = (2 * Math.PI) / K, W = 64, R0 = 10, R1 = 44, TH = 5, TW = 13;
const XS = 35, DT = 1.2, RD = 30, ZA = 56, KR = 7, KL = 9;
const GAP = 0.2, SIG = 0.22, CATCH = 1.4, VMAX = 14, REST = -11 * STEP;

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
/** The card upright, when the wheel has turned by rot. */
const upright = (rot) => ((Math.round(-rot / STEP) % K) + K) % K;
/** Where a card at wheel angle a is drawn: the cards part around the upright one. */
const fan = (a) => { const w = wrap(a); return w + GAP * Math.tanh(w / SIG) * (1 - Math.abs(w) / Math.PI); };

/** A card's outline in its own plane, (u across, r out from the axle): a rail notch below, an index tab above. */
function card(k) {
  const t0 = -W / 2 + 3 + ((k * 3) % 5) * ((W - 6 - TW) / 4), h = W / 2;
  return fillet(
    [[-h, R0], [-4, R0], [-4, R0 + 4], [4, R0 + 4], [4, R0], [h, R0], [h, R1], [t0 + TW, R1], [t0 + TW, R1 + TH], [t0, R1 + TH], [t0, R1], [-h, R1]],
    [2, 0.6, 1, 1, 0.6, 2, 2.4, 1.2, 1.8, 1.8, 1.2, 2.4],
  );
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let F = value;

  const S = 1.72, C = Cam(45, 0.5, S);
  const box = [];
  for (let i = 0; i < 16; i++) {
    const t = (i / 16) * 2 * Math.PI, r = R1 + TH;
    box.push([-W / 2, r * Math.sin(t), ZA + r * Math.cos(t)], [W / 2, r * Math.sin(t), ZA + r * Math.cos(t)]);
  }
  box.push([-XS - 8, -34, 0], [XS + 8, 34, 0], [XS + 8, -34, 0], [-XS - 8, 34, 0], [XS + DT + KL, 0, ZA]);
  fit(C, box, 200, 166);
  const P = proj(C), front = facing(C);

  /** A short cylinder lying along x, from xa to xb, round the axle: its silhouette, and its near face one unit in. */
  const ringX = (x, r) => Array.from({ length: 36 }, (_, i) => { const t = (i / 36) * 2 * Math.PI; return P(x, r * Math.cos(t), ZA + r * Math.sin(t)); });
  const drum = (g, xa, xb, r) => put(solid(g), { sil: poly(hull(ringX(xa, r).concat(ringX(xb, r)))), crease: poly(ringX(xb, r - 1.4)) });
  const foot = (g, x) => { const [o, i] = rings(x - 4, -10, x + 4, 10, 3, 1); put(solid(g), prism(P, front, o, i, 6, ZA - RD + 6)); };

  const g = mk("g", {}, svg);
  const [bo, bi] = rings(-XS - 8, -34, XS + 8, 34, 9, 1.8);
  put(solid(g), prism(P, front, bo, bi, 0, 6));
  foot(g, -XS);
  drum(g, -XS - DT, -XS + DT, RD);
  const cg = mk("g", {}, g), cards = [];
  for (let k = 0; k < K; k++) cards.push({ k, shape: card(k), el: mk("path", { class: "sil" }, cg), depth: 0 });
  foot(g, XS);
  drum(g, XS - DT, XS + DT, RD);
  drum(g, XS + DT, XS + DT + 2, KR - 2.5);
  drum(g, XS + DT + 2, XS + DT + KL, KR);

  let rot = REST, vel = 0, sp = null, drawn = NaN, lit = -1, order = "";
  function draw() {
    if (rot === drawn) return;
    drawn = rot;
    for (const cd of cards) {
      const a = fan(rot + cd.k * STEP), s = Math.sin(a), c = Math.cos(a);
      cd.el.setAttribute("d", poly(cd.shape.map(([u, r]) => P(u, r * s, ZA + r * c))));
      cd.depth = 0.612 * s + 0.5 * c;
    }
    // back to front: a nearer card covers a farther one; move the paths only when the order changes
    const sorted = cards.slice().sort((p, q) => p.depth - q.depth), key = sorted.map((cd) => cd.k).join();
    if (key !== order) { order = key; for (const cd of sorted) cg.append(cd.el); }
    const f = upright(rot);
    if (f !== lit) {
      if (lit >= 0) cards[lit].el.classList.replace("hi", "sil");
      cards[f].el.classList.replace("sil", "hi");
      lit = f;
    }
  }

  let over = false;
  const name = () => (read.textContent = over ? `card ${upright(rot) + 1}` : "rest");

  /** A spring onto the next detent in the direction of travel. */
  function catchIt(ahead) {
    const n = rot / STEP;
    sp = spring(rot);
    sp.t = STEP * (vel > 0 ? Math.ceil(n + ahead) : vel < 0 ? Math.floor(n - ahead) : Math.round(n));
    vel = 0;
  }

  const B = register(stage, (dt) => {
    let m = false;
    if (vel !== 0) {
      if (reducedMotion()) { rot += vel / F; catchIt(0); }
      else {
        rot += vel * dt;
        vel *= Math.exp(-F * dt);
        if (Math.abs(vel) < CATCH) catchIt(0.15);
      }
      m = true;
    }
    if (sp) { m = stepS(sp, dt) || m; rot = sp.x; if (!m) sp = null; }
    draw();
    if (over) name();
    return m;
  });
  bag.add(B.unregister);

  function push(dv) {
    sp = null;
    vel = clamp(vel + dv, -VMAX, VMAX);
    B.wake();
  }

  // The wheel's reach on screen, round the axle's middle, at rest: it never moves.
  const O = P(0, 0, ZA), a0 = P(0, 0, 0), a1 = P(1, 0, 0), al = Math.hypot(a1[0] - a0[0], a1[1] - a0[1]);
  const n = [-(a1[1] - a0[1]) / al, (a1[0] - a0[0]) / al], REACH = (R1 + TH) * S;
  let prev = null;
  bag.add(pointer(stage, {
    move: (p) => {
      const dx = p[0] - O[0], dy = p[1] - O[1];
      over = Math.hypot(dx, dy) < REACH;
      if (!over) { prev = null; name(); return; }
      // entering flicks the wheel by where it lands, above the axle or below; moving across it pushes the cards it passes
      if (prev === null) { const t = clamp((dx * n[0] + dy * n[1]) / REACH, -1, 1); push((t < 0 ? -1 : 1) * (5 + 5 * Math.abs(t))); }
      else push(0.3 * ((p[0] - prev[0]) * n[0] + (p[1] - prev[1]) * n[1]));
      prev = p;
      name();
    },
    leave: () => { over = false; prev = null; name(); },
  }));
  bag.add(() => svg.replaceChildren());
  draw();
  name();

  return {
    set: (v) => { F = v; },
    destroy: bag.dispose,
  };
}

hairline({
  name: "rolodex",
  means: "A rotary card file you push round: friction bleeds the spin and a detent stops it with one card upright.",
  rules: [1, 3, 5, 8],
  range: [3.2, 1.6, 0.7],
  tour: [[200, 77], [140, 180], [260, 120], null],
  mount,
});
