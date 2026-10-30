import type * as React from 'react';

/** The eight rungs of the elevation ladder. Negative = sunk into the ground, positive = raised above it. */
export type Level = -2 | -1 | 0 | 1 | 2 | 3 | 4 | 5;
export type BuiltInScheme = 'daylight' | 'nightfall' | 'mesa' | 'alpine';
/** A built-in scheme, or the name of your own [data-theme="…"] block. */
export type Scheme = BuiltInScheme | (string & {});
export type SchemeColorToken = 'surface-trench' | 'surface-well' | 'surface-ground' | 'surface-raised' | 'surface-lifted' | 'surface-floating' | 'surface-overlay' | 'surface-modal'
  | 'ink' | 'ink-muted' | 'ink-faint' | 'line' | 'line-control' | 'accent' | 'on-accent' | 'accent-ink' | 'accent-soft'
  | 'positive' | 'positive-soft' | 'caution' | 'caution-soft' | 'critical' | 'critical-soft' | 'on-critical'
  | 'presence-1' | 'presence-2' | 'presence-3' | 'on-presence' | 'scrim' | DataColorToken;
/** The data palette (charts only): categorical slots, the fold, the magnitude ramp and the diverging ramp. */
export type DataColorToken = `data-${1 | 2 | 3 | 4 | 5 | 6}` | 'data-other' | `data-seq-${1 | 2 | 3 | 4 | 5 | 6 | 7}`
  | `data-div-${'neg' | 'pos'}-${1 | 2 | 3}` | 'data-div-mid';
export type SchemeShadowToken = 'trench' | 'well' | 'elev-0' | 'elev-1' | 'elev-2' | 'elev-3' | 'elev-4' | 'elev-5' | 'lip-top' | 'lip-bottom';
/** Your own scheme: tokens laid over a built-in one, scoped to the provider. It must keep the invariants checkScheme tests. */
export interface CustomScheme {
  /** Stamped as data-scheme on the provider's root. */
  name: string;
  /** The built-in scheme under your tokens: tokens you leave out, and light or dark handling, come from it. nightfall or alpine for a dark scheme. Default 'daylight'. */
  base?: BuiltInScheme;
  /** Colour and shadow tokens by name, without `--`. Shadows keep the four-layer structure; under high contrast they give way to slabs as the built-in ones do. */
  tokens: Partial<Record<SchemeColorToken | SchemeShadowToken, string>>;
}
export type Tone = 'neutral' | 'accent' | 'positive' | 'caution' | 'critical';

export interface AltitudeProviderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** A built-in scheme, the name of your own [data-theme] block, or a CustomScheme (which warns in the console if it breaks the invariants). Omit to inherit the scheme set on <html data-theme>. */
  scheme?: Scheme | CustomScheme;
  /** Any hex colour. accent, on-accent, accent-ink and accent-soft are derived to stay legible on every surface of the scheme. */
  accent?: string;
  /** 'system' follows prefers-reduced-motion. 'reduced' keeps altitude changes but removes travel and scale. Default 'system'. */
  motion?: 'system' | 'full' | 'reduced';
  /** 'more' renders elevation as hard ink slabs whose thickness is the height. 'system' follows prefers-contrast. Default 'system'. */
  contrast?: 'system' | 'more';
  /**
   * How large controls are (#245). 'auto' (default): today's sizes for a mouse, a step up under a coarse pointer (a
   * finger), so they're big enough to hit. 'comfortable': the larger sizes everywhere (a kiosk, an accessibility
   * setting). 'compact': today's sizes even on touch. Hit areas reach 44px under a coarse pointer either way.
   */
  density?: 'auto' | 'compact' | 'comfortable';
  /** The page scales back 1.5% and desaturates while a dialog is open. Default true. */
  recede?: boolean;
  /** Openings react as a mouse or pen approaches: empty fields deepen, a sheet's finger pull opens. Raised things never move before the pointer is on them. Never for touch; off under reduced motion. Default true. */
  approach?: boolean;
  /** How content still on its way waits (#343). 'sweep' (default): light passes over each imprint. 'breath' (experimental): imprints breathe in depth on one page clock, a swell crossing the view; raised content (Await settle="raised") rises past its rest and settles, flush content fills past the ground, and a card's parts land together. Set it on the outer provider: nested providers inherit it and can't turn it off. */
  loading?: 'sweep' | 'breath';
  /** The whole app is in a mode (test mode, viewing as a customer, read-only): a flush strip naming it, a 2px viewport frame, and a plate in every Dialog and Sheet. */
  mode?: AppMode;
  /** Development checks: warns when more than one primary Button is visible in one view (law 1). Default: on when process.env.NODE_ENV isn't 'production'. */
  devChecks?: boolean;
}export interface AppMode {
  label: string;
  description?: React.ReactNode;
  /** Default 'caution'. */
  tone?: 'caution' | 'accent' | 'critical' | 'neutral';
  /** A way out ("Leave test mode"). The strip can't be dismissed. */
  action?: React.ReactNode;
}
/** The app's mode, if any. */
/** A view of its own for the one-primary check: an independent card on a dashboard. Dialog, Sheet and Popover are already their own. */
export declare function PrimaryScope(props: { name?: string; children: React.ReactNode }): React.ReactElement;
export declare const ModeContext: React.Context<AppMode | null>;

/** Sets the scheme, accent and motion for everything inside it, and hosts dialogs and toasts. Wrap your app once. */
export declare function AltitudeProvider(props: AltitudeProviderProps): React.ReactElement;

/** Depth signals, accepted by Surface and Card and available to any element through useDepth. */
export interface DepthProps {
  /** Afterglow. Any value: when it changes, the surface tints, lifts and settles back over dur-settle. true settles once on mount. */
  settle?: unknown;
  /** Commitment of an optimistic write: pending hovers (after dur-grace), committed lands, failed drops into a trench. */
  status?: 'pending' | 'committed' | 'failed';
  /** A collaborator holding or editing this: lifted to level 3 in their presence colour, with their name. */
  heldBy?: { name: string; presence?: 1 | 2 | 3 } | null;
  /** Focus+context filtering: match rises one level, miss sinks into a well. */
  relevance?: 'match' | 'miss';
}
/** Returns the data attributes and style that render depth signals; spread them onto your own element. */
export declare function useDepth(props: DepthProps): Record<string, unknown> & { style?: React.CSSProperties };
/**
 * Keeps the shared approach tracker running while your component is mounted. Mark any element `data-approach`
 * (optionally `data-approach="96"` for a radius in px; default 64) and read in CSS: `--near` (0 far … 1 touching)
 * and `--mx`/`--my` (−1…1, the pointer's position on it while hovered).
 */
export declare function useApproach(enabled?: boolean): void;

export interface SurfaceProps extends React.HTMLAttributes<HTMLElement>, DepthProps {
  /** Default 1. */
  level?: Level;
  /** Climbs one level on hover and focus, drops to ground while pressed. Only for surfaces that do something. */
  interactive?: boolean;
  /** Prevent activation and remove interactive elevation. */
  disabled?: boolean;
  /** Native button type; defaults to button for as="button". */
  type?: 'button' | 'submit' | 'reset';
  /** Native link destination for as="a". */
  href?: string;
  /** Element to render. Default 'div'. */
  as?: keyof React.JSX.IntrinsicElements;
}
/** The primitive: a surface at a given altitude, with the tint and shadow of its level. */
export declare const Surface: React.ForwardRefExoticComponent<SurfaceProps & React.RefAttributes<HTMLElement>>;

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** primary rests at level 2, secondary at 1, ghost at 0, danger at 2. Default 'secondary'. */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  /** sm 30px, md 36px, lg 44px. Default 'md'. */
  size?: 'sm' | 'md' | 'lg';
  /** Icon-only square button. Requires aria-label. */
  square?: boolean;
  /** Holds the button pressed with a spinner; clicks are ignored. */
  loading?: boolean;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
}
export declare const Button: React.ForwardRefExoticComponent<ButtonProps & React.RefAttributes<HTMLButtonElement>>;

export interface CardProps extends React.HTMLAttributes<HTMLDivElement>, DepthProps {
  /** Lifts and presses. Set only when the whole card is one action; with onClick it becomes a keyboard-reachable button. */
  interactive?: boolean;
  /**
   * The card holds a Suspense boundary: while anything of yours inside it suspends, the card stays up and its body is an
   * imprint (a title line and `lines` lines, default 3). `false` lets it suspend to your own boundary.
   * It's also a loading scope: its optional parts (description, body text) wait while its required parts do.
   */
  skeleton?: SkeletonOption;
}
export declare const Card: React.ForwardRefExoticComponent<CardProps & React.RefAttributes<HTMLDivElement>>;
export declare function CardHeader(props: React.HTMLAttributes<HTMLDivElement>): React.ReactElement;
/** Text that may still be on its way: undefined while your data loads (`{user?.name}`), a promise, or one promise among plain text. null renders nothing. */
export type PromisedTextProps<E> = Omit<React.HTMLAttributes<E>, 'children'> & {
  children?: React.ReactNode | PromiseLike<React.ReactNode> | Array<React.ReactNode | PromiseLike<React.ReactNode>>;
  /**
   * While the text is on its way, its imprint: `lines` (one for a title, two for a description) and `width`. A title waits
   * whenever it's undefined; a description waits only while its card's required parts do. false: render what you pass as it is.
   */
  skeleton?: SkeletonOption;
};
export declare function CardTitle(props: PromisedTextProps<HTMLHeadingElement>): React.ReactElement;
export declare function CardDescription(props: PromisedTextProps<HTMLParagraphElement>): React.ReactElement;
export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The body holds a Suspense boundary: while anything of yours inside it suspends, or its text (`{user?.bio}`) is undefined while the card's other parts are, it's `lines` lines of imprint (default 3). false suspends to your own boundary. */
  skeleton?: SkeletonOption;
}
export declare function CardContent(props: CardContentProps): React.ReactElement;
export declare function CardFooter(props: React.HTMLAttributes<HTMLDivElement>): React.ReactElement;

export interface SuggestionProps {
  /** A proposed value, drawn as a ghost of the value in ink-faint (never put in the value): Tab accepts, Escape dismisses. */
  suggestion?: string;
  /** 'replace' (default): the suggestion is the whole value. 'append': it continues the text. */
  suggestionMode?: 'replace' | 'append';
  /** Called with the new value when Tab accepts (onChange is called too). */
  onAcceptSuggestion?: (value: string) => void;
}
export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>, SuggestionProps {
  /** Digs the well to trench depth with a critical rim. Field sets it for you when it has an error. */
  invalid?: boolean;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  /** sm 32px, md 38px. Default 'md'. */
  size?: 'sm' | 'md';
}
export declare const Input: React.ForwardRefExoticComponent<InputProps & React.RefAttributes<HTMLInputElement>>;
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement>, SuggestionProps {
  invalid?: boolean;
  /** With maxLength, the well fills from the floor as the text nears the limit, with a live count. Default true. */
  showFill?: boolean;
}
export declare const Textarea: React.ForwardRefExoticComponent<TextareaProps & React.RefAttributes<HTMLTextAreaElement>>;

export interface FieldProps {
  label: React.ReactNode;
  hint?: React.ReactNode;
  /** Replaces the hint, marks the control invalid and emerges beneath it. */
  error?: React.ReactNode;
  required?: boolean;
  className?: string;
  /** Exactly one control: Input, Textarea or any element that accepts id, aria-describedby and invalid. */
  children: React.ReactElement;
}
export declare function Field(props: FieldProps): React.ReactElement;

export interface SelectOption {
  value: string;
  label: React.ReactNode;
  /** Plain text for typeahead, filtering and the field. Needed when label isn't a string. */
  textValue?: string;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
}
interface SelectFieldProps {
  /** Goes on the trigger (Select) or the text field (Combobox); Field sets it so its label points here. */
  id?: string;
  /** Submits the value with a form, through a hidden input. */
  name?: string;
  required?: boolean;
  disabled?: boolean;
  /** Drops the field to trench depth. Field sets it when it has an error. */
  invalid?: boolean;
  /** sm 34px, md 40px, as Input. Default 'md'. */
  size?: 'sm' | 'md';
  /** Shown in ink-muted while nothing is chosen. Default "Choose…" (Select), "Type to search…" (Combobox). */
  placeholder?: string;
  /** Start with the list open (for documentation). */
  defaultOpen?: boolean;
  className?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
}
export interface SelectProps extends SelectFieldProps {
  /** 'auto' (default): anchored, or on a narrow touch screen a sheet at the bottom edge with a title and Close. 'anchored' or 'sheet' forces one. */
  presentation?: 'auto' | 'anchored' | 'sheet';
  /** Visible required feedback after native validation. Localize for the application. Default "Choose an option." */
  requiredMessage?: string;
  value?: string;
  /** Default '' (nothing chosen). */
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** The options as data; or pass SelectItem children. */
  items?: SelectOption[];
  children?: React.ReactNode;
}
/**
 * Choose one value from a list. The trigger is an opening built like Input (back wall while empty, floor flush once chosen,
 * trench when invalid); the list rises from its edge at level 3. WAI-ARIA listbox pattern with a button trigger.
 */
export declare function Select(props: SelectProps): React.ReactElement;
export interface SelectItemProps { value: string; children: React.ReactNode; textValue?: string; description?: React.ReactNode; icon?: React.ReactNode; disabled?: boolean }
/** Declares one option of a Select; renders nothing itself. */
export declare function SelectItem(props: SelectItemProps): React.ReactElement | null;
export interface ComboboxProps extends SelectFieldProps {
  /** 'auto' (default) and 'anchored' keep the list under the field you type in; 'sheet' opens it at the bottom edge. */
  presentation?: 'auto' | 'anchored' | 'sheet';
  items: SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Score an option against what's typed: 0 or false hides it, higher ranks it first. Default: the CommandPalette's ranking. */
  filter?: (option: SelectOption, query: string) => number | boolean;
  /** Shown when nothing matches. Default "No matches". */
  empty?: React.ReactNode;
}

export type TagResult = { ok: true; value: string } | { ok: false; error: string };
export interface TagInputProps {
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  /** Offered as you type, ranked as the Combobox ranks. Free entry is still allowed unless `restrict`. */
  suggestions?: (string | SelectOption)[];
  /** Only suggestions can be added. Default false. */
  restrict?: boolean;
  /** Keys that add what's typed: Enter and any single characters (also used to split a paste). Default [',', 'Enter']. */
  separators?: string[];
  /** The most tags allowed; then the field is read-only with “Limit reached”. */
  max?: number;
  /** Return an error to refuse a tag. Runs after `normalize`. */
  validate?: (tag: string) => string | undefined;
  /** Applied before validating and before comparing for duplicates. Default: trim. */
  normalize?: (tag: string) => string;
  /** Persist one added tag. Return its canonical text, or an error; the tag waits, pending, until then. */
  onAdd?: (tag: string) => TagResult | Promise<TagResult>;
  /** Persist one removal. The tag stays, pending, until the result. */
  onRemove?: (tag: string) => TagResult | Promise<TagResult> | { ok: true } | Promise<{ ok: true } | TagResult>;
  /** Draw a tag's contents. Default: its text. */
  renderTag?: (tag: string) => React.ReactNode;
  /** Words for the count and the messages. Default ['tag', 'tags']. */
  noun?: [singular: string, plural: string];
  placeholder?: string;
  /** Goes on the text input; Field sets it so its label points here. */
  id?: string;
  /** Submits each tag with a form, through hidden inputs. */
  name?: string;
  disabled?: boolean;
  required?: boolean;
  /** Field sets it for you when it has an error. */
  invalid?: boolean;
  size?: 'sm' | 'md';
  className?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
}
/** A set of short values in one field. Tags are Badge plates stamped into the field's floor; Backspace arms the last one, a second removes it. */
export declare function TagInput(props: TagInputProps): React.ReactElement;
export interface TagProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'> {
  children: React.ReactNode;
  /** Adds a remove button named “Remove <label>”. */
  onRemove?: () => void;
  /** Names the remove button when the children aren't plain text. */
  label?: string;
}
/** A tag on its own, outside a field. */
export declare function Tag(props: TagProps): React.ReactElement;

/** An ISO calendar date, 'YYYY-MM-DD': no time and no time zone. */
export type ISODate = string;
export interface DateRange { start: ISODate | null; end: ISODate | null }
interface DatePickerBase {
  /** Earliest and latest days that can be chosen or typed. */
  min?: ISODate;
  max?: ISODate;
  isUnavailable?: (date: ISODate) => boolean;
  /** Orders the segments and names the days and months. Default: the browser's. */
  locale?: string;
  /** 0 Sunday … 6 Saturday. Default: the locale's. */
  weekStartsOn?: number;
  /** Goes on the first segment; Field sets it so its label points here. */
  id?: string;
  /** Submits the value with a form, through a hidden input (a range submits name-start and name-end). */
  name?: string;
  disabled?: boolean;
  required?: boolean;
  /** Drops the field to trench depth. Field sets it when it has an error. */
  invalid?: boolean;
  /** sm 34px, md 40px, as Input. Default 'md'. */
  size?: 'sm' | 'md';
  className?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  /** Start with the calendar open (for documentation). */
  defaultOpen?: boolean;
}
export interface DatePickerProps extends DatePickerBase {
  value?: ISODate | null;
  defaultValue?: ISODate | null;
  /** Called with a complete, real, allowed date, or null when the field is cleared or holds a date that isn't allowed. */
  onValueChange?: (value: ISODate | null) => void;
}
/** A named span for DateRangePicker: a fixed range, or a function of today so it stays relative. key defaults to the label. */
export interface DatePreset { key?: string; label: string; range: DateRange | ((today: ISODate) => DateRange) }
/** Ready-made relative presets: today(), yesterday(), lastDays(n) (today included), thisMonth(), lastMonth(), thisQuarter(), lastQuarter(), thisYear(). */
export declare const datePresets: {
  today(): DatePreset; yesterday(): DatePreset; lastDays(n: number): DatePreset; thisMonth(): DatePreset; lastMonth(): DatePreset;
  thisQuarter(): DatePreset; lastQuarter(): DatePreset; thisYear(): DatePreset;
};
export interface DateRangePickerProps extends DatePickerBase {
  value?: DateRange;
  defaultValue?: DateRange;
  onValueChange?: (value: DateRange) => void;
  /** Named spans beside the calendar, built like Select options. Choosing one shows its name and dates in the field; typing or picking days clears it. */
  presets?: DatePreset[];
  /** The chosen preset's key, controlled; null when custom. */
  preset?: string | null;
  /** The preset to start with; without a defaultValue the range starts as its range. */
  defaultPreset?: string | null;
  onPresetChange?: (preset: string | null) => void;
  /** Today (ISO): relative presets resolve against it and re-resolve when it changes. Default: the local date. */
  today?: ISODate;
}
export interface CalendarProps {
  value?: ISODate | null;
  defaultValue?: ISODate | null;
  onValueChange?: (value: ISODate) => void;
  min?: ISODate;
  max?: ISODate;
  isUnavailable?: (date: ISODate) => boolean;
  locale?: string;
  weekStartsOn?: number;
  'aria-label'?: string;
  className?: string;
}
/** A date in a field, typed in segments or picked from a calendar floating at level 3. The chosen day carries the one raised mark. */
export declare function DatePicker(props: DatePickerProps): React.ReactElement;
/** Two dates as one span: a sunk track between two raised ends. */
export declare function DateRangePicker(props: DateRangePickerProps): React.ReactElement;
/** A month calendar laid on the page (level 0), without a field or panel. */
export declare function Calendar(props: CalendarProps): React.ReactElement;
/**
 * An editable Select: type to filter, choose to fill. A query keeps the field an opening until an option is chosen.
 * Leaving the field commits: an exact name chooses it, an empty field clears the value, anything else restores it.
 * WAI-ARIA combobox pattern with a listbox popup.
 */
export declare function Combobox(props: ComboboxProps): React.ReactElement;

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
  description?: React.ReactNode;
  indeterminate?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}
export declare const Checkbox: React.ForwardRefExoticComponent<CheckboxProps & React.RefAttributes<HTMLInputElement>>;

export interface RadioGroupProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  name?: string;
  disabled?: boolean;
  /** Default 'vertical'. */
  orientation?: 'vertical' | 'horizontal';
}
export declare function RadioGroup(props: RadioGroupProps): React.ReactElement;
export interface RadioProps { value: string; label?: React.ReactNode; description?: React.ReactNode; disabled?: boolean; className?: string }
export declare function Radio(props: RadioProps): React.ReactElement;

export interface SwitchProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  /** Visible label. Without one, pass aria-label. */
  label?: React.ReactNode;
}
export declare function Switch(props: SwitchProps): React.ReactElement;

export interface TabsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'defaultValue'> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /**
   * folder (default): each tab is the top edge of its own sheet and the chosen tab and its panel are one raised piece;
   * put the TabsContents directly after the TabsList. segmented: options in a well with a raised pill that glides.
   */
  variant?: 'folder' | 'segmented';
}
export declare function Tabs(props: TabsProps): React.ReactElement;
export declare function TabsList(props: React.HTMLAttributes<HTMLDivElement>): React.ReactElement;
export declare function TabsTrigger(props: React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }): React.ReactElement;
/** forceMount keeps the panel mounted while unchosen (inert, hidden from assistive technology, data-state="inactive"). */
export declare function TabsContent(props: React.HTMLAttributes<HTMLDivElement> & { value: string; forceMount?: boolean }): React.ReactElement | null;

export interface SliderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
  value?: number;
  /** Default 50. */
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  /** Default 0. */
  min?: number;
  /** Default 100. */
  max?: number;
  /** Default 1. */
  step?: number;
  disabled?: boolean;
  /** Formats the value shown in the bubble above the thumb while dragging or focused. */
  format?: (value: number) => React.ReactNode;
  'aria-label'?: string;
}
/** A range: pass `value` or `defaultValue` as [low, high] and Slider draws two thumbs with the raised fill between them. */
export interface SliderRangeProps extends Omit<SliderProps, 'value' | 'defaultValue' | 'onValueChange' | 'aria-label'> {
  value?: [number, number];
  /** Default [min, max] when value is omitted; pass one of value or defaultValue to get a range. */
  defaultValue?: [number, number];
  onValueChange?: (value: [number, number]) => void;
  /** Steps the thumbs keep between them; a thumb pushed against the other stops. Default 0. */
  minStepsBetween?: number;
  /** A name per thumb, or one name for the pair (the thumbs are then "<name>, minimum" and "<name>, maximum", in a group with that name). */
  'aria-label'?: string | [string, string];
}
export declare function Slider(props: SliderProps): React.ReactElement;
export declare function Slider(props: SliderRangeProps): React.ReactElement;

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Omit or null for indeterminate. */
  value?: number | null;
  /** Default 100. */
  max?: number;
  'aria-label'?: string;
}
export declare function Progress(props: ProgressProps): React.ReactElement;

