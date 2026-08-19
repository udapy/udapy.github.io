---
layout: default
title: Uday
---

<section class="home-hero">
  <header class="home">
    <p class="kicker">कर्मसु कौशल्यम् · “skill in actions”</p>
    <h1>Uday</h1>
    <p class="lead">Hey — I am Uday Ramesh Phalak. This space documents my applied research at the intersection of advanced AI, human-centric design, and my primary focus: AI safety. Building on early work in adversarial ML defense (2017–2019), the goal is the same: as the models get more capable, they should stay interpretable and actually safe.</p>
    <p class="home-focus">Alignment · interpretability · neurosymbolic models · generative UX</p>
  </header>
  <div class="home-bh" aria-hidden="true">
    <canvas id="cv-blackhole" width="420" height="420"></canvas>
  </div>
</section>

<p class="writing-label">Notes</p>
<ul class="note-list">
  {% assign notes = site.notes | sort: "date" | reverse %}
  {% for note in notes %}
  <li>
    <a class="title" href="{{ note.url | relative_url }}">{{ note.title }}</a>
    {% if note.lead %}<p class="dek">{{ note.lead }}</p>{% endif %}
    <p class="meta">{{ note.date | date: "%Y" }}{% if note.tags %} · {{ note.tags | join: " · " }}{% endif %}</p>
  </li>
  {% endfor %}
</ul>
