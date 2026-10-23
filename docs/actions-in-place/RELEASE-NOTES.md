# Actions in place release note (unreleased)

This change adds `InlineEdit` for one controlled single-line value. The component retains local input through validation and save failures, guards duplicate dispatch, publishes a server's canonical value once, handles external-value conflicts and preserves keyboard/IME and focus behavior. Applications own persistence, revision checks and reconciliation of uncertain outcomes.

`Dialog` adds optional `background="stationary"` and lazy `returnFocus` props. Default presentation is preserved. Shared modal behavior now owns document isolation, scroll locks, focus containment and exit cleanup, including nested providers, Sheet/Dialog transitions and CommandPalette handoff. Background toast actions are unavailable while a modal owns focus; expiry pauses and announcements are routed into the active modal. Existing applications relying on background interaction during a modal should treat that as a corrected behavior. Unsupported simultaneous summit requests are rejected rather than queued.

The Actions in place guide and canonical previews demonstrate inline editing, both dialog presentations, immediate archive with real Undo and durable Restore, and an integrated Files flow with targeted permanent deletion. The application recipes demonstrate versioned requests, idempotent reconciliation, pending-close semantics and recovery without adding a public action or confirmation framework.

Runtime checks cover React 18, React 19 and development StrictMode; generated declarations, previews, Storybook and package exports ship from their existing sources. See the validation record for evidence and outstanding human testing. No version bump, publication or deployment is part of this change.
