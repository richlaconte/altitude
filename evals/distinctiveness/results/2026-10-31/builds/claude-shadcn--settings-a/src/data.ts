export type Workspace = {
  name: string
  contactEmail: string
  slug: string
  plan: string
  createdAt: string
}

export type ProjectStatus = "On track" | "At risk" | "Completed"

export type Project = {
  id: string
  name: string
  lead: string
  status: ProjectStatus
  openTasks: number
  due: string
}

export const initialWorkspace: Workspace = {
  name: "Northwind Product Studio",
  contactEmail: "ops@northwindstudio.com",
  slug: "northwind",
  plan: "Team plan",
  createdAt: "March 14, 2024",
}

export const members = [
  { name: "Priya Raman", initials: "PR" },
  { name: "Marcus Oyelaran", initials: "MO" },
  { name: "Lena Fischer", initials: "LF" },
  { name: "Tomás Herrera", initials: "TH" },
  { name: "Aiko Tanaka", initials: "AT" },
  { name: "Daniel Brooks", initials: "DB" },
  { name: "Sofia Marchetti", initials: "SM" },
]

export const projects: Project[] = [
  { id: "p1", name: "Mobile checkout redesign", lead: "Priya Raman", status: "On track", openTasks: 18, due: "Nov 21, 2026" },
  { id: "p2", name: "Billing service migration", lead: "Marcus Oyelaran", status: "At risk", openTasks: 31, due: "Dec 5, 2026" },
  { id: "p3", name: "Q4 onboarding experiments", lead: "Lena Fischer", status: "On track", openTasks: 9, due: "Dec 12, 2026" },
  { id: "p4", name: "Partner API v2", lead: "Tomás Herrera", status: "Completed", openTasks: 0, due: "Oct 24, 2026" },
  { id: "p5", name: "Accessibility audit fixes", lead: "Aiko Tanaka", status: "On track", openTasks: 12, due: "Jan 9, 2027" },
]
