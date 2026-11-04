export type ShipmentStatus = 'Booked' | 'In transit' | 'At customs' | 'Out for delivery' | 'Delivered' | 'Delayed';

export interface Shipment {
  id: string;
  reference: string;
  customer: string;
  origin: string;
  destination: string;
  mode: 'Ocean' | 'Air' | 'Road' | 'Rail';
  status: ShipmentStatus;
  weightKg: number;
  eta: string; // ISO date
}

export const SHIPMENTS: Shipment[] = [
  { id: 's01', reference: 'FRT-24-10871', customer: 'Halvorsen Marine Supply', origin: 'Rotterdam, NL', destination: 'Houston, US', mode: 'Ocean', status: 'In transit', weightKg: 18420, eta: '2026-11-19' },
  { id: 's02', reference: 'FRT-24-10872', customer: 'Cobalt Ridge Outfitters', origin: 'Shenzhen, CN', destination: 'Long Beach, US', mode: 'Ocean', status: 'At customs', weightKg: 22100, eta: '2026-11-06' },
  { id: 's03', reference: 'FRT-24-10880', customer: 'Brightwater Pharma', origin: 'Frankfurt, DE', destination: 'Chicago, US', mode: 'Air', status: 'Out for delivery', weightKg: 640, eta: '2026-11-03' },
  { id: 's04', reference: 'FRT-24-10884', customer: 'Northgate Grocers', origin: 'Monterrey, MX', destination: 'Dallas, US', mode: 'Road', status: 'Delivered', weightKg: 11250, eta: '2026-11-01' },
  { id: 's05', reference: 'FRT-24-10891', customer: 'Kestrel Electronics', origin: 'Taipei, TW', destination: 'Seattle, US', mode: 'Air', status: 'Delayed', weightKg: 1320, eta: '2026-11-05' },
  { id: 's06', reference: 'FRT-24-10895', customer: 'Pinecrest Furniture Co.', origin: 'Ho Chi Minh City, VN', destination: 'Savannah, US', mode: 'Ocean', status: 'Booked', weightKg: 26780, eta: '2026-12-08' },
  { id: 's07', reference: 'FRT-24-10902', customer: 'Atlas Auto Parts', origin: 'Detroit, US', destination: 'Toronto, CA', mode: 'Rail', status: 'In transit', weightKg: 34500, eta: '2026-11-07' },
  { id: 's08', reference: 'FRT-24-10907', customer: 'Meridian Textiles', origin: 'Chittagong, BD', destination: 'Felixstowe, UK', mode: 'Ocean', status: 'In transit', weightKg: 15900, eta: '2026-11-24' },
  { id: 's09', reference: 'FRT-24-10913', customer: 'Brightwater Pharma', origin: 'Basel, CH', destination: 'Newark, US', mode: 'Air', status: 'At customs', weightKg: 410, eta: '2026-11-04' },
  { id: 's10', reference: 'FRT-24-10918', customer: 'Sundial Solar', origin: 'Ningbo, CN', destination: 'Oakland, US', mode: 'Ocean', status: 'Delayed', weightKg: 19870, eta: '2026-11-15' },
  { id: 's11', reference: 'FRT-24-10922', customer: 'Northgate Grocers', origin: 'Fresno, US', destination: 'Denver, US', mode: 'Road', status: 'Out for delivery', weightKg: 8740, eta: '2026-11-03' },
  { id: 's12', reference: 'FRT-24-10930', customer: 'Larkspur Cosmetics', origin: 'Lyon, FR', destination: 'Miami, US', mode: 'Air', status: 'Delivered', weightKg: 275, eta: '2026-10-30' },
  { id: 's13', reference: 'FRT-24-10934', customer: 'Ironbark Tools', origin: 'Busan, KR', destination: 'Vancouver, CA', mode: 'Ocean', status: 'In transit', weightKg: 21300, eta: '2026-11-21' },
  { id: 's14', reference: 'FRT-24-10941', customer: 'Cobalt Ridge Outfitters', origin: 'Reno, US', destination: 'Portland, US', mode: 'Road', status: 'Booked', weightKg: 4620, eta: '2026-11-10' },
  { id: 's15', reference: 'FRT-24-10947', customer: 'Kestrel Electronics', origin: 'Penang, MY', destination: 'Los Angeles, US', mode: 'Air', status: 'In transit', weightKg: 980, eta: '2026-11-06' },
  { id: 's16', reference: 'FRT-24-10952', customer: 'Halvorsen Marine Supply', origin: 'Gdańsk, PL', destination: 'Norfolk, US', mode: 'Ocean', status: 'Booked', weightKg: 12600, eta: '2026-12-02' },
  { id: 's17', reference: 'FRT-24-10958', customer: 'Atlas Auto Parts', origin: 'Saltillo, MX', destination: 'Nashville, US', mode: 'Rail', status: 'Delayed', weightKg: 29800, eta: '2026-11-09' },
  { id: 's18', reference: 'FRT-24-10963', customer: 'Meridian Textiles', origin: 'Karachi, PK', destination: 'Antwerp, BE', mode: 'Ocean', status: 'At customs', weightKg: 17450, eta: '2026-11-05' },
  { id: 's19', reference: 'FRT-24-10969', customer: 'Larkspur Cosmetics', origin: 'Milan, IT', destination: 'Atlanta, US', mode: 'Air', status: 'Booked', weightKg: 360, eta: '2026-11-12' },
  { id: 's20', reference: 'FRT-24-10975', customer: 'Sundial Solar', origin: 'Phoenix, US', destination: 'Albuquerque, US', mode: 'Road', status: 'Delivered', weightKg: 7120, eta: '2026-10-31' },
];

/** Simulates a status poll: a few shipments advance a step. */
const NEXT: Partial<Record<ShipmentStatus, ShipmentStatus>> = {
  Booked: 'In transit',
  'In transit': 'At customs',
  'At customs': 'Out for delivery',
  'Out for delivery': 'Delivered',
  Delayed: 'In transit',
};

export function fetchShipments(current: Shipment[]): Promise<Shipment[]> {
  return new Promise((resolve) =>
    setTimeout(() => {
      resolve(
        current.map((s) => {
          const next = NEXT[s.status];
          return next && Math.random() < 0.2 ? { ...s, status: next } : s;
        }),
      );
    }, 900),
  );
}
