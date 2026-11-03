// The Northwind workspace's simulated server (#401). Every write goes through here and leaves an entry in the audit log,
// so what you do in one section shows up in another. Versions (`rev`) make conflicts real: an external change bumps the
// version, and a save made against the old one is rejected with the current record.
import { createDemoService, reject } from '../shared/service';

export type Role = 'owner' | 'admin' | 'member' | 'viewer';
export type PlanId = 'free' | 'pro' | 'business';
export type Period = 'month' | 'year';

export interface Workspace { name: string; url: string; digest: boolean; mentions: boolean; rev: number; deleted?: boolean }
export interface Member { id: string; name: string; email: string; role: Role; projects: number; invited?: boolean; sentAt?: number; rev: number }
export interface Billing { plan: PlanId; period: Period; scheduled?: { plan: PlanId; on: string }; seats: number; storageGb: number; apiCallsM: number }
export interface ApiKey { id: string; name: string; tail: string; lastUsed: string; usedBy: string[] }
export interface Webhook { id: string; url: string; keyId: string | null; events: string[] }
export type AuditAction = 'workspace' | 'member' | 'role' | 'invite' | 'billing' | 'key' | 'webhook' | 'security' | 'permission';
export interface AuditEntry { id: string; actor: string; action: AuditAction; sentence: string; at: number; before: Record<string, string>; after: Record<string, string> }
export type Grants = Record<string, Record<string, boolean>>;

export interface Store {
  workspace: Workspace;
  members: Member[];
  billing: Billing;
  keys: ApiKey[];
  webhooks: Webhook[];
  grants: Grants;
  twoFactor: boolean;
  audit: AuditEntry[];
  seq: number;
}

export const ME = 'Maya Chen';
export const ROLE_NAMES: Record<Role, string> = { owner: 'Owner', admin: 'Admin', member: 'Member', viewer: 'Viewer' };
export const PLAN_NAMES: Record<PlanId, string> = { free: 'Free', pro: 'Pro', business: 'Business' };
export const PLAN_PRICE: Record<PlanId, { month: number; year: number }> = { free: { month: 0, year: 0 }, pro: { month: 2400, year: 2000 }, business: { month: 4800, year: 4000 } };
export const PERMISSIONS = [
  { id: 'projects.create', name: 'Create projects', group: 'Projects' },
  { id: 'projects.delete', name: 'Delete projects', group: 'Projects' },
  { id: 'members.invite', name: 'Invite people', group: 'People' },
  { id: 'billing.view', name: 'See billing', group: 'Billing' },
];
/** The code the example's authenticator shows. Real two-factor codes change every 30 seconds. */
export const EXAMPLE_CODE = '246810';
export const DOWNGRADE_DATE = '30 November';

const T0 = Date.UTC(2026, 10, 2, 9, 0);
const H = 3_600_000;

export const seed = (): Store => ({
  workspace: { name: 'Northwind', url: 'northwind', digest: true, mentions: true, rev: 1 },
  members: [
    { id: 'u1', name: 'Maya Chen', email: 'maya@northwind.dev', role: 'owner', projects: 14, rev: 1 },
    { id: 'u2', name: 'Theo Marsh', email: 'theo@northwind.dev', role: 'admin', projects: 9, rev: 1 },
    { id: 'u3', name: 'Ines Duarte', email: 'ines@northwind.dev', role: 'member', projects: 4, rev: 1 },
    { id: 'u4', name: 'Kofi Mensah', email: 'kofi@northwind.dev', role: 'viewer', projects: 2, rev: 1 },
    { id: 'i1', name: 'sam@northwind.dev', email: 'sam@northwind.dev', role: 'member', projects: 0, invited: true, sentAt: T0 - 20 * H, rev: 1 },
  ],
  billing: { plan: 'pro', period: 'month', seats: 4, storageGb: 62, apiCallsM: 0.84 },
  keys: [
    { id: 'k1', name: 'Production', tail: '4f2a', lastUsed: 'Used 3 minutes ago', usedBy: ['the billing service', 'the webhook to api.northwind.dev'] },
    { id: 'k2', name: 'CI pipeline', tail: '8d0e', lastUsed: 'Used yesterday', usedBy: [] },
  ],
  webhooks: [{ id: 'w1', url: 'https://api.northwind.dev/hooks/altitude', keyId: 'k1', events: ['invoice.paid', 'member.removed'] }],
  grants: {
    admin: { 'projects.create': true, 'projects.delete': true, 'members.invite': true, 'billing.view': true },
    member: { 'projects.create': true, 'projects.delete': false, 'members.invite': false, 'billing.view': false },
    viewer: { 'projects.create': false, 'projects.delete': false, 'members.invite': false, 'billing.view': false },
  },
  twoFactor: false,
  audit: [
    { id: 'a3', actor: 'Maya Chen', action: 'role', sentence: 'Maya Chen changed Kofi Mensah’s role from Member to Viewer', at: T0 - 4 * H, before: { role: 'Member' }, after: { role: 'Viewer' } },
    { id: 'a2', actor: 'Maya Chen', action: 'invite', sentence: 'Maya Chen invited sam@northwind.dev as a Member', at: T0 - 20 * H, before: {}, after: { invited: 'sam@northwind.dev', role: 'Member' } },
    { id: 'a1', actor: 'Theo Marsh', action: 'key', sentence: 'Theo Marsh created the CI pipeline API key', at: T0 - 26 * H, before: {}, after: { key: 'CI pipeline' } },
  ],
  seq: 10,
});

