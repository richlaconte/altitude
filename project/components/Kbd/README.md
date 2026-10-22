# Kbd

Shows a keyboard key as a keycap: a tiny slab with a 2px wall that presses down when the person presses that key.

Keys sit at level 1 in the mono family with `wall-1` under them. With `listen`, the cap drops to the ground (wall gone) while the matching key (a `KeyboardEvent.key`, case-insensitive) is held: a small confirmation that a shortcut registered.

**You provide:** the key's glyph as children (one `Kbd` per key: `<Kbd>⌘</Kbd><Kbd>K</Kbd>`), and `listen` when the shortcut is live on this page.
