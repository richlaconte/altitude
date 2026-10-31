export const INDUSTRIES = [
  "Logistics & Transportation",
  "Manufacturing",
  "Retail",
  "Healthcare",
  "Financial Services",
  "Software",
] as const

export const STAGES = ["Prospect", "Customer", "At risk", "Churned"] as const

export const TIERS = ["SMB", "Mid-market", "Enterprise"] as const

export const OWNERS = [
  "Priya Raman",
  "Jordan Ellis",
  "Mateo Alvarez",
  "Sarah Kim",
] as const

export type Stage = (typeof STAGES)[number]

export type Account = {
  id: string
  name: string
  industry: string
  stage: Stage
  tier: string
  owner: string
  website: string
  phone: string
  employees: number | null
  annualRevenue: number | null
  address: string
  /** ISO date (YYYY-MM-DD) */
  renewalDate: string
  /** ISO date (YYYY-MM-DD) */
  customerSince: string
  arr: number
  description: string
}

export type ContactRole =
  | "Decision maker"
  | "Economic buyer"
  | "Champion"
  | "Technical evaluator"
  | "Procurement"
  | "End user"

export type Contact = {
  id: string
  name: string
  title: string
  email: string
  phone: string
  role: ContactRole
  primary?: boolean
  /** ISO date (YYYY-MM-DD) */
  lastContacted: string
}

export type ActivityType = "email" | "call" | "meeting" | "note"

export type Activity = {
  id: string
  type: ActivityType
  title: string
  body: string
  /** ISO datetime, local time */
  at: string
  by: string
  with?: string[]
}

export const account: Account = {
  id: "ACC-10482",
  name: "Halcyon Freight Systems",
  industry: "Logistics & Transportation",
  stage: "Customer",
  tier: "Enterprise",
  owner: "Priya Raman",
  website: "halcyonfreight.com",
  phone: "(614) 555-0142",
  employees: 1850,
  annualRevenue: 412_000_000,
  address: "2200 Polaris Pkwy, Suite 400, Columbus, OH 43240",
  renewalDate: "2027-03-31",
  customerSince: "2023-04-12",
  arr: 186_400,
  description:
    "Regional LTL carrier with 38 terminals across the Midwest and Southeast. Uses our routing and dispatch platform across all terminals; currently evaluating the telematics add-on for the Midwest depot expansion.",
}

export const contacts: Contact[] = [
  {
    id: "c1",
    name: "Dana Whitfield",
    title: "VP of Operations",
    email: "dana.whitfield@halcyonfreight.com",
    phone: "(614) 555-0187",
    role: "Decision maker",
    primary: true,
    lastContacted: "2026-10-29",
  },
  {
    id: "c2",
    name: "Aisha Karim",
    title: "Chief Financial Officer",
    email: "aisha.karim@halcyonfreight.com",
    phone: "(614) 555-0110",
    role: "Economic buyer",
    lastContacted: "2026-09-12",
  },
  {
    id: "c3",
    name: "Tom Brannigan",
    title: "Fleet Systems Lead",
    email: "tom.brannigan@halcyonfreight.com",
    phone: "(614) 555-0163",
    role: "Champion",
    lastContacted: "2026-10-21",
  },
  {
    id: "c4",
    name: "Marcus Oyelaran",
    title: "Director of IT",
    email: "marcus.oyelaran@halcyonfreight.com",
    phone: "(614) 555-0129",
    role: "Technical evaluator",
    lastContacted: "2026-10-24",
  },
  {
    id: "c5",
    name: "Elena Sokolova",
    title: "Procurement Manager",
    email: "elena.sokolova@halcyonfreight.com",
    phone: "(614) 555-0151",
    role: "Procurement",
    lastContacted: "2026-10-16",
  },
  {
    id: "c6",
    name: "Kevin Liu",
    title: "Dispatch Supervisor, Columbus",
    email: "kevin.liu@halcyonfreight.com",
    phone: "(614) 555-0174",
    role: "End user",
    lastContacted: "2026-08-30",
  },
]

export const activities: Activity[] = [
  {
    id: "a1",
    type: "meeting",
    title: "Q4 business review",
    body: "Reviewed on-time delivery gains (+6.2% since rollout) and dispatch time savings. Dana wants a telematics pricing proposal before the January budget lock.",
    at: "2026-10-29T14:00:00",
    by: "Priya Raman",
    with: ["Dana Whitfield", "Tom Brannigan"],
  },
  {
    id: "a2",
    type: "email",
    title: "Sent renewal proposal draft",
    body: "Shared a 3-year renewal draft with a 4% annual uplift and telematics bundled for the 9 Midwest depots. Asked for feedback by Nov 7.",
    at: "2026-10-27T10:15:00",
    by: "Priya Raman",
    with: ["Dana Whitfield", "Elena Sokolova"],
  },
  {
    id: "a3",
    type: "call",
    title: "API rate limits for the TMS integration",
    body: "Marcus is hitting rate limits during the 5 a.m. batch sync. Looped in solutions engineering; agreed to test a higher limit on their sandbox tenant.",
    at: "2026-10-24T16:30:00",
    by: "Jordan Ellis",
    with: ["Marcus Oyelaran"],
  },
  {
    id: "a4",
    type: "note",
    title: "Champion update",
    body: "Tom says the Columbus and Indianapolis terminals have fully moved off spreadsheets. He's happy to be a reference for other LTL prospects.",
    at: "2026-10-21T11:05:00",
    by: "Priya Raman",
  },
  {
    id: "a5",
    type: "email",
    title: "Security questionnaire requested",
    body: "Elena asked for an updated SIG Lite questionnaire and our SOC 2 Type II report ahead of the renewal. Sent both through the trust portal.",
    at: "2026-10-16T09:40:00",
    by: "Priya Raman",
    with: ["Elena Sokolova"],
  },
  {
    id: "a6",
    type: "meeting",
    title: "Route optimization workshop (onsite)",
    body: "Half-day session at the Columbus HQ with dispatch leads. Mapped out the multi-stop consolidation rules they want for the holiday peak.",
    at: "2026-10-10T09:00:00",
    by: "Mateo Alvarez",
    with: ["Tom Brannigan", "Kevin Liu"],
  },
  {
    id: "a7",
    type: "call",
    title: "Midwest depot expansion",
    body: "Dana confirmed 9 new depots open in Q1 2027. Each needs dispatch seats and possibly telematics. Created the Midwest expansion opportunity ($48,000).",
    at: "2026-10-03T13:20:00",
    by: "Priya Raman",
    with: ["Dana Whitfield"],
  },
  {
    id: "a8",
    type: "note",
    title: "Support escalation resolved",
    body: "The Louisville terminal's label-printing outage (ticket #58213) was fixed with a driver update. Kevin confirmed the fix holds across all shifts.",
    at: "2026-09-18T15:45:00",
    by: "Jordan Ellis",
  },
]
