// Members: invite by email with a role (the server turns away addresses already in the workspace, and the rest of the
// list is kept); change a role in its row (pending hovers, committed lands, failed drops; a conflict says who changed it
// and to what); remove someone with what they lose said first; custom roles behind the Business plan.
import * as React from 'react';
import {
  Avatar, Badge, Button, Dialog, FeatureGate, Field, PageHeader, PageHeaderDescription, PageHeaderTitle, PermissionMatrix,
  Radio, RadioGroup, RelativeTime, Select, SettingsSection, Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  TagInput, WorkflowStatus, useConsequentialAction, useDepth,
} from 'altitude-design';
import { DemoError, useDemoQuery } from '../shared/react';
import { PERMISSIONS, ROLE_NAMES, service } from './data';
import type { Grants, Member, PlanId, Role } from './data';
import { Resource, isKind, message } from './ui';

const ROLES: { value: Role; label: string; description: string }[] = [
  { value: 'admin', label: 'Admin', description: 'Manages members, billing and every project.' },
  { value: 'member', label: 'Member', description: 'Creates and edits projects they can see.' },
  { value: 'viewer', label: 'Viewer', description: 'Sees projects and leaves comments. Can’t edit.' },
];
type Write = 'pending' | 'committed' | 'failed' | undefined;

function MemberRow({ person, me, onlyOwner, onRole, onRemoved, say }: {
  person: Member; me: boolean; onlyOwner: boolean;
  onRole: (id: string, role: Role, rev?: number) => void; onRemoved: (p: Member) => void; say: (s: string) => void;
}) {
  const [write, setWrite] = React.useState<Write>(undefined);
  const [note, setNote] = React.useState('');
  const { style, ...depth } = useDepth({ status: write });
  const first = person.name.split(' ')[0];

  const changeRole = async (role: Role) => {
    const before = person.role, rev = person.rev;
    onRole(person.id, role); setWrite('pending'); setNote('Changing role…');
    try {
      const saved = await service.request<Member>('members.role', { id: person.id, role, rev });
      onRole(person.id, saved.role, saved.rev); setWrite('committed'); setNote('Role changed');
    } catch (e) {
      if (e instanceof DemoError && e.kind === 'conflict') {
        const now = e.current as Member | undefined;
        onRole(person.id, now?.role ?? before, now?.rev); setWrite('failed');
        setNote(`Someone else updated ${first} first, so this change wasn’t saved. ${first}’s role is ${now ? ROLE_NAMES[now.role] : 'unchanged'}. Choose again if you still want to change it.`);
        return;
      }
      if (isKind(e, 'lost-response')) {
        try {
          const now = (await service.request<Member[]>('members.list')).find((m) => m.id === person.id);
          if (now?.role === role) { onRole(person.id, role, now.rev); setWrite('committed'); setNote('Role changed'); return; }
        } catch { /* unknown: say it wasn't saved */ }
      }
      onRole(person.id, before); setWrite('failed'); setNote(`Couldn’t change the role. ${message(e)}`);
    }
  };

  const remove = useConsequentialAction<string>({
    target: person.name,
    consequence: person.invited ? `${person.email} won’t be able to join with this invitation.` : `${person.name} loses access to ${person.projects} projects and every shared dashboard. Their work stays in the workspace.`,
    requiresConfirmation: true,
    focusFallback: () => document.getElementById('ac-title'),
    execute: async () => {
      try { await service.request('members.remove', { id: person.id }); onRemoved(person); return { ok: true, value: person.id }; }
      catch (e) {
        if (isKind(e, 'lost-response')) {
          try { if (!(await service.request<Member[]>('members.list')).some((m) => m.id === person.id)) { onRemoved(person); return { ok: true, value: person.id }; } } catch { /* fall through */ }
        }
        return { ok: false, error: `We couldn’t remove ${person.invited ? 'the invitation' : first}. ${message(e)}` };
      }
    },
    messages: { pending: person.invited ? `Revoking the invitation to ${person.email}` : `Removing ${person.name}`, succeeded: person.invited ? `Invitation to ${person.email} revoked` : `${person.name} was removed` },
  });
  const resend = async () => {
    try { await service.request('members.resend', { id: person.id }); say(`Invitation resent to ${person.email}.`); }
    catch (e) { say(`We couldn’t resend the invitation. ${message(e)}`); }
  };

  return (
    <TableRow rowId={person.id} {...depth} style={style}>
      <TableCell>
        <div className="ac-who">
          <Avatar name={person.name} size={28} />
          <div><div className="ac-name">{person.name}{me && ' (you)'}</div>{!person.invited && <div className="ac-muted">{person.email}</div>}</div>
        </div>
      </TableCell>
      <TableCell>
        {person.invited
          ? <span className="ac-invited"><Badge>Invited</Badge> {ROLE_NAMES[person.role]} · sent {person.sentAt ? <RelativeTime date={person.sentAt} /> : 'recently'}</span>
          : onlyOwner
            ? <span className="ac-muted">Owner. You’re the only owner, so your role can’t change. Transfer ownership first.</span>
            : person.role === 'owner'
              ? <span>Owner</span>
              : <div className="ac-role">
                  <Select aria-label={`Role for ${person.name}`} value={person.role} onValueChange={(v) => void changeRole(v as Role)} items={ROLES.map(({ value, label }) => ({ value, label }))} disabled={write === 'pending'} />
                  <span className="ac-muted" role="status">{note}</span>
                </div>}
      </TableCell>
      <TableCell align="end">
        {person.invited
          ? <div className="ac-actions"><Button size="sm" variant="ghost" onClick={() => void resend()}>Resend</Button><Button size="sm" variant="ghost" onClick={remove.request}>Revoke</Button></div>
          : me || person.role === 'owner' ? null : <Button size="sm" variant="ghost" onClick={remove.request} aria-label={`Remove ${person.name}`}>Remove</Button>}
        <Dialog open={remove.phase === 'confirming' || remove.phase === 'pending' || remove.phase === 'failed'} background="stationary" size="sm" dismissible={remove.phase !== 'pending'}
          onOpenChange={(o) => { if (!o) remove.cancel(); }}
          title={person.invited ? `Revoke the invitation to ${person.email}?` : `Remove ${person.name}?`} description={remove.consequence}
          footer={<>
            <Button disabled={remove.phase === 'pending'} onClick={remove.cancel}>{person.invited ? 'Keep invitation' : `Keep ${first}`}</Button>
            <Button variant="danger" loading={remove.phase === 'pending'} onClick={remove.phase === 'failed' ? remove.retry : remove.confirm}>{person.invited ? 'Revoke invitation' : `Remove ${first}`}</Button>
          </>}>
          {remove.error && <p className="ac-error" role="alert">{remove.error}</p>}
        </Dialog>
      </TableCell>
    </TableRow>
  );
}

