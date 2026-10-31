import * as React from 'react';
import {createRoot} from 'react-dom/client';
import {
  AltitudeProvider, Alert, Badge, Button, DataTable, EmptyState, Field, Input, PageHeader, PageHeaderDescription,
  PageHeaderTitle, WorkflowStatus, useAsyncCollection,
} from 'altitude-design';
import type {DataTableColumn} from 'altitude-design';
import 'altitude-design/altitude.css';
import './app.css';
import {failNextLoad, loadShipments} from './shipments-service';
import type {Shipment, ShipmentStatus} from './shipments-service';

const statusTone: Record<ShipmentStatus, 'neutral' | 'accent' | 'positive' | 'caution' | 'critical'> = {
  Booked: 'neutral', 'In transit': 'accent', Delayed: 'caution', Exception: 'critical', Delivered: 'positive',
};
const dateFormat = new Intl.DateTimeFormat(undefined, {day: 'numeric', month: 'short', year: 'numeric'});
const weightFormat = new Intl.NumberFormat(undefined, {style: 'unit', unit: 'kilogram', maximumFractionDigits: 0});

const columns: DataTableColumn<Shipment>[] = [
  {key: 'reference', header: 'Reference', sortValue: s => s.reference, cell: s => <span className="ref">{s.reference}</span>, sticky: true},
  {key: 'customer', header: 'Customer', sortValue: s => s.customer},
  {key: 'route', header: 'Route', cell: s => <>{s.origin} <span aria-hidden="true">→</span><span className="alt-sr"> to </span> {s.destination}</>},
  {key: 'mode', header: 'Mode', sortValue: s => s.mode},
  {key: 'status', header: 'Status', sortValue: s => s.status, cell: s => <Badge tone={statusTone[s.status]}>{s.status}</Badge>},
  {key: 'eta', header: 'ETA / delivered', sortValue: s => s.eta, cell: s => dateFormat.format(new Date(`${s.eta}T00:00:00`))},
  {key: 'weight', header: 'Weight', align: 'end', sortValue: s => s.weightKg, cell: s => weightFormat.format(s.weightKg)},
];

function ShipmentsScreen() {
  const collection = useAsyncCollection<Shipment, string>({
    initialQuery: '',
    load: loadShipments,
    getKey: s => s.id,
    isFiltered: query => query.trim() !== '',
    // Selection is kept across searches so people can gather shipments from several references.
    selection: 'preserve',
    messages: {
      loading: 'Loading shipments…',
      refreshing: 'Refreshing shipments…',
      empty: 'There are no shipments yet.',
      noResults: 'No shipments match that reference.',
      failed: 'Shipments could not be loaded.',
      results: count => `${count} ${count === 1 ? 'shipment' : 'shipments'}`,
    },
  });
  const {phase, items, query, selectedKeys} = collection;
  const searchRef = React.useRef<HTMLInputElement>(null);

  const visibleIds = new Set(items.map(s => s.id));
  const hiddenSelected = [...selectedKeys].filter(id => !visibleIds.has(id)).length;
  const hasResults = items.length > 0;

  // DataTable only knows the visible rows; apply its changes to them and leave selections hidden by the search alone.
  const onSelectedChange = (ids: string[]) => {
    const next = new Set(ids);
    for (const id of visibleIds) if (next.has(id) !== selectedKeys.has(id)) collection.toggleSelection(id);
  };

  const clearSearch = () => {
    collection.reset();
    searchRef.current?.focus();
  };

  return (
    <main className="shipments">
      <PageHeader
        actions={<Button variant="secondary" loading={phase === 'refreshing'} disabled={phase === 'loading'} onClick={collection.refresh}>Refresh shipments</Button>}
      >
        <PageHeaderTitle>Shipments</PageHeaderTitle>
        <PageHeaderDescription>Find shipments by reference and select the ones you're working on.</PageHeaderDescription>
      </PageHeader>

      <form className="search" role="search" onSubmit={event => event.preventDefault()}>
        <Field label="Search by shipment reference" hint="For example SHP-24-10482, or just 10482.">
          <Input ref={searchRef} type="search" value={query} autoComplete="off" spellCheck={false}
            onChange={event => collection.setQuery(event.target.value)}
            onKeyDown={event => { if (event.key === 'Escape' && query) { event.preventDefault(); clearSearch(); } }} />
        </Field>
        <Button type="button" variant="ghost" disabled={!query} onClick={clearSearch}>Clear search</Button>
      </form>

      <WorkflowStatus>{collection.status}</WorkflowStatus>

      {phase === 'failed' && (
        <Alert tone="critical" variant="raised" title={hasResults ? 'Couldn’t refresh shipments' : 'Couldn’t load shipments'}
          action={<Button size="sm" onClick={collection.refresh}>Try again</Button>}>
          {hasResults ? 'Showing the last shipments loaded; they may be out of date.' : collection.error || 'The shipments service did not respond.'}
        </Alert>
      )}

      {selectedKeys.size > 0 && (
        <div className="selection">
          <span>
            {selectedKeys.size} selected
            {hiddenSelected > 0 && `, ${hiddenSelected} not shown by the current search`}
          </span>
          <Button size="sm" variant="ghost" onClick={collection.clearSelection}>Clear selection</Button>
        </div>
      )}

      {phase === 'failed' && !hasResults ? null : (
        <div aria-busy={phase === 'loading' || phase === 'refreshing'}>
          <DataTable<Shipment>
            aria-label="Shipments"
            columns={columns}
            rows={phase === 'loading' ? undefined : [...items]}
            skeleton={{lines: 8}}
            getRowId={s => s.id}
            getRowLabel={s => `${s.reference}, ${s.customer}`}
            selectable
            selected={items.filter(s => selectedKeys.has(s.id)).map(s => s.id)}
            onSelectedChange={onSelectedChange}
            noun="shipments"
            defaultSort={{key: 'eta', direction: 'ascending'}}
            empty={phase === 'no-results'
              ? <EmptyState size="sm" title="No shipments match that reference"
                  description={<>Nothing matches “{query.trim()}”. Check the reference, or clear the search to see every shipment.</>}
                  action={<Button onClick={clearSearch}>Clear search</Button>} />
              : <EmptyState size="sm" title="No shipments yet" description="Shipments appear here once they're booked." />}
          />
        </div>
      )}

      <footer className="demo-note">
        <p>Sample data, stored in memory. Reloading resets it.</p>
        <Button size="sm" variant="ghost" onClick={failNextLoad}>Make the next refresh fail</Button>
      </footer>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<AltitudeProvider><ShipmentsScreen /></AltitudeProvider>);
