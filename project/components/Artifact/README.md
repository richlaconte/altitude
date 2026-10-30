# Artifact

What an agent is making (a document, a component, a page, a chart, a config) in its own pane beside the conversation, with its versions. Claude's artifacts, ChatGPT's canvas and v0's preview work this way: the latest version as it's written, preview and source, earlier versions to go back to, what changed.

**Elevation: the current version is the record.**
- **The pane** lies on the ground beside the conversation (put it in a `ResizablePanel`), named by its title.
- **Being written** isn't the record yet: a dashed `line-control` rule at the pane's edge and "Writing… version 3" (`aria-busy`).
- **Complete**: the rule goes solid with one afterglow, and "Version 3" (announced once: "Pricing page, version 3, complete").
- **Failed**: a critical rule, "Couldn't finish version 3" and Retry; keep the last whole version on show.
- **Viewing an earlier version** is a mode, and a mode isn't a height: a flush strip across the top with a `line-control` border, "Viewing version 1 of 3", Return to latest and Restore this version.
- **Header tools** are ghost buttons named for the artifact. **Preview / Source / Changes** is segmented `Tabs`.
- **The reference** in a message is a plate that acts, lifting one level when pointed at.

**Accessibility.** A region named by its title. The reference is a button with `aria-controls` on the pane: it opens the pane and moves focus to the pane's heading, and Escape in the pane goes back to it. Give an iframe preview a `title`, and keep the source view as its alternative. Writing isn't announced again and again; completion is said once.

**Parts:** `Artifact` (`title`, `status`: `'writing' | 'complete' | 'failed'`, `version`, `onRetry`, `id`); `ArtifactHeader` (`onCopy`, `onDownload`, `onOpen`, `onClose`, extra tools as children); `ArtifactVersions` (`versions`, `current`, `onChange`, `onRestore`); `ArtifactContent` (`views`: `{ preview?, source?, changes? }`, `defaultView`); `ArtifactReference` (`title`, `version`, `status`, `controls`, `onOpen`).

**You provide:** the versions and their content (a sandboxed iframe for previews, `CodeBlock` for source, `DiffView` for changes), and where the pane sits. On a phone, a `ResizablePanelGroup` with `narrow="stack"` shows the conversation or the pane, one at a time; set `narrowPanel` to the pane when it opens.

```tsx
<Artifact id="pricing" title="Pricing page" status={a.status} version={a.versions.length} onRetry={retry}>
  <ArtifactHeader onCopy onDownload={download} onClose={close} />
  <ArtifactVersions versions={a.versions.length} current={v} onChange={setV} onRestore={restore} />
  <ArtifactContent views={{ preview: <iframe sandbox="allow-scripts" srcDoc={html} title="Pricing page preview" />, source: <CodeBlock language="tsx" code={code} /> }} />
</Artifact>
```

- Do sandbox preview iframes; the frame's permissions are yours.
- Do keep the last whole version visible when a new one fails.
- Don't lift the pane or tint it for an earlier version; say it in the strip.
