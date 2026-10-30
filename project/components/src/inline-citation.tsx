import * as React from 'react';
import { cx, Icons } from './core';
import { HoverCard } from './overlays';

/* ───────────────────────── InlineCitation ───────────────────────── */

export interface CitationSource {
  title: string;
  url?: string;
  /** A passage from the source. */
  excerpt?: string;
  /** The source couldn't be verified: a caution mark and "Unverified source". */
  unverified?: boolean;
}
const domain = (url?: string) => { try { return url ? new URL(url, 'https://x.invalid').hostname.replace(/^www\./, '').replace('x.invalid', '') : ''; } catch { return ''; } };

export interface InlineCitationProps {
  /** Its number, counted from 1, matching the Sources list. */
  index: number;
  source: CitationSource;
  /** Where it goes. Default the source's entry in Sources (`#<idPrefix>-<index>`). */
  href?: string;
  /** Shared with Sources. Default "source". */
  idPrefix?: string;
  className?: string;
}
/**
 * A numbered source marker in generated text. A citation is part of the record, so it's a small flush plate (the
 * ChartAnnotation build) in the text; it acts, so it lifts one level when pointed at, and a HoverCard previews the
 * source on hover and on focus. Named "Source 2: Billing FAQ", never "[2]".
 */
export function InlineCitation({ index, source, href, idPrefix = 'source', className }: InlineCitationProps) {
  const name = `Source ${index}: ${source.title}${source.unverified ? ' (unverified)' : ''}`;
  const trigger = (
    <a className={cx('alt-cite', className)} href={href ?? `#${idPrefix}-${index}`} aria-label={name} data-unverified={source.unverified ? '' : undefined}>
      {source.unverified && <Icons.AlertTriangle size={10} aria-hidden="true" />}{index}
    </a>
  );
  const host = domain(source.url);
  return (
    <HoverCard trigger={trigger} openDelay={300} className="alt-cite-card">
      <div className="alt-cite-preview">
        <p className="alt-cite-meta">{source.unverified ? <span className="alt-cite-warn"><Icons.AlertTriangle size={12} aria-hidden="true" />Unverified source</span> : `Source ${index}`}{host && ` · ${host}`}</p>
        <p className="alt-cite-title">{source.url ? <a className="alt-link" href={source.url}>{source.title}</a> : source.title}</p>
        {source.excerpt && <blockquote className="alt-cite-excerpt">{source.excerpt}</blockquote>}
      </div>
    </HoverCard>
  );
}

export interface SourcesProps {
  items: CitationSource[];
  /** Default "Sources". */
  heading?: string;
  /** Shared with InlineCitation. Default "source". */
  idPrefix?: string;
  className?: string;
}
/** The sources an answer cites, as a flush ordered list under a heading; each entry is a citation's destination. */
export function Sources({ items, heading = 'Sources', idPrefix = 'source', className }: SourcesProps) {
  const id = React.useId();
  return (
    <section className={cx('alt-sources', className)} aria-labelledby={id}>
      <h3 className="alt-sources-heading" id={id}>{heading}</h3>
      <ol className="alt-sources-list">
        {items.map((s, i) => (
          <li key={i} id={`${idPrefix}-${i + 1}`} tabIndex={-1}>
            {s.url ? <a className="alt-link" href={s.url}>{s.title}</a> : <span>{s.title}</span>}
            {domain(s.url) && <span className="alt-sources-domain"> · {domain(s.url)}</span>}
            {s.unverified && <span className="alt-cite-warn"><Icons.AlertTriangle size={12} aria-hidden="true" />Unverified source</span>}
          </li>
        ))}
      </ol>
    </section>
  );
}
