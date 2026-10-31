export type ProjectStatus = "on-track" | "at-risk" | "off-track" | "completed" | "planning"

export type Project = {
  id: string
  name: string
  key: string
  status: ProjectStatus
  owner: { name: string; initials: string }
  progress: number
  openTasks: number
  dueDate: string
  updatedAt: string
}

export const projects: Project[] = [
  {
    id: "prj_01",
    name: "Q4 Mobile App Redesign",
    key: "MOB",
    status: "on-track",
    owner: { name: "Priya Raman", initials: "PR" },
    progress: 68,
    openTasks: 24,
    dueDate: "2026-12-12",
    updatedAt: "2026-10-30T09:42:00",
  },
  {
    id: "prj_02",
    name: "Billing Service Migration",
    key: "BIL",
    status: "at-risk",
    owner: { name: "Marcus Oyelaran", initials: "MO" },
    progress: 41,
    openTasks: 37,
    dueDate: "2026-11-20",
    updatedAt: "2026-10-30T08:15:00",
  },
  {
    id: "prj_03",
    name: "Customer Onboarding Flow",
    key: "ONB",
    status: "on-track",
    owner: { name: "Sofia Lindqvist", initials: "SL" },
    progress: 82,
    openTasks: 9,
    dueDate: "2026-11-08",
    updatedAt: "2026-10-29T17:03:00",
  },
  {
    id: "prj_04",
    name: "Data Warehouse Consolidation",
    key: "DWH",
    status: "off-track",
    owner: { name: "Daniel Okafor", initials: "DO" },
    progress: 23,
    openTasks: 58,
    dueDate: "2026-11-15",
    updatedAt: "2026-10-29T14:27:00",
  },
  {
    id: "prj_05",
    name: "SOC 2 Type II Audit Prep",
    key: "SEC",
    status: "on-track",
    owner: { name: "Hannah Weiss", initials: "HW" },
    progress: 55,
    openTasks: 18,
    dueDate: "2027-01-31",
    updatedAt: "2026-10-28T11:50:00",
  },
  {
    id: "prj_06",
    name: "Marketing Site Refresh",
    key: "WEB",
    status: "completed",
    owner: { name: "Leo Martins", initials: "LM" },
    progress: 100,
    openTasks: 0,
    dueDate: "2026-10-17",
    updatedAt: "2026-10-17T16:20:00",
  },
  {
    id: "prj_07",
    name: "Partner API v2",
    key: "API",
    status: "at-risk",
    owner: { name: "Aiko Tanaka", initials: "AT" },
    progress: 47,
    openTasks: 31,
    dueDate: "2026-12-01",
    updatedAt: "2026-10-28T09:05:00",
  },
  {
    id: "prj_08",
    name: "Support Knowledge Base",
    key: "KB",
    status: "planning",
    owner: { name: "Grace Mensah", initials: "GM" },
    progress: 8,
    openTasks: 42,
    dueDate: "2027-02-14",
    updatedAt: "2026-10-27T13:44:00",
  },
  {
    id: "prj_09",
    name: "Design System Tokens",
    key: "DSN",
    status: "on-track",
    owner: { name: "Priya Raman", initials: "PR" },
    progress: 74,
    openTasks: 12,
    dueDate: "2026-11-27",
    updatedAt: "2026-10-27T10:12:00",
  },
  {
    id: "prj_10",
    name: "Warehouse Scanner Rollout",
    key: "OPS",
    status: "off-track",
    owner: { name: "Tomás Herrera", initials: "TH" },
    progress: 31,
    openTasks: 26,
    dueDate: "2026-11-05",
    updatedAt: "2026-10-26T15:38:00",
  },
  {
    id: "prj_11",
    name: "Annual Pricing Review",
    key: "PRC",
    status: "planning",
    owner: { name: "Marcus Oyelaran", initials: "MO" },
    progress: 12,
    openTasks: 15,
    dueDate: "2027-01-10",
    updatedAt: "2026-10-24T12:00:00",
  },
  {
    id: "prj_12",
    name: "Accessibility Remediation",
    key: "A11Y",
    status: "completed",
    owner: { name: "Sofia Lindqvist", initials: "SL" },
    progress: 100,
    openTasks: 0,
    dueDate: "2026-10-03",
    updatedAt: "2026-10-03T18:45:00",
  },
]

/** Simulates a network fetch so the refresh action has something to wait on. */
export function fetchProjects(): Promise<Project[]> {
  return new Promise((resolve) => setTimeout(() => resolve(structuredClone(projects)), 700))
}
