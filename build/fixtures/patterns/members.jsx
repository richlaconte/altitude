// Members pattern (project/framework/patterns/members.md): invite people by email with a role, see pending invitations,
// change someone's role, remove someone. An invitation awaiting acceptance is settled (ground, an "Invited" plate);
// only sending it hovers. Role changes apply now, per row. The only owner can't demote themselves, and the reason is
// said where the control would be. Removing someone names what they lose.
// The lines between the preview markers are its "MembersPattern" preview (scripts/pattern-previews.mjs copies them);
// build/checks/pattern-types.mjs type-checks this file against the public declarations and fails if the two differ.
import * as React from 'react';
import * as A from 'altitude-design';
// preview:start
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const ROLES = [
  { value: 'admin', label: 'Admin', description: 'Manages members, billing and every project.' },
  { value: 'member', label: 'Member', description: 'Creates and edits projects they can see.' },
  { value: 'viewer', label: 'Viewer', description: 'Sees projects and leaves comments. Can’t edit.' },
];
const roleName = (v) => (v === 'owner' ? 'Owner' : ROLES.find((r) => r.value === v)?.label);
function MemberRow({ person, me, owners, fail, onRole, onRemove, onResend, onRevoke }) {
  const [write, setWrite] = React.useState(/** @type {A.DepthProps['status']} */ (undefined));
  const row = React.useRef(null);
  const remove = A.useConsequentialAction({
    target: person.name, consequence: `${person.name} loses access to ${person.projects} projects and every shared dashboard. Their work stays in the workspace.`,
    requiresConfirmation: true, focusFallback: () => document.getElementById('mb-heading'),
    execute: async () => { await wait(700); onRemove(person); return { ok: true, value: person.id }; },
    messages: { pending: `Removing ${person.name}`, succeeded: `${person.name} was removed` },
  });
  const { style, ...depth } = A.useDepth({ status: write, settle: person.invitedAt ? true : undefined });
  const changeRole = async (role) => {
    const before = person.role; onRole(person.id, role); setWrite('pending');
    await wait(800);
    if (fail.current) { onRole(person.id, before); setWrite('failed'); } else setWrite('committed');
  };
  const onlyOwner = person.role === 'owner' && owners === 1;
  return (
    <A.TableRow ref={row} rowId={person.id} {...depth} style={style}>
      <A.TableCell><div className="mb-who"><A.Avatar name={person.name} size={28} /><div><div className="mb-name">{person.name}{person.id === me && ' (you)'}</div><div className="mb-email">{person.email}</div></div></div></A.TableCell>
      <A.TableCell>
        {person.invited ? <span className="mb-invited"><A.Badge>Invited</A.Badge> {roleName(person.role)} · sent {person.sent}</span>
          : onlyOwner ? <span className="mb-reason">Owner. You’re the only owner, so your role can’t change. Transfer ownership first.</span>
          : <div className="mb-role"><A.Select aria-label={`Role for ${person.name}`} value={person.role} onValueChange={changeRole} items={ROLES.map(({ value, label }) => ({ value, label }))} />
              <span className="mb-write" role="status">{write === 'pending' ? 'Changing role…' : write === 'failed' ? 'Couldn’t change the role. Try again.' : write === 'committed' ? 'Role changed' : ''}</span></div>}
      </A.TableCell>
      <A.TableCell align="end">
        {person.invited ? <div className="mb-actions"><A.Button size="sm" variant="ghost" onClick={() => onResend(person)}>Resend</A.Button><A.Button size="sm" variant="ghost" onClick={() => onRevoke(person)}>Revoke</A.Button></div>
          : onlyOwner || person.id === me ? null
          : <A.Button size="sm" variant="ghost" onClick={remove.request}>Remove</A.Button>}
        <A.Dialog open={['confirming', 'pending', 'failed'].includes(remove.phase)} background="stationary" size="sm" dismissible={remove.phase !== 'pending'}
          onOpenChange={(o) => { if (!o) remove.cancel(); }} title={`Remove ${person.name}?`} description={remove.consequence}
          footer={<><A.Button disabled={remove.phase === 'pending'} onClick={remove.cancel}>Keep {person.name.split(' ')[0]}</A.Button><A.Button variant="danger" disabled={remove.phase === 'pending'} onClick={remove.confirm}>{remove.phase === 'pending' ? 'Removing' : `Remove ${person.name.split(' ')[0]}`}</A.Button></>} />
      </A.TableCell>
    </A.TableRow>
  );
}
function App() {
  const me = 'u1';
  const [people, setPeople] = React.useState([
    { id: 'u1', name: 'Maya Chen', email: 'maya@acme.dev', role: 'owner', projects: 14 },
    { id: 'u2', name: 'Theo Marsh', email: 'theo@acme.dev', role: 'admin', projects: 9 },
    { id: 'u3', name: 'Ines Duarte', email: 'ines@acme.dev', role: 'member', projects: 4 },
    { id: 'i1', name: 'sam@acme.dev', email: 'Invitation', role: 'member', invited: true, sent: 'yesterday', projects: 0 },
  ]);
  const [emails, setEmails] = React.useState(/** @type {string[]} */ ([]));
  const [role, setRole] = React.useState('member');
  const [sending, setSending] = React.useState(false);
  const [status, setStatus] = React.useState('');
  const [failNext, setFailNext] = React.useState(false);
  const fail = React.useRef(false); fail.current = failNext;
  const owners = people.filter((p) => p.role === 'owner').length;
  const send = async () => {
    setSending(true); setStatus('Sending invites…');
    await wait(900);
    const known = new Set(people.map((p) => p.name).concat(people.map((p) => p.email)));
    const fresh = emails.filter((e) => !known.has(e)), already = emails.length - fresh.length;
    const at = Date.now();
    setPeople((list) => list.concat(fresh.map((e, i) => ({ id: 'i' + at + i, name: e, email: 'Invitation', role, invited: true, sent: 'just now', invitedAt: at, projects: 0 }))));
    setEmails([]); setSending(false);
    setStatus([fresh.length && `${fresh.length} ${fresh.length === 1 ? 'invite' : 'invites'} sent`, already && `${already} ${already === 1 ? 'address is' : 'addresses are'} already in the workspace`].filter(Boolean).join(', ') + '.');
  };
  return (
    <main className="mb-page">
      <h2 id="mb-heading" tabIndex={-1} className="mb-h">Members</h2>
      <A.Card className="mb-invite" aria-labelledby="mb-invite-h">
        <h3 id="mb-invite-h" className="mb-sub">Invite people</h3>
        <A.Field label="Email addresses" hint="Separate addresses with commas, or paste a list.">
          <A.TagInput value={emails} onValueChange={setEmails} noun={['address', 'addresses']} placeholder="name@acme.dev" disabled={sending}
            normalize={(t) => t.trim().toLowerCase()} validate={(t) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t) ? undefined : `${t} isn’t an email address.`)} />
        </A.Field>
        <div className="mb-roles"><span id="mb-role-label" className="mb-legend">Role</span>
          <A.RadioGroup value={role} onValueChange={setRole} aria-labelledby="mb-role-label">{ROLES.map((r) => <A.Radio key={r.value} value={r.value} label={r.label} description={r.description} />)}</A.RadioGroup>
        </div>
        <div><A.Button variant="primary" loading={sending} disabled={!emails.length} onClick={send}>{sending ? 'Sending invites' : emails.length > 1 ? `Send ${emails.length} invites` : 'Send invite'}</A.Button></div>
      </A.Card>
      <A.Switch label="Make the next role change fail" checked={failNext} onCheckedChange={setFailNext} />
      <A.Table aria-label="Members and invitations">
        <A.TableHeader><A.TableRow><A.TableHead>Person</A.TableHead><A.TableHead>Role</A.TableHead><A.TableHead align="end"><span className="mb-vh">Actions</span></A.TableHead></A.TableRow></A.TableHeader>
        <A.TableBody>{people.map((p) => <MemberRow key={p.id} person={p} me={me} owners={owners} fail={fail}
          onRole={(id, r) => setPeople((l) => l.map((x) => (x.id === id ? { ...x, role: r } : x)))}
          onRemove={(x) => { setPeople((l) => l.filter((y) => y.id !== x.id)); setStatus(`${x.name} was removed.`); }}
          onResend={(x) => setStatus(`Invite resent to ${x.name}.`)}
          onRevoke={(x) => { setPeople((l) => l.filter((y) => y.id !== x.id)); setStatus(`Invitation to ${x.name} revoked.`); document.getElementById('mb-heading')?.focus(); }} />)}</A.TableBody>
      </A.Table>
      <A.WorkflowStatus>{status}</A.WorkflowStatus>
    </main>
  );
}
// preview:end
export default App;
