# Members

Help someone manage who belongs to a workspace: invite people by email with a role, see invitations still waiting, resend or revoke them, change someone's role, remove someone, and transfer ownership. It composes [Consequential action](consequential-action.md) for removal and ownership transfer; role changes apply immediately, as in [Settings](settings.md).

## Inputs and ownership

Supply the current members and invitations with their roles, the acting person's identity and permissions, an invite adapter that reports a result per address (sent, already a member, refused), a role-change adapter, a removal adapter, and for each role a sentence that says what it can do. The application owns authorization (every guard below must also be enforced by the server), invitation delivery and expiry, seat limits, and what happens to a removed person's work.

## States and transitions

An invitation awaiting acceptance is **settled**: it is a record of an offer and nothing is in flight. Draw it on the ground with a flush `Badge` "Invited", the role it grants, when it was sent, and Resend and Revoke. Only the moment of sending is pending. Invite: addresses enter a `TagInput`, which refuses an invalid address with the reason ("nope isn't an email address."); the role is chosen from a `RadioGroup` whose options say what each role can do; Send is pending until the service answers, then each new invitation lands with the afterglow and the result is said per address ("2 invites sent, 1 address is already in the workspace."). Role change: applies immediately per row; pending hovers ("Changing role…"), committed lands ("Role changed"), failed drops into a trench, says so and restores the previous role. Custom roles are edited with `PermissionMatrix`. Remove: a consequential action whose confirmation names what the person loses ("Theo loses access to 9 projects…") and whether their work stays; it is said once the service confirms. Revoke: removes the invitation and says so.

**Guards**: nobody can remove the last owner or demote themselves out of the last admin or owner role. Don't offer a disabled control; say the reason in words where the action would be ("You're the only owner, so your role can't change. Transfer ownership first."). Transferring ownership is itself a consequential action.

## Content, keyboard, focus and announcements

Every row's controls are named with the person ("Role for Theo Marsh"). The Send button says how many invites it sends. Results are announced politely in one status region, never one announcement per address. After a removal or revocation, focus goes to a logical neighbour or the section heading, never the page body. Tables keep a minimum width and scroll horizontally on narrow screens rather than crushing names; long names and addresses wrap at word boundaries. Verify forced colors (the Invited plate's outline and a failed row's dashed border remain), reduced motion, zoom and RTL.

## Recovery and working implementation

A failed invite keeps the addresses that weren't sent in the field. A failed role change restores the role and can be repeated. A failed removal keeps the person and says nothing changed. The working example in `build/fixtures/patterns/members.jsx` (shipped as `references/build/fixtures/patterns/members.jsx`) composes invitations, a per-row role change with a failing demo service, the only-owner guard, removal with consequence and revocation. It is also the Storybook preview "Patterns/MembersPattern". [Metadata](members.json) names the runtime and verification sources.

## Rules, verification and evidence

`ALT-MEMBERS-001` covers settled invitations and guards stated in words; `ALT-ACTION-001` covers removal and transfer; `ALT-STATUS-001` covers announcements; `ALT-VISUAL-003` covers states that don't rise. `build/checks/members-pattern.mjs` checks the example in a browser: refused addresses, the pending send, settled invitation rows, per-address results, the owner guard, the role change's three states, removal and revocation. See [rules](../rules.json). How well people understand role descriptions still needs evaluation with representative users.

See [running examples and verification](../principles.md#run-the-examples-and-verification) for the installed example command, repository test command, and the limits of shipped test-reference snapshots.
