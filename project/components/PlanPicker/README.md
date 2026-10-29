# PlanPicker

Choose a plan (Free, Pro, Business) in sign-up, upgrade and downgrade flows, with a Monthly / Annually switch, prices, and what each plan includes.

**Elevation: one choice, one mark.** "A radio group is one switch with several positions, so its single thumb slides to the chosen option." The plan cards are positions in one group: they lie flush on the ground with a `line` rim, and **one raised mark travels to the chosen card's corner** on `ease-glide`. The chosen card also takes an `accent` rim. Pointing at another card shows a ghost of the mark there.

**No lifted "most popular" card.** Pricing pages usually raise and glow the plan they want you to pick. Marketing emphasis isn't importance *right now*, so it isn't height. **"Recommended" and "Current plan" are flush `Badge` plates.** The only level-2 slab is your Continue button beside the picker (law 1), and its label should name the outcome ("Continue to Pro").

**Prices** come in minor units and are formatted by `FormattedNumber`, so changing the period cross-fades them and never counts. Annual prices are shown per month, "billed annually". A plan with `price: null` says "Contact sales". A plan with `unavailable` can't be chosen and says why.

**Accessibility.** A [radio group](https://www.w3.org/WAI/ARIA/apg/patterns/radio/): one tab stop, and arrows move and choose (skipping unavailable plans). Each plan reads its name, price and period ("Pro, €20.00 per seat per month, billed annually, recommended"), with its features as the description. The period switch is a single-choice `ToggleGroup`. Under forced colours the chosen card has a 2px border and the mark keeps a `CanvasText` outline. Under `contrast="more"` the mark gets a hard slab. Under reduced motion the mark appears in place.

**Props:** `plans` (`{ id, name, description?, price ({ month, year } | number | null), currency?, unit?, features?, unavailable? }[]`); `value`, `defaultValue`, `onValueChange`; `current`; `recommended`; `period`, `onPeriodChange`; `locale`; `aria-label`.

**You provide:** the plans and their prices, the current plan, and the Continue button. The flow around it (proration, downgrade consequences) is the billing pattern.

```tsx
<PlanPicker plans={plans} value={plan} onValueChange={setPlan} current="free" recommended="pro" period={period} onPeriodChange={setPeriod} />
<Button variant="primary" onClick={next}>Continue to {planName}</Button>
```

- Do name the outcome on the Continue button.
- Do say why a plan can't be chosen.
- Don't lift or glow a recommended plan.
- Don't animate prices counting up when the period changes.
