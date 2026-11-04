export interface Workspace {
  name: string;
  contactEmail: string;
}

export const initialWorkspace: Workspace = {
  name: 'Northwind Studio',
  contactEmail: 'ops@northwindstudio.com',
};

export const workspaceMeta = {
  slug: 'northwind-studio',
  plan: 'Team',
  createdOn: 'March 14, 2024',
  seatsUsed: 14,
  seatsTotal: 20,
};

export type ProjectStatus = 'On track' | 'At risk' | 'Blocked' | 'Done';

export interface Project {
  id: string;
  name: string;
  lead: string;
  status: ProjectStatus;
  openTasks: number;
  due: string;
}

export const projects: Project[] = [
  { id: 'p1', name: 'Q4 website relaunch', lead: 'Priya Raman', status: 'On track', openTasks: 23, due: 'Dec 12' },
  { id: 'p2', name: 'Mobile onboarding v2', lead: 'Marcus Oyelaran', status: 'At risk', openTasks: 17, due: 'Nov 28' },
  { id: 'p3', name: 'Billing migration', lead: 'Elena Kowalski', status: 'Blocked', openTasks: 9, due: 'Nov 21' },
  { id: 'p4', name: 'Customer research: SMB', lead: 'Jordan Lee', status: 'On track', openTasks: 6, due: 'Jan 9' },
  { id: 'p5', name: 'Brand guidelines refresh', lead: 'Sam Whitaker', status: 'Done', openTasks: 0, due: 'Oct 31' },
];

export interface Member {
  name: string;
  status: 'active' | 'idle' | 'offline';
}

export const members: Member[] = [
  { name: 'Priya Raman', status: 'active' },
  { name: 'Marcus Oyelaran', status: 'active' },
  { name: 'Elena Kowalski', status: 'idle' },
  { name: 'Jordan Lee', status: 'active' },
  { name: 'Sam Whitaker', status: 'offline' },
  { name: 'Aiko Tanaka', status: 'idle' },
  { name: 'Diego Morales', status: 'offline' },
  { name: 'Hannah Becker', status: 'active' },
];