export interface BadgeProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** Default 'neutral'. */
  tone?: Tone;
  /**
   * plate (default): an indicator plate set flush into the page. tinted: the plate takes its tone's colour ('soft' is the old name).
   * outline: a hairline only. count: a number that wants attention, floating above the page; it pops when it changes.
   */
  variant?: 'plate' | 'tinted' | 'outline' | 'count' | 'soft';
  /** The indicator lamp. On by default for positive, caution and critical; true on neutral shows an unlit lamp. 'pulse' breathes, for work in progress. */
  lamp?: boolean | 'pulse';
  /** @deprecated Use lamp. */
  dot?: boolean;
  /** The label. Undefined while your data loads, or a promise: until it arrives the badge is a plate-shaped imprint. null renders an empty plate. */
  children?: React.ReactNode | PromiseLike<React.ReactNode> | Array<React.ReactNode | PromiseLike<React.ReactNode>>;
  /** While the label is on its way: the imprint's `width` (default 64px; a count is round). false: render what you pass as it is. */
  skeleton?: SkeletonOption;
}
export declare function Badge(props: BadgeProps): React.ReactElement;

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Used for initials, the tint and the accessible name (status is appended). Undefined while your data loads (`user?.name`), or a promise: until it arrives the avatar is a round imprint of its size. */
  name: Promised<string> | undefined;
  /** May be a promise, like name. */
  src?: Promised<string | undefined>;
  /** Pixels. Default 36. */
  size?: number;
  /** Presence as height, read from the gap to its shadow: active hovers above the page, idle rests on it, offline lies flat and grey. */
  status?: 'active' | 'idle' | 'offline';
  /** Speaking, typing or presenting right now: the avatar drifts gently. */
  live?: boolean;
  /** Rings the avatar in this person's presence colour, matching anything they hold. */
  presence?: 1 | 2 | 3;
  /** Status lamp (green active, amber idle). Default: shown with a status at 24px and up; never inside AvatarGroup. */
  lamp?: boolean;
  /** false: no imprint. An undefined name renders an empty face; a promised one suspends to your own boundary. */
  skeleton?: boolean;
}
export declare function Avatar(props: AvatarProps): React.ReactElement;
export declare function AvatarGroup(props: React.HTMLAttributes<HTMLDivElement> & { max?: number }): React.ReactElement;

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** When it turns true, the children rise out of the imprint into place. */
  loaded?: boolean;
  /** Default 'block'. */
  shape?: 'block' | 'text' | 'circle';
  /** For shape="text": how many lines. Default 3. */
  lines?: number;
  width?: number | string;
  /** Default 14 (12 for text lines). */
  height?: number | string;
  radius?: string;
}
export declare function Skeleton(props: SkeletonProps): React.ReactElement;

/** A value, or a promise of one. A component that takes one shows its own imprint until it lands. */
export type Promised<T> = T | PromiseLike<T>;
/** Content that may still be on its way: undefined while your data loads, or a promise. null means there is nothing. */
export type Pending<T> = T | PromiseLike<T> | undefined;
/** Hints for a component's imprint (`lines`, `width`), or false to let it suspend to your own boundary instead. */
export type SkeletonOption = boolean | { lines?: number; width?: number | string };
export interface AwaitProps {
  /** The imprint: the fallback while the children suspend. Build it from Skeleton, or the .alt-skeleton class. */
  imprint: React.ReactNode;
  /** The shape left behind as content rises out of it. 'none' for containers: their content just rises. Default 'block'. */
  shape?: 'circle' | 'text' | 'block' | 'none';
  /** Sits in a line of text or a row of controls rather than as a block. */
  inline?: boolean;
  /** false: no boundary; the children suspend to yours. */
  enabled?: boolean;
  /** Where the content rests once it lands, for loading="breath". 'flush' (default): it fills past the ground and settles. 'raised' (a card): it rises a level past its rest and settles over dur-arrive. */
  settle?: 'flush' | 'raised';
  /** Content arriving into a view already showing (Load more), for loading="breath": flush content gets a plate that dissolves over dur-plate. A boundary that suspends again after landing is late without it. */
  late?: boolean;
  className?: string;
  children?: React.ReactNode;
}
/**
 * The Suspense boundary every Suspense-native component holds: its fallback is an imprint, which waits dur-grace before
 * it shows; content rises out of it when it lands, within the attention budget. Use it to give your own components the same behaviour.
 */
export declare function Await(props: AwaitProps): React.ReactElement;
/** Imprints inside land together: each one that finishes stays an imprint until the slowest lands, then they all rise. */
export declare function RevealGroup(props: { children?: React.ReactNode }): React.ReactElement;
/**
 * A loading scope, as every Card is one: required parts inside (an avatar's name, a title, a badge's label, a table's rows)
 * report whether they're still undefined, and optional parts (a description, body text) wait only while they do.
 */
export declare function LoadingScope(props: { children?: React.ReactNode }): React.ReactElement;
/** Reads a promised value, suspending until it lands: React 19's use(), or the same contract by hand on React 18. */
export declare function readPromised<T>(value: Promised<T>): T;

export interface AlertProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Default 'neutral'. critical renders role="alert", the rest role="status". */
  tone?: Tone;
  /** flat (default): a sheet laid on the page, it informs. raised: a card above the page, it asks you to act. */
  variant?: 'flat' | 'raised';
  title?: React.ReactNode;
  action?: React.ReactNode;
  /** Replaces the tone's icon. */
  icon?: React.ReactNode;
  /** Adds a dismiss button; the sheet lifts off the page, the gap closes, then this is called. */
  onDismiss?: () => void;
  /** The dismiss button's words ("Remind me tomorrow"). Default: an × named "Dismiss". */
  dismissLabel?: string;
  /** 'page': a banner for the whole app or page, edge to edge with no side rounding, in a labelled region. Default 'inline'. */
  placement?: 'inline' | 'page';
  /** With placement="page": stays at the top while the page scrolls. */
  sticky?: boolean;
  /** Afterglow when the value changes (see DepthProps). */
  settle?: unknown;
}
export declare function Alert(props: AlertProps): React.ReactElement;

export interface AlertStackProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Keyed Alert elements, most important first. */
  children: React.ReactNode;
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  /** Default `+N more`. */
  moreLabel?: (hidden: number) => React.ReactNode;
  /** Default "Show less". */
  lessLabel?: React.ReactNode;
  /** 'page': a stack of page banners, edge to edge. Give each Alert placement="page" too. */
  placement?: 'inline' | 'page';
}
/** Several alerts as a stack of sheets: one on top, the rest peeking out beneath in their own tones, with a count. Opens into a column. */
export declare function AlertStack(props: AlertStackProps): React.ReactElement;

export interface AccordionItem { value: string; title: React.ReactNode; content: React.ReactNode }
export interface AccordionProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'defaultValue'> {
  items: AccordionItem[];
  /** Default 'single'. */
  type?: 'single' | 'multiple';
  defaultValue?: string[];
}
export declare function Accordion(props: AccordionProps): React.ReactElement;

export interface KbdProps extends React.HTMLAttributes<HTMLElement> {
  /** A KeyboardEvent.key; the key presses down while that key is held. */
  listen?: string;
  /** Hide it on a touch-only device until a key is pressed: for a hint that only makes sense with a keyboard. Default false. */
  hideOnTouch?: boolean;
}
/** Whether the person likely has a keyboard: false on a touch-only device until a key is pressed in the session. */
export declare function useKeyboardLikely(): boolean;
export declare function Kbd(props: KbdProps): React.ReactElement;

export interface TooltipProps {
  content: React.ReactNode;
  /** Default 'top'. 'right' is for a rail of icons, where above would cover the next one. */
  side?: 'top' | 'bottom' | 'right';
  /** Milliseconds before the first tooltip opens. Default 450. Neighbours open instantly for 400ms after one closes. */
  delay?: number;
  defaultOpen?: boolean;
  /** One focusable element. */
  children: React.ReactElement;
}
export declare function Tooltip(props: TooltipProps): React.ReactElement;

export interface HoverCardProps {
  /** What you hover or focus, usually a link or an avatar. It must do its own job without the card. */
  trigger: React.ReactElement;
  children: React.ReactNode;
  /** Default 'bottom'. */
  side?: 'top' | 'bottom';
  /** Default 'start'. */
  align?: 'start' | 'center' | 'end';
  /** Hover intent before it opens. Default 400ms. */
  openDelay?: number;
  /** How long it stays after the pointer leaves, so the pointer can travel into it. Default 250ms. */
  closeDelay?: number;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}
/**
 * A richer preview that rises from its trigger at level 3 after hover intent or on keyboard focus, and shares Tooltip's
 * warm-up between neighbours. One is open at a time. Supplementary: never the only way to reach what's in it.
 */
export declare function HoverCard(props: HoverCardProps): React.ReactElement;

export interface PopoverProps {
  /** One button-like element; it receives onClick and aria-expanded. */
  trigger: React.ReactElement;
  children: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Default 'bottom'. */
  side?: 'top' | 'bottom';
  /** Default 'start'. */
  align?: 'start' | 'center' | 'end';
  className?: string;
  'aria-label'?: string;
}
export declare function Popover(props: PopoverProps): React.ReactElement;

export interface MenuItem {
  type?: 'item'; label: React.ReactNode; icon?: React.ReactNode; shortcut?: React.ReactNode; onSelect?: () => void; tone?: 'critical'; disabled?: boolean;
  /** Appears at once while the others fade in over dur-onset. Only worth it when predictions are right ~4 times in 5. */
  predicted?: boolean;
  /** A checkable item (role="menuitemcheckbox"), shown with a check when true: a toggle moved into a menu. */
  checked?: boolean;
}
export type MenuEntry =
  | MenuItem
  | { type: 'separator' }
  | { type: 'label'; label: React.ReactNode };
export interface DropdownMenuProps {
  /** 'auto' (default): anchored, or on a narrow touch screen a sheet at the bottom edge with a title and Close. 'anchored' or 'sheet' forces one. */
  presentation?: 'auto' | 'anchored' | 'sheet';
  /** The sheet's title. Default: the trigger's aria-label or text. */
  title?: string;
  trigger: React.ReactElement;
  items: MenuEntry[];
  /** Default 'start'. */
  align?: 'start' | 'end';
  /** Default 'bottom'. */
  side?: 'top' | 'bottom';
  defaultOpen?: boolean;
  className?: string;
}
export declare function DropdownMenu(props: DropdownMenuProps): React.ReactElement;

/** One controlled single-line value; onSave writes once, onValueChange synchronously publishes its canonical result. */
export type InlineEditSaveResult<V = string> = { ok: true; value: V } | { ok: false; error: string };
/** What `editor` receives. Spread it onto Select or Combobox, or adapt it for a Switch or numeric Input. */
export interface InlineEditControl<V> {
  value: V;
  onValueChange: (value: V) => void;
  /** The label points here. */
  id: string;
  /** The error, or the “Choose to save” hint with commit="on-choose". */
  'aria-describedby'?: string;
  invalid: boolean;
  /** True while checking, saving or blocked by a conflict. Changes are ignored until it clears. */
  readOnly: boolean;
  disabled: boolean;
  autoFocus: true;
}
export interface InlineEditProps<V = string> {
  value: V;
  onValueChange: (canonicalValue: V) => void;
  onSave: (draft: V, context: { previousValue: V }) => InlineEditSaveResult<V> | Promise<InlineEditSaveResult<V>>;
  label: string;
  validate?: (draft: V) => string | undefined | Promise<string | undefined>;
  /** Rejects an empty value: '', null, undefined or an empty array. */
  required?: boolean;
  /** Strings only. */
  maxLength?: number;
  disabled?: boolean;
  editLabel?: string;
  saveLabel?: string;
  cancelLabel?: string;
  /** Used only when completion still owns focus and the Edit button cannot receive it. */
  focusFallback?: () => HTMLElement | null;
  className?: string;
  /** Read mode. Default: the value as text, or “Not set” when empty. */
  renderValue?: (value: V) => React.ReactNode;
  /** Edit mode. Default: the existing Input for a string. */
  editor?: (control: InlineEditControl<V>) => React.ReactNode;
  /** 'on-choose': a single-choice editor saves as soon as a value is chosen, and Save is hidden. Default 'explicit'. */
  commit?: 'explicit' | 'on-choose';
  /** An unchanged draft closes without a write, and an equal observed value isn't an external change. Default Object.is. */
  isEqual?: (a: V, b: V) => boolean;
  /** A Textarea instead of the Input: Enter inserts a newline and Ctrl/Cmd+Enter saves. Default false. */
  multiline?: boolean;
  /** With multiline, the textarea's initial height in lines. Default 3. */
  rows?: number;
  /** With multiline, the textarea grows with its content up to this many lines, then scrolls. Default 12. */
  maxRows?: number;
  /**
   * How editing starts. 'button' (default): the value, then a visible Edit button. The others make the value its own
   * button, named “<label>: <value>. <editLabel>”: 'value' a plate that lifts on hover, 'pencil' a pencil shown on hover
   * or focus, 'field' the input's own border and floor drawn on hover, and a click puts the caret where it landed.
   */
  trigger?: 'button' | 'value' | 'pencil' | 'field';
  /** With trigger 'value', 'pencil' or 'field': 'seam' scores a faint groove under the value at rest, where its well will open, so people know to point at it. Default 'none'. */
  hint?: 'none' | 'seam';
  /** Shown for an empty value. Default “Not set”. */
  emptyLabel?: string;
  /** Single-key shortcut announced on the trigger (aria-keyshortcuts); the surrounding list handles the key. */
  shortcut?: string;
  /** How long a saved value's afterglow takes to fade, in ms. Default 5000. */
  settleDuration?: number;
}
export declare function InlineEdit<V = string>(props: InlineEditProps<V>): React.ReactElement;

type EditRegionFieldErrors<T> = Partial<Record<keyof T, string>>;
export type EditRegionSaveResult<T> = { ok: true; value: T } | { ok: false; error: string; fieldErrors?: EditRegionFieldErrors<T> };
export interface EditRegionProps<T extends Record<string, unknown>> {
  /** Names the region: “Edit <label>”. */
  label: string;
  /** The committed record. */
  value: T;
  /** Publishes the accepted canonical record, synchronously and without a network write. */
  onValueChange: (canonical: T) => void;
  /** The sole write. `changed` lists only the fields that differ, so you can send a patch. */
  onSave: (draft: T, context: { previousValue: T; changed: (keyof T)[] }) => EditRegionSaveResult<T> | Promise<EditRegionSaveResult<T>>;
  /** Runs on Save. Return an error per field, or undefined. */
  validate?: (draft: T) => EditRegionFieldErrors<T> | undefined | Promise<EditRegionFieldErrors<T> | undefined>;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  /** The field focused on opening. Default: the first control in the form. */
  initialFocus?: keyof T;
  /** Used only when completion still owns focus and the Edit button cannot receive it. */
  focusFallback?: () => HTMLElement | null;
  /** Compares one field's values. Default Object.is. */
  isEqual?: (a: unknown, b: unknown) => boolean;
  /** Default `Edit ${label.toLowerCase()}`. */
  editLabel?: string;
  saveLabel?: string;
  cancelLabel?: string;
  /** How long the region's afterglow takes to fade after a save, in ms. Default 5000. */
  settleDuration?: number;
  /**
   * 'form' (default): editing opens a form laid out your way. 'in-place': each value's well opens where its text is: mark
   * read values with EditRegionValue, and lay the fields out where the values were. Controls take the value's font and
   * reach 13px past their column on each side (the inset their text sits at), so leave 26px between columns.
   */
  layout?: 'form' | 'in-place';
  className?: string;
  /** EditRegionView and EditRegionForm. */
  children: React.ReactNode;
}
/** Binds one field of the draft to a control. Spread the result onto it. */
export interface EditRegionBinder<T> {
  /** Text controls (Input, Textarea): value + onChange. */
  <K extends keyof T>(key: K): { name: string; value: T[K]; onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void; readOnly: boolean; disabled?: boolean; 'data-field': string };
  /** Value controls (Select, Combobox, Slider): value + onValueChange. */
  value<K extends keyof T>(key: K): { name: string; value: T[K]; onValueChange: (value: T[K]) => void; disabled?: boolean; 'data-field': string };
  /** Toggles (Switch, Checkbox): checked + onCheckedChange. */
  checked<K extends keyof T>(key: K): { checked: boolean; onCheckedChange: (checked: boolean) => void; disabled?: boolean; 'data-field': string };
  /** The field's error, for its Field. */
  error(key: keyof T): string | undefined;
  /** The current draft. */
  draft: T;
}
/** Several fields of one record, edited where it's shown and saved together. Read mode on the ground; editing lifts it into a static raised card. */
export declare function EditRegion<T extends Record<string, unknown>>(props: EditRegionProps<T>): React.ReactElement;
/**
 * One value in read mode, named by the field that edits it. With layout 'in-place', a field whose text opens where its
 * value was simply appears; one that opens elsewhere fades in. `reserve` gives the value its control's height and inset
 * now, so in a list of labelled rows nothing moves at all when Edit opens.
 */
export declare function EditRegionValue(props: { field: string; reserve?: boolean; children?: React.ReactNode; className?: string }): React.ReactElement;
/** Read mode. Shows an Edit button after the values unless `trigger={false}`. */
export declare function EditRegionView(props: { children?: React.ReactNode; trigger?: boolean; className?: string }): React.ReactElement | null;
/** The visible Edit button, for when EditRegionView's `trigger` is false. */
export declare function EditRegionTrigger(props: { children?: React.ReactNode; className?: string }): React.ReactElement | null;
/** Edit mode: a form (a group inside another form) named “Edit <label>”. Children may be a function of the draft binder. */
export declare function EditRegionForm<T extends Record<string, unknown> = Record<string, unknown>>(props: {
  children: React.ReactNode | ((field: EditRegionBinder<T>) => React.ReactNode);
  /** Render the error, conflict notice and Save/Cancel after the fields. Default true. */
  actions?: boolean;
  className?: string;
}): React.ReactElement | null;
/** The error, the conflict notice and Save/Cancel, for a form with `actions={false}`. */
export declare function EditRegionActions(): React.ReactNode;

/**
 * An item's slot that keeps its place when the item leaves. With `removed`, the result shows where the item was, at its
 * height; it holds for dur-linger (paused while pointed at, focused or under a modal, and waiting while a mouse is over
 * the list), lifts off, and then the gap glides closed and `onClosed` is called. Receipts due within 250ms close together.
 */
export interface RemovalReceiptProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'>, Pick<DepthProps, 'settle'> {
  /** The slot's element. Use `li` inside a list. Default `div`. */
  as?: 'div' | 'li' | 'section' | 'article';
  /** false: the item itself (children). true: the receipt in the item's slot, held, then closed. */
  removed: boolean;
  /** The write isn't confirmed yet: the receipt hovers as pending and the hold hasn't started. */
  pending?: boolean;
  /** What happened, in past tense: “Brand guidelines.pdf archived.” Announced politely when it appears. */
  title?: React.ReactNode;
  /** Undo, or a route to where the item went. Keep it to one or two buttons. */
  action?: React.ReactNode;
  /** critical: the result changed under you (an Undo that's no longer valid). */
  tone?: 'neutral' | 'critical';
  icon?: React.ReactNode;
  /** How long the receipt holds before it closes, in ms. Default dur-linger (2000ms). */
  hold?: number;
  /** The gap has closed. Drop the item from your list here. */
  onClosed?: () => void;
  /** Where focus goes when it's inside the slot as it closes and no neighbouring slot has anything to focus. */
  focusFallback?: () => HTMLElement | null;
  /** When mounted, the slot glides open from nothing (an item brought back from elsewhere), then settles. */
  arrive?: boolean;
}
export declare function RemovalReceipt(props: RemovalReceiptProps): React.ReactElement;

export type ItemGroupResult = { ok: true } | { ok: false; error: string };
export type ItemGroupCreateResult<T> = { ok: true; value: T } | { ok: false; error: string };
/**
 * How removal is recovered. There's no default: say whether the application can reverse it (immediate, with Undo)
 * or needs confirmation first. A danger button doesn't imply irreversibility. A recoverable removal leaves a
 * RemovalReceipt with Undo in the slat's place for dur-linger, then closes the gap and offers Undo in a toast (render
 * a Toaster); a confirmed one glides the slat shut.
 */
export type ItemGroupRemoval<T> =
  | { kind: 'recoverable'; undo: (item: T) => void | Promise<unknown> }
  | { kind: 'confirm'; title: (item: T) => string; description?: (item: T) => React.ReactNode; confirmLabel?: string };
/** What renderItem gets. Spread editProps and removeProps onto visible Buttons: they carry the name, the handler and focus repair. */
export interface ItemActionsApi {
  edit: () => void;
  remove: () => void;
  editProps: { onClick: () => void; 'aria-label': string; 'data-action': 'edit' };
  removeProps: { onClick: () => void; 'aria-label': string; 'data-action': 'remove' };
}
export interface ItemGroupProps<T extends Record<string, unknown>> {
  'aria-label'?: string;
  'aria-labelledby'?: string;
  items: T[];
  getKey: (item: T) => string;
  /** Names actions (“Edit Production webhook”) and announcements. */
  getLabel: (item: T) => string;
  /** One slat. `edit` and `remove` open the editor and remove the item, with focus and recovery handled. */
  renderItem: (item: T, actions: ItemActionsApi) => React.ReactNode;
  /** The in-place editor's fields (EditRegion's draft binder). */
  renderEditor?: (field: EditRegionBinder<T>, item: T | null) => React.ReactNode;
  /** Save an edited item: the EditRegion contract. */
  onSave?: (draft: T, context: { previousValue: T; changed: (keyof T)[] }) => EditRegionSaveResult<T> | Promise<EditRegionSaveResult<T>>;
  /** Publish a saved item's canonical record (a synchronous setter, no network). */
  onItemChange?: (canonical: T) => void;
  /** The draft for a new item. With onCreate, shows the add slat. */
  newItem?: () => T;
  /** Resolve after `items` includes the new item. */
  onCreate?: (draft: T) => ItemGroupCreateResult<T> | Promise<ItemGroupCreateResult<T>>;
  /** Default “Add item”. */
  addLabel?: string;
  /** Shows grips: Space to pick up, arrows to move, Space to drop. Resolve after `items` is in the new order. */
  onReorder?: (next: T[]) => void | ItemGroupResult | Promise<void | ItemGroupResult>;
  /** Resolve after `items` no longer includes it. */
  onRemove?: (item: T) => void | ItemGroupResult | Promise<void | ItemGroupResult>;
  removal?: ItemGroupRemoval<T>;
  /** Shown when there are no items (an EmptyState). */
  empty?: React.ReactNode;
  className?: string;
}
/** A list of slats changed in the list itself: edit one in place (EditRegion), add, reorder, remove with the application's recovery policy. */
export declare function ItemGroup<T extends Record<string, unknown>>(props: ItemGroupProps<T>): React.ReactElement;
export declare function Item(props: React.HTMLAttributes<HTMLDivElement>): React.ReactElement;
export declare function ItemMedia(props: React.HTMLAttributes<HTMLDivElement> & { variant?: 'icon' | 'image' | 'avatar' }): React.ReactElement;
export declare function ItemContent(props: React.HTMLAttributes<HTMLDivElement>): React.ReactElement;
export declare function ItemTitle(props: React.HTMLAttributes<HTMLDivElement>): React.ReactElement;
/** `truncate` clamps the line to that many lines (true: one). */
export declare function ItemDescription(props: React.HTMLAttributes<HTMLParagraphElement> & { truncate?: boolean | number }): React.ReactElement;
/** Visible actions, not hover-only. */
/** `narrow`: 'below' (default) moves the actions under the content when the group is under 480px wide; 'inline' keeps them beside it. */
export declare function ItemActions(props: React.HTMLAttributes<HTMLDivElement> & { narrow?: 'below' | 'inline' }): React.ReactElement;
export declare function ItemSeparator(props: React.HTMLAttributes<HTMLHRElement>): React.ReactElement;

