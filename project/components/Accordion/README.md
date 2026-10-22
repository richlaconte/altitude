# Accordion

Reveals sections one at a time. Closed items are **lids** lying flush on the page; opening one lifts its lid into a raised card and opens the **compartment** underneath, where the content sits.

Closed rows sit on the ground divided by `line` hairlines. Hovering one raises a ghost of its lid (a faint raised tint with a hairline), so you can see what will open. Opening raises the item to level 2 (`surface-raised`, `elev-2`), opens a gap around it and hides the neighbouring dividers. Inside, the content sits in a compartment: an opening sunk into the lid (`surface-well`) with its back wall showing just below the rim, the same camera as an empty `Input`. The panel grows on `ease-glide`, the content emerges 60ms later, and the chevron turns on `ease-settle`. Closed panels are inert to keyboard and assistive tech.

**You provide:** `items` (`value`, `title`, `content`), `type` (`single` closes the others; `multiple` doesn't), `defaultValue` as an array of open values.
