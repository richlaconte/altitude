<!--
title: New: Artifact — what an agent is making, beside the conversation, with its versions
label: enhancement
template: .github/ISSUE_TEMPLATE/new-component.md
-->

## What it's for

When an agent makes something substantial (a document, a component, a page, a chart, a config), harnesses show it in its own pane beside the conversation rather than inline: Claude's artifacts, ChatGPT's canvas, v0's preview, AI Elements' `Artifact` and `WebPreview`. The pane shows the latest version as it's written, switches between preview and source, lets you go back to an earlier version, compare with the previous one, and copy, download or open it. Today an app has to assemble this from `ResizablePanelGroup`, `Tabs`, `CodeBlock` and `DiffView`, and decide alone what a version being written looks like.

**Closest existing components:** `ResizablePanelGroup` (the pane), `Sheet` (the pane when narrow), `CodeBlock` (source, streaming), `DiffView` (compare), `MessageActions versions` (versions that aren't overwritten).
**Name:** `Artifact`, `ArtifactHeader`, `ArtifactContent`, `ArtifactVersions`, `ArtifactReference` (the plate in a message that opens it).

## Elevation story

**What it is:** settled (the current version is the record), with a "being written" state
**Signal it carries:** "Streaming" ("not yet the record") while written; "Panes beside each other" for the layout; a new reading for viewing an earlier version
**Relatives it borrows from:** the pane is a `ResizablePanel` on the ground; source is `CodeBlock`; Preview/Source is segmented `Tabs`; compare is `DiffView`; the in-message reference is a plate that acts, like `InlineCitation`.

| Part / state | Tier | Level | Surface · shadow | Non-height cue (word, icon, ARIA state or border) |
|---|---|---|---|---|
| Pane | Ground | 0 | `surface-ground`, 1px `line` from the conversation | region named by the artifact's title |
| Header tools (copy, download, open, close) | Ground → +1 on hover | 0 | ghost `Toolbar` | each named |
| Preview / Source / Changes switch | as `Tabs` segmented | — | `Tabs` | `aria-selected` |
| Being written | Ground | 0 | dashed `line-control` rule at the pane's edge | "Writing… version 3", `aria-busy` |
| Complete | Ground | 0 | solid rule; one afterglow (`dur-settle`) | "Version 3 · now" |
| Failed | Ground | 0 | `critical` rule | "Couldn't finish version 3", Retry; the last whole version stays available |
| Viewing an earlier version | Ground | 0 | a flush strip across the pane's top, 1px `line-control` border | "Viewing version 1 of 3 · Return to latest · Restore this version" |
| Preview (iframe) | Ground | 0 | 1px `line` rim | `title` on the frame |
| Reference in a message | Ground → +1 on hover | 0 | `Badge`-like plate | "Pricing page, version 3. Open" |
| Narrow screens | Floating | 4 | `Sheet` · `elev-4` | as `Sheet` |

Viewing an earlier version is a kind of mode for the pane (the record shown isn't the current one), and "A mode isn't a height" applies: a strip and words, not a lift.

## Motion

Completion is one afterglow, as `Message`. Opening the pane: the panel appears at its size (no slide) since panes lie on the ground; on narrow screens the `Sheet` rises at its edge. Switching versions cross-fades over `dur-travel-1`, nothing travels. Under reduced motion all are in place.

## Accessibility

**WAI-ARIA pattern:** a `region` landmark named by the title; [tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) for the view switch; the reference is a button with `aria-controls` on the pane.
**Keyboard:** the reference opens the pane and moves focus to its heading; Escape (in the pane) returns focus to the reference; the version picker is a `Select` or Previous/Next buttons ("Previous version").
**Screen reader:** "Writing version 3" is not announced repeatedly; completion is announced once ("Pricing page, version 3, complete"). The iframe preview has a title and the source view is always available as an alternative.
**Forced colours:** streaming rule dotted, complete solid (as `Message`); the earlier-version strip keeps its border.
**`contrast="more"`:** rules `line-control`.

## API sketch

```tsx
<ResizablePanelGroup direction="horizontal">
  <ResizablePanel><Conversation>…<ArtifactReference artifact={a} onOpen={open} />…</Conversation></ResizablePanel>
  <ResizableHandle />
  <ResizablePanel>
    <Artifact title="Pricing page" status={a.status /* 'writing' | 'complete' | 'failed' */} onRetry={retry}>
      <ArtifactHeader onCopy onDownload={download} onClose={close} />
      <ArtifactVersions versions={a.versions.length} current={v} onChange={setV} onRestore={restore} />
      <ArtifactContent views={{
        preview: <iframe sandbox="allow-scripts" srcDoc={a.versions[v].html} title="Pricing page preview" />,
        source: <CodeBlock language="tsx" code={a.versions[v].code} streaming={a.status === 'writing'} />,
        changes: <DiffView before={a.versions[v - 1]?.code} after={a.versions[v].code} />,
      }} />
    </Artifact>
  </ResizablePanel>
</ResizablePanelGroup>
```

## Done when

- [ ] Source in `project/components/src/`, exported from `index.tsx`, its name added to `names` in `build/build.mjs`, declarations in `index.d.ts`
- [ ] A `bundle.css` section with a header comment explaining its elevation model
- [ ] `project/components/Artifact/README.md` in the existing format (what it is, elevation, props, "You provide", do and don't)
- [ ] A section in `build/previews.txt` with an honest `@dsCard` group and subtitle
- [ ] A row in the signals table in `Elevation.md`; new choreography in `Motion.md`; sources and a prototype review in `Research.md`
- [ ] `tsc` clean; `shoot.mjs` renders it in all four schemes with no page or console errors; also checked with `FORCED=1`, reduced motion and `contrast="more"`
- [ ] Keyboard paths checked with `ACT`
- [ ] `node build.mjs && node previews.mjs` run and committed (CI fails otherwise)

## Open questions (optional)

- Is "viewing an earlier version" a pane-level use of `AltitudeProvider mode`, or its own strip? It should look the same either way.
- The preview iframe's sandboxing is the application's; should `Artifact` refuse an unsandboxed frame in `devChecks`?

Part of the agent harness research pass (`docs/research/agent-harness/`).
