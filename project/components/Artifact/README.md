# Artifact

What an agent is making (a document, a component, a page, a chart, a config) in its own pane beside the conversation, with its versions. Claude's artifacts, ChatGPT's canvas and v0's preview work this way: the latest version as it's written, preview and source, earlier versions to go back to, what changed.

**Elevation: the current version is the record.**
- **The pane** lies on the ground beside the conversation (put it in a `ResizablePanel`), named by its title.
- **Being written** isn't the record yet: a dashed `line-control` rule at the pane's edge and "Writing… version 3" (`aria-busy`).
- **Complete**: the rule goes solid with one afterglow, and "Version 3" (announced once: "Pricing page, version 3, complete").
- **Failed**: "Couldn't finish version 3" with a critical mark and Retry; keep the last whole version on show. The edge stays solid and neutral: a coloured stripe is a tell of generated interfaces (Distinctiveness, CM3), and the words already say it.
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

<!-- example: generated from build/previews.txt by build/previews.mjs. Edit the preview, not this section. -->
## Example

`Artifact` as first used in its preview:

```tsx
import { Artifact, ArtifactContent, ArtifactHeader, ArtifactVersions, CodeBlock, DiffView } from 'altitude-design';

<Artifact id="pricing-artifact" title="Pricing page" status={status} version={3}>
  <ArtifactHeader onCopy={() => versions[v - 1].code} onDownload={() => {}} onClose={() => setOpen(false)} />
  <ArtifactVersions versions={3} current={v} onChange={setV} onRestore={() => setV(3)} />
  <ArtifactContent views={{
    preview: <iframe sandbox="" srcDoc={html(v)} title={`Pricing page preview, version ${v}`} />,
    source: <CodeBlock language="tsx" code={versions[v - 1].code} streaming={status === 'writing' && v === 3} />,
    changes: v > 1 ? <DiffView caption={`Version ${v - 1} → ${v}`} before={versions[v - 2].code} after={versions[v - 1].code} /> : undefined,
  }} />
</Artifact>
```

The full preview, as rendered in Storybook and checked in CI (`af`, `chat` are the preview page's own layout classes, not Altitude's):

```tsx
import * as React from 'react';
import { Artifact, ArtifactContent, ArtifactHeader, ArtifactReference, ArtifactVersions, CodeBlock, DiffView, Message, MessageContent, ResizableHandle, ResizablePanel, ResizablePanelGroup } from 'altitude-design';

const versions = [
  { code: `export function Pricing() {\n  return <h1>Pricing</h1>;\n}` },
  { code: `export function Pricing() {\n  return (\n    <section>\n      <h1>Pricing</h1>\n      <p>Start free, upgrade when you grow.</p>\n    </section>\n  );\n}` },
  { code: `export function Pricing() {\n  return (\n    <section>\n      <h1>Pricing</h1>\n      <p>Start free, upgrade when you grow.</p>\n      <Plans tiers={['Starter', 'Pro', 'Business']} />\n    </section>\n  );\n}` },
];
const html = (v) => `<body style="font:15px system-ui;margin:24px;color:#1b2230"><h1 style="font-size:22px">Pricing</h1>${v >= 2 ? '<p>Start free, upgrade when you grow.</p>' : ''}${v >= 3 ? '<div style="display:flex;gap:8px">' + ['Starter', 'Pro', 'Business'].map((t) => `<div style="flex:1;padding:12px;border:1px solid #d5dae3;border-radius:8px">${t}</div>`).join('') + '</div>' : ''}</body>`;
export default function App() {
  const [open, setOpen] = React.useState(true);
  const [status, setStatus] = React.useState('writing');
  const [v, setV] = React.useState(3);
  React.useEffect(() => { const t = setTimeout(() => setStatus('complete'), 2500); return () => clearTimeout(t); }, []);
  return (
    <div className="af">
      <ResizablePanelGroup direction="horizontal" narrow="stack" narrowPanel={open ? 1 : 0}>
        <ResizablePanel defaultSize={42} aria-label="Conversation">
          <div className="chat">
            <Message from="user"><MessageContent>Make a pricing page with three plans.</MessageContent></Message>
            <Message from="assistant">
              <MessageContent>Here's the page, with the three plans in a row.</MessageContent>
              <ArtifactReference title="Pricing page" version={3} status={status} controls="pricing-artifact" onOpen={() => setOpen(true)} />
            </Message>
          </div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={58} aria-label="Pricing page">
          {open && (
            <Artifact id="pricing-artifact" title="Pricing page" status={status} version={3}>
              <ArtifactHeader onCopy={() => versions[v - 1].code} onDownload={() => {}} onClose={() => setOpen(false)} />
              <ArtifactVersions versions={3} current={v} onChange={setV} onRestore={() => setV(3)} />
              <ArtifactContent views={{
                preview: <iframe sandbox="" srcDoc={html(v)} title={`Pricing page preview, version ${v}`} />,
                source: <CodeBlock language="tsx" code={versions[v - 1].code} streaming={status === 'writing' && v === 3} />,
                changes: v > 1 ? <DiffView caption={`Version ${v - 1} → ${v}`} before={versions[v - 2].code} after={versions[v - 1].code} /> : undefined,
              }} />
            </Artifact>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
```
<!-- /example -->