export interface PropertyListEditAll<T extends Record<string, unknown>> {
  /** The whole record, edited together (for cross-field rules such as start before end). */
  value: T;
  onValueChange: (canonical: T) => void;
  onSave: (draft: T, context: { previousValue: T; changed: (keyof T)[] }) => EditRegionSaveResult<T> | Promise<EditRegionSaveResult<T>>;
  validate?: (draft: T) => Partial<Record<keyof T, string>> | undefined | Promise<Partial<Record<keyof T, string>> | undefined>;
  renderEditor: (field: EditRegionBinder<T>) => React.ReactNode;
  /** Names the region and its button: “Edit all <label>”. Default “details”. */
  label?: string;
}
export interface PropertyListProps<T extends Record<string, unknown> = Record<string, unknown>> {
  'aria-label'?: string;
  'aria-labelledby'?: string;
  /** stacked: label above value (a sidebar). inline: label beside value (a summary). Default 'stacked'. */
  layout?: 'stacked' | 'inline';
  /** Single-key shortcuts (an item's `shortcut`) while focus is in the list. Off by default (WCAG 2.1.4): offer a way to turn them on. */
  shortcuts?: boolean;
  /** An “Edit all” button that lifts the whole list into one EditRegion. */
  editAll?: PropertyListEditAll<T>;
  /** Who proposed the items' `proposed` values. Default "Assistant". */
  proposedBy?: string;
  className?: string;
  children: React.ReactNode;
}
export interface PropertyListItemProps<V> {
  label: string;
  value: V;
  /** Read mode. Default: the value as text. */
  renderValue?: (value: V) => React.ReactNode;
  /** An empty value's words, shown in a small well. Default “Not set”. */
  emptyLabel?: string;
  /** Makes the item editable (InlineEdit's contract). Without it, the value is read-only text. */
  onSave?: (draft: V, context: { previousValue: V }) => InlineEditSaveResult<V> | Promise<InlineEditSaveResult<V>>;
  onValueChange?: (canonical: V) => void;
  editor?: (control: InlineEditControl<V>) => React.ReactNode;
  commit?: 'explicit' | 'on-choose';
  validate?: (draft: V) => string | undefined | Promise<string | undefined>;
  required?: boolean;
  isEqual?: (a: V, b: V) => boolean;
  /** A single key that opens this item while focus is in the list (with `shortcuts` on the list). Case doesn't matter. */
  shortcut?: string;
  /** A proposed change: raised, current struck beside proposed, with Accept and Reject. Nothing is saved until accepted. */
  proposed?: V;
  /** Called once the proposal is accepted (and saved) or rejected: clear `proposed` here. */
  onProposalResolved?: (accepted: boolean, value: V) => void;
  className?: string;
}
/** One record's properties as label–value pairs (a dl), each editable where it sits; unset values are openings. */
export declare function PropertyList<T extends Record<string, unknown> = Record<string, unknown>>(props: PropertyListProps<T>): React.ReactElement;
/** One property: with onSave an editable value plate (InlineEdit), without it read-only text. */
export declare function PropertyListItem<V>(props: PropertyListItemProps<V>): React.ReactElement;

export interface DialogProps {
  /** Default recede retains the existing stage/scrim presentation. Stationary removes recession and blur, not modality. */
  background?: 'recede' | 'stationary';
  /** Lazy fallback when the captured invoker is unavailable. Return a connected, visible, focusable element. */
  returnFocus?: () => HTMLElement | null;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Uncontrolled convenience: an element that opens the dialog. */
  trigger?: React.ReactElement;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  /** Buttons, right-aligned. Put the primary (or danger) action last. */
  footer?: React.ReactNode;
  /** sm 380px, md 460px, lg 620px. Default 'md'. */
  size?: 'sm' | 'md' | 'lg';
  /** false: scrim clicks and Escape don't close it, and there is no close button. Default true. */
  dismissible?: boolean;
  /**
   * Where focus goes once the dialog has risen. 'first-field' (default): the first match for focusSelector, else the
   * panel. 'title': the title, for a read surface whose first control is far down. false: the panel until you move it inside.
   * On close, restore the available invoker or fallback only while this dialog still owns focus.
   */
  initialFocus?: 'first-field' | 'title' | false;
  /** What 'first-field' looks for. Default '[data-autofocus], input, textarea, select'. */
  focusSelector?: string;
  className?: string;
}
export declare function Dialog(props: DialogProps): React.ReactElement;

export interface SheetProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Uncontrolled convenience: an element that opens the sheet (and toggles a non-modal one). */
  trigger?: React.ReactElement;
  /** The edge it's anchored to. Default 'right'. */
  side?: 'right' | 'left' | 'bottom';
  /** Width: sm 360, md 440, lg 560px; a bottom sheet 480, 720, 960px. Default 'md'. */
  size?: 'sm' | 'md' | 'lg';
  /** false: a side panel that leaves the page usable (no scrim, no receding page, no focus trap). Default true. */
  modal?: boolean;
  /** false: Escape, the scrim, the close button and the finger pull don't close it; only your own controls do. Default true. */
  dismissible?: boolean;
}
/**
 * A large sheet laid over the page at level 4, anchored to an edge. It rises at that edge (16px of travel, a fade, its shadow
 * growing to elev-4) while the page recedes; closing lifts it off. Compose it from SheetHeader, SheetTitle, SheetDescription,
 * your content and SheetFooter.
 */
export declare function Sheet(props: SheetProps): React.ReactElement;
/** The title block; it stays at the top and rises once content scrolls under it. */
export declare function SheetHeader(props: React.HTMLAttributes<HTMLDivElement>): React.ReactElement;
/** Names the sheet (aria-labelledby). */
export declare function SheetTitle(props: React.HTMLAttributes<HTMLHeadingElement>): React.ReactElement;
/** Describes the sheet (aria-describedby). */
export declare function SheetDescription(props: React.HTMLAttributes<HTMLParagraphElement>): React.ReactElement;
/** Actions, right-aligned; it stays at the bottom, and its top edge curves away while content continues beneath it. */
export declare function SheetFooter(props: React.HTMLAttributes<HTMLDivElement>): React.ReactElement;

export interface CommandItem {
  /** Stable key within its group. Default: the label. */
  id?: string;
  label: string;
  /** A short second line of context (a path, a branch); matched with less weight than the label. */
  description?: string;
  icon?: React.ReactNode;
  /** Keys shown as Kbd hints, e.g. ['⌘', 'D']. Display only: bind the shortcut yourself. */
  shortcut?: string[];
  /** Other words that should find this item: synonyms, old names. */
  keywords?: string[];
  onSelect?: () => void;
  disabled?: boolean;
  tone?: 'critical';
  /** On opening, predicted items are there at once while the rest fade in over dur-onset. Only worth it when predictions are right ~4 times in 5. */
  predicted?: boolean;
}
export interface CommandGroup {
  /** Stable key. Default: its position. */
  id?: string;
  label?: React.ReactNode;
  items: CommandItem[];
  /** Every item in it is predicted: a "Recent" or "Suggested" group. */
  predicted?: boolean;
}
export interface CommandPaletteProps {
  items: CommandGroup[];
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Called with the chosen item, after the item's own onSelect. */
  onSelect?: (item: CommandItem, group: CommandGroup) => void;
  /** Default "Type a command or search…". */
  placeholder?: string;
  /** Score an item against the query: 0 hides it, higher ranks it nearer the top. Replaces the built-in match (commandScore). */
  filter?: (item: CommandItem, query: string) => number;
  /** Shown when nothing matches; a function receives the query. Default: "No results for “…”" and a hint. */
  empty?: React.ReactNode | ((query: string) => React.ReactNode);
  /** The letter that toggles it with ⌘ (macOS) or Ctrl. Default 'k'; false for none. It won't open while a Dialog holds the summit. */
  shortcut?: string | false;
  /** The query, controlled. It isn't cleared on opening: the caller owns it (a persistent search field handing over what was typed, a filter already applied). */
  query?: string;
  /** The query each time it opens, uncontrolled. Default ''. Either way the caret lands after a carried query, so typing continues it. */
  defaultQuery?: string;
  onQueryChange?: (query: string) => void;
  /** Close once an item is chosen. Default true. */
  closeOnSelect?: boolean;
  /** The key hints (footer, item shortcuts, esc): 'auto' (default) hides them on a touch-only device until a key is pressed. */
  hints?: boolean | 'auto';
  className?: string;
  /** Default "Command palette". */
  'aria-label'?: string;
}
/** The summit: a level-5 search over everything you can do, opened with ⌘K / Ctrl+K. Render it once, inside AltitudeProvider. */
export declare function CommandPalette(props: CommandPaletteProps): React.ReactElement | null;
/** The built-in ranking. 0 means no match; exact beats prefix beats word start beats substring beats letters in order. */
export declare function commandScore(text: string, query: string): number;

export interface ToastOptions {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Default 'neutral'. */
  tone?: 'neutral' | 'positive' | 'caution' | 'critical';
  /** Milliseconds; 0 keeps it until dismissed. Default 5000. Paused while the stack is hovered or focused. */
  duration?: number;
  action?: { label: string; onClick: () => void };
  /** false: shown but not announced, because what it says was already announced where it happened. Default true. */
  announce?: boolean;
}
/** Render once, inside AltitudeProvider. */
export declare function Toaster(props: { className?: string }): React.ReactElement;
export declare const toast: ((options: ToastOptions | string) => number) & { dismiss(id: number): void };

export interface HoldButtonProps extends Omit<ButtonProps, 'loading'> {
  /** Called once the button has been held for the full duration. */
  onConfirm: () => void;
  /** Milliseconds. Default 1000 (dur-hold). */
  duration?: number;
  holdingLabel?: React.ReactNode;
  /** Shown once the hold completes. Say what happened: "Project deleted". */
  doneLabel?: React.ReactNode;
  /** By default a completed hold is final: the button lies flat and can't be pressed again. true re-arms it after a moment. */
  repeatable?: boolean;
}
/** Press and hold to commit: the button sinks through the ground into a trench as a fuse burns. Default variant 'danger'. */
export declare function HoldButton(props: HoldButtonProps): React.ReactElement;

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  /** The body scrolls under a sticky header past this height; the header rises once rows pass under it. */
  maxHeight?: number | string;
  /** Drawn inside the scroll area beneath the rows (DataTable puts its landing slot here). */
  underlay?: React.ReactNode;
}
/**
 * A plain table whose rows are the record: they sit on the ground with line dividers. Only rows that are selected,
 * matching, interactive or held rise; rows given a rowId are carried to their new places when the order changes.
 */
export declare const Table: React.ForwardRefExoticComponent<TableProps & React.RefAttributes<HTMLTableElement>>;
export declare function TableHeader(props: React.HTMLAttributes<HTMLTableSectionElement>): React.ReactElement;
export declare const TableBody: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLTableSectionElement> & React.RefAttributes<HTMLTableSectionElement>>;
export declare function TableFooter(props: React.HTMLAttributes<HTMLTableSectionElement>): React.ReactElement;
export declare function TableCaption(props: React.HTMLAttributes<HTMLTableCaptionElement>): React.ReactElement;
export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  /** A stable id: a row whose place changes (re-sorting, reordering) is carried there instead of jumping. */
  rowId?: string;
  /** Tinted accent-soft and raised one level. Pair it with a checked Checkbox in the row. */
  selected?: boolean;
  /** Lifts on hover. Only when clicking the row does something; put a button or link in it for the keyboard. */
  interactive?: boolean;
  /** Filter in place: match rises one level, miss sinks into a well. */
  relevance?: 'match' | 'miss';
  /** Afterglow: when this value changes the row lifts, tints and settles back over dur-settle. true settles once on mount. */
  settle?: unknown;
  /** In someone's hand while it's being moved: level 3, tilted. */
  held?: boolean;
}
export declare const TableRow: React.ForwardRefExoticComponent<TableRowProps & React.RefAttributes<HTMLTableRowElement>>;
export interface TableHeadProps extends Omit<React.ThHTMLAttributes<HTMLTableCellElement>, 'align'> {
  align?: 'start' | 'end';
  /** This column's sort. With onSort the header becomes a sort button and the th carries aria-sort. */
  sort?: 'ascending' | 'descending' | 'none';
  onSort?: () => void;
}
export declare function TableHead(props: TableHeadProps): React.ReactElement;
export interface TableCellProps extends Omit<React.TdHTMLAttributes<HTMLTableCellElement>, 'align'> { align?: 'start' | 'end' }
export declare function TableCell(props: TableCellProps): React.ReactElement;
export interface DataTableColumn<T> {
  key: string;
  header: React.ReactNode;
  /** Cell content. Default: the row's value at `key`. */
  cell?: (row: T) => React.ReactNode;
  /** Makes the column sortable by this value (numbers, or strings compared naturally). */
  sortValue?: (row: T) => string | number;
  align?: 'start' | 'end';
  width?: number | string;
  /** The narrowest the column gets; on a phone the table scrolls rather than squeezing it. Default: 6rem when narrow. */
  minWidth?: number | string;
  /** Keep this column in view while the table scrolls sideways, over a flush 1px edge. */
  sticky?: boolean;
}
export type TableSort = { key: string; direction: 'ascending' | 'descending' } | null;
export interface FilterOption { value: string; label: string }
export interface FilterField {
  key: string;
  label: string;
  /** enum: choose from options. text: a phrase. number. date: an ISO 'YYYY-MM-DD' date ('between' takes two). */
  type: 'enum' | 'text' | 'number' | 'date';
  options?: FilterOption[];
  /** Enum lists get a search field. Default: when there are more than 8 options. */
  searchable?: boolean;
  /** Default by type: enum ['is', 'is not'], text ['contains', 'does not contain'], number ['=', '>', '<'], date ['before', 'after', 'between']. */
  operators?: string[];
}
export type FilterValue = string | number | { start: string; end: string } | undefined;
export interface Filter { id: string; field: string; operator: string; value: FilterValue }
/** Nested logic: conditions and, with nesting={2}, groups of conditions, each with its own all/any. */
export interface FilterTree { match: 'all' | 'any'; items: (Filter | FilterGroup)[] }
export interface FilterGroup { id: string; match: 'all' | 'any'; items: Filter[] }
/** The whole expression in words: "Plan is Pro and any of: Country is Germany, Seats > 50". */
export declare function filterSentence(fields: FilterField[], value: Filter[] | FilterTree, match?: 'all' | 'any'): string;
export interface FilterBarProps {
  fields: FilterField[];
  /** The conditions; or a FilterTree for nested logic. */
  value: Filter[] | FilterTree;
  onValueChange: ((filters: Filter[]) => void) | ((tree: FilterTree) => void);
  /** With a FilterTree: 2 allows groups one level deep. Default 1 (no groups). */
  nesting?: 1 | 2;
  /** Show the all/any segment even with one condition. */
  matchAlways?: boolean;
  /** Shown as a segment when there's more than one filter. Omit to hide it. */
  match?: 'all' | 'any';
  onMatchChange?: (match: 'all' | 'any') => void;
  /** Announced after each change: “Status is Done. 12 results”. */
  resultCount?: number;
  /** Ids for new filters. Default: a counter. */
  createId?: () => string;
  'aria-label'?: string;
  className?: string;
}
/** A query as a row of conditions, each part edited in its own picker. Pair it with DataTable's relevance to filter in place. */
export declare function FilterBar(props: FilterBarProps): React.ReactElement;
/** A filter's value as words (“Oct 1, 2026”, “In review”), or undefined while it has none. */
export declare function filterValueText(field: FilterField, value: FilterValue): string | undefined;

export type DataGridResult = { ok: true } | { ok: false; error: string };
export interface DataGridChange<T> { rowId: string; key: string; draft: unknown; previousValue: unknown; row: T }
/** What a column's custom editor receives. Spread it onto a Select or Combobox. */
export interface DataGridEditorControl {
  value: any;
  onValueChange: (value: any) => void;
  id: string;
  'aria-label': string;
  invalid: boolean;
  autoFocus: true;
}
export interface DataGridColumn<T> {
  key: string;
  header: React.ReactNode;
  /** The header as words, for cell names. Default: the header when it's a string, else the key. */
  label?: string;
  align?: 'start' | 'end';
  editable?: boolean;
  /** Text typed into the cell → the value. Default: the text. */
  parse?: (text: string) => unknown;
  /** The value → text in the editing field and in copies. Default: String(value ?? ''). */
  format?: (value: unknown) => string;
  /** Return an error to refuse a value. */
  validate?: (value: any, row: T) => string | undefined;
  /** Draw the cell at rest. Default: format(value). */
  cell?: (row: T) => React.ReactNode;
  /** A custom editor (a Select): it commits as soon as a value is chosen. */
  editor?: (control: DataGridEditorControl) => React.ReactNode;
  width?: number | string;
  /** The narrowest the column gets; on a phone the table scrolls rather than squeezing it. Default: 6rem when narrow. */
  minWidth?: number | string;
  /** Keep this column in view while the table scrolls sideways, over a flush 1px edge. */
  sticky?: boolean;
}
export interface DataGridProps<T> {
  'aria-label'?: string;
  'aria-labelledby'?: string;
  rows: T[];
  columns: DataGridColumn<T>[];
  getRowId: (row: T) => string;
  /** Names a row in each cell's name (“Price, Desk lamp”). */
  getRowLabel: (row: T) => string;
  /** One cell. Resolve after `rows` carries the canonical value. */
  onCellSave: (change: DataGridChange<T>) => DataGridResult | Promise<DataGridResult>;
  /** A paste or a cleared range, as one batch. Default: each cell through onCellSave. */
  onCellsSave?: (changes: DataGridChange<T>[]) => DataGridResult | Promise<DataGridResult>;
  /** Ctrl/Cmd+Z: reverse the last committed change (or batch). Omit and Ctrl+Z does nothing. */
  onUndo?: (last: DataGridChange<T>[]) => void;
  /** Check every cell against its column's `validate` at rest, not only while it's edited: an invalid value lies in a trench on critical-soft, with its problem in the cell's description. For data that arrived from elsewhere (an import). */
  showInvalid?: boolean;
  maxHeight?: number | string;
  className?: string;
}
/** A table edited cell by cell with spreadsheet keys (role="grid"). Use DataTable when cells aren't edited one by one. */
export declare function DataGrid<T>(props: DataGridProps<T>): React.ReactElement;

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  /** The rows. Undefined while your data loads, or a promise: until they arrive the table is its header over skeleton.lines imprinted rows (default 5). */
  rows: Promised<T[]> | undefined;
  /** While the rows are on their way: how many rows to imprint (lines). false: undefined rows render as empty, and a promise suspends to your own boundary. */
  skeleton?: SkeletonOption;
  getRowId: (row: T) => string;
  /** A row's name for screen readers (its checkbox, its move handle, announcements). Default: its id. */
  getRowLabel?: (row: T) => string;
  /** A checkbox column; selected rows rise and the toolbar counts them with a count Badge. */
  selectable?: boolean;
  selected?: string[];
  defaultSelected?: string[];
  onSelectedChange?: (ids: string[]) => void;
  /** Actions for the selected rows, beside their count. The second argument is the whole selection, which may be "all matching". */
  actions?: (ids: string[], selection: TableSelection) => React.ReactNode;
  /** The selection, when it can reach past the loaded rows. */
  selection?: TableSelection;
  onSelectionChange?: (selection: TableSelection) => void;
  /** How many records match the current filter, across every page. Offers "Select all N matching" once a page is selected. */
  matchingTotal?: number;
  /** Where the count and actions sit: the toolbar, a bar floating at the bottom edge (level 3), or 'auto'. Default 'toolbar'. */
  actionsPlacement?: 'toolbar' | 'floating' | 'auto';
  /** What the rows are, plural ("users"). Default "rows". */
  noun?: string;
  /** Anything else for the toolbar's end: a filter field, a button. */
  toolbar?: React.ReactNode;
  /** Header clicks cycle ascending, descending, none. */
  sort?: TableSort;
  defaultSort?: TableSort;
  onSortChange?: (sort: TableSort) => void;
  /** Interactive rows: the first column becomes the row's button and clicking anywhere on the row calls this. */
  onRowClick?: (row: T) => void;
  /** Filter in place: return 'match' or 'miss' per row, or undefined when no filter is active. */
  relevance?: (row: T) => 'match' | 'miss' | undefined;
  /** Adds move handles (pointer, or Space and the arrow keys); hidden while sorted. */
  onReorder?: (rows: T[]) => void;
  maxHeight?: number | string;
  /** Shown when there are no rows. Default "Nothing here yet." */
  empty?: React.ReactNode;
  className?: string;
  'aria-label'?: string;
  /** Read-only detail: a disclosure button in the first column opens a full-width region under the row, on the ground. */
  renderExpanded?: (row: T) => React.ReactNode;
  /** With onSave, an Edit button opens the row's region as an EditRegion holding these fields; row and region rise together, and sorting and reordering wait. */
  renderEditor?: (field: EditRegionBinder<T & Record<string, unknown>>, row: T) => React.ReactNode;
  onSave?: (draft: T, context: { previousValue: T; changed: (keyof T)[] }) => EditRegionSaveResult<T & Record<string, unknown>> | Promise<EditRegionSaveResult<T & Record<string, unknown>>>;
  /** Publishes a saved row's canonical record (a synchronous setter). */
  onRowChange?: (canonical: T) => void;
  /** Rows whose detail is open, by id. */
  expanded?: string[];
  defaultExpanded?: string[];
  onExpandedChange?: (ids: string[]) => void;
  /** 'single' (default): opening one closes the others. */
  expandMode?: 'single' | 'multiple';
  /** Which columns show, by key: false hides one. The first column in order always shows. */
  columnVisibility?: Record<string, boolean>;
  defaultColumnVisibility?: Record<string, boolean>;
  onColumnVisibilityChange?: (visibility: Record<string, boolean>) => void;
  /** The columns' order, by key. */
  columnOrder?: string[];
  defaultColumnOrder?: string[];
  onColumnOrderChange?: (order: string[]) => void;
  /** Row density. 'compact' keeps every target at least 24px tall. Default 'comfortable'. */
  density?: 'comfortable' | 'compact';
  defaultDensity?: 'comfortable' | 'compact';
  onDensityChange?: (density: 'comfortable' | 'compact') => void;
  /** A "Columns" button in the toolbar: show, hide and reorder columns, and choose the density. */
  columnsMenu?: boolean;
  /** Rows paged by your server: Pagination in the footer, or "Load more". */
  pagination?: DataTablePaging;
}
/** Rows chosen by id, or every record matching the query except some. */
export type TableSelection = { kind: 'ids'; ids: string[] } | { kind: 'query'; total: number; except: string[] };
export type DataTablePaging =
  | { mode?: 'pages'; page: number; pageCount?: number; pageSize?: number; total?: number; onPageChange: (page: number) => void; hrefFor?: (page: number) => string; hasNext?: boolean;
      /** The next page is loading: the rows stay at half strength and the page thumb is held pressed. */ loading?: boolean; noun?: string }
  | { mode: 'more'; hasMore: boolean; onLoadMore: () => void; total?: number; loading?: boolean; noun?: string };
/** A Table from data: sorting that carries rows, selection with a counted toolbar, filtering in place, interactive rows and reordering. */
export declare function DataTable<T>(props: DataTableProps<T>): React.ReactElement;

export interface BoardPlace { column: string; index: number }
export interface BoardMove { cardId: string; from: BoardPlace; to: BoardPlace }
export interface BoardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** A card was dropped somewhere new (pointer) or moved a step (keyboard). Update your data; the board carries the cards there. */
  onMove: (move: BoardMove) => void;
  /** Default "Board". */
  'aria-label'?: string;
}
/**
 * Columns of cards (kanban). Columns are flush at rest and open into wells while a card is carried, the one under it
 * deepening; a carried card floats at level 3 and lands with a settle. Pointer, or Space and the arrow keys.
 */
