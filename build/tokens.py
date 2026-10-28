import json, os, sys
THEMES = [("daylight","Daylight"),("nightfall","Nightfall"),("mesa","Mesa"),("alpine","Alpine")]
T = ["daylight","nightfall","mesa","alpine"]
def c(*v): return dict(zip(T, v))

def data_tokens():
    p = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "palette.json")))
    usage = {f"data-{i}": f"Categorical series {i}: identity only, in config order. Charts only, as presence-* is only for people; never text, surfaces or status." for i in range(1, 7)}
    usage["data-1"] = "Categorical series 1, in the accent's hue (or the nearest that clears status and presence). Charts only, as presence-* is only for people; never text, surfaces or status."
    usage["data-other"] = "The fold for a seventh and later series: a neutral that holds 3:1 on ground and raised."
    usage.update({f"data-seq-{i}": f"Magnitude ramp, step {i} of 7 (1 is least). One hue, monotone lightness; dark schemes climb from their ground." for i in range(1, 8)})
    usage.update({f"data-div-neg-{i}": f"Diverging ramp, {i} step{'s' if i > 1 else ''} below the midpoint (orange). Never a status hue." for i in range(1, 4)})
    usage["data-div-mid"] = "Diverging ramp midpoint: a neutral for the meaningful middle (zero, target, average)."
    usage.update({f"data-div-pos-{i}": f"Diverging ramp, {i} step{'s' if i > 1 else ''} above the midpoint (blue). Never a status hue." for i in range(1, 4)})
    return [(n, {t: p[t][n] for t in T}, usage[n]) for n in p["daylight"]]

colors = [
 # surfaces by altitude
 ("surface-trench",  c("#e1e4ea","#08090c","#e5ddd2","#060a09"), "Level -2. Deep wells: slider, switch and progress tracks. Never holds body text larger than a label."),
 ("surface-well",    c("#eaedf1","#0c0e12","#eee7dd","#0a0f0e"), "Level -1. Receptacles: inputs, textareas, the tab track. Things you put something into."),
 ("surface-ground",  c("#f3f4f7","#121419","#f6f1ea","#0f1513"), "Level 0. The page itself, and anything flush with it: badges, ghost buttons, skeletons, disabled controls."),
 ("surface-raised",  c("#ffffff","#191c23","#fffcf8","#151e1b"), "Level 1. Resting interactive and grouping surfaces: cards, buttons, the switch thumb, the active tab."),
 ("surface-lifted",  c("#ffffff","#1f232b","#fffdfa","#1a2522"), "Level 2. A raised surface under the pointer, and the primary action at rest."),
 ("surface-floating",c("#ffffff","#252a33","#ffffff","#202c28"), "Level 3. Tooltips, popovers, menus, a dragged item."),
 ("surface-overlay", c("#ffffff","#2a303a","#ffffff","#25332f"), "Level 4. Toasts and sheets."),
 ("surface-modal",   c("#ffffff","#2f3541","#ffffff","#2a3935"), "Level 5. Dialogs. The highest thing on screen, one at a time."),
 # ink
 ("ink",       c("#12161f","#eef1f6","#221b14","#eaf3ef"), "Primary text on every surface-* level and on accent-soft."),
 ("ink-muted", c("#4f5767","#a3abb9","#62564a","#9db0a9"), "Secondary text, hints, placeholders; on every surface-* level."),
 ("ink-faint", c("#8a92a0","#5f6775","#a09484","#5d6c67"), "Disabled labels only (exempt from contrast minimums). Never for content."),
 ("line",      c("#e0e3e9","#262a33","#e6ded3","#222c29"), "Decorative hairlines: dividers, the separators between flush accordion rows. Not a control boundary."),
 ("line-control", c("#737b89","#6a7280","#807467","#62736d"), "Control boundaries (input, checkbox, radio, switch track): at least 3:1 on ground, well and raised."),
 # accent
 ("accent",     c("#2b56d6","#86a2ff","#b4441b","#5fd6b2"), "The scheme's one hue: primary fills, checked controls, the switch and slider fill, progress."),
 ("on-accent",  c("#ffffff","#0b1022","#ffffff","#04140f"), "Text and icons on an accent fill."),
 ("accent-ink", c("#2a52c8","#93acff","#a63e17","#6fdcbc"), "Accent as text, links and the focus ring; 4.5:1 on every surface-* level."),
 ("accent-soft",c("#e3eafc","#1c2440","#f8e4d9","#13302a"), "Tinted ground behind accent-ink or ink: the accent badge, the selected menu row."),
 # status
 ("positive",      c("#13734f","#56cf9f","#2c6e3f","#8ed67a"), "Success text and icons on every surface-* level and on positive-soft. Always paired with a word or icon."),
 ("positive-soft", c("#dcf2e8","#10291f","#e3efdc","#1a2e17"), "Tinted ground behind positive text: success alerts, badges, toasts."),
 ("caution",       c("#875400","#ebb550","#8a5000","#efbd5b"), "Warning text and icons on every surface-* level and on caution-soft. Always paired with a word or icon."),
 ("caution-soft",  c("#fbefd3","#2e2411","#fbeccf","#2f2712"), "Tinted ground behind caution text."),
 ("critical",      c("#b52e16","#ff8064","#b3261e","#ff8a70"), "Errors and destructive actions: text and icons on every surface-* level and on critical-soft; the danger button fill."),
 ("critical-soft", c("#fbe4de","#3a1913","#f9e1dc","#3a1a14"), "Tinted ground behind critical text; the invalid field's well."),
 ("on-critical",   c("#ffffff","#1a0905","#ffffff","#1a0905"), "Text on a critical fill (the danger button)."),
 ("presence-1", c("#b0256f","#f07ab8","#a8256a","#f07ab8"), "Collaborator presence: the ring and name tag on something another person is holding or editing. 3:1 on every surface."),
 ("presence-2", c("#0b7285","#3fc1d0","#0b7285","#5cc8e0"), "Second collaborator's presence colour."),
 ("presence-3", c("#7046c9","#b39dff","#6e44c2","#b9a3ff"), "Third collaborator's presence colour."),
 ("on-presence", c("#ffffff","#0b0d12","#ffffff","#06100d"), "Name-tag text on any presence-* fill."),
 # data: charts only, as presence-* is only for people. Chosen by palette.mjs, which writes palette.json (#49)
 *data_tokens(),
 ("scrim",         c("#12161f52","#00000080","#221b144d","#00000080"), "The veil a dialog lays over everything beneath it."),
]

