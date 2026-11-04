export type ShipmentStatus = 'Booked' | 'Picked up' | 'In transit' | 'Customs hold' | 'Out for delivery' | 'Delivered' | 'Exception';
export type Mode = 'FTL' | 'LTL' | 'Intermodal' | 'Ocean' | 'Air';

export interface Shipment {
  id: string;
  reference: string;
  customer: string;
  origin: string;
  destination: string;
  mode: Mode;
  carrier: string;
  status: ShipmentStatus;
  weightKg: number;
  pieces: number;
  pickupDate: string; // ISO date
  eta: string; // ISO date
}

const raw: Array<Omit<Shipment, 'id'>> = [
  { reference: 'NFX-240918-0412', customer: 'Harbor & Pine Furniture', origin: 'Charlotte, NC', destination: 'Columbus, OH', mode: 'FTL', carrier: 'Blue Ridge Haulers', status: 'In transit', weightKg: 18420, pieces: 22, pickupDate: '2026-10-30', eta: '2026-11-04' },
  { reference: 'NFX-240918-0413', customer: 'Coastal Grocers Co-op', origin: 'Savannah, GA', destination: 'Atlanta, GA', mode: 'LTL', carrier: 'Peachtree Freight', status: 'Delivered', weightKg: 2310, pieces: 6, pickupDate: '2026-10-28', eta: '2026-10-29' },
  { reference: 'NFX-240919-0427', customer: 'Midline Auto Parts', origin: 'Laredo, TX', destination: 'Detroit, MI', mode: 'Intermodal', carrier: 'Union Rail Logistics', status: 'In transit', weightKg: 21750, pieces: 40, pickupDate: '2026-10-27', eta: '2026-11-06' },
  { reference: 'NFX-240920-0435', customer: 'Brightwave Electronics', origin: 'Shenzhen, CN', destination: 'Long Beach, CA', mode: 'Ocean', carrier: 'Pacific Meridian Lines', status: 'Customs hold', weightKg: 12900, pieces: 310, pickupDate: '2026-10-08', eta: '2026-11-05' },
  { reference: 'NFX-240920-0436', customer: 'Brightwave Electronics', origin: 'Taipei, TW', destination: 'Chicago, IL', mode: 'Air', carrier: 'SkyBridge Cargo', status: 'Out for delivery', weightKg: 640, pieces: 18, pickupDate: '2026-11-01', eta: '2026-11-03' },
  { reference: 'NFX-240921-0441', customer: 'Greenfield Seed Supply', origin: 'Des Moines, IA', destination: 'Fargo, ND', mode: 'FTL', carrier: 'Prairie Line Transport', status: 'Picked up', weightKg: 19800, pieces: 26, pickupDate: '2026-11-02', eta: '2026-11-04' },
  { reference: 'NFX-240921-0442', customer: 'Atlas Medical Distribution', origin: 'Memphis, TN', destination: 'Nashville, TN', mode: 'LTL', carrier: 'Volunteer Express', status: 'Delivered', weightKg: 880, pieces: 4, pickupDate: '2026-10-31', eta: '2026-11-01' },
  { reference: 'NFX-240922-0458', customer: 'Northwind Outfitters', origin: 'Portland, OR', destination: 'Denver, CO', mode: 'LTL', carrier: 'Cascade Freightways', status: 'Exception', weightKg: 1540, pieces: 9, pickupDate: '2026-10-29', eta: '2026-11-02' },
  { reference: 'NFX-240922-0459', customer: 'Stonebridge Building Materials', origin: 'Birmingham, AL', destination: 'Jacksonville, FL', mode: 'FTL', carrier: 'Gulf States Carriers', status: 'In transit', weightKg: 20410, pieces: 14, pickupDate: '2026-11-01', eta: '2026-11-03' },
  { reference: 'NFX-240923-0466', customer: 'Coastal Grocers Co-op', origin: 'Miami, FL', destination: 'Orlando, FL', mode: 'FTL', carrier: 'Sunshine Reefer Lines', status: 'Booked', weightKg: 16200, pieces: 20, pickupDate: '2026-11-05', eta: '2026-11-05' },
  { reference: 'NFX-240923-0467', customer: 'Kestrel Home Goods', origin: 'Rotterdam, NL', destination: 'Newark, NJ', mode: 'Ocean', carrier: 'Atlantic Crest Shipping', status: 'In transit', weightKg: 9650, pieces: 188, pickupDate: '2026-10-19', eta: '2026-11-09' },
  { reference: 'NFX-240924-0471', customer: 'Midline Auto Parts', origin: 'Toledo, OH', destination: 'Louisville, KY', mode: 'LTL', carrier: 'Ohio Valley Freight', status: 'Out for delivery', weightKg: 3120, pieces: 11, pickupDate: '2026-11-02', eta: '2026-11-03' },
  { reference: 'NFX-240924-0472', customer: 'Atlas Medical Distribution', origin: 'Frankfurt, DE', destination: 'Boston, MA', mode: 'Air', carrier: 'SkyBridge Cargo', status: 'Customs hold', weightKg: 410, pieces: 7, pickupDate: '2026-10-31', eta: '2026-11-04' },
  { reference: 'NFX-240925-0480', customer: 'Harbor & Pine Furniture', origin: 'High Point, NC', destination: 'Richmond, VA', mode: 'LTL', carrier: 'Blue Ridge Haulers', status: 'Booked', weightKg: 2760, pieces: 8, pickupDate: '2026-11-04', eta: '2026-11-06' },
  { reference: 'NFX-240925-0481', customer: 'Summit Beverage Co.', origin: 'Golden, CO', destination: 'Phoenix, AZ', mode: 'FTL', carrier: 'Mesa Freight Partners', status: 'In transit', weightKg: 19950, pieces: 24, pickupDate: '2026-11-01', eta: '2026-11-03' },
  { reference: 'NFX-240926-0493', customer: 'Greenfield Seed Supply', origin: 'Omaha, NE', destination: 'Kansas City, MO', mode: 'Intermodal', carrier: 'Union Rail Logistics', status: 'Delivered', weightKg: 22100, pieces: 30, pickupDate: '2026-10-24', eta: '2026-10-30' },
  { reference: 'NFX-240926-0494', customer: 'Kestrel Home Goods', origin: 'Dallas, TX', destination: 'Houston, TX', mode: 'LTL', carrier: 'Lone Star Linehaul', status: 'Picked up', weightKg: 1180, pieces: 5, pickupDate: '2026-11-03', eta: '2026-11-04' },
  { reference: 'NFX-240927-0502', customer: 'Northwind Outfitters', origin: 'Seattle, WA', destination: 'Salt Lake City, UT', mode: 'FTL', carrier: 'Cascade Freightways', status: 'In transit', weightKg: 17300, pieces: 19, pickupDate: '2026-11-02', eta: '2026-11-04' },
  { reference: 'NFX-240927-0503', customer: 'Summit Beverage Co.', origin: 'Monterrey, MX', destination: 'San Antonio, TX', mode: 'FTL', carrier: 'Lone Star Linehaul', status: 'Customs hold', weightKg: 20800, pieces: 28, pickupDate: '2026-11-01', eta: '2026-11-03' },
  { reference: 'NFX-240928-0511', customer: 'Stonebridge Building Materials', origin: 'Pittsburgh, PA', destination: 'Baltimore, MD', mode: 'FTL', carrier: 'Keystone Carriers', status: 'Booked', weightKg: 21300, pieces: 12, pickupDate: '2026-11-06', eta: '2026-11-07' },
  { reference: 'NFX-240928-0512', customer: 'Brightwave Electronics', origin: 'Reno, NV', destination: 'Sacramento, CA', mode: 'LTL', carrier: 'Sierra Express', status: 'Delivered', weightKg: 940, pieces: 15, pickupDate: '2026-10-30', eta: '2026-10-31' },
  { reference: 'NFX-240929-0520', customer: 'Atlas Medical Distribution', origin: 'Indianapolis, IN', destination: 'St. Louis, MO', mode: 'LTL', carrier: 'Heartland Freight', status: 'Exception', weightKg: 1320, pieces: 6, pickupDate: '2026-11-01', eta: '2026-11-02' },
  { reference: 'NFX-240929-0521', customer: 'Coastal Grocers Co-op', origin: 'Tampa, FL', destination: 'Charleston, SC', mode: 'FTL', carrier: 'Sunshine Reefer Lines', status: 'In transit', weightKg: 15800, pieces: 18, pickupDate: '2026-11-02', eta: '2026-11-03' },
  { reference: 'NFX-240930-0534', customer: 'Midline Auto Parts', origin: 'Busan, KR', destination: 'Seattle, WA', mode: 'Ocean', carrier: 'Pacific Meridian Lines', status: 'In transit', weightKg: 14200, pieces: 260, pickupDate: '2026-10-14', eta: '2026-11-08' },
];

export const initialShipments: Shipment[] = raw.map((s) => ({ ...s, id: s.reference }));

/** What a refresh from the carrier feeds might move along. */
const next: Partial<Record<ShipmentStatus, ShipmentStatus>> = {
  Booked: 'Picked up',
  'Picked up': 'In transit',
  'In transit': 'Out for delivery',
  'Out for delivery': 'Delivered',
  'Customs hold': 'In transit',
};

/** Simulates a round trip to the tracking service: a few shipments advance a step. */
export function fetchShipments(current: Shipment[], round: number): Promise<Shipment[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(
        current.map((s, i) => {
          const advance = (i * 7 + round * 3) % 5 === 0;
          const to = next[s.status];
          return advance && to ? { ...s, status: to } : s;
        }),
      );
    }, 900);
  });
}
