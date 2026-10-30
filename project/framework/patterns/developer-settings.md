# Developer settings

Help someone manage how other software reaches their account: API keys (create, list, roll, revoke), webhooks (endpoints, events, deliveries, retries, test events), and integrations (connect through OAuth, disconnect). These screens look like forms but carry production consequences: a leaked or revoked key breaks a live service. It composes [Consequential action](consequential-action.md) for revoke, roll and disconnect.

## Inputs and ownership

Supply keys with a name, a masked tail and when each was last used (and by what); a create adapter that returns the secret once; roll and revoke adapters, with the overlap window a roll allows; webhook endpoints with their events, recent deliveries with results and attempts, a retry adapter and a test-event adapter returning the payload; integrations with their state and an OAuth start and completion. The application owns secret generation and storage (a secret is shown once and never retrievable from the interface afterwards unless the product deliberately supports it), signing, retry schedules, OAuth scopes and token revocation.

## States and transitions

**API keys.** Creation happens in a `Dialog` that **can't be closed by Escape or the backdrop until the secret is acknowledged**: `SecretField once` shows the secret in full with "You won't see this key again", and Done waits for "I've saved this key". The list shows keys **masked** (prefix and last characters) with their name and last use ("Used 3 minutes ago by 3 services"), never in full. **Roll** says the overlap in words ("The old key keeps working for 24 hours") before confirming, and afterwards. **Revoke** is a consequential action that names what breaks ("Requests that use it fail immediately. Used 3 minutes ago by 3 services."), behind a danger button.

**Webhooks.** An endpoint shows its URL, whether it's active, and its events as `Checkbox`es. **Deliveries are a `Timeline`**: each entry is the event with a status plate (Delivered, Failed). A failed delivery offers Retry; a retry in progress is a dispatched write, so it **hovers as pending** with its attempt in words ("Retrying (attempt 4 of 5)"), then lands. "Send test event" shows the payload it sent in a `CodeBlock`. The signing secret is a stored `SecretField`.

**Integrations.** Each is a `Card` with what it does and one action. Connected ones carry a "Connected" `Badge`. An OAuth handoff in progress is pending ("Waiting for authorization") until the provider returns; a cancelled or failed handoff says so and offers to try again. **Disconnect** is consequential and says what stops. A card holds its own action buttons, so the card itself doesn't lift; make a card `interactive` only when the whole card is one action (opening the integration's page).

## Content, keyboard, focus and announcements

Every row action is named with its target ("Revoke CI pipeline key"). Results are announced politely in one status region; focus returns to a logical place after a dialog. Secrets use a monospace face and copy buttons; never put a secret in a URL, a toast or a log entry. Tables scroll horizontally on narrow screens. Verify forced colors (masked keys, status plates and the pending retry stay distinguishable), reduced motion, zoom and RTL.

## Recovery and working implementation

A failed create, roll or revoke says nothing changed and offers to try again; a failed retry returns the delivery to Failed with the attempt count; an abandoned OAuth handoff returns the card to Connect. The working example in `build/fixtures/patterns/developer-settings.jsx` (shipped as `references/build/fixtures/patterns/developer-settings.jsx`) composes key creation shown once, a masked list, roll, revoke, webhook deliveries with a pending retry and a test payload, and integrations with an OAuth handoff. It is also the Storybook preview "Patterns/DeveloperSettingsPattern". [Metadata](developer-settings.json) names the runtime and verification sources.

## Rules, verification and evidence

`ALT-DEV-001` covers secrets shown once behind acknowledgement, masked lists, roll overlaps and revocation that names what breaks; `ALT-ACTION-001` covers the confirmations; `ALT-STATUS-001` covers announcements. `build/checks/developer-settings-pattern.mjs` checks the example in a browser. See [rules](../rules.json). Sample secrets in examples are obviously fake (`ak_live_EXAMPLE…`).

See [running examples and verification](../principles.md#run-the-examples-and-verification) for the installed example command, repository test command, and the limits of shipped test-reference snapshots.