# shadows: every ladder entry has the SAME four-layer structure [inset rim, ring, key, ambient] so any two levels interpolate smoothly.
def ladder(s, rimc, ringc, dark):
    z = f"0 0 0 0 {s}00"
    if not dark:
        return {
         "well":   f"inset 0 1px 2px {s}1a, {z}, {z}, {z}",
         "trench": f"inset 0 1px 3px {s}2e, {z}, {z}, {z}",
         "elev-0": f"inset 0 1px 0 #ffffff00, {z}, {z}, {z}",
         "elev-1": f"inset 0 1px 0 #ffffffb3, 0 0 0 1px {s}17, 0 1px 2px {s}12, 0 2px 4px -1px {s}0f",
         "elev-2": f"inset 0 1px 0 #ffffffcc, 0 0 0 1px {s}12, 0 2px 4px -1px {s}14, 0 8px 16px -6px {s}24",
         "elev-3": f"inset 0 1px 0 #ffffffe6, 0 0 0 1px {s}0f, 0 4px 8px -2px {s}14, 0 16px 32px -10px {s}33",
         "elev-4": f"inset 0 1px 0 #ffffff, 0 0 0 1px {s}0d, 0 8px 16px -4px {s}17, 0 28px 56px -16px {s}3d",
         "elev-5": f"inset 0 1px 0 #ffffff, 0 0 0 1px {s}0a, 0 12px 24px -6px {s}1a, 0 48px 96px -24px {s}4d",
         "lip-top": f"inset 0 18px 18px -18px {s}3d",
         "lip-bottom": f"inset 0 -18px 18px -18px {s}3d",
        }
    return {
         "well":   f"inset 0 1px 2px #00000099, {z}, {z}, {z}",
         "trench": f"inset 0 2px 4px #000000b3, {z}, {z}, {z}",
         "elev-0": f"inset 0 1px 0 #ffffff00, {z}, {z}, {z}",
         "elev-1": f"inset 0 1px 0 #ffffff12, 0 0 0 1px #ffffff0a, 0 1px 2px #00000080, 0 2px 6px -1px #00000052",
         "elev-2": f"inset 0 1px 0 #ffffff17, 0 0 0 1px #ffffff0d, 0 2px 4px -1px #00000073, 0 10px 20px -6px #00000066",
         "elev-3": f"inset 0 1px 0 #ffffff1c, 0 0 0 1px #ffffff0f, 0 4px 8px -2px #00000073, 0 18px 36px -10px #00000080",
         "elev-4": f"inset 0 1px 0 #ffffff21, 0 0 0 1px #ffffff12, 0 8px 16px -4px #00000080, 0 30px 60px -16px #0000008c",
         "elev-5": f"inset 0 1px 0 #ffffff26, 0 0 0 1px #ffffff14, 0 12px 24px -6px #0000008c, 0 48px 96px -24px #00000099",
         "lip-top": "inset 0 18px 18px -18px #000000cc",
         "lip-bottom": "inset 0 -18px 18px -18px #000000cc",
    }
