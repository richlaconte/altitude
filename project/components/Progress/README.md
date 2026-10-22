# Progress

Shows how far along a task is: a raised fill rising out of a trench.

Determinate progress glides between values on `ease-glide` (`dur-travel-3`). Without a `value` it's indeterminate: a third-width fill travels across the track every `dur-sweep`, and stops under reduced motion.

**You provide:** `value` (0–`max`) or nothing, and an `aria-label` or a visible label nearby.

- Do switch from indeterminate to determinate as soon as you know the total.