function Invite({ open, onClose, onSent }: { open: boolean; onClose: () => void; onSent: (people: Member[]) => void }) {
  const [emails, setEmails] = React.useState<string[]>([]);
  const [role, setRole] = React.useState<Role>('member');
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState('');
  React.useEffect(() => { if (open) { setEmails([]); setRole('member'); setError(''); } }, [open]);
  const send = async () => {
    if (!emails.length) { setError('Add at least one email address.'); return; }
    setSending(true); setError('');
    try { onSent(await service.request<Member[]>('members.invite', { emails, role })); onClose(); }
    catch (e) {
      if (isKind(e, 'lost-response')) {
        try {
          const list = await service.request<Member[]>('members.list');
          const sent = list.filter((m) => m.invited && emails.includes(m.email));
          if (sent.length === emails.length) { onSent(sent); onClose(); return; }
        } catch { /* fall through */ }
        setError('The connection dropped before we heard back. Check the member list before sending again.');
      } else setError(message(e));
    } finally { setSending(false); }
  };
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !sending) onClose(); }} dismissible={!sending} title="Invite people"
      description="They’ll get an email with a link to join Northwind."
      footer={<><Button disabled={sending} onClick={onClose}>Cancel</Button><Button variant="primary" loading={sending} onClick={() => void send()}>{sending ? 'Sending invites' : emails.length > 1 ? `Send ${emails.length} invites` : 'Send invite'}</Button></>}>
      <div className="ac-stack">
        <Field label="Email addresses" hint="Separate addresses with commas, or paste a list." error={error || undefined}>
          <TagInput value={emails} onValueChange={(v) => { setEmails(v); setError(''); }} noun={['address', 'addresses']} placeholder="name@northwind.dev" disabled={sending}
            normalize={(t) => t.trim().toLowerCase()} validate={(t) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t) ? undefined : `${t} isn’t an email address.`)} />
        </Field>
        <div className="ac-stack-tight">
          <span id="ac-invite-role" className="ac-label">Role</span>
          <RadioGroup value={role} onValueChange={(v) => setRole(v as Role)} aria-labelledby="ac-invite-role">
            {ROLES.map((r) => <Radio key={r.value} value={r.value} label={r.label} description={r.description} />)}
          </RadioGroup>
        </div>
      </div>
    </Dialog>
  );
}