L = {"daylight": ladder("#0f1729", None, None, False), "nightfall": ladder("#000000", None, None, True),
     "mesa": ladder("#2a1a0c", None, None, False), "alpine": ladder("#000000", None, None, True)}
shadow_usage = {
 "trench": "Level -2, inset. Slider, switch and progress tracks; the invalid field.",
 "well": "Level -1, inset. Inputs, textareas, the tab track, unchecked checkboxes and radios.",
 "elev-0": "Level 0, flush. Ghost buttons, badges, skeletons, disabled and pressed controls. Same four-layer shape as every level, so transitions interpolate.",
 "elev-1": "Level 1, raised. Cards, secondary buttons, the switch thumb, the active tab, avatars, keys.",
 "elev-2": "Level 2, lifted. Primary button at rest; anything raised while hovered or focused.",
 "elev-3": "Level 3, floating. Tooltips, popovers, menus, a dragged slider thumb.",
 "elev-4": "Level 4, overlay. The front toast; sheets.",
 "elev-5": "Level 5, modal. Dialogs only.",
 "lip-top": "Overflow cue: the inner shadow at the top edge of a scroll area when content continues above it.",
 "lip-bottom": "Overflow cue: the inner shadow at the bottom edge of a scroll area when content continues below it.",
}
shadows = [{"name": k, "value": {t: L[t][k] for t in T}, "usage": shadow_usage[k]} for k in ["trench","well","elev-0","elev-1","elev-2","elev-3","elev-4","elev-5","lip-top","lip-bottom"]]