const audit = (s: Store, actor: string, action: AuditAction, sentence: string, before: Record<string, string> = {}, after: Record<string, string> = {}): Pick<Store, 'audit' | 'seq'> => ({
  audit: [{ id: `a${s.seq}`, actor, action, sentence, at: Date.now(), before, after }, ...s.audit],
  seq: s.seq + 1,
});
const member = (s: Store, id: string) => s.members.find((m) => m.id === id) ?? reject('not-found', 'That person isn’t in the workspace any more.');
const keyOf = (s: Store, id: string) => s.keys.find((k) => k.id === id) ?? reject('not-found', 'That key no longer exists.');
const rank = (p: PlanId) => ['free', 'pro', 'business'].indexOf(p);
const live = (s: Store) => { if (s.workspace.deleted) reject('not-found', 'This workspace was deleted.'); };

export const service = createDemoService<Store>({
  name: 'admin-console',
  seed,
  persist: true,
  handlers: {
    'workspace.get': { read: (s) => s.workspace },
    'workspace.save': {
      write: (s, d: { name: string; url: string; rev: number }) => {
        live(s);
        if (!d.name.trim()) reject('invalid', 'Enter a workspace name.', { field: 'name' });
        if (!/^[a-z0-9-]+$/.test(d.url)) reject('invalid', 'Use lowercase letters, numbers and hyphens.', { field: 'url' });
        if (d.url === 'acme') reject('invalid', 'altitude.app/acme is taken. Choose another URL.', { field: 'url' });
        if (d.rev !== s.workspace.rev) reject('conflict', 'Someone else changed these settings first.', { current: s.workspace });
        const before = s.workspace;
        if (before.name === d.name && before.url === d.url) return { state: s, result: before };
        const workspace = { ...before, name: d.name, url: d.url, rev: before.rev + 1 };
        const changed = before.name !== d.name ? `renamed the workspace from ${before.name} to ${d.name}` : `changed the workspace URL to altitude.app/${d.url}`;
        return { state: { ...s, workspace, ...audit(s, ME, 'workspace', `${ME} ${changed}`, { name: before.name, url: before.url }, { name: d.name, url: d.url }) }, result: workspace };
      },
      current: (s) => s.workspace,
    },
    'workspace.pref': {
      write: (s, d: { key: 'digest' | 'mentions'; value: boolean }) => {
        const workspace = { ...s.workspace, [d.key]: d.value };
        const what = d.key === 'digest' ? 'the weekly digest' : 'mention emails';
        return { state: { ...s, workspace, ...audit(s, ME, 'workspace', `${ME} turned ${d.value ? 'on' : 'off'} ${what}`, { [d.key]: d.value ? 'Off' : 'On' }, { [d.key]: d.value ? 'On' : 'Off' }) }, result: workspace };
      },
    },
    'workspace.delete': {
      write: (s) => ({ state: { ...s, workspace: { ...s.workspace, deleted: true }, ...audit(s, ME, 'workspace', `${ME} deleted the ${s.workspace.name} workspace`) }, result: true }),
    },

    'members.list': { read: (s) => s.members },
    'members.invite': {
      write: (s, d: { emails: string[]; role: Role }) => {
        const taken = d.emails.filter((e) => s.members.some((m) => m.email === e));
        if (taken.length) reject('invalid', `${taken.join(', ')} ${taken.length === 1 ? 'is' : 'are'} already in the workspace. Remove ${taken.length === 1 ? 'it' : 'them'} to send the rest.`, { field: 'emails' });
        let next = s;
        const invited: Member[] = d.emails.map((email, i) => ({ id: `i${s.seq + i}`, name: email, email, role: d.role, projects: 0, invited: true, sentAt: Date.now(), rev: 1 }));
        for (const m of invited) next = { ...next, ...audit(next, ME, 'invite', `${ME} invited ${m.email} as ${d.role === 'admin' ? 'an' : 'a'} ${ROLE_NAMES[d.role]}`, {}, { invited: m.email, role: ROLE_NAMES[d.role] }) };
        return { state: { ...next, members: [...s.members, ...invited], seq: next.seq + invited.length }, result: invited };
      },
    },
    'members.role': {
      write: (s, d: { id: string; role: Role; rev: number }) => {
        const m = member(s, d.id);
        if (m.role === d.role) return { state: s, result: m };
        if (m.rev !== d.rev) reject('conflict', `${m.name}’s role was changed by someone else.`, { current: m });
        const next = { ...m, role: d.role, rev: m.rev + 1 };
        return {
          state: { ...s, members: s.members.map((x) => (x.id === m.id ? next : x)), ...audit(s, ME, 'role', `${ME} changed ${m.name}’s role from ${ROLE_NAMES[m.role]} to ${ROLE_NAMES[d.role]}`, { role: ROLE_NAMES[m.role] }, { role: ROLE_NAMES[d.role] }) },
          result: next,
        };
      },
      current: (s, d: { id: string }) => s.members.find((m) => m.id === d.id),
    },
    'members.remove': {
      write: (s, d: { id: string }) => {
        const m = s.members.find((x) => x.id === d.id);
        if (!m) return { state: s, result: d.id }; // already gone: removing is idempotent
        const sentence = m.invited ? `${ME} revoked the invitation to ${m.email}` : `${ME} removed ${m.name} from the workspace`;
        return { state: { ...s, members: s.members.filter((x) => x.id !== d.id), ...audit(s, ME, m.invited ? 'invite' : 'member', sentence, { member: m.name }, {}) }, result: d.id };
      },
    },
    'members.resend': {
      write: (s, d: { id: string }) => {
        const m = member(s, d.id);
        return { state: { ...s, members: s.members.map((x) => (x.id === m.id ? { ...x, sentAt: Date.now() } : x)), ...audit(s, ME, 'invite', `${ME} resent the invitation to ${m.email}`) }, result: m };
      },
    },
    'grants.set': {
      write: (s, d: { role: string; permission: string; granted: boolean }) => {
        if (s.billing.plan !== 'business') reject('invalid', 'Custom roles need the Business plan.');
        const name = PERMISSIONS.find((p) => p.id === d.permission)?.name ?? d.permission;
        const grants = { ...s.grants, [d.role]: { ...s.grants[d.role], [d.permission]: d.granted } };
        const sentence = `${ME} ${d.granted ? 'allowed' : 'stopped allowing'} ${ROLE_NAMES[d.role as Role]}s to ${name.toLowerCase()}`;
        return { state: { ...s, grants, ...audit(s, ME, 'permission', sentence, { [name]: d.granted ? 'No' : 'Yes' }, { [name]: d.granted ? 'Yes' : 'No' }) }, result: grants };
      },
    },
    'grants.get': { read: (s) => ({ grants: s.grants, plan: s.billing.plan }) },

    'billing.get': { read: (s) => s.billing },
    'billing.change': {
      write: (s, d: { plan: PlanId; period: Period }) => {
        const b = s.billing;
        if (d.plan === b.plan && !b.scheduled) reject('invalid', `You’re already on ${PLAN_NAMES[d.plan]}.`, { field: 'plan' });
        if (d.plan === b.plan && b.scheduled) {
          // Choosing the current plan again cancels a scheduled downgrade.
          const billing = { ...b, scheduled: undefined, period: d.period };
          return { state: { ...s, billing, ...audit(s, ME, 'billing', `${ME} kept the ${PLAN_NAMES[b.plan]} plan, cancelling the change to ${PLAN_NAMES[b.scheduled.plan]}`) }, result: billing };
        }
        if (b.scheduled?.plan === d.plan) reject('invalid', `The change to ${PLAN_NAMES[d.plan]} is already scheduled.`, { field: 'plan' });
        const down = rank(d.plan) < rank(b.plan);
        const billing: Billing = down ? { ...b, scheduled: { plan: d.plan, on: DOWNGRADE_DATE } } : { ...b, plan: d.plan, period: d.period, scheduled: undefined };
        const sentence = down ? `${ME} scheduled a downgrade from ${PLAN_NAMES[b.plan]} to ${PLAN_NAMES[d.plan]} on ${DOWNGRADE_DATE}` : `${ME} upgraded from ${PLAN_NAMES[b.plan]} to ${PLAN_NAMES[d.plan]}`;
        return { state: { ...s, billing, ...audit(s, ME, 'billing', sentence, { plan: PLAN_NAMES[b.plan] }, { plan: PLAN_NAMES[d.plan] }) }, result: billing };
      },
    },

    'developer.get': { read: (s) => ({ keys: s.keys, webhooks: s.webhooks }) },
    'keys.create': {
      write: (s, d: { name: string }) => {
        if (!d.name.trim()) reject('invalid', 'Name the key, like “Billing service”.', { field: 'name' });
        const id = `k${s.seq}`;
        const tail = (s.seq * 7919).toString(36).slice(-4);
        const k: ApiKey = { id, name: d.name.trim(), tail, lastUsed: 'Never used', usedBy: [] };
        return { state: { ...s, keys: [...s.keys, k], ...audit(s, ME, 'key', `${ME} created the ${k.name} API key`, {}, { key: k.name }) }, result: { key: k, secret: `ak_live_EXAMPLE_${id}${tail}` } };
      },
    },
    'keys.revoke': {
      write: (s, d: { id: string }) => {
        const k = s.keys.find((x) => x.id === d.id);
        if (!k) return { state: s, result: d.id }; // already revoked
        const webhooks = s.webhooks.map((w) => (w.keyId === k.id ? { ...w, keyId: null } : w));
        return { state: { ...s, keys: s.keys.filter((x) => x.id !== k.id), webhooks, ...audit(s, ME, 'key', `${ME} revoked the ${k.name} API key`, { key: `ak_live_••••${k.tail}` }, {}) }, result: d.id };
      },
    },
    'webhooks.setKey': {
      write: (s, d: { id: string; keyId: string }) => {
        const k = keyOf(s, d.keyId);
        const webhooks = s.webhooks.map((w) => (w.id === d.id ? { ...w, keyId: k.id } : w));
        const keys = s.keys.map((x) => (x.id === k.id && !x.usedBy.includes('the webhook to api.northwind.dev') ? { ...x, usedBy: [...x.usedBy, 'the webhook to api.northwind.dev'] } : x));
        return { state: { ...s, webhooks, keys, ...audit(s, ME, 'webhook', `${ME} signed the webhook with the ${k.name} key`, {}, { key: k.name }) }, result: webhooks };
      },
    },

    'security.get': { read: (s) => ({ twoFactor: s.twoFactor }) },
    'security.enable': {
      write: (s, d: { code: string }) => {
        if (d.code !== EXAMPLE_CODE) reject('invalid', 'That code doesn’t match. Check your authenticator and try again.', { field: 'code' });
        if (s.twoFactor) return { state: s, result: true };
        return { state: { ...s, twoFactor: true, ...audit(s, ME, 'security', `${ME} turned on two-factor authentication`, { twoFactor: 'Off' }, { twoFactor: 'On' }) }, result: true };
      },
    },
    'security.disable': {
      write: (s) => (s.twoFactor ? { state: { ...s, twoFactor: false, ...audit(s, ME, 'security', `${ME} turned off two-factor authentication`, { twoFactor: 'On' }, { twoFactor: 'Off' }) }, result: false } : { state: s, result: false }),
    },

    'audit.list': { read: (s) => ({ entries: s.audit, plan: s.billing.plan, scheduled: s.billing.scheduled }) },
  },
});

