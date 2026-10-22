# DropZone

A receptacle that opens only when there's something to receive: flush at rest, sunk while a file is in flight, deeper under the pointer.

At rest it's a dashed outline on the ground. As soon as files are dragged anywhere over the page it sinks into a well (armed), so every place that can take the file announces itself. Hovering it deepens it to a trench with an `accent-ink` rim and `accent-soft` fill (over). Dropped files settle in with an afterglow. Clicking, Enter or Space opens the file picker.

**You provide:** `onFiles`, optional `accept` and `multiple`, the zone's content (an icon and "Drop files or browse"). `state` forces a visual state for documentation.

- Don't leave drop zones armed when nothing is being dragged; an always-open well stops meaning anything.
