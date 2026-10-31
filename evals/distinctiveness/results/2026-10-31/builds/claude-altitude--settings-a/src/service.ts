// In-memory stand-in for the workspace API. There is no backend; writes live for the page session only.
// Append ?fail=1 to the URL to make saves fail, for checking the failure and retry path.

export interface WorkspaceGeneral {
  name: string;
  contactEmail: string;
}

export interface Workspace extends WorkspaceGeneral {
  slug: string;
  plan: string;
  memberCount: number;
  activeProjects: number;
  owner: string;
  updatedBy: string;
  updatedAt: Date;
}

let workspace: Workspace = {
  name: 'Northwind Product Team',
  contactEmail: 'product-ops@northwind.io',
  slug: 'northwind-product',
  plan: 'Team',
  memberCount: 14,
  activeProjects: 9,
  owner: 'Priya Raman',
  updatedBy: 'Priya Raman',
  updatedAt: new Date('2026-10-21T15:42:00'),
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const shouldFail = () => new URLSearchParams(window.location.search).has('fail');

export function getWorkspace(): Workspace {
  return workspace;
}

export async function saveWorkspaceGeneral(general: WorkspaceGeneral): Promise<Workspace> {
  await wait(700);
  if (shouldFail()) throw new Error('We couldn’t reach the server. Your changes are still here.');
  workspace = { ...workspace, ...general, updatedBy: 'You', updatedAt: new Date() };
  return workspace;
}
