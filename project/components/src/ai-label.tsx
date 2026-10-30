import * as React from 'react';
import { cx, Icons } from './core';
import { Popover } from './overlays';
import { RelativeTime } from './relative-time';

/* ───────────────────────── AILabel ───────────────────────── */

export interface AISource { title: string; url?: string }
export interface AILabelProps {
  /** What it marks ("Summary", "Reply"), for its name: "Summary generated with AI". Default "Content". */
  subject?: string;
  /** The model that produced it. */
  model?: string;
  generatedAt?: Date | string | number;
  /** What it was based on. */
  sources?: AISource[];
  /** Confidence, in words ("Medium: two sources disagreed"). */
  confidence?: string;
  /** A person who reviewed and accepted it: the plate reads "Drafted with AI". */
  reviewedBy?: string;
  /** A person who changed it after it was generated. */
  editedBy?: string;
  /** Anything else about how it was made. */
  children?: React.ReactNode;
  className?: string;
}
/**
 * Marks what AI made, and explains it when asked. A label is part of the record, so it's a flush Badge plate ("AI", or
 * "Drafted with AI" once a person has reviewed it), with no gradient and no glow: the light never moves. It acts, so it
 * lifts one level when pointed at and opens a Popover saying how the content was produced. Provenance stays on the
 * accepted record.
 */
export function AILabel({ subject = 'Content', model, generatedAt, sources, confidence, reviewedBy, editedBy, children, className }: AILabelProps) {
  const [open, setOpen] = React.useState(false);
  const word = reviewedBy ? 'Drafted with AI' : 'AI';
  const trigger = (
    <button type="button" className={cx('alt-badge alt-ailabel', className)} aria-label={`${subject} ${reviewedBy ? 'drafted with AI and reviewed' : 'generated with AI'}. Show details`}>
      <Icons.Spark size={12} aria-hidden="true" />{word}
    </button>
  );
  return (
    <Popover trigger={trigger} open={open} onOpenChange={setOpen} aria-label="About this content" className="alt-ailabel-pop">
      <div className="alt-ailabel-body">
        <h2 className="alt-ailabel-title">About this content</h2>
        <dl className="alt-ailabel-facts">
          <div><dt>Made by</dt><dd>{model ? `AI (${model})` : 'AI'}</dd></div>
          {generatedAt !== undefined && <div><dt>Generated</dt><dd><RelativeTime date={generatedAt} tooltip={false} /></dd></div>}
          {confidence && <div><dt>Confidence</dt><dd>{confidence}</dd></div>}
          {reviewedBy && <div><dt>Reviewed by</dt><dd>{reviewedBy}</dd></div>}
          {editedBy && <div><dt>Edited by</dt><dd>{editedBy}</dd></div>}
        </dl>
        {sources && sources.length > 0 && <>
          <h3 className="alt-ailabel-sub">Based on</h3>
          <ol className="alt-ailabel-sources">{sources.map((s, i) => <li key={i}>{s.url ? <a className="alt-link" href={s.url}>{s.title}</a> : s.title}</li>)}</ol>
        </>}
        {children && <div className="alt-ailabel-more">{children}</div>}
      </div>
    </Popover>
  );
}
