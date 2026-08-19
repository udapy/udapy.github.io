/* Light-theme Grok starfield: 3D dust, slow spin, mouse parallax. */
(function () {
  const cv = document.getElementById("grain-bg");
  if (!cv) return;

  const ctx = cv.getContext("2d", { alpha: true });
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  let w = 0;
  let h = 0;
  let stars = [];
  let streaks = [];
  let running = true;
  let looping = false;
  const t0 = performance.now();
  let mx = 0;
  let my = 0;
  let tx = 0;
  let ty = 0;
  let cx = 0;
  let cy = 0;
  let ex = 0;
  let ey = 0;
  let px = 0;
  let py = 0;
  let blink = 1;
  let blinkD = 1;

  function mulberry(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function spawn(rand) {
    return {
      x: (rand() * 2 - 1) * 1.55,
      y: (rand() * 2 - 1) * 1.15,
      z: (rand() * 2 - 1) * 1.55,
      size: 0.16 + rand() * 0.42,
      tail: 0.12 + rand() * 0.42,
      tw: rand() * Math.PI * 2,
      cool: rand(),
    };
  }

  function layout() {
    w = window.innerWidth;
    h = window.innerHeight;
    cv.style.width = w + "px";
    cv.style.height = h + "px";
    cv.width = Math.floor(w * dpr);
    cv.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const n = Math.min(720, Math.max(220, ((w * h) / 2800) | 0));
    const rand = mulberry(0x9e3779b9);
    stars = [];
    for (let i = 0; i < n; i++) stars.push(spawn(rand));
    streaks = [];
    cx = w * 0.5;
    cy = h * 0.45;
    ex = cx;
    ey = cy;
    px = w - cx;
    py = cy;
  }

  function project(x, y, z, t) {
    const a = t * 0.045;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const x1 = x * c - z * s;
    const z1 = x * s + z * c;
    const y1 = y * Math.cos(a * 0.35) - z1 * Math.sin(a * 0.35) * 0.25;
    const z2 = y * Math.sin(a * 0.35) * 0.25 + z1;
    const camZ = 2.15 + tx * 0.08;
    const depth = z2 + camZ;
    if (depth < 0.12) return null;
    const fov = Math.min(w, h) * 0.72;
    return {
      x: w * 0.5 + (x1 + tx * 0.35) * (fov / depth),
      y: h * 0.48 + (y1 + ty * 0.28) * (fov / depth),
      d: depth,
    };
  }

  function nebula() {
    const cx = w * 0.52 + tx * 30;
    const cy = h * 0.42 + ty * 18;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.62);
    g.addColorStop(0, "rgba(186, 202, 224, 0.22)");
    g.addColorStop(0.38, "rgba(214, 206, 192, 0.1)");
    g.addColorStop(1, "rgba(246, 243, 237, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    const g2 = ctx.createRadialGradient(w * 0.18, h * 0.78, 0, w * 0.18, h * 0.78, w * 0.45);
    g2.addColorStop(0, "rgba(196, 188, 176, 0.12)");
    g2.addColorStop(1, "rgba(246, 243, 237, 0)");
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, w, h);
  }

  function starRgb(st) {
    const r = (32 + st.cool * 40 + (1 - st.cool) * 8) | 0;
    const g = (42 + st.cool * 48) | 0;
    const b = (70 + st.cool * 70) | 0;
    return r + "," + g + "," + b;
  }

  function starAlpha(p, twinkle) {
    const near = Math.max(0, 1 - (p.d - 0.4) / 3.2);
    return (0.18 + near * 0.55) * twinkle;
  }

  function look(fromX, fromY, toX, toY, limit) {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const len = Math.hypot(dx, dy) || 1;
    const m = Math.min(limit, len);
    return [fromX + (dx / len) * m, fromY + (dy / len) * m];
  }

  function drawEye(x, y, lookX, lookY, scale, open, ghost) {
    const rx = 13 * scale;
    const ry = 7.2 * scale * Math.max(0.08, open);
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = ghost ? "rgba(236, 232, 224, 0.22)" : "rgba(248, 246, 241, 0.78)";
    ctx.fill();
    ctx.strokeStyle = ghost ? "rgba(40, 64, 110, 0.22)" : "rgba(28, 48, 88, 0.55)";
    ctx.lineWidth = 1.05;
    ctx.stroke();
    if (open < 0.18) {
      ctx.restore();
      return;
    }
    const iris = look(0, 0, lookX - x, lookY - y, rx * 0.38);
    ctx.beginPath();
    ctx.ellipse(iris[0], iris[1], rx * 0.42, ry * 0.7, 0, 0, Math.PI * 2);
    ctx.fillStyle = ghost ? "rgba(70, 96, 140, 0.28)" : "rgba(36, 72, 128, 0.72)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(iris[0], iris[1], rx * 0.18, 0, Math.PI * 2);
    ctx.fillStyle = ghost ? "rgba(16, 22, 36, 0.35)" : "rgba(12, 14, 22, 0.88)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(iris[0] - rx * 0.08, iris[1] - ry * 0.18, rx * 0.07, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 255, 255, " + (ghost ? 0.25 : 0.55) + ")";
    ctx.fill();
    ctx.restore();
  }

  function pair(x, y, lookX, lookY, open, ghost) {
    const gap = 17;
    drawEye(x - gap, y, lookX, lookY, 1, open, ghost);
    drawEye(x + gap, y, lookX, lookY, 1, open, ghost);
  }

  function maybeStreak() {
    if (reduce) return;
    if (streaks.length > 5) return;
    if (Math.random() > 0.018) return;
    const fromLeft = Math.random() > 0.35;
    const ang = (fromLeft ? -0.18 : Math.PI + 0.18) + (Math.random() - 0.5) * 0.55;
    const spd = 7 + Math.random() * 11;
    streaks.push({
      x: fromLeft ? -50 : w + 50,
      y: h * (0.08 + Math.random() * 0.84),
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      life: 1,
      len: 14 + Math.random() * 22,
      thick: 0.35 + Math.random() * 0.35,
    });
  }

  function paint(t) {
    ctx.clearRect(0, 0, w, h);
    nebula();
    tx += (mx - tx) * 0.04;
    ty += (my - ty) * 0.04;
    ex += (cx - ex) * 0.18;
    ey += (cy - 36 - ey) * 0.18;
    const lieX = w - cx + Math.sin(t * 0.7) * 28;
    const lieY = cy + Math.cos(t * 0.55) * 36;
    px += (lieX - px) * 0.045;
    py += (lieY - py) * 0.045;

    const cycle = t % 5.4;
    blink = reduce ? 1 : cycle > 5.12 ? Math.max(0.08, 1 - (cycle - 5.12) * 8) : 1;
    const dCycle = (t + 1.7) % 4.1;
    blinkD = reduce ? 0.85 : dCycle > 3.82 ? Math.max(0.08, 1 - (dCycle - 3.82) * 9) : 0.85;

    const lieWash = ctx.createRadialGradient(lieX, lieY, 4, lieX, lieY, 160);
    lieWash.addColorStop(0, "rgba(48, 72, 118, 0.14)");
    lieWash.addColorStop(0.45, "rgba(48, 72, 118, 0.05)");
    lieWash.addColorStop(1, "rgba(246, 243, 237, 0)");
    ctx.fillStyle = lieWash;
    ctx.fillRect(0, 0, w, h);

    ctx.lineCap = "round";
    for (let i = 0; i < stars.length; i++) {
      const st = stars[i];
      const p = project(st.x, st.y, st.z, t);
      if (!p) continue;
      if (p.x < -40 || p.x > w + 40 || p.y < -40 || p.y > h + 40) continue;
      const q = project(st.x, st.y, st.z, t - st.tail);
      const twinkle = 0.7 + 0.3 * Math.sin(t * 1.15 + st.tw);
      const nearGhost = Math.exp(-Math.hypot(p.x - px, p.y - py) / 70);
      const nearLie = Math.exp(-Math.hypot(p.x - lieX, p.y - lieY) / 90);
      const bait = Math.max(nearGhost, nearLie);
      const a = starAlpha(p, twinkle * (1 + bait * 0.7));
      const rgb = starRgb(st);
      const rad = Math.max(0.28, st.size * (0.35 + 0.55 / p.d));
      if (q) {
        const grd = ctx.createLinearGradient(p.x, p.y, q.x, q.y);
        grd.addColorStop(0, "rgba(" + rgb + "," + a + ")");
        grd.addColorStop(1, "rgba(" + rgb + ",0)");
        ctx.strokeStyle = grd;
        ctx.lineWidth = Math.max(0.28, rad * 0.85);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(q.x, q.y);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.fillStyle = "rgba(" + rgb + "," + Math.min(0.95, a * 1.15) + ")";
      ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
      ctx.fill();
    }

    maybeStreak();
    for (let i = streaks.length - 1; i >= 0; i--) {
      const s = streaks[i];
      s.x += s.vx;
      s.y += s.vy;
      s.life -= 0.014;
      if (s.life <= 0 || s.x < -120 || s.x > w + 120 || s.y < -80 || s.y > h + 80) {
        streaks.splice(i, 1);
        continue;
      }
      const tx0 = s.x - s.vx * (s.len / Math.hypot(s.vx, s.vy));
      const ty0 = s.y - s.vy * (s.len / Math.hypot(s.vx, s.vy));
      const grd = ctx.createLinearGradient(s.x, s.y, tx0, ty0);
      grd.addColorStop(0, "rgba(40, 64, 110, " + 0.42 * s.life + ")");
      grd.addColorStop(0.35, "rgba(40, 64, 110, " + 0.16 * s.life + ")");
      grd.addColorStop(1, "rgba(40, 64, 110, 0)");
      ctx.strokeStyle = grd;
      ctx.lineWidth = s.thick;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(tx0, ty0);
      ctx.stroke();
      ctx.beginPath();
      ctx.fillStyle = "rgba(36, 58, 102, " + 0.5 * s.life + ")";
      ctx.arc(s.x, s.y, s.thick * 0.85, 0, Math.PI * 2);
      ctx.fill();
    }

    pair(px, py, lieX, lieY, blinkD, true);
    pair(ex, ey, cx, cy, blink, false);
  }

  function frame(now) {
    if (!running) {
      looping = false;
      return;
    }
    paint(reduce ? 0 : (now - t0) / 1000);
    if (!reduce && running) requestAnimationFrame(frame);
    else looping = false;
  }

  function start() {
    layout();
    paint(0);
    if (!reduce && running && !looping) {
      looping = true;
      requestAnimationFrame(frame);
    }
  }

  window.addEventListener(
    "pointermove",
    function (e) {
      mx = (e.clientX / Math.max(1, w) - 0.5) * 2;
      my = (e.clientY / Math.max(1, h) - 0.5) * 2;
      cx = e.clientX;
      cy = e.clientY;
    },
    { passive: true }
  );

  window.addEventListener("resize", start);
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      function (entries) {
        running = !!(entries[0] && entries[0].isIntersecting);
        if (running && !reduce && !looping) {
          looping = true;
          requestAnimationFrame(frame);
        }
      },
      { threshold: 0.02 }
    );
    io.observe(cv);
  }

  if (document.readyState === "complete") start();
  else window.addEventListener("load", start);
})();
