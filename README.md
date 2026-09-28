# Litter Planner

Practical meat-rabbit kindle / litter planner. Log a mating, get nest → kindle → wean → process chores, keep the herd in `localStorage`. Cream/paper craft UI that sits beside the [progeny colors](https://frank-dixon.github.io/rabbit/) tool — it does **not** rebuild genetics.

Phase 1 is local-only. No auth, no PWA, no CSV, and **GitHub Pages is not enabled yet**.

## Open locally

```bash
npm install
npm run watch          # rebuilds CSS + JS on change
# then open docs/index.html in a browser
```

One-shot build (also used before commit):

```bash
npm install
npm run build
```

Open `docs/index.html` directly, or serve the `docs/` folder with any static server.

## Schedule defaults

| Chore   | Rule                                      | Default |
| ------- | ----------------------------------------- | ------- |
| Nest    | mating date + `nestOffsetDays`            | 27      |
| Kindle  | mating date + `kindleOffsetDays`          | 31      |
| Wean    | kindle date + `weanDaysAfterKindle`       | 28      |
| Process | kindle date + `processDaysAfterKindle`    | 75      |

If no kindle date is recorded yet, wean and process use the **estimated** kindle (mating + kindle offset). Offsets are editable under Settings; open chores recalculate when you save.

## Stack

- Plain HTML + JS (no React / TypeScript)
- Tailwind CSS 3 → `docs/css/litter-planner.css`
- esbuild minify of `src/js/*.js` → `docs/js/`
- `npm run watch` via concurrently (hyphaneural-style)

## Repo

https://github.com/frank-dixon/litter-planner
