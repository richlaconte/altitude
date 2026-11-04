// In-memory stand-in for the shipment service. There is no backend: the data
// below is sample data for a regional freight forwarder, and every load is
// delayed so the screen's loading and refreshing states are real.

export type ShipmentStatus = 'Booked' | 'In transit' | 'At customs' | 'Delayed' | 'Delivered';
export type Mode = 'Road' | 'Sea' | 'Air' | 'Rail';

export interface Shipment {
  id: string;
  reference: string;
  customer: string;
  origin: string;
  destination: string;
  mode: Mode;
  status: ShipmentStatus;
  /** ISO date: estimated arrival, or actual arrival once delivered. */
  eta: string;
  weightKg: number;
}

const SHIPMENTS: Shipment[] = [
  { id: 'shp_01', reference: 'BRF-24-10817', customer: 'Halden Timber Supply', origin: 'Gdańsk, PL', destination: 'Felixstowe, GB', mode: 'Sea', status: 'In transit', eta: '2026-11-09', weightKg: 18400 },
  { id: 'shp_02', reference: 'BRF-24-10822', customer: 'Oaklea Kitchenware', origin: 'Ningbo, CN', destination: 'Rotterdam, NL', mode: 'Sea', status: 'At customs', eta: '2026-11-04', weightKg: 9620 },
  { id: 'shp_03', reference: 'BRF-24-10830', customer: 'Moray Cold Chain', origin: 'Aberdeen, GB', destination: 'Lyon, FR', mode: 'Road', status: 'Delayed', eta: '2026-11-05', weightKg: 7250 },
  { id: 'shp_04', reference: 'BRF-24-10831', customer: 'Pellworth Bikes', origin: 'Taichung, TW', destination: 'Hamburg, DE', mode: 'Air', status: 'Delivered', eta: '2026-10-30', weightKg: 412 },
  { id: 'shp_05', reference: 'BRF-24-10845', customer: 'Sundial Ceramics', origin: 'Valencia, ES', destination: 'Milan, IT', mode: 'Road', status: 'In transit', eta: '2026-11-06', weightKg: 3880 },
  { id: 'shp_06', reference: 'BRF-24-10852', customer: 'Kettle & Vine Grocers', origin: 'Duisburg, DE', destination: 'Xi’an, CN', mode: 'Rail', status: 'In transit', eta: '2026-11-21', weightKg: 21300 },
  { id: 'shp_07', reference: 'BRF-24-10858', customer: 'Ardent Medical Devices', origin: 'Cork, IE', destination: 'Boston, US', mode: 'Air', status: 'Booked', eta: '2026-11-08', weightKg: 186 },
  { id: 'shp_08', reference: 'BRF-24-10863', customer: 'Halden Timber Supply', origin: 'Riga, LV', destination: 'Antwerp, BE', mode: 'Sea', status: 'Booked', eta: '2026-11-15', weightKg: 22100 },
  { id: 'shp_09', reference: 'BRF-24-10871', customer: 'Brightwater Textiles', origin: 'Izmir, TR', destination: 'Leeds, GB', mode: 'Road', status: 'At customs', eta: '2026-11-07', weightKg: 5340 },
  { id: 'shp_10', reference: 'BRF-24-10879', customer: 'Okonkwo Agri Exports', origin: 'Lagos, NG', destination: 'Le Havre, FR', mode: 'Sea', status: 'Delayed', eta: '2026-11-12', weightKg: 16750 },
  { id: 'shp_11', reference: 'BRF-24-10884', customer: 'Pellworth Bikes', origin: 'Hamburg, DE', destination: 'Copenhagen, DK', mode: 'Road', status: 'Delivered', eta: '2026-11-01', weightKg: 1290 },
  { id: 'shp_12', reference: 'BRF-24-10890', customer: 'Lindqvist Audio', origin: 'Gothenburg, SE', destination: 'Warsaw, PL', mode: 'Rail', status: 'In transit', eta: '2026-11-06', weightKg: 4410 },
  { id: 'shp_13', reference: 'BRF-24-10897', customer: 'Moray Cold Chain', origin: 'Peterhead, GB', destination: 'Bilbao, ES', mode: 'Sea', status: 'Booked', eta: '2026-11-18', weightKg: 11900 },
  { id: 'shp_14', reference: 'BRF-24-10903', customer: 'Tavira Cork Works', origin: 'Lisbon, PT', destination: 'Bordeaux, FR', mode: 'Road', status: 'Delivered', eta: '2026-10-28', weightKg: 2675 },
];

const delay = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); }, { once: true });
  });

/** Normalise a reference for matching: case and separators don't matter ("brf 10822" finds BRF-24-10822). */
const normalise = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '');

/** Search scope: shipment reference only. */
export async function loadShipments(query: string, { signal }: { signal: AbortSignal }): Promise<readonly Shipment[]> {
  await delay(450, signal);
  const needle = normalise(query.trim());
  return needle ? SHIPMENTS.filter(s => normalise(s.reference).includes(needle)) : SHIPMENTS;
}