export declare const Board: React.ForwardRefExoticComponent<BoardProps & React.RefAttributes<HTMLDivElement>>;
export interface BoardColumnProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  id: string;
  /** A string also names the column for screen readers and announcements. */
  title: React.ReactNode;
  /** A collapsed column is a Pile showing its count; it still takes drops. */
  collapsed?: boolean;
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Show the collapse button in its header. */
  collapsible?: boolean;
  /** Adds an add slot at the column's foot: Enter adds a card and opens the next. Resolve after the card is among the children. */
  onCreate?: (title: string) => BoardCreateResult | Promise<BoardCreateResult>;
  /** Default “Add a card”. */
  addLabel?: string;
}
export type BoardCreateResult = { ok: true; value: { id: string } } | { ok: false; error: string };
export type BoardRenameResult = { ok: true; value: string } | { ok: false; error: string };
export declare function BoardColumn(props: BoardColumnProps): React.ReactElement;

/** A local date-time, 'YYYY-MM-DDTHH:mm': no time zone. Convert at your edges. */
export type LocalDateTime = string;
export type ScheduleResult = { ok: true } | { ok: false; error: string };
export type ScheduleCreateResult<T> = { ok: true; value: T } | { ok: false; error: string };
export interface ScheduleSpan { start: LocalDateTime; end: LocalDateTime }
export interface ScheduleProps<T> {
  /** Default 'week'. */
  view?: 'day' | 'week' | 'workweek';
  /** Under 480px of its own width: 'day' (default) shows one day at a time; false keeps the view. */
  narrowView?: 'day' | false;
  /** Any day in the period shown, 'YYYY-MM-DD'. */
  date: string;
  onDateChange?: (date: string) => void;
  events: T[];
  getKey: (event: T) => string;
  getStart: (event: T) => LocalDateTime;
  getEnd: (event: T) => LocalDateTime;
  getLabel: (event: T) => string;
  /** Minutes per slot, and the snap for moves and resizes. Default 15. */
  step?: number;
  /** Default '08:00' and '19:00'. */
  dayStart?: string;
  dayEnd?: string;
  /** Pixels per hour. Default 48, or 96 under a coarse pointer so a 15-minute slot is 24px tall. */
  hourHeight?: number;
  /** 0 Sunday … 6 Saturday. Default 1. */
  weekStartsOn?: number;
  /** A new event's length when made with Enter on an empty slot. Default 60 minutes. */
  defaultDuration?: number;
  renderEvent?: (event: T) => React.ReactNode;
  /** Resolve after `events` includes the new event. */
  onCreate?: (request: ScheduleSpan & { title: string }) => ScheduleCreateResult<T> | Promise<ScheduleCreateResult<T>>;
  /** A move or a resize. Resolve after `events` reflects it. */
  onChange?: (next: ScheduleSpan & { id: string }, previous: T) => ScheduleResult | Promise<ScheduleResult>;
  onRename?: (event: T, title: string) => ScheduleResult | Promise<ScheduleResult>;
  /** Enter on an event: show its details (in a Sheet, not a Dialog). */
  onOpen?: (event: T) => void;
  /** Delete. Your removal policy applies. */
  onRemove?: (event: T) => void;
  /** Someone else is moving this event: it can't be picked up. */
  heldBy?: (event: T) => { name: string; presence?: 1 | 2 | 3 } | null | undefined;
  /** Refuse a span (outside hours, a closed room). */
  isUnavailable?: (span: ScheduleSpan) => boolean;
  /** The now line's time. Default: the clock. */
  now?: LocalDateTime;
  locale?: string;
  'aria-label'?: string;
  className?: string;
}
/** A day or week of time whose events you handle directly: draw to create, carry to move, pull the edge to resize, all with keyboard equivalents. */
export declare function Schedule<T>(props: ScheduleProps<T>): React.ReactElement;
export interface BoardCardProps extends React.HTMLAttributes<HTMLDivElement> {
  id: string;
  /** How announcements name the card. Default: its first line of text. */
  label?: string;
  /** A collaborator is holding it: lifted, in their presence colour, wearing their name. It can't be picked up meanwhile. */
  heldBy?: { name: string; presence?: 1 | 2 | 3 };
  /** Afterglow: when this value changes the card arrives tinted and lifted, then settles. */
  settle?: unknown;
  /** Rename in place (F2, or the visible Rename button), with InlineEdit's contract. Pair with `label`. */
  onRename?: (draft: string) => BoardRenameResult | Promise<BoardRenameResult>;
  /** The card's record, for a fuller editor (EditRegion) in its place, opened by its Edit button. */
  value?: Record<string, unknown>;
  renderEditor?: (field: EditRegionBinder<Record<string, unknown>>) => React.ReactNode;
  onSave?: (draft: Record<string, unknown>, context: { previousValue: Record<string, unknown>; changed: string[] }) => EditRegionSaveResult<Record<string, unknown>> | Promise<EditRegionSaveResult<Record<string, unknown>>>;
  /** Publishes the saved record (a synchronous setter). */
  onValueChange?: (canonical: Record<string, unknown>) => void;
}
export declare const BoardCard: React.ForwardRefExoticComponent<BoardCardProps & React.RefAttributes<HTMLDivElement>>;

export interface PileProps<T = unknown> extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  /** Items in the pile; defaults to items.length. 1 → no sheets, 2–3 → one, 4–9 → two, 10+ → three. The exact number shows in a badge. */
  count?: number;
  /** Hover and focus lift the top and fan the sheets. Implied when items is set. */
  interactive?: boolean;
  /** With renderItem, clicking the top card fans these out from under it, floating over the page below. */
  items?: T[];
  renderItem?: (item: T, state: { index: number }) => React.ReactNode;
  getKey?: (item: T, index: number) => string;
  /** Called when a fanned-out item is clicked. */
  onSelect?: (item: T, index: number) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Tallest the fanned-out list grows before it scrolls. Default 360. */
  maxHeight?: number | string;
}
export declare function Pile<T>(props: PileProps<T>): React.ReactElement;

export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Sits flush, and rises once content scrolls beneath it. */
  header?: React.ReactNode;
  /** Default 280. */
  maxHeight?: number | string;
  'aria-label'?: string;
}
export declare function ScrollArea(props: ScrollAreaProps): React.ReactElement;

export interface UploadItem {
  id: string;
  name: string;
  /** Bytes. */
  size?: number;
  state: 'uploading' | 'processing' | 'done' | 'failed';
  /** 0–100, while uploading. */
  progress?: number;
  /** Why it failed, in words. */
  error?: string;
}
export interface DropZoneProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onDrop'> {
  onFiles?: (files: File[]) => void;
  accept?: string;
  /** Default true. */
  multiple?: boolean;
  /** Force a visual state (documentation): idle, armed or over. */
  state?: 'idle' | 'armed' | 'over';
  /** The files you're handling, as slats under the zone: uploading (a Progress fill), processing (hovering, pending), done (lands and settles) or failed (a trench with Retry). */
  queue?: UploadItem[];
  onRetry?: (id: string) => void;
  onCancel?: (id: string) => void;
  onRemove?: (id: string) => void;
}
export declare function DropZone(props: DropZoneProps): React.ReactElement;

export interface SortableListProps<T> {
  items: T[];
  getKey: (item: T) => string;
  /** Receives the reordered array. */
  onReorder: (items: T[]) => void;
  /** Row content; the row surface and grip are drawn for you. */
  renderItem: (item: T, state: { held: boolean }) => React.ReactNode;
  /** Accessible name per item, for announcements. */
  getLabel?: (item: T) => string;
  /** Pixels between rows. Default 8. */
  gap?: number;
  className?: string;
  'aria-label'?: string;
}
export declare function SortableList<T>(props: SortableListProps<T>): React.ReactElement;

export interface ChecklistPlace { parentId: string | null; index: number }
/** One change per action. Apply it to `items` (synchronously, or before resolving). */
export type ChecklistOp =
  | { type: 'add'; id: string; text: string; done: boolean; parentId: string | null; index: number }
  | { type: 'edit'; id: string; text: string; previous: string }
  | { type: 'toggle'; id: string; done: boolean }
  | { type: 'remove'; id: string; text: string; done: boolean; parentId: string | null; index: number }
  | { type: 'move' | 'indent' | 'outdent'; id: string; parentId: string | null; index: number; from: ChecklistPlace };
export type ChecklistResult = { ok: true } | { ok: false; error: string };
export interface ChecklistProps<T> {
  'aria-label'?: string;
  'aria-labelledby'?: string;
  items: T[];
  getKey: (item: T) => string;
  getText: (item: T) => string;
  isDone: (item: T) => boolean;
  getChildren?: (item: T) => T[] | undefined;
  /** Allow Tab and Shift+Tab to nest items. Default false: a flat list. */
  nested?: boolean;
  /** Show done items after the rest in each list. Default false. */
  sortDone?: boolean;
  /** Each action, as one op. Return a failure to mark the item and offer Retry. */
  onChange: (op: ChecklistOp) => ChecklistResult | void | Promise<ChecklistResult | void>;
  /** Ctrl/Cmd+Z: reverse the last structural op (add, remove, move, indent, outdent). A removal's announcement names the shortcut. */
  onUndo?: (op: ChecklistOp) => void;
  /** Ids for new items. Default: a random id. */
  createId?: () => string;
  /** The last, empty line's placeholder. Default “Add an item”. */
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}
/** A list you write into, one line per item. Each line is its own editor and commits when you leave it. */
export declare function Checklist<T>(props: ChecklistProps<T>): React.ReactElement;

export interface StepperStep {
  /** Stable key. Default: its position. */
  id?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
}
export interface StepperProps extends Omit<React.OlHTMLAttributes<HTMLOListElement>, 'onChange'> {
  steps: StepperStep[];
  /** Index of the step being worked on; steps.length means all are complete. */
  current: number;
  /** Makes completed steps buttons that go back to them. */
  onStepChange?: (index: number) => void;
  /** Default 'horizontal'. */
  orientation?: 'horizontal' | 'vertical' | 'auto';
  /** Default "Progress". */
  'aria-label'?: string;
}
/**
 * A process as plates on one ground line: done steps are flush with a stamped check, the current step is a raised slab with a
 * wall, steps to come are imprints. Advancing presses the current step into the record, then raises the next out of its imprint.
 */
export declare function Stepper(props: StepperProps): React.ReactElement;

/** A place in a Drilldown. Without content, a node with children lists them; with both, the content shows and opens its children itself (a chart's `drill`). */
export interface DrillNode { id: string; title: React.ReactNode; description?: React.ReactNode; content?: React.ReactNode; children?: DrillNode[] }
export interface DrilldownProps extends React.HTMLAttributes<HTMLDivElement> { root: DrillNode }
/** Descend into children, ascend back; the breadcrumb steps down a notch per level. */
export declare function Drilldown(props: DrilldownProps): React.ReactElement;
/** Inside a Drilldown's content: open one of the current node's children by id. Null outside a Drilldown. */
export declare function useDrilldown(): { open: (id: string) => boolean } | null;

export type TreeResult = { ok: true } | { ok: false; error: string };
export type TreeCreateResult<T> = { ok: true; value: T } | { ok: false; error: string };
/** Where a node goes: under `parentId` (null for the top level), at `index` among the children once it has left its old place. */
export interface TreeTarget { parentId: string | null; index: number }
export interface TreeMove { id: string; from: TreeTarget; to: TreeTarget }
export interface TreeHandle {
  /** Open a naming well for a new node under `parentId` (null: the top level) at `index` (default: the end). */
  startCreate: (parentId: string | null, index?: number) => void;
  /** Rename a node, as F2 does. */
  startRename: (id: string) => void;
}
export interface TreeProps<T> {
  'aria-label'?: string;
  'aria-labelledby'?: string;
  items: T[];
  getKey: (item: T) => string;
  getLabel: (item: T) => string;
  /** Children, or undefined when there are none or they aren't loaded yet. */
  getChildren?: (item: T) => T[] | undefined;
  /** Whether a node can have children (and so shows a chevron) before they're loaded. Default: it has children. */
  hasChildren?: (item: T) => boolean;
  /** Called the first time a node with no loaded children is expanded; an imprint shows until `items` includes them. */
  loadChildren?: (item: T) => void | Promise<void>;
  expanded?: string[];
  defaultExpanded?: string[];
  onExpandedChange?: (expanded: string[]) => void;
  /** Default 'single'. */
  selectionMode?: 'single' | 'none';
  selected?: string | null;
  defaultSelected?: string | null;
  onSelectedChange?: (id: string | null) => void;
  /** Enter's default action (open the page). */
  onAction?: (item: T) => void;
  /** Draw a node's label. Default: getLabel. */
  renderItem?: (item: T) => React.ReactNode;
  /** F2. Resolve after `items` carries the new name. */
  onRename?: (item: T, draft: string) => TreeResult | Promise<TreeResult>;
  /** Space to carry, or drag. Resolve after `items` reflects the move. */
  onMove?: (move: TreeMove) => TreeResult | Promise<TreeResult>;
  /** Refuse a target. A node can never go into its own subtree, whatever this says. */
  canDrop?: (move: TreeMove) => boolean;
  /** Ctrl/Cmd+Enter (sibling after) and Ctrl/Cmd+Shift+Enter (child). Resolve after `items` includes the new node. */
  onCreate?: (request: TreeTarget & { name: string }) => TreeCreateResult<T> | Promise<TreeCreateResult<T>>;
  /** Delete. Your removal policy (recovery or confirmation) applies; the tree only asks. */
  onRemove?: (item: T) => void;
  className?: string;
}
/** A hierarchy seen all at once and changed in place: rename (F2), create, carry (Space or drag) and remove. */
export declare function Tree<T>(props: TreeProps<T> & { ref?: React.Ref<TreeHandle> }): React.ReactElement;

export interface EmptyStateProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  /** A line icon, drawn in ink-muted: 24px, or 18px at size sm. */
  icon?: React.ReactNode;
  /** What is empty, as a statement ("No gift ideas yet"). It names the region (aria-labelledby). */
  title: React.ReactNode;
  /** Why it's empty, or what will appear here. Linked with aria-describedby. */
  description?: React.ReactNode;
  /** The one obvious next step: usually a primary Button with a verb-first label. */
  action?: React.ReactNode;
  /** A quieter alternative beside it: usually a ghost Button or a link. */
  secondary?: React.ReactNode;
  /** md fills a page or a panel; sm fits a widget or a list. Default 'md'. */
  size?: 'sm' | 'md';
  /** The title's heading level. Default 3. */
  headingLevel?: 2 | 3 | 4;
  /** Announce it politely when it appears, for an empty that follows a change (a filter, a search). true says the title, if it's text; a string says that. */
  announce?: boolean | string;
}
/** An opening the first record will fill: a sunk well with a dashed rim, a title naming what's empty, and one next action. */
export declare function EmptyState(props: EmptyStateProps): React.ReactElement;

/** Derive accent, on-accent, accent-ink and accent-soft for a brand colour against a scheme's surfaces (first = ground). */
export declare function deriveAccent(accent: string, surfaces: string[]): React.CSSProperties;
/** WCAG contrast ratio of two hex colours. */
export declare function contrast(a: string, b: string): number;
/**
 * Check a scheme's colours against the invariants every scheme keeps (the surface ladder climbs; text, control edges and
 * presence colours hold contrast on every surface). Pass the colour tokens by name, or an element to read them from.
 * Returns one sentence per problem; [] passes. `include` defaults to `['core']`; add `'data'` for the data palette's
 * gates (separation for colour-blind readers, 3:1 marks, distance from the accent, status and presence, monotone ramps).
 */
export declare function checkScheme(colors: Partial<Record<SchemeColorToken, string>> | Element, options?: { include?: SchemeCheck[] }): string[];
/** Which invariants checkScheme measures: `core` is the surface ladder and contrast, `data` the data palette. */
export type SchemeCheck = 'core' | 'data';

/** A categorical slot of the data palette. */
export type ChartSlot = `data-${1 | 2 | 3 | 4 | 5 | 6}` | 'data-other';
export interface ChartSeriesConfig {
  /** The series' name, in the legend, the readout, the summary and the table. */
  label: string;
  /** Formats a value of this series: ticks, readouts, the summary. Default: Intl.NumberFormat. */
  format?: (value: number) => string;
  /** The series' colour slot. Default: its place in the config (the first is data-1); a seventh and later are data-other. */
  color?: ChartSlot;
}
/** Each data key a chart draws, mapped to its label, format and colour slot. The order is the colour order, fixed for the chart's life. */
export type ChartConfig = Record<string, ChartSeriesConfig>;
export type ChartDatum = Record<string, unknown>;
/** Data that isn't yet the record: a period still being counted ('partial') or a forecast ('projected'). Hatched or dashed, never raised. */
export type ChartStatus = 'partial' | 'projected';
/** The words each status says: "So far" and "Projected". */
export declare const CHART_STATUS_WORDS: Record<ChartStatus, string>;
export interface ChartSeries {
  key: string;
  label: string;
  slot: ChartSlot;
  /** `var(--data-n)`: use it as a fill or stroke. The figure also sets `--color-<key>` to it. */
  color: string;
  format: (value: number) => string;
}
export interface LinearScale { (value: number): number; kind: 'linear'; domain: [number, number]; range: [number, number]; ticks: number[]; }
export interface TimeScale { (value: string | number): number; kind: 'time'; domain: [number, number]; range: [number, number]; ticks: number[]; }
export interface BandScale { (value: string): number; kind: 'band'; domain: string[]; range: [number, number]; ticks: string[]; bandwidth: number; step: number; }
export type ChartXScale = LinearScale | TimeScale | BandScale;
/** Where a change is, as the plot's data-stage: the axis rescaling, the marks gliding to their values, or a cross-fade. */
export type ChartStage = 'rescale' | 'values' | 'fade';
export interface ChartContextValue {
  /** The plot's size in px, inside the axes. Marks draw from (0, 0) at its top left. */
  width: number;
  height: number;
  x: ChartXScale;
  y: LinearScale;
  /** Where a datum sits on x: a band's centre, or its time or value. */
  xOf: (d: ChartDatum) => number;
  /** The y of the ground line: y(0) when zero is in the domain, otherwise the plot's foot. */
  ground: number;
  /** The records as they're shown right now: while the data changes, values glide and leaving records linger. */
  data: ChartDatum[];
  xKey: string;
  config: ChartConfig;
  series: ChartSeries[];
  /** How present a mark is, 0–1, while records or series enter and leave: multiply it into the mark's opacity. */
  alpha: (d?: ChartDatum | null, seriesKey?: string) => number;
  /** Formats a value of a series (by its key), or an x value. */
  format: (key: string, value: number) => string;
  formatX: (value: unknown) => string;
  /** Categories run down the side and values along the bottom: x(cat) is a distance from the top, y(v) from the left. */
  horizontal: boolean;
  /** The series the keyboard is on, or null: chart types draw the others receded. */
  emphasis: string | null;
  /** The record the readout is on (pointed at, touched, or focused from the keyboard), or null. */
  active: ChartDatum | null;
  /** Put the readout on a record by its index in `data`, or take it away with null: for keyboard paths. */
  setActive: (index: number | null) => void;
  /** How to draw a series so it's told apart without colour: fill (a hatch while patterns are on), stroke, dash, marker, edge. */
  encode: (seriesKey: string, d?: ChartDatum) => ChartEncoding;
  /** Patterns are on: the `patterns` prop, forced colours or print. */
  patterns: boolean;
  /** Label series directly at their marks: on under forced colours and in print. */
  directLabels: boolean;
  /** Line width (2, or 3 under contrast="more"), and the gap between adjacent marks (2, or 3). */
  strokeWidth: number;
  gap: number;
  /** Whether a record is the record yet: undefined, 'partial' or 'projected'. */
  status: (d: ChartDatum) => ChartStatus | undefined;
  /** The chart was given a status: draw not-yet-record parts with encode(key).pending. */
  hasStatus: boolean;
  /** The stretches of x that aren't yet the record, and those that are, in plot px: for clipping a line or an area. */
  statusRanges: { record: Array<[number, number]>; pending: Array<[number, number]> };
  /** Filtered in place: 'match', 'miss' or undefined. */
  relevance: (d: ChartDatum) => 'match' | 'miss' | undefined;
  /** The chart was given a relevance: wrap marks in ChartRelevance so changes cross-fade. */
  hasRelevance: boolean;
  /** For lines and areas: each record's stretch of x (to the midpoints with its neighbours), and whether it misses. */
  relevanceRegions: Array<{ key: string; x0: number; x1: number; miss: boolean }>;
  /** Changed since a snapshot: a mark's old value where it changed (null if it didn't, or is new), or null without `since`. */
  sinceOld: ((d: ChartDatum, seriesKey: string) => number | null) | null;
}
export type ChartMarkerShape = 'circle' | 'square' | 'triangle' | 'diamond' | 'ring' | 'cross';
export interface ChartEncoding {
  slot: ChartSlot;
  /** Outside the chart's focus: drawn in data-context (GrayText under forced colours), its label in ink-muted. */
  context: boolean;
  /** For bars and areas: the series colour, a hatch of it, or CanvasText under forced colours. */
  fill: string;
  /** For lines and outlines. */
  stroke: string;
  /** For a line: undefined is solid. Set only while patterns are on; slot 1 is always solid. */
  dash?: string;
  marker: ChartMarkerShape;
  /** A 1px edge for a filled mark: ink under contrast="more", CanvasText under forced colours, otherwise none. */
  edge?: string;
  /** For a mark that isn't yet the record: a 45° hatch of the series colour on the plot's own; while patterns are on, the slot's own hatch. */
  pending: string;
  /** The fill-opacity to draw `pending` at: 1, or 0.45 for a slot's own hatch while patterns are on. */
  pendingOpacity: number;
  /** The dash a not-yet-record line takes: 5 4, or the slot's own dash while patterns are on. */
  pendingDash: string;
}
/** A group that recedes to 35% when what it draws misses the filter, cross-fading over dur-travel-1. */
export declare function ChartRelevance(props: { miss: boolean; children?: React.ReactNode } & React.SVGProps<SVGGElement>): React.ReactElement;
/** A clip to stretches of x from statusRanges, to draw a line's or an area's record and not-yet-record parts apart. */
export declare function ChartStatusClip(props: { id: string; ranges: Array<[number, number]>; height: number }): React.ReactElement;
/** A series' marker centred on (x, y): the shape its slot gives it. */
export declare function ChartMarker(props: { shape: ChartMarkerShape; x: number; y: number; size?: number; color: string } & React.SVGProps<SVGElement>): React.ReactElement;
export interface ChartContainerProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  config: ChartConfig;
  /** The records. undefined or a promise: the chart's imprint until they land. null or []: an EmptyState. A rejection goes to your error boundary. */
  data?: ChartDatum[] | null | PromiseLike<ChartDatum[] | null>;
  /** The key of x in each record. Optional when the chart inside takes `x`. */
  x?: string;
  /** How x is placed. Default: time for ISO dates, epoch numbers or Dates; linear for other numbers; band otherwise. */
  xScale?: 'band' | 'time' | 'linear';
  /**
   * Width ÷ height of the plot. Default 2, unless `height` is set. 'banked': a line chart's segments set it, banked to
   * an average of 45° so slopes read accurately, between 1 and 4 for the data area.
   */
  aspect?: number | 'banked';
  /** The plot's height in px, instead of an aspect ratio. */
  height?: number;
  /** A visible name, inside the figure. Leave it out when a CardTitle names the chart, and pass `aria-labelledby`. */
  title?: React.ReactNode;
  /**
   * The one thing the chart says, as its heading: "Cedar shipped twice as often as Delta in March". The title then sits
   * above it as a small label; screen readers hear the title, then this, then the summary. Write it from the data
   * shown; it's never generated.
   */
  takeaway?: React.ReactNode;
  description?: React.ReactNode;
  /** What the chart shows, in a sentence or two. Shown under the plot. Without it a summary is generated for screen readers. */
  summary?: React.ReactNode;
  /** Force zero onto y. Default true: bars always stand on the ground line. */
  zero?: boolean;
  /** A fixed y domain, instead of the series' extent made nice. */
  yDomain?: [number, number];
  /** Formats y ticks. Default: the first series' format. */
  yFormat?: (value: number) => string;
  /** Formats x ticks and x values. Default: by the scale. */
  xFormat?: (value: unknown) => string;
  /** The gap between bands, as a fraction of a band's step. Default 0.2. */
  bandPadding?: number;
  /** Turns the axes off, for a chart that labels its marks directly. Gridlines and the ground line stay. */
  axes?: boolean;
  /**
   * Where the value axis's labels go. 'gutter' (default): a column at the plot's left. 'inline': each label just above
   * its gridline at the plot's left, on a halo, so the plot runs the full width; the top label carries the unit, a label
   * that would cover a mark is left out, and the ground line goes unlabelled. Vertical cartesian charts only.
   */
  yLabels?: 'gutter' | 'inline';
  /** The locale for numbers and dates. Default: the reader's. */
  locale?: string;
  /** Tell series apart by a hatch, dash and marker per slot as well as colour. Always on under forced colours and in print. */
  patterns?: boolean;
  /** The crosshair and readout. Default true; a chart type's tooltip={false} turns it off too. */
  tooltip?: boolean;
  /** Adds a Chart | Table control: the same data as a sortable table in the chart's own box. 'table' starts on the table. */
  views?: boolean | 'chart' | 'table';
  /** The view shown, controlled. */
  view?: 'chart' | 'table';
  onViewChange?: (view: 'chart' | 'table') => void;
  /** The table's first column header. Default: the x key, capitalised. */
  xLabel?: string;
  /** Fresh data is on its way while this data stays shown: after dur-grace the marks drop to half strength ("Updating"). */
  refreshing?: boolean;
  /** What the plot says when the data is null or empty: an EmptyState at widget size. */
  empty?: ChartEmpty;
  /** The data updates on its own: changed marks get an afterglow (a whole refresh glows the "Updated" caption), a window glides, and updates wait while the plot is being read. */
  live?: boolean;
  /** With live: a "Pause updates" switch in the frame (WCAG 2.2.2). */
  pausable?: boolean;
  /**
   * What changed since a snapshot: the records as they were (matched by x or the chart's id) and when, in words
   * ("since Tuesday 09:00"). Changed bars carry a tick at the old value, changed line points a hollow ring; the frame
   * says how many changed in a switch that filters to them; up to four changed marks glow on arrival.
   */
  since?: { data: ChartDatum[]; label: string };
  /** Updates are paused, controlled. */
  paused?: boolean;
  onPausedChange?: (paused: boolean) => void;
  /** With live: what to announce when new data lands, or nothing. Nothing is announced per tick by default. */
  announce?: (data: ChartDatum[], previous: ChartDatum[] | null) => string | null | undefined;
  /** While a chart type's relevance filters, how the frame says how many match. Default "4 of 12 match". */
  countLabel?: (matches: number, total: number) => string;
}
export interface ChartEmpty { title?: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode; }
export interface ChartTooltipItem { key: string; label: string; value: number; /** The value as its series formats it. */ text: string; color: string; dash?: string; /** An uncertainty band's row, keyed by a block of its fill. */ range?: boolean; }
export interface ChartTooltipContentProps {
  /** How each row is keyed: a short stroke of the series colour (default), a dot, or a dashed stroke. */
  indicator?: 'line' | 'dot' | 'dashed';
  /** Formats the readout's heading, the x value. */
  labelFormat?: (x: unknown) => React.ReactNode;
  hideLabel?: boolean;
  hideIndicator?: boolean;
  /** Filled in by the container. */
  label?: unknown;
  payload?: ChartTooltipItem[];
  formatX?: (x: unknown) => string;
  /** "So far" or "Projected", after the heading, when the record under the readout isn't yet the record. */
  note?: string;
  /** What a click does here ("Select to filter", "Select to open"), when marks act. */
  action?: string;
}
/** The readout's rows: value first, series name second, keyed by the series colour. */
export declare function ChartTooltipContent(props: ChartTooltipContentProps): React.ReactElement;
/**
 * The record before, to read each value against: a field on the same record (`key`), or records matched by x position
 * (`data`), named by `label` ("August", "Last week"). `series` is the one compared, by default the first; a stack is
 * compared by its total.
 */