/** Things other admins do while you work. Each bumps a version, so a save against the old one conflicts. */
export const events = [
  {
    label: 'Theo renames the workspace',
    run: () => service.external('Theo Marsh renames the workspace', (s) => {
      const name = s.workspace.name === 'Northwind Labs' ? 'Northwind Studio' : 'Northwind Labs';
      return { ...s, workspace: { ...s.workspace, name, rev: s.workspace.rev + 1 }, ...audit(s, 'Theo Marsh', 'workspace', `Theo Marsh renamed the workspace from ${s.workspace.name} to ${name}`, { name: s.workspace.name }, { name }) };
    }),
  },
  {
    label: 'Theo changes Ines’s role',
    run: () => service.external('Theo Marsh changes Ines Duarte’s role', (s) => {
      const m = s.members.find((x) => x.id === 'u3');
      if (!m) return s;
      const role: Role = m.role === 'admin' ? 'viewer' : 'admin';
      return { ...s, members: s.members.map((x) => (x.id === 'u3' ? { ...x, role, rev: x.rev + 1 } : x)), ...audit(s, 'Theo Marsh', 'role', `Theo Marsh changed Ines Duarte’s role from ${ROLE_NAMES[m.role]} to ${ROLE_NAMES[role]}`, { role: ROLE_NAMES[m.role] }, { role: ROLE_NAMES[role] }) };
    }),
  },
  {
    label: 'Sam accepts the invitation',
    run: () => service.external('sam@northwind.dev accepts the invitation', (s) => {
      if (!s.members.some((x) => x.id === 'i1' && x.invited)) return s;
      return { ...s, members: s.members.map((x) => (x.id === 'i1' ? { ...x, name: 'Sam Okafor', invited: false, sentAt: undefined, rev: x.rev + 1 } : x)), ...audit(s, 'Sam Okafor', 'member', 'Sam Okafor joined the workspace from an invitation') };
    }),
  },
];
