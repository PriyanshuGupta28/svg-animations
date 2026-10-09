/**
 * Feed: a phone lying on the desk, and a feed of posts scrolling up its
 * screen, never stopping. Each post is a thin card with an avatar, a name
 * line, a picture and a caption; it slides in at the bottom of the glass and
 * out at the top, cut by the screen's edge. Hovering the phone slows the
 * scroll on a spring so a post can be read; the post under the pointer lifts
 * and takes the bright stroke. At rest the screen's edge is bright. The slider
 * is the scroll rate, in world units a second.
 */
const {
  Cam, circ, fit, facing, poly, prism, proj, rings, rrect, seg, unproj, ringAt,
  spring, stepS, tween, tset, tval, tdone, reducedMotion,
  mk, pointer, put, register, disposer, solid,
} = HL;

const PW = 76, PL = 156, PT = 6, X0 = 9, X1 = PW - 9, Y0 = 17, Y1 = PL - 17;
const CH = 38, PITCH = 45, POOL = 5, LIFT = 7, SLOW = 0.1;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  const C = Cam(45, 0.5, 1.78);
  fit(C, [[0, 0, -2], [PW, PL, -2], [PW, 0, 0], [0, PL, 0], [0, Y0, PT + LIFT + 2]], 200, 166);
  const P = proj(C), front = facing(C);
  let over = null, act = null, s = 6 * PITCH;
  const rate = spring(value);

  const g = mk("g", {}, svg);
  const [or, oi] = rings(0, 0, PW, PL, 15, 2);
  put(solid(g), prism(P, front, or, oi, -2, PT));
  const glass = mk("path", { class: "nf lo", d: poly(ringAt(P, rrect(X0 - 1, Y0 - 1, X1 + 1, Y1 + 1, 8, 6), PT)) }, g);
  mk("path", { class: "nf lo", d: poly(ringAt(P, rrect(PW / 2 - 11, 7, PW / 2 + 11, 10, 1.5, 4), PT)) }, g);
  mk("path", { class: "nf lo", d: poly(ringAt(P, rrect(PW / 2 - 9, PL - 9, PW / 2 + 9, PL - 7.5, 0.75, 4), PT)) }, g);

  const slots = [];
  for (let n = 0; n < POOL; n++) {
    const grp = mk("g", {}, g), el = solid(grp);
    const pic = mk("path", { class: "nf lo" }, grp), lines = mk("path", { class: "nf lo" }, grp);
    slots.push({ grp, el, pic, lines, z: tween(0) });
  }

  /** The part of [a, b] the glass shows, or null. */
  const cut = (a, b) => { const lo = Math.max(a, Y0), hi = Math.min(b, Y1); return hi - lo > 1.5 ? [lo, hi] : null; };

  function draw(sl, k, now) {
    const y = Y1 - (s - k * PITCH) - CH, lift = tval(sl.z, now), z0 = PT + 0.3 + lift, z1 = z0 + 1.3;
    const body = cut(y, y + CH);
    if (!body) { put(sl.el, { sil: "", crease: "" }); sl.pic.setAttribute("d", ""); sl.lines.setAttribute("d", ""); return; }
    const [ring, inner] = rings(X0 + 2, body[0], X1 - 2, body[1], Math.min(3, (body[1] - body[0]) / 2), 0.7);
    put(sl.el, prism(P, front, ring, inner, z0, z1));
    const pc = cut(y + 9, y + 28);
    sl.pic.setAttribute("d", pc ? poly(ringAt(P, rrect(X0 + 5, pc[0], X1 - 5, pc[1], 1.5, 3), z1)) : "");
    let d = "";
    // the avatar, a small ring, and the name beside it
    if (cut(y + 2, y + 7)) d += poly(ringAt(P, circ(2.2, 8).map((q) => ({ ...q, u: q.u + X0 + 7, v: q.v + y + 4.5 })), z1)) + seg(P(X0 + 12, y + 4.5, z1), P(X0 + 30, y + 4.5, z1));
    for (const v of [y + 31.5, y + 34.5]) if (v > Y0 && v < Y1) d += seg(P(X0 + 5, v, z1), P(v > y + 33 ? X1 - 22 : X1 - 5, v, z1));
    sl.lines.setAttribute("d", d);
  }

  let order = "";
  const B = register(stage, (dt, now) => {
    const m = stepS(rate, dt);
    if (!reducedMotion()) s += rate.x * dt;
    // Which posts the glass shows: card k sits at Y1 - (s - k·PITCH) - CH.
    const k0 = Math.ceil((s - (Y1 - Y0) - CH) / PITCH) - 1, ks = [];
    for (let k = k0; k <= k0 + POOL - 1; k++) ks.push(k);
    act = null;
    if (over && over[0] > X0 && over[0] < X1) for (const k of ks) { const y = Y1 - (s - k * PITCH) - CH; if (over[1] >= y && over[1] <= y + CH && over[1] > Y0 && over[1] < Y1) act = k; }
    for (const k of ks) {
      const sl = slots[((k % POOL) + POOL) % POOL];
      tset(sl.z, k === act ? LIFT : 0, now, 0);
      sl.el.sil.classList.toggle("hi", k === act);
      draw(sl, k, now);
    }
    // Paint back to front: the farthest post (smallest y) first.
    const key = ks.join();
    if (key !== order) { order = key; for (const k of ks) g.append(slots[((k % POOL) + POOL) % POOL].grp); }
    glass.setAttribute("class", act === null ? "nf hi" : "nf lo");
    read.textContent = act === null ? (over ? "feed" : "rest") : "post " + String(((act % 100) + 100) % 100).padStart(2, "0");
    return !reducedMotion() || m || slots.some((sl) => !tdone(sl.z, now));
  });
  bag.add(B.unregister);

  function retarget() { rate.t = over ? value * SLOW : value; B.wake(); }
  bag.add(pointer(stage, {
    move: (p) => {
      const w = unproj(C, p[0], p[1], PT);
      over = w[0] < -4 || w[1] < -4 || w[0] > PW + 4 || w[1] > PL + 4 ? null : w;
      retarget();
    },
    leave: () => { over = null; retarget(); },
  }));
  bag.add(() => svg.replaceChildren());
  retarget();

  return {
    set: (v) => { value = v; retarget(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "feed",
  means: "A phone's feed scrolls on without end; hovering slows it so one post can be read, and that post lifts.",
  rules: [1, 4, 7, 8],
  range: [8, 18, 32],
  tour: [[262, 132], [197, 163], [140, 195], null],
  mount,
});
