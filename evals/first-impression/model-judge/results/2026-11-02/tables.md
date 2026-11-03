## P("ai") by condition

| Condition | Judges | P("ai") | 95% interval (over briefs) | Mean confidence | Answers |
|---|---|---|---|---|---|
| claude-plain | pooled | 100% | 100%–100% | 2.9 | 40 |
| claude-shadcn | pooled | 95% | 88%–100% | 2.8 | 40 |
| claude-altitude | pooled | 57% | 35%–75% | 2.2 | 40 |
| human | pooled | 0% | 0%–0% | 3.4 | 40 |
| altitude-preview | pooled | 60% | 45%–75% | 2.3 | 20 |
| claude-plain | claude-opus-5-5 | 100% | 100%–100% | 2.9 | 24 |
| claude-shadcn | claude-opus-5-5 | 92% | 79%–100% | 2.8 | 24 |
| claude-altitude | claude-opus-5-5 | 75% | 46%–96% | 2.3 | 24 |
| human | claude-opus-5-5 | 0% | 0%–0% | 3.3 | 24 |
| altitude-preview | claude-opus-5-5 | 83% | 67%–100% | 2.4 | 12 |
| claude-plain | claude-sonnet-5-5 | 100% | 100%–100% | 2.8 | 16 |
| claude-shadcn | claude-sonnet-5-5 | 100% | 100%–100% | 2.8 | 16 |
| claude-altitude | claude-sonnet-5-5 | 31% | 13%–44% | 2 | 16 |
| human | claude-sonnet-5-5 | 0% | 0%–0% | 3.6 | 16 |
| altitude-preview | claude-sonnet-5-5 | 25% | 0%–50% | 2.1 | 8 |

## Discrimination against the human anchor

| Session | Model | d′ all built | d′ plain | d′ shadcn | d′ altitude | c (all built) |
|---|---|---|---|---|---|---|
| 1 | claude-opus-5-5 | 2.67 | 3.19 | 2.18 | 2.56 | 0.26 |
| 2 | claude-opus-5-5 | 2.87 | 3.19 | 3.19 | 2.18 | 0.16 |
| 3 | claude-opus-5-5 | 2.67 | 3.19 | 3.19 | 1.88 | 0.26 |
| 4 | claude-sonnet-5-5 | 2.67 | 3.19 | 3.19 | 1.88 | 0.26 |
| 5 | claude-sonnet-5-5 | 2.01 | 3.19 | 3.19 | 0 | 0.59 |

## Most-cited codes in "ai" answers

| Condition | "ai" answers | Codes (share of those answers citing it) |
|---|---|---|
| claude-plain | 40 | LA7 50%, TY4 35%, IC4 30%, new:rainbow-colour-coding 30%, new:dotted-pastel-status-pills 28%, CO8 25%, new:letter-logo-tile 25%, new:page-in-single-card 25%, new:washed-out-disabled-button 25%, new:helper-text-every-field 23% |
| claude-shadcn | 38 | LA7 47%, new:every-section-in-card 45%, IC4 42%, CM6 29%, new:generic-subtitle 26%, new:duplicated-information 26%, new:clipped-content 26%, new:stock-sample-names 26%, new:page-in-single-card 18%, LA4 18% |
| claude-altitude | 23 | new:raised-breadcrumb-chips 39%, new:misaligned-element 35%, new:duplicated-information 35%, new:sparse-dead-space 30%, new:stock-sample-names 30%, new:unexplained-empty-gap 26%, new:inconsistent-component-styles 26%, new:generic-subtitle 22%, new:label-value-grid 22%, new:glossy-raised-button 17% |
| human | 0 | – |
| altitude-preview | 12 | new:misaligned-element 58%, new:debug-control-exposed 58%, new:raised-breadcrumb-chips 42%, new:stock-sample-names 42%, new:every-section-in-card 33%, new:text-link-tabs 33%, new:generic-subtitle 25%, new:sparse-dead-space 25%, new:save-status-indicator 25%, IC4 17% |