tokens = {
 "name": "Altitude", "version": 1,
 "color": {"themes": [{"id": i, "name": n} for i, n in THEMES],
   "tokens": [{"name": n, "value": v, "usage": u} for n, v, u in colors]},
 "type": {
   "fonts": [],
   "families": {
     "sans": "\"Instrument Sans\", ui-sans-serif, system-ui, -apple-system, \"Segoe UI\", sans-serif",
     "mono": "\"JetBrains Mono\", ui-monospace, \"SF Mono\", Menlo, monospace"},
   "groups": [
     {"name": "Display", "family": "sans", "note": "Instrument Sans, hosted on Google Fonts (wght 400–700). Tight tracking as size grows.",
      "styles": [
       {"name": "text-display", "fontSize": "44px", "lineHeight": "48px", "fontWeight": 600, "letterSpacing": "-0.025em", "sample": "Everything has a height", "usage": "Marketing and empty-state headlines. Once per view."},
       {"name": "text-title", "fontSize": "28px", "lineHeight": "34px", "fontWeight": 600, "letterSpacing": "-0.018em", "sample": "Workspace settings", "usage": "Page titles."},
       {"name": "text-heading", "fontSize": "19px", "lineHeight": "26px", "fontWeight": 600, "letterSpacing": "-0.01em", "sample": "Notifications", "usage": "Section, card and dialog titles."}]},
     {"name": "Interface", "family": "sans",
      "styles": [
       {"name": "text-body", "fontSize": "15px", "lineHeight": "23px", "fontWeight": 400, "sample": "Changes save as you type and sync across devices.", "usage": "Paragraphs, descriptions, dialog copy."},
       {"name": "text-label", "fontSize": "14px", "lineHeight": "20px", "fontWeight": 500, "sample": "Save changes", "usage": "Buttons, inputs, menu items, tabs, field labels."},
       {"name": "text-caption", "fontSize": "12.5px", "lineHeight": "17px", "fontWeight": 500, "letterSpacing": "0.005em", "sample": "Updated 2 minutes ago", "usage": "Hints, metadata, badges, tooltips."}]},
     {"name": "Code", "family": "mono",
      "styles": [
       {"name": "text-code", "fontSize": "13px", "lineHeight": "20px", "fontWeight": 400, "sample": "<Surface level={3}>", "usage": "Inline code, keys, values."}]}]},
 "spacing": {"note": "4px base. Padding inside a raised surface grows with its level: cards space-5, popovers space-2 to space-3, dialogs space-6.",
   "tokens": [
     {"name": "space-1", "value": "4px", "usage": "Icon-to-label gap inside small controls; the inset of a tab indicator in its track."},
     {"name": "space-2", "value": "8px", "usage": "Icon-to-label gap in buttons; menu padding; gap between stacked toasts."},
     {"name": "space-3", "value": "12px", "usage": "Horizontal padding of small buttons and inputs; gap between related fields."},
     {"name": "space-4", "value": "16px", "usage": "Horizontal padding of medium buttons; gap between form rows."},
     {"name": "space-5", "value": "20px", "usage": "Card padding."},
     {"name": "space-6", "value": "24px", "usage": "Dialog padding; gap between sections in a card."},
     {"name": "space-8", "value": "32px", "usage": "Gap between page sections."},
     {"name": "space-12", "value": "48px", "usage": "Page gutters on wide screens."}]},
 "radius": {"note": "Concentric: a surface nested inside another takes the outer radius minus the gap between them (tab indicator = radius-md − space-1).",
   "tokens": [
     {"name": "radius-xs", "value": "4px", "usage": "Checkboxes, keys, badges, the tab indicator in a small track."},
     {"name": "radius-sm", "value": "7px", "usage": "Menu rows, the tab indicator, small buttons."},
     {"name": "radius-md", "value": "10px", "usage": "Buttons, inputs, the tab track, tooltips."},
     {"name": "radius-lg", "value": "14px", "usage": "Cards, popovers, menus, toasts."},
     {"name": "radius-xl", "value": "20px", "usage": "Dialogs and sheets."},
     {"name": "radius-full", "value": "9999px", "usage": "Switches, slider thumbs, radios, avatars, pills."}]},
 "shadow": {"note": "The elevation ladder. Light falls from straight above, so shadows only fall down. Every level uses the same four layers (rim, hairline, key, ambient): any two interpolate smoothly. The hairline fades as a surface climbs; the shadow takes over the separating.",
   "tokens": shadows},
 "duration": {"note": "Duration is distance: 100ms plus 40ms per level travelled. Exits run at 70% of the entry.",
   "tokens": [
     {"name": "dur-press", "value": "90ms", "usage": "Pressing down to the ground."},
     {"name": "dur-travel-1", "value": "140ms", "usage": "One level: hover lift, colour and fill changes, checkbox and radio state."},
     {"name": "dur-travel-2", "value": "180ms", "usage": "Two levels: tab indicator, switch thumb, menu highlight, field messages."},
     {"name": "dur-travel-3", "value": "220ms", "usage": "Three levels: tooltips, popovers, menus, accordion open."},
     {"name": "dur-travel-4", "value": "260ms", "usage": "Four levels: toasts, sheets."},
     {"name": "dur-travel-5", "value": "300ms", "usage": "Five levels: dialogs, and the page receding behind them."},
     {"name": "dur-sweep", "value": "1600ms", "usage": "One pass of the skeleton's light sweep; the indeterminate progress loop."},
     {"name": "dur-grace", "value": "300ms", "usage": "A write that confirms within this never shows as pending: fast saves stay invisible."},
     {"name": "dur-onset", "value": "500ms", "usage": "Gradual onset of non-predicted menu items (ephemeral adaptation)."},
     {"name": "dur-hold", "value": "1000ms", "usage": "How long a HoldButton must be held to push through the ground and commit."},
     {"name": "dur-hover", "value": "1800ms", "usage": "One breath of a pending surface hovering above the ground."},
     {"name": "dur-settle", "value": "8000ms", "usage": "Afterglow: new or changed content arrives at level 2 and settles to its resting level over this long."}]},
 "easing": {"note": "Things rise decelerating, sink accelerating, and controls that snap into place settle with a 2–3% overshoot.",
   "tokens": [
     {"name": "ease-rise", "value": "cubic-bezier(0.2, 0.9, 0.25, 1)", "usage": "Anything entering or gaining altitude."},
     {"name": "ease-sink", "value": "cubic-bezier(0.45, 0, 0.8, 0.35)", "usage": "Anything leaving or losing altitude."},
     {"name": "ease-settle", "value": "cubic-bezier(0.3, 1.3, 0.45, 1)", "usage": "Thumbs, indicators, checks and a button released after a press."},
     {"name": "ease-glide", "value": "cubic-bezier(0.65, 0, 0.35, 1)", "usage": "Size and position changes that stay at one level: accordion height, progress width."},
     {"name": "ease-decay", "value": "cubic-bezier(0.25, 0.4, 0.35, 1)", "usage": "Afterglow decay, after the first second at full strength: fades steadily, the last of it lingers."}]},
 "thickness": {"note": "Pressable controls show their altitude as a visible wall under the face. Hover adds 1px; pressing removes the wall.",
   "tokens": [
     {"name": "wall-1", "value": "2px", "usage": "Level-1 pressables: secondary buttons and keys. Breadcrumb steps add 1px per level of depth."},
     {"name": "wall-2", "value": "4px", "usage": "Level-2 pressables: primary and danger buttons."}]},
 "zIndex": {"note": "Paint order follows altitude, except toasts paint above a dialog so status is never hidden.",
   "tokens": [
     {"name": "z-floating", "value": "30", "usage": "Tooltips, popovers, menus."},
     {"name": "z-overlay", "value": "40", "usage": "Sheets."},
     {"name": "z-modal", "value": "50", "usage": "Dialog and its scrim."},
     {"name": "z-toast", "value": "60", "usage": "The toast stack."}]},
}
json.dump(tokens, open(sys.argv[1], "w"), indent=2, ensure_ascii=False)

