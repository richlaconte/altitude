// In-memory stand-in for the team's projects service. There is no backend; replace `loadProjects` with a real call.

export type ProjectStatus = 'On track' | 'At risk' | 'Off track' | 'Completed';

export interface Project {
  id: string;
  name: string;
  owner: string;
  status: ProjectStatus;
  openTasks: number;
  dueDate: string; // ISO date
}

const PROJECTS: Project[] = [
  {id: 'prj-1042', name: 'Mobile app redesign', owner: 'Priya Natarajan', status: 'On track', openTasks: 34, dueDate: '2026-12-12'},
  {id: 'prj-1043', name: 'Q1 marketing campaign', owner: 'Marcus Webb', status: 'At risk', openTasks: 18, dueDate: '2026-11-20'},
  {id: 'prj-1047', name: 'Customer onboarding revamp', owner: 'Elena Sokolova', status: 'On track', openTasks: 22, dueDate: '2027-01-15'},
  {id: 'prj-1051', name: 'Billing service migration', owner: 'Jordan Okafor', status: 'Off track', openTasks: 41, dueDate: '2026-11-08'},
  {id: 'prj-1055', name: 'Help center content refresh', owner: 'Sam Lindqvist', status: 'Completed', openTasks: 0, dueDate: '2026-10-01'},
  {id: 'prj-1058', name: 'Data warehouse consolidation', owner: 'Aiko Tanaka', status: 'At risk', openTasks: 27, dueDate: '2026-12-31'},
  {id: 'prj-1060', name: 'SOC 2 audit preparation', owner: 'Rafael Mendes', status: 'On track', openTasks: 15, dueDate: '2027-02-28'},
  {id: 'prj-1063', name: 'Partner API v2', owner: 'Priya Natarajan', status: 'On track', openTasks: 29, dueDate: '2027-03-10'},
  {id: 'prj-1066', name: 'Annual offsite planning', owner: 'Grace Kim', status: 'Completed', openTasks: 0, dueDate: '2026-09-18'},
  {id: 'prj-1068', name: 'Search relevance improvements', owner: 'Tomás Herrera', status: 'At risk', openTasks: 12, dueDate: '2026-11-29'},
  {id: 'prj-1071', name: 'Design system tokens rollout', owner: 'Elena Sokolova', status: 'On track', openTasks: 9, dueDate: '2026-12-05'},
  {id: 'prj-1074', name: 'Website accessibility remediation', owner: 'Noah Fischer', status: 'Off track', openTasks: 37, dueDate: '2026-11-15'},
];

// Development fixtures: ?simulate=failure rejects every load, ?simulate=empty returns no projects, ?simulate=slow adds latency.
const simulate = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('simulate') : null;

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); }, {once: true});
  });
}

/** Searches project names only (case-insensitive). */
export async function loadProjects(query: string, {signal}: {signal: AbortSignal}): Promise<readonly Project[]> {
  await wait(simulate === 'slow' ? 2000 : 250 + Math.random() * 350, signal);
  if (simulate === 'failure') throw new Error('Projects could not be loaded. Check your connection and try again.');
  if (simulate === 'empty') return [];
  const needle = query.trim().toLowerCase();
  return needle ? PROJECTS.filter(project => project.name.toLowerCase().includes(needle)) : PROJECTS;
}
