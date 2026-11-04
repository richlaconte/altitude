import * as React from 'react';
import { createRoot } from 'react-dom/client';
import {
  AltitudeProvider, Alert, Badge, Button, CopyButton, DataTable, EmptyState, Field, Icons, Input,
  PageHeader, PageHeaderDescription, PageHeaderTitle, RelativeTime, WorkflowStatus, useAsyncCollection,
} from 'altitude-design';
import type { DataTableColumn, IconComponent, Tone } from 'altitude-design';
import 'altitude-design/altitude.css';
import './app.css';
import { SHIPMENTS, loadShipments } from './shipments';
import type { Shipment, ShipmentStatus } from './shipments';

// Status is always a word and an icon, never colour alone.
const STATUS: Record<ShipmentStatus, { label: string; tone: Tone; icon: IconComponent }> = {
  booked: { label: 'Booked', tone: 'neutral', icon: Icons.Clock },
  'in-transit': { label: 'In transit', tone: 'accent', icon: Icons.ArrowUp },
  'at-depot': { label: 'At depot', tone: 'neutral', icon: Icons.Pin },
  delayed: { label: 'Delayed', tone: 'caution', icon: Icons.AlertTriangle },
  delivered: { label: 'Delivered', tone: 'positive', icon: Icons.CircleCheck },
  exception: { label: 'Exception', tone: 'critical', icon: Icons.AlertCircle },
};

const etaFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const num = new Intl.NumberFormat('en-US');
const byId = new Map(SHIPMENTS.map(s => [s.id, s]));

const columns: DataTableColumn<Shipment>[] = [
  { key: 'reference', header: 'Reference', sticky: true, sortValue: s => s.reference, cell: s => <span className="mono">{s.reference}</span> },
  { key: 'customer', header: 'Customer', sortValue: s => s.customer },
  { key: 'route', header: 'Route', cell: s => <span>{s.origin} <span aria-hidden="true">→</span><span className="sr-only"> to </span> {s.destination}</span> },
  { key: 'mode', header: 'Mode', sortValue: s => s.mode },
  {
    key: 'status', header: 'Status', sortValue: s => STATUS[s.status].label,
    cell: s => { const m = STATUS[s.status]; const I = m.icon; return <Badge tone={m.tone} variant="tinted" lamp={false}><I size={14} aria-hidden="true" /> {m.label}</Badge>; },
  },
  { key: 'pallets', header: 'Pallets', align: 'end', sortValue: s => s.pallets },
  { key: 'weight', header: 'Weight (kg)', align: 'end', sortValue: s => s.weightKg, cell: s => num.format(s.weightKg) },
  { key: 'eta', header: 'ETA', align: 'end', sortValue: s => s.eta, cell: s => <time dateTime={s.eta}>{etaFormat.format(new Date(s.eta))}</time> },
  { key: 'updated', header: 'Last update', align: 'end', sortValue: s => s.updatedAt, cell: s => <RelativeTime date={s.updatedAt} /> },
];

