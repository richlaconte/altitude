# shadcn/ui chart on Altitude

A shadcn/ui `Chart` (Recharts 3 underneath) set up as [Theming](../../project/Theming.md) ("With shadcn/ui", "Charts") says: Tailwind's theme pointed at Altitude's tokens, `--chart-1` … `--chart-5` pointed at `data-1` … `data-5`, and the Recharts props that keep Altitude's chart rules. It renders a bar chart and a stacked area chart in all four schemes, each nested in a daylight page.

It isn't part of the package. It exists so the mapping stays honest: `build/checks/shadcn-chart.mjs` reads every colour back from the rendered charts and fails if the docs and the libraries drift apart.

`src/components/ui/chart.tsx` is shadcn/ui's `new-york-v4` chart component as published (MIT, © shadcn), with only the `cn` import path changed.

```sh
npm run build                          # at the repository root: the package's dist/
npm ci --prefix examples/shadcn-chart
node examples/shadcn-chart/build.mjs   # → examples/shadcn-chart/out/index.html
cd build && node checks/shadcn-chart.mjs
```
