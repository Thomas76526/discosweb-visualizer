# Discosweb Visualizer — Frontend

A dark, editor-style data workbench for exploring discosweb datasets. Built as
a deliberate alternative to "default dashboard" templates: layered OKLCH
surfaces, no shadow-as-depth, varied radii, mono numerics, semantic accent.

## Stack

- **Vite 5** — dev server + bundler
- **React 18** + **TypeScript** (strict)
- **ECharts 5** — canvas-rendered charts via tree-shaken core
- **Zustand** — UI store (no Redux ceremony)
- **@tanstack/react-table** — for table surfaces (lazy-loaded)

No Tailwind, no shadcn, no Material, no Chakra. Every component owns its CSS.

## Quick start

```bash
cd frontend
npm install
npm run dev        # http://127.0.0.1:5173
npm run build      # production build
npm run typecheck  # tsc --noEmit (strict)
npm run preview    # serve the built output
```

## Directory layout

```
frontend/
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── src/
    ├── App.tsx
    ├── App.css
    ├── main.tsx
    ├── api/
    │   └── client.ts          # fetch wrapper with envelope + timeout
    ├── components/
    │   ├── charts/
    │   │   ├── LineChart.tsx
    │   │   ├── LineChart.css
    │   │   ├── BarChart.tsx
    │   │   └── BarChart.css
    │   └── ui/
    │       ├── Button.tsx
    │       ├── Button.css
    │       ├── Card.tsx
    │       ├── Card.css
    │       ├── Surface.tsx
    │       └── Surface.css
    ├── lib/
    │   └── echarts-theme.ts   # dark theme registered against tokens
    ├── store/
    │   └── ui.ts              # zustand store
    └── styles/
        ├── tokens.css         # OKLCH design tokens — single source of truth
        └── global.css         # reset + base typography
```

## Design system

### Color

The surface scale is layered by lightness in OKLCH, not by shadow blur:

```
bg-canvas   oklch(15% 0.01 250)   ← page background
bg-surface  oklch(20% 0.01 250)   ← topbar, sidebar, config panel
bg-elevated oklch(25% 0.01 250)   ← cards, popovers
```

Use `Surface` (the layer-cake primitive) instead of stacking `box-shadow`s.

### Radius

Three values, used with intent — never uniform:

```
--radius-sm  6px   buttons, inputs, toggles
--radius-md  10px  cards, surfaces
--radius-lg  16px  modals, popovers
```

### Type

```
--font-display   Inter, system-ui, ...    UI text
--font-mono      JetBrains Mono, ...      numbers, field names, code
```

Mono is reserved for **numeric / technical** content (KPIs, field types,
timestamps). Display font is used everywhere else.

### States

Every interactive element has three designed states:
- **hover** — lightens the surface or shifts accent
- **focus** — 2px accent ring with 2px offset, sits on any background
- **active** — slightly darker + 0.5px translate for tactile feedback

Disabled elements drop opacity to 0.45 and remove cursor affordance.

## Font loading & subsetting

Inter and JetBrains Mono come from Google Fonts in dev for iteration speed.
For production we plan to:

1. **Self-host** both families (privacy + reliability + speed).
2. **Subset to Latin-Extended** for Inter (used languages: en, zh-CN).
3. **Subset to Latin** for JetBrains Mono (numbers + code).
4. Use `unicode-range` in `@font-face` so each weight only loads when its
   unicode range is actually present.
5. Preload only `Inter 500` and `JetBrains Mono 500` — the most-used weights.
6. Set `font-display: swap` so text never blocks first paint.

Estimated weight after subsetting + WOFF2:
- Inter (4 weights, latin-ext): ~45kb
- JetBrains Mono (2 weights, latin): ~28kb

Until self-hosting is wired up, `index.html` uses `preconnect` + a single
preload tag to keep blocking time low.

## Conventions

- Each component colocates a `Foo.css` next to `Foo.tsx`. No global stylesheet
  imports from inside a component.
- Tokens come from `styles/tokens.css` only — never hardcode color/spacing/radius.
- Charts read directly from OKLCH values in `lib/echarts-theme.ts` so the chart
  palette and UI palette stay in lockstep.
- API calls go through `api/client.ts`, which uses an envelope
  `{ data, error, meta }` and throws `ApiError` with status code.

## What's intentionally not here

- **Tailwind / shadcn defaults** — replaced with hand-written CSS.
- **Layout shadows** — depth via lightness.
- **Centered hero + gradient blob** — workbench aesthetic, not landing page.
- **Generic gray** — semantic accent reserved for focus, primary, selection.
- **Uniform radius** — varied by surface type.