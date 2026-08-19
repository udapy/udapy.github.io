/* Shared canvas kit for primers. Same paper/ink palette as the page.
   Add a figure: Kit.figure({ canvas, modes, animate, draw })
   Next post: new file under assets/js/, list it in front matter `scripts:`. */
(function (root) {
  const C = {
    bg: "#f6f3ed",
    sf: "#eeeae2",
    sfa: "#e4dfd5",
    bd: "#ddd8ce",
    bl: "#e8e4dc",
    tx: "#161513",
    dm: "#3c3a36",
    ft: "#5c5953",
    vf: "#7a766e",
    rd: "#a83c26",
    rl: "#c47a68",
    rk: "#7a2c1c",
    dk: "#161513",
    dkm: "#3c3a36",
    wm: "#a83c26",
    blue: "#4a5568",
    gn: "#3d6b4a",
    pu: "#5a4e6e",
  };
  const dpr = window.devicePixelRatio || 1;

  function setup(id) {
    const cv = document.getElementById(id);
    if (!cv) return null;
    const lw = parseInt(cv.getAttribute("width"), 10);
    const lh = parseInt(cv.getAttribute("height"), 10);
    cv.width = lw * dpr;
    cv.height = lh * dpr;
    const ctx = cv.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    return { cv, ctx, w: lw, h: lh };
  }

  function txt(c, s, x, y, sz, col, al, wt) {
    c.font = (wt ? wt + " " : "") + sz + 'px "IBM Plex Mono", monospace';
    c.fillStyle = col;
    c.textAlign = al || "center";
    c.textBaseline = "middle";
    c.fillText(s, x, y);
  }

  function paper(c, w, h) {
    c.fillStyle = C.bg;
    c.fillRect(0, 0, w, h);
  }

  function rr(c, x, y, w, h, r, f, s, lw) {
    c.beginPath();
    if (c.roundRect) c.roundRect(x, y, w, h, r);
    else c.rect(x, y, w, h);
    if (f) {
      c.fillStyle = f;
      c.fill();
    }
    if (s) {
      c.strokeStyle = s;
      c.lineWidth = lw || 1;
      c.stroke();
    }
  }

  function bindModes(rowId, onChange) {
    const row = document.getElementById(rowId);
    if (!row) return;
    const buttons = Array.prototype.slice.call(row.querySelectorAll(".mbtn"));
    row.setAttribute("role", "radiogroup");
    if (!row.getAttribute("aria-label")) row.setAttribute("aria-label", "Figure view");

    function select(btn, announce) {
      buttons.forEach(function (b) {
        const on = b === btn;
        b.classList.toggle("active", on);
        b.setAttribute("aria-checked", on ? "true" : "false");
        b.tabIndex = on ? 0 : -1;
      });
      const mode = btn.dataset.mode || btn.dataset.n || btn.textContent.trim();
      onChange(mode);
      if (announce) {
        const live = document.getElementById("fig-live");
        if (live) live.textContent = btn.textContent.trim();
      }
    }

    buttons.forEach(function (btn, i) {
      btn.setAttribute("role", "radio");
      btn.setAttribute("aria-checked", btn.classList.contains("active") ? "true" : "false");
      btn.tabIndex = btn.classList.contains("active") ? 0 : -1;
      btn.addEventListener("click", function () {
        select(btn, true);
      });
      btn.addEventListener("keydown", function (e) {
        const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1
          : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
        if (!dir) return;
        e.preventDefault();
        const next = buttons[(i + dir + buttons.length) % buttons.length];
        next.focus();
        select(next, true);
      });
    });
  }

  function figure(opts) {
    const box = setup(opts.canvas);
    if (!box) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    box.cv.setAttribute("role", "img");
    const fig = box.cv.closest("figure");
    const cap = fig && fig.querySelector("figcaption");
    if (cap) {
      if (!cap.id) cap.id = opts.canvas + "-cap";
      box.cv.setAttribute("aria-labelledby", cap.id);
    }
    let mode = opts.mode || "default";
    if (opts.modes) {
      const row = document.getElementById(opts.modes);
      const active = row && row.querySelector(".mbtn.active");
      if (active) mode = active.dataset.mode || active.dataset.n || mode;
      bindModes(opts.modes, function (m) {
        mode = m;
        if (!opts.animate || reduce) paint(performance.now());
      });
    }
    let t0 = performance.now();
    function paint(now) {
      const t = reduce ? 0 : (now - t0) / 1000;
      paper(box.ctx, box.w, box.h);
      opts.draw(box.ctx, box.w, box.h, t, mode, C);
      if (opts.animate && !reduce) requestAnimationFrame(paint);
    }
    if (opts.animate && !reduce) requestAnimationFrame(paint);
    else paint(t0);
  }

  root.Kit = { C: C, setup: setup, txt: txt, rr: rr, paper: paper, bindModes: bindModes, figure: figure };
})(window);
