# Notes for agents

Altitude is a React component library where height is the interface: the ground is the record. Before you change or propose anything, read the [README](README.md) (how the repository is laid out, and its one-source-per-thing rule), then [`project/README.md`](project/README.md) and [Elevation](project/Elevation.md).

## You can file issues

You may open issues on this repository for:

- **a new component** Altitude doesn't have;
- **new functionality** for an existing component (a prop, a variant, a behaviour);
- **a bug**: something that renders, moves, announces or builds wrong.

File them when the person you're working for asks you to, or when you find a bug or a missing capability while working on or with Altitude and they agree it's worth recording. The structure and the bar for each kind are in [CONTRIBUTING.md](CONTRIBUTING.md) ("Issues"); the skeletons are the templates in [`.github/ISSUE_TEMPLATE/`](.github/ISSUE_TEMPLATE/). Use them as written. Don't invent your own headings.

## How to file one

1. **Search for duplicates.** `gh issue list --state all --search "<Component> <keywords>"`. If one exists, comment on it with anything new instead of opening another.
2. **Check it against `main`.** For a bug, reproduce it on the current `main` (or the latest published `altitude-design`) before filing, and note the version or commit you used. For a feature, check the component's README and `index.d.ts`: it may already exist under another name.
3. **Fill in the template.** Copy the body of the template (everything after the front matter) into a file, fill every section, and delete the HTML comments and any optional section you left empty. Don't leave placeholder text.
4. **Use the title and label from the template.** `New: <Name> — <what it's for>` with `enhancement`; `<Component>: <what it should do>` with `enhancement`; `<Component>: <what goes wrong>` with `bug`.
5. **Create it.**

   ```sh
   gh issue create --title "Select: restore the previous value on Escape" --label bug --body-file issue.md
   ```

6. **Say an agent wrote it.** End the body with one line: `Filed by an agent (<model or tool>) on behalf of @<person>.` If nobody asked you to file it, say what you were doing when you found it.

## What to put in, and what not to

- **One thing per issue.** Several bugs are several issues; cross-link them.
- **Facts you checked, marked as such.** Separate what you observed from what you suspect. If you ran `shoot.mjs` or an `ACT` check, include the command so a maintainer can rerun it. If you couldn't run something (no browser, no network), say so rather than guessing the result.
- **Evidence over description.** Screenshots from `shoot.mjs` (`DPR=2`), and page and console errors trimmed to the relevant lines. Don't paste whole logs, whole files or whole diffs.
- **Elevation in Altitude's terms.** For a new component or a visual change, fill the elevation table: tier, level, surface and shadow for each part and state, and the word, icon, ARIA state or border that carries the same meaning without height. Use the token names from `project/tokens.json`; don't invent tokens or colours.
- **No secrets.** No tokens, keys, private URLs or customer data, including in screenshots and stack traces.

## What an issue doesn't authorise

Filing an issue is not permission to implement it. Don't open a pull request for a new component or an API change until it's been agreed in the issue, unless the person you're working for asked you to. Don't add or edit labels beyond the one the template sets, assign people, or close other people's issues.
