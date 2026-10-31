<!-- Written by report.mjs from results.json; don't edit by hand. -->

## Runs

| Run | Generation | Build | Minutes | Cost (USD) | Skills called |
|---|---|---|---|---|---|
| claude-altitude--dashboard-a | complete | passed | 2.4 | 0.85 | dataviz |
| claude-altitude--dashboard-a--s2 | complete | passed | 1.9 | 0.60 | none |
| claude-altitude--dashboard-b | complete | passed | 3.8 | 1.24 | none |
| claude-altitude--record-view-a | complete | passed | 3.3 | 1.07 | none |
| claude-altitude--record-view-b | complete | passed | 3.8 | 1.23 | none |
| claude-altitude--records-a | complete | passed | 1.9 | 0.68 | none |
| claude-altitude--records-b | complete | passed | 2.5 | 0.81 | none |
| claude-altitude--settings-a | complete | passed | 2.0 | 0.68 | none |
| claude-altitude--settings-a--s2 | complete | passed | 2.0 | 0.65 | none |
| claude-altitude--settings-b | complete | passed | 2.0 | 0.64 | none |
| claude-plain--dashboard-a | complete | passed | 4.0 | 0.94 | dataviz |
| claude-plain--dashboard-a--s2 | complete | passed | 2.6 | 0.69 | dataviz |
| claude-plain--dashboard-b | complete | passed | 5.1 | 1.20 | dataviz |
| claude-plain--record-view-a | complete | passed | 3.6 | 0.81 | none |
| claude-plain--record-view-b | complete | passed | 3.2 | 0.73 | none |
| claude-plain--records-a | complete | passed | 2.1 | 0.50 | none |
| claude-plain--records-b | complete | passed | 2.2 | 0.50 | none |
| claude-plain--settings-a | complete | passed | 2.5 | 0.64 | none |
| claude-plain--settings-a--s2 | complete | passed | 1.9 | 0.45 | none |
| claude-plain--settings-b | complete | passed | 1.5 | 0.36 | none |
| claude-shadcn--dashboard-a | complete | passed | 2.3 | 0.66 | dataviz |
| claude-shadcn--dashboard-a--s2 | complete | passed | 2.7 | 0.84 | dataviz |
| claude-shadcn--dashboard-b | complete | passed | 2.9 | 0.89 | dataviz |
| claude-shadcn--record-view-a | complete | passed | 3.6 | 1.00 | run |
| claude-shadcn--record-view-b | complete | passed | 2.6 | 0.75 | none |
| claude-shadcn--records-a | complete | passed | 1.4 | 0.43 | none |
| claude-shadcn--records-b | complete | passed | 1.9 | 0.51 | none |
| claude-shadcn--settings-a | complete | passed | 1.3 | 0.40 | none |
| claude-shadcn--settings-a--s2 | complete | passed | 1.1 | 0.33 | none |
| claude-shadcn--settings-b | complete | passed | 1.5 | 0.46 | none |

30 runs, 21.52 USD in all.

## Distance from the centre

Mean distance from a system's screens to the baselines' (claude-plain, claude-shadcn) screens of the same briefs. Higher is further from the default.

| System | Visual (1 − UIClip cosine) | Colour (EMD, ΔE) | Layout (normalised tree edit distance) |
|---|---|---|---|
| altitude-preview | 0.1113 | 3.1031 | 0.7104 |
| claude-altitude | 0.0945 | 2.7756 | 0.6728 |
| claude-plain | 0.0937 | 4.0038 | 0.6477 |
| claude-shadcn | 0.0937 | 4.0038 | 0.6477 |

## Noise floor

Mean distance between one system's repeat builds of the same prompt. A gap between systems smaller than this is noise.

| System | Pairs | Visual (1 − UIClip cosine) | Colour (EMD, ΔE) | Layout (normalised tree edit distance) |
|---|---|---|---|---|
| claude-altitude | 2 | 0.0207 | 0.985 | 0.446 |
| claude-plain | 2 | 0.0295 | 1.495 | 0.3775 |
| claude-shadcn | 2 | 0.0314 | 0.825 | 0.5022 |

## Creative range

Mean distance between a system's two domain builds of each task. Higher means it varies more with the product.

| System | Visual (1 − UIClip cosine) | Colour (EMD, ΔE) | Layout (normalised tree edit distance) |
|---|---|---|---|
| claude-altitude | 0.0529 | 1.52 | 0.4858 |
| claude-plain | 0.097 | 6.3575 | 0.5173 |
| claude-shadcn | 0.0561 | 0.7025 | 0.5447 |

## Task range

Mean distance between a system's builds of different tasks. Low layout here means every screen gets the same frame (tell LA5).

| System | Visual (1 − UIClip cosine) | Colour (EMD, ΔE) | Layout (normalised tree edit distance) |
|---|---|---|---|
| altitude-preview | 0.0864 | 0.4183 | 0.6962 |
| claude-altitude | 0.1096 | 1.7933 | 0.7436 |
| claude-plain | 0.1534 | 6.3975 | 0.7271 |
| claude-shadcn | 0.1164 | 1.3475 | 0.6976 |

## Visual (1 − UIClip cosine), system against system

|  | altitude-preview | claude-altitude | claude-plain | claude-shadcn |
|---|---|---|---|---|
| altitude-preview | · | 0.0665 | 0.1147 | 0.1079 |
| claude-altitude | 0.0665 | · | 0.1019 | 0.0869 |
| claude-plain | 0.1147 | 0.1019 | · | 0.0937 |
| claude-shadcn | 0.1079 | 0.0869 | 0.0937 | · |

## Colour (EMD, ΔE), system against system

|  | altitude-preview | claude-altitude | claude-plain | claude-shadcn |
|---|---|---|---|---|
| altitude-preview | · | 1.285 | 4.9875 | 1.2188 |
| claude-altitude | 1.285 | · | 4.6513 | 0.9 |
| claude-plain | 4.9875 | 4.6513 | · | 4.0038 |
| claude-shadcn | 1.2188 | 0.9 | 4.0038 | · |

## Layout (normalised tree edit distance), system against system

|  | altitude-preview | claude-altitude | claude-plain | claude-shadcn |
|---|---|---|---|---|
| altitude-preview | · | 0.6999 | 0.7057 | 0.715 |
| claude-altitude | 0.6999 | · | 0.6658 | 0.6797 |
| claude-plain | 0.7057 | 0.6658 | · | 0.6477 |
| claude-shadcn | 0.715 | 0.6797 | 0.6477 | · |