## New labels (proposed as tells at ≥ 20% of a built condition's "ai" answers)

| Label | Plain | shadcn | Altitude | Proposed | Definition |
|---|---|---|---|---|---|
| new:every-section-in-card | 20% | 45% | 4% | yes | Every section sits in its own identical rounded bordered card. |
| new:raised-breadcrumb-chips | 0% | 0% | 39% | yes | Breadcrumb or tab items are drawn as raised, shadowed button chips. |
| new:duplicated-information | 0% | 26% | 35% | yes | The same fact (count, name, date) is shown twice on the screen. |
| new:misaligned-element | 0% | 0% | 35% | yes | An element sits out of alignment with its neighbours. |
| new:sparse-dead-space | 8% | 5% | 30% | yes | Most of the page is left empty, with sparse content. |
| new:stock-sample-names | 23% | 26% | 30% | yes | Stock or invented sample organisation and people names (Northwind, Acme). |
| new:rainbow-colour-coding | 30% | 13% | 0% | yes | Avatars or pills are given many arbitrary hues, one per item or status. |
| new:dotted-pastel-status-pills | 28% | 18% | 17% | yes | Status shown as tinted pills with a leading coloured dot. |
| new:clipped-content | 5% | 26% | 4% | yes | Text, columns or labels are cut off or overflow their container. |
| new:generic-subtitle | 5% | 26% | 22% | yes | A generic subtitle restates the page title or task. |
| new:inconsistent-component-styles | 15% | 0% | 26% | yes | One instance of a component is styled unlike its siblings or the rest of the UI. |
| new:unexplained-empty-gap | 0% | 0% | 26% | yes | A large unexplained gap separates related elements. |
| new:letter-logo-tile | 25% | 8% | 0% | yes | The logo is a small square tile with a letter or monogram. |
| new:page-in-single-card | 25% | 18% | 4% | yes | The whole page's content is wrapped in one large card. |
| new:washed-out-disabled-button | 25% | 0% | 0% | yes | The disabled primary button is a faded, washed-out tint. |
| new:helper-text-every-field | 23% | 0% | 0% | yes | Every field has helper text beneath it. |
| new:keyboard-shortcut-hint | 23% | 0% | 0% | yes | A "/" keyboard shortcut hint sits in the search field. |
| new:label-value-grid | 0% | 5% | 22% | yes | Metadata laid out as a uniform grid of grey labels over values. |
| new:awkward-text-wrap | 20% | 0% | 0% | yes | Labels or names wrap awkwardly in narrow cells. |
| new:dark-mode-toggle | 20% | 5% | 0% | yes | A dark-mode button or moon icon sits in the header. |
| new:stock-screen-archetype | 20% | 11% | 4% | yes | The screen follows a textbook template archetype (settings form, projects table, KPI dashboard). |
| new:gradient-logo-mark | 18% | 0% | 0% |  | The logo is a gradient-filled square mark. |
| new:glossy-raised-button | 0% | 0% | 17% |  | A button is drawn glossy and raised with a heavy bottom shadow or gradient. |
| new:stray-focus-outline | 10% | 0% | 17% |  | A focus ring is drawn around a non-input element such as the page title or main region. |
| new:monochrome-no-accent | 0% | 16% | 0% |  | The interface is black, white and grey with no accent colour. |
| new:status-hierarchy-by-fill | 0% | 16% | 0% |  | Status pills differ by solid, outlined or plain fill to show rank. |
| new:pastel-tag-chips | 15% | 11% | 0% |  | Roles, tags or allergens shown as tinted or outlined pill chips. |
| new:avatar-stack | 0% | 13% | 0% |  | An overlapping stack of avatar circles with a +N count. |
| new:literal-icon-logo | 8% | 13% | 0% |  | The logo is a literal stock icon of the domain (truck, paw, brush). |
| new:raw-float-in-copy | 0% | 13% | 0% |  | An unrounded floating-point number (28.000000000000004) appears in the interface. |
| new:sample-data-label | 0% | 13% | 0% |  | A "Sample data" pill badge is shown in the header. |
| new:understated-stats | 0% | 13% | 0% |  | Stat tiles use small, restrained values rather than hero numbers. |
| new:diverse-name-roster | 3% | 11% | 13% |  | Sample people form a deliberately diverse roster of names. |
| new:inset-shadowed-field | 0% | 0% | 13% |  | An input is drawn inset with a grey inner shadow, often reading as disabled. |
| new:links-everywhere | 0% | 0% | 13% |  | Every email, phone or value is rendered as an underlined link. |
| new:card-footer-action-bar | 13% | 0% | 0% |  | A card ends in a grey footer bar holding Cancel and Save. |
| new:generic-product-name | 13% | 8% | 0% |  | An invented, generic or cute product name (Relay, PawBook). |
| new:serif-display-headings | 13% | 0% | 0% |  | Headings are set in a serif display face. |
| new:sort-arrows-every-column | 13% | 0% | 4% |  | Every column header carries a sort arrow. |
| new:consistent-outline-icons | 0% | 11% | 0% |  | One outline icon set is used consistently, e.g. beside each detail or in the nav. |
| new:diff-chips | 0% | 11% | 0% |  | A change log shows old and new values as strikethrough-to-new chips. |
| new:progress-bar-every-row | 10% | 11% | 0% |  | Every table row carries a progress bar with a percentage. |
| new:rendering-artifacts | 0% | 11% | 0% |  | Chart marks render with jagged or broken edges. |
| new:smoothed-chart-lines | 0% | 11% | 0% |  | Line charts use smoothed spline curves between points. |
| new:sync-status-shown | 5% | 11% | 0% |  | A "Last synced/Updated" time is shown, often with a Refresh button. |
| new:two-line-cells | 5% | 11% | 0% |  | Table cells carry a grey secondary line under the main value. |
| new:chart-legend-mismatch | 10% | 8% | 0% |  | The legend or labels don't match the marks drawn (missing series, unlabelled segment). |
| new:monospace-ids | 10% | 8% | 4% |  | Reference IDs are set in a monospace face. |
| new:stray-separator | 10% | 0% | 0% |  | A separator dot or bullet trails with nothing after it. |
| new:count-beside-search | 8% | 0% | 9% |  | A result count is floated to the right of the search field. |
| new:hairline-row-dividers | 0% | 0% | 9% |  | Thin hairline rules separate every row of a list. |
| new:inconsistent-capitalisation | 0% | 0% | 9% |  | The same kind of label is capitalised differently from item to item. |
| new:placeholder-contact-details | 0% | 0% | 9% |  | Contact details use placeholder values such as 555 phone numbers. |
| new:stock-status-set | 3% | 5% | 9% |  | Statuses use the stock On track / At risk / Off track set. |
| new:unequal-card-heights | 0% | 0% | 9% |  | Side-by-side cards have mismatched heights. |
| new:awkward-number-format | 0% | 8% | 4% |  | Numbers are formatted inconsistently or with redundant decimals. |
| new:chart-event-annotation | 0% | 8% | 0% |  | An event is annotated on the chart with a band or marker line. |
| new:selected-state-heavy-border | 3% | 8% | 0% |  | The selected card is marked by a heavy or coloured border. |
| new:dot-separated-meta | 8% | 0% | 4% |  | Metadata items run in a row separated by middle dots. |
| new:gradient-area-fill | 8% | 5% | 0% |  | A line chart has a soft gradient or tinted fill beneath the line. |
| new:oversized-numbers | 8% | 0% | 0% |  | A stat or hero number is set very large. |
| new:nested-containers | 0% | 5% | 0% |  | A table sits in a bordered box inside another card or container. |
| new:segmented-controls | 3% | 5% | 0% |  | Options are switched with segmented pill controls. |
| new:chart-table-toggle | 5% | 3% | 0% |  | A Chart/Table toggle offers the data as a table. |
| new:delta-indicators | 5% | 0% | 0% |  | Values carry green/red up/down triangles or arrows for change. |
| new:filter-toolbar | 5% | 0% | 0% |  | A toolbar of filter pills and selects sits above the content. |
| new:red-overdue-flag | 5% | 0% | 0% |  | Late or overdue values are flagged in red text. |
| new:relative-timestamps | 5% | 0% | 0% |  | Times are shown relatively ("2 hours ago"). |
| new:centred-fixed-container | 0% | 3% | 4% |  | Content sits in a narrow centred fixed-width column. |
| new:checkbox-column | 3% | 3% | 4% |  | Tables lead with a row-selection checkbox column. |
| new:cramped-spacing | 0% | 0% | 4% |  | Elements are squeezed with too little space between them. |
| new:domain-inconsistency | 0% | 0% | 4% |  | Sample content contradicts itself within the domain (e.g. a braised dish on the grill station). |
| new:minimal-chrome | 0% | 0% | 4% |  | Plain pale page with no sidebar and little surrounding interface chrome. |
| new:prose-chart-summary | 0% | 0% | 4% |  | A caption or subtitle restates the chart's figures in words. |
| new:purposeful-helper-copy | 0% | 0% | 4% |  | Helper copy explains consequences or context specific to the task. |
| new:sentence-status-line | 0% | 0% | 4% |  | A result count is written as a full sentence with a full stop. |
| new:truncated-axis | 0% | 0% | 4% |  | The y-axis starts above zero, exaggerating change. |
| new:ellipsis-placeholder | 0% | 3% | 0% |  | A search field's placeholder text ends in an ellipsis. |
| new:eyebrow-label | 0% | 3% | 0% |  | A small label sits above the page title. |
| new:ranked-bar-list | 0% | 3% | 0% |  | A tidy list of horizontal bars ranks items. |
| new:takeaway-chart-title | 0% | 3% | 0% |  | The chart title states the finding as a sentence. |
| new:too-tidy-data | 0% | 3% | 0% |  | Sample data is suspiciously regular: sequential IDs and uniformly plausible values. |
| new:card-header-dividers | 3% | 0% | 0% |  | Cards have a rule separating the card title from its body. |
| new:direct-line-labels | 3% | 0% | 0% |  | Series are labelled at the line ends instead of with a legend. |
| new:domain-expert-copy | 3% | 0% | 0% |  | Copy uses accurate, specialist domain detail (temperatures, techniques, regional spelling). |
| new:em-dash-copy | 3% | 0% | 0% |  | Em dashes appear in names or interface strings. |
| new:pill-nav | 3% | 0% | 0% |  | Top navigation items are rendered as pills. |
| new:primary-secondary-button-pair | 3% | 0% | 0% |  | A filled primary button sits beside a bordered secondary button. |
| new:broken-images | 0% | 0% | 0% |  | Small images or icons fail to load and render as dots or blanks. |
| new:cover-photo-profile | 0% | 0% | 0% |  | A profile page with a landscape cover photo and overlapping round avatar. |
| new:crowded-axis-labels | 0% | 0% | 0% |  | An axis labels every tick so the labels crowd each other. |
| new:dated-sample-data | 0% | 0% | 0% |  | Sample data is visibly old (e.g. 2018 crypto prices, 2014 filenames). |
| new:dated-template-look | 0% | 0% | 0% |  | The styling reads as an older (2014-era) flat admin template. |
| new:debug-control-exposed | 0% | 0% | 0% |  | A developer/demo control (e.g. "Make the next change fail") is left in the product UI. |
| new:disabled-until-valid | 0% | 0% | 0% |  | The primary action stays disabled until the form is filled in. |
| new:domain-specific-structure | 0% | 0% | 0% |  | Content is structured the way the domain works (e.g. ingredients grouped by stage, quantity-first). |
| new:edge-case-handling | 0% | 0% | 0% |  | The screen shows copy or states for edge cases (e.g. the sole owner cannot change role). |
| new:export-option | 0% | 0% | 0% |  | An Export CSV or similar data-download control sits beside the chart. |
| new:file-type-icons | 0% | 0% | 0% |  | Files are listed with per-type document icons. |
| new:fully-ruled-table | 0% | 0% | 0% |  | A table with borders on every cell. |
| new:headline-not-shown-in-chart | 0% | 0% | 0% |  | The headline names an event that the chart does not mark. |
| new:identical-placeholder-rows | 0% | 0% | 0% |  | Table rows repeat identical placeholder values (same date, same status, '#' index). |
| new:locale-number-format | 0% | 0% | 0% |  | Numbers use a non-local format such as $1.800,00. |
| new:muted-comparison-series | 0% | 0% | 0% |  | A prior period is drawn as a muted grey line against an accented current series. |
| new:no-cards | 0% | 0% | 0% |  | Content sits flat on the page without card containers. |
| new:odd-copy | 0% | 0% | 0% |  | A heading or label uses unusual or awkward wording. |
| new:overlapping-text | 0% | 0% | 0% |  | Two lines of text are drawn on top of each other. |
| new:plain-line-chart | 0% | 0% | 0% |  | A simple single-line chart without decoration. |
| new:quirky-sample-data | 0% | 0% | 0% |  | Sample data includes quirky or joke names and odd values. |
| new:radio-with-descriptions | 0% | 0% | 0% |  | Radio options each carry a descriptive helper line. |
| new:raised-tactile-style | 0% | 0% | 0% |  | Controls are drawn raised or bevelled, like physical keys. |
| new:raw-data-leak | 0% | 0% | 0% |  | Raw data values (e.g. a sparkline's number list) render as visible text. |
| new:real-photo-avatars | 0% | 0% | 0% |  | Avatars are real photographs of people. |
| new:restrained-palette | 0% | 0% | 0% |  | A muted palette with one or two colours and no decoration. |
| new:save-status-indicator | 0% | 0% | 0% |  | A small "Saved" chip sits beside the primary action. |
| new:single-chart-focus | 0% | 0% | 0% |  | One chart carries the whole page instead of a row of KPI cards. |
| new:small-radius-flat-cards | 0% | 0% | 0% |  | Cards have a small radius, thin borders and no soft shadow. |
| new:social-media-widgets | 0% | 0% | 0% |  | Social follow buttons and circular social-network icons. |
| new:sortable-columns | 0% | 0% | 0% |  | A table column header carries a sort control. |
| new:source-sans-type | 0% | 0% | 0% |  | The interface is set in Source Sans. |
| new:sparse-axis-ticks | 0% | 0% | 0% |  | The x-axis shows only a few ticks (e.g. quarterly) instead of every period. |
| new:template-sample-copy | 0% | 0% | 0% |  | Lorem/hipster ipsum or template demo copy is left in. |
| new:text-link-tabs | 0% | 0% | 0% |  | Section navigation is plain underlined text links. |
| new:two-column-form-layout | 0% | 0% | 0% |  | A form or editor on the left with a narrow details column on the right. |
| new:unlabelled-axis | 0% | 0% | 0% |  | A chart axis carries no value labels. |
| new:zebra-striped-table | 0% | 0% | 0% |  | Table rows alternate background shades. |

## Coder agreement (147 cues coded twice; exact match 81%)

| Code | Uses | κ |
|---|---|---|
| CM6 | 17 | 0.72 |
| new | 135 | 0.58 |
| IC4 | 10 | 0.81 |