# ---- contrast check
def lum(h):
    h = h.lstrip('#')[:6]
    r, g, b = [int(h[i:i+2], 16)/255 for i in (0, 2, 4)]
    f = lambda x: x/12.92 if x <= .04045 else ((x+.055)/1.055)**2.4
    return .2126*f(r)+.7152*f(g)+.0722*f(b)
def cr(a, b):
    la, lb = lum(a), lum(b); la, lb = max(la, lb), min(la, lb); return (la+.05)/(lb+.05)
V = {n: v for n, v, u in colors}
surfs = ["surface-trench","surface-well","surface-ground","surface-raised","surface-lifted","surface-floating","surface-overlay","surface-modal"]
checks = []
for t in T:
    for txt in ["ink","ink-muted","accent-ink","positive","caution","critical"]:
        for s in surfs: checks.append((t, txt, s, 4.5))
    for txt, bg in [("ink","accent-soft"),("accent-ink","accent-soft"),("positive","positive-soft"),("caution","caution-soft"),("critical","critical-soft"),("ink","critical-soft"),("ink","positive-soft"),("ink","caution-soft"),("ink-muted","accent-soft"),("on-accent","accent"),("on-critical","critical")]:
        checks.append((t, txt, bg, 4.5))
    for s in ["surface-ground","surface-well","surface-raised","surface-trench"]:
        checks.append((t, "line-control", s, 3)); checks.append((t, "accent", s, 3))
    for pz in ["presence-1","presence-2","presence-3"]:
        checks.append((t, "on-presence", pz, 4.5))
        for s in surfs: checks.append((t, pz, s, 3))
fails = 0; worst = {}
for t, a, b, m in checks:
    r = cr(V[a][t], V[b][t])
    if r < m: fails += 1; print(f"FAIL {t:9} {a:12} on {b:16} {r:.2f} < {m}")
    k = (a, m); worst[k] = min(worst.get(k, 99), r)
print("fails:", fails)
for k, v in sorted(worst.items()): print(k, round(v, 2))
