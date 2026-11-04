export type ProjectStatus = 'On track' | 'At risk' | 'Blocked' | 'Planning' | 'Completed';

export interface Project {
  id: string;
  key: string;
  name: string;
  owner: string;
  team: string;
  status: ProjectStatus;
  progress: number; // 0–100
  openTasks: number;
  dueDate: string; // ISO date
  updatedAt: string; // ISO datetime
}

export const PROJECTS: Project[] = [
  { id: 'p1', key: 'WEB', name: 'Marketing site redesign', owner: 'Priya Raman', team: 'Brand', status: 'On track', progress: 64, openTasks: 18, dueDate: '2026-12-12', updatedAt: '2026-11-03T09:42:00' },
  { id: 'p2', key: 'MOB', name: 'Mobile app 3.0 launch', owner: 'Daniel Okafor', team: 'Mobile', status: 'At risk', progress: 41, openTasks: 57, dueDate: '2026-11-28', updatedAt: '2026-11-03T08:15:00' },
  { id: 'p3', key: 'BIL', name: 'Billing migration to Stripe', owner: 'Mei Lin Chen', team: 'Payments', status: 'Blocked', progress: 33, openTasks: 24, dueDate: '2026-12-01', updatedAt: '2026-11-02T17:03:00' },
  { id: 'p4', key: 'ONB', name: 'Customer onboarding flow', owner: 'Jonas Becker', team: 'Growth', status: 'On track', progress: 78, openTasks: 9, dueDate: '2026-11-20', updatedAt: '2026-11-02T15:30:00' },
  { id: 'p5', key: 'SOC', name: 'SOC 2 Type II audit', owner: 'Amara Nwosu', team: 'Security', status: 'Planning', progress: 12, openTasks: 41, dueDate: '2027-02-15', updatedAt: '2026-11-01T11:20:00' },
  { id: 'p6', key: 'DSH', name: 'Analytics dashboard v2', owner: 'Lucas Moreau', team: 'Data', status: 'On track', progress: 55, openTasks: 22, dueDate: '2026-12-19', updatedAt: '2026-11-02T10:05:00' },
  { id: 'p7', key: 'API', name: 'Public API rate limiting', owner: 'Sofia Alvarez', team: 'Platform', status: 'Completed', progress: 100, openTasks: 0, dueDate: '2026-10-30', updatedAt: '2026-10-30T16:45:00' },
  { id: 'p8', key: 'HLP', name: 'Help center content refresh', owner: 'Grace Kim', team: 'Support', status: 'At risk', progress: 29, openTasks: 31, dueDate: '2026-11-25', updatedAt: '2026-10-31T13:12:00' },
  { id: 'p9', key: 'SSO', name: 'Enterprise SSO (SAML)', owner: 'Tomás Herrera', team: 'Platform', status: 'On track', progress: 82, openTasks: 6, dueDate: '2026-11-15', updatedAt: '2026-11-03T07:58:00' },
  { id: 'p10', key: 'INF', name: 'Kubernetes cluster upgrade', owner: 'Hannah Schultz', team: 'Infrastructure', status: 'Planning', progress: 5, openTasks: 14, dueDate: '2027-01-31', updatedAt: '2026-10-29T09:00:00' },
  { id: 'p11', key: 'Q4P', name: 'Q4 pricing experiment', owner: 'Ravi Patel', team: 'Growth', status: 'Completed', progress: 100, openTasks: 0, dueDate: '2026-10-15', updatedAt: '2026-10-16T12:30:00' },
  { id: 'p12', key: 'A11Y', name: 'Accessibility remediation', owner: 'Elena Petrova', team: 'Design Systems', status: 'On track', progress: 47, openTasks: 26, dueDate: '2027-01-10', updatedAt: '2026-11-02T14:22:00' },
  { id: 'p13', key: 'NTF', name: 'Notification preferences', owner: 'Kwame Asante', team: 'Mobile', status: 'Blocked', progress: 60, openTasks: 11, dueDate: '2026-11-22', updatedAt: '2026-11-01T18:40:00' },
  { id: 'p14', key: 'SRC', name: 'Search relevance tuning', owner: 'Yuki Tanaka', team: 'Data', status: 'At risk', progress: 38, openTasks: 19, dueDate: '2026-12-05', updatedAt: '2026-11-02T09:10:00' },
];

/** Simulates a network fetch so refresh has something real to wait for. */
export function fetchProjects(): Promise<Project[]> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(PROJECTS.map((p) => ({ ...p }))), 900);
  });
}
