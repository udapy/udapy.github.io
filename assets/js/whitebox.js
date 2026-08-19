/* Interactive figures for the white-box mean estimation primer.
   Each Kit.figure is independent. Copy this file as a starting point
   for the next note; only the canvases that exist on the page run. */
(function () {
  if (!window.Kit) return;
  const txt = Kit.txt;
  const rr = Kit.rr;

  function gauss(x, mu, sig) {
    const z = (x - mu) / sig;
    return Math.exp(-0.5 * z * z) / (sig * Math.sqrt(2 * Math.PI));
  }

  function logFrac(v, lo, hi) {
    const x = (Math.log(v) - Math.log(lo)) / (Math.log(hi) - Math.log(lo));
    return Math.max(0.02, Math.min(1, x));
  }

  /* 1. One neuron: Gaussian in, ReLU out */
  Kit.figure({
    canvas: "cv-relu",
    modes: "relu-modes",
    mode: "pre",
    draw: function (c, w, h, t, mode, C) {
      const pad = 36;
      const x0 = pad + 8;
      const x1 = w - pad;
      const yBase = h - 36;
      const yTop = 40;
      const sig = 1.0;
      const span = 4.2;
      function X(v) {
        return x0 + ((v + span) / (2 * span)) * (x1 - x0);
      }
      function Y(p) {
        return yBase - p * (yBase - yTop) * 2.6;
      }
      c.strokeStyle = C.bd;
      c.lineWidth = 1.6;
      c.beginPath();
      c.moveTo(x0, yBase);
      c.lineTo(x1, yBase);
      c.stroke();
      txt(c, "h", x1 + 4, yBase, 11, C.ft, "left");
      txt(c, "0", X(0), yBase + 14, 10, C.ft);

      c.beginPath();
      c.strokeStyle = C.tx;
      c.lineWidth = 2.2;
      for (let i = 0; i <= 160; i++) {
        const v = -span + (2 * span * i) / 160;
        const p = gauss(v, 0, sig);
        const x = X(v);
        const y = Y(p);
        if (i === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.stroke();

      if (mode === "pre") {
        txt(c, "pre-activation  ~  N(0, σ²)", w / 2, 18, 11, C.dm);
        c.fillStyle = C.blue + "38";
        c.beginPath();
        for (let i = 0; i <= 160; i++) {
          const v = -span + (2 * span * i) / 160;
          const p = gauss(v, 0, sig);
          const x = X(v);
          const y = Y(p);
          if (i === 0) c.moveTo(x, yBase);
          c.lineTo(x, y);
        }
        c.lineTo(X(span), yBase);
        c.closePath();
        c.fill();
      }

      if (mode === "relu" || mode === "mean") {
        txt(
          c,
          mode === "mean" ? "E[ReLU(h)] = σ / √(2π)" : "ReLU keeps the right half",
          w / 2,
          18,
          11,
          C.dm
        );
        c.fillStyle = C.rd + "40";
        c.beginPath();
        c.moveTo(X(0), yBase);
        for (let i = 80; i <= 160; i++) {
          const v = -span + (2 * span * i) / 160;
          c.lineTo(X(v), Y(gauss(v, 0, sig)));
        }
        c.lineTo(X(span), yBase);
        c.closePath();
        c.fill();
        c.beginPath();
        c.strokeStyle = C.rd;
        c.lineWidth = 2.8;
        c.moveTo(X(0), yBase);
        for (let i = 80; i <= 160; i++) {
          const v = -span + (2 * span * i) / 160;
          c.lineTo(X(v), Y(gauss(v, 0, sig)));
        }
        c.stroke();
        c.setLineDash([3, 4]);
        c.beginPath();
        c.strokeStyle = C.ft;
        c.moveTo(X(0), yBase);
        c.lineTo(X(0), yTop + 8);
        c.stroke();
        c.setLineDash([]);
      }

      if (mode === "mean") {
        const mean = 1 / Math.sqrt(2 * Math.PI);
        const mx = X(mean);
        c.beginPath();
        c.strokeStyle = C.rd;
        c.lineWidth = 1.5;
        c.moveTo(mx, yBase);
        c.lineTo(mx, yTop + 20);
        c.stroke();
        txt(c, "mean", mx, yTop + 8, 9, C.rd);
      }
    },
  });

  /* 2. Stack of layers — layer 1 is easy, the rest is not */
  Kit.figure({
    canvas: "cv-stack",
    modes: "stack-modes",
    mode: "l1",
    draw: function (c, w, h, t, mode, C) {
      const n = 8;
      const gap = 10;
      const bw = (w - 48 - (n - 1) * gap) / n;
      const baseY = h - 52;
      txt(c, "one net, eight layers shown (the real one has 32)", w / 2, 16, 10, C.ft);
      for (let i = 0; i < n; i++) {
        const x = 24 + i * (bw + gap);
        const hot = mode === "l1" ? i === 0 : i > 0;
        rr(c, x, 48, bw, baseY - 48, 2, hot ? C.rd + "22" : C.bg, hot ? C.rd : C.bd, hot ? 2.2 : 1.4);
        txt(c, String(i + 1), x + bw / 2, 48 + (baseY - 48) / 2, 11, hot ? C.rd : C.ft);
      }
      if (mode === "l1") {
        txt(c, "layer 1  ·  h is Gaussian  ·  mean is σ/√(2π)", w / 2, h - 22, 11, C.rd);
      } else {
        txt(c, "layer ≥2  ·  truncated, correlated, skewed", w / 2, h - 22, 11, C.rd);
      }
    },
  });

  /* 3. Pairwise seconds vs the chain */
  Kit.figure({
    canvas: "cv-chain",
    modes: "chain-modes",
    mode: "pair",
    animate: true,
    draw: function (c, w, h, t, mode, C) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 2.2);
      if (mode === "pair") {
        txt(c, "pairwise E[ReLU i ReLU j]  vs  Monte Carlo", 24, 22, 11, C.ft, "left");
        rr(c, 24, 44, w - 48, 18, 2, C.sfa, C.bd, 1.4);
        rr(c, 24, 44, 10, 18, 2, C.gn, null, 0);
        txt(c, "~1e-10   the pair test is sharp", 42, 53, 11, C.gn, "left");
        txt(c, "this is not the score", 24, 92, 12, C.dk, "left");
        txt(c, "a good local formula can still fail as a trajectory", 24, 116, 11, C.ft, "left");
      } else if (mode === "chain") {
        txt(c, "chained last-layer MSE   seed 42, 3 nets", 24, 22, 11, C.ft, "left");
        const max = 8.93e-5;
        function row(y, val, name, col) {
          const bw = (w - 48) * (val / max);
          txt(c, name, 24, y, 11, C.dk, "left");
          rr(c, 24, y + 10, w - 48, 16, 2, C.sfa, C.bd, 1.2);
          rr(c, 24, y + 10, Math.max(8, bw), 16, 2, col, null, 0);
          txt(c, val.toExponential(2), w - 24, y, 11, col, "right");
        }
        row(44, 8.93e-5, "gain map", C.blue);
        row(92, 8.86e-5 * (0.97 + 0.03 * pulse), "exact pairs", C.rd);
        txt(c, "+0.8%   not good enough", 24, 150, 12, C.rd, "left");
      } else {
        txt(c, "FLOPs per MLP", 24, 22, 11, C.ft, "left");
        const maxF = 1.84e10;
        function flop(y, val, name, col) {
          const bw = (w - 48) * (val / maxF);
          txt(c, name, 24, y, 11, C.dk, "left");
          rr(c, 24, y + 10, w - 48, 18, 2, C.sfa, C.bd, 1.2);
          rr(c, 24, y + 10, Math.max(8, bw), 18, 2, col, null, 0);
          txt(c, val.toExponential(2), w - 24, y, 11, col, "right");
        }
        flop(44, 3.26e9, "gain map", C.blue);
        flop(100, 1.84e10, "exact pairs  ·  5.6×", C.rd);
        txt(c, "more FLOPs, same chain", 24, 160, 12, C.rd, "left");
      }
    },
  });

  /* 4. Score tax */
  Kit.figure({
    canvas: "cv-tax",
    modes: "tax-modes",
    mode: "0.10",
    draw: function (c, w, h, t, mode, C) {
      const util = parseFloat(mode);
      const raw = 3.42e-6;
      const mult = Math.max(0.1, util);
      const adj = raw * mult;
      const maxAdj = raw * 1.0;
      function bar(x, val, col, name, pretty) {
        const bw = 76;
        const bh = ((val / maxAdj) * (h - 90)) | 0;
        const y = h - 40 - bh;
        rr(c, x, y, bw, Math.max(bh, 4), 2, col, C.tx, 1.2);
        txt(c, pretty, x + bw / 2, y - 14, 11, C.dk);
        txt(c, name, x + bw / 2, h - 22, 11, C.ft);
      }
      txt(c, "raw MSE held at 3.42e-6  ·  adjusted = raw × max(0.1, C/B)", w / 2, 18, 11, C.dm);
      bar(w * 0.22, raw, C.blue, "raw", "3.42e-6");
      bar(w * 0.58, adj, C.rd, "adjusted", adj.toExponential(2));
      txt(c, "C/B = " + util.toFixed(2) + "   multiplier = " + mult.toFixed(2), w / 2, 42, 12, C.rd);
    },
  });

  /* 5. Radius × direction */
  Kit.figure({
    canvas: "cv-sphere",
    modes: "sphere-modes",
    mode: "both",
    animate: true,
    draw: function (c, w, h, t, mode, C) {
      const cx = w * 0.38;
      const cy = h * 0.52;
      const R = 78;
      c.strokeStyle = C.tx;
      c.lineWidth = 1.8;
      c.beginPath();
      c.arc(cx, cy, R, 0, Math.PI * 2);
      c.stroke();
      const n = 28;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + t * 0.25;
        const u = Math.cos(a);
        const v = Math.sin(a) * 0.55;
        const x = cx + R * u;
        const y = cy + R * v;
        c.beginPath();
        c.arc(x, y, 3.6, 0, Math.PI * 2);
        c.fillStyle = mode === "radius" ? C.vf : C.rd;
        c.fill();
      }
      if (mode !== "angles") {
        const pulse = 0.72 + 0.08 * Math.sin(t * 1.6);
        c.strokeStyle = C.blue;
        c.lineWidth = 2.4;
        c.beginPath();
        c.moveTo(cx, cy);
        c.lineTo(cx + R * pulse, cy - 8);
        c.stroke();
        txt(c, "R", cx + R * pulse + 12, cy - 8, 11, C.blue, "left");
      }
      txt(c, "U  on the sphere", cx, cy + R + 22, 10, C.ft);
      const boxX = w * 0.68;
      rr(c, boxX - 8, 48, w - boxX - 16, h - 80, 2, C.sf, C.tx, 1.6);
      if (mode === "radius") {
        txt(c, "radius is closed form", boxX + (w - boxX) / 2 - 8, h / 2 - 10, 11, C.blue);
        txt(c, "E[χ_n]  from gammas", boxX + (w - boxX) / 2 - 8, h / 2 + 12, 10, C.ft);
      } else if (mode === "angles") {
        txt(c, "angles are the work", boxX + (w - boxX) / 2 - 8, h / 2 - 10, 11, C.rd);
        txt(c, "a 5-design is not the net", boxX + (w - boxX) / 2 - 8, h / 2 + 12, 10, C.ft);
      } else {
        txt(c, "X = R · U", boxX + (w - boxX) / 2 - 8, h / 2 - 10, 12, C.dk);
        txt(c, "E[net(X)] = E[R] E[net(U)]", boxX + (w - boxX) / 2 - 8, h / 2 + 14, 9, C.dm);
      }
    },
  });

  /* 6. Carriers at the same row count */
  Kit.figure({
    canvas: "cv-carrier",
    modes: "carrier-modes",
    mode: "gauss",
    draw: function (c, w, h, t, mode, C) {
      const rows = [
        { id: "gauss", name: "Gaussian antithetic", adj: 3.42e-7, note: "champion  ·  N≈5500" },
        { id: "costume", name: "Hadamard + signs", adj: 1.64e-6, note: "same N  ·  5× worse" },
        { id: "chirp", name: "Kerdock prefix", adj: 3.27e-7, note: "real chirps  ·  a tie" },
      ];
      const max = 1.64e-6;
      rows.forEach(function (r, i) {
        const y = 36 + i * 72;
        const on = r.id === mode;
        txt(c, r.name, 24, y, 12, on ? C.dk : C.ft, "left", on ? "500" : "");
        txt(c, r.note, 24, y + 16, 10, C.ft, "left");
        const bw = (w - 48) * (r.adj / max);
        rr(c, 24, y + 28, w - 48, 14, 2, C.sfa, C.bd, 1.2);
        rr(c, 24, y + 28, Math.max(8, bw), 14, 2, on ? C.rd : C.ft, null, 0);
        txt(c, r.adj.toExponential(2), w - 24, y, 11, on ? C.rd : C.ft, "right");
      });
    },
  });

  /* 7. In-chain scale vs readout vs blend — log scale on purpose */
  Kit.figure({
    canvas: "cv-blend",
    modes: "blend-modes",
    mode: "adaptive",
    draw: function (c, w, h, t, mode, C) {
      const rows = [
        { id: "inchain", name: "per-layer scale in the chain", adj: 3e-2, note: "compounding  ·  dead" },
        { id: "readout", name: "last-layer ×0.99187 only", adj: 2.18e-6, note: "survived the kill-test" },
        { id: "frozen", name: "antithetic MC + frozen λ=0.45", adj: 7.83e-7, note: "sampler sits on analytic" },
        { id: "adaptive", name: "N=5,500, adaptive λ", adj: 3.42e-7, note: "spend the free floor" },
      ];
      txt(c, "local adjusted MSE   log scale   seed 42, 3 nets", 24, 18, 10, C.ft, "left");
      rows.forEach(function (r, i) {
        const y = 36 + i * 60;
        const on = r.id === mode;
        txt(c, r.name, 24, y, 12, on ? C.dk : C.ft, "left", on ? "500" : "");
        txt(c, r.note, 24, y + 16, 10, C.ft, "left");
        const bw = (w - 48) * logFrac(r.adj, 2e-7, 5e-2);
        rr(c, 24, y + 26, w - 48, 14, 2, C.sfa, C.bd, 1.2);
        rr(c, 24, y + 26, Math.max(8, bw), 14, 2, on ? C.rd : C.ft, null, 0);
        txt(c, r.adj.toExponential(2), w - 24, y, 11, on ? C.rd : C.ft, "right");
      });
    },
  });

  /* 8. Experiment path — table is the reasons, bars are the jumps */
  Kit.figure({
    canvas: "cv-path",
    modes: "path-modes",
    mode: "4.2",
    draw: function (c, w, h, t, mode, C) {
      const rows = [
        { id: "1", name: "kit cov-prop", adj: 8.93e-6, why: "baseline. next experiment has to beat this." },
        { id: "2", name: "exact pairs", adj: 8.86e-6, why: "pairs were not the chain. stop closing at order 2." },
        { id: "3", name: "last-layer ×0.99187", adj: 2.18e-6, why: "in-chain exploded. readout-only survived." },
        { id: "4", name: "frozen blend", adj: 7.83e-7, why: "sampler has to sit on the analytic." },
        { id: "4.2", name: "N=5,500 adaptive", adj: 3.42e-7, why: "spend the free floor. let λ follow the variance." },
        { id: "6", name: "signed Hadamard", adj: 1.64e-6, why: "those directions are worse than Gaussian." },
        { id: "7", name: "real chirp prefix", adj: 3.27e-7, why: "tie. not a jump. don't promote." },
      ];
      const cur = rows.filter(function (r) { return r.id === mode; })[0] || rows[4];
      txt(c, "local adjusted   log scale", 24, 16, 10, C.ft, "left");
      txt(c, cur.adj.toExponential(2), w - 24, 16, 11, C.rd, "right");
      rows.forEach(function (r, i) {
        const x = 24 + i * ((w - 48) / rows.length);
        const bw = ((w - 48) / rows.length) - 6;
        const frac = logFrac(r.adj, 2e-7, 1.2e-5);
        const bh = Math.max(8, frac * (h - 110));
        const y = h - 48 - bh;
        const on = r.id === mode;
        rr(c, x, y, bw, bh, 2, on ? C.rd : C.sfa, on ? C.rd : C.bd, on ? 2 : 1.2);
        txt(c, r.id, x + bw / 2, h - 28, 10, on ? C.rd : C.ft);
      });
      txt(c, cur.why, w / 2, h - 12, 10, C.dk);
    },
  });
})();
