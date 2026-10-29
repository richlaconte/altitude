# FeatureGate

A feature that needs another plan, shown to people on a plan that doesn't include it: "Export to CSV · Business", "SAML SSO · Enterprise", a menu item with a lock.

**Elevation: locked, not disabled.** Disabled means "nothing happens": flush, `ink-faint`, skipped by the keyboard and often by screen readers. Then the people who rely on those never learn the feature exists, and `ink-faint` fails contrast. **A locked control does something**: it explains the plan and offers the upgrade. So it stays live:
- it keeps the wrapped control's own build and normal ink;
- **it lifts when pointed at** (hover is a promise);
- it carries a lock and a flush `Badge` plate naming the plan.

Pressing it opens a `Popover` (level 3): "Available on Business", what the plan adds, and "Upgrade to Business" as the popover's one primary action, with "Compare plans" if you give `compareHref`. When this person can't upgrade (`canUpgrade={false}`, not an admin), the button becomes "Ask an admin to upgrade to Business."

**Accessibility.** The control stays a button with `aria-haspopup="dialog"`. **It's never `aria-disabled`.** Its name includes the requirement ("Export to CSV, requires Business plan"). It's reachable and activatable by keyboard, Escape closes the explanation, and focus returns to the control. The wrapped control's `onClick` and `disabled` are dropped: what it does while locked is explain.

**Props:** `requires`; `description`; `onUpgrade`; `compareHref`; `canUpgrade` (default true); `children` (one control).

**You provide:** the control, the plan it needs, what the plan adds, and where upgrading goes.

```tsx
<FeatureGate requires="Business" onUpgrade={() => openBilling('business')}
  description="Export any view to CSV and schedule exports by email.">
  <Button variant="secondary">Export to CSV</Button>
</FeatureGate>
```

- Do keep locked features visible, so people know they exist.
- Do say what the plan adds, not just its name.
- Don't use `disabled` for a feature that needs another plan.
- Don't hide the upgrade from people who can't buy it; tell them who can.
