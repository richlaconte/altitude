# Toaster

Confirms what just happened, in a depth stack: the newest toast floats in front at level 4 and older ones sink behind it.

Call `toast()` from anywhere; render `Toaster` once inside `AltitudeProvider`. A new toast rises 24px into the front while the others each step back: 10px up, 5% smaller, more transparent and one shadow level lower, with their text hidden. Hovering or focusing the stack fans it out to full height and pauses every timer. Dismissed toasts sink and fade. `critical` toasts use `role="alert"`.

**You provide:** `toast({ title, description?, tone?, duration?, action? })` or just `toast('Changes saved')`. `duration` defaults to 5000ms; 0 keeps it until dismissed. Returns an id for `toast.dismiss(id)`.

- Do write the title as the outcome in past tense: "Domain verified".
- Don't use toasts for errors the person must fix in place; show those in the form with Field.
