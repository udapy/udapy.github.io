/* Landing-page black hole. Decorative. Not physically exact.
   Inclined disk, Doppler color, a cheap gravitational warp.
   High-alpha cyan / gold / magenta — not the page rust. */
(function () {
  const cv = document.getElementById("cv-blackhole");
  if (!cv) return;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = 420;
  const H = 420;
  cv.width = W * dpr;
  cv.height = H * dpr;
  const ctx = cv.getContext("2d", { alpha: false });
  ctx.scale(dpr, dpr);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const CX = W / 2;
  const CY = H / 2 + 6;
  const RS = 38;
  const INC = 1.18;
  const N = 980;
  const STARS = 70;

  function mulberry(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const rand = mulberry(0x51ed);
  const particles = [];
  for (let i = 0; i < N; i++) {
    const u = rand();
    const r = RS * (1.85 + Math.pow(u, 0.62) * 5.4);
    particles.push({
      r: r,
      a: rand() * Math.PI * 2,
      w: 0.55 / Math.pow(r / RS, 1.5),
      s: 1.1 + rand() * 1.9,
      hot: rand(),
    });
  }
  const stars = [];
  for (let i = 0; i < STARS; i++) {
    stars.push({
      x: (rand() - 0.5) * W * 1.35,
      y: (rand() - 0.5) * H * 1.35,
      s: 0.5 + rand() * 1.3,
      a: 0.35 + rand() * 0.55,
    });
  }

  function lens(x, y) {
    const b2 = x * x + y * y;
    const rs2 = RS * RS;
    if (b2 < rs2 * 0.92) return null;
    const f = 1 - (1.35 * rs2) / Math.max(b2, rs2 * 1.05);
    return [x * f, y * f];
  }

  function rgb(r, g, b, a) {
    return "rgba(" + r + "," + g + "," + b + "," + a + ")";
  }

  function doppler(cosA, hot) {
    const t = (cosA + 1) * 0.5;
    const r = (255 * (1 - t) + 70 * t + 40 * hot) | 0;
    const g = (90 * (1 - t) + 232 * t + 20 * hot) | 0;
    const b = (210 * (1 - t) + 175 * t) | 0;
    return [Math.min(255, r), Math.min(255, g), Math.min(255, b)];
  }

  function paint(t) {
    ctx.fillStyle = "#100e14";
    ctx.fillRect(0, 0, W, H);

    const wash = ctx.createRadialGradient(CX - 40, CY + 10, 8, CX, CY, W * 0.62);
    wash.addColorStop(0, "rgba(94, 240, 232, 0.28)");
    wash.addColorStop(0.35, "rgba(232, 90, 170, 0.22)");
    wash.addColorStop(0.7, "rgba(70, 90, 200, 0.12)");
    wash.addColorStop(1, "rgba(16, 14, 20, 0)");
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, W, H);

    for (let i = 0; i < stars.length; i++) {
      const st = stars[i];
      const p = lens(st.x, st.y);
      if (!p) continue;
      ctx.fillStyle = rgb(186, 210, 255, st.a);
      ctx.beginPath();
      ctx.arc(CX + p[0], CY + p[1], st.s, 0, Math.PI * 2);
      ctx.fill();
    }

    const far = [];
    const near = [];
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const a = p.a + t * p.w;
      const x = p.r * Math.cos(a);
      const z = p.r * Math.sin(a);
      const y = z * Math.sin(INC);
      const depth = z * Math.cos(INC);
      const warped = lens(x, y);
      if (!warped) continue;
      const extra = depth > 0 ? (0.55 * RS * RS) / (x * x + y * y + RS * RS) : 0;
      const sx = warped[0] * (1 - extra);
      const sy = warped[1] * (1 - extra) - depth * 0.04;
      const item = { sx: sx, sy: sy, a: a, p: p, depth: depth };
      if (depth > 0) far.push(item);
      else near.push(item);
    }

    function drawSet(set) {
      for (let i = 0; i < set.length; i++) {
        const it = set[i];
        const col = doppler(Math.cos(it.a), it.p.hot);
        const dist = Math.hypot(it.sx, it.sy);
        const ring = Math.abs(dist - RS * 1.55) < 7 ? 0.2 : 0;
        ctx.fillStyle = rgb(col[0], col[1], col[2], 0.9 + ring);
        ctx.beginPath();
        ctx.arc(CX + it.sx, CY + it.sy, it.p.s, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    drawSet(far);

    const g = ctx.createRadialGradient(CX, CY, RS * 0.2, CX, CY, RS * 1.15);
    g.addColorStop(0, "#05040a");
    g.addColorStop(0.72, "#0a0810");
    g.addColorStop(1, "rgba(10,8,16,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(CX, CY, RS * 1.12, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(170, 210, 255, 0.92)";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.ellipse(CX, CY, RS * 1.52, RS * 1.52 * Math.cos(INC * 0.42), 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(94, 240, 232, 0.55)";
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.fillStyle = "#07060c";
    ctx.beginPath();
    ctx.arc(CX, CY, RS * 0.96, 0, Math.PI * 2);
    ctx.fill();

    drawSet(near);
  }

  const t0 = performance.now();
  let running = true;
  let looping = false;
  function frame(now) {
    if (!running) {
      looping = false;
      return;
    }
    const t = reduce ? 0 : (now - t0) / 1000;
    paint(t);
    if (!reduce && running) requestAnimationFrame(frame);
    else looping = false;
  }

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      function (entries) {
        running = !!(entries[0] && entries[0].isIntersecting);
        if (running && !reduce && !looping) {
          looping = true;
          requestAnimationFrame(frame);
        }
      },
      { threshold: 0.05 }
    );
    io.observe(cv);
  }

  paint(0);
  if (!reduce) {
    looping = true;
    requestAnimationFrame(frame);
  }
})();

