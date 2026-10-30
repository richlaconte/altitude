import * as React from 'react';
import { cx, Icons, useDepth } from './core';
import { Button, Checkbox, Input, Radio, RadioGroup } from './controls';
import { RelativeTime } from './relative-time';

export type QuestionState = 'asking' | 'answered' | 'expired';
export interface QuestionAnswer { values: string[]; other?: string }
export interface QuestionOptionProps {
  value: string;
  label: React.ReactNode;
  description?: React.ReactNode;
}
/** One option of a Question. It renders nothing itself: the Question draws it as a radio or a checkbox. */
export function QuestionOption(_: QuestionOptionProps): null { return null; }

export interface QuestionProps {
  /** The question, as its title: "Which environment should I deploy to?". */
  title: string;
  /** Default 'asking'. */
  state?: QuestionState;
  /** Several options may be chosen (checkboxes). Default false (a radio group). */
  multiple?: boolean;
  /** A one-line field for an answer of the person's own. */
  allowOther?: boolean;
  /** Default "Your own answer". */
  otherLabel?: string;
  /** Default "Answer". */
  answerLabel?: string;
  /** Shows a ghost button that lets the run go on without an answer: "Let the assistant decide". */
  skipLabel?: string;
  onSkip?: () => void;
  onAnswer?: (answer: QuestionAnswer) => void;
  /** What was answered, for the record once it's 'answered'. */
  answer?: QuestionAnswer;
  answeredAt?: Date | string | number;
  /** Default "The assistant". */
  requestedBy?: string;
  /** Its key in a QuestionSet's answers. */
  name?: string;
  /** QuestionOptions. */
  children: React.ReactNode;
  className?: string;
}

interface SetCtx { state: QuestionState; report: (name: string, answer: QuestionAnswer | null) => void }
const QuestionSetCtx = React.createContext<SetCtx | null>(null);
const optionsOf = (children: React.ReactNode) => React.Children.toArray(children)
  .filter((c): c is React.ReactElement<QuestionOptionProps> => React.isValidElement(c) && c.type === QuestionOption).map((c) => c.props);
const textOf = (n: React.ReactNode) => (typeof n === 'string' || typeof n === 'number' ? String(n) : '');

/**
 * An agent asks the person something before it carries on (#270): the elicitation half of human-in-the-loop. Nothing
 * has been dispatched, so it's raised like a requested Confirmation, not pending. Options are a radio group (or
 * checkboxes), "Your own answer" is a field, and Answer is the one primary; there's no default and nothing is focused
 * for you. Answered, it presses to the ground as one line: "You chose: Staging · now".
 */