function CustomRoles({ go }: { go: (to: 'billing') => void }) {
  const q = useDemoQuery<unknown, { grants: Grants; plan: PlanId }>(service, 'grants.get');
  return (
    <SettingsSection title="Custom roles" description="What each role can do. Owners can always do everything.">
      <Resource query={q} noun="roles">
        {({ grants, plan }) => plan === 'business'
          ? <PermissionMatrix aria-label="Permissions by role" roles={[{ id: 'owner', name: 'Owner', locked: true }, ...ROLES.map((r) => ({ id: r.value, name: r.label }))]}
              permissions={PERMISSIONS} value={grants}
              onChange={async (role, permission, granted) => {
                q.setData((d) => (d ? { ...d, grants: { ...d.grants, [role]: { ...d.grants[role], [permission]: granted } } } : d));
                try { await service.request('grants.set', { role, permission, granted }); }
                catch (e) { q.setData((d) => (d ? { ...d, grants: { ...d.grants, [role]: { ...d.grants[role], [permission]: !granted } } } : d)); throw e; }
              }} />
          : <FeatureGate requires="Business" description="Choose exactly what each role can do." onUpgrade={() => go('billing')}>
              <Button>Edit role permissions</Button>
            </FeatureGate>}
      </Resource>
    </SettingsSection>
  );
}

export function Members({ go }: { go: (to: 'billing') => void }) {
  const q = useDemoQuery<unknown, Member[]>(service, 'members.list');
  const [inviting, setInviting] = React.useState(false);
  const [status, setStatus] = React.useState('');
  const setRole = (id: string, role: Role, rev?: number) => q.setData((l) => l?.map((m) => (m.id === id ? { ...m, role, rev: rev ?? m.rev } : m)));
  return <>
    <PageHeader primary={<Button variant="primary" onClick={() => setInviting(true)}>Invite people</Button>}>
      <PageHeaderTitle id="ac-title" tabIndex={-1}>Members</PageHeaderTitle>
      <PageHeaderDescription>Who’s in Northwind, and what they can do.</PageHeaderDescription>
    </PageHeader>
    <div className="ac-body">
      <Resource query={q} noun="members">
        {(people) => {
          const owners = people.filter((p) => p.role === 'owner' && !p.invited).length;
          return (
            <Table aria-label="Members and invitations">
              <TableHeader><TableRow><TableHead>Person</TableHead><TableHead>Role</TableHead><TableHead align="end"><span className="ac-sr">Actions</span></TableHead></TableRow></TableHeader>
              <TableBody>
                {people.map((p) => <MemberRow key={p.id} person={p} me={p.id === 'u1'} onlyOwner={p.id === 'u1' && p.role === 'owner' && owners === 1}
                  onRole={setRole} say={setStatus}
                  onRemoved={(x) => { q.setData((l) => l?.filter((m) => m.id !== x.id)); setStatus(x.invited ? `Invitation to ${x.email} revoked.` : `${x.name} was removed.`); }} />)}
              </TableBody>
            </Table>
          );
        }}
      </Resource>
      <CustomRoles go={go} />
    </div>
    <Invite open={inviting} onClose={() => setInviting(false)} onSent={(sent) => {
      q.setData((l) => [...(l ?? []).filter((m) => !sent.some((s) => s.id === m.id)), ...sent]);
      setStatus(`${sent.length} ${sent.length === 1 ? 'invite' : 'invites'} sent.`);
    }} />
    <WorkflowStatus>{status}</WorkflowStatus>
  </>;
}
