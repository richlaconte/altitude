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
  type DataTableColumn,
  type BadgeProps,
} from 'altitude-design';
import 'altitude-design/altitude.css';
import './styles.css';
import { fetchShipments, initialShipments, type Shipment, type ShipmentStatus } from './data';

const statusTone: Record<ShipmentStatus, NonNullable<BadgeProps['tone']>> = {
  Booked: 'neutral',
  'Picked up': 'accent',
  'In transit': 'accent',
  'Out for delivery': 'accent',
  'Customs hold': 'caution',
  Delivered: 'positive',
  Exception: 'critical',
};

const dateFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const timeFmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });
const numFmt = new Intl.NumberFormat('en-US');
const fmtDate = (iso: string) => dateFmt.format(new Date(`${iso}T00:00:00Z`));

/** References are matched ignoring case, spaces and dashes, so "nfx 240918" and "0412" both find NFX-240918-0412. */
const normalize = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');

const columns: DataTableColumn<Shipment>[] = [
  {
    key: 'reference',
    header: 'Reference',
    sortValue: (s) => s.reference,
    cell: (s) => <span className="mono">{s.reference}</span>,
  },
  { key: 'customer', header: 'Customer', sortValue: (s) => s.customer },
  {
    key: 'lane',
    header: 'Lane',
    sortValue: (s) => `${s.origin} ${s.destination}`,
    cell: (s) => (
      <span className="lane">
        {s.origin} <span aria-hidden="true">→</span>
        <span className="sr-only"> to </span> {s.destination}
      </span>
    ),
  },
  { key: 'mode', header: 'Mode', sortValue: (s) => s.mode },
  { key: 'carrier', header: 'Carrier', sortValue: (s) => s.carrier },
  {
    key: 'status',
    header: 'Status',
    sortValue: (s) => s.status,
    cell: (s) => (
      <Badge tone={statusTone[s.status]} lamp={s.status === 'In transit' || s.status === 'Out for delivery' ? 'pulse' : undefined}>
        {s.status}
      </Badge>
    ),
  },
  {
    key: 'weight',
    header: 'Weight (kg)',
    align: 'end',
    sortValue: (s) => s.weightKg,
    cell: (s) => <span className="num">{numFmt.format(s.weightKg)}</span>,
  },
  {
    key: 'pickup',
    header: 'Pickup',
    sortValue: (s) => s.pickupDate,
    cell: (s) => fmtDate(s.pickupDate),
  },
  {
    key: 'eta',
    header: 'ETA',
    sortValue: (s) => s.eta,
    cell: (s) => fmtDate(s.eta),
  },
];

function ShipmentsScreen() {
  const [shipments, setShipments] = React.useState<Shipment[]>(initialShipments);
  const [loading, setLoading] = React.useState(false);
  const [updatedAt, setUpdatedAt] = React.useState(() => new Date());
  const [query, setQuery] = React.useState('');
  const [selected, setSelected] = React.useState<string[]>([]);
  const round = React.useRef(0);
  const searchRef = React.useRef<HTMLInputElement>(null);

  const needle = normalize(query);
  const visible = React.useMemo(
    () => (needle ? shipments.filter((s) => normalize(s.reference).includes(needle)) : shipments),
    [shipments, needle],
  );

  // Selection survives searching: rows hidden by the search stay selected.
  const visibleIds = React.useMemo(() => new Set(visible.map((s) => s.id)), [visible]);
  const hiddenSelected = selected.filter((id) => !visibleIds.has(id));
  const onSelectedChange = (ids: string[]) => setSelected([...hiddenSelected, ...ids]);

  const clearSearch = () => {
    setQuery('');
    searchRef.current?.focus();
  };

  const refresh = async () => {
    if (loading) return;
    setLoading(true);
    round.current += 1;
    const fresh = await fetchShipments(shipments, round.current);
    const changed = fresh.filter((s, i) => s.status !== shipments[i].status).length;
    setShipments(fresh);
    setUpdatedAt(new Date());
    setLoading(false);
    toast({
      title: 'Shipments refreshed',
      description: changed ? `${changed} status ${changed === 1 ? 'update' : 'updates'} from carriers.` : 'No changes since the last update.',
      tone: 'positive',
    });
  };

  const exportSelected = (ids: string[]) => {
    toast({ title: `Exported ${ids.length} ${ids.length === 1 ? 'shipment' : 'shipments'}`, description: 'The CSV is ready in your downloads.' });
  };

  const inTransit = shipments.filter((s) => s.status === 'In transit' || s.status === 'Out for delivery').length;
  const attention = shipments.filter((s) => s.status === 'Exception' || s.status === 'Customs hold').length;

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Northfield Freight · Shipment tracker</p>
          <h1>Shipments</h1>
          <p className="summary">
            {shipments.length} active records · {inTransit} moving · {attention} need attention
          </p>
        </div>
        <div className="header-actions">
          <span className="updated" aria-live="polite">
            {loading ? 'Refreshing…' : `Updated ${timeFmt.format(updatedAt)}`}
          </span>
          <Button variant="secondary" onClick={refresh} loading={loading} leading={<RefreshIcon />}>
            Refresh
          </Button>
        </div>
      </header>

      <section role="search" className="search-bar" aria-label="Find shipments">
        <label htmlFor="ref-search" className="search-label">
          Search by reference
        </label>
        <div className="search-row">
          <Input
            id="ref-search"
            ref={searchRef}
            className="search-input"
            value={query}
            placeholder="e.g. NFX-240922-0458 or 0458"
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape' && query) {
                e.preventDefault();
                setQuery('');
              }
            }}
            leading={<SearchIcon />}
          />
          <Button variant="ghost" onClick={clearSearch} disabled={!query} leading={<Icons.X size={14} />}>
            Clear search
          </Button>
        </div>
        <p className="search-status" aria-live="polite">
          {needle
            ? `${visible.length} of ${shipments.length} shipments match “${query.trim()}”`
            : `Showing all ${shipments.length} shipments`}
          {hiddenSelected.length > 0 && ` · ${hiddenSelected.length} selected not shown`}
        </p>
      </section>

      <DataTable<Shipment>
        aria-label="Shipments"
        columns={columns}
        rows={loading ? undefined : visible}
        skeleton={{ lines: 8 }}
        getRowId={(s) => s.id}
        getRowLabel={(s) => `Shipment ${s.reference}`}
        selectable
        selected={selected.filter((id) => visibleIds.has(id))}
        onSelectedChange={onSelectedChange}
        defaultSort={{ key: 'eta', direction: 'ascending' }}
        maxHeight="calc(100vh - 300px)"
        actions={(ids) => (
          <>
            <Button size="sm" variant="secondary" onClick={() => exportSelected([...hiddenSelected, ...ids])}>
              Export CSV
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
              Clear selection
            </Button>
          </>
        )}
        empty={
          needle ? (
            <EmptyState
              size="sm"
              announce
              icon={<SearchIcon size={18} />}
              title="No shipments match that reference"
              description={`Nothing found for “${query.trim()}”. Check the reference on the bill of lading, or try just its last digits.`}
              action={<Button variant="primary" onClick={clearSearch}>Clear search</Button>}
            />
          ) : (
            <EmptyState
              size="sm"
              title="No shipments yet"
              description="Booked shipments appear here as soon as they're tendered."
            />
          )
        }
      />
      <Toaster />
    </main>
  );
}

function SearchIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function RefreshIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

createRoot(document.getElementById('root')!).render(
  <AltitudeProvider scheme="daylight">
    <ShipmentsScreen />
  </AltitudeProvider>,
);