export interface ChartCompare { key?: string; data?: ChartDatum[]; label: string; series?: string }
export interface ChartLegendItem { key: string; label: string; fill: string; stroke: string; dash?: string; hidden: boolean; /** The series' marker shape, for a 'marker' swatch. */ marker?: ChartMarkerShape; /** Outside the chart's focus: its label recedes. */ context?: boolean; /** In the chart's focus: said as "highlighted". */ highlighted?: boolean; }
export interface ChartLegendContentProps {
  /** Let people hide and show series: each key becomes an aria-pressed button in a toolbar. Default false. */
  toggle?: boolean;
  /** The hidden series' keys, controlled. */
  hidden?: string[];
  /** The hidden series' keys to start with, uncontrolled. */
  defaultHidden?: string[];
  onHiddenChange?: (hidden: string[]) => void;
  /** The legend's name. Default "Series". */
  label?: string;
  /** Filled in by the container. */
  items?: ChartLegendItem[];
  swatch?: 'rect' | 'line' | 'marker';
  onToggle?: (key: string) => void;
}
/** The legend's keys: flush labels, or with toggle, switch-like buttons whose trench the series colour pours into. */
export declare function ChartLegendContent(props: ChartLegendContentProps): React.ReactElement;
/** A legend for the chart. Place it inside the chart type or the container. */
export declare function ChartLegend(props: { content?: React.ReactElement<ChartLegendContentProps> }): null;
export interface ChartBrushProps {
  /** The series the overview draws. Default: the chart's first shown series. */
  series?: string;
  /** The overview's name. Default "Overview, <its whole range>". */
  'aria-label'?: string;
  className?: string;
}
/**
 * An overview to pick a time window on, under the plot: put it inside a LineChart, AreaChart or BarChart over time, and
 * give the chart `window` and `onWindowChange` (or neither, and the brush keeps its own). The whole series lies flat in
 * a 40px trench; the window is a raised lens with two grips, "Window start" and "Window end" (sliders whose
 * aria-valuetext is the date). Drag the lens to pan, a grip to resize, or press outside it to centre the window there.
 */
export declare function ChartBrush(props: ChartBrushProps): React.ReactElement | null;
/** Changes what a chart's readout shows; the readout is on for every chart. Place it inside the chart type or the container. */
export declare function ChartTooltip(props: { content?: React.ReactElement<ChartTooltipContentProps> }): null;
export interface ChartReferenceProps {
  /** Where on the value axis: a value (a line), a range [low, high] (a band), or the 'mean' or 'median' of a series. */
  y: number | [number, number] | 'mean' | 'median';
  /** What it is, in words: "Target 99.9%", "Normal range", "Average". A mean or median adds its value. */
  label: string;
  /** A threshold that means good or bad: the line wears caution or critical, and its label the status icon. */
  tone?: 'caution' | 'critical';
  /** The series a mean or median is read from. Default: the first shown. */
  series?: string;
}
/** Something to read the chart against: a 1px solid line labelled at its right end, or a flat line-coloured band. Its values count toward y. */
export declare function ChartReference(props: ChartReferenceProps): null;
export interface ChartAnnotationProps {
  /** Where on x: a date, a number or a category, as the data's x values are written. */
  x: string | number;
  /** The event, in a few words: "v2 launch". */
  label: string;
  /** Makes the plate a button, which lifts one level when pointed at. */
  onSelect?: () => void;
}
/** An event on x: a Badge plate flush at the top of the plot with a 1px leader to its x, listed after the summary. */
export declare function ChartAnnotation(props: ChartAnnotationProps): null;
/** The frame every chart shares: scales, axes, gridlines, the ground line, colour slots, a name and a summary. Flush, no level. */
export declare function ChartContainer(props: ChartContainerProps): React.ReactElement;
export interface BarChartProps {
  /** The records: one per category. undefined or a promise while they load; null or [] when there are none. */
  data: ChartDatum[] | null | undefined | PromiseLike<ChartDatum[] | null>;
  /** What the plot says when there's no data. */
  empty?: ChartEmpty;
  /** The key of each record's category. */
  x: string;
  /** Order the categories by their total. Default: the data's order. */
  sort?: 'asc' | 'desc';
  /** Stack the series into one bar per category; 'expand' stacks them as shares of 100%. Default: side by side. */
  stack?: boolean | 'expand';
  /** 'horizontal' runs categories down the side. Default 'vertical'. */
  layout?: 'vertical' | 'horizontal';
  /** Label the largest bar, or the last category's. Never every bar. Default 'none'. */
  labels?: 'max' | 'last' | 'none';
  /** The crosshair and readout. Default true. */
  tooltip?: boolean;
  /** Which records aren't yet the record: 'partial' (a period still being counted) or 'projected' (a forecast). Hatched or dashed, and said in words. */
  status?: (d: ChartDatum) => ChartStatus | undefined;
  /** The rule where the record ends: its word (default "Today"), or false for none. */
  boundary?: string | false;
  /**
   * Read each value against the record before: `{ key: 'lastMonth', label: 'August' }` or `{ data: lastWeek, label: 'Last week' }`.
   * The earlier value is a 2px ink tick across the bar; a stack is compared by its total.
   */
  compare?: ChartCompare;
  /**
   * Let people pin a reading to the plot: a click (or P on the keyboard path, or a tap while the touch readout is open)
   * sets it down as a plate. true allows two, which compare in words; a number allows that many. Escape removes the last.
   */
  pinnable?: boolean | number;
  /** The pinned readings' x values, controlled; and when they change. */
  pins?: Array<string | number>;
  onPinsChange?: (pins: Array<string | number>) => void;
  /**
   * What the chart is about: series keys that keep their colours while the rest take data-context, or a test for the
   * records that keep theirs. The author's statement of importance, not a reader's filter (that's relevance).
   */
  focus?: string[] | ((d: ChartDatum) => boolean);
  /** Filter in place: which records match. Misses recede to 35%, keeping their place and colour; the frame says how many match. */
  relevance?: (d: ChartDatum) => 'match' | 'miss' | undefined;
  /** With relevance: fit the axis to the matches. Default false: the axis holds. */
  rescale?: boolean;
  /** The selected record's x value, for marks you can select. The others recede; the frame says "Filtered to …". */
  selected?: unknown;
  /** Makes marks selectable: called with the chosen record, or null when the selection clears. */
  onSelect?: (d: ChartDatum | null) => void;
  /** Makes marks open a level down inside a Drilldown: the id of the current node's child this record opens. */
  drill?: (d: ChartDatum) => string | null | undefined;
  /** Bars over time: show only a stretch of the categories, by their dates ({ start, end }) or the last { points }. A ChartBrush sets it. */
  window?: ChartWindow;
  /** Called with the new { start, end } (the records' own x values) when a ChartBrush moves the window. Without `window`, the brush keeps its own. */
  onWindowChange?: (window: { start: string | number; end: string | number }) => void;
  /** A ChartTooltip, to change what the readout shows. */
  children?: React.ReactNode;
}
/** Amounts compared across categories, as flat lengths standing on the ground line. Renders inside a ChartContainer. */
export declare function BarChart(props: BarChartProps): React.ReactElement | null;
export interface LineChartProps {
  /** The records, in x order. undefined or a promise while they load; null or [] when there are none. */
  data: ChartDatum[] | null | undefined | PromiseLike<ChartDatum[] | null>;
  /** What the plot says when there's no data. */
  empty?: ChartEmpty;
  /** The key of each record's x: an ISO date, a timestamp or a number. */
  x: string;
  /** 'linear' joins points with straight lines; 'monotone' curves through them without overshooting. Default 'linear'. */
  curve?: 'linear' | 'monotone';
  /** Formats values (the axis, the readout, the names and the summary) of series that have no format of their own. */
  y?: { format?: (value: number) => string };
  /** Name each line at its end. Default: on for up to four series, and always under forced colours and in print. */
  endLabels?: boolean;
  /** The crosshair and readout. Default true. */
  tooltip?: boolean;
  /** Which records aren't yet the record: 'partial' (a period still being counted) or 'projected' (a forecast). Hatched or dashed, and said in words. */
  status?: (d: ChartDatum) => ChartStatus | undefined;
  /** The rule where the record ends: its word (default "Today"), or false for none. */
  boundary?: string | false;
  /**
   * Read each value against the record before: `{ data: lastWeek, label: 'Last week' }` or `{ key, label }`. The earlier
   * period is a 1.5px solid ink-muted trace under the compared series, named at its end.
   */
  compare?: ChartCompare;
  /**
   * Let people pin a reading to the plot: a click (or P on the keyboard path, or a tap while the touch readout is open)
   * sets it down as a plate. true allows two, which compare in words; a number allows that many. Escape removes the last.
   */
  pinnable?: boolean | number;
  /** The pinned readings' x values, controlled; and when they change. */
  pins?: Array<string | number>;
  onPinsChange?: (pins: Array<string | number>) => void;
  /**
   * What the chart is about: these series keep their colours and the rest are drawn in data-context, their labels in
   * ink-muted. The author's statement of importance, not a reader's filter (that's relevance).
   */
  focus?: string[];
  /** Filter in place: which records match. Misses recede to 35%, keeping their place and colour; the frame says how many match. */
  relevance?: (d: ChartDatum) => 'match' | 'miss' | undefined;
  /** With relevance: fit the axis to the matches. Default false: the axis holds. */
  rescale?: boolean;
  /** The selected record's x value, for marks you can select. The others recede; the frame says "Filtered to …". */
  selected?: unknown;
  /** Makes marks selectable: called with the chosen record, or null when the selection clears. */
  onSelect?: (d: ChartDatum | null) => void;
  /** Makes marks open a level down inside a Drilldown: the id of the current node's child this record opens. */
  drill?: (d: ChartDatum) => string | null | undefined;
  /** Show only a stretch of x: { start, end } (a DateRange fits; a ChartBrush sets it), or the latest { minutes | hours | days } of time, or the last { points }. A latest stretch glides one step in a live container. */
  window?: ChartWindow;
  /** Called with the new { start, end } (the records' own x values) when a ChartBrush moves the window. Without `window`, the brush keeps its own. */
  onWindowChange?: (window: { start: string | number; end: string | number }) => void;
  /** An uncertainty band around a series (default the config's first), from each record's `low` to its `high`: a flat, low-opacity fill. `label` names it in the readout (default "Range"). */
  band?: { low: string; high: string; series?: string; label?: string };
  /** A ChartTooltip, to change what the readout shows. */
  children?: React.ReactNode;
  /**
   * 'banked': the plot takes the proportions that bank the lines' segments to 45° on average, between 1 and 4 for the
   * data area; the width is the card's. Use a fixed aspect in a grid of equal cards.
   */
  aspect?: 'banked';
}
/** Change over time for one to four series: 2px lines named at their ends, gaps left as gaps. Renders inside a ChartContainer. */
export declare function LineChart(props: LineChartProps): React.ReactElement;
export interface AreaChartProps {
  /** The records, in x order. */
  data: ChartDatum[] | null | undefined | PromiseLike<ChartDatum[] | null>;
  /** The key of each record's x: an ISO date, a timestamp or a number. */
  x: string;
  /** Stack the series into bands that add up to the total, bottom to top in config order; 'expand' as shares of 100%. */
  stack?: boolean | 'expand';
  /** 'linear' (default) or 'monotone', which never overshoots. */
  curve?: 'linear' | 'monotone';
  /** Formats values of series that have no format of their own. */
  y?: { format?: (value: number) => string };
  /** Name each band inside itself where it fits. Default: on when stacked. */
  labels?: boolean;
  /** Show only a stretch of x, as LineChart's window. */
  window?: ChartWindow;
  /** Called with the new { start, end } (the records' own x values) when a ChartBrush moves the window. Without `window`, the brush keeps its own. */
  onWindowChange?: (window: { start: string | number; end: string | number }) => void;
  /** The crosshair and readout. Default true. */
  tooltip?: boolean;
  /** Which records aren't yet the record: 'partial' (a period still being counted) or 'projected' (a forecast). Hatched or dashed, and said in words. */
  status?: (d: ChartDatum) => ChartStatus | undefined;
  /** The rule where the record ends: its word (default "Today"), or false for none. */
  boundary?: string | false;
  /**
   * Let people pin a reading to the plot: a click (or P on the keyboard path, or a tap while the touch readout is open)
   * sets it down as a plate. true allows two, which compare in words; a number allows that many. Escape removes the last.
   */
  pinnable?: boolean | number;
  /** The pinned readings' x values, controlled; and when they change. */
  pins?: Array<string | number>;
  onPinsChange?: (pins: Array<string | number>) => void;
  /**
   * What the chart is about: these series keep their colours and the rest are drawn in data-context, their labels in
   * ink-muted. The author's statement of importance, not a reader's filter (that's relevance).
   */
  focus?: string[];
  /** Filter in place: which records match. Misses recede to 35%, keeping their place and colour; the frame says how many match. */
  relevance?: (d: ChartDatum) => 'match' | 'miss' | undefined;
  /** With relevance: fit the axis to the matches. Default false: the axis holds. */
  rescale?: boolean;
  /** The selected record's x value, for marks you can select. The others recede; the frame says "Filtered to …". */
  selected?: unknown;
  /** Makes marks selectable: called with the chosen record, or null when the selection clears. */
  onSelect?: (d: ChartDatum | null) => void;
  /** Makes marks open a level down inside a Drilldown: the id of the current node's child this record opens. */
  drill?: (d: ChartDatum) => string | null | undefined;
  children?: React.ReactNode;
  empty?: ChartEmpty;
}
/** A total over time and its parts: flat bands on the ground line, parted by 2px, never a gradient. Renders inside a ChartContainer. */
export declare function AreaChart(props: AreaChartProps): React.ReactElement;
export interface HeatmapProps {
  /** The records: one per cell. Cells with no record, or a null value, are drawn as "No data". */
  data: ChartDatum[] | null | undefined | PromiseLike<ChartDatum[] | null>;
  /** 'grid' (default): x across, y down. 'calendar': a cell per day, a column per week, wrapping by week when it's narrow. */
  variant?: 'grid' | 'calendar';
  /** The grid's column key. */
  x?: string;
  /** The grid's row key. */
  y?: string;
  /** The calendar's day key: an ISO date, a timestamp or a Date. */
  date?: string;
  /** The key of each cell's value. It must also be a key of the container's config, which names and formats it. */
  value: string;
  /** Where each step starts, lowest first: [0, 1, 4, 10] gives "0", "1–3", "4–9" and "10+". Two to seven steps. Default: five to seven even steps, with zero its own step for counts. */
  bins?: number[];
  /** 'sequential' (default): how much, on data-seq. 'diverging': which side of `midpoint`, on data-div. */
  scale?: 'sequential' | 'diverging';
  /** The diverging scale's neutral value. Default 0. */
  midpoint?: number;
  /** Formats the grid's column values. */
  xFormat?: (value: unknown) => string;
  /** Formats the grid's row values. */
  yFormat?: (value: unknown) => string;
  /** The calendar's first day of the week: 0 Sunday (default) or 1 Monday. */
  weekStart?: 0 | 1;
  /** The steps as swatches with their ranges in words, under the cells. Default true. */
  legend?: boolean;
  /** The readout. Default true. */
  tooltip?: boolean;
  /** Filter in place: which cells match. Misses recede to 35%, keeping their place and colour. */
  relevance?: (d: ChartDatum) => 'match' | 'miss' | undefined;
  /** The selected cell: its record, or its id ("14|Tue" for a grid's x and y, "2026-03-14" for a calendar's day). */
  selected?: ChartDatum | string | null;
  /** Makes cells selectable: called with the chosen record, or null when the selection clears. */
  onSelect?: (d: ChartDatum | null) => void;
  /** Makes cells open a level down inside a Drilldown: the id of the current node's child this cell opens. */
  drill?: (d: ChartDatum) => string | null | undefined;
  empty?: ChartEmpty;
  children?: React.ReactNode;
}
/** A value per cell across two dimensions, or per day in a calendar: flat steps of one ramp, each named in words. Renders inside a ChartContainer. */
export declare function Heatmap(props: HeatmapProps): React.ReactElement;
export interface ScatterChartProps {
  /** The records: one dot each. */
  data: ChartDatum[] | null | undefined | PromiseLike<ChartDatum[] | null>;
  /** The key of each record's first measure, along the bottom. Name and format it in the container's config. */
  x: string;
  /** The key of each record's second measure, up the side. Name and format it in the container's config. */
  y: string;
  /** The key that sorts records into groups, each a colour and a marker shape. At most three; more belong in small multiples. */
  group?: string;
  /** Each record's stable identity, a key or a function: dots glide to new places when it's given, and cross-fade otherwise. */
  id?: string | ((d: ChartDatum) => string);
  /** Each record's name, a key or a function, for the readout, the keyboard path and the table. */
  name?: string | ((d: ChartDatum) => string);
  /** Labels a few dots on the plot (outliers): return the words, or null for none. */
  label?: (d: ChartDatum) => string | null | undefined;
  /** A least-squares trend line, 1px ink-muted, named "Trend" (or the words you pass). */
  trend?: boolean | string;
  /** The dots' size in px. Default 8, the least. */
  size?: number;
  /** The readout. Default true. */
  tooltip?: boolean;
  /**
   * What the chart is about: groups that keep their colours while the rest take data-context, or a test for the
   * records that keep theirs. The author's statement of importance, not a reader's filter (that's relevance).
   */
  focus?: string[] | ((d: ChartDatum) => boolean);
  /** Filter in place: which records match. Misses recede to 35%, keeping their place and colour. */
  relevance?: (d: ChartDatum) => 'match' | 'miss' | undefined;
  /** With relevance: fit y to the matches. Default false: the axes hold. */
  rescale?: boolean;
  /** The selected record, or its id. The others recede; the frame says "Filtered to …". */
  selected?: ChartDatum | string | null;
  /** Makes dots selectable: called with the chosen record, or null when the selection clears. */
  onSelect?: (d: ChartDatum | null) => void;
  /** Makes dots open a level down inside a Drilldown: the id of the current node's child this record opens. */
  drill?: (d: ChartDatum) => string | null | undefined;
  empty?: ChartEmpty;
  children?: React.ReactNode;
}
/** Two measures per record, to see how they relate: flat dots ringed apart, a shape per group, outliers named. Renders inside a ChartContainer. */
export declare function ScatterChart(props: ScatterChartProps): React.ReactElement;
/** The props of a DotPlot. */
export interface DotPlotProps {
  /** The records: one per category. undefined or a promise while they load; null or [] when there are none. */
  data: ChartDatum[] | null | undefined | PromiseLike<ChartDatum[] | null>;
  /** What the plot says when there's no data. */
  empty?: ChartEmpty;
  /** The key of each record's category, down the side. */
  x: string;
  /** Order the categories by value ('desc': the largest first): the first series', or `to`'s. */
  sort?: 'asc' | 'desc';
  /** A spread around each value, as the keys of its low and high: a flat band behind the dot. Never error bars. */
  range?: [string, string];
  /** What the spread is, in words. Default "Range". */
  rangeLabel?: string;
  /** The series the spread belongs to. Default the first. */
  rangeSeries?: string;
  /** Before and after per category (a dumbbell): the earlier dot hollow, the later filled, joined by a 2px ink-muted link. */
  from?: string;
  to?: string;
  /** Force zero onto the axis. Default false. */
  zero?: boolean;
  relevance?: (d: ChartDatum) => 'match' | 'miss' | undefined;
  rescale?: boolean;
  selected?: unknown;
  onSelect?: (d: ChartDatum | null) => void;
  drill?: (d: ChartDatum) => string | null | undefined;
  tooltip?: boolean;
  /** Series keys that keep their colours while the rest take data-context. */
  focus?: string[];
  children?: React.ReactNode;
}
/**
 * Values compared across categories where zero isn't part of the story, averages with their spread, or before and
 * after per category. Dots lie flat on the ground, ringed in the plot's colour; with no zero there's no ground line.
 */
