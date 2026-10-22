# ScrollArea

A scrolling region whose edges show where content continues, so it never looks finished when it isn't.

When content continues above or below, that edge gets an inner lip (`lip-top`, `lip-bottom`), as if the content curves away under the rim. With a `header`, the header sits flush at the top and rises to `elev-2` as soon as content scrolls beneath it, then settles back when you return to the top. Both counter the illusion of completeness: people stop scrolling when a region looks complete.

**You provide:** children, `maxHeight` (px or any CSS length), an optional `header`, and an `aria-label` (the body is keyboard-focusable so it can be scrolled with arrow keys).
