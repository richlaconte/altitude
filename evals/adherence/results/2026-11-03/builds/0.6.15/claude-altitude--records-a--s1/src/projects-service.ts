/**
 * In-memory stand-in for the projects service. There is no backend: this module simulates
 * network latency and an optional failure so the screen's loading, refreshing and failed
 * states can be exercised. Replace `loadProjects` with the real API call.
 */
export type ProjectStatus = 'on-track' | 'at-risk' | 'blocked' | 'completed';

export interface Project {
  id: string;
  name: string;
  lead: string;
  status: ProjectStatus;
  openTasks: number;
  /** ISO date the project is due. */
  due: string;
}

const PROJECTS: Project[] = [
  { id: 'prj-1042', name: 'Harbourside clinic patient portal', lead: 'Priya Raman', status: 'on-track', openTasks: 14, due: '2026-12-12' },
  { id: 'prj-1043', name: 'Q1 freight rate card refresh', lead: 'Tomás Herrera', status: 'at-risk', openTasks: 9, due: '2026-11-21' },
  { id: 'prj-1051', name: 'Warehouse scanner firmware rollout', lead: 'Ingrid Solberg', status: 'blocked', openTasks: 22, due: '2026-11-28' },
  { id: 'prj-1057', name: 'Onboarding email sequence', lead: 'Dev Patel', status: 'completed', openTasks: 0, due: '2026-10-30' },
  { id: 'prj-1060', name: 'Mobile check-in redesign', lead: 'Aiyana Whitehorse', status: 'on-track', openTasks: 31, due: '2027-01-16' },
  { id: 'prj-1064', name: 'SOC 2 evidence collection', lead: 'Marcus Bell', status: 'at-risk', openTasks: 17, due: '2026-12-05' },
  { id: 'prj-1068', name: 'Customer support macros cleanup', lead: 'Hana Kobayashi', status: 'on-track', openTasks: 6, due: '2026-11-19' },
  { id: 'prj-1071', name: 'Billing migration to usage plans', lead: 'Olusegun Adeyemi', status: 'blocked', openTasks: 41, due: '2027-02-27' },
  { id: 'prj-1075', name: 'Winter trade show booth', lead: 'Clara Nguyen', status: 'on-track', openTasks: 12, due: '2026-12-02' },
  { id: 'prj-1079', name: 'Data warehouse cost review', lead: 'Rafael Costa', status: 'completed', openTasks: 0, due: '2026-10-24' },
  { id: 'prj-1082', name: 'Accessibility audit fixes', lead: 'Sofia Lindqvist', status: 'on-track', openTasks: 19, due: '2026-12-19' },
  { id: 'prj-1086', name: 'Partner API v2 documentation', lead: 'Kwame Asante', status: 'at-risk', openTasks: 8, due: '2026-11-14' },
];

let failNext = false;
/** Make the next load reject, to demonstrate the failed state. */
export function failNextLoad() {
  failNext = true;
}

/** Projects whose name contains the query (case-insensitive). The query only searches names. */
export function loadProjects(query: string, { signal }: { signal: AbortSignal }): Promise<readonly Project[]> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (failNext) {
        failNext = false;
        reject(new Error("We couldn't reach the projects service. Try again."));
        return;
      }
      const q = query.trim().toLowerCase();
      resolve(q ? PROJECTS.filter(p => p.name.toLowerCase().includes(q)) : PROJECTS);
    }, 450);
    signal.addEventListener('abort', () => clearTimeout(timer));
  });
}
