export type ShipmentStatus =
  | "Booked"
  | "Picked up"
  | "In transit"
  | "Out for delivery"
  | "Delivered"
  | "Delayed"
  | "Exception"

export type Mode = "FTL" | "LTL" | "Intermodal" | "Reefer"

export interface Shipment {
  id: string
  /** Primary shipment reference, e.g. SHP-24-108341 */
  reference: string
  /** Customer purchase order number */
  poNumber: string
  /** Bill of lading number */
  bolNumber: string
  customer: string
  origin: string
  destination: string
  mode: Mode
  carrier: string
  weightLbs: number
  pallets: number
  status: ShipmentStatus
  /** ISO date */
  pickupDate: string
  /** ISO date */
  eta: string
}

export const shipments: Shipment[] = [
  { id: "1", reference: "SHP-26-108341", poNumber: "PO-4471920", bolNumber: "BOL-7730125", customer: "Cascade Home Goods", origin: "Tacoma, WA", destination: "Boise, ID", mode: "FTL", carrier: "Northline Transport", weightLbs: 38420, pallets: 24, status: "In transit", pickupDate: "2026-10-28", eta: "2026-10-31" },
  { id: "2", reference: "SHP-26-108342", poNumber: "PO-4471988", bolNumber: "BOL-7730126", customer: "Midwest Ag Supply", origin: "Des Moines, IA", destination: "Omaha, NE", mode: "LTL", carrier: "Prairie Freightways", weightLbs: 6210, pallets: 6, status: "Delivered", pickupDate: "2026-10-26", eta: "2026-10-27" },
  { id: "3", reference: "SHP-26-108347", poNumber: "PO-9920114", bolNumber: "BOL-7730131", customer: "FreshPath Produce", origin: "Salinas, CA", destination: "Denver, CO", mode: "Reefer", carrier: "ColdChain Express", weightLbs: 41200, pallets: 22, status: "Delayed", pickupDate: "2026-10-27", eta: "2026-10-30" },
  { id: "4", reference: "SHP-26-108350", poNumber: "PO-3318470", bolNumber: "BOL-7730140", customer: "Ironclad Fabrication", origin: "Gary, IN", destination: "Louisville, KY", mode: "FTL", carrier: "Great Lakes Haulage", weightLbs: 44800, pallets: 18, status: "Out for delivery", pickupDate: "2026-10-29", eta: "2026-10-30" },
  { id: "5", reference: "SHP-26-108356", poNumber: "PO-5502231", bolNumber: "BOL-7730148", customer: "Brightline Electronics", origin: "Ontario, CA", destination: "Phoenix, AZ", mode: "LTL", carrier: "Desert Run Logistics", weightLbs: 3980, pallets: 4, status: "Picked up", pickupDate: "2026-10-30", eta: "2026-11-01" },
  { id: "6", reference: "SHP-26-108361", poNumber: "PO-7781002", bolNumber: "BOL-7730155", customer: "Harbor Paper Co.", origin: "Savannah, GA", destination: "Charlotte, NC", mode: "Intermodal", carrier: "Southeast Rail & Dray", weightLbs: 39750, pallets: 20, status: "In transit", pickupDate: "2026-10-27", eta: "2026-11-02" },
  { id: "7", reference: "SHP-26-108364", poNumber: "PO-4472105", bolNumber: "BOL-7730159", customer: "Cascade Home Goods", origin: "Tacoma, WA", destination: "Spokane, WA", mode: "LTL", carrier: "Northline Transport", weightLbs: 7420, pallets: 8, status: "Booked", pickupDate: "2026-11-02", eta: "2026-11-03" },
  { id: "8", reference: "SHP-26-108370", poNumber: "PO-1180934", bolNumber: "BOL-7730166", customer: "Lone Star Beverage", origin: "Houston, TX", destination: "San Antonio, TX", mode: "FTL", carrier: "Gulf Coast Carriers", weightLbs: 43100, pallets: 26, status: "Delivered", pickupDate: "2026-10-25", eta: "2026-10-26" },
  { id: "9", reference: "SHP-26-108372", poNumber: "PO-9920187", bolNumber: "BOL-7730169", customer: "FreshPath Produce", origin: "Yuma, AZ", destination: "Las Vegas, NV", mode: "Reefer", carrier: "ColdChain Express", weightLbs: 36900, pallets: 20, status: "Exception", pickupDate: "2026-10-28", eta: "2026-10-29" },
  { id: "10", reference: "SHP-26-108375", poNumber: "PO-6640012", bolNumber: "BOL-7730173", customer: "Summit Outdoor Gear", origin: "Salt Lake City, UT", destination: "Reno, NV", mode: "LTL", carrier: "Basin Freight Lines", weightLbs: 5120, pallets: 5, status: "In transit", pickupDate: "2026-10-29", eta: "2026-10-31" },
  { id: "11", reference: "SHP-26-108381", poNumber: "PO-3318533", bolNumber: "BOL-7730180", customer: "Ironclad Fabrication", origin: "Gary, IN", destination: "Detroit, MI", mode: "FTL", carrier: "Great Lakes Haulage", weightLbs: 45000, pallets: 16, status: "Booked", pickupDate: "2026-11-03", eta: "2026-11-04" },
  { id: "12", reference: "SHP-26-108384", poNumber: "PO-2209876", bolNumber: "BOL-7730184", customer: "Atlantic Pharma Distribution", origin: "Newark, NJ", destination: "Boston, MA", mode: "Reefer", carrier: "ColdChain Express", weightLbs: 12800, pallets: 10, status: "Out for delivery", pickupDate: "2026-10-29", eta: "2026-10-30" },
  { id: "13", reference: "SHP-26-108390", poNumber: "PO-5502298", bolNumber: "BOL-7730191", customer: "Brightline Electronics", origin: "Ontario, CA", destination: "Portland, OR", mode: "Intermodal", carrier: "Pacific Intermodal", weightLbs: 30250, pallets: 18, status: "In transit", pickupDate: "2026-10-26", eta: "2026-11-01" },
  { id: "14", reference: "SHP-26-108393", poNumber: "PO-8834410", bolNumber: "BOL-7730195", customer: "Keystone Building Supply", origin: "Allentown, PA", destination: "Baltimore, MD", mode: "FTL", carrier: "Mid-Atlantic Freight", weightLbs: 42650, pallets: 22, status: "Delivered", pickupDate: "2026-10-24", eta: "2026-10-25" },
  { id: "15", reference: "SHP-26-108398", poNumber: "PO-1181050", bolNumber: "BOL-7730202", customer: "Lone Star Beverage", origin: "Dallas, TX", destination: "Oklahoma City, OK", mode: "FTL", carrier: "Gulf Coast Carriers", weightLbs: 40300, pallets: 24, status: "Delayed", pickupDate: "2026-10-28", eta: "2026-10-30" },
  { id: "16", reference: "SHP-26-108402", poNumber: "PO-6640077", bolNumber: "BOL-7730207", customer: "Summit Outdoor Gear", origin: "Salt Lake City, UT", destination: "Albuquerque, NM", mode: "LTL", carrier: "Basin Freight Lines", weightLbs: 2860, pallets: 3, status: "Picked up", pickupDate: "2026-10-30", eta: "2026-11-02" },
  { id: "17", reference: "SHP-26-108405", poNumber: "PO-7781066", bolNumber: "BOL-7730211", customer: "Harbor Paper Co.", origin: "Jacksonville, FL", destination: "Atlanta, GA", mode: "FTL", carrier: "Southeast Rail & Dray", weightLbs: 37400, pallets: 20, status: "Booked", pickupDate: "2026-11-01", eta: "2026-11-02" },
  { id: "18", reference: "SHP-26-108411", poNumber: "PO-2209931", bolNumber: "BOL-7730218", customer: "Atlantic Pharma Distribution", origin: "Philadelphia, PA", destination: "Pittsburgh, PA", mode: "LTL", carrier: "Mid-Atlantic Freight", weightLbs: 4450, pallets: 4, status: "In transit", pickupDate: "2026-10-29", eta: "2026-10-31" },
  { id: "19", reference: "SHP-26-108416", poNumber: "PO-4472190", bolNumber: "BOL-7730224", customer: "Cascade Home Goods", origin: "Portland, OR", destination: "Sacramento, CA", mode: "Intermodal", carrier: "Pacific Intermodal", weightLbs: 33700, pallets: 19, status: "Delivered", pickupDate: "2026-10-22", eta: "2026-10-27" },
  { id: "20", reference: "SHP-26-108420", poNumber: "PO-8834502", bolNumber: "BOL-7730229", customer: "Keystone Building Supply", origin: "Harrisburg, PA", destination: "Columbus, OH", mode: "FTL", carrier: "Great Lakes Haulage", weightLbs: 44100, pallets: 20, status: "In transit", pickupDate: "2026-10-29", eta: "2026-10-31" },
]
