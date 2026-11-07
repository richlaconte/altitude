# Provider and model selection in agent chat

Research date: **7 November 2026**. Scope: choosing the connection and model that will handle a chat request, and carrying that choice through the agent harness.

## Method and limits

We compared eight agent/chat products and UI systems using official documentation, supplemented by source inspection for OpenCode, Cline and Continue. The observations below describe documented or inspected behavior; we did **not** install or interactively test these products. Documentation describes moving releases, and some pages expose development versions or feature flags. Source links are pinned to inspected commits. Model names, catalog sizes, prices and credentials are deliberately not copied into a maintained catalog.

Altitude is a design framework with a deterministic harness example, not an inference service. Its implementation should provide selection, honest states and a clear application contract. It should not imply that rendering a provider option establishes a working connection.

## Observations

| System | Choosing providers and models | Scope, availability and implications |
|---|---|---|
| **OpenCode** | Connect a provider, then select a provider/model pair through `/models`. The current selector offers search, provider groups, favorites, recents and an integration-connect action. | Session selection is separate from the configured default; inventory depends on project availability. An existing request retains its starting settings. [Models](https://opencode.ai/docs/models), [providers](https://opencode.ai/docs/providers), [pinned selector](https://github.com/anomalyco/opencode/blob/f460ccefcb936d4e4747b5feb3c21604d3000c8e/packages/tui/src/component/dialog-model.tsx) |
| **Cline** | IDE setup uses provider selection, authentication and model selection as distinct steps. Desktop also asks for provider and model before starting work. | Authentication can be hosted sign-in, BYOK or a local runtime. Plan and Act can retain different model choices. [Authorization](https://docs.cline.bot/getting-started/authorizing-with-cline), [desktop](https://docs.cline.bot/usage/cline-desktop), [Plan/Act](https://docs.cline.bot/core-workflows/plan-and-act) |
| **Continue** | Configured models have separate display names, providers, API model IDs and role membership. The chat/edit picker selects from the relevant role. | Inspected UI shows loading, no-model and missing-key states, with configuration actions. Selection updates the selected profile and role. [Configuration](https://docs.continue.dev/reference), [pinned selector](https://github.com/continuedev/continue/blob/5522c6f44ca0ac3528b37244818fbfa39b5af470/gui/src/components/modelSelection/ModelSelect.tsx), [update handler](https://github.com/continuedev/continue/blob/5522c6f44ca0ac3528b37244818fbfa39b5af470/gui/src/redux/thunks/updateSelectedModelByRole.ts) |
| **Roo Code — historical** | Chat can switch named profiles containing provider, model and settings; frequently used profiles can be pinned. | Tasks retain their profile when reopened or when another workspace changes its selection; child tasks inherit the parent's profile. [Profiles](https://roocodeinc.github.io/Roo-Code/features/api-configuration-profiles/) |
| **LibreChat** | Endpoints determine available models/settings; presets save endpoint, model and conversation settings together. | New-chat defaults are distinct from an explicit choice. In URL configuration, an endpoint-only change restores its previous model or takes its first model; a model-only change is scoped to the current endpoint. [Overview](https://www.librechat.ai/docs/user_guides/ai_overview), [query parameters](https://www.librechat.ai/docs/features/url_query) |
| **Open WebUI** | Connections are configured separately; a searchable chat picker chooses models, including configured agent presets. | Conversations can switch models while retaining context. Presets depend on an available base model; administrators control access and capabilities. Distinct connection prefixes disambiguate identical model names. [Connections](https://docs.openwebui.com/getting-started/quick-start/connect-a-provider/), [models](https://docs.openwebui.com/features/workspace/models/), [Ollama prefixes](https://docs.openwebui.com/getting-started/quick-start/connect-a-provider/starting-with-ollama/) |
| **assistant-ui** | A runtime-connected or standalone controlled picker supports provider grouping and model-specific reasoning choices. Optional search matches IDs, names and keywords. | Disabled options remain visible but unselectable. Runtime integration carries the choice to requests; standalone consumers own that integration. [Model selector](https://www.assistant-ui.com/elements/model-selector) |
| **AI Elements** | A command-palette selector supplies provider groups, search, keyboard navigation and empty states. | Its composable UI does not establish a provider connection or persistence policy. [Model selector](https://elements.ai-sdk.dev/components/model-selector) |

### Identity and execution are separate concerns

OpenCode's inspected selector stores provider and model IDs separately and compares both for favorites and recents. Its documentation allows slashes inside model IDs and distinguishes a catalog alias from the API-facing model ID. Variant names and options are model/provider-specific. Some inspected presentation branches are feature-flagged; their presence in source does not establish universal deployment. [Model references and variants](https://opencode.ai/docs/models), [selector source](https://github.com/anomalyco/opencode/blob/f460ccefcb936d4e4747b5feb3c21604d3000c8e/packages/tui/src/component/dialog-model.tsx)

Cline's compatible-provider setup requires endpoint and model identity separately and allows explicit context/output limits and image support. Its inspected CLI refreshes catalogs, offers provider changes, and falls back to manual model entry when endpoint discovery fails. It also clears reasoning configuration for models without that support. These are CLI implementation observations, not assertions about the desktop interaction. [Compatible providers](https://docs.cline.bot/provider-config/openai-compatible), [pinned CLI hook](https://github.com/cline/cline/blob/94eecbbe1a2f899c66b118d13656651b0a884e1f/apps/cli/src/tui/hooks/use-model-selector.tsx)

The AI SDK provides a useful integration boundary: provider registries resolve namespaced model references, while custom providers supply aliases, configured settings and restricted inventories. This is backend routing infrastructure, not a chat-selection interface. [Provider and model management](https://ai-sdk.dev/docs/ai-sdk-core/provider-management)

### Source caveats

- Roo Code's official landing page says the extension shut down on **15 May 2026**. Its profile behavior remains useful historical evidence, not an active product recommendation. [Shutdown notice](https://roocodeinc.github.io/Roo-Code/)
- AI Elements announces its move to shadcn/ui and deprecation at the **end of November 2026**. We use the interaction pattern as evidence and add no dependency on that package. [Migration notice](https://elements.ai-sdk.dev/components/model-selector)
- Continue's configuration reference describes capability overrides, whereas its focused guide describes additive capabilities that cannot remove autodetection. Both establish that capabilities affect tools and images; this research does not resolve their inconsistent override semantics. [Reference](https://docs.continue.dev/reference), [capability guide](https://docs.continue.dev/customize/deep-dives/model-capabilities)
- A missing API key is not a universal availability test: signed-in providers and keyless local runtimes exist. Actual permission, connection health and model eligibility require application knowledge.

## Altitude decision

The following is our design recommendation, not a claim that every researched product behaves this way.

Use two linked existing controls beside the composer: a visibly labelled **Provider** `Select` and **Model** `Combobox`. Model search operates within the selected provider. Reusing these primitives preserves Altitude's selection, keyboard, focus and elevation conventions and makes the connection explicit even when two routes serve identically named models.

Changing provider clears the model in the same controlled update. Selecting a model completes the pair. Neither action sends a message, clears the draft, cancels a run or rewrites history. A provider change must not retain a same-named model from the old provider or silently choose a first available model. Unlike LibreChat's documented URL fallback, this choice requires an explicit model decision because endpoints can differ in cost, data destination and capabilities.

Represent identity with separate opaque provider and model IDs. A provider ID identifies a configured connection, not necessarily the model's author: two deployments or gateways may need different IDs. Labels are for display. Do not reconstruct routing by splitting a label or assuming one slash separates every identifier. The caller supplies catalog entries, descriptions and availability reasons; the component has no hardcoded vendor list.

### States and application responsibilities

| State | Required behavior |
|---|---|
| No selection | Show provider/model prompts and visible labels; require a complete valid pair before dispatch. Explain missing input when submission is attempted. |
| Provider changed | Clear the selected model and search query; preserve composer text and attachments. |
| Catalog loading | Identify loading in words and accessible status; do not treat cached choices as newly verified. |
| Catalog error | Explain the failure and expose the application's retry/configuration action; preserve draft and selection identity. |
| Empty inventory or no search results | Distinguish no configured providers, no models for a provider, and no matches to the query. |
| Unavailable entry | Keep the reason inspectable and prevent selecting it. Permission, credentials and capability eligibility come from the host. |
| Stale selection | If a controlled ID disappears or becomes unavailable, show that state; never silently substitute another route or falsely display a valid choice. |
| Active run | Explain that selection affects the next message. Keep the existing run's provider/model attribution stable. |

At send, validate the pair and snapshot it with the request. At queue, snapshot it with that queued item, then revalidate availability before dispatch; later composer changes must not reroute the item. Retry uses the failed request's snapshot unless an explicit action offers a different route. Record requested and actual routing separately if the backend can fall back; do not relabel old messages from current picker state.

The host owns credentials, endpoint discovery, authorization, server-side allowlisting, network requests, persistence, costs and compatibility with tools, images and context limits. It also owns session defaults, per-mode preferences, queue durability and retries. Availability props are presentation input, not a security boundary. The deterministic harness demonstrates these contracts without claiming to contact a provider.

The controls inherit the existing field wells, floating choice lists, invalid treatments and text/ARIA signals. Changing a local choice is input, not a pending network write. Provider badges and model attribution remain on the ground; neither price nor recommendation earns extra elevation. See [Elevation](../../../project/Elevation.md).

### Alternatives considered

| Approach | Tradeoff and decision |
|---|---|
| One combined searchable palette | Efficient across large catalogs, demonstrated by OpenCode and UI libraries. Requires persistent provider disambiguation and additional grouping/palette behavior. A future option; two existing controls make this first contract easier to inspect. |
| Named configuration profiles | Useful for repeated combinations of endpoint, parameters and workflow modes, demonstrated by Roo and LibreChat. Adds profile lifecycle and persistence beyond this feature; leave it to applications. |
| Settings-only selection | Suits connection setup but hides the routing decision while composing. Keep configuration available as a separate action and expose ordinary choice in chat. |

## Acceptance and traceability

These are verification requirements, not claims of completed checks. Automated tests establish deterministic behavior; manual review still covers usability and assistive-technology experience.

| Evidence or concern | Acceptance criterion |
|---|---|
| OpenCode pair identity; Open WebUI duplicate names | Identical model IDs under different providers remain distinct; switching provider clears the model atomically. |
| Continue loading/empty/missing-key states; assistant-ui disabled entries | Loading, error, empty, no-match, unavailable and stale states are distinguishable and never emit an invalid pair. |
| Searchable UI precedents | Model name/ID search works within its provider; keyboard selection, Escape, focus return and disabled choices are exercised. |
| Session/profile boundaries in OpenCode and Roo | A change preserves the draft and does not mutate active or historical request attribution. |
| Next-message contract | Send, queue and retry bind to an explicit provider/model snapshot; unavailable queued routes require recovery instead of substitution. |
| Capability and connection separation | Caller-supplied eligibility is shown; documentation requires backend revalidation and exposes no credential storage or inferred capability claims. |
| Altitude's one-source rule | Harness, component documentation, public types, distributed guidance and previews describe the same selection contract. |
