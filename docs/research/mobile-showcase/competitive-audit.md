# Mobile promotional showcase: competitive evidence

Accessed 7 November 2026. This audit informs the accompanying showcase strategy; it is not a ranking of libraries or an accessibility certification.

## Scope and method

We read the official promotional pages and relevant component documentation for shadcn/ui, Radix Themes, React Aria, Mantine, Base UI, Ionic, Konsta UI, Framework7 and Vaul. These cover styled component systems, behavior primitives and mobile-oriented frameworks. The comparison asks **what a visitor can try, how quickly the demonstration becomes available, and what that interaction proves**.

We also rendered seven official homepages with Playwright Chromium at **390 × 844 CSS pixels**, `isMobile: true`, `hasTouch: true`, and device scale factor 1. After `DOMContentLoaded` and a 1,200 ms settling period, we recorded DOM element bounding rectangles, visible controls, image dimensions and iframe dimensions. The observations below come from those runs; vertical positions are approximate and may change with fonts, banners, content and timing.

Limitations: no real phone, Safari, VoiceOver, TalkBack, conversion data, participant study or visual screenshot review of competitors. The extraction tests whether an element occupies layout space; it does not fully resolve clipping, occlusion or whether an interaction succeeds. We did not complete competitors' workflows. Zero-sized frames mean hidden in this render, not broken. Text-only observations for Mantine and Base UI do not establish their mobile layout. None of these measurements demonstrates that one design converts better.

Local context was read at Altitude commit `4c4a3df`: the repository README, design overview, elevation and mobile guides, October mobile research, and promotional workbench. The October research describes an older component snapshot; its defects must not be repeated as current findings without verification. Current principles still make the design intent clear: press feedback, tap alternatives, one-direction page scrolling, and meaningful elevation.

## Evidence from official sites

