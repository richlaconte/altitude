# DropZone

A receptacle that opens only when there's something to receive: flush at rest, sunk while a file is in flight, deeper under the pointer.

At rest it's a dashed outline on the ground. As soon as files are dragged anywhere over the page it sinks into a well (armed), so every place that can take the file announces itself. Hovering it deepens it to a trench with an `accent-ink` rim and `accent-soft` fill (over). Dropped files settle in with an afterglow. Clicking, Enter or Space opens the file picker.

**You provide:** `onFiles`, optional `accept` and `multiple`, the zone's content (an icon and "Drop files or browse"). `state` forces a visual state for documentation.

- Don't leave drop zones armed when nothing is being dragged; an always-open well stops meaning anything.

## The queue

Pass `queue` and each file you're handling is a slat under the zone, named by its file and size:

- **uploading** is a task, so a `Progress` fill rises out of its trench ("Uploading, 40%"), with Cancel;
- **processing** is a write the server hasn't confirmed, so the slat **hovers as pending** ("Processing"), with Cancel;
- **done** lands and settles with the afterglow ("Uploaded"), with Remove;
- **failed** drops to a trench with its reason and **Retry**, and Remove.

`UploadItem` is `{ id, name, size?, state, progress?, error? }`. `onRetry`, `onCancel` and `onRemove` get the id, and their buttons name the file ("Retry upload of report.pdf"). Progress is announced at 25, 50, 75 and 100%, and on processing, finishing and failing, never continuously. Afterglows start at most four at once.

