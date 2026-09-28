# Litter Planner

Practical meat-rabbit kindle / litter planner. Log a mating, get nest → kindle → wean → process chores, keep the herd in the browser. Cream/paper craft UI beside the [progeny colors](https://frank-dixon.github.io/rabbit/) tool — it does **not** rebuild genetics.

## Accounts (static / GitHub Pages)

Client-side only — no server:

| Mode | Behavior |
| ---- | -------- |
| **Guest** | Editable herd in `localStorage`. Banner nudges you to create an account once animals exist. |
| **Free account** | Email + password stored on this device (demo-grade hash — not production security). Guest herd migrates into the new account on signup. |
| **Sample barn** | Fixed demo login `sample@litterplanner.demo` / `sample`. Loads a rich fixture; **all writes are blocked** with a clear toast. |

Session is remembered in `localStorage` or `sessionStorage`. Live site deploys from `main` `/docs`.

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
- `npm run watch` via concurrently
