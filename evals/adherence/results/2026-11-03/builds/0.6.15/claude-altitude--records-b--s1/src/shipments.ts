// In-memory sample data for a regional freight carrier. There is no backend:
// `loadShipments` stands in for the shipment service, with a short delay so
// loading and refreshing states are real, not decorative.

export type ShipmentStatus = 'booked' | 'in-transit' | 'at-depot' | 'delayed' | 'delivered' | 'exception';

export interface Shipment {
  id: string;
  reference: string;
  customer: string;
  origin: string;
  destination: string;
  mode: 'FTL' | 'LTL' | 'Intermodal' | 'Reefer';
  pallets: number;
  weightKg: number;
  status: ShipmentStatus;
  eta: string; // ISO date
  updatedAt: string; // ISO timestamp
}

const now = Date.now();
const hoursAgo = (h: number) => new Date(now - h * 3_600_000).toISOString();

export const SHIPMENTS: Shipment[] = [
  { id: 'shp_7f21', reference: 'HLF-240318', customer: 'Brennan Orchards', origin: 'Yakima, WA', destination: 'Portland, OR', mode: 'Reefer', pallets: 22, weightKg: 17_480, status: 'in-transit', eta: '2026-11-04', updatedAt: hoursAgo(0.4) },
  { id: 'shp_7f22', reference: 'HLF-240319', customer: 'Okonkwo Building Supply', origin: 'Tacoma, WA', destination: 'Boise, ID', mode: 'FTL', pallets: 26, weightKg: 19_950, status: 'delayed', eta: '2026-11-05', updatedAt: hoursAgo(1.2) },
  { id: 'shp_7f23', reference: 'HLF-240322', customer: 'Juniper & Pike Coffee', origin: 'Seattle, WA', destination: 'Spokane, WA', mode: 'LTL', pallets: 4, weightKg: 1_310, status: 'delivered', eta: '2026-11-02', updatedAt: hoursAgo(19) },
  { id: 'shp_7f24', reference: 'HLF-240327', customer: 'Valdés Medical Distribution', origin: 'Reno, NV', destination: 'Sacramento, CA', mode: 'FTL', pallets: 18, weightKg: 8_720, status: 'at-depot', eta: '2026-11-04', updatedAt: hoursAgo(2.5) },
  { id: 'shp_7f25', reference: 'HLF-240331', customer: 'Northfork Paper Mill', origin: 'Longview, WA', destination: 'Salt Lake City, UT', mode: 'Intermodal', pallets: 40, weightKg: 21_600, status: 'in-transit', eta: '2026-11-07', updatedAt: hoursAgo(5) },
  { id: 'shp_7f26', reference: 'HLF-240334', customer: 'Tamsin Reyes Ceramics', origin: 'Eugene, OR', destination: 'Bend, OR', mode: 'LTL', pallets: 2, weightKg: 640, status: 'exception', eta: '2026-11-03', updatedAt: hoursAgo(0.9) },
  { id: 'shp_7f27', reference: 'HLF-240340', customer: 'Brennan Orchards', origin: 'Wenatchee, WA', destination: 'Vancouver, BC', mode: 'Reefer', pallets: 20, weightKg: 15_900, status: 'booked', eta: '2026-11-06', updatedAt: hoursAgo(26) },
  { id: 'shp_7f28', reference: 'HLF-240341', customer: 'Kettle Ridge Brewing', origin: 'Hood River, OR', destination: 'Seattle, WA', mode: 'LTL', pallets: 6, weightKg: 3_150, status: 'in-transit', eta: '2026-11-03', updatedAt: hoursAgo(0.2) },
  { id: 'shp_7f29', reference: 'HLF-240345', customer: 'Okonkwo Building Supply', origin: 'Tacoma, WA', destination: 'Missoula, MT', mode: 'FTL', pallets: 24, weightKg: 20_400, status: 'booked', eta: '2026-11-08', updatedAt: hoursAgo(31) },
  { id: 'shp_7f2a', reference: 'HLF-240352', customer: 'Lindqvist Marine Parts', origin: 'Everett, WA', destination: 'Anchorage, AK', mode: 'Intermodal', pallets: 12, weightKg: 6_880, status: 'at-depot', eta: '2026-11-12', updatedAt: hoursAgo(8) },
  { id: 'shp_7f2b', reference: 'HLF-240356', customer: 'Valdés Medical Distribution', origin: 'Sacramento, CA', destination: 'Medford, OR', mode: 'LTL', pallets: 3, weightKg: 910, status: 'delivered', eta: '2026-11-01', updatedAt: hoursAgo(44) },
  { id: 'shp_7f2c', reference: 'HLF-240361', customer: 'Sunhollow Farms Co-op', origin: 'Pasco, WA', destination: 'Portland, OR', mode: 'Reefer', pallets: 24, weightKg: 18_200, status: 'delayed', eta: '2026-11-04', updatedAt: hoursAgo(3) },
];

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => { clearTimeout(t); reject(new DOMException('Aborted', 'AbortError')); });
  });

/** Searches by shipment reference only; the "HLF-" prefix is optional. */
export async function loadShipments(query: string, { signal }: { signal: AbortSignal }): Promise<readonly Shipment[]> {
  await wait(450, signal);
  const q = query.trim().toUpperCase().replace(/^HLF-?/, '');
  if (!q) return SHIPMENTS;
  return SHIPMENTS.filter(s => s.reference.toUpperCase().replace(/^HLF-/, '').includes(q));
}
