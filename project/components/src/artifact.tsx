import * as React from 'react';
import { cx, Icons, useDepth } from './core';
import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from './controls';
import { CopyButton } from './copy-button';
import { Tooltip } from './overlays';

export type ArtifactStatus = 'writing' | 'complete' | 'failed';
interface Ctx { id: string; title: string; status: ArtifactStatus; version?: number; onRetry?: () => void; heading: React.MutableRefObject<HTMLHeadingElement | null> }
const ArtifactCtx = React.createContext<Ctx | null>(null);
const useArtifact = (part: string) => { const c = React.useContext(ArtifactCtx); if (!c) throw new Error(`${part} must be inside <Artifact>.`); return c; };
// The reference that opened each artifact, so Escape in the pane can go back to it.
const openers = new Map<string, HTMLElement>();

export interface ArtifactProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  /** Names the pane: "Pricing page". */
  title: string;
  /** Default 'complete'. */
  status?: ArtifactStatus;
  /** The latest version's number: "Writing… version 3". */
  version?: number;
  onRetry?: () => void;
  /** Its id, shared with ArtifactReference's aria-controls. Default generated. */
  id?: string;
}
/**
 * What an agent is making, beside the conversation (#271): a pane on the ground, named by its title. While it's
 * written it isn't the record yet (a dashed rule at the pane's edge, "Writing… version 3"); complete, the rule goes
 * solid with one afterglow; failed, a critical rule with Retry, the last whole version still there. Viewing an earlier
 * version is a mode, so it's a strip and words across the pane's top, not a lift.
 */
