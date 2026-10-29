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
  /** The page scales back 1.5% and desaturates while a dialog is open. Default true. */
  recede?: boolean;
  /** Openings react as a mouse or pen approaches: empty fields deepen, a sheet's finger pull opens. Raised things never move before the pointer is on them. Never for touch; off under reduced motion. Default true. */
  approach?: boolean;
}
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

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Digs the well to trench depth with a critical rim. Field sets it for you when it has an error. */
  invalid?: boolean;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  /** sm 32px, md 38px. Default 'md'. */
  size?: 'sm' | 'md';
}
export declare const Input: React.ForwardRefExoticComponent<InputProps & React.RefAttributes<HTMLInputElement>>;
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
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
}
export declare function Kbd(props: KbdProps): React.ReactElement;

export interface TooltipProps {
  content: React.ReactNode;
  /** Default 'top'. */
  side?: 'top' | 'bottom';
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
}
export type MenuEntry =
  | MenuItem
  | { type: 'separator' }
  | { type: 'label'; label: React.ReactNode };
export interface DropdownMenuProps {
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
export declare function ItemDescription(props: React.HTMLAttributes<HTMLParagraphElement>): React.ReactElement;
/** Visible actions, not hover-only. */
export declare function ItemActions(props: React.HTMLAttributes<HTMLDivElement>): React.ReactElement;
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
  /** The key hints along the bottom. Default true. */
  hints?: boolean;
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
export interface FilterBarProps {
  fields: FilterField[];
  value: Filter[];
  onValueChange: (filters: Filter[]) => void;
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
  /** Actions for the selected rows, shown beside their count. */
  actions?: (ids: string[]) => React.ReactNode;
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
}
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
  /** Pixels per hour. Default 48. */
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

export interface DropZoneProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onDrop'> {
  onFiles?: (files: File[]) => void;
  accept?: string;
  /** Default true. */
  multiple?: boolean;
  /** Force a visual state (documentation): idle, armed or over. */
  state?: 'idle' | 'armed' | 'over';
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
  orientation?: 'horizontal' | 'vertical';
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
  encode: (seriesKey: string) => ChartEncoding;
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
}
export type ChartMarkerShape = 'circle' | 'square' | 'triangle' | 'diamond' | 'ring' | 'cross';
export interface ChartEncoding {
  slot: ChartSlot;
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
  /** Width ÷ height of the plot. Default 2, unless `height` is set. */
  aspect?: number;
  /** The plot's height in px, instead of an aspect ratio. */
  height?: number;
  /** A visible name, inside the figure. Leave it out when a CardTitle names the chart, and pass `aria-labelledby`. */
  title?: React.ReactNode;
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
export interface ChartLegendItem { key: string; label: string; fill: string; stroke: string; dash?: string; hidden: boolean; /** The series' marker shape, for a 'marker' swatch. */ marker?: ChartMarkerShape; }
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

declare global {
  interface Window {
    Altitude: {
      AltitudeProvider: typeof AltitudeProvider; Surface: typeof Surface; Button: typeof Button;
      Card: typeof Card; CardHeader: typeof CardHeader; CardTitle: typeof CardTitle; CardDescription: typeof CardDescription; CardContent: typeof CardContent; CardFooter: typeof CardFooter;
      Input: typeof Input; InlineEdit: typeof InlineEdit; EditRegion: typeof EditRegion; EditRegionView: typeof EditRegionView; EditRegionForm: typeof EditRegionForm; EditRegionTrigger: typeof EditRegionTrigger; EditRegionActions: typeof EditRegionActions; ItemGroup: typeof ItemGroup; RemovalReceipt: typeof RemovalReceipt; Item: typeof Item; ItemMedia: typeof ItemMedia; ItemContent: typeof ItemContent; ItemTitle: typeof ItemTitle; ItemDescription: typeof ItemDescription; ItemActions: typeof ItemActions; ItemSeparator: typeof ItemSeparator; PropertyList: typeof PropertyList; PropertyListItem: typeof PropertyListItem; Textarea: typeof Textarea; Field: typeof Field; Checkbox: typeof Checkbox; RadioGroup: typeof RadioGroup; Radio: typeof Radio; Switch: typeof Switch;
      Tabs: typeof Tabs; TabsList: typeof TabsList; TabsTrigger: typeof TabsTrigger; TabsContent: typeof TabsContent;
      Slider: typeof Slider; Progress: typeof Progress; Badge: typeof Badge; Avatar: typeof Avatar; AvatarGroup: typeof AvatarGroup;
      Skeleton: typeof Skeleton; Alert: typeof Alert; AlertStack: typeof AlertStack; Accordion: typeof Accordion; Kbd: typeof Kbd;
      HoldButton: typeof HoldButton; Pile: typeof Pile; ScrollArea: typeof ScrollArea; DropZone: typeof DropZone; SortableList: typeof SortableList; Checklist: typeof Checklist; Drilldown: typeof Drilldown; Tree: typeof Tree; useDepth: typeof useDepth; useApproach: typeof useApproach;
      Tooltip: typeof Tooltip; Popover: typeof Popover; DropdownMenu: typeof DropdownMenu; Dialog: typeof Dialog; Toaster: typeof Toaster; toast: typeof toast;
      Sheet: typeof Sheet; SheetHeader: typeof SheetHeader; SheetTitle: typeof SheetTitle; SheetDescription: typeof SheetDescription; SheetFooter: typeof SheetFooter;
      CommandPalette: typeof CommandPalette; commandScore: typeof commandScore; checkScheme: typeof checkScheme;
      Select: typeof Select; SelectItem: typeof SelectItem; Combobox: typeof Combobox; TagInput: typeof TagInput; Tag: typeof Tag; DatePicker: typeof DatePicker; DateRangePicker: typeof DateRangePicker; datePresets: typeof datePresets; Calendar: typeof Calendar; Stepper: typeof Stepper; EmptyState: typeof EmptyState; ChartContainer: typeof ChartContainer; ChartMarker: typeof ChartMarker; BarChart: typeof BarChart; LineChart: typeof LineChart; AreaChart: typeof AreaChart; Heatmap: typeof Heatmap; ScatterChart: typeof ScatterChart; ChartTooltip: typeof ChartTooltip; ChartTooltipContent: typeof ChartTooltipContent; ChartLegend: typeof ChartLegend; ChartLegendContent: typeof ChartLegendContent; linePath: typeof linePath; Sparkline: typeof Sparkline; Stat: typeof Stat; StatGroup: typeof StatGroup; Meter: typeof Meter; BarList: typeof BarList; useChart: typeof useChart;
      Board: typeof Board; Schedule: typeof Schedule; BoardColumn: typeof BoardColumn; BoardCard: typeof BoardCard; HoverCard: typeof HoverCard;
      Table: typeof Table; FilterBar: typeof FilterBar; filterValueText: typeof filterValueText; TableHeader: typeof TableHeader; TableBody: typeof TableBody; TableFooter: typeof TableFooter; TableRow: typeof TableRow; TableHead: typeof TableHead; TableCell: typeof TableCell; TableCaption: typeof TableCaption; DataTable: typeof DataTable;
      Table: typeof Table; DataGrid: typeof DataGrid; TableHeader: typeof TableHeader; TableBody: typeof TableBody; TableFooter: typeof TableFooter; TableRow: typeof TableRow; TableHead: typeof TableHead; TableCell: typeof TableCell; TableCaption: typeof TableCaption; DataTable: typeof DataTable;
      deriveAccent: typeof deriveAccent; contrast: typeof contrast;
      Await: typeof Await; RevealGroup: typeof RevealGroup; readPromised: typeof readPromised; LoadingScope: typeof LoadingScope;
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
