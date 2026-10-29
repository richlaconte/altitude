import * as React from 'react';
import { cx, Icons } from './core';
import { Badge, Button } from './controls';
import { Popover } from './overlays';
import { Link } from './link';

/* ───────────────────────── FeatureGate ───────────────────────── */

export interface FeatureGateProps {
  /** The plan it needs ("Business"). */
  requires: string;
  /** What the feature does, in the explanation. */
  description?: React.ReactNode;
  /** Opens the upgrade. */
  onUpgrade?: () => void;
  /** Where the plans are compared. */
  compareHref?: string;
  /** False when this person can't upgrade (not an admin): the button becomes "Ask an admin to upgrade". Default true. */
  canUpgrade?: boolean;
  /** The control that needs the plan: one element (a Button). It stays live. */
  children: React.ReactElement<any>;
  className?: string;
}
/**
 * A feature that needs another plan, shown as locked rather than disabled. Disabled means nothing happens; a locked
 * control does something (it explains the plan and offers the upgrade), so it stays live: normal ink, it lifts when
 * pointed at, it's reachable, and it carries a lock and a plan plate. Pressing it opens a Popover.
 */
export function FeatureGate({ requires, description, onUpgrade, compareHref, canUpgrade = true, children, className }: FeatureGateProps) {
  const [open, setOpen] = React.useState(false);
  const child = children;
  const label = typeof child.props.children === 'string' ? child.props.children : child.props['aria-label'];
  const trigger = React.cloneElement(child, {
    className: cx(child.props.className, 'alt-gate-trigger'),
    'aria-label': label ? `${label}, requires ${requires} plan` : undefined,
    onClick: undefined, disabled: undefined, 'aria-disabled': undefined,
  }, <>{child.props.children}<Icons.Lock size={14} className="alt-gate-lock" aria-hidden="true" /><Badge tone="neutral" lamp={false} className="alt-gate-plan" aria-hidden="true">{requires}</Badge></>);
  return (
    <span className={cx('alt-gate', className)}>
      <Popover trigger={trigger} open={open} onOpenChange={setOpen} aria-label={`Available on ${requires}`} className="alt-gate-pop">
        <div className="alt-gate-body">
          <p className="alt-gate-title"><Icons.Lock size={15} aria-hidden="true" />Available on {requires}</p>
          {description && <p className="alt-gate-desc">{description}</p>}
          <div className="alt-gate-actions">
            {canUpgrade
              ? <Button size="sm" variant="primary" onClick={() => { setOpen(false); onUpgrade?.(); }}>Upgrade to {requires}</Button>
              : <p className="alt-gate-admin">Ask an admin to upgrade to {requires}.</p>}
            {compareHref && <Link href={compareHref}>Compare plans</Link>}
          </div>
        </div>
      </Popover>
    </span>
  );
}
