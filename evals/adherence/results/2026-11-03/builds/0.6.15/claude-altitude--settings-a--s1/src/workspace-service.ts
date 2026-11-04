// In-memory stand-in for the workspace API. There is no backend: this module owns the sample
// record and simulates network latency so the pending state is visible. Replace `saveWorkspaceDetails`
// with the real request; it must resolve `ok: true` only once the server has stored the change.
import type { EditRecordResult } from 'altitude-design';

export interface WorkspaceDetails {
  name: string;
  contactEmail: string;
}

export interface WorkspaceSummary extends WorkspaceDetails {
  slug: string;
  plan: string;
  memberCount: number;
  activeProjects: number;
  owner: string;
}

let stored: WorkspaceSummary = {
  name: 'Harbour Lane Architects',
  contactEmail: 'studio@harbourlane.example',
  slug: 'harbour-lane',
  plan: 'Team (annual)',
  memberCount: 14,
  activeProjects: 9,
  owner: 'Imogen Achterberg',
};

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function getWorkspace(): WorkspaceSummary {
  return { ...stored };
}

export async function saveWorkspaceDetails(draft: WorkspaceDetails): Promise<EditRecordResult<WorkspaceDetails>> {
  await wait(800);
  const canonical = { name: draft.name.trim(), contactEmail: draft.contactEmail.trim().toLowerCase() };
  stored = { ...stored, ...canonical };
  return { ok: true, value: canonical };
}
