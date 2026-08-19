/* Symmetric flowing dots. Home lattice + stream function. Mirrors across the page. */
(function () {
  const cv = document.getElementById("grain-bg");
  if (!cv) return;

  const ctx = cv.getContext("2d", { alpha: true });
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const BLUE = [28, 72, 148];

  let w = 0;
  let h = 0;
  let dots = [];
  let running = true;
  let looping = false;
  const t0 = performance.now();

  function flow(x, y, t) {
    const X = x / Math.max(1, w);
    const Y = y / Math.max(1, h);
    return [
      Math.sin(Y * 3.7 + t * 0.31) * Math.cos(X * 2.4 + t * 0.17),
      Math.cos(X * 3.1 - t * 0.22) * Math.sin(Y * 2.2 + t * 0.19),
    ];
  }

  function layout() {
    w = document.documentElement.clientWidth;
    h = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
    cv.style.width = w + "px";
    cv.style.height = h + "px";
    cv.width = Math.floor(w * dpr);
    cv.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const gap = Math.max(22, Math.min(36, Math.sqrt((w * h) / 900)));
    const cols = Math.max(6, Math.ceil(w / gap));
    const rows = Math.max(8, Math.ceil(h / gap));
    dots = [];
    const mid = cols / 2;
    for (let j = 0; j <= rows; j++) {
      for (let i = 0; i < mid; i++) {
        const ox = (j % 2) * 0.5;
        const hx = ((i + ox + 0.5) / cols) * w;
        const hy = ((j + 0.5) / rows) * h;
        dots.push({
          hx: hx,
          hy: hy,
          ph: (i * 0.73 + j * 1.17) % (Math.PI * 2),
          s: 1.1 + ((i * 13 + j * 7) % 5) * 0.35,
        });
      }
    }
  }

  function paint(t) {
    ctx.clearRect(0, 0, w, h);
    const amp = Math.min(w, h) * 0.035;
    for (let i = 0; i < dots.length; i++) {
      const d = dots[i];
      const f = flow(d.hx, d.hy, t);
      const x = d.hx + f[0] * amp * (0.7 + 0.3 * Math.sin(t * 0.4 + d.ph));
      const y = d.hy + f[1] * amp * (0.7 + 0.3 * Math.cos(t * 0.35 + d.ph));
      ctx.fillStyle = "rgba(" + BLUE[0] + "," + BLUE[1] + "," + BLUE[2] + ",0.2)";
      ctx.beginPath();
      ctx.arc(x, y, d.s, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(w - x, y, d.s, 0, Math.PI * 2);
      ctx.fill();
    }
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
