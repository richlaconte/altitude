import * as React from 'react';
import { cx, Icons, useIsoLayoutEffect } from './core';
import { Button } from './controls';
import { useRoving } from './roving';

export interface SuggestionsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChoose'> {
  /** Names the group: "Suggested follow-ups", "Start with". */
  'aria-label': string;
  /** 'fill' (default) puts the text in the composer to edit; 'send' sends it at once. */
  mode?: 'fill' | 'send';
  /** Called with the chosen suggestion's value (or its text). Fill or send it from here. */
  onChoose: (value: string) => void;
  /**
   * Follow-ups that became available after an answer: they cross-fade in over dur-onset, never rising. Default true
   * inside a Message, false elsewhere (starters in an empty conversation are simply there).
   */
  arrive?: boolean;
  children: React.ReactNode;
}
export interface SuggestionItemProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'value'> {
  /** What's filled or sent, when it's longer than the label. Default the label's text. */
  value?: string;
  children: React.ReactNode;
}

interface Ctx { mode: 'fill' | 'send'; choose: (value: string) => void }
const SuggestionsCtx = React.createContext<Ctx | null>(null);
const textOf = (node: React.ReactNode): string => typeof node === 'string' || typeof node === 'number' ? String(node)
  : Array.isArray(node) ? node.map(textOf).join('') : React.isValidElement<{ children?: React.ReactNode }>(node) ? textOf(node.props.children) : '';

/**
 * Prompts to start from or follow up with (#272): small secondary buttons, raised at level 1 like any affordance and
 * never level 2, since the view's one primary is the composer's Send. Starters sit in an EmptyState; follow-ups sit
 * under an answer and cross-fade in once it's complete. More than four become one toolbar tab stop with arrow keys.
 * After choosing, focus goes to the composer (with the caret at the end, to edit what was filled).
 */
export function Suggestions({ mode = 'fill', onChoose, arrive, className, children, ...rest }: SuggestionsProps) {
  const many = React.Children.toArray(children).filter(React.isValidElement).length > 4;
  const roving = useRoving<HTMLDivElement>({ enabled: many });
  const self = React.useRef<HTMLDivElement | null>(null);
  const [inMessage, setInMessage] = React.useState(false);
  useIsoLayoutEffect(() => { setInMessage(!!self.current?.closest('.alt-msg')); }, []);
  const choose = (value: string) => {
    onChoose(value);
    // The composer, once the app has filled it: the caret goes to the end so the text can be edited.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const root = self.current?.closest('.alt-convo')?.parentElement ?? document;
      const box = root.querySelector<HTMLTextAreaElement>('.alt-prompt textarea') ?? document.querySelector<HTMLTextAreaElement>('.alt-prompt textarea');
      if (!box) return;
      box.focus();
      box.setSelectionRange(box.value.length, box.value.length);
    }));
  };
  const setRef = (el: HTMLDivElement | null) => { self.current = el; (roving.ref as React.MutableRefObject<HTMLDivElement | null>).current = el; };
  return (
    <SuggestionsCtx.Provider value={{ mode, choose }}>
      <div {...rest} {...roving} ref={setRef} role={many ? 'toolbar' : 'group'} className={cx('alt-suggestions', className)}
        data-arrive={(arrive ?? inMessage) ? '' : undefined}>
        {children}
      </div>
    </SuggestionsCtx.Provider>
  );
}

/** One suggestion: named by its text, plus "sends now" when choosing it sends. */
export function Suggestion({ value, className, children, onClick, ...rest }: SuggestionItemProps) {
  const c = React.useContext(SuggestionsCtx);
  if (!c) throw new Error('Suggestion must be inside <Suggestions>.');
  const send = c.mode === 'send';
  return (
    <Button size="sm" variant="secondary" data-roving-item="" className={cx('alt-suggestion', className)} {...rest}
      onClick={(e) => { onClick?.(e); if (!e.defaultPrevented) c.choose(value ?? textOf(children)); }}>
      <span className="alt-suggestion-text">{children}</span>
      {send && <><Icons.ArrowUp size={13} aria-hidden="true" style={{ rotate: '90deg' }} /><span className="alt-sr">, sends now</span></>}
    </Button>
  );
}