export declare function DotPlot(props: DotPlotProps): React.ReactElement;
/** A sliding window over x: a span of time, or the last N records. */
export interface ChartWindow {
  minutes?: number; hours?: number; days?: number; points?: number;
  /** A fixed stretch of x, both ends included (a DateRange fits): what a ChartBrush sets. null leaves that end open. */
  start?: string | number | null; end?: string | number | null;
}
/** The records inside a window, and the x domain it spans. */
export declare function windowed(data: ChartDatum[], x: string, window: ChartWindow | undefined): { rows: ChartDatum[]; domain?: [number, number] };
/** An SVG path through points; a null breaks it. 'monotone' never overshoots the points. */
export declare function linePath(points: Array<[number, number] | null>, curve?: 'linear' | 'monotone'): string;
export interface SparklineProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** The values, oldest first: numbers (null is a gap) or records with `y` naming the value. Undefined while your data loads, or a promise: until it lands it's an imprint one line high. */
  data: Array<number | null> | ChartDatum[] | null | undefined | PromiseLike<Array<number | null> | ChartDatum[] | null>;
  /** The key of each record's value, when `data` holds records. */
  y?: string;
  /** The key of each record's date, so the label can say "over 30 days". */
  x?: string;
  /** A line (default), or bars standing on zero. */
  kind?: 'line' | 'bar';
  /** 'neutral' (default, ink-muted) is context; 'data' (data-1) when it is the series; a status hue only when the series means good or bad. */
  tone?: 'neutral' | 'data' | 'positive' | 'caution' | 'critical';
  /** A normal range, drawn as a flat band behind the line. */
  band?: [number, number];
  /** px or any CSS length. Default 5em. Its height is the line height of the text around it. */
  width?: number | string;
  /** Formats values in the generated label. Default: compact. */
  format?: (value: number) => string;
  /** Replaces the generated label ("Up 12% over 30 days, from 1.2K to 1.4K."). */
  summary?: string;
  /** The text beside it already says it: aria-hidden. */
  decorative?: boolean;
  locale?: string;
}
/** A word-sized trend beside the number it explains: flat ink on the ground, as tall as the text, labelled in words. */
export declare function Sparkline(props: SparklineProps): React.ReactElement;
export interface StatChange {
  /** The change. By default a fraction (0.08 is up 8%); with format, in your units. */
  value: number;
  /** What it's compared with, in words: "last month". */
  vs?: string;
  /** The value it's compared with, formatted like the value: "vs last month: 11,556". */
  previous?: number;
  /** Formats the size of the change, without its sign ("Up"/"Down" are words). Default: a percentage. */
  format?: (magnitude: number) => string;
}
export interface StatProps extends Omit<React.HTMLAttributes<HTMLElement>, 'children'> {
  /** What the number is. It names the stat. */
  label: React.ReactNode;
  /** The number. Undefined while your data loads, or a promise: an imprint of a number's width until it lands. null: an em dash. */
  value: number | string | null | undefined | PromiseLike<number | string | null>;
  /** Formats a numeric value and change.previous. Default: Intl.NumberFormat. */
  format?: (value: number) => string;
  change?: StatChange;
  /** Which direction is good. Without it the change is neutral ink-muted text with an arrow; with it, a positive or critical Badge plate. */
  good?: 'up' | 'down';
  /** A trend beside the value, usually a decorative Sparkline. */
  trend?: React.ReactNode;
  /** More context, in a caption under the change. */
  help?: React.ReactNode;
  /** 'hero': the value in text-display. Once per view. */
  size?: 'default' | 'hero';
  /** Announce a changed value politely. */
  live?: boolean;
  locale?: string;
}
/** A headline number, flush on what it sits on, with its change in words and an arrow; colour only when you say which way is good. */
export declare function Stat(props: StatProps): React.ReactElement;
export interface StatGroupProps extends React.HTMLAttributes<HTMLDivElement> { 'aria-label'?: string }
/** A row of stats that wrap to fit and land together. */
export declare function StatGroup(props: StatGroupProps): React.ReactElement;
export interface MeterSegment {
  key: string;
  label: string;
  value: number;
  /** Default: its place in the list (data-1, data-2, …). */
  color?: ChartSlot;
}
export interface MeterProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** What's being measured. It names the meter. */
  label: React.ReactNode;
  /** The reading. Undefined while your data loads: the track is an imprint. Ignored with segments (their sum is the reading). */
  value?: number;
  /** Default 0. */
  min?: number;
  /** Default 100. A reading above it is over the limit. */
  max?: number;
  /** From here: caution, and "Near limit". */
  high?: number;
  /** From here: critical, and "Over limit". Default: anything above max. */
  critical?: number;
  /** Parts of the whole: flat data-* fills parted by 2px, with a legend. */
  segments?: MeterSegment[];
  /** Formats readings ("62 GB"). */
  format?: (value: number) => string;
  /** The words for each state. Default "Near limit" and "Over limit". */
  states?: { high?: string; critical?: string };
  /** Hide the "62 GB of 100 GB" text (it's still announced). */
  hideValue?: boolean;
  locale?: string;
}
/** A reading within a known range: flat ink across a flush track, thresholds as notches, the state in words. role="meter". */
export declare function Meter(props: MeterProps): React.ReactElement;
export interface BarListItem {
  /** The row's label; also its key unless key is given. */
  name: string;
  value: number;
  key?: string;
  /** Makes the row a link. */
  href?: string;
}
export interface BarListProps extends Omit<React.HTMLAttributes<HTMLOListElement>, 'onSelect'> {
  /** The rows. Undefined while your data loads: imprinted rows until they land. */
  data: BarListItem[] | null | undefined;
  /** Formats values. Default: Intl.NumberFormat. */
  format?: (value: number) => string;
  /** At most this many rows; the rest fold into "Other", with "Show all". */
  limit?: number;
  /** Show each value's share of the total. */
  share?: boolean;
  /** Rank by value, largest first (default), or keep the data's order. */
  sort?: 'desc' | false;
  /** What the rows are, plural: "Other (14 pages)", "Show all 52 pages". */
  noun?: string;
  /** Makes each row a button (rows with href are links). */
  onSelect?: (item: BarListItem) => void;
  /** Filter in place: matches rise, misses sink and say "not matching". */
  relevance?: (item: BarListItem) => 'match' | 'miss' | undefined;
  locale?: string;
}
/** A ranked list whose rows are their own flat bars; rows that act lift on hover, and re-ranked rows are carried. */
export declare function BarList(props: BarListProps): React.ReactElement;
/** The scales, plot size and config of the nearest ChartContainer, for drawing your own marks. */
export declare function useChart(): ChartContextValue;

export interface SeparatorProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Default horizontal. A vertical one stretches to the height of the row it's in. */
  orientation?: 'horizontal' | 'vertical';
  /** Purely visual: hidden from assistive technology (role="none"). Use it when the layout already says what's parted. */
  decorative?: boolean;
  /** A word between two lines ("or"). It's read in the flow, so it's never decorative. */
  label?: React.ReactNode;
}
/** A divider on the ground: 1px of `line`, never `line-control` and never a shadow. role="separator" unless decorative. */
export declare const Separator: React.ForwardRefExoticComponent<SeparatorProps & React.RefAttributes<HTMLDivElement>>;

export interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  /** Leaves the app: opens in a new tab (rel="noopener noreferrer"), with an icon and "(opens in a new tab)" for screen readers. */
  external?: boolean;
  /** Styles your own link element (a router's Link) instead of rendering an <a>. Pass exactly one element. */
  asChild?: boolean;
  /** Mark links already followed: their underline turns ink-muted. Off by default; use it in long lists of documents. */
  visited?: boolean;
}
/** Navigation in accent-ink with an underline. A link is text in the record, so it never lifts: hover thickens the underline. */
export declare const Link: React.ForwardRefExoticComponent<LinkProps & React.RefAttributes<HTMLAnchorElement>>;

export type NumberFormatPreset = 'number' | 'currency' | 'bytes' | 'duration' | 'percent' | 'compact';
export type DurationUnit = 'millisecond' | 'second' | 'minute' | 'hour' | 'day';
export interface FormatNumberOptions extends Omit<Intl.NumberFormatOptions, 'style' | 'unit' | 'notation'> {
  /** Default 'number'. */
  format?: NumberFormatPreset;
  /** Default: the browser's. */
  locale?: string;
  /** currency: an ISO 4217 code. Default 'USD'. */
  currency?: string;
  /** currency: the value is in minor units (cents), as payment APIs send it, so 4900 is €49.00. Default true. */
  minorUnits?: boolean;
  /** duration: the unit the value is in. Default 'millisecond'. It's shown in the largest unit that keeps it at 1 or more. */
  unit?: DurationUnit;
  /** bytes: 1000 (kB, MB, GB; the default) or 1024 (KiB, MiB, GiB). */
  base?: 1000 | 1024;
}
/** The text, the exact value (when the text rounds or abbreviates it) and the words for a symbol that's ambiguous read aloud. */
export declare function describeNumber(value: number, options?: FormatNumberOptions): { text: string; full?: string; spoken?: string };
/** Formats a number once, the way FormattedNumber does: for DataTable columns, chart formatters and plain strings. */
export declare function formatNumber(value: number, options?: FormatNumberOptions): string;
export interface FormattedNumberProps extends FormatNumberOptions {
  value: number;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
  /** Default: the exact value, when the text rounds or abbreviates it. */
  title?: string;
}
/** A number is the record: flush, tabular, its exact value on hand; a changed value cross-fades and settles, never counts. */
export declare function FormattedNumber(props: FormattedNumberProps): React.ReactElement;

export interface RelativeTimeOptions {
  /** 'relative' (default) always says "3 minutes ago"; 'auto' is relative within `threshold`, then a date ("Mar 4"). */
  format?: 'relative' | 'auto';
  /** For format="auto": how far from now stays relative. An ISO 8601 duration ("P7D", "PT12H") or milliseconds. Default "P7D". */
  threshold?: string | number;
  /** 'past' never says "in 2 minutes" (a clock running ahead shows "now"); 'future' never says "ago". Default 'auto'. */
  tense?: 'auto' | 'past' | 'future';
  /** Default: the browser's. */
  locale?: string;
}
/** A moment as words relative to `now`, the way RelativeTime shows it: "3 minutes ago", "yesterday", "in 2 hours", "Mar 4". */
export declare function formatRelativeTime(date: Date | string | number, now?: number, options?: RelativeTimeOptions): string;
export interface RelativeTimeProps extends RelativeTimeOptions, Omit<React.TimeHTMLAttributes<HTMLElement>, 'children' | 'dateTime'> {
  /** The moment. When it changes (the record was edited again) it settles with the afterglow; time passing doesn't. */
  date: Date | string | number;
  /** Show the exact date, time and zone in a Tooltip on hover and focus (the element becomes focusable). Default true. */
  tooltip?: boolean;
}
/** A moment as "3 minutes ago" in a <time>, refreshed on one shared timer, with its exact time on hand. Ticking isn't a change. */
export declare function RelativeTime(props: RelativeTimeProps): React.ReactElement;

export interface CopyButtonProps extends Omit<ButtonProps, 'value' | 'onCopy' | 'onError' | 'square' | 'loading' | 'leading'> {
  /** What's copied, or a function that returns it (it may return a promise). */
  value: string | (() => string | Promise<string>);
  /** The button's name: its aria-label and Tooltip when it's icon-only, and kept as its name while it says "Copied". Default "Copy". */
  label?: string;
  /** Shown for dur-linger once copied. Default "Copied". */
  copiedLabel?: string;
  /** Shown for dur-linger when copying fails. Default "Couldn't copy". */
  failedLabel?: string;
  onCopy?: (value: string) => void;
  onError?: (error: unknown) => void;
}
/** Copies a value and says so in words: pressed to the ground with a check and "Copied" for dur-linger, announced politely. */
export declare const CopyButton: React.ForwardRefExoticComponent<CopyButtonProps & React.RefAttributes<HTMLButtonElement>>;

export interface ToggleProps extends Omit<ButtonProps, 'variant' | 'onChange'> {
  pressed?: boolean;
  defaultPressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
  /** ghost (default): flush at rest, as in a toolbar. secondary: a raised slab at rest. */
  variant?: 'ghost' | 'secondary';
}
/** A button that stays on. On is a choice, built like the Switch: a shallow well with accent-soft poured in. aria-pressed. */
export declare const Toggle: React.ForwardRefExoticComponent<ToggleProps & React.RefAttributes<HTMLButtonElement>>;
interface ToggleGroupBase extends Omit<React.HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'> {
  /** For type="multiple": ghost (default) or secondary toggles. type="single" is always the segmented build. */
  variant?: 'ghost' | 'secondary';
  size?: ButtonProps['size'];
  orientation?: 'horizontal' | 'vertical';
  disabled?: boolean;
}
export interface ToggleGroupSingleProps extends ToggleGroupBase {
  /** One choice: the options sit in a well and one raised pill glides between them, as segmented Tabs. A radio group. */
  type: 'single';
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}
export interface ToggleGroupMultipleProps extends ToggleGroupBase {
  /** Any number on: a row of Toggles, each with aria-pressed. */
  type: 'multiple';
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
}
export type ToggleGroupProps = ToggleGroupSingleProps | ToggleGroupMultipleProps;
/** A group of toggles with one tab stop: one choice (segmented, a radio group) or any number (a row of Toggles). */
export declare function ToggleGroup(props: ToggleGroupProps): React.ReactElement;
export interface ToggleGroupItemProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'value'> {
  value: string;
  /** type="multiple" only: an icon-only square toggle. */
  square?: boolean;
}
export declare const ToggleGroupItem: React.ForwardRefExoticComponent<ToggleGroupItemProps & React.RefAttributes<HTMLButtonElement>>;

export interface ToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Names the toolbar ("Formatting"). Required. */
  'aria-label': string;
  orientation?: 'horizontal' | 'vertical';
  /** When the tools don't fit: 'wrap' (default) onto another row; 'menu' moves the ones that don't fit, from the end, into a "More tools" menu. */
  overflow?: 'wrap' | 'menu';
  /** A line rim around the bar. Default false. */
  bordered?: boolean;
}
/** A row of tools with one tab stop: the bar lies on the ground, its tools are ghosts that lift when pointed at. */
export declare function Toolbar(props: ToolbarProps): React.ReactElement;
/** Tools that belong together, parted from the next group by a ToolbarSeparator. */
export declare function ToolbarGroup(props: React.HTMLAttributes<HTMLDivElement>): React.ReactElement;
/** A decorative 1px line between groups. */
export declare function ToolbarSeparator(props: { className?: string }): React.ReactElement;
export interface ToolbarButtonProps extends Omit<ButtonProps, 'variant'> {}
/** A ghost tool. Icon-only tools need an aria-label. */
export declare const ToolbarButton: React.ForwardRefExoticComponent<ToolbarButtonProps & React.RefAttributes<HTMLButtonElement>>;
export interface ToolbarToggleProps extends Omit<ToggleProps, 'variant'> {}
/** A latched tool: a ghost Toggle. */
export declare const ToolbarToggle: React.ForwardRefExoticComponent<ToolbarToggleProps & React.RefAttributes<HTMLButtonElement>>;

export interface SplitButtonProps extends Omit<ButtonProps, 'variant' | 'children' | 'square'> {
  /** The default action's words ("Save changes"). They also name the group. */
  label: React.ReactNode;
  /** primary (default) or secondary. */
  variant?: 'primary' | 'secondary';
  /** The alternatives, in a DropdownMenu. */
  items: MenuEntry[];
  /** The chevron's name. Default "More options". Say what for: "More save options". */
  menuLabel?: string;
  /** Names the group when label isn't plain text. */
  groupLabel?: string;
}
/** One action with its alternatives: two faces on one slab sharing one wall; each lifts on its own. */
export declare const SplitButton: React.ForwardRefExoticComponent<SplitButtonProps & React.RefAttributes<HTMLButtonElement>>;

/** Reads what was typed in the locale's own way: "1.000,5" is 1000.5 in German. Returns null for nothing, NaN for nonsense. */
export declare function parseNumber(text: string, locale?: string): number | null;
export interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'defaultValue' | 'onChange' | 'size' | 'type' | 'min' | 'max' | 'step'> {
  value?: number | null;
  defaultValue?: number | null;
  /** Called with the parsed value when it's committed (on blur, Enter, a step or a stepper), or null when cleared. */
  onValueChange?: (value: number | null) => void;
  min?: number;
  max?: number;
  /** Default 1. Shift+arrow, PageUp and PageDown move ten steps. */
  step?: number;
  /** Intl.NumberFormat options; the unit is shown beside the number and spoken with it. With style 'percent' the value is a fraction. */
  format?: Intl.NumberFormatOptions;
  /** Default: the browser's. Parsing follows it. */
  locale?: string;
  invalid?: boolean;
  size?: 'sm' | 'md';
  /** The scroll wheel steps the value while the field is focused. Default false. */
  wheel?: boolean;
  /** The steppers' names. Default "Increase" and "Decrease". */
  incrementLabel?: string;
  decrementLabel?: string;
}
/** A number field: an opening that fills, with two small raised steppers in its end cap. A spinbutton; parses by locale. */
export declare const NumberInput: React.ForwardRefExoticComponent<NumberInputProps & React.RefAttributes<HTMLInputElement>>;

export interface InputOTPProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'defaultValue' | 'onChange' | 'pattern' | 'children'> {
  /** How many characters the code has. */
  maxLength: number;
  value?: string;
  defaultValue?: string;
  onChange?: (code: string) => void;
  /** Called when the last character lands, and again whenever a full code changes. */
  onComplete?: (code: string) => void;
  /** Which characters it takes. Default 'digits'. Anything else typed or pasted is dropped. */
  pattern?: 'digits' | 'alphanumeric' | RegExp;
  /** Show • instead of the characters. */
  mask?: boolean;
  invalid?: boolean;
  /** The code is being checked: aria-busy, and nothing more can be typed. */
  verifying?: boolean;
  /** InputOTPGroup, InputOTPSlot and InputOTPSeparator. Default: one group of maxLength slots. */
  children?: React.ReactNode;
  className?: string;
}
/** A one-time code as a row of openings that fill, driven by one real input (autocomplete="one-time-code"). */
export declare const InputOTP: React.ForwardRefExoticComponent<InputOTPProps & React.RefAttributes<HTMLInputElement>>;
/** Slots that sit together. */
export declare function InputOTPGroup(props: React.HTMLAttributes<HTMLDivElement>): React.ReactElement;
/** One character's opening. */
export declare function InputOTPSlot(props: { index: number; className?: string }): React.ReactElement;
/** A decorative dash between groups. */
export declare function InputOTPSeparator(props: { className?: string }): React.ReactElement;

export interface TimeInputProps {
  /** A time of day, "HH:mm" on a 24-hour clock, or null. It's only set once every segment holds a value. */
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
  /** The arrow keys move the minutes by this much. Default 1. */
  step?: number;
  /** "auto" (default) follows the locale; "h12" shows AM/PM; "h23" a 24-hour clock. */
  hourCycle?: 'auto' | 'h12' | 'h23';
  /** Earliest and latest allowed times ("09:00", "17:30"). A time outside them is invalid. */
  min?: string;
  max?: string;
  /** An IANA time zone. Its short name is shown after the time and spoken with it. The value isn't converted. */
  timeZone?: string;
  locale?: string;
  invalid?: boolean;
  disabled?: boolean;
  required?: boolean;
  size?: 'sm' | 'md';
  /** Submits the value with a form, in a hidden input. */
  name?: string;
  id?: string;
  className?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
}
/** A time of day typed by segment; an opening that fills only when every segment holds a value. */
export declare function TimeInput(props: TimeInputProps): React.ReactElement;

export interface PasswordRequirement {
  label: string;
  test: (value: string) => boolean;
}
export interface PasswordInputProps extends Omit<InputProps, 'type' | 'trailing'> {
  /** Scores a password from 0 (weakest) to 4 (strongest); your app supplies the scoring. Shown as a Meter. */
  strength?: (value: string) => number;
  /** The word for each score, 0 to 4. Default "Very weak", "Weak", "Fair", "Good", "Strong". */
  strengthLabels?: [string, string, string, string, string];
  /** Rules shown under the field, each stamped as met or not as the password changes. */
  requirements?: PasswordRequirement[];
  /** The reveal toggle's name. It never changes with its state. Default "Show password". */
  revealLabel?: string;
}
/** A password field with a reveal Toggle, a caps-lock notice, and strength as a reading (a Meter) when creating one. */
export declare const PasswordInput: React.ForwardRefExoticComponent<PasswordInputProps & React.RefAttributes<HTMLInputElement>>;

export interface SecretFieldProps {
  /** What the secret is ("Secret key"). It names the field. */
  label: string;
  /** The word used in the buttons and the warning: "Copy key", "Show key", "Revoke key". Default "key". */
  noun?: string;
  /** A secret just created: shown in full, once. */
  value?: string;
  /** With value: the secret is shown only now. It stays an opening until onAcknowledge, then masks. */
  once?: boolean;
  /** Called when the person confirms they've saved the secret. Gate closing on it. */
  onAcknowledge?: () => void;
  /** The confirmation's words. Default "I've saved this {noun}". */
  acknowledgeLabel?: string;
  /** The warning while the secret is new. */
  warning?: React.ReactNode;
  /** A stored secret: the part shown before the mask ("sk_live_"). */
  prefix?: string;
  /** A stored secret: its last characters ("4f2a"). */
  maskedTail?: string;
  /** A stored secret that may be shown again: returns it (it may be a promise). Without it there's no reveal. */
  onReveal?: () => string | Promise<string>;
  onRotate?: () => void;
  /** Revoking is held, not clicked (HoldButton). */
  onRevoke?: () => void;
  className?: string;
}
/** A key or token shown once when created (an opening until acknowledged), masked to its tail afterwards. */
export declare function SecretField(props: SecretFieldProps): React.ReactElement;

export interface CodeBlockTab {
  label: string;
  code: string;
  language?: string;
}
export interface CodeBlockProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  /** The code, for a single block. */
  code?: string;
  language?: string;
  /** A filename or what the code is ("Install"). Shown in the header; names the block. */
  title?: React.ReactNode;
  /** The same thing in several forms: a segmented switch in the header. */
  tabs?: CodeBlockTab[];
  /** Lines to highlight, counted from 1. */
  highlight?: number[];
  /** Your highlighter (Shiki, Prism): returns the code coloured. Altitude ships none. */
  syntax?: (code: string, language?: string) => React.ReactNode;
  /** Line numbers in a gutter (hidden from assistive technology). Default false. */
  lineNumbers?: boolean;
  /** The code is still arriving: a dashed rule and "Writing…", aria-busy. */
  streaming?: boolean;
  /** Taller code scrolls. Default 360. */
  maxHeight?: number | string;
  /** Default true. */
  copyable?: boolean;
}
/** Code to read and copy, flush on the ground with a line rim; forms switch with segmented Tabs; copy is a CopyButton. */
export declare function CodeBlock(props: CodeBlockProps): React.ReactElement;

