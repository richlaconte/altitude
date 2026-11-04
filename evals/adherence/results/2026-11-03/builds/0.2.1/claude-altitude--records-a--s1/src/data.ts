export type Status = 'On track' | 'At risk' | 'Blocked' | 'Planning' | 'Done';

export interface Project {
  id: string;
  key: string;
  name: string;
  owner: string;
  status: Status;
  progress: number;
  openTasks: number;
  due: string; // ISO date
  updatedMinutesAgo: number;
}

export const PROJECTS: Project[] = [
  { id: 'p-101', key: 'WEB', name: 'Website redesign', owner: 'Priya Natarajan', status: 'On track', progress: 64, openTasks: 23, due: '2026-12-12', updatedMinutesAgo: 12 },
  { id: 'p-102', key: 'MOB', name: 'Mobile app 3.0', owner: 'Marcus Webb', status: 'At risk', progress: 41, openTasks: 57, due: '2026-11-28', updatedMinutesAgo: 34 },
  { id: 'p-103', key: 'BIL', name: 'Billing migration to Stripe', owner: 'Elena Kowalski', status: 'Blocked', progress: 72, openTasks: 9, due: '2026-11-15', updatedMinutesAgo: 95 },
  { id: 'p-104', key: 'ONB', name: 'Customer onboarding flow', owner: 'Sam Okafor', status: 'On track', progress: 83, openTasks: 6, due: '2026-11-20', updatedMinutesAgo: 8 },
  { id: 'p-105', key: 'SSO', name: 'SSO and SCIM provisioning', owner: 'Jordan Reyes', status: 'Planning', progress: 5, openTasks: 31, due: '2027-02-01', updatedMinutesAgo: 1440 },
  { id: 'p-106', key: 'DSH', name: 'Analytics dashboard v2', owner: 'Aiko Tanaka', status: 'On track', progress: 55, openTasks: 18, due: '2026-12-19', updatedMinutesAgo: 47 },
  { id: 'p-107', key: 'Q4M', name: 'Q4 marketing launch', owner: 'Hannah Lindqvist', status: 'At risk', progress: 38, openTasks: 26, due: '2026-11-24', updatedMinutesAgo: 180 },
  { id: 'p-108', key: 'API', name: 'Public API rate limiting', owner: 'Dev Malhotra', status: 'Done', progress: 100, openTasks: 0, due: '2026-10-30', updatedMinutesAgo: 4320 },
  { id: 'p-109', key: 'DOC', name: 'Help center rewrite', owner: 'Grace Mbeki', status: 'On track', progress: 47, openTasks: 14, due: '2027-01-10', updatedMinutesAgo: 260 },
  { id: 'p-110', key: 'INF', name: 'Kubernetes cluster upgrade', owner: 'Tomás Herrera', status: 'Blocked', progress: 20, openTasks: 11, due: '2026-11-18', updatedMinutesAgo: 600 },
  { id: 'p-111', key: 'A11', name: 'Accessibility audit fixes', owner: 'Priya Natarajan', status: 'On track', progress: 68, openTasks: 15, due: '2026-12-05', updatedMinutesAgo: 22 },
  { id: 'p-112', key: 'SRC', name: 'Search relevance tuning', owner: 'Aiko Tanaka', status: 'Planning', progress: 10, openTasks: 20, due: '2027-01-24', updatedMinutesAgo: 2880 },
  { id: 'p-113', key: 'NTF', name: 'Notification preferences', owner: 'Sam Okafor', status: 'Done', progress: 100, openTasks: 0, due: '2026-10-21', updatedMinutesAgo: 10080 },
  { id: 'p-114', key: 'SEC', name: 'SOC 2 Type II readiness', owner: 'Elena Kowalski', status: 'At risk', progress: 52, openTasks: 34, due: '2026-12-31', updatedMinutesAgo: 75 },
];

/** Stand-in for a fetch: resolves with fresh copies after a short delay, with activity nudged as if teammates kept working. */
export function fetchProjects(round: number): Promise<Project[]> {
  return new Promise((resolve) =>
    setTimeout(() => {
      resolve(
        PROJECTS.map((p, i) => {
          if (p.status === 'Done' || (i + round) % 4 !== 0) return { ...p };
          const progress = Math.min(99, p.progress + 2 * round);
          return { ...p, progress, openTasks: Math.max(0, p.openTasks - round), updatedMinutesAgo: 1 };
        }),
      );
    }, 900),
  );
}
