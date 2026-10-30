# Altitude framework

Start from the person's task. Read only the relevant pattern below, its linked rules, and the public declarations. The installed copy matches the package version; `altitude doctor --json` checks that connection. Guidance supports judgment; it does not certify an application.

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

Before implementation, capture a short design record in the application's normal documentation: user goal, audience, primary action, consequence, data shape, selected patterns, applicable states, and unresolved product decisions. Infer routine details from the existing product. Do not invent permissions, persistence, cancellation, rollback or undo. Ask only when an unknown changes consequences or the task itself.

Use `altitude patterns "edit settings" --json` to discover contracts and `altitude explain ALT-EDIT-001` for a rule's scope and evidence. Read [principles](principles.md) for ownership and [evidence.json](evidence.json) for source authority. The generated `index.json` and `llms.txt` route to these same sources; they are not separately authored manuals.

Compose existing primitives and small workflow hooks from the main `altitude-design` export inside one `AltitudeProvider`. Import a package stylesheet. The application supplies routes, business validation and services. Verify delayed operations, rejection, retry, cancellation and stale responses where applicable; include keyboard and manual assistive-technology review. Automated checks cannot establish complete accessibility or task suitability.

For explicit agent setup, preview `npm exec -- altitude init --client codex` (or `claude`), then use `--apply`. Full setup and removal instructions are shipped as `agent-setup.md`, generated from the repository’s `docs/framework/AGENT-SETUP.md`. No installation hook writes project instructions.
