# Actions in place human validation protocol

Status: prepared, not executed. No participant sessions or screen-reader results are claimed.

## Before testing

Use the local Storybook generated from this branch (`npm run storybook`) and the three previews Inputs/InlineEdit, Overlays/Dialog and Patterns/ActionsInPlace. Open the complete Files view from the pattern's link. Use only the fictional fixtures. Record commit, operating system, browser/version, assistive technology/version, input method, scheme, motion/contrast settings, browser zoom, physical viewport and effective CSS viewport. Reset between trials; keep the fixture on success-100 for ordinary task comparisons.

Recruit six to eight participants, including varied access/input needs. Obtain consent under the team's normal process. Keep participant identifiers and raw personal notes outside this repository. Use anonymous session codes in aggregate findings. Do not publish identifying access details.

## Counterbalancing

Alternate the first interaction container (inline vs dialog rename baseline) and the first dialog background (default vs stationary). For four order groups: inline/default, dialog/default, inline/stationary, dialog/stationary. Allocate successive sessions across those groups, then repeat. Rotate equivalent filename/task sets so learning a target does not determine the result. The similar names Brand guidelines.pdf and Brand guidelines draft.pdf are intentional.

The baseline is under the collapsed documentation harness and uses the same adapter, target and validation as InlineEdit. Compare one variable at a time. Reset identical records before each dialog-background trial. Keep Cancel initial focus and exact consequence identical.

Use these equivalent task cards in alternating order. Both containers operate on the same starting record after reset; the requested saved name changes to reduce recall of the previous trial.

| Card set | Title rename | Filename rename | Destructive target |
|---|---|---|---|
| A | Prepare launch checklist → Review launch checklist | Brand guidelines.pdf → Brand guidelines v2.pdf | Brand guidelines.pdf, Brand folder |
| B | Prepare launch checklist → Update launch checklist | Brand guidelines.pdf → Brand guidelines v3.pdf | Brand guidelines draft.pdf, Brand folder |

For each paired default/stationary deletion comparison, use the same target from its assigned card set and reset first. Rotate card sets between pairs/participants, not between the two presentations of one pair. The observer selects fixtures outside the product scene before handing over.

## Task script

1. Rename “Prepare launch checklist”; then edit the filename table cell. Ask the participant to point to the saved value. Do not explain the implementation.
2. Begin another rename and cancel it. Ask which value is saved. Repeat with dialog rename baseline in the assigned order.
3. With fail-once selected before mounting, attempt a rename. Ask the participant to correct or retry. Observe whether retained text is understood. Repeat with slow validation/save as appropriate to access testing.
4. Archive Brand guidelines.pdf. Ask the participant to recover it immediately. Do not tell them where Undo is.
5. Archive it again, dismiss the local recovery message, perform another ordinary action, then ask them to recover it later. Observe discovery of Archived → Restore.
6. Archive both similarly named files. Ask them to delete one specified file permanently, naming the folder/disambiguator. Before confirming, ask which file is targeted and what can be recovered afterward. Run the two background variants in assigned order.
7. Cancel a permanent-delete decision. Confirm that no mutation occurred. Then use success-1200, dispatch deletion and Close during the write. Ask what they expect to happen; observe the eventual outcome and focus.
8. For assistive-technology checks, repeat failure, conflict, uncertain acknowledgement and pending Close → open another confirmation. Verify that announcements name the current target, input/error association is usable, and earlier completion does not replace later context.

## Access checks requiring an operator

- VoiceOver with Safari: names, groups/labels, initial focus, reading order, alert/status announcements, retained errors/conflicts, close and removed-invoker recovery.
- A Windows screen reader/browser combination: repeat critical editing, recovery and confirmation routes, including forced colors.
- Keyboard only: no mouse assistance; input → Save → Cancel; IME composition Enter/Escape; title/panel Tab directions; zero-tabbable and dynamically removed modal targets.
- Physical touch device with its on-screen keyboard: all actions discoverable without hover, editing and dialog controls visible, page scroll/keyboard coverage usable.
- Actual browser zoom at 200% and magnification used by the participant: record effective CSS width separately from screenshot DPR. Reduced motion, increased contrast and forced colors remain understandable.

## Observation and decision rules

Record completion, wrong-target actions, remembered target name, accidental commits, lost input, cancellation/recovery success, focus loss and observed hesitation. Note the observed event and fixture rather than assigning an inferred cause. Structural activation counts are not measured performance: rename 2→2 with 1→0 modals; archive 2→1 when its baseline confirms; permanent delete 2→2. Count Enter as an activation; exclude typing.

Accept only after specified behavior is demonstrated, critical engineering checks pass and observed blockers are resolved. Lost input, wrong-target commitment, inaccessible recovery, broken focus or repeated state confusion require revision and repetition of affected tasks. Keep the decision open when access testing is missing or findings conflict. No statistical pass percentage is appropriate for this sample.

## Evidence template

Copy this blank template into the team's private study records. Commit only an anonymous aggregate summary.

- Session code/date:
- Build commit:
- OS/browser/version:
- AT/version and input method:
- Scheme/motion/contrast/zoom; physical and effective CSS viewport:
- Trial order and equivalent filename set:
- Fixture and task:
- Completion and target correctness:
- Cancellation/recovery and retained input:
- Announcements, focus destination and sequence:
- Observed hesitation or state confusion (description, not invented timing):
- Failure evidence and reproduction:
- Severity, owner, fix and repeated-task outcome:

Aggregate decision record:

| Gate | Evidence | Decision | Outstanding action |
|---|---|---|---|
| Six to eight counterbalanced sessions | Not run | Open | Recruit and conduct |
| VoiceOver/Safari | Not run | Open | Qualified operator |
| Windows screen reader/browser | Not available in current environment | Open | External test environment |
| Touch keyboard and magnification | Not run with physical device/operator | Open | Device/access testing |
| Observed blocker remediation | No sessions yet | Open | Record, fix, repeat affected tasks |

## Deferred abstraction decisions

EditRegion: defer; these are single-line consumers and provide no evidence from two real multi-field consumers.

ConfirmAction: defer; two demonstrations in one library are not multiple independent applications repeating a stable contract.

Generic action hook/framework: defer; demo adapters remain application code. Repeated async mechanics alone do not justify inferring risk, persistence or reversibility.