export interface ColorSwatch {
  value: string;
  /** Every swatch has a name: colour is never the only way to tell them apart. */
  name: string;
}
export interface ColorSwatchPickerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
  swatches: ColorSwatch[];
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string) => void;
  'aria-label'?: string;
}
/** Colours as choices: trenches the colour pours into, one raised white mark that travels. A radio group. */
export declare function ColorSwatchPicker(props: ColorSwatchPickerProps): React.ReactElement;
export interface ColorPickerProps {
  /** What the colour is for ("Brand colour"). It names the swatches. */
  label: string;
  value?: string;
  defaultValue?: string;
  /** Called with a lower-case "#rrggbb". */
  onValueChange?: (value: string) => void;
  swatches?: ColorSwatch[];
  /** A hex field and a full picker (area and hue) for any colour. Default false. */
  allowCustom?: boolean;
  /** Says in words whether white text and dark text on the colour reach 4.5:1. Default false. */
  checkContrast?: boolean;
  className?: string;
}
/** A brand or label colour: swatches, an optional hex field and full picker, and a contrast check in words. */
export declare function ColorPicker(props: ColorPickerProps): React.ReactElement;

export interface BreadcrumbEntry {
  label: React.ReactNode;
  /** Where the step goes. The last entry is the current page and never a link. */
  href?: string;
  onClick?: (e: React.MouseEvent) => void;
}
export interface BreadcrumbProps extends Omit<React.HTMLAttributes<HTMLElement>, 'children'> {
  /** 'collapse' (default): steps from the second onward move behind "…" until the trail fits on one line. 'wrap': it wraps. */
  fit?: 'collapse' | 'wrap';
  items?: BreadcrumbEntry[];
  /** Deeper paths keep the first step and the last (maxItems − 1), with the middle in a menu behind "…". */
  maxItems?: number;
  /** Renders a step's link your way (a router's Link). Spread the props onto it. */
  renderLink?: (item: BreadcrumbEntry, props: React.AnchorHTMLAttributes<HTMLAnchorElement> & { className: string }) => React.ReactElement;
  /** Called when a step in the "…" menu is chosen. Default: follow its href. */
  onNavigate?: (item: BreadcrumbEntry) => void;
  /** Composable parts (BreadcrumbList, BreadcrumbItem, …), instead of items. */
  children?: React.ReactNode;
}
/** Where you are, as Drilldown's staircase: each deeper place a taller step on one ground line. */
export declare function Breadcrumb(props: BreadcrumbProps): React.ReactElement;
export declare function BreadcrumbList(props: React.OlHTMLAttributes<HTMLOListElement>): React.ReactElement;
export interface BreadcrumbItemProps { depth?: number; children: React.ReactNode }
export declare function BreadcrumbItem(props: BreadcrumbItemProps): React.ReactElement;
export declare const BreadcrumbLink: React.ForwardRefExoticComponent<React.AnchorHTMLAttributes<HTMLAnchorElement> & React.RefAttributes<HTMLAnchorElement>>;
export declare function BreadcrumbPage(props: React.HTMLAttributes<HTMLSpanElement>): React.ReactElement;
/** Renders nothing: each step's height already says it's deeper. */
export declare function BreadcrumbSeparator(props: { children?: React.ReactNode }): null;
export declare function BreadcrumbEllipsis(props: { items: BreadcrumbEntry[]; onNavigate?: (item: BreadcrumbEntry) => void }): React.ReactElement;

/** The pages shown: the first, the last, the current one and `siblings` either side, with a gap where pages are skipped. */
export declare function pageRange(page: number, count: number, siblings?: number): (number | 'gap')[];
export interface PaginationProps extends Omit<React.HTMLAttributes<HTMLElement>, 'onChange'> {
  /** The current page, from 1. */
  page: number;
  /** How many pages. Leave it out for cursor paging: Previous and Next, and "Page 3". */
  pageCount?: number;
  onPageChange?: (page: number) => void;
  /** With pageSize: the summary "21–40 of 214". */
  total?: number;
  pageSize?: number;
  /** Pages have URLs: they're links. Without it they're buttons. */
  hrefFor?: (page: number) => string;
  /** For cursor paging: whether there's a next page. Default true. */
  hasNext?: boolean;
  /** Pages either side of the current one. Default 1. */
  siblings?: number;
  /** The next page is loading: the thumb is held pressed until it lands. */
  loading?: boolean;
  /** What's being paged, plural, for the summary ("invoices"). */
  noun?: string;
  locale?: string;
}
/** Move through pages: the numbers sit in a trench and one raised thumb travels to the current page. */
export declare function Pagination(props: PaginationProps): React.ReactElement;

export interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  /** A Breadcrumb above the title. */
  breadcrumb?: React.ReactNode;
  /** The page's one primary action: a single Button variant="primary". */
  primary?: React.ReactElement;
  /** Secondary and ghost actions, before the primary. */
  actions?: React.ReactNode;
  /** Actions that don't need to be seen, in a "More actions" menu. */
  overflow?: MenuEntry[];
  /** Tabs under the title, for the page's sections. */
  tabs?: React.ReactNode;
  /** Stays at the top while the page scrolls, and rises one level when content passes under it. */
  sticky?: boolean;
  /** PageHeaderTitle and PageHeaderDescription. */
  children?: React.ReactNode;
}
/** The block a page opens with: lies on the ground, with one slot for the primary action (law 1). */
export declare function PageHeader(props: PageHeaderProps): React.ReactElement;
/** The page's h1. */
export declare function PageHeaderTitle(props: React.HTMLAttributes<HTMLHeadingElement>): React.ReactElement;
/** One line saying what the page is for. */
export declare function PageHeaderDescription(props: React.HTMLAttributes<HTMLParagraphElement>): React.ReactElement;

export interface SidebarProviderProps {
  /** Collapsed to a rail of icons. Persisting it is up to your app. */
  collapsed?: boolean;
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Below this width the sidebar becomes a drawer. Default 640, the compact breakpoint (`breakpoint-compact`). */
  mobileBreakpoint?: number;
  children: React.ReactNode;
}
/** Holds the sidebar's state, and toggles it with ⌘B / Ctrl+B. */
export declare function SidebarProvider(props: SidebarProviderProps): React.ReactElement;
/** The sidebar's state and how to toggle it. */
export declare function useSidebar(): { collapsed: boolean; setCollapsed: (c: boolean) => void; mobile: boolean; drawer: boolean; setDrawer: (o: boolean) => void; toggle: () => void };
export interface SidebarProps extends React.HTMLAttributes<HTMLElement> {
  /** 'icon' (default) collapses to a rail of icons; 'none' never collapses. */
  collapsible?: 'icon' | 'none';
  /** The navigation landmark's name. Default "Main". */
  'aria-label'?: string;
}
/** The sidebar: a nav on the ground; a Sheet drawer on narrow screens. */
export declare function Sidebar(props: SidebarProps): React.ReactElement;
export declare function SidebarHeader(props: React.HTMLAttributes<HTMLDivElement>): React.ReactElement;
export declare function SidebarFooter(props: React.HTMLAttributes<HTMLDivElement>): React.ReactElement;
/** The scrolling middle, where the current destination's pill glides. */
export declare function SidebarContent(props: React.HTMLAttributes<HTMLDivElement>): React.ReactElement;
export interface SidebarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: React.ReactNode;
  /** The label is a disclosure button that shows and hides the group. */
  collapsible?: boolean;
  defaultOpen?: boolean;
}
export declare function SidebarGroup(props: SidebarGroupProps): React.ReactElement;
export declare function SidebarGroupLabel(props: React.HTMLAttributes<HTMLDivElement>): React.ReactElement;
export declare function SidebarMenu(props: React.HTMLAttributes<HTMLUListElement>): React.ReactElement;
export declare function SidebarMenuItem(props: React.LiHTMLAttributes<HTMLLIElement>): React.ReactElement;
export interface SidebarMenuButtonProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  /** The page you're on: aria-current="page", and the raised pill. */
  current?: boolean;
  icon?: React.ReactNode;
  /** Styles your own link element (a router's Link). */
  asChild?: boolean;
}
export declare const SidebarMenuButton: React.ForwardRefExoticComponent<SidebarMenuButtonProps & React.RefAttributes<HTMLAnchorElement>>;
export interface SidebarMenuBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  /** What the count is, for its name: "4 unread". */
  label?: string;
}
/** A count on a destination: it floats, and it's part of the destination's name. */
export declare function SidebarMenuBadge(props: SidebarMenuBadgeProps): React.ReactElement;
export declare function SidebarTrigger(props: React.ButtonHTMLAttributes<HTMLButtonElement>): React.ReactElement;
/** The main landmark beside the sidebar. */
export declare function SidebarInset(props: React.HTMLAttributes<HTMLElement>): React.ReactElement;
export interface AppShellProps extends Omit<SidebarProviderProps, 'children'> {
  sidebar: React.ReactNode;
  /** The top bar's contents. A SidebarTrigger comes first by itself. */
  topBar?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}
/** The frame of an app on the ground: a sidebar, a top bar that rises when content passes under it, and the page. */
export declare function AppShell(props: AppShellProps): React.ReactElement;

export interface ResizablePanelGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Under 480px of its own width: 'stack' (default) shows one panel (narrowPanel); 'vertical' stacks them; false keeps them side by side. */
  narrow?: 'stack' | 'vertical' | false;
  /** With narrow="stack", the panel shown while narrow, by index. */
  narrowPanel?: number;
  /** Called when the group becomes narrow or wide again. */
  onNarrowChange?: (narrow: boolean) => void;
  /** horizontal (default): panes side by side; vertical: stacked. */
  direction?: 'horizontal' | 'vertical';
  /** Remembers the sizes in this browser under this name. */
  autoSaveId?: string;
  onLayout?: (sizes: number[]) => void;
}
/** Panes beside each other on the ground, parted by dividers you can drag. */
export declare function ResizablePanelGroup(props: ResizablePanelGroupProps): React.ReactElement;
export interface ResizablePanelProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Percent of the group. Panels without one share what's left. */
  defaultSize?: number;
  /** Percent. Default 10. */
  minSize?: number;
  /** Percent. Default 90. */
  maxSize?: number;
  /** Enter on the handle before it collapses it to nothing, and restores it. */
  collapsible?: boolean;
  /** Names the pane, and the handle that resizes it. */
  'aria-label'?: string;
}
export declare function ResizablePanel(props: ResizablePanelProps): React.ReactElement;
export interface ResizableHandleProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Show the grip plate. Default true. */
  withGrip?: boolean;
  /** Its name. Default "Resize {the pane before it}". */
  label?: string;
}
/** The divider: a window splitter whose grip floats at level 3 while held. */
export declare function ResizableHandle(props: ResizableHandleProps): React.ReactElement;

export interface ContextMenuProps {
  /** The actions on the thing. A function is called each time the menu opens. */
  items: MenuEntry[] | (() => MenuEntry[]);
  /** The thing: one focusable element. */
  children: React.ReactElement<any>;
  /** Names the menu. Default "Actions". */
  'aria-label'?: string;
  onOpenChange?: (open: boolean) => void;
}
/** Actions on a thing, opened where you right-click or long-press it, or with Shift+F10: DropdownMenu's menu at the pointer. */
export declare function ContextMenu(props: ContextMenuProps): React.ReactElement;



/** What a view keeps: its filters, their match, the sort and the columns. */
export interface ViewState {
  filters: Filter[];
  match: 'all' | 'any';
  sort: TableSort;
  columnVisibility: Record<string, boolean>;
  columnOrder?: string[];
}
export interface SavedView extends Partial<ViewState> { id: string; name: string }
export interface SavedViewsOptions {
  views: SavedView[];
  /** The view shown first. Default the first. */
  defaultViewId?: string;
  /** Saves the active view's changes over it. */
  onSave?: (view: SavedView) => void;
  /** Saves the active view's state as a new view with this name. */
  onCreate?: (view: Omit<SavedView, 'id'>) => void;
  onDelete?: (id: string) => void;
}
export interface SavedViewsApi {
  views: SavedView[];
  active: SavedView;
  draft: ViewState;
  modified: boolean;
  select: (id: string) => void;
  save: () => void;
  saveAsNew: (name: string) => void;
  reset: () => void;
  canSave: boolean;
  canCreate: boolean;
  filterBarProps: { value: Filter[]; onValueChange: (f: Filter[]) => void; match: 'all' | 'any'; onMatchChange: (m: 'all' | 'any') => void };
  tableProps: { sort: TableSort; onSortChange: (s: TableSort) => void; columnVisibility: Record<string, boolean>; onColumnVisibilityChange: (v: Record<string, boolean>) => void; columnOrder?: string[]; onColumnOrderChange: (o: string[]) => void };
}
/** Named views of a FilterBar and DataTable, each keeping its own draft. */
export declare function useSavedViews(options: SavedViewsOptions): SavedViewsApi;
export interface SavedViewsProps {
  views: SavedViewsApi;
  children: React.ReactNode;
  'aria-label'?: string;
  className?: string;
}
/** Saved views as folder Tabs; a changed view is a draft with Save view, Save as new view and Reset. */
export declare function SavedViews(props: SavedViewsProps): React.ReactElement;

export interface TimelineProps extends React.HTMLAttributes<HTMLElement> {
  /** 'day' (default) puts a heading before each day's events. */
  groupBy?: 'day' | 'none';
  /** The level of the day headings. Default 3. */
  headingLevel?: 2 | 3 | 4;
  locale?: string;
  'aria-label'?: string;
  /** TimelineItem elements; give each a key. */
  children: React.ReactNode;
}
/** Events in order on one ground line turned upright; new events settle in, yours hover until they land. */
export declare function Timeline(props: TimelineProps): React.ReactElement;
export interface TimelineItemProps {
  icon?: React.ReactNode;
  time: Date | string | number;
  /** An event you caused: pending hovers until it lands; failed drops to a trench with Retry. */
  status?: 'pending' | 'committed' | 'failed';
  onRetry?: () => void;
  /** More about it, behind a Details disclosure. */
  detail?: React.ReactNode;
  /** The event links somewhere: it lifts when pointed at. */
  href?: string;
  locale?: string;
  children: React.ReactNode;
  isNew?: boolean;
}
/** One event: a sentence with its time, flush on the line. */
export declare function TimelineItem(props: TimelineItemProps): React.ReactElement;

export interface NotificationEntry {
  id: string;
  title: React.ReactNode;
  body?: React.ReactNode;
  createdAt: Date | string | number;
  read: boolean;
  /** Where it leads. Opening it marks it read. */
  href?: string;
  /** Things to do about it ("Approve"). */
  actions?: React.ReactNode;
}
export interface NotificationListProps {
  items: NotificationEntry[];
  onMarkRead?: (ids: string[]) => void;
  onMarkAllRead?: () => void;
  preferencesHref?: string;
  /** 'day' (default) puts a heading before each day. */
  groupBy?: 'day' | 'none';
  locale?: string;
  onOpen?: (item: NotificationEntry) => void;
}
/** The list of notifications on the ground; unread is a mark, not a height. */
export declare function NotificationList(props: NotificationListProps): React.ReactElement;
export interface NotificationCenterProps extends NotificationListProps {
  /** Below this width the panel is a bottom Sheet. Default 640. */
  mobileBreakpoint?: number;
  className?: string;
}
/** A bell with a floating count that opens the list in a Popover (a Sheet on narrow screens). */
export declare function NotificationCenter(props: NotificationCenterProps): React.ReactElement;

export type SyncState = 'saved' | 'saving' | 'offline' | 'failed' | 'conflict';
export interface SyncIndicatorProps {
  state: SyncState;
  /** Changes not yet on the server. */
  pending?: number;
  /** Conflicts waiting to be resolved, with state="conflict". */
  conflicts?: number;
  /** When the work last reached the server. */
  lastSyncedAt?: Date | string | number;
  onRetry?: () => void;
  onOpenConflicts?: () => void;
  /** The waiting changes, shown in a Popover when the plate is pressed. */
  queue?: React.ReactNode;
  /** Announces "Saved" at most this often, in ms. Default 5000. */
  announceEvery?: number;
  className?: string;
}
/** Whether work has reached the server, in words on a flush Badge plate whose lamp relights on change. */
export declare function SyncIndicator(props: SyncIndicatorProps): React.ReactElement;

/** Line operations for two texts. */
export declare function diffLines(before: string, after: string): { kind: 'same' | 'add' | 'del'; text: string }[];
export interface DiffField { key: string; label: string; format?: (value: unknown) => React.ReactNode }
export interface DiffViewProps {
  /** 'text' (default): lines of two texts. 'properties': fields of two records. */
  mode?: 'text' | 'properties';
  before: string | Record<string, unknown>;
  after: string | Record<string, unknown>;
  /** For mode="properties": which fields, labelled. Default every key that changed. */
  fields?: DiffField[];
  /** Unchanged lines kept around each change. Default 3. */
  context?: number;
  /** What's being compared ("Version 4 → 5"). */
  caption?: React.ReactNode;
  /** Precomputed line operations, for large inputs. */
  hunks?: { kind: 'same' | 'add' | 'del'; text: string }[];
  className?: string;
}
/** What changed between two versions, in signs and words; flush on the ground, never colour alone. */
export declare function DiffView(props: DiffViewProps): React.ReactElement;

export interface SaveBarProps {
  /** A useEditRecord result: SaveBar reads dirty, phase and errors from it, and calls submit and reset. */
  record?: { dirty: boolean; phase: 'editing' | 'invalid' | 'submitting' | 'saved' | 'failed'; errors: object; error?: string; draft?: object; baseline?: object; submit: () => unknown; reset: () => unknown };
  dirty?: boolean;
  saving?: boolean;
  /** Why the last save failed. The draft is kept. */
  error?: string;
  /** Fields that need attention before saving. */
  invalidCount?: number;
  /** How many fields changed. Default: counted from the record. */
  changedCount?: number;
  onSave?: () => void;
  onDiscard?: () => void;
  /** The bar appears once a change has settled into the draft. Default 600 ms. */
  delay?: number;
  saveLabel?: string;
  discardLabel?: string;
  className?: string;
}
/** Unsaved changes held above the page at level 3 until saved or discarded; saving hovers, failing drops to a trench. */
export declare function SaveBar(props: SaveBarProps): React.ReactElement;

export interface MatrixRole { id: string; name: string; /** Every permission is always granted (an owner). */ locked?: boolean }
export interface MatrixPermission { id: string; name: string; group?: string }
export interface MatrixInherited { granted: boolean; from: string }
export interface PermissionMatrixProps {
  roles: MatrixRole[];
  permissions: MatrixPermission[];
  /** Grants you can change: value[roleId][permissionId]. */
  value: Record<string, Record<string, boolean>>;
  /** A grant decided elsewhere: shown as a stamped mark, not a choice. */
  inherited?: (roleId: string, permissionId: string) => MatrixInherited | undefined;
  /** Called when a choice is toggled; a promise makes the cell hover as pending, a rejection reverts it. */
  onChange?: (roleId: string, permissionId: string, granted: boolean) => void | Promise<unknown>;
  'aria-label'?: string;
  className?: string;
}
/** Roles against permissions: editable grants are Checkboxes, inherited and fixed ones are stamped, the active cell a ring. */
export declare function PermissionMatrix(props: PermissionMatrixProps): React.ReactElement;

export interface Plan {
  id: string;
  name: string;
  description?: React.ReactNode;
  /** In minor units, per period; a single number is the same for both; null for "Contact sales". */
  price: { month: number; year: number } | number | null;
  /** ISO 4217. Default 'USD'. */
  currency?: string;
  /** What the price is for ("per seat"). */
  unit?: string;
  features?: string[];
  /** Why it can't be chosen. */
  unavailable?: string;
}
export interface PlanPickerProps {
  plans: Plan[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (id: string) => void;
  /** The plan they're on now: a "Current plan" plate. */
  current?: string;
  /** A suggested plan: a "Recommended" plate, never extra height. */
  recommended?: string;
  /** The billing period, with a Monthly / Annually switch when onPeriodChange is given. */
  period?: 'month' | 'year';
  onPeriodChange?: (period: 'month' | 'year') => void;
  locale?: string;
  'aria-label'?: string;
  className?: string;
}
/** Choose a plan: flush cards in one radio group with one travelling mark; current and recommended are plates. */
export declare function PlanPicker(props: PlanPickerProps): React.ReactElement;

export interface FeatureGateProps {
  /** The plan it needs ("Business"). */
  requires: string;
  /** What the feature does, in the explanation. */
  description?: React.ReactNode;
  /** Opens the upgrade. */
  onUpgrade?: () => void;
  /** Where the plans are compared. */
  compareHref?: string;
  /** False when this person can't upgrade: the button becomes "Ask an admin to upgrade". Default true. */
  canUpgrade?: boolean;
  /** The control that needs the plan: one element. It stays live. */
  children: React.ReactElement<any>;
  className?: string;
}
/** A feature that needs another plan, locked rather than disabled: live, with a lock and a plan plate, opening the upgrade. */
export declare function FeatureGate(props: FeatureGateProps): React.ReactElement;

export interface ThreadComment {
  id: string;
  author: { name: string; avatar?: string };
  /** Plain text; "@Name" for someone mentioned. */
  body: string;
  createdAt: Date | string | number;
  /** One you're posting: pending hovers, failed drops to a trench with Retry and keeps the text. */
  status?: 'pending' | 'failed';
  /** Names mentioned in the body, drawn as plates. */
  mentions?: string[];
  mine?: boolean;
  /** Deleted: its result stays in its slot with Undo. */
  deleted?: boolean;
}
export interface Mentionable { id: string; name: string }
export interface CommentThreadProps {
  comments: ThreadComment[];
  /** The thread is resolved: stamped, muted and collapsed to one line, kept in place. */
  resolved?: { by: string } | false;
  onPost?: (body: string, mentions: Mentionable[]) => void;
  onResolve?: () => void;
  onReopen?: () => void;
  onRetry?: (id: string) => void;
  onDelete?: (id: string) => void;
  onUndoDelete?: (id: string) => void;
  /** People who can be mentioned, for a query after "@". */
  mentionable?: (query: string) => Mentionable[];
  /** Other people typing now (never announced). */
  typing?: string[];
  'aria-label'?: string;
  className?: string;
}
/** Comments on a record: posting hovers as pending, a resolved thread is stamped in place, mentions are a listbox. */
export declare function CommentThread(props: CommentThreadProps): React.ReactElement;

export interface TourStep {
  /** What it points at: a CSS selector or an element. */
  target: string | HTMLElement | null;
  title: string;
  body?: React.ReactNode;
}
export interface TourProps {
  steps: TourStep[];
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Called once, when the last step's Done is pressed or the tour is skipped or dismissed. */
  onFinish?: (how: 'done' | 'skipped') => void;
  onStepChange?: (index: number) => void;
}
/** A few steps pointing at the interface: one level-3 card at a time, the target ringed; never dims, never modal. */
export declare function Tour(props: TourProps): React.ReactElement | null;

export type PromptStatus = 'ready' | 'submitted' | 'streaming' | 'error';
export interface PromptAttachment { id: string; file: File; name: string; status?: 'pending' }
export interface PromptMessage { text: string; files: File[] }
export interface PromptInputProps extends Omit<React.FormHTMLAttributes<HTMLFormElement>, 'onSubmit'> {
  /** Called with the text and attached files when sent. */
  onSubmit: (message: PromptMessage) => void;
  /** 'submitted' and 'streaming' turn Send into Stop, in the same slot. Default 'ready'. */
  status?: PromptStatus;
  onStop?: () => void;
  /** Enter while 'submitted' or 'streaming' queues the message instead of doing nothing; the button stays Stop. Show the queue with ConversationQueue. */
  onQueue?: (message: PromptMessage) => void;
  value?: string;
  onValueChange?: (text: string) => void;
  /** A promise holds the chip as pending until it settles; a rejection removes it. */
  onAttach?: (files: File[]) => void | Promise<unknown>;
  /** Accepted file types. Leave out to turn attachments off. */
  accept?: string;
  children: React.ReactNode;
}
/** Where a person writes to an agent: the composer is an Input well; Send becomes Stop in the same slot; IME-safe Enter. */
export declare function PromptInput(props: PromptInputProps): React.ReactElement;
export interface PromptInputTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'> {
  /** The tallest it grows before it scrolls. Default 200. */
  maxHeight?: number;
}
export declare function PromptInputTextarea(props: PromptInputTextareaProps): React.ReactElement;
export declare function PromptInputAttachments(props: { className?: string }): React.ReactElement | null;
export declare function PromptInputToolbar(props: { className?: string; children?: React.ReactNode }): React.ReactElement;
export declare function PromptInputAttach(props: { label?: string }): React.ReactElement;
export declare function PromptInputSubmit(props: { className?: string }): React.ReactElement;