| Site | Observed evidence | Implication for Altitude — an inference |
| --- | --- | --- |
| [shadcn/ui](https://ui.shadcn.com/) | The page's content includes composed financial, settings and chat examples. At 390 px, the inspected hero demonstration was an image with alt text “Dashboard,” beginning around y378; its rectangle was 546 × 590 px. No demo inputs/buttons were found in the first 1,500 px of that render. The document itself remained 390 px wide. | Composition communicates breadth, but a screenshot cannot let the visitor feel Altitude's press and settle states. Build a real, narrow composition instead of reducing the desktop board to an image. The image rectangle alone does not establish page overflow. |
| [Radix Themes](https://www.radix-ui.com/) | The homepage supplies familiar examples: team invitations, notification settings, company-card actions, invoice approval and tasks. In the mobile render, six example selector buttons began around y770 and the first invitation controls around y916. | Small realistic tasks are understandable without explaining component names. Explicit example selectors can expose breadth while keeping one task in view. A selector itself should not substitute for a useful first task. |
| [React Aria](https://react-aria.adobe.com/) | The homepage opens with a plant collection example and links its source. At 390 px, search, filters and “Add plant” appeared around y730, followed by list-row actions. Its later explanation separates touch, mouse, keyboard and focus behavior. | Let visitors manipulate believable content, then connect that experience to source/documentation. Mobile input should be an intentional interaction model, not merely a narrower layout. |
| [Mantine](https://mantine.dev/) | The promotional page includes an input gallery grouped into inputs, overlays and navigation, followed by working hook examples and their code. It also promotes agent-oriented documentation and setup. No mobile rendering claim is made here. | Immediate control feedback demonstrates breadth, but Altitude also needs to show a coherent result. Agent tooling remains useful supporting content; it need not occupy the small interactive hero. |
| [Base UI](https://base-ui.com/) | Its homepage emphasizes unstyled, composable behavior. The [Dialog documentation](https://base-ui.com/react/components/dialog) supplies a concrete notification example and distinguishes dialogs from drawers when gestures or snap points are needed. | Borrow the separation of task and mechanism. A bottom-edge surface can be useful without adding gratuitous gesture behavior. Existing Altitude primitives should supply the behavior. |
| [Ionic](https://ionicframework.com/) | The homepage showcases mobile controls and offers selectable action-sheet, calendar, modal and progress examples, with platform controls and code. In our mobile render, the browser-preview section started around y6556. | A recognizable sheet or choice control communicates mobile intent. Bring that proof close to Altitude's introduction rather than placing the first substantial interaction far down a promotional narrative. This is a layout observation, not a claim about Ionic's effectiveness. |
| [Konsta UI](https://konstaui.com/) and [Framework7](https://framework7.io/) | Both advertise “See it in action” and link kitchen sinks. At 390 px their embedded kitchen-sink frames measured 0 × 0. Their external-demo links began around y1166 and y835 respectively. | External full examples remain valuable, but Altitude can offer a complete initial interaction without requiring another page. These libraries' hidden embeds are not evidence of an inaccessible or defective kitchen sink. |
| [Vaul](https://vaul.emilkowal.ski/) | The landing page reduces the demonstration to a named drawer and an “Open Drawer” button. That button appeared around y396 at 390 × 844. The [API](https://vaul.emilkowal.ski/api) documents bottom placement, dismissal, handles and input repositioning. | A clear invitation and one visible outcome can communicate an interaction more directly than a large catalogue. Altitude should apply that economy to a meaningful task, not copy a drawer-only product page. |

The useful contrast is not “desktop libraries versus mobile libraries.” React Aria keeps a live collection on a narrow screen; mobile-focused libraries may link out to their complete demos. Altitude can combine **live content, a short task and a visible state transition** in the page itself.

## Options and trade-offs

### 1. A small set of task demonstrations — recommended

Offer two or three explicitly named, tap-first scenes, with one active scene. Lead with a compact choice-and-result workflow such as choosing an appointment time and reviewing it in a bottom sheet. Add a short checklist or preferences interaction and a focused review/decision scene if the implementation can preserve a clear hierarchy.

Each scene should expose a different part of Altitude's language: an available opening, an active choice, a temporary surface, and a settled result. The first result should require very little explanation and no mandatory typing. Keep a visible replay/reset path and label all simulated data and local-only behavior.

**Strength:** demonstrates both tactile components and coherent application behavior. **Cost:** more state and verification than a control gallery; switching scenes must handle pending operations and focus deliberately. Limit the number of scenes instead of hiding many behind a carousel. A booking is a good candidate because tap-sized time choices explain themselves, not because evidence proves booking converts best.

### 2. A compact control playground

Use switches, a segmented choice, a slider with a tap or button alternative, and a sheet trigger. Every action can react immediately, with little domain explanation.

**Strength:** fast to understand, easy to keep within a phone width, broad primitive coverage. **Cost:** risks looking like another collection of styled controls. It can demonstrate the physical language but gives weaker evidence of Altitude's workflow guidance, truthful pending states and recoverability. Best as supporting content or a deliberately small scene.

### 3. Adapt the project board into a mobile task list

Represent each task as a full-width row and use visible status actions or a detail sheet. Preserve the existing workspace story and data.

**Strength:** smallest conceptual change, with direct continuity between viewport sizes. **Cost:** still leads with project management and demonstrates a reduced version of the current example. It responds less directly to the request for a different mobile component set. Keep the desktop board, but choose this only if continuity becomes more important than variety.

## Design constraints supported by the evidence

- **Make a real action immediately discoverable.** Target a useful control in the initial 390 × 844 view after the introduction, and verify the actual layout. This is a proposed acceptance criterion, not a conversion guarantee.
- **Avoid a gesture prerequisite.** Every action must work by tapping. [WCAG 2.2 SC 2.5.7](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html) requires a single-pointer alternative to dragging; keyboard equivalence alone does not satisfy it. Ordinary browser scrolling is distinct from application-controlled dragging.
- **Use generous targets without overstating compliance.** Altitude's own mobile policy aims for 44 × 44 CSS px touch targets. [SC 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) has a 24 × 24 minimum with exceptions; the enhanced criterion uses 44 × 44. Do not call 44 px the universal AA requirement.
- **Show one task at a time and preserve page scrolling.** [SC 1.4.10](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) addresses reflow at 320 CSS px, with exceptions for intrinsically two-dimensional content. A promotional demonstration can choose content that does not need that exception.
- **Make sheets intentional and dismissible.** Keep visible dismissal, focus return, safe-area spacing and scrollable content. [Ionic's modal documentation](https://ionicframework.com/docs/api/modal) makes viewport containment and accessible modal labeling explicit. Test these properties in Altitude rather than assuming a bottom position supplies them.
- **Demonstrate the installed components.** Reuse Altitude controls, tokens and elevation rules. Competitive examples inform the composition; they do not justify importing another UI framework or inventing a parallel visual system.

## Reproducing the mobile layout observations

With the repository's build dependencies installed, run the following from its root. Replace `urls` with any official homepage above. The settling interval matches this audit; waiting for fonts or network idle can produce different positions.

```js
import { chromium } from './build/node_modules/playwright-core/index.mjs';
const browser = await chromium.launch();
const urls = ['https://vaul.emilkowal.ski/'];
for (const url of urls) {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1, isMobile: true, hasTouch: true,
  });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  console.log(url, await page.evaluate(() =>
    [...document.querySelectorAll('h1,h2,button,input,a,img,iframe')]
      .map(element => {
        const r = element.getBoundingClientRect();
        return {
          tag: element.tagName,
          label: element.getAttribute('aria-label')
            || element.getAttribute('alt') || element.textContent?.trim(),
          x: r.x, y: r.y, width: r.width, height: r.height,
        };
      })
  ));
  await page.close();
}
await browser.close();
```

For control inventories, this audit filtered nonzero rectangles intersecting the horizontal viewport and the indicated vertical range. Iframes were also inspected without that filter so hidden embeds remained observable. DOM measurements should be followed by screenshot inspection and interaction testing when implementing Altitude's own experience.
