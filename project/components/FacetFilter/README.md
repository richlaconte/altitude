# FacetFilter

Narrow a collection through one named set of choices ("Asset type", "File format") whose counts come from your search service. It's a fieldset of real Checkboxes that edits a **draft** selection: you fetch, apply and announce the results. This is the counted, multi-select facet a catalog sidebar needs.

Use `FilterBar` for field, operator and value conditions over a local collection (it filters in place, so matches rise and misses sink), and a `Slider` or `NumberInput` for a price range.

**Elevation: the record, with choices in it.**
- **The group, labels and counts** lie on the ground. A count is a word in tabular figures. When it changes it cross-fades in place: no count-up, no rise, and options never reorder, so a box never moves from under the pointer.
- **Each choice** is a `Checkbox`: an empty trench, the accent poured in, a raised check.
- **Option search** is an `Input` well. **Clear … filters** is a ghost button. **Show more** is a text button styled as a link, so it can't be mistaken for an option.

**Counts are evidence, not guesses.** They describe the query you've *applied*, so a zero or unknown count never disables an option.
- `count: 38` reads "38".
- `countKind: 'approximate'` reads "about 40", for engines whose counts are estimates, such as sharded term aggregations.
- An unknown count (`undefined` or `null`) shows "–" and says "count unavailable". It's never drawn as 0.
- `counts="refreshing"` keeps the previous counts, underlines them dotted, and says "Updating counts…". `stale` says "Counts may be out of date" with a caution icon. `unavailable` hides the numbers and says so.
- `countsLabel` names the query the counts describe, as the group's description.

**Selections survive the response.** A selected value that the latest `options` leaves out stays listed first, checked and removable, with "Not in the latest results". Give its label in `retainedLabels`; without one the value itself is shown. An `unavailable` option shows its reason. It can't be chosen, but if it's already selected it can still be unchecked.

**Long lists.** After `limit` options (default 10), a "Show 12 more file formats" button expands the list in place, with `aria-expanded`. It never truncates to hide a single option, and never hides a selected one. With more than 15 options, a search field filters them by label (`searchable` to force it on or off).

**Accessibility.**
- A `fieldset` whose `legend` is the group name, plus "2 selected" when anything is.
- Native checkboxes: Tab, then Space.
- Each count is part of its option's name ("Textures, 112 results").
- `aria-busy` while refreshing.

The component announces nothing itself: announce the settled result count once, in a polite status, after you apply. Focus stays on the box you pressed when new counts arrive, and moves to the first option after Clear. Under forced colours the boxes keep their borders and counts stay text. Under reduced motion the cross-fade and the chevron turn are removed.

**Parts:** `FacetFilter` takes these props:
- `label`
- `options` (`{ value, label, count?, countKind?, unavailable? }[]`)
- `value` and `onValueChange`
- `counts`, `countsLabel`
- `retainedLabels`
- `limit`, `searchable`, `noun` (the plural for "Show 12 more …" and "Search …")
- `onClear`
- `formatCount` (default `Intl.NumberFormat()`; pass a fixed locale when you render on a server)

**You provide:**
- the options and counts from your search service, for the applied query;
- the draft-then-Apply flow (or a documented immediate-apply flow of your own);
- the labels of selected values your service stopped returning;
- the announcement of results;
- URL serialization and request cancellation.

The component doesn't compute counts from the visible page of results, and doesn't fetch.

```tsx
const [draft, setDraft] = useState<string[]>(applied.types);
<FacetFilter label="Asset type" noun="asset types" options={facets.types} value={draft} onValueChange={setDraft}
  retainedLabels={labelsFor(applied.types)} counts={refreshing ? 'refreshing' : 'current'}
  countsLabel="Counts for your applied filters" />
<Button onClick={() => apply({ ...applied, types: draft })}>Apply filters</Button>
```

- Do let people apply deliberately when results take more than a moment.
- Do keep a selected value visible even when the response omits it.
- Don't show an unknown count as 0, or disable an option because its count is 0.
- Don't re-sort options when one is checked.

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`FacetFilter` as first used in its preview:

```tsx
import { FacetFilter } from 'altitude-design';

<FacetFilter label="Asset type" noun="asset types" options={FF_TYPES} value={types} onValueChange={setTypes}
  retainedLabels={{ hdri: 'HDRI skies' }} counts={counts} countsLabel="Counts for your applied filters" />
```

The full preview, as rendered in Storybook and checked in CI (`ff`, `ff-side`, `ff-main`, `cap` are the preview page's own layout classes, not Altitude's):

```tsx
import * as React from 'react';
import { Button, FacetFilter } from 'altitude-design';

const FF_TYPES = [
  { value: 'model', label: '3D models', count: 38 },
  { value: 'texture', label: 'Textures', count: 112 },
  { value: 'audio', label: 'Audio', count: 0 },
  { value: 'template', label: 'Document templates', count: undefined },
  { value: 'font', label: 'Fonts', count: 9, unavailable: 'Not sold in your region' },
];
const FF_FORMATS = ['GLB', 'FBX', 'OBJ', 'USDZ', 'PNG', 'EXR', 'KTX2', 'TGA', 'WAV', 'FLAC', 'OGG', 'MP3', 'DOCX', 'ODT', 'PDF', 'OTF', 'TTF', 'WOFF2']
  .map((f, i) => ({ value: f.toLowerCase(), label: f, count: [24, 19, 11, 6, 140, 48, 31, 12, 0, 0, 0, 0, 7, 5, 9, 3, 3, 3][i], countKind: i < 4 ? 'approximate' : 'exact' }));
export default function App() {
  const [types, setTypes] = React.useState(['model', 'hdri']);
  const [formats, setFormats] = React.useState([]);
  const [applied, setApplied] = React.useState({ types: ['model', 'hdri'], formats: [] });
  const [counts, setCounts] = React.useState('current');
  const changed = JSON.stringify({ types, formats }) !== JSON.stringify(applied);
  const apply = () => { setCounts('refreshing'); setTimeout(() => { setApplied({ types, formats }); setCounts('current'); }, 700); };
  return <div className="ff">
    <div className="ff-side">
      <FacetFilter label="Asset type" noun="asset types" options={FF_TYPES} value={types} onValueChange={setTypes}
        retainedLabels={{ hdri: 'HDRI skies' }} counts={counts} countsLabel="Counts for your applied filters" />
      <FacetFilter label="File format" noun="file formats" options={FF_FORMATS} limit={6} value={formats} onValueChange={setFormats} counts={counts} />
      <Button onClick={apply} loading={counts === 'refreshing'}>Apply filters</Button>
    </div>
    <div className="ff-main" role="status">
      <p>{counts === 'refreshing' ? 'Updating results…' : `38 products · ${applied.types.length + applied.formats.length} filters applied`}</p>
      {changed && counts !== 'refreshing' && <p className="cap">You have changes that aren't applied yet.</p>}
    </div>
  </div>;
}
```
<!-- /example -->
