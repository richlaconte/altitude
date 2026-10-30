# CommentThread

Comments on a task, a document, a design or a deal: write with @mentions, post, retry a failed post, delete your own, and resolve the thread.

**Elevation.**
- **Posted comments are the record**, flush on the ground, each with its author, `RelativeTime` and body. Mentions are flush `accent-soft` plates in the text.
- **The composer is an opening**, an `Input` well that fills as you write.
- **A comment being posted is a pending write**: it hovers ("Posting…") until it lands and settles. If it fails, it drops to a trench ("Couldn't post"), keeping its text, with Retry.
- **"Done is pressed into the record": a resolved thread is stamped.** It's muted and collapsed to one line ("Resolved by Maya"), kept in place rather than removed, like a done `Checklist` item, with Show comments and Reopen.
- **A deleted comment** leaves its result in its slot ("Comment deleted"), with Undo.
- **Someone typing** shows their `presence` colour and name. Other people, live, is where presence belongs.

**Mentions.** Type `@` and a name: a listbox (level 3) offers people from `mentionable(query)`. Arrows move, Enter or Tab chooses, and Escape closes the list. The body stays plain text with "@Name", and `onPost(body, mentions)` receives the people still mentioned in it.

**Accessibility.** Comments are articles in a list. The composer is a [combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) textarea while mentioning (`aria-activedescendant`). ⌘Enter or Ctrl+Enter posts. New comments from others are announced politely and batched ("2 new comments"). Typing indicators aren't announced. Under forced colours the composer is dashed, a pending comment dotted and a failed one dashed thick. Under reduced motion the typing dots don't pulse.

**Props:** `comments` (`{ id, author: { name, avatar? }, body, createdAt, status?, mentions?, mine?, deleted? }[]`); `resolved` (`{ by }` or false); `onPost`; `onResolve`; `onReopen`; `onRetry`; `onDelete`; `onUndoDelete`; `mentionable`; `typing` (names); `aria-label`.

**You provide:** the comments and their states (your app adds a pending comment when it posts, and marks it failed or posted), and who can be mentioned. Rich text is out of scope; a rich editor plugs in through the editor adapter.

```tsx
<CommentThread comments={comments} resolved={thread.resolved}
  onPost={(body, mentions) => post(body, mentions)} onResolve={resolve} onReopen={reopen}
  mentionable={(q) => searchPeople(q)} typing={othersTyping} />
```

- Do keep a failed comment's text where it was.
- Do keep a resolved thread in place, stamped.
- Don't announce typing.
- Don't post on Enter alone; people write several lines.
