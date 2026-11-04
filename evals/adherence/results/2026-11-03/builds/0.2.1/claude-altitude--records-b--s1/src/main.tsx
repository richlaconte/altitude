import * as React from 'react';
import { createRoot } from 'react-dom/client';
import {
  AltitudeProvider,
  Badge,
  Button,
  DataTable,
  EmptyState,
  Icons,
  Input,
  Toaster,
  toast,
} from 'altitude-design';
import 'altitude-design/altitude.css';
import { SHIPMENTS, fetchShipments, type Shipment, type ShipmentStatus } from './shipments';

const STATUS_TONE: Record<ShipmentStatus, 'neutral' | 'accent' | 'positive' | 'caution' | 'critical'> = {
  Booked: 'neutral',
  'In transit': 'accent',
  'At customs': 'caution',
  'Out for delivery': 'accent',
  Delivered: 'positive',
  Delayed: 'critical',
};

const dateFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const kgFmt = new Intl.NumberFormat('en-US');
const timeFmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });

/** The column type isn't exported from the package root, so it's read off DataTable's props. */
type Column = Parameters<typeof DataTable<Shipment>>[0]['columns'][number];

const columns: Column[] = [
  {
    key: 'reference',
    header: 'Reference',
    cell: (s) => <span style={{ fontFamily: 'var(--font-mono)' }}>{s.reference}</span>,
    sortValue: (s) => s.reference,
  },
  { key: 'customer', header: 'Customer', sortValue: (s) => s.customer },
  { key: 'route', header: 'Route', cell: (s) => `${s.origin} → ${s.destination}` },
  { key: 'mode', header: 'Mode', sortValue: (s) => s.mode },
  {
    key: 'status',
    header: 'Status',
    cell: (s) => <Badge tone={STATUS_TONE[s.status]} lamp={s.status === 'In transit' || s.status === 'Out for delivery' ? 'pulse' : undefined}>{s.status}</Badge>,
    sortValue: (s) => s.status,
  },
  {
    key: 'weight',
    header: 'Weight (kg)',
    align: 'end',
    cell: (s) => kgFmt.format(s.weightKg),
    sortValue: (s) => s.weightKg,
  },
  {
    key: 'eta',
    header: 'ETA',
    align: 'end',
    cell: (s) => dateFmt.format(new Date(s.eta)),
    sortValue: (s) => s.eta,
  },
];

/** Normalises a reference for matching: case-insensitive, ignoring dashes and spaces ("frt 10871" finds FRT-24-10871). */
const normalise = (v: string) => v.toLowerCase().replace(/[\s-]/g, '');

function App() {
  const [shipments, setShipments] = React.useState<Shipment[]>(SHIPMENTS);
  const [refreshing, setRefreshing] = React.useState(false);
  const [lastUpdated, setLastUpdated] = React.useState(() => new Date());
  const [query, setQuery] = React.useState('');
  const [selected, setSelected] = React.useState<string[]>([]);
  const searchRef = React.useRef<HTMLInputElement>(null);

  const needle = normalise(query.trim());
  const visible = React.useMemo(
    () => (needle ? shipments.filter((s) => normalise(s.reference).includes(needle)) : shipments),
    [shipments, needle],
  );

  // Selection only covers what's on screen, so the count and the actions never act on hidden rows.
  React.useEffect(() => {
    const ids = new Set(visible.map((s) => s.id));
    setSelected((prev) => {
      const kept = prev.filter((id) => ids.has(id));
      return kept.length === prev.length ? prev : kept;
    });
  }, [visible]);

  const clearSearch = () => {
    setQuery('');
    searchRef.current?.focus();
  };

  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    const before = new Map(shipments.map((s) => [s.id, s.status]));
    const next = await fetchShipments(shipments);
    const changed = next.filter((s) => before.get(s.id) !== s.status).length;
    setShipments(next);
    setLastUpdated(new Date());
    setRefreshing(false);
    toast({
      title: 'Shipments refreshed',
      description: changed ? `${changed} shipment${changed === 1 ? '' : 's'} changed status.` : 'No status changes.',
      tone: 'positive',
    });
  };

  const byId = (ids: string[]) => shipments.filter((s) => ids.includes(s.id));

  const searchBox = (
    <form role="search" onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
      <Input
        ref={searchRef}
        type="search"
        size="sm"
        aria-label="Search shipments by reference"
        placeholder="Search by reference, e.g. FRT-24-10871"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && query) {
            e.preventDefault();
            setQuery('');
          }
        }}
        style={{ minWidth: 280 }}
        trailing={
          query ? (
            <Button variant="ghost" size="sm" square aria-label="Clear search" onClick={clearSearch}>
              <Icons.X />
            </Button>
          ) : undefined
        }
      />
    </form>
  );

  return (
    <main style={{ maxWidth: 1200, margin: '0 auto', padding: 'var(--space-8) var(--space-6)', display: 'grid', gap: 'var(--space-5)' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0 }}>Shipments</h1>
          <p style={{ margin: 'var(--space-1) 0 0', color: 'var(--ink-muted)' }}>
            {needle
              ? `${visible.length} of ${shipments.length} shipments match “${query.trim()}”`
              : `${shipments.length} active shipments`}
            {' · '}
            <span aria-live="polite">{refreshing ? 'Refreshing…' : `Updated ${timeFmt.format(lastUpdated)}`}</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <Button variant="secondary" onClick={clearSearch} disabled={!query}>
            Clear search
          </Button>
          <Button variant="primary" onClick={refresh} loading={refreshing}>
            Refresh
          </Button>
        </div>
      </header>

      <DataTable<Shipment>
        aria-label="Shipments"
        columns={columns}
        rows={visible}
        getRowId={(s) => s.id}
        getRowLabel={(s) => `${s.reference}, ${s.customer}`}
        selectable
        selected={selected}
        onSelectedChange={setSelected}
        defaultSort={{ key: 'eta', direction: 'ascending' }}
        maxHeight="calc(100vh - 240px)"
        toolbar={searchBox}
        actions={(ids) => (
          <>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                const refs = byId(ids).map((s) => s.reference).join('\n');
                navigator.clipboard?.writeText(refs).catch(() => {});
                toast({ title: `Copied ${ids.length} reference${ids.length === 1 ? '' : 's'}` });
              }}
            >
              Copy references
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
              Clear selection
            </Button>
          </>
        )}
        empty={
          <EmptyState
            size="sm"
            title={`No shipments match “${query.trim()}”`}
            description="Check the reference number, or clear the search to see every shipment."
            action={<Button variant="primary" onClick={clearSearch}>Clear search</Button>}
            announce
          />
        }
      />
      <Toaster />
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <AltitudeProvider>
    <App />
  </AltitudeProvider>,
);
