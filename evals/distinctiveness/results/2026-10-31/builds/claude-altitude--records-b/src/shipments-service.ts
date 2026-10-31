// In-memory stand-in for the shipments service. There is no backend; reloading the page resets the data.

export type ShipmentStatus = 'Booked' | 'In transit' | 'Delayed' | 'Exception' | 'Delivered';
export type ShipmentMode = 'Road' | 'Ocean' | 'Air' | 'Rail';

export interface Shipment {
  id: string;
  reference: string;
  customer: string;
  origin: string;
  destination: string;
  mode: ShipmentMode;
  status: ShipmentStatus;
  /** ISO date: estimated arrival, or the delivery date once delivered. */
  eta: string;
  weightKg: number;
}

const SHIPMENTS: Shipment[] = [
  { id: 'a1f3', reference: 'SHP-24-10482', customer: 'Harlow Outdoor Supply', origin: 'Rotterdam, NL', destination: 'Chicago, US', mode: 'Ocean', status: 'In transit', eta: '2026-11-14', weightKg: 18420 },
  { id: 'b72c', reference: 'SHP-24-10483', customer: 'Kestrel Medical', origin: 'Memphis, US', destination: 'Toronto, CA', mode: 'Air', status: 'Delivered', eta: '2026-10-27', weightKg: 640 },
  { id: 'c0d9', reference: 'SHP-24-10491', customer: 'Northgate Grocers', origin: 'Fresno, US', destination: 'Denver, US', mode: 'Road', status: 'In transit', eta: '2026-11-01', weightKg: 21300 },
  { id: 'd4e1', reference: 'SHP-24-10496', customer: 'Brightline Electronics', origin: 'Shenzhen, CN', destination: 'Long Beach, US', mode: 'Ocean', status: 'Delayed', eta: '2026-11-22', weightKg: 26750 },
  { id: 'e815', reference: 'SHP-24-10502', customer: 'Calder & Finch Furniture', origin: 'Gdańsk, PL', destination: 'Felixstowe, GB', mode: 'Ocean', status: 'Booked', eta: '2026-11-19', weightKg: 9800 },
  { id: 'f2a7', reference: 'SHP-24-10507', customer: 'Kestrel Medical', origin: 'Dublin, IE', destination: 'Boston, US', mode: 'Air', status: 'Exception', eta: '2026-10-31', weightKg: 212 },
  { id: 'g9b0', reference: 'SHP-24-10511', customer: 'Ridgeway Building Materials', origin: 'Hamilton, CA', destination: 'Detroit, US', mode: 'Rail', status: 'In transit', eta: '2026-11-03', weightKg: 61200 },
  { id: 'h3c6', reference: 'SHP-24-10515', customer: 'Harlow Outdoor Supply', origin: 'Ho Chi Minh City, VN', destination: 'Seattle, US', mode: 'Ocean', status: 'In transit', eta: '2026-11-28', weightKg: 14900 },
  { id: 'i5d2', reference: 'SHP-24-10520', customer: 'Solano Wine Co.', origin: 'Napa, US', destination: 'Atlanta, US', mode: 'Road', status: 'Delivered', eta: '2026-10-24', weightKg: 11450 },
  { id: 'j8e4', reference: 'SHP-24-10524', customer: 'Brightline Electronics', origin: 'Taipei, TW', destination: 'Frankfurt, DE', mode: 'Air', status: 'In transit', eta: '2026-11-02', weightKg: 1830 },
  { id: 'k1f8', reference: 'SHP-24-10529', customer: 'Pemberton Paper Mills', origin: 'Thunder Bay, CA', destination: 'Minneapolis, US', mode: 'Rail', status: 'Delayed', eta: '2026-11-06', weightKg: 74800 },
  { id: 'l6a3', reference: 'SHP-24-10533', customer: 'Northgate Grocers', origin: 'Monterrey, MX', destination: 'Dallas, US', mode: 'Road', status: 'Booked', eta: '2026-11-04', weightKg: 19600 },
  { id: 'm2b9', reference: 'SHP-24-10538', customer: 'Atlas Auto Parts', origin: 'Nagoya, JP', destination: 'Savannah, US', mode: 'Ocean', status: 'In transit', eta: '2026-12-03', weightKg: 23100 },
  { id: 'n7c5', reference: 'SHP-24-10542', customer: 'Calder & Finch Furniture', origin: 'Leeds, GB', destination: 'Lyon, FR', mode: 'Road', status: 'Delivered', eta: '2026-10-22', weightKg: 4300 },
  { id: 'o4d1', reference: 'SHP-24-10547', customer: 'Atlas Auto Parts', origin: 'Saltillo, MX', destination: 'Nashville, US', mode: 'Rail', status: 'Exception', eta: '2026-11-05', weightKg: 52400 },
  { id: 'p9e6', reference: 'SHP-24-10551', customer: 'Solano Wine Co.', origin: 'Oakland, US', destination: 'Yokohama, JP', mode: 'Ocean', status: 'Booked', eta: '2026-12-10', weightKg: 16800 },
  { id: 'q3f2', reference: 'SHP-24-10556', customer: 'Ridgeway Building Materials', origin: 'Columbus, US', destination: 'Charlotte, US', mode: 'Road', status: 'In transit', eta: '2026-10-31', weightKg: 22650 },
  { id: 'r8a7', reference: 'SHP-24-10560', customer: 'Kestrel Medical', origin: 'Basel, CH', destination: 'Newark, US', mode: 'Air', status: 'Booked', eta: '2026-11-07', weightKg: 375 },
  { id: 's5b3', reference: 'SHP-24-10565', customer: 'Pemberton Paper Mills', origin: 'Halifax, CA', destination: 'Antwerp, BE', mode: 'Ocean', status: 'In transit', eta: '2026-11-17', weightKg: 31200 },
  { id: 't1c8', reference: 'SHP-24-10569', customer: 'Brightline Electronics', origin: 'Penang, MY', destination: 'Los Angeles, US', mode: 'Air', status: 'Delivered', eta: '2026-10-29', weightKg: 2240 },
  { id: 'u6d4', reference: 'SHP-24-10574', customer: 'Harlow Outdoor Supply', origin: 'Reno, US', destination: 'Portland, US', mode: 'Road', status: 'Delayed', eta: '2026-11-01', weightKg: 8750 },
  { id: 'v2e9', reference: 'SHP-24-10578', customer: 'Northgate Grocers', origin: 'Kansas City, US', destination: 'Chicago, US', mode: 'Rail', status: 'Delivered', eta: '2026-10-26', weightKg: 48900 },
];

let failNext = false;
/** Demo control: make the next load reject, to exercise the failure and retry states. */
export function failNextLoad() { failNext = true; }

/** Matches references case-insensitively, ignoring spaces and dashes, so "shp 10482" and "10482" both find SHP-24-10482. */
const normalize = (value: string) => value.toLowerCase().replace(/[\s-]/g, '');

export function loadShipments(query: string, { signal }: { signal: AbortSignal }): Promise<readonly Shipment[]> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (failNext) {
        failNext = false;
        reject(new Error('The shipments service did not respond.'));
        return;
      }
      const needle = normalize(query.trim());
      resolve(needle ? SHIPMENTS.filter(s => normalize(s.reference).includes(needle)) : SHIPMENTS);
    }, 450);
    signal.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); });
  });
}