export interface ConversationProps extends React.HTMLAttributes<HTMLDivElement> { 'aria-label': string }
/** The thread between a person and an assistant: a log that follows to the bottom and announces answers once, when complete. */
export declare function Conversation(props: ConversationProps): React.ReactElement;
export declare function ConversationContent(props: React.HTMLAttributes<HTMLDivElement>): React.ReactElement;
/** "Jump to latest message", once the person has scrolled up. */
export declare function ConversationScrollButton(props: { className?: string }): React.ReactElement | null;
export type MessageStatus = 'streaming' | 'complete' | 'stopped' | 'error';
export interface MessageProps extends React.HTMLAttributes<HTMLElement> {
  from: 'user' | 'assistant';
  /** Streaming rests on a dashed rule; complete settles once; stopped and error are kept with Retry. Default 'complete'. */
  status?: MessageStatus;
  /** Who's speaking. Default "You" or "Assistant". */
  name?: string;
  onRetry?: () => void;
  /** A person's message that was edited and resent: "Edited" in its caption. */
  edited?: boolean;
}
export declare function Message(props: MessageProps): React.ReactElement;
export declare function MessageContent(props: React.HTMLAttributes<HTMLDivElement>): React.ReactElement;
export interface MessageAttachment {
  name: string;
  /** MIME type: image/* with a url is a thumbnail; anything else a file plate. */
  type?: string;
  /** Bytes, shown on a file plate. */
  size?: number;
  /** An image's thumbnail. */
  url?: string;
  /** An image's text alternative. Default its name. */
  alt?: string;
  href?: string;
  onOpen?: () => void;
  /** Expired or deleted: "No longer available", and it doesn't act. */
  unavailable?: boolean;
}
/** What was sent with a message, before its content: 64px thumbnails and settled Tag plates, in a list named "2 attachments". */
export declare function MessageAttachments(props: { items: MessageAttachment[] } & Omit<React.HTMLAttributes<HTMLUListElement>, 'children'>): React.ReactElement | null;
export interface ConversationCheckpointProps {
  /** What the point is before: "Before editing 6 files". */
  label: string;
  at?: Date | string | number;
  /** What restoring does, in words; it describes Restore and fills the confirmation. */
  consequence: string;
  /** Resolve when restored; reject (with a message) when it couldn't. */
  onRestore: () => void | Promise<unknown>;
  /** Real recovery: with it Restore runs at once and leaves "Return to where you were"; without it Restore asks in a Dialog. */
  onReturn?: () => void | Promise<unknown>;
  locale?: string;
  className?: string;
}
/** A point to go back to: a divider "Checkpoint · label · time" with Restore, through the consequential-action contract. */
export declare function ConversationCheckpoint(props: ConversationCheckpointProps): React.ReactElement;
export interface QueuedMessage { id: string; text: string }
export interface ConversationQueueProps {
  /** Messages written while the agent worked, in the order they'll be sent. */
  items: QueuedMessage[];
  /** Stop the current turn and send this one now. */
  onSendNow?: (id: string) => void;
  /** Edit opens it in place; called with the new text. */
  onEdit?: (id: string, text: string) => void;
  onRemove?: (id: string) => void;
  className?: string;
}
/** Queued messages between the thread and the composer: flush sheets with a dashed rim, "Queued · 1 of 2", Send now, Edit, Remove. */
export declare function ConversationQueue(props: ConversationQueueProps): React.ReactElement | null;
export interface MessageActionsProps {
  /** Shows Copy (the message's text, or this function's). */
  onCopy?: boolean | (() => string);
  onRegenerate?: () => void;
  onFeedback?: (value: 'up' | 'down' | null) => void;
  feedback?: 'up' | 'down' | null;
  /** Regenerated answers, or a person's edited message, kept as versions: "Version 2 of 2". Switching is announced. */
  versions?: { index: number; total: number; onChange: (index: number) => void };
  /** A person's message: an Edit action that opens it in place (Cancel, "Send edit"; Escape, Ctrl/⌘+Enter); called with the new text. */
  onEdit?: (text: string) => void;
  className?: string;
}
export declare function MessageActions(props: MessageActionsProps): React.ReactElement | null;

export type ConfirmationState = 'requested' | 'approved' | 'running' | 'done' | 'failed' | 'rejected' | 'expired';
export interface ConfirmationProps {
  state: ConfirmationState;
  title: React.ReactNode;
  /** The concrete consequence, in words. */
  consequence: React.ReactNode;
  /** What exactly would change: a DiffView, a list, a preview. */
  details?: React.ReactNode;
  approveLabel?: string;
  rejectLabel?: string;
  runningLabel?: string;
  doneLabel?: string;
  failedLabel?: string;
  /** Approving needs a hold, or a stationary Dialog for irreversible actions. */
  escalate?: 'hold' | 'dialog';
  resolvedBy?: string;
  resolvedAt?: Date | string | number;
  /** Who's asking. Default "The assistant". */
  requestedBy?: string;
  onApprove?: () => void;
  onReject?: () => void;
  onRetry?: () => void;
  className?: string;
}
/** Approve or reject an agent's proposal: raised while requested, pending once approved, kept in the record when resolved. */
export declare function Confirmation(props: ConfirmationProps): React.ReactElement;

export type TraceStepStatus = 'planned' | 'running' | 'done' | 'failed' | 'awaiting-approval';
export interface TraceProps extends React.OlHTMLAttributes<HTMLOListElement> { 'aria-label': string }
/** An agent's steps as a vertical Stepper: done flush and stamped, running raised, planned imprinted, failed in a trench. */
export declare function Trace(props: TraceProps): React.ReactElement;
export interface TraceParallelProps {
  /** What runs at once: "Subagents". */
  label: string;
  children: React.ReactNode;
  className?: string;
}
/** Steps that run at once, in a labelled group with a bracket: "Subagents · 3 in parallel · 2 of 3 done". A Trace inside a TraceStep is a nested run behind a lid. */
export declare function TraceParallel(props: TraceParallelProps): React.ReactElement;
export interface TraceStepProps {
  title: string;
  /** 'auto': derived from the steps inside (a nested Trace or TraceParallel): running while any runs, done only when all are. */
  status: TraceStepStatus | 'auto';
  /** Milliseconds it took. */
  duration?: number;
  /** Why it failed. */
  error?: React.ReactNode;
  onRetry?: () => void;
  /** Tool calls, reasoning, a Confirmation. */
  children?: React.ReactNode;
  className?: string;
}
export declare function TraceStep(props: TraceStepProps): React.ReactElement;
export interface TraceToolCallProps { name: string; input?: unknown; output?: unknown; defaultOpen?: boolean }
/** A tool call's input and output behind an Accordion lid. */
export declare function TraceToolCall(props: TraceToolCallProps): React.ReactElement;
export interface TraceReasoningProps { duration?: number; children: React.ReactNode }
/** Reasoning, closed by default behind "Thought for 12s". */
export declare function TraceReasoning(props: TraceReasoningProps): React.ReactElement;

export interface AISource { title: string; url?: string }
export interface AILabelProps {
  /** What it marks, for its name: "Summary generated with AI". Default "Content". */
  subject?: string;
  model?: string;
  generatedAt?: Date | string | number;
  sources?: AISource[];
  /** Confidence, in words. */
  confidence?: string;
  /** A person who reviewed it: the plate reads "Drafted with AI". */
  reviewedBy?: string;
  editedBy?: string;
  children?: React.ReactNode;
  className?: string;
}
/** Marks what AI made: a flush plate (no glow) that lifts and opens "About this content". */
export declare function AILabel(props: AILabelProps): React.ReactElement;

export interface CitationSource {
  title: string;
  url?: string;
  /** A passage from the source. */
  excerpt?: string;
  /** Couldn't be verified: a caution mark and "Unverified source". */
  unverified?: boolean;
}
export interface InlineCitationProps {
  /** Its number, from 1, matching Sources. */
  index: number;
  source: CitationSource;
  /** Where it goes. Default the source's entry in Sources. */
  href?: string;
  /** Shared with Sources. Default "source". */
  idPrefix?: string;
  className?: string;
}
/** A numbered source marker: a small flush plate named "Source 2: Billing FAQ", previewed on hover and focus. */
export declare function InlineCitation(props: InlineCitationProps): React.ReactElement;
export interface SourcesProps { items: CitationSource[]; heading?: string; idPrefix?: string; className?: string }
/** The sources an answer cites, as a flush ordered list. */
export declare function Sources(props: SourcesProps): React.ReactElement;
export interface SuggestionsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChoose'> {
  'aria-label': string;
  /** 'fill' (default) puts the text in the composer; 'send' sends it at once. */
  mode?: 'fill' | 'send';
  onChoose: (value: string) => void;
  /** Follow-ups cross-fade in. Default true inside a Message. */
  arrive?: boolean;
  children: React.ReactNode;
}
export interface SuggestionItemProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'value'> {
  /** Filled or sent instead of the label. */
  value?: string;
  children: React.ReactNode;
}
/** Prompts to start from or follow up with: small secondary buttons in a labelled group (a toolbar past four). */
export declare function Suggestions(props: SuggestionsProps): React.ReactElement;
export declare function Suggestion(props: SuggestionItemProps): React.ReactElement;
/** The elements a Markdown caller can replace. `pre` gets the fenced code's parts rather than children. */
export interface MarkdownComponents {
  a?: React.ComponentType<React.AnchorHTMLAttributes<HTMLAnchorElement>>;
  img?: React.ComponentType<React.ImgHTMLAttributes<HTMLImageElement>>;
  code?: React.ComponentType<React.HTMLAttributes<HTMLElement>>;
  pre?: React.ComponentType<{ code: string; language?: string; streaming?: boolean }>;
  table?: React.ComponentType<React.TableHTMLAttributes<HTMLTableElement>>;
  blockquote?: React.ComponentType<React.BlockquoteHTMLAttributes<HTMLQuoteElement>>;
}
export interface MarkdownProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** The Markdown source: CommonMark, plus GFM tables, task lists, strikethrough and bare links. */
  children: string;
  /** Still arriving: an open fence is a streaming CodeBlock, a table waits for its delimiter row and never draws a half row, an unclosed ** or link shows its words without the markers. */
  streaming?: boolean;
  /** Sources for `[n]` markers (1-based), rendered as InlineCitation. */
  citations?: CitationSource[];
  /** Passed to InlineCitation, as in Sources. */
  idPrefix?: string;
  /** Passed to every CodeBlock. */
  syntax?: (code: string, language?: string) => React.ReactNode;
  /** The element level of a `#` heading. Default 3. */
  headingLevel?: number;
  /** Replace the element used for a kind of node, e.g. `{ a: RouterLink }`. */
  components?: MarkdownComponents;
  /** Render raw HTML blocks. Default false: they show as text. Only for sources you trust. */
  allowHtml?: boolean;
  /** Rewrite or refuse (undefined) a URL. Default refuses javascript:, vbscript:, file: and data: (except images). */
  transformUrl?: (url: string, kind: 'link' | 'image') => string | undefined;
}
/** An answer's Markdown set as Altitude prose on the ground, handing code, links, citations and tables to their components. */
export declare const Markdown: React.ForwardRefExoticComponent<MarkdownProps & React.RefAttributes<HTMLDivElement>>;
/** The default URL rule: refuses javascript:, vbscript:, file: and non-image data: URLs. */
export declare function safeUrl(url: string, kind: 'link' | 'image'): string | undefined;
/** Parses Markdown into blocks (for tests and adapters). */
export declare function parseMarkdown(source: string, options?: { streaming?: boolean; allowHtml?: boolean }): unknown[];

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
export declare function SettingsSection(props: SettingsSectionProps): React.ReactElement;
export interface SettingsRowProps extends DepthProps {
  label: React.ReactNode;
  /** What the setting does, beside its label. */
  description?: React.ReactNode;
  /** Replaces the description and marks the control invalid. */
  error?: React.ReactNode;
  /** The words for an apply-now control's write. Defaults: pending "Saving…", committed "Saved", failed "Couldn't save this change. Try again." */
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
export declare function SettingsRow(props: SettingsRowProps): React.ReactElement;

declare global {
  interface Window {
    Altitude: {
      AltitudeProvider: typeof AltitudeProvider; Surface: typeof Surface; Button: typeof Button;
      Card: typeof Card; CardHeader: typeof CardHeader; CardTitle: typeof CardTitle; CardDescription: typeof CardDescription; CardContent: typeof CardContent; CardFooter: typeof CardFooter;
      Input: typeof Input; InlineEdit: typeof InlineEdit; EditRegion: typeof EditRegion; EditRegionView: typeof EditRegionView; EditRegionForm: typeof EditRegionForm; EditRegionTrigger: typeof EditRegionTrigger; EditRegionActions: typeof EditRegionActions; ItemGroup: typeof ItemGroup; RemovalReceipt: typeof RemovalReceipt; Item: typeof Item; ItemMedia: typeof ItemMedia; ItemContent: typeof ItemContent; ItemTitle: typeof ItemTitle; ItemDescription: typeof ItemDescription; ItemActions: typeof ItemActions; ItemSeparator: typeof ItemSeparator; PropertyList: typeof PropertyList; PropertyListItem: typeof PropertyListItem; Textarea: typeof Textarea; Field: typeof Field; Checkbox: typeof Checkbox; RadioGroup: typeof RadioGroup; Radio: typeof Radio; Switch: typeof Switch;
      Tabs: typeof Tabs; TabsList: typeof TabsList; TabsTrigger: typeof TabsTrigger; TabsContent: typeof TabsContent;
      Slider: typeof Slider; Progress: typeof Progress; Badge: typeof Badge; Avatar: typeof Avatar; AvatarGroup: typeof AvatarGroup;
      Skeleton: typeof Skeleton; Alert: typeof Alert; AlertStack: typeof AlertStack; Accordion: typeof Accordion; Kbd: typeof Kbd; useKeyboardLikely: typeof useKeyboardLikely;
      HoldButton: typeof HoldButton; Pile: typeof Pile; ScrollArea: typeof ScrollArea; DropZone: typeof DropZone; SortableList: typeof SortableList; Checklist: typeof Checklist; Drilldown: typeof Drilldown; Tree: typeof Tree; useDepth: typeof useDepth; useApproach: typeof useApproach;
      Tooltip: typeof Tooltip; Popover: typeof Popover; DropdownMenu: typeof DropdownMenu; Dialog: typeof Dialog; Toaster: typeof Toaster; toast: typeof toast;
      Sheet: typeof Sheet; SheetHeader: typeof SheetHeader; SheetTitle: typeof SheetTitle; SheetDescription: typeof SheetDescription; SheetFooter: typeof SheetFooter;
      CommandPalette: typeof CommandPalette; commandScore: typeof commandScore; checkScheme: typeof checkScheme;
      Select: typeof Select; SelectItem: typeof SelectItem; Combobox: typeof Combobox; TagInput: typeof TagInput; Tag: typeof Tag; DatePicker: typeof DatePicker; DateRangePicker: typeof DateRangePicker; datePresets: typeof datePresets; Calendar: typeof Calendar; Stepper: typeof Stepper; EmptyState: typeof EmptyState; ChartContainer: typeof ChartContainer; ChartMarker: typeof ChartMarker; BarChart: typeof BarChart; LineChart: typeof LineChart; AreaChart: typeof AreaChart; Heatmap: typeof Heatmap; ScatterChart: typeof ScatterChart; DotPlot: typeof DotPlot; ChartTooltip: typeof ChartTooltip; ChartTooltipContent: typeof ChartTooltipContent; ChartLegend: typeof ChartLegend; ChartLegendContent: typeof ChartLegendContent; linePath: typeof linePath; Sparkline: typeof Sparkline; Stat: typeof Stat; StatGroup: typeof StatGroup; Meter: typeof Meter; BarList: typeof BarList; useChart: typeof useChart;
      Board: typeof Board; Schedule: typeof Schedule; BoardColumn: typeof BoardColumn; BoardCard: typeof BoardCard; HoverCard: typeof HoverCard;
      Table: typeof Table; FilterBar: typeof FilterBar; filterValueText: typeof filterValueText; filterSentence: typeof filterSentence; TableHeader: typeof TableHeader; TableBody: typeof TableBody; TableFooter: typeof TableFooter; TableRow: typeof TableRow; TableHead: typeof TableHead; TableCell: typeof TableCell; TableCaption: typeof TableCaption; DataTable: typeof DataTable;
      Table: typeof Table; DataGrid: typeof DataGrid; TableHeader: typeof TableHeader; TableBody: typeof TableBody; TableFooter: typeof TableFooter; TableRow: typeof TableRow; TableHead: typeof TableHead; TableCell: typeof TableCell; TableCaption: typeof TableCaption; DataTable: typeof DataTable;
      deriveAccent: typeof deriveAccent; contrast: typeof contrast;
      Await: typeof Await; RevealGroup: typeof RevealGroup; readPromised: typeof readPromised; LoadingScope: typeof LoadingScope;
      SettingsSection: typeof SettingsSection; SettingsRow: typeof SettingsRow;
      InlineCitation: typeof InlineCitation; Sources: typeof Sources;
      Suggestions: typeof Suggestions; Suggestion: typeof Suggestion;
      Markdown: typeof Markdown; parseMarkdown: typeof parseMarkdown; safeUrl: typeof safeUrl;
      AILabel: typeof AILabel;
      Trace: typeof Trace; TraceParallel: typeof TraceParallel; TraceStep: typeof TraceStep; TraceToolCall: typeof TraceToolCall; TraceReasoning: typeof TraceReasoning;
      Confirmation: typeof Confirmation;
      Conversation: typeof Conversation; ConversationContent: typeof ConversationContent; ConversationScrollButton: typeof ConversationScrollButton; Message: typeof Message; MessageContent: typeof MessageContent; MessageAttachments: typeof MessageAttachments; ConversationQueue: typeof ConversationQueue; ConversationCheckpoint: typeof ConversationCheckpoint; MessageActions: typeof MessageActions;
      PromptInput: typeof PromptInput; PromptInputTextarea: typeof PromptInputTextarea; PromptInputAttachments: typeof PromptInputAttachments; PromptInputToolbar: typeof PromptInputToolbar; PromptInputAttach: typeof PromptInputAttach; PromptInputSubmit: typeof PromptInputSubmit;
      Tour: typeof Tour;
      CommentThread: typeof CommentThread;
      FeatureGate: typeof FeatureGate;
      PlanPicker: typeof PlanPicker;
      PermissionMatrix: typeof PermissionMatrix;
      SaveBar: typeof SaveBar;
      DiffView: typeof DiffView; diffLines: typeof diffLines;
      SyncIndicator: typeof SyncIndicator;
      NotificationCenter: typeof NotificationCenter; NotificationList: typeof NotificationList;
      Timeline: typeof Timeline; TimelineItem: typeof TimelineItem;
      SavedViews: typeof SavedViews; useSavedViews: typeof useSavedViews;
      ModeContext: typeof ModeContext;
      PrimaryScope: typeof PrimaryScope;
      ContextMenu: typeof ContextMenu;
      ResizablePanelGroup: typeof ResizablePanelGroup; ResizablePanel: typeof ResizablePanel; ResizableHandle: typeof ResizableHandle;
      AppShell: typeof AppShell; SidebarProvider: typeof SidebarProvider; Sidebar: typeof Sidebar; SidebarHeader: typeof SidebarHeader; SidebarContent: typeof SidebarContent; SidebarGroup: typeof SidebarGroup; SidebarGroupLabel: typeof SidebarGroupLabel; SidebarMenu: typeof SidebarMenu; SidebarMenuItem: typeof SidebarMenuItem; SidebarMenuButton: typeof SidebarMenuButton; SidebarMenuBadge: typeof SidebarMenuBadge; SidebarFooter: typeof SidebarFooter; SidebarTrigger: typeof SidebarTrigger; SidebarInset: typeof SidebarInset; useSidebar: typeof useSidebar;
      PageHeader: typeof PageHeader; PageHeaderTitle: typeof PageHeaderTitle; PageHeaderDescription: typeof PageHeaderDescription;
      Pagination: typeof Pagination; pageRange: typeof pageRange;
      Breadcrumb: typeof Breadcrumb; BreadcrumbList: typeof BreadcrumbList; BreadcrumbItem: typeof BreadcrumbItem; BreadcrumbLink: typeof BreadcrumbLink; BreadcrumbPage: typeof BreadcrumbPage; BreadcrumbSeparator: typeof BreadcrumbSeparator; BreadcrumbEllipsis: typeof BreadcrumbEllipsis;
      ColorPicker: typeof ColorPicker; ColorSwatchPicker: typeof ColorSwatchPicker;
      CodeBlock: typeof CodeBlock;
      SecretField: typeof SecretField;
      PasswordInput: typeof PasswordInput;
      TimeInput: typeof TimeInput;
      InputOTP: typeof InputOTP; InputOTPGroup: typeof InputOTPGroup; InputOTPSlot: typeof InputOTPSlot; InputOTPSeparator: typeof InputOTPSeparator;
      NumberInput: typeof NumberInput; parseNumber: typeof parseNumber;
      SplitButton: typeof SplitButton;
      Toolbar: typeof Toolbar; ToolbarGroup: typeof ToolbarGroup; ToolbarSeparator: typeof ToolbarSeparator; ToolbarButton: typeof ToolbarButton; ToolbarToggle: typeof ToolbarToggle;
      Toggle: typeof Toggle; ToggleGroup: typeof ToggleGroup; ToggleGroupItem: typeof ToggleGroupItem;
      CopyButton: typeof CopyButton;
      RelativeTime: typeof RelativeTime; formatRelativeTime: typeof formatRelativeTime;
      FormattedNumber: typeof FormattedNumber; formatNumber: typeof formatNumber; describeNumber: typeof describeNumber;
      Link: typeof Link;
      Separator: typeof Separator;
    };
  }
}

// Workflow declarations come from the runtime source; keep one authoritative contract.
export { useEditRecord, ErrorSummary, WorkflowStatus } from './src/pattern-edit-record';
export type { FieldErrors, EditRecordResult, EditRecordPhase, EditRecordOptions, LeaveReason, ErrorSummaryProps } from './src/pattern-edit-record';
export { useAsyncCollection } from './src/pattern-async-collection';
export type { AsyncCollectionOptions, CollectionPhase } from './src/pattern-async-collection';
export { useConsequentialAction } from './src/pattern-consequential-action';
export type { ConsequentialActionOptions, ConsequentialPhase, ActionResult, UndoResult } from './src/pattern-consequential-action';
export { useReviewSubmit } from './src/pattern-review-submit';
export type { ReviewSubmitOptions, ReviewSubmitResult } from './src/pattern-review-submit';