export function Question({ title, state: own = 'asking', multiple = false, allowOther = false, otherLabel = 'Your own answer', answerLabel = 'Answer',
  skipLabel, onSkip, onAnswer, answer, answeredAt, requestedBy = 'The assistant', name, children, className }: QuestionProps) {
  const set = React.useContext(QuestionSetCtx);
  const state = set?.state ?? own;
  const id = React.useId();
  const options = optionsOf(children);
  const [values, setValues] = React.useState<string[]>([]);
  const [other, setOther] = React.useState('');
  const current: QuestionAnswer | null = values.length || other.trim() ? { values, other: other.trim() || undefined } : null;
  React.useEffect(() => { if (set && name) set.report(name, current); }, [values.join('\u0000'), other]); // eslint-disable-line react-hooks/exhaustive-deps
  const { style, ...depth } = useDepth({ settle: state === 'asking' ? true : undefined });
  const [said, setSaid] = React.useState({ urgent: '', polite: '' });
  const last = React.useRef<QuestionState | null>(null);
  React.useEffect(() => {
    // Asked: said assertively once, because the run is blocked on it. Answered: said politely.
    if (state === 'asking' && last.current !== 'asking' && !set) setSaid({ urgent: `${requestedBy} is asking: ${title}`, polite: '' });
    if (state === 'answered' && last.current === 'asking') setSaid({ urgent: '', polite: `Answered: ${chosen(answer ?? current)}` });
    last.current = state;
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps
  function chosen(a: QuestionAnswer | null | undefined) {
    if (!a) return '';
    const labels = a.values.map((v) => textOf(options.find((o) => o.value === v)?.label) || v);
    return [...labels, ...(a.other ? [`“${a.other}”`] : [])].join(', ');
  }
  if (state !== 'asking') {
    return (
      <section className={cx('alt-confirm alt-question', className)} data-state={state} aria-labelledby={`${id}-t`}>
        <h3 className="alt-sr" id={`${id}-t`}>{title}</h3>
        <p className="alt-question-record">
          {state === 'answered' ? <><Icons.CircleCheck size={14} aria-hidden="true" /><span><span className="alt-question-asked">{title}</span> You chose: {chosen(answer)}{answeredAt !== undefined && <> · <RelativeTime date={answeredAt} /></>}</span></> : <span><span className="alt-question-asked">{title}</span> No longer needed</span>}
        </p>
        <span className="alt-sr" role="status">{said.polite}</span>
      </section>
    );
  }
  const pick = (v: string, on: boolean) => setValues((xs) => (on ? [...xs, v] : xs.filter((x) => x !== v)));
  return (
    <section className={cx('alt-confirm alt-question', className)} data-state="requested" data-question="" aria-labelledby={`${id}-t`} {...depth} style={style}>
      {!set && <p className="alt-confirm-line" data-tone="accent"><Icons.AlertCircle size={14} aria-hidden="true" />{requestedBy} is asking</p>}
      <h3 className="alt-confirm-title" id={`${id}-t`}>{title}</h3>
      {multiple ? (
        <div className="alt-question-options" role="group" aria-labelledby={`${id}-t`}>
          {options.map((o) => <Checkbox key={o.value} label={o.label} description={o.description} checked={values.includes(o.value)} onCheckedChange={(on) => pick(o.value, on)} />)}
        </div>
      ) : (
        <RadioGroup className="alt-question-options" aria-labelledby={`${id}-t`} value={values[0] ?? ''} onValueChange={(v) => { setValues([v]); setOther(''); }}>
          {options.map((o) => <Radio key={o.value} value={o.value} label={o.label} description={o.description} />)}
        </RadioGroup>
      )}
      {allowOther && (
        <label className="alt-question-other">
          <span className="alt-question-other-label">{otherLabel}</span>
          <Input value={other} onChange={(e) => { setOther(e.target.value); if (!multiple && e.target.value) setValues([]); }}
            onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} />
        </label>
      )}
      {!set && (
        <div className="alt-confirm-actions">
          {skipLabel && <Button size="sm" variant="ghost" onClick={onSkip}>{skipLabel}</Button>}
          <Button size="sm" variant="primary" disabled={!current} onClick={() => current && onAnswer?.(current)}>{answerLabel}</Button>
        </div>
      )}
      <span className="alt-sr" aria-live="assertive">{said.urgent}</span>
    </section>
  );
}

export interface QuestionSetProps {
  /** Names the set: "The assistant has 2 questions". */
  'aria-label'?: string;
  state?: QuestionState;
  /** Called with every Question's answer, by its name, when Answer is pressed. Answer waits until each has one. */
  onAnswer?: (answers: Record<string, QuestionAnswer>) => void;
  answerLabel?: string;
  skipLabel?: string;
  onSkip?: () => void;
  requestedBy?: string;
  /** Questions, each with a name. */
  children: React.ReactNode;
  className?: string;
}
/** Several questions in one request (AskUserQuestion allows up to four), answered together by one button. */
export function QuestionSet({ 'aria-label': label, state = 'asking', onAnswer, answerLabel = 'Answer', skipLabel, onSkip, requestedBy = 'The assistant', children, className }: QuestionSetProps) {
  const names = React.Children.toArray(children).filter(React.isValidElement).map((c) => (c.props as QuestionProps).name).filter(Boolean) as string[];
  const [answers, setAnswers] = React.useState<Record<string, QuestionAnswer | null>>({});
  const report = React.useCallback((name: string, a: QuestionAnswer | null) => setAnswers((x) => ({ ...x, [name]: a })), []);
  const ready = names.length > 0 && names.every((n) => answers[n]);
  const [said, setSaid] = React.useState('');
  React.useEffect(() => { if (state === 'asking') setSaid(`${requestedBy} has ${names.length} question${names.length === 1 ? '' : 's'}`); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <QuestionSetCtx.Provider value={{ state, report }}>
      <div className={cx('alt-question-set', className)} role="group" aria-label={label ?? `${requestedBy} has ${names.length} questions`} data-state={state}>
        {state === 'asking' && <p className="alt-confirm-line" data-tone="accent"><Icons.AlertCircle size={14} aria-hidden="true" />{requestedBy} is asking {names.length} question{names.length === 1 ? '' : 's'}</p>}
        {children}
        {state === 'asking' && (
          <div className="alt-confirm-actions">
            {skipLabel && <Button size="sm" variant="ghost" onClick={onSkip}>{skipLabel}</Button>}
            <Button size="sm" variant="primary" disabled={!ready} onClick={() => ready && onAnswer?.(answers as Record<string, QuestionAnswer>)}>{answerLabel}</Button>
          </div>
        )}
        <span className="alt-sr" aria-live="assertive">{said}</span>
      </div>
    </QuestionSetCtx.Provider>
  );
}