function ShipmentsScreen() {
  const searchRef = React.useRef<HTMLInputElement>(null);
  const collection = useAsyncCollection<Shipment, string>({
    initialQuery: '',
    load: loadShipments,
    getKey: s => s.id,
    isFiltered: q => q.trim() !== '',
    // Selection is kept across searches so someone can gather shipments from several lookups.
    selection: 'preserve',
    messages: {
      loading: 'Loading shipments…',
      refreshing: 'Refreshing shipments…',
      empty: 'No shipments yet.',
      noResults: 'No shipments match that reference.',
      failed: "We couldn't load shipments.",
      results: n => `${n} ${n === 1 ? 'shipment' : 'shipments'}`,
    },
  });
  const { phase, items, query, selectedKeys } = collection;
  const [refreshedAt, setRefreshedAt] = React.useState(() => new Date());
  const lastPhase = React.useRef(phase);
  React.useEffect(() => {
    if (lastPhase.current === 'refreshing' && phase === 'populated') setRefreshedAt(new Date());
    lastPhase.current = phase;
  }, [phase]);

  const visibleIds = new Set(items.map(s => s.id));
  const selectedIds = [...selectedKeys];
  const hiddenSelected = selectedIds.filter(id => !visibleIds.has(id)).length;

  // DataTable reports the selection of the rows it shows; reconcile only those, keeping selections from other searches.
  const onSelectedChange = (ids: string[]) => {
    const next = new Set(ids);
    for (const s of items) if (next.has(s.id) !== selectedKeys.has(s.id)) collection.toggleSelection(s.id);
  };

  const clearSearch = () => { collection.reset(); searchRef.current?.focus(); };
  const busy = phase === 'loading' || phase === 'refreshing';
  const selectedRefs = () => selectedIds.map(id => byId.get(id)?.reference).filter(Boolean).join('\n');

  let emptyView: React.ReactNode;
  if (phase === 'no-results') {
    emptyView = <EmptyState size="sm" announce title={`No shipments match “${query.trim()}”`}
      description="Search uses the shipment reference, such as HLF-240327 or 240327."
      action={<Button variant="secondary" onClick={clearSearch}>Clear search</Button>} />;
  } else if (phase === 'failed' && items.length === 0) {
    emptyView = <EmptyState size="sm" title="Shipments couldn't load" description="Check your connection, then try again."
      action={<Button variant="secondary" onClick={collection.refresh}>Retry loading</Button>} />;
  } else {
    emptyView = <EmptyState size="sm" title="No shipments yet" description="Booked shipments will appear here." />;
  }

  return (
    <main className="page">
      <PageHeader
        actions={<Button variant="secondary" leading={<Icons.Refresh size={16} aria-hidden="true" />} loading={phase === 'refreshing'}
          disabled={busy} onClick={collection.refresh}>Refresh shipments</Button>}>
        <PageHeaderTitle>Shipments</PageHeaderTitle>
        <PageHeaderDescription>
          Every shipment booked with Highline Freight. Updated <RelativeTime date={refreshedAt} />.
        </PageHeaderDescription>
      </PageHeader>

      {phase === 'failed' && items.length > 0 && (
        <Alert tone="critical" title="We couldn't refresh shipments"
          action={<Button size="sm" variant="secondary" onClick={collection.refresh}>Retry refresh</Button>}>
          These results may be out of date. They were last updated <RelativeTime date={refreshedAt} />.
        </Alert>
      )}

      <form className="search" role="search" onSubmit={e => e.preventDefault()}>
        <Field label="Search by reference" hint="Matches any part of the reference. The HLF- prefix is optional.">
          <Input ref={searchRef} type="search" value={query} placeholder="HLF-240327" autoComplete="off" spellCheck={false}
            onChange={e => collection.setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape' && query) { e.preventDefault(); clearSearch(); } }} />
        </Field>
        {query && <Button type="button" variant="ghost" leading={<Icons.X size={16} aria-hidden="true" />} onClick={clearSearch}>Clear search</Button>}
      </form>

      <WorkflowStatus>{collection.status}</WorkflowStatus>

      <div aria-busy={busy} className={phase === 'refreshing' ? 'refreshing' : undefined}>
        <DataTable<Shipment>
          aria-label="Shipments"
          noun="shipments"
          rows={phase === 'loading' && items.length === 0 ? undefined : [...items]}
          getRowId={s => s.id}
          getRowLabel={s => `${s.reference}, ${s.customer}`}
          columns={columns}
          defaultSort={{ key: 'updated', direction: 'descending' }}
          selectable
          selected={selectedIds}
          onSelectedChange={onSelectedChange}
          actions={() => <>
            <CopyButton size="sm" value={selectedRefs} label="Copy references" copiedLabel="References copied" />
            <Button size="sm" variant="ghost" onClick={collection.clearSelection}>Clear selection</Button>
          </>}
          empty={emptyView}
        />
      </div>

      {selectedIds.length > 0 && (
        <p className="selection-note">
          {selectedIds.length} {selectedIds.length === 1 ? 'shipment' : 'shipments'} selected
          {hiddenSelected > 0 && `, ${hiddenSelected} not shown by this search`}.
        </p>
      )}
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <AltitudeProvider>
    <ShipmentsScreen />
  </AltitudeProvider>,
);
