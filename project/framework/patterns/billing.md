# Billing

Help someone understand what they pay for and change it safely: usage against plan limits, an estimate of the next bill, changing plan or billing period, locked features, a failed payment, and invoices. It composes [Review and submit](review-submit.md) for a plan change and [Consequential action](consequential-action.md) for a downgrade that removes access.

## Inputs and ownership

Supply the plans (prices in minor units, per period and unit), the current plan and period, usage per quota with its limit and the thresholds where it is near or over, usage history, an estimate of the next bill and how it's computed, a proration preview from the billing service for any proposed change, the losses a downgrade would cause (seats over the new limit, features in use), the payment status, and the invoices. The application and its billing provider own prices, proration, tax, entitlements and payment retries. Never compute a charge in the interface that the service hasn't quoted.

## States and transitions

**Usage is a reading, not a task under way.** Each quota is a `Meter`: flat ink in a flush track, a notch at the threshold, and the state said in words ("8 of 10", "Near limit", "Over limit"). Never draw a quota as `Progress`, which means work moving toward completion. History is a `BarChart` whose remaining cycle is `status="projected"`, hatched and said ("Projected"), never raised. The estimate is a `Stat` whose help text says how it's computed and when it updates.

**Change plan**: choose in `PlanPicker` (the current plan is a "Current plan" plate and the recommended plan a "Recommended" plate, never extra height), then review: the heading names the change ("Upgrade to Business?") and takes focus, and the proration is a sentence ("You'll pay €84 today for the rest of this cycle, then €480/month"). Confirming is pending until the service confirms; only then does the page say "You're on Business". Changing the period is the same flow. A **downgrade that removes access** is consequential: its review lists what will be lost and when, and its button is a danger one named by the outcome ("Downgrade to Free"). Reviewing with no change says why it can't proceed.

A **locked feature** uses `FeatureGate`: the control stays live with the plan it needs as a plate, and activating it explains and offers the upgrade (or "Ask an admin" when this person can't). A **failed payment** is a page banner (`Alert placement="page" variant="raised" tone="critical"`) that says what failed, by when to act, and offers to update the payment method; if access becomes restricted, app mode makes the page read-only and says why. **Invoices** are a `Table` whose amounts use `FormattedNumber` currency.

## Content, keyboard, focus and announcements

Prices and limits are always words as well as numbers ("€20 per seat per month"). The review moves focus to its heading; completion moves focus to the result heading; the change's progress is announced politely in one status region. Plans are a radio group with arrow-key movement; the period switch is a segmented control. Tables scroll horizontally on narrow screens. Verify forced colors (meter notches, hatched projections and plan plates stay visible), reduced motion, zoom and RTL; meaning never depends on colour alone.

## Recovery and working implementation

A failed plan change says nothing was charged and offers to try again, keeping the chosen plan. A failed payment banner stays until the payment method is updated. The working example in `build/fixtures/patterns/billing.jsx` (shipped as `references/build/fixtures/patterns/billing.jsx`) composes quotas, a projected usage chart, an explained estimate, an upgrade and a downgrade with losses, a locked feature, a failed payment banner and invoices. It is also the Storybook preview "Patterns/BillingPattern". [Metadata](billing.json) names the runtime and verification sources.

## Rules, verification and evidence

`ALT-BILLING-001` covers readings, reviewed changes and stated losses; `ALT-REVIEW-001` covers the review and receipt; `ALT-ACTION-001` covers the downgrade; `ALT-VISUAL-003` covers what must not rise (the current and recommended plan, the projection). `build/checks/billing-pattern.mjs` checks the example in a browser. WCAG 2.2's error prevention for financial transactions applies to the confirmation. See [rules](../rules.json). Whether people read proration sentences correctly still needs evaluation with representative users.

See [running examples and verification](../principles.md#run-the-examples-and-verification) for the installed example command, repository test command, and the limits of shipped test-reference snapshots.
