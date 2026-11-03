// Audit log: every change made in this session, by you or another admin, as one sentence each, filterable and paged;
// an entry expands to show what changed. A scheduled downgrade to Free says the log goes with it.
import * as React from 'react';
import { Alert, DataTable, Link, DiffView, FilterBar, PageHeader, PageHeaderDescription, PageHeaderTitle, RelativeTime } from 'altitude-design';
import type { Filter, FilterField } from 'altitude-design';
import { useDemoQuery } from '../shared/react';
import { PLAN_NAMES, service } from './data';
import type { AuditAction, AuditEntry, Billing, PlanId } from './data';
import { Resource } from './ui';

const ACTIONS: { value: AuditAction; label: string }[] = [
  { value: 'workspace', label: 'Workspace settings' }, { value: 'member', label: 'Members joined or removed' }, { value: 'role', label: 'Roles' },
  { value: 'invite', label: 'Invitations' }, { value: 'billing', label: 'Billing' }, { value: 'key', label: 'API keys' }, { value: 'webhook', label: 'Webhooks' },
  { value: 'security', label: 'Security' }, { value: 'permission', label: 'Permissions' },
];
const PAGE = 6;

export function Audit({ go }: { go: (to: 'billing') => void }) {
  const q = useDemoQuery<unknown, { entries: AuditEntry[]; plan: PlanId; scheduled?: Billing['scheduled'] }>(service, 'audit.list');
  const [filters, setFilters] = React.useState<Filter[]>([]);
  const [page, setPage] = React.useState(1);
  return <>
    <PageHeader>
      <PageHeaderTitle id="ac-title" tabIndex={-1}>Audit log</PageHeaderTitle>
      <PageHeaderDescription>Every change in Fenwick Tools, newest first. Kept for 90 days on Pro and Business.</PageHeaderDescription>
    </PageHeader>
    <div className="ac-body">
      <Resource query={q} noun="the audit log">
        {({ entries, scheduled }) => {
          const actors = [...new Set(entries.map((e) => e.actor))].map((a) => ({ value: a, label: a }));
          const fields: FilterField[] = [{ key: 'actor', label: 'Who', type: 'enum', options: actors }, { key: 'action', label: 'What', type: 'enum', options: ACTIONS }];
          const matching = entries.filter((e) => filters.every((f) => f.value === undefined || f.value === '' || (f.operator === 'is not' ? e[f.field as 'actor' | 'action'] !== f.value : e[f.field as 'actor' | 'action'] === f.value)));
          const pageCount = Math.max(1, Math.ceil(matching.length / PAGE));
          const at = Math.min(page, pageCount);
          return <>
            {scheduled?.plan === 'free' && (
              <Alert tone="caution" title={`The audit log is deleted on ${scheduled.on}`} action={<Link href="#/billing" onClick={(e: React.MouseEvent) => { e.preventDefault(); go('billing'); }}>Review the plan change</Link>}>
                Your plan changes to {PLAN_NAMES.free} then, which doesn’t keep an audit log.
              </Alert>
            )}
            <FilterBar aria-label="Filter events" fields={fields} value={filters} onValueChange={(f: Filter[]) => { setFilters(f); setPage(1); }} resultCount={matching.length} />
            <DataTable aria-label="Audit log events" noun="events" rows={matching.slice((at - 1) * PAGE, at * PAGE)} getRowId={(r) => r.id} getRowLabel={(r) => r.sentence}
              empty="No events match these filters. Remove a filter to see more."
              columns={[
                { key: 'sentence', header: 'Event', width: '58%' },
                { key: 'actor', header: 'Who' },
                { key: 'at', header: 'When', cell: (r) => <RelativeTime date={r.at} locale="en-IE" /> },
              ]}
              renderExpanded={(r) => (Object.keys(r.before).length || Object.keys(r.after).length
                ? <DiffView mode="properties" before={r.before} after={r.after} caption="What changed" />
                : <p className="ac-muted">No details were recorded for this event.</p>)}
              pagination={{ page: at, pageCount, total: matching.length, onPageChange: setPage, noun: 'events' }} />
          </>;
        }}
      </Resource>
    </div>
  </>;
}
