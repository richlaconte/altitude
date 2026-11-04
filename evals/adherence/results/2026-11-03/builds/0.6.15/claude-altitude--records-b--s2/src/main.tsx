import * as React from 'react';
import { createRoot } from 'react-dom/client';
import {
  AltitudeProvider, Alert, Badge, Button, DataTable, EmptyState, Field, Input, PageHeader, PageHeaderDescription,
  PageHeaderTitle, WorkflowStatus, useAsyncCollection,
} from 'altitude-design';
import type { DataTableColumn, Tone } from 'altitude-design';
import 'altitude-design/altitude.css';
import './app.css';
import { loadShipments, type Shipment, type ShipmentStatus } from './shipments';

// Line icons on Altitude's 24px grid at 1.75 stroke, in currentColor.
const Icon = ({ d, size = 16 }: { d: string; size?: number }) => (
  <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);
const icons = {
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-4.35-4.35',
  refresh: 'M20 11a8 8 0 0 0-14.6-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5L20 16M20 20v-4h-4',
  booked: 'M8 3v3M16 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z',
  transit: 'M3 7h11v9H3zM14 10h4l3 3v3h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  customs: 'M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3z',
  delayed: 'M12 7v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
  delivered: 'M5 12l4.5 4.5L19 7',
  package: 'M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8',
  alert: 'M12 9v4M12 17h.01M10.3 3.9L2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
};

// Status is a word, an icon and a tone, never colour alone.
const STATUS: Record<ShipmentStatus, { tone: Tone; icon: string }> = {
  'Booked': { tone: 'neutral', icon: icons.booked },
  'In transit': { tone: 'accent', icon: icons.transit },
  'At customs': { tone: 'caution', icon: icons.customs },
  'Delayed': { tone: 'critical', icon: icons.delayed },
  'Delivered': { tone: 'positive', icon: icons.delivered },
};

const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const weightFormat = new Intl.NumberFormat('en-GB');

const columns: DataTableColumn<Shipment>[] = [
  { key: 'reference', header: 'Reference', sortValue: s => s.reference, cell: s => <span className="mono">{s.reference}</span> },
  { key: 'customer', header: 'Customer', sortValue: s => s.customer },
  { key: 'route', header: 'Route', cell: s => <span className="route">{s.origin} <span aria-hidden="true">→</span><span className="sr-only"> to </span> {s.destination}</span> },
  { key: 'mode', header: 'Mode', sortValue: s => s.mode },
  {
    key: 'status', header: 'Status', sortValue: s => s.status,
    cell: s => <Badge tone={STATUS[s.status].tone}><span className="badge-label"><Icon d={STATUS[s.status].icon} size={14} />{s.status}</span></Badge>,
  },
  { key: 'eta', header: 'Arrival', sortValue: s => s.eta, cell: s => (s.status === 'Delivered' ? 'Arrived ' : 'Due ') + dateFormat.format(new Date(s.eta)) },
  { key: 'weight', header: 'Weight (kg)', align: 'end', sortValue: s => s.weightKg, cell: s => weightFormat.format(s.weightKg) },
];

function ShipmentsScreen() {
  const collection = useAsyncCollection<Shipment, string>({
    initialQuery: '',
    load: loadShipments,
    getKey: s => s.id,
    isFiltered: q => q.trim() !== '',
    // Selection survives searching, so you can gather shipments across several searches.
    selection: 'preserve',
    messages: {
      loading: 'Loading shipments…',
      refreshing: 'Refreshing shipments…',
      empty: 'There are no shipments yet.',
      noResults: 'No shipments match that reference.',
      failed: 'We couldn’t load shipments. Try again.',
      results: n => `${n} ${n === 1 ? 'shipment' : 'shipments'} shown.`,
    },
  });
  const { phase, items, query, selectedKeys } = collection;
  const searchRef = React.useRef<HTMLInputElement>(null);
  const busy = phase === 'loading' || phase === 'refreshing';

  const visibleIds = React.useMemo(() => new Set(items.map(s => s.id)), [items]);
  const visibleSelected = items.filter(s => selectedKeys.has(s.id)).map(s => s.id);
  const hiddenSelected = selectedKeys.size - visibleSelected.length;

  // DataTable reports the whole visible selection; turn it into toggles so selections outside these results are kept.
  const onSelectedChange = (ids: string[]) => {
    const next = new Set(ids);
    visibleIds.forEach(id => { if (next.has(id) !== selectedKeys.has(id)) collection.toggleSelection(id); });
  };

  const clearSearch = () => { collection.reset(); searchRef.current?.focus(); };

  return (
    <main className="page">
      <PageHeader actions={
        <Button variant="secondary" loading={phase === 'refreshing'} disabled={phase === 'loading'}
          leading={<Icon d={icons.refresh} />} onClick={collection.refresh}>Refresh shipments</Button>
      }>
        <PageHeaderTitle>Shipments</PageHeaderTitle>
        <PageHeaderDescription>Every consignment booked with Brightford Freight, by reference.</PageHeaderDescription>
      </PageHeader>

      <div className="search-row" role="search">
        <Field label="Search by reference">
          <Input ref={searchRef} type="search" value={query} placeholder="BRF-24-10822" leading={<Icon d={icons.search} />}
            onChange={e => collection.setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape' && query) { e.preventDefault(); clearSearch(); } }} />
        </Field>
        {query && <Button variant="ghost" onClick={clearSearch}>Clear search</Button>}
      </div>

      <WorkflowStatus>{collection.status}</WorkflowStatus>

      {phase === 'failed' && (
        <Alert tone="critical" variant="raised" icon={<Icon d={icons.alert} size={18} />}
          title={items.length ? 'We couldn’t refresh shipments' : 'We couldn’t load shipments'}
          action={<Button variant="secondary" size="sm" onClick={collection.refresh}>Try loading again</Button>}>
          {items.length ? 'The list below is from the last successful load and may be out of date.' : collection.error || 'Check your connection, then try again.'}
        </Alert>
      )}

      {phase === 'no-results' && (
        <EmptyState announce headingLevel={2} icon={<Icon d={icons.search} size={24} />}
          title="No shipments match that reference"
          description={`Nothing matches “${query.trim()}”. Check the reference, or clear the search to see every shipment.`}
          action={<Button variant="secondary" onClick={clearSearch}>Clear search</Button>} />
      )}

      {phase === 'empty' && (
        <EmptyState headingLevel={2} icon={<Icon d={icons.package} size={24} />} title="No shipments yet"
          description="Shipments appear here once they’re booked." />
      )}

      {(phase === 'loading' || items.length > 0) && phase !== 'no-results' && (
        <div aria-busy={busy}>
          <DataTable<Shipment>
            aria-label="Shipments"
            noun="shipments"
            columns={columns}
            rows={phase === 'loading' ? undefined : [...items]}
            getRowId={s => s.id}
            getRowLabel={s => `Shipment ${s.reference}`}
            selectable
            selected={visibleSelected}
            onSelectedChange={onSelectedChange}
            defaultSort={{ key: 'eta', direction: 'ascending' }}
          />
        </div>
      )}

      {selectedKeys.size > 0 && (
        <div className="selection-row">
          <p>
            {selectedKeys.size} {selectedKeys.size === 1 ? 'shipment' : 'shipments'} selected
            {hiddenSelected > 0 && `, including ${hiddenSelected} not in these results`}.
          </p>
          <Button variant="ghost" size="sm" onClick={collection.clearSelection}>Clear selection</Button>
        </div>
      )}
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <AltitudeProvider>
    <ShipmentsScreen />
  </AltitudeProvider>,
);
