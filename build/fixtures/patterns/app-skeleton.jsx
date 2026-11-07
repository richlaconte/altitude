// Records skeleton: bounded customer edits, not a starting frame for every SaaS app.
//   Task: find a customer, edit Plan or Seats, then resume the same filtered/paged queue.
//   Lead: the customer table. Primary action: Add customer. Next: continue scanning customers.
//   Detail: modal Sheet for one short edit; the queue may pause. See the detail-surface chooser in
//   project/framework/patterns/screen-layout.md#choose-the-detail-surface before changing that task.
//   Source: stable customer ID, repeated name/identifier; bulk selection is separate from current detail.
//   Layout: overlay, no opening-induced table reflow; not reserved comparison space.
//   Boundary: long history, sustained work or several-record comparison needs reserved detail or a route;
//   the injected long-content check proves scrolling/close reachability, not task suitability.
//   Focus: enter from the named customer button; close returns there. If it disappeared, Customers heading
//   is the named fallback after isolation releases, unless focus already moved to a meaningful destination.
//   Evidence: engineering checks only; a reported 2/5 long anchored-detail choice is not design approval.
// Sheet is level 4. Dialog and CommandPalette alone form the level-5 summit. Public APIs stay unchanged.
// The lines between the preview markers are the "AppSkeleton" preview (scripts/pattern-previews.mjs copies them);
// build/checks/pattern-types.mjs type-checks this file against the public declarations and fails if the two differ.
// preview-name: AppSkeleton
import * as React from 'react';
import * as A from 'altitude-design';
// preview:start
const I = ({ d }) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
const ICONS = { customers: 'M16 19v-1a4 4 0 0 0-8 0v1M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6', reports: 'M5 20V10M12 20V4M19 20v-7', settings: 'M4 7h10M18 7h2M4 17h4M12 17h8M14 5v4M8 15v4' };
const PLANS = [{ value: 'Free', label: 'Free' }, { value: 'Pro', label: 'Pro' }, { value: 'Business', label: 'Business' }];
const PEOPLE = ['Ada Lovelace', 'Grace Hopper', 'Alan Turing', 'Katherine Johnson', 'Hedy Lamarr', 'Edsger Dijkstra', 'Barbara Liskov', 'Donald Knuth', 'Margaret Hamilton', 'Ken Thompson', 'Radia Perlman', 'Tim Berners-Lee'];
const SEED = PEOPLE.map((name, i) => ({ id: 'c' + i, name, email: name.split(' ')[0].toLowerCase() + '@example.com', plan: PLANS[i % 3].value, seats: 3 + ((i * 7) % 40) }));
const FIELDS = /** @type {A.FilterField[]} */ ([{ key: 'plan', label: 'Plan', type: 'enum', options: PLANS }, { key: 'name', label: 'Name', type: 'text' }]);
const matches = (row, f) => f.value === undefined || f.value === '' || (f.operator === 'is' ? row[f.field] === f.value : f.operator === 'is not' ? row[f.field] !== f.value
  : f.operator === 'contains' ? String(row[f.field]).toLowerCase().includes(String(f.value).toLowerCase()) : !String(row[f.field]).toLowerCase().includes(String(f.value).toLowerCase()));
