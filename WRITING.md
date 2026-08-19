# Writing for this site

New pieces go in `_notes/`. The look is a sketchbook: warm paper, bold ink, red/blue pencil in the figures, Instrument Serif titles, Inter body. Interactive canvases, not stock diagrams. Layout is fluid. Copy [Alexei Gannon's primer](https://alexeigannon.com/primer/) for *shape*, not for sentences.

Future posts should be easier than the first one. Use the template, then run the gate. Don't publish a draft that fails the local check.

## Add a note

```bash
python scripts/new_note.py "short-slug" "Title goes here"
```

That copies `templates/primer.md`, fills the date, and prints the path. Then write. Then:

```bash
python scripts/style_check.py _notes/<slug>.md
```

Serve locally (optional, needs Ruby 3.3):

```bash
bundle install && bundle exec jekyll serve
```

Or skip Ruby:

```bash
uv run --with markdown python scripts/preview.py
open _preview/index.html
```

GitHub Pages: push `main`. Settings → Pages → GitHub Actions.

## What a primer is

Gannon's piece is the model:

1. Dual motivation, then a reader contract (who this is for, what you will skip)
2. A historical sequence of *ideas*, not a list of tools
3. Each section earns the next — a problem shows up, a method answers it, the method's limit becomes the next section
4. Named papers, numbered claims, and at least one interactive figure if the idea is geometric
5. Glossary for terms you refuse to re-explain
6. References as footnotes, not a dump at the top

Do not write a trip report with version numbers in the title. The versions can live in a walkthrough section. The spine is the argument.

## Voice

Narrative. Start from a thing you can hold (one neuron, one formula, one failure) and let the next section be forced by the last. Don't announce that you're doing that. Don't use the phrase "first principles."

First person for a solo note (`I ran`, `I don't know`). `We` only if more than one person actually did the work and you're naming them.

Contractions. Short punches next to long sentences. Take a position. Show a miss with a number.

Uneven sections. One section can be two paragraphs. One section can hold a table. Don't make every H2 the same length.

## Interactive figures

Gannon's primer is canvas + mode buttons. That publishes on GitHub Pages with no backend.

Drop this into a note (raw HTML, own paragraph):

```html
<figure>
  <div class="mode-row" id="my-modes">
    <button class="mbtn active" type="button" data-mode="a">A</button>
    <button class="mbtn" type="button" data-mode="b">B</button>
  </div>
  <div class="canvas-wrap">
    <canvas id="cv-mine" width="680" height="260"></canvas>
  </div>
  <figcaption>What the click changes.</figcaption>
</figure>
```

Then in `assets/js/<note>.js`:

```js
Kit.figure({
  canvas: "cv-mine",
  modes: "my-modes",
  animate: false,
  draw(c, w, h, t, mode, C) { /* use Kit.txt, Kit.rr, C.rd */ }
});
```

List the scripts in front matter, kit first:

```yaml
scripts:
  - kit.js
  - my-note.js
```

Copy `assets/js/whitebox.js` as the next-app starter. Same paper palette, same segmented view buttons, no new CSS unless you need it. Don't ship a figure that only restates the previous paragraph.

## Detector gate (GPTZero / Pangram)

We cannot honestly promise a live detector score from this repo. GPTZero started on perplexity and burstiness and now uses a deeper classifier. Pangram does **not** use perplexity; it is a trained detector over style, syntax, and structure, with sentence-level highlights.

So the gate is in two layers.

### Layer 1 — local, blocking (`scripts/style_check.py`)

Catches the fingerprints both families still react to:

| Signal | AI-typical | What we require |
|---|---|---|
| Burstiness | Sentences cluster ~18–25 words | Mix of punches (<12 words) and long stacks (>25). Fail if three similar-length sentences in a row |
| Transitions | Furthermore / Moreover / In conclusion / It's important to note | Banned as openers. Fail on hit |
| Diction | delve, tapestry, landscape, pivotal, leverage, robust+comprehensive | Banned list in the script |
| Structure | Even H2s + recap "Conclusion" | No `Conclusion` heading |
| Specificity | "many", "high accuracy" | At least 6 concrete numbers, including one miss |
| Stance | Neutral encyclopedia | First person; at least one contraction |
| Failure | Hidden | A counted miss |

Run it. If it fails, rewrite the sentence, don't synonym-swap.

### Layer 2 — live, before you hit Pages

Paste the rendered article into [GPTZero](https://gptzero.me/) and [Pangram](https://www.pangram.com/). Rewrite highlighted paragraphs' rhythm. Then fill:

```yaml
detector:
  gptzero: "YYYY-MM-DD, mixed / not 100% AI"
  pangram: "YYYY-MM-DD, human or mixed; N sentences highlighted, then rewritten"
```

Until those two fields exist, treat the note as unpublished.

Don't sprinkle typos. Don't run a "humanizer." Don't add a fake childhood anecdote.

## Front matter

See `templates/primer.md`. Required: `title`, `lead`, `date`, `author`, `tags`, `glossary` (can be empty list). Optional: `permalink` if you want a short URL like `/primer/`.

## Checklist before you call a note done

- [ ] Opens on a broken assumption, not a definition
- [ ] `python scripts/style_check.py` exits 0
- [ ] At least one miss with a number
- [ ] Footnotes are real URLs or arXiv ids — nothing invented
- [ ] Glossary terms are used in the body
- [ ] Live GPTZero + Pangram paste done, or the note is marked draft
- [ ] You actually read it on the page
