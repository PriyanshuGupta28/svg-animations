/**
 * Easerail: five parallel rails strung between two end blocks on a plinth,
 * a bead on each, like an abacus. The pointer's place along the rails sets one
 * shared target, marked by a dashed line across the plinth; every bead
 * follows it on its own spring, from stiff to loose, so the row fans out in
 * motion and closes up as it settles. At rest the beads sit as if caught
 * mid-flight, the stiff one ahead, and it holds the bright stroke. The slider
 * is the damping spread: how much less damped each rail is than the last.
 *
 * Why the springs are not the default: the figure is five easings side by
 * side, so each rail takes its own k and damping ratio; the stiffest is close
 * to the default.
 */
const {
  Cam, clamp, facing, fit, prism, proj, rings, seg, unproj, spring, stepS,
  flatDot, mk, place, pointer, put, register, disposer, solid,
} = HL;

const N = 5, L = 150, GAP = 22, RZ = 12, BS = 8.5, K = [170, 120, 85, 60, 42];
const REST = [0.9, 0.71, 0.5, 0.3, 0.12];
const Y1 = (N - 1) * GAP;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let spread = value, over = null;

  const C = Cam(45, 0.5, 1.5);
  fit(C, [[-18, -16, -6], [L + 18, Y1 + 16, -6], [L + 18, -16, -6], [-18, Y1 + 16, -6], [-14, -12, 20]], 200, 166);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  const [pr, pi] = rings(-18, -16, L + 18, Y1 + 16, 9, 2.2);
  put(solid(g), prism(P, front, pr, pi, -6, 0));
  // the target, on the plinth, behind everything standing on it
  const guide = mk("path", { class: "dash nf" }, g);
  const ends = [flatDot(g, C, 1.4, "dot off"), flatDot(g, C, 1.4, "dot off")];

  const block = (x0, x1) => { const [r, i] = rings(x0, -10, x1, Y1 + 10, 4, 1.4); put(solid(g), prism(P, front, r, i, 0, RZ + 9)); };
  block(-14, -4);

  const rails = [];
  for (let i = 0; i < N; i++) {
    const y = i * GAP, [rr, ri] = rings(-4, y - 1.3, L + 4, y + 1.3, 1.3, 0.5);
    put(solid(g), prism(P, front, rr, ri, RZ - 1.3, RZ + 1.3));
    const sp = spring(REST[i], { k: K[i], c: 0 });
    rails.push({ i, y, sp, el: solid(g), drawn: NaN });
  }
  block(L + 4, L + 14);

  /** Damping for rail i: ratio 1 on the first, falling by the spread each rail. */
  function damp() {
    rails.forEach((r) => { r.sp.c = 2 * clamp(1 - spread * (r.i / (N - 1)), 0.15, 1) * Math.sqrt(K[r.i]); });
  }
  damp();

  const bx = (t) => BS + clamp(t, 0, 1) * (L - 2 * BS);
  function draw(r) {
    if (r.sp.x === r.drawn) return;
    r.drawn = r.sp.x;
    const x = bx(r.sp.x), [br, bi] = rings(x - BS, r.y - BS, x + BS, r.y + BS, 5.5, 1.6);
    put(r.el, prism(P, front, br, bi, RZ - BS, RZ + BS));
  }

  const B = register(stage, (dt) => {
    let m = false;
    for (const r of rails) { if (stepS(r.sp, dt)) m = true; draw(r); }
    return m;
  });
  bag.add(B.unregister);

  function retarget() {
    rails.forEach((r) => { r.sp.t = over === null ? REST[r.i] : over; });
    rails[0].el.sil.classList.toggle("hi", over === null);
    ends.forEach((e) => e.setAttribute("class", over === null ? "dot off" : "dot"));
    const x = bx(over === null ? REST[0] : over);
    guide.setAttribute("d", over === null ? "" : seg(P(x, -12, 0), P(x, Y1 + 12, 0)));
    place(ends[0], P(x, -13, 0)); place(ends[1], P(x, Y1 + 13, 0));
    ends.forEach((e) => e.setAttribute("display", over === null ? "none" : "inline"));
    read.textContent = over === null ? "rest" : `x ${over.toFixed(2)}`;
    B.wake();
  }

  // The rails' plane never moves: the pointer is read on it.
  bag.add(pointer(stage, {
    move: (p) => {
      const [u, v] = unproj(C, p[0], p[1], RZ);
      const on = u > -14 && u < L + 14 && v > -16 && v < Y1 + 16;
      over = on ? Math.round(clamp((u - BS) / (L - 2 * BS), 0, 1) * 100) / 100 : null;
      retarget();
    },
    leave: () => { over = null; retarget(); },
  }));
  bag.add(() => svg.replaceChildren());
  retarget();

  return {
    set: (v) => { spread = v; damp(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "easerail",
  means: "Five beads on rails chase one target, each on its own spring from stiff to loose: five easings side by side.",
  rules: [1, 3, 5, 8],
  range: [0.1, 0.45, 0.85],
  tour: [[150, 134], [240, 160], [316, 178], null],
  mount,
});
