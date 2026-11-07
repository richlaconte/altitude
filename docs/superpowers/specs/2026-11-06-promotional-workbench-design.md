# Promotional workbench

The user approved a new homepage centered on an interactive workbench, using both previous homepage versions as references. They explicitly requested implementation in a dedicated worktree.

## Visitor and page

A React developer should understand what Altitude offers, try its actual controls, explore a complete example, and install it. The primary page action is Get started. The lead is a generous, full-width product scene below “Give your app some depth.” and “React components and guidance for your coding agent.”

The workbench switches between Plan a project, Edit a note, and Review a change in one fictional Fieldwork Studio workspace. Each scene has one short contextual instruction, working interactions, and a clear sample-data/local-demo disclosure. Scene switching preserves work. Reuse shipped Board, InlineEdit, proposal/review primitives, Tabs, Button, and other existing components; do not recreate their appearance or behavior.

Below the workbench, show three real example-app previews with short captions and working links, then compact installation and coding-agent setup. Retain access to all example apps, components, the design guide, research, GitHub, npm, and the agent demonstration. Target 150–250 editorial words, excluding code and sample application content. No testimonial or usability claims.

## Interaction and elevation

| Part/state | Tier / level | Surface and shadow | Other signal |
| --- | --- | --- | --- |
| Page, scene frame, captions, accepted content | Ground / 0 | surface-ground, elev-0 | Text, headings, line borders |
| Cards and secondary actions | Raised / 1 | Component-owned surface-raised, elev-1 | Button/card semantics and labels |
| Primary page action | Raised / 2 | Component-owned accent, elev-2 | Get started label |
| Carried board card | Floating / 3 | Board component-owned surface-floating, elev-3 | Keyboard instructions and announcements |
| Editable field | Sunk / -1 | InlineEdit-owned surface-well, well | Visible label and editable control |
| Dispatched simulated write | Raised / pending | Component-owned pending treatment | Saving/Moving status and aria-busy |
| Rejected simulated save | Sunk / -2 | Component-owned critical-soft, trench | Error and retry preserving the draft |

The demos are browser-local simulations. No real writes, approvals, or agent calls occur. Failed writes retain drafts; stale or duplicate interactions must not overwrite newer work. Reset is local and predictable. Nothing animates perpetually. Honor reduced motion, forced colors, keyboard operation, and both color schemes. At 320px the page must not scroll horizontally; controls remain usable without dragging or hover.

## Scope

Work only in the dedicated feat/promotional-workbench worktree based on origin/main. Preserve the shared agent page's styling and existing example/guidance build. No component API changes, package release, merge, or public deployment is needed for this implementation.
