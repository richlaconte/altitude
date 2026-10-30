import * as React from 'react';
import { cx, Icons, useDepth } from './core';
import type { DepthProps } from './core';

/* ───────────────────────── Settings ───────────────────────── */

export interface SettingsSectionProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  /** Every section has a heading; it names the region. */
  title: React.ReactNode;
  description?: React.ReactNode;
  /** 'critical': the danger zone. A critical rim and the same height as every other section. */
  tone?: 'critical';
  /** Default 2. */
  headingLevel?: 2 | 3;
  /** Why this person can't change these settings ("Only workspace admins can change billing details"). The rows are disabled and say why. */
  readOnlyReason?: React.ReactNode;
}
/**
 * One section of a settings page: a raised Card (level 1) with a heading and rows. The danger zone is the same card with
 * a critical rim, never higher or louder: its consequences are said in its rows' words.
 */
export function SettingsSection({ title, description, tone, headingLevel = 2, readOnlyReason, className, children, ...rest }: SettingsSectionProps) {
  const id = React.useId();
  const H = `h${headingLevel}` as 'h2';
  return (
    <section className={cx('alt-card alt-settings-section', className)} data-tone={tone} aria-labelledby={id + '-title'} {...rest}>
      <header className="alt-settings-head">
        <H className="alt-settings-title" id={id + '-title'}>{title}</H>
        {description && <p className="alt-settings-desc">{description}</p>}
        {readOnlyReason && <p className="alt-settings-readonly" id={id + '-ro'}><Icons.Lock size={14} aria-hidden="true" />{readOnlyReason}</p>}
      </header>
      {readOnlyReason
        ? <fieldset className="alt-settings-rows" disabled aria-describedby={id + '-ro'}>{children}</fieldset>
        : <div className="alt-settings-rows">{children}</div>}
    </section>
  );
}

export interface SettingsRowProps extends DepthProps {
  label: React.ReactNode;
  /** What the setting does, beside its label. */
  description?: React.ReactNode;
  /** Replaces the description and marks the control invalid. */
  error?: React.ReactNode;
  /**
   * The words for an apply-now control's write. Defaults: pending "Saving…", committed "Saved", failed "Couldn't save
   * this change. Try again." Pass the status of the write the control made; the row hovers while it's pending.
   */
  statusText?: Partial<Record<'pending' | 'committed' | 'failed', React.ReactNode>>;
  className?: string;
  /** Exactly one control: Switch, Select, Input, Button… It's labelled and described by the row. */
  children: React.ReactElement<any>;
}
/**
 * A setting: label and description on the start side, the control on the end side, stacked when the section is narrow.
 * A control that applies immediately reports its write through `status` (pending hovers, committed lands, failed drops
 * into a trench), with the state in words. Fields saved together belong to one draft with a SaveBar instead.
 */
export function SettingsRow({ label, description, error, status, settle, heldBy, relevance, statusText, className, children }: SettingsRowProps) {
  const id = React.useId();
  const controlId = children.props.id || id + '-control';
  const { style, ...depth } = useDepth({ settle, status, heldBy, relevance });
  const words = status && ({ pending: 'Saving…', committed: 'Saved', failed: 'Couldn’t save this change. Try again.', ...statusText })[status];
  const describedBy = [children.props['aria-describedby'], (error || description) && id + '-desc', words && id + '-status'].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cx('alt-settings-row', className)} {...depth} style={style}>
      <div className="alt-settings-text">
        <label className="alt-settings-label" htmlFor={controlId}>{label}</label>
        {error
          ? <p className="alt-settings-error" id={id + '-desc'} role="alert"><Icons.AlertCircle size={14} />{error}</p>
          : description && <p className="alt-settings-rowdesc" id={id + '-desc'}>{description}</p>}
      </div>
      <div className="alt-settings-control">
        {React.cloneElement(children, { id: controlId, 'aria-describedby': describedBy, ...(error ? { invalid: true } : null) })}
        <span className="alt-settings-status" id={id + '-status'} role="status">{words}</span>
      </div>
    </div>
  );
}
