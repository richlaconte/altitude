// Sample data and an in-memory stand-in for the workspace service. There is no backend:
// saved settings live in this module for the life of the page and are lost on reload.

export interface WorkspaceSettings {
  name: string;
  contactEmail: string;
}

export interface Project {
  id: string;
  name: string;
  lead: string;
  due: string;
}

export interface Workspace extends WorkspaceSettings {
  members: number;
  createdOn: string;
  projects: Project[];
}

let current: Workspace = {
  name: 'Saltmarsh Ferries operations',
  contactEmail: 'ops-desk@saltmarsh-ferries.example',
  members: 14,
  createdOn: '9 March 2025',
  projects: [
    { id: 'p1', name: 'Winter timetable 2026–27', lead: 'Oluwaseun Adeyemi', due: '28 November 2026' },
    { id: 'p2', name: 'Harwick pier ramp refit', lead: 'Ines Ferreira-Holt', due: '15 January 2027' },
    { id: 'p3', name: 'Crew rota tooling', lead: 'Tom Ashby', due: '6 December 2026' },
    { id: 'p4', name: 'Ticket machine replacement', lead: 'Priya Raman', due: '20 February 2027' },
  ],
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function getWorkspace(): Workspace {
  return current;
}

/** Add ?failSave to the URL to make every save fail, to check the failure state. */
const failSaves = typeof location !== 'undefined' && new URLSearchParams(location.search).has('failSave');

export async function saveWorkspaceSettings(settings: WorkspaceSettings): Promise<WorkspaceSettings> {
  await wait(700);
  if (failSaves) throw new Error('Simulated network failure');
  current = { ...current, name: settings.name.trim(), contactEmail: settings.contactEmail.trim() };
  return { name: current.name, contactEmail: current.contactEmail };
}
