import * as React from 'react';
import type { BuiltInScheme } from '../project/components/src/index';
import { MobileShowcase } from './mobile-showcase';
import { Workbench } from './workbench';

// Content follows available space. Pointer/hover adaptation stays with the components.
const COMPACT = '(max-width: 640px)';

export function Showcase(props: { scheme: BuiltInScheme; onSchemeChange: (scheme: BuiltInScheme) => void }) {
  const [compact, setCompact] = React.useState(() => matchMedia(COMPACT).matches);
  const [notice, setNotice] = React.useState('');
  const root = React.useRef<HTMLDivElement>(null);
  const restore = React.useRef(false);

  React.useEffect(() => {
    const query = matchMedia(COMPACT);
    const update = () => {
      const active = document.activeElement;
      // Sheet content is portalled outside this root, but belongs to this demo.
      restore.current = !!active && (!!root.current?.contains(active) || !!active.closest('.ms-sheet'));
      setCompact(query.matches);
      setNotice(`${query.matches ? 'Mobile' : 'Desktop'} demo ready. Previous demo reset for this layout.`);
    };
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  React.useEffect(() => {
    if (!restore.current) return;
    restore.current = false;
    // Wait for outgoing modal cleanup to release isolation and scroll ownership.
    const frame = requestAnimationFrame(() => {
      const active = document.activeElement;
      // Do not override a newer focus decision made after the resize.
      if (document.hasFocus() && (active === document.body || active === root.current)) {
        root.current?.focus({ preventScroll: true });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [compact]);

  return <div ref={root} className="showcase" data-layout={compact ? 'mobile' : 'desktop'} role="group" tabIndex={-1} aria-label="Interactive Altitude showcase">
    <p className="alt-sr" role="status">{notice}</p>
    {compact ? <MobileShowcase {...props} /> : <Workbench {...props} />}
  </div>;
}
