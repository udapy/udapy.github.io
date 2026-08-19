/* Reading chrome: skip, progress, TOC, tables, glossary keyboard. */
(function () {
  function slug(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48);
  }

  const article = document.querySelector("article.primer");
  if (article) {
    const heads = Array.prototype.slice.call(article.querySelectorAll("h2"));
    const tocNav = document.getElementById("toc");
    const tocList = document.getElementById("toc-list");
    heads.forEach(function (h, i) {
      if (!h.id) h.id = slug(h.textContent) || "section-" + (i + 1);
      if (tocList) {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = "#" + h.id;
        a.textContent = h.textContent;
        li.appendChild(a);
        tocList.appendChild(li);
      }
    });
    if (tocNav && heads.length) tocNav.hidden = false;

    article.querySelectorAll("table").forEach(function (table) {
      if (table.parentElement && table.parentElement.classList.contains("table-wrap")) return;
      const wrap = document.createElement("div");
      wrap.className = "table-wrap";
      wrap.setAttribute("tabindex", "0");
      wrap.setAttribute("role", "region");
      wrap.setAttribute("aria-label", "Scrollable table");
      table.parentNode.insertBefore(wrap, table);
      wrap.appendChild(table);
    });
  }

  const bar = document.getElementById("progress");
  const toc = document.getElementById("toc");
  function onScroll() {
    if (bar) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? (window.scrollY / max) * 100 : 0;
      bar.style.width = Math.min(100, Math.max(0, p)) + "%";
      bar.setAttribute("aria-valuenow", String(Math.round(p)));
    }
    if (toc) toc.classList.toggle("is-stuck", window.scrollY > 80);
    if (!article) return;
    const links = document.querySelectorAll("#toc-list a");
    const heads = Array.prototype.slice.call(article.querySelectorAll("h2"));
    const rail = window.matchMedia("(min-width: 1100px)").matches;
    const mark = rail ? 96 : 140;
    let current = heads[0];
    heads.forEach(function (h) {
      if (h.getBoundingClientRect().top < mark) current = h;
    });
    links.forEach(function (a) {
      a.setAttribute("aria-current", a.hash === "#" + (current && current.id) ? "true" : "false");
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const panel = document.getElementById("glossary");
  const toggle = document.querySelector(".glossary-toggle");
  const close = document.querySelector(".glossary-close");
  const scrim = document.getElementById("glossary-scrim");
  if (panel && toggle) {
    toggle.setAttribute("aria-controls", "glossary");
    toggle.setAttribute("aria-expanded", "false");
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-label", "Glossary");
    function setOpen(open) {
      panel.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      document.body.style.overflow = open ? "hidden" : "";
      if (scrim) {
        scrim.classList.toggle("on", open);
      }
      if (open) {
        const first = panel.querySelector(".glossary-close, .gl-term");
        if (first) first.focus();
      } else {
        toggle.focus();
      }
    }
    toggle.addEventListener("click", function () {
      setOpen(!panel.classList.contains("open"));
    });
    if (close) close.addEventListener("click", function () { setOpen(false); });
    if (scrim) scrim.addEventListener("click", function () { setOpen(false); });
    document.addEventListener("keydown", function (e) {
      if (!panel.classList.contains("open")) return;
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      const nodes = Array.prototype.slice.call(
        panel.querySelectorAll("button")
      ).filter(function (el) { return !el.disabled; });
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
    panel.querySelectorAll(".gl-term").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const item = btn.parentElement;
        const open = !item.classList.contains("expanded");
        item.classList.toggle("expanded", open);
        btn.setAttribute("aria-expanded", open ? "true" : "false");
      });
    });
  }
})();
