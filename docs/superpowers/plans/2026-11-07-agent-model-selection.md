# Provider and model selection implementation plan

> Execute with the subagent-driven-development skill; review the component contract and integrated behavior separately.

**Goal:** Let a person choose an AI provider and model in Altitude's chat composer, and carry that exact choice through sends, queues and retries.

**Architecture:** A controlled ModelSelector composes existing Select and Combobox fields. Provider IDs identify configured connections, not model authors. Model IDs are scoped to the provider. An opt-in PromptInput modelPicker configuration supplies the catalog, selection and change callback; PromptInputModelSelector reads it. Sending validates this catalog and snapshots identity into PromptMessage.model. Existing composers without modelPicker are unchanged. useAssistantTurn already preserves generic inputs and needs no special provider runtime.

**Tech stack:** React 18/19, TypeScript, existing Altitude controls/tokens, Playwright browser checks, existing package/guidance builds.

## Design decisions

Two linked fields make provider ownership visible and reuse established keyboard behavior. A single grouped palette would save width but requires new generic grouping interactions; model-only selection hides routing. A provider change sets modelId to an empty string until the person chooses a model. No automatic cross-provider fallback. Removed or disabled choices retain their IDs for explanation and block sending; loading and catalog errors also block dispatch. Connection setup, credentials, catalog discovery, authorization, capabilities and persistence remain application responsibilities. The scripted harness identifies its fictional catalog and never claims live inference.

The selector follows existing field elevation: empty well at -1; chosen value flush at 0; invalid field trench at -2; list floating at 3. Labels, selected state, disabled reasons and focus rings carry meaning without height. No new visual language or dependency.

## Tasks

- [x] Research primary docs/source for OpenCode, Cline, Continue, Roo (historical), LibreChat, Open WebUI, assistant-ui and Vercel; distinguish observations from Altitude recommendations and record sources/date.
- [x] Add ModelSelector and PromptInputModelSelector with matching public declarations, export registration, source styles and canonical preview. Add failing behavior checks before implementation, then verify duplicate IDs, provider changes, stale/disabled/empty/loading/error states, keyboard and preserved drafts.
- [x] Integrate selector into both harness views and assistant-conversation example. Render route snapshots on submitted records and preserve queued/retried identity when selection changes. Add harness and workflow regression checks.
- [x] Update component and framework guidance/metadata with host responsibilities and research links. Preserve one canonical fixture for site and Storybook.
- [x] Regenerate bundle/previews, bump minor version, check type/API/package/framework/site/Storybook builds and relevant browser checks including mobile and forced colors.
- [x] Independent spec/code review, fix findings, commit/push and create PR with research decisions and exact validation. Do not merge.
