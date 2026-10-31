// In-memory stand-in for the workspace API. There is no backend: data lives for the page session only.
export interface WorkspaceGeneral {
  name: string;
  contactEmail: string;
}

export interface Project {
  id: string;
  name: string;
  lead: string;
  openTasks: number;
  status: 'On track' | 'At risk' | 'Done';
}

export interface Workspace extends WorkspaceGeneral {
  slug: string;
  plan: string;
  members: number;
  projects: Project[];
  updatedBy: string;
  updatedAt: Date;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let stored: Workspace = {
  name: 'Harbor Lane Studio',
  contactEmail: 'ops@harborlane.studio',
  slug: 'harbor-lane',
  plan: 'Team',
  members: 14,
  updatedBy: 'Priya Natarajan',
  updatedAt: new Date('2026-10-21T15:42:00Z'),
  projects: [
    { id: 'p1', name: 'Q4 website relaunch', lead: 'Priya Natarajan', openTasks: 23, status: 'On track' },
    { id: 'p2', name: 'Mobile onboarding', lead: 'Diego Alvarez', openTasks: 41, status: 'At risk' },
    { id: 'p3', name: 'Brand guidelines refresh', lead: 'Sam Okafor', openTasks: 0, status: 'Done' },
    { id: 'p4', name: 'Customer portal v2', lead: 'Lena Fischer', openTasks: 17, status: 'On track' },
  ],
};

export function getWorkspace(): Workspace {
  return stored;
}

export type SaveResult =
  | { ok: true; value: WorkspaceGeneral }
  | { ok: false; error: string; errors?: Partial<Record<keyof WorkspaceGeneral, string>> };

/** Server-side checks are authoritative; the form repeats the simple ones for quick feedback. */
export async function saveWorkspaceGeneral(draft: WorkspaceGeneral, savedBy: string): Promise<SaveResult> {
  await wait(700);
  const name = draft.name.trim();
  const contactEmail = draft.contactEmail.trim();
  if (name.length > 60) {
    return { ok: false, error: 'The workspace wasn’t saved. Fix the highlighted field.', errors: { name: 'Use 60 characters or fewer.' } };
  }
  stored = { ...stored, name, contactEmail, updatedBy: savedBy, updatedAt: new Date() };
  return { ok: true, value: { name, contactEmail } };
}
