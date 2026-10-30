# Notes for agents

Altitude is a design and HCI framework for React applications where height is the interface: the ground is the record. Before you change or propose anything, read the [README](README.md) (how the repository is laid out, and its one-source-per-thing rule), then [`project/README.md`](project/README.md) and [Elevation](project/Elevation.md). Before proposing or building a chart, graph, stat or meter, also read [Charts](project/Charts.md): in a chart, height is never allowed to carry the data.

## How work is organised

Milestones are goals, `P1`–`P3` are priority, and `ready` / `needs-design` say whether anyone may start. Sub-issues and "blocked by" links give structure and order. A linked draft pull request is the claim. All of it is readable with `gh` and plain `repo` access; the [project board](https://github.com/users/richlaconte/projects/1) is only a view, and its Status follows the pull requests by itself. The full table and lifecycle are in [CONTRIBUTING.md](CONTRIBUTING.md) ("How work is organised").

## Picking up an issue

1. **Only `ready` issues.** Don't implement anything labelled `needs-design` or untriaged, unless the person you're working for asks you to. You may comment design input on it.
2. **Find one that's free.** `gh issue list --search "is:open label:ready no:assignee -is:blocked" --label P1` (then `P2`, `P3`, or `--milestone "<name>"`). Then check that nobody has a pull request for it: `gh pr list --state open --search "<number>"`.
3. **Read all of it.** Read the body (the agreed spec), the comments, the issues it links, and the research its milestone links. If the body and the comments disagree, ask rather than guess.
4. **Claim it before you build.** Branch from `main` (`feat/`, `fix/`, `docs/` or `chore/` plus a short slug), push, and open a draft pull request with `Fixes #<number>` in the body. If another pull request appears for the same issue first, stop and tell the person you're working for.
5. **Keep to one pull request.** If the issue turns out to need several, stop and propose sub-issues in a comment. Don't widen the pull request. If you find something else broken, file it separately (see below) rather than fixing it here.
6. **Finish it.** Tick the "Done when" list, run the checks it names, and mark the pull request ready for review.

## You can file issues

You may open issues on this repository for:

- **a new component** Altitude doesn't have;
- **new functionality** for an existing component (a prop, a variant, a behaviour);
- **a bug**: something that renders, moves, announces or builds wrong.

File them when the person you're working for asks you to, or when you find a bug or a missing capability while working on or with Altitude and they agree it's worth recording. The structure and the bar for each kind are in [CONTRIBUTING.md](CONTRIBUTING.md) ("Issues"); the skeletons are the templates in [`.github/ISSUE_TEMPLATE/`](.github/ISSUE_TEMPLATE/). Use them as written. Don't invent your own headings.

## If you're using the package, not working in this repository

You won't have `build/`, the checks or these docs in `node_modules`, and you don't need them. Reproduce the problem with the public API only, note the installed version from `node_modules/altitude-design/package.json`, pass `--repo richlaconte/altitude` to every `gh` command below, and skip anything that says to run `shoot.mjs` or check against `main`. The person you're working for owns the decision to file: if they haven't agreed, give them the drafted issue and https://github.com/richlaconte/altitude/issues/new/choose instead.

## How to file one

1. **Search for duplicates.** `gh issue list --state all --search "<Component> <keywords>"`. If one exists, comment on it with anything new instead of opening another.
2. **Check it against `main`.** For a bug, reproduce it on the current `main` (or the latest published `altitude-design`) before filing, and note the version or commit you used. For a feature, check the component's README and `index.d.ts`: it may already exist under another name.
3. **Fill in the template.** Copy the body of the template (everything after the front matter) into a file, fill every section, and delete the HTML comments and any optional section you left empty. Don't leave placeholder text.
4. **Use the title and labels from the template.** `New: <Name> — <what it's for>` with `enhancement,needs-design`; `<Component>: <what it should do>` with `enhancement,needs-design`; `<Component>: <what goes wrong>` with `bug`.
5. **Create it.**

   ```sh
   gh issue create --title "Select: restore the previous value on Escape" --label bug --body-file issue.md
   ```

6. **Link it.** If it's part of an umbrella issue, add it as a sub-issue; if it can't start until another issue lands, add that as "blocked by". Both calls take the REST `id` (`gh api repos/{owner}/{repo}/issues/<n> --jq .id`), not the number:

   ```sh
   gh api -X POST repos/{owner}/{repo}/issues/<parent>/sub_issues -F sub_issue_id=<id of the new issue>
   gh api -X POST repos/{owner}/{repo}/issues/<new>/dependencies/blocked_by -F issue_id=<id of the blocker>
   ```

7. **Say an agent wrote it.** End the body with one line: `Filed by an agent (<model or tool>) on behalf of @<person>.` If nobody asked you to file it, say what you were doing when you found it.

## What to put in, and what not to

- **One thing per issue.** Several bugs are several issues; cross-link them.
- **Facts you checked, marked as such.** Separate what you observed from what you suspect. If you ran `shoot.mjs` or an `ACT` check, include the command so a maintainer can rerun it. If you couldn't run something (no browser, no network), say so rather than guessing the result.
- **Evidence over description.** Screenshots from `shoot.mjs` (`DPR=2`), and page and console errors trimmed to the relevant lines. Don't paste whole logs, whole files or whole diffs.
- **Elevation in Altitude's terms.** For a new component or a visual change, fill the elevation table: tier, level, surface and shadow for each part and state, and the word, icon, ARIA state or border that carries the same meaning without height. Use the token names from `project/tokens.json`; don't invent tokens or colours.
- **No secrets.** No tokens, keys, private URLs or customer data, including in screenshots and stack traces.

## What an issue doesn't authorise

Filing an issue is not permission to implement it. Don't open a pull request for a new component or an API change until it's been agreed in the issue, unless the person you're working for asked you to. Don't add or edit labels beyond the ones the template sets, set milestones or priorities, add `ready`, assign people, or close other people's issues. That's triage, and the maintainer does it, unless the person you're working for is the maintainer and asks you to.

## Building product workflows with Altitude

For consumer design work, start with the installed `altitude-design/guidance` index and focused pattern document. Explicit `altitude init --client codex|claude` setup connects project-level client instructions; an `AGENTS.md` buried in node_modules is not assumed discoverable. In this repository, the canonical entry is [project/framework/README.md](project/framework/README.md).

Infer an appropriate pattern from product intent. Record material assumptions, applicable states and application responsibilities; ask only for missing facts that materially change the task or consequences. Follow-up edits must preserve the relevant contracts and adverse-state checks. Distinguish deterministic failures, integration obligations and contextual review findings. Never claim a timer proves server persistence or an automated scan proves complete accessibility.

Maintainers: author prose/metadata in `project/framework`, behavior in `project/components/src`, and previews in `build/previews.txt`. Generate distributed guidance after package cleanup; do not edit copies in `dist`. Add schema/reference/freshness and installed-consumer checks for new guidance. Keep the Node CLI and documentation out of the browser graph. Preserve a single provider instance and the elevation rules above.