export function Artifact({ title, status = 'complete', version, onRetry, id: given, className, children, ...rest }: ArtifactProps) {
  const auto = React.useId();
  const id = given ?? `artifact-${auto.replace(/:/g, '')}`;
  const heading = React.useRef<HTMLHeadingElement | null>(null);
  const [glow, setGlow] = React.useState(0);
  const [said, setSaid] = React.useState('');
  const last = React.useRef(status);
  React.useEffect(() => {
    if (last.current === 'writing' && status !== 'writing') {
      if (status === 'complete') { setGlow((n) => n + 1); setSaid(`${title}${version ? `, version ${version}` : ''}, complete`); }
      else setSaid(`Couldn't finish ${title}${version ? `, version ${version}` : ''}`);
    }
    last.current = status;
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps
  // Opened from a reference: focus moves to the pane's heading.
  React.useEffect(() => { if (openers.has(id)) heading.current?.focus(); }, [id]);
  const { style, 'aria-busy': _b, ...depth } = useDepth({ settle: glow || undefined });
  return (
    <ArtifactCtx.Provider value={{ id, title, status, version, onRetry, heading }}>
      <section {...rest} {...depth} style={style} id={id} className={cx('alt-artifact', className)} aria-label={title} data-status={status} aria-busy={status === 'writing' || undefined}
        onKeyDown={(e) => { rest.onKeyDown?.(e); if (e.key === 'Escape' && !e.defaultPrevented) { const o = openers.get(id); if (o?.isConnected) { e.preventDefault(); o.focus(); } } }}>
        {children}
        <span className="alt-sr" role="status">{said}</span>
      </section>
    </ArtifactCtx.Provider>
  );
}

export interface ArtifactHeaderProps {
  /** Copy (the whole artifact, or this value). */
  onCopy?: boolean | (() => string);
  onDownload?: () => void;
  /** Opens it on its own (a new tab). */
  onOpen?: () => void;
  onClose?: () => void;
  /** Extra tools, before the standard ones. */
  children?: React.ReactNode;
}
/** The title, its state in words, and ghost tools. */
export function ArtifactHeader({ onCopy, onDownload, onOpen, onClose, children }: ArtifactHeaderProps) {
  const a = useArtifact('ArtifactHeader');
  const v = a.version ? ` version ${a.version}` : '';
  const state = a.status === 'writing' ? `Writing…${v}` : a.status === 'failed' ? `Couldn't finish${v}` : a.version ? `Version ${a.version}` : 'Complete';
  return (
    <header className="alt-artifact-head">
      <div className="alt-artifact-titles">
        <h2 ref={(el) => { a.heading.current = el; }} tabIndex={-1} className="alt-artifact-title">{a.title}</h2>
        <p className="alt-artifact-state" data-tone={a.status === 'failed' ? 'critical' : undefined}>
          {a.status === 'failed' && <Icons.AlertCircle size={13} aria-hidden="true" />}{state}
          {a.status === 'failed' && a.onRetry && <Button size="sm" variant="ghost" onClick={a.onRetry}><Icons.Refresh size={13} aria-hidden="true" />Retry</Button>}
        </p>
      </div>
      <div className="alt-artifact-tools" role="toolbar" aria-label={`${a.title} tools`}>
        {children}
        {onCopy && <CopyButton size="sm" label={`Copy ${a.title}`} value={() => (typeof onCopy === 'function' ? onCopy() : document.getElementById(a.id)?.querySelector('.alt-artifact-body')?.textContent ?? '')} />}
        {onDownload && <Tooltip content="Download"><Button size="sm" variant="ghost" square aria-label={`Download ${a.title}`} onClick={onDownload}><Icons.ArrowDown size={15} /></Button></Tooltip>}
        {onOpen && <Tooltip content="Open in a new tab"><Button size="sm" variant="ghost" square aria-label={`Open ${a.title} in a new tab`} onClick={onOpen}><Icons.ExternalLink size={15} /></Button></Tooltip>}
        {onClose && <Tooltip content="Close"><Button size="sm" variant="ghost" square aria-label={`Close ${a.title}`} onClick={onClose}><Icons.X size={15} /></Button></Tooltip>}
      </div>
    </header>
  );
}

export interface ArtifactVersionsProps {
  /** How many versions there are. */
  versions: number;
  /** The one shown, from 1. */
  current: number;
  onChange: (version: number) => void;
  /** Make the version shown the latest again. */
  onRestore?: (version: number) => void;
}
/** Previous and next version, and, when an earlier one is shown, a strip that says so with a way back. */
export function ArtifactVersions({ versions, current, onChange, onRestore }: ArtifactVersionsProps) {
  useArtifact('ArtifactVersions');
  if (versions < 2) return null;
  const earlier = current < versions;
  return (
    <>
      <div className="alt-artifact-versions">
        <Button size="sm" variant="ghost" square aria-label="Previous version" disabled={current <= 1} onClick={() => onChange(current - 1)}><Icons.ChevronDown size={14} style={{ rotate: '90deg' }} /></Button>
        <span className="alt-artifact-version">Version {current} of {versions}</span>
        <Button size="sm" variant="ghost" square aria-label="Next version" disabled={current >= versions} onClick={() => onChange(current + 1)}><Icons.ChevronDown size={14} style={{ rotate: '-90deg' }} /></Button>
      </div>
      {earlier && (
        <div className="alt-artifact-earlier" role="note">
          <span>Viewing version {current} of {versions}</span>
          <Button size="sm" variant="ghost" onClick={() => onChange(versions)}>Return to latest</Button>
          {onRestore && <Button size="sm" variant="secondary" onClick={() => onRestore(current)}>Restore this version</Button>}
        </div>
      )}
    </>
  );
}

export interface ArtifactContentProps {
  /** The ways to see it. With more than one, a segmented switch picks between them. */
  views: { preview?: React.ReactNode; source?: React.ReactNode; changes?: React.ReactNode };
  /** Default the first given. */
  defaultView?: 'preview' | 'source' | 'changes';
}
const VIEW_LABEL = { preview: 'Preview', source: 'Source', changes: 'Changes' } as const;
/** The artifact itself: Preview, Source and Changes, as segmented Tabs when there's more than one. */
export function ArtifactContent({ views, defaultView }: ArtifactContentProps) {
  const a = useArtifact('ArtifactContent');
  const keys = (Object.keys(VIEW_LABEL) as (keyof typeof VIEW_LABEL)[]).filter((k) => views[k] !== undefined && views[k] !== null);
  if (keys.length === 1) return <div className="alt-artifact-body">{views[keys[0]]}</div>;
  return (
    <Tabs variant="segmented" defaultValue={defaultView && keys.includes(defaultView) ? defaultView : keys[0]} className="alt-artifact-views">
      <TabsList aria-label={`View ${a.title}`}>{keys.map((k) => <TabsTrigger key={k} value={k}>{VIEW_LABEL[k]}</TabsTrigger>)}</TabsList>
      {keys.map((k) => <TabsContent key={k} value={k} className="alt-artifact-body">{views[k]}</TabsContent>)}
    </Tabs>
  );
}

export interface ArtifactReferenceProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'title'> {
  title: string;
  version?: number;
  status?: ArtifactStatus;
  /** The Artifact's id, for aria-controls and to return focus on Escape. */
  controls: string;
  onOpen: () => void;
}
/** The plate in a message that opens the artifact; a plate that acts, lifting one level when pointed at. */
export function ArtifactReference({ title, version, status = 'complete', controls, onOpen, className, ...rest }: ArtifactReferenceProps) {
  return (
    <button type="button" {...rest} className={cx('alt-artifact-ref', className)} aria-controls={controls} data-status={status}
      onClick={(e) => { openers.set(controls, e.currentTarget); onOpen(); requestAnimationFrame(() => document.getElementById(controls)?.querySelector<HTMLElement>('.alt-artifact-title')?.focus()); }}>
      <span className="alt-artifact-ref-icon" aria-hidden="true"><Icons.PanelLeft size={15} /></span>
      <span className="alt-artifact-ref-text">
        <span className="alt-artifact-ref-title">{title}<span className="alt-sr">,</span></span>
        <span className="alt-artifact-ref-meta">{status === 'writing' ? 'Writing…' : status === 'failed' ? "Couldn't finish" : version ? `Version ${version}` : 'Open'}</span>
      </span>
      <span className="alt-sr">. Open</span>
    </button>
  );
}
