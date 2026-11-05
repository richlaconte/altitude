# Altitude framework

Start from the person's task. Read only the relevant pattern below, its linked rules, and the public declarations. The installed copy matches the package version; `altitude doctor --json` checks that connection. Guidance supports judgment; it does not certify an application.

Every screen also follows the visual rules. Read the [design guide](../README.md) before composing one, [Elevation](../Elevation.md) for what height means, [Charts](../Charts.md) before drawing any chart, stat or meter, and [Motion](../Motion.md) before animating. Set the recommended chart defaults once, on the provider: `<AltitudeProvider charts={{ yLabels: 'inline', directLabels: 'auto' }}>`. Each component has its own guide (what it's for, how it uses height, what you provide); read it before using the component: for example [Button](../components/Button/README.md) or [Select](../components/Select/README.md). The `components` list in `index.json` has every component with its group, a one-line summary and its guide.

Composing a new screen? Choose its frame from the task with [screen layout](patterns/screen-layout.md) first: name the task, the one thing that leads and the one primary action. The [app skeleton](app-skeleton.md) is one of its frames, for working through many similar records: shell, page header, a filtered and paged table, a record in a sheet, and settings, composed correctly.

| Intent | Focused contract |
| --- | --- |
| Edit a record | [Edit record](patterns/edit-record.md) |
| Search, filter or browse records | [Async collection](patterns/async-collection.md) |
| Delete, revoke, publish or recover | [Consequential action](patterns/consequential-action.md) |
| Review answers and finish a process | [Review and submit](patterns/review-submit.md) |
| A settings page: apply now, save together, danger zone | [Settings](patterns/settings.md) |
| Invite people, change roles, remove access | [Members](patterns/members.md) |
| Usage, plan changes, invoices | [Billing](patterns/billing.md) |
| Sign in, sign up, two-factor, reset | [Auth](patterns/auth.md) |
| An audit log or a record's activity | [Audit log](patterns/audit-log.md) |
| Import records from a CSV file | [Import](patterns/import.md) |
| Autosave, offline, conflicts, session expiry | [Sync](patterns/sync.md) |
| API keys, webhooks, integrations | [Developer settings](patterns/developer-settings.md) |
| An agent that proposes and acts | [Agent action](patterns/agent-action.md) |
| A conversation with an assistant (send, stream, stop, retry, limits) | [Assistant conversation](patterns/assistant-conversation.md) |
| Setup checklist, empty states, tours, what's new | [Onboarding](patterns/onboarding.md) |
| A new screen: choose its frame (editor, decision, report, triage, flow, records) from the task | [Screen layout](patterns/screen-layout.md) |

Worked examples: [complete example apps](https://richlaconte.github.io/altitude/#examples) put several of these patterns together in one fictional product (an admin console, a planning board, a booking flow), on a simulated server you can make slow, fail, lose a response or conflict. They show how the contracts compose. They aren't templates to copy, and a save that lands there proves nothing about a real server.

Before implementation, capture a short design record in the application's normal documentation: user goal, audience, primary action, consequence, data shape, selected patterns, applicable states, and unresolved product decisions. Infer routine details from the existing product. Do not invent permissions, persistence, cancellation, rollback or undo. Ask only when an unknown changes consequences or the task itself.

Use `altitude patterns "edit settings" --json` to discover contracts and `altitude explain ALT-EDIT-001` for a rule's scope and evidence. Read [principles](principles.md) for ownership and [evidence.json](evidence.json) for source authority. The generated `index.json` and `llms.txt` route to these same sources; they are not separately authored manuals.

Compose existing primitives and small workflow hooks from the main `altitude-design` export inside one `AltitudeProvider`. Import a package stylesheet. The application supplies routes, business validation and services. Verify delayed operations, rejection, retry, cancellation and stale responses where applicable; include keyboard and manual assistive-technology review. Automated checks cannot establish complete accessibility or task suitability.

After changing UI, run `npm exec -- altitude check` (or `altitude check src --json`). It reports Altitude's rules that are certain from source text as errors (hard-coded colours instead of tokens, a missing stylesheet or `AltitudeProvider`, pie and donut charts, buttons labelled OK or Submit) and likely problems for review (several primary buttons in one file, elevation overrides on controls). Fix the errors; decide on the reviews. Each finding names a rule `altitude explain` describes. It doesn't check anything that needs the page rendered or a person.

For explicit agent setup, preview `npm exec -- altitude init --client codex` (or `claude`), then use `--apply`. Full setup and removal instructions are shipped as `agent-setup.md`, generated from the repository’s `docs/framework/AGENT-SETUP.md`. No installation hook writes project instructions.
