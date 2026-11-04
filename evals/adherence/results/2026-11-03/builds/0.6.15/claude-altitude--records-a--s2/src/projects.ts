/**
 * In-memory stand-in for the projects service. There is no backend: this module simulates
 * latency, honours abort, and can be told to fail so every collection state can be exercised.
 * Replace `loadProjects` with the real API call; keep its contract (resolve with the matching
 * projects, or reject with an Error whose message can be shown to the person).
 */
export type ProjectStatus = 'on-track' | 'at-risk' | 'blocked' | 'completed';

export interface Project {
  id: string;
  key: string;
  name: string;
  status: ProjectStatus;
  lead: string;
  due: string; // ISO date
  openTasks: number;
  updatedAt: string; // ISO date-time
}

const PROJECTS: Project[] = [
  { id: 'prj_01', key: 'RID', name: 'Rider app offline mode', status: 'on-track', lead: 'Amara Okafor', due: '2026-12-11', openTasks: 23, updatedAt: '2026-11-03T08:42:00Z' },
  { id: 'prj_02', key: 'DOC', name: 'Dock sensor firmware 4.2', status: 'at-risk', lead: 'Tomasz Wiśniewski', due: '2026-11-21', openTasks: 41, updatedAt: '2026-11-02T16:10:00Z' },
  { id: 'prj_03', key: 'PAY', name: 'Monthly pass checkout redesign', status: 'on-track', lead: 'Li Wei', due: '2027-01-15', openTasks: 18, updatedAt: '2026-11-03T07:05:00Z' },
  { id: 'prj_04', key: 'OPS', name: 'Rebalancing van route planner', status: 'blocked', lead: 'Sofía Herrera', due: '2026-11-28', openTasks: 12, updatedAt: '2026-10-31T11:30:00Z' },
  { id: 'prj_05', key: 'SUP', name: 'Damage report intake form', status: 'completed', lead: 'Jonah Feld', due: '2026-10-24', openTasks: 0, updatedAt: '2026-10-24T15:00:00Z' },
  { id: 'prj_06', key: 'CTY', name: 'Riverside expansion: 14 new docks', status: 'on-track', lead: 'Priya Raman', due: '2027-03-02', openTasks: 57, updatedAt: '2026-11-01T09:20:00Z' },
  { id: 'prj_07', key: 'ACC', name: 'Screen reader audit of rider app', status: 'at-risk', lead: 'Kwame Asante', due: '2026-12-01', openTasks: 9, updatedAt: '2026-11-02T13:45:00Z' },
  { id: 'prj_08', key: 'DAT', name: 'Trip data warehouse migration', status: 'on-track', lead: 'Mei Tanaka', due: '2027-02-10', openTasks: 34, updatedAt: '2026-10-30T17:55:00Z' },
  { id: 'prj_09', key: 'PAY', name: 'Student discount verification', status: 'completed', lead: 'Li Wei', due: '2026-09-30', openTasks: 0, updatedAt: '2026-09-29T10:00:00Z' },
  { id: 'prj_10', key: 'MKT', name: 'Winter riding campaign', status: 'on-track', lead: 'Oona Lindqvist', due: '2026-12-05', openTasks: 15, updatedAt: '2026-11-03T06:30:00Z' },
  { id: 'prj_11', key: 'OPS', name: 'E-bike battery swap scheduling', status: 'blocked', lead: 'Rafael Monteiro', due: '2026-12-18', openTasks: 27, updatedAt: '2026-10-28T14:12:00Z' },
  { id: 'prj_12', key: 'SEC', name: 'Rider account two-factor sign-in', status: 'at-risk', lead: 'Hannah Becker', due: '2026-11-30', openTasks: 11, updatedAt: '2026-11-02T19:02:00Z' },
  { id: 'prj_13', key: 'CTY', name: 'Council parking permit renewals', status: 'completed', lead: 'Priya Raman', due: '2026-10-15', openTasks: 0, updatedAt: '2026-10-14T08:00:00Z' },
  { id: 'prj_14', key: 'SUP', name: 'Support macro library cleanup', status: 'on-track', lead: 'Jonah Feld', due: '2026-11-14', openTasks: 6, updatedAt: '2026-11-01T12:40:00Z' },
];

let failNext = false;
/** Fixture control: the next load rejects. Also enabled for refreshes with `?simulate=failure` in the URL. */
export function failNextLoad() {
  failNext = true;
}
const failRefreshes = typeof location !== 'undefined' && new URLSearchParams(location.search).get('simulate') === 'failure';
let loads = 0;

/** Case-insensitive match on project name only; that is the scope this sample service supports. */
export function loadProjects(query: string, { signal }: { signal: AbortSignal }): Promise<readonly Project[]> {
  loads += 1;
  const shouldFail = failNext || (failRefreshes && loads > 1);
  failNext = false;
  const needle = query.trim().toLocaleLowerCase();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (shouldFail) reject(new Error("We couldn't reach the projects service. Try again."));
      else resolve(needle ? PROJECTS.filter(p => p.name.toLocaleLowerCase().includes(needle)) : PROJECTS);
    }, 350 + Math.round(Math.random() * 350));
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
}
