# Tabs

Switches between views of the same content.

**`variant="folder"` (default): the sheet on top is the one you're reading.** Every tab is the top edge of its own sheet. The chosen tab and its panel are one raised piece (`surface-raised`, `elev-2`) with concave fillets where they meet; the other tabs lie flush on the ground behind it. Choosing a tab brings its sheet up from behind: its tab rises 10px into place on `ease-settle` while the old tab drops back, and the panel's shadow swells from `elev-1` as the new sheet surfaces, its content emerging 3px below. Hovering an unchosen tab peeks its sheet up a little: a ghost of the tab, before you commit.

**`variant="segmented"`:** a compact control for ranges and modes. The options sit in a well and one raised pill glides between them on `ease-settle`; hovering an option shows a faint ghost of the pill.

Arrow keys, Home and End move between tabs in both.

**You provide:** `Tabs` with `value`/`onValueChange` or `defaultValue` and optionally `variant`; a `TabsList` (with an `aria-label`) of `TabsTrigger value="…"`; one `TabsContent value="…"` per trigger. In the folder variant put the `TabsContent`s directly after the `TabsList`: together they're one folder.

- Keep labels to one or two words.
- Don't use tabs for sequential steps; they imply the views are peers.
