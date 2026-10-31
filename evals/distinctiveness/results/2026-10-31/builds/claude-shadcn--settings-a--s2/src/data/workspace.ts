export type Workspace = {
  name: string
  contactEmail: string
  slug: string
  plan: string
  createdAt: string
}

export type Project = {
  id: string
  name: string
  status: "On track" | "At risk" | "Completed"
  openTasks: number
  lead: string
  dueDate: string
}

export type Member = {
  name: string
  initials: string
}

export const initialWorkspace: Workspace = {
  name: "Northwind Product Team",
  contactEmail: "ops@northwind.io",
  slug: "northwind-product",
  plan: "Team",
  createdAt: "March 14, 2025",
}

export const projects: Project[] = [
  {
    id: "p1",
    name: "Mobile app 3.0 redesign",
    status: "On track",
    openTasks: 24,
    lead: "Priya Raman",
    dueDate: "Dec 12, 2026",
  },
  {
    id: "p2",
    name: "Billing migration to Stripe",
    status: "At risk",
    openTasks: 17,
    lead: "Marcus Oyelaran",
    dueDate: "Nov 20, 2026",
  },
  {
    id: "p3",
    name: "Q4 customer onboarding revamp",
    status: "On track",
    openTasks: 9,
    lead: "Elena Duarte",
    dueDate: "Dec 3, 2026",
  },
  {
    id: "p4",
    name: "SOC 2 Type II audit prep",
    status: "Completed",
    openTasks: 0,
    lead: "Jonah Kim",
    dueDate: "Oct 15, 2026",
  },
]

export const members: Member[] = [
  { name: "Priya Raman", initials: "PR" },
  { name: "Marcus Oyelaran", initials: "MO" },
  { name: "Elena Duarte", initials: "ED" },
  { name: "Jonah Kim", initials: "JK" },
  { name: "Sofia Lindqvist", initials: "SL" },
  { name: "Tomás Herrera", initials: "TH" },
  { name: "Aisha Bello", initials: "AB" },
]
