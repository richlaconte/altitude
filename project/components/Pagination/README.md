# Pagination

Moves through pages of a collection the server pages: invoices, members, audit events.

**Elevation: one thumb that travels.** The page numbers sit in a trench (`surface-well`), and **the current page is one raised thumb that travels to it** on `ease-glide`, as `RadioGroup`'s does. That reads as "you are here, among these", where a row of buttons reads as "any of these does something". Pointing at another page shows a ghost of the thumb there (feedforward). While the next page loads (`loading`), the thumb is held pressed until the rows arrive. Previous and Next are ghost buttons, flush and `ink-faint` at the ends.

**Pages.** It shows the first page, the last, and the current one with `siblings` either side, with "…" where pages are skipped. A gap of a single page shows that page instead, because "…" would take as much room. `pageRange()` gives the same list. **Cursor paging:** leave out `pageCount` and you get Previous, Next (disabled once `hasNext` is false) and "Page 3".

**Summary.** With `total` and `pageSize` it says "41–60 of 214 invoices" (`noun`) in a polite live region, so the change is announced after a page change.

**Accessibility.** A `nav` labelled "Pagination", with links when `hrefFor` gives pages URLs, or buttons otherwise. **They stay in plain Tab order:** these are links drawn like a radio group, not a radio group, so there's no roving focus. The current page has `aria-current="page"`. Pages are named "Page 3", and the steps "Previous page" and "Next page", with `aria-disabled` at the ends. Below 480px the steps show only their chevrons. Under forced colours the trench is dashed and the thumb has a 1px border. Under `contrast="more"` the thumb gets a 2px slab. Under reduced motion the thumb appears in place.

**Props:** `page` (from 1); `pageCount`; `onPageChange`; `total`, `pageSize`, `noun`; `hrefFor`; `hasNext`; `siblings` (default 1); `loading`; `locale`; `aria-label`.

**You provide:** the current page, how many there are (or whether there's a next one), and what happens on a change.

```tsx
<Pagination page={page} pageCount={11} onPageChange={setPage} total={214} pageSize={20} noun="invoices" />
<Pagination page={page} onPageChange={setPage} hasNext={!!cursor.next} />   // cursor paging
```

- Do use `hrefFor` when pages have URLs, so they can be opened in a new tab.
- Do show the summary; "Page 3 of 11" says less than "41–60 of 214".
- Don't page short lists; show them whole.
- Don't use it for steps in a process; that's a `Stepper`.