function Customers() {
  const [rows, setRows] = React.useState(SEED);
  const [filters, setFilters] = React.useState(/** @type {A.Filter[]} */ ([]));
  const [page, setPage] = React.useState(1);
  const [selected, setSelected] = React.useState(/** @type {string[]} */ ([]));
  const [open, setOpen] = React.useState(/** @type {string | null} */ (null));
  const sourceId = React.useRef(/** @type {string | null} */ (null));
  const openRecord = (row) => {
    // A click on a non-button cell still enters from the row's named control, so return is predictable.
    sourceId.current = row.id;
    document.getElementById(`sk-customer-${row.id}`)?.closest('button')?.focus();
    setOpen(row.id);
  };
  React.useEffect(() => {
    if (open || !sourceId.current) return;
    const heading = document.getElementById('sk-customers-title');
    if (!heading) return;
    // Sheet retains isolation through its exit. Observe that contract rather than guessing its duration.
    // The normal surviving-source return remains Sheet's responsibility.
    const restore = () => {
      if (heading.closest('[inert]')) return;
      // A re-render can replace the control without removing the record. Resolve its current node by ID.
      const trigger = document.getElementById(`sk-customer-${sourceId.current}`)?.closest('button');
      const available = trigger?.isConnected && trigger.getClientRects().length && !trigger.matches(':disabled') && !trigger.closest('[inert]');
      const active = document.activeElement;
      if (active === document.body || active?.contains(heading)) (available ? trigger : heading)?.focus({ preventScroll: true });
      sourceId.current = null;
      observer.disconnect();
    };
    const observer = new MutationObserver(restore);
    observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['inert'] });
    restore();
    return () => observer.disconnect();
  }, [open]);
  const shown = rows.filter((r) => filters.every((f) => matches(r, f)));
  const pageCount = Math.max(1, Math.ceil(shown.length / 5));
  const record = rows.find((r) => r.id === open);
  const save = (key) => async (value) => { await new Promise((r) => setTimeout(r, 400)); setRows((l) => l.map((r) => (r.id === open ? { ...r, [key]: value } : r))); return /** @type {const} */ ({ ok: true, value }); };
  return <>
    <A.PageHeader primary={<A.Button variant="primary">Add customer</A.Button>} actions={<A.Button variant="secondary">Export</A.Button>}>
      <A.PageHeaderTitle id="sk-customers-title" tabIndex={-1}>Customers</A.PageHeaderTitle><A.PageHeaderDescription>{rows.length} customers on every plan.</A.PageHeaderDescription>
    </A.PageHeader>
    <div className="sk-body">
      <A.FilterBar aria-label="Filter customers" fields={FIELDS} value={filters} onValueChange={(f) => { setFilters(f); setPage(1); }} resultCount={shown.length} />
      <A.DataTable aria-label="Customers" noun="customers" rows={shown.slice((page - 1) * 5, page * 5)} getRowId={(r) => r.id} getRowLabel={(r) => r.name}
        selectable selected={selected} onSelectedChange={setSelected} matchingTotal={shown.length}
        actions={(ids) => <A.Button size="sm" variant="secondary" onClick={() => setSelected([])}>Email {ids.length}</A.Button>}
        onRowClick={openRecord} empty="No customers match these filters."
        columns={[{ key: 'name', header: 'Name', cell: (r) => <span id={`sk-customer-${r.id}`}>{r.name}</span> }, { key: 'email', header: 'Email' }, { key: 'plan', header: 'Plan', cell: (r) => <A.Badge>{r.plan}</A.Badge> }, { key: 'seats', header: 'Seats', align: 'end' }]}
        pagination={{ page, pageCount, total: shown.length, onPageChange: setPage, noun: 'customers' }} />
    </div>
    <A.Sheet open={!!record} onOpenChange={(o) => { if (!o) setOpen(null); }} size="md">
      {record && <>
        <A.SheetHeader><A.SheetTitle>{record.name}</A.SheetTitle><A.SheetDescription>Customer {record.id} · {record.email}</A.SheetDescription></A.SheetHeader>
        <A.PropertyList aria-label={`${record.name}’s details`}>
          <A.PropertyListItem label="Plan" value={record.plan} commit="on-choose" onSave={save('plan')} editor={(c) => <A.Select {...c} items={PLANS} />} />
          <A.PropertyListItem label="Seats" value={String(record.seats)} onSave={save('seats')} validate={(v) => (/^\d+$/.test(v) ? undefined : 'Enter a whole number.')} />
          <A.PropertyListItem label="Email" value={record.email} />
        </A.PropertyList>
      </>}
    </A.Sheet>
  </>;
}
function Settings() {
  const general = A.useEditRecord({ initialValue: { name: 'Hollis Legal', url: 'hollis-legal' }, validationMode: 'submit',
    validate: (d) => (d.name.trim() ? {} : { name: 'Enter a workspace name.' }), save: async (d) => { await new Promise((r) => setTimeout(r, 600)); return { ok: true, value: d }; } });
  const [digest, setDigest] = React.useState(true);
  return <>
    <A.PageHeader><A.PageHeaderTitle>Settings</A.PageHeaderTitle><A.PageHeaderDescription>Changes to the workspace are saved together.</A.PageHeaderDescription></A.PageHeader>
    <div className="sk-body">
      <A.SettingsSection title="Workspace">
        <A.SettingsRow label="Workspace name" error={general.errors.name}><A.Input value={general.draft.name} onChange={(e) => general.setField('name', e.target.value)} /></A.SettingsRow>
        <A.SettingsRow label="Workspace URL" description={'altitude.app/' + general.draft.url}><A.Input value={general.draft.url} onChange={(e) => general.setField('url', e.target.value)} /></A.SettingsRow>
      </A.SettingsSection>
      <A.SettingsSection title="Notifications" description="Applies as soon as you change it.">
        <A.SettingsRow label="Weekly digest" description="A summary every Monday."><A.Switch checked={digest} onCheckedChange={setDigest} /></A.SettingsRow>
      </A.SettingsSection>
    </div>
    <A.SaveBar record={general} />
  </>;
}
function App() {
  const [at, setAt] = React.useState('customers');
  const item = (key, label) => <A.SidebarMenuItem key={key}>
    <A.SidebarMenuButton href={'#/' + key} current={at === key} icon={<I d={ICONS[key]} />} onClick={(e) => { e.preventDefault(); setAt(key); }}>{label}</A.SidebarMenuButton>
  </A.SidebarMenuItem>;
  return (
    <div className="sk-frame">
      <A.AppShell
        sidebar={<A.Sidebar>
          <A.SidebarHeader><span className="sk-ws"><A.Avatar name="Hollis Legal" size={24} /><span className="alt-sidebar-text">Hollis Legal</span></span></A.SidebarHeader>
          <A.SidebarContent><A.SidebarGroup label="Workspace"><A.SidebarMenu>{item('customers', 'Customers')}{item('reports', 'Reports')}{item('settings', 'Settings')}</A.SidebarMenu></A.SidebarGroup></A.SidebarContent>
          <A.SidebarFooter><A.SidebarMenu><A.SidebarMenuItem><A.SidebarMenuButton href="#/me" icon={<A.Avatar name="Maya Chen" size={20} />}>Maya Chen</A.SidebarMenuButton></A.SidebarMenuItem></A.SidebarMenu></A.SidebarFooter>
        </A.Sidebar>}
        topBar={<A.Button variant="secondary" size="sm" className="sk-search">Search… <A.Kbd>⌘K</A.Kbd></A.Button>}>
        {at === 'customers' ? <Customers /> : at === 'settings' ? <Settings /> : <>
          <A.PageHeader><A.PageHeaderTitle>Reports</A.PageHeaderTitle></A.PageHeader>
          <div className="sk-body"><A.EmptyState title="No reports yet" description="Reports you save appear here." action={<A.Button variant="primary">Create a report</A.Button>} /></div>
        </>}
      </A.AppShell>
    </div>
  );
}
// preview:end
export default App;
