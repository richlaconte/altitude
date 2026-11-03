// Example: Northwind admin console (#401). The SaaS admin patterns working as one workspace on one simulated server.
//   Task: a workspace admin keeps Northwind running: people, plan, keys and settings.
//   Lead: whichever section is open. Primary action: per section (Invite people, Create key; General saves with its
//   SaveBar). Next: the change, recorded in the audit log.
// Cross-links: a rename shows in the sidebar; upgrading to Business unlocks custom roles in Members; a scheduled
// downgrade to Free warns on the audit log; revoking a key breaks the webhook signed with it; everything is in the log.
import * as React from 'react';
import {
  AppShell, Avatar, EmptyState, PageHeader, PageHeaderTitle, Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from 'altitude-design';
import { useDemoQuery } from '../shared/react';
import { ME, service } from './data';
import type { Workspace } from './data';
import { Audit } from './audit';
import { Billing } from './billing';
import { Developer } from './developer';
import { General } from './general';
import { Members } from './members';
import { Security } from './security';
import { Resource } from './ui';

const SECTIONS = [
  { id: 'general', label: 'General', d: 'M4 7h10M18 7h2M4 17h4M12 17h8M14 5v4M8 15v4' },
  { id: 'members', label: 'Members', d: 'M16 19v-1a4 4 0 0 0-8 0v1M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6' },
  { id: 'billing', label: 'Billing', d: 'M3 7h18v10H3zM3 11h18' },
  { id: 'developer', label: 'Developers', d: 'M8 9l-4 3 4 3M16 9l4 3-4 3' },
  { id: 'security', label: 'Security', d: 'M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z' },
  { id: 'audit', label: 'Audit log', d: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01' },
] as const;
export type SectionId = typeof SECTIONS[number]['id'];
const Icon = ({ d }: { d: string }) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
const fromHash = (): SectionId => {
  const id = (typeof location === 'undefined' ? '' : location.hash.replace(/^#\/?/, '').split('/')[0]) as SectionId;
  return SECTIONS.some((s) => s.id === id) ? id : 'general';
};

export function App() {
  const [at, setAt] = React.useState<SectionId>(fromHash);
  const moved = React.useRef(false);
  const workspace = useDemoQuery<unknown, Workspace>(service, 'workspace.get');
  const go = React.useCallback((to: SectionId) => {
    moved.current = true;
    setAt(to);
    try { history.replaceState(null, '', `#/${to}`); } catch { /* a sandboxed page can't: keep going */ }
  }, []);
  React.useEffect(() => { const on = () => setAt(fromHash()); window.addEventListener('hashchange', on); return () => window.removeEventListener('hashchange', on); }, []);
  // A new section takes focus at its heading, so a keyboard or screen reader user lands where the page changed.
  React.useEffect(() => { if (moved.current) requestAnimationFrame(() => document.getElementById('ac-title')?.focus()); }, [at]);

  const name = workspace.data?.name ?? 'Northwind';
  const deleted = workspace.data?.deleted;
  return (
    <AppShell
      className="ac-shell"
      sidebar={
        <Sidebar>
          <SidebarHeader><span className="ac-ws"><Avatar name={name} size={24} /><span className="alt-sidebar-text">{name}</span></span></SidebarHeader>
          <SidebarContent>
            <SidebarGroup label="Workspace">
              <SidebarMenu>
                {SECTIONS.map((s) => (
                  <SidebarMenuItem key={s.id}>
                    <SidebarMenuButton href={`#/${s.id}`} current={at === s.id} icon={<Icon d={s.d} />} onClick={(e) => { e.preventDefault(); go(s.id); }}>{s.label}</SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
            <SidebarMenu><SidebarMenuItem><SidebarMenuButton href="#/security" icon={<Avatar name={ME} size={20} status="active" />} onClick={(e) => { e.preventDefault(); go('security'); }}>{ME}</SidebarMenuButton></SidebarMenuItem></SidebarMenu>
          </SidebarFooter>
        </Sidebar>
      }>
      {workspace.data === undefined
        ? <div className="ac-body"><Resource query={workspace} noun="the workspace">{() => null}</Resource></div>
        : deleted
          ? <>
              <PageHeader><PageHeaderTitle id="ac-title" tabIndex={-1}>Workspace deleted</PageHeaderTitle></PageHeader>
              <div className="ac-body"><EmptyState title={`${name} was deleted`} description="Its projects and files are gone. In this example, Reset example data below brings it back." headingLevel={2} /></div>
            </>
          : at === 'general' ? <General workspace={workspace} />
          : at === 'members' ? <Members go={go} />
          : at === 'billing' ? <Billing />
          : at === 'developer' ? <Developer />
          : at === 'security' ? <Security />
          : <Audit go={go} />}
    </AppShell>
  );
}
