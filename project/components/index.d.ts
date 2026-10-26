import type * as React from 'react';

/** The eight rungs of the elevation ladder. Negative = sunk into the ground, positive = raised above it. */
export type Level = -2 | -1 | 0 | 1 | 2 | 3 | 4 | 5;
export type BuiltInScheme = 'daylight' | 'nightfall' | 'mesa' | 'alpine';
/** A built-in scheme, or the name of your own [data-theme="…"] block. */
export type Scheme = BuiltInScheme | (string & {});
export type SchemeColorToken = 'surface-trench' | 'surface-well' | 'surface-ground' | 'surface-raised' | 'surface-lifted' | 'surface-floating' | 'surface-overlay' | 'surface-modal'
  | 'ink' | 'ink-muted' | 'ink-faint' | 'line' | 'line-control' | 'accent' | 'on-accent' | 'accent-ink' | 'accent-soft'
  | 'positive' | 'positive-soft' | 'caution' | 'caution-soft' | 'critical' | 'critical-soft' | 'on-critical'
  | 'presence-1' | 'presence-2' | 'presence-3' | 'on-presence' | 'scrim';
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
export declare function TabsContent(props: React.HTMLAttributes<HTMLDivElement> & { value: string }): React.ReactElement | null;

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
export declare function Slider(props: SliderProps): React.ReactElement;

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
export type InlineEditSaveResult = { ok: true; value: string } | { ok: false; error: string };
export interface InlineEditProps {
  value: string;
  onValueChange: (canonicalValue: string) => void;
  onSave: (draft: string, context: { previousValue: string }) => InlineEditSaveResult | Promise<InlineEditSaveResult>;
  label: string;
  validate?: (draft: string) => string | undefined | Promise<string | undefined>;
  required?: boolean;
  maxLength?: number;
  disabled?: boolean;
  editLabel?: string;
  saveLabel?: string;
  cancelLabel?: string;
  /** Used only when completion still owns focus and the Edit button cannot receive it. */
  focusFallback?: () => HTMLElement | null;
  className?: string;
}
export declare function InlineEdit(props: InlineEditProps): React.ReactElement;

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
}
export declare function BoardColumn(props: BoardColumnProps): React.ReactElement;
export interface BoardCardProps extends React.HTMLAttributes<HTMLDivElement> {
  id: string;
  /** How announcements name the card. Default: its first line of text. */
  label?: string;
  /** A collaborator is holding it: lifted, in their presence colour, wearing their name. It can't be picked up meanwhile. */
  heldBy?: { name: string; presence?: 1 | 2 | 3 };
  /** Afterglow: when this value changes the card arrives tinted and lifted, then settles. */
  settle?: unknown;
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

export interface DrillNode { id: string; title: React.ReactNode; description?: React.ReactNode; content?: React.ReactNode; children?: DrillNode[] }
export interface DrilldownProps extends React.HTMLAttributes<HTMLDivElement> { root: DrillNode }
/** Descend into children, ascend back; the breadcrumb steps down a notch per level. */
export declare function Drilldown(props: DrilldownProps): React.ReactElement;

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
 * Returns one sentence per problem; [] passes.
 */
export declare function checkScheme(colors: Partial<Record<SchemeColorToken, string>> | Element): string[];

declare global {
  interface Window {
    Altitude: {
      AltitudeProvider: typeof AltitudeProvider; Surface: typeof Surface; Button: typeof Button;
      Card: typeof Card; CardHeader: typeof CardHeader; CardTitle: typeof CardTitle; CardDescription: typeof CardDescription; CardContent: typeof CardContent; CardFooter: typeof CardFooter;
      Input: typeof Input; InlineEdit: typeof InlineEdit; Textarea: typeof Textarea; Field: typeof Field; Checkbox: typeof Checkbox; RadioGroup: typeof RadioGroup; Radio: typeof Radio; Switch: typeof Switch;
      Tabs: typeof Tabs; TabsList: typeof TabsList; TabsTrigger: typeof TabsTrigger; TabsContent: typeof TabsContent;
      Slider: typeof Slider; Progress: typeof Progress; Badge: typeof Badge; Avatar: typeof Avatar; AvatarGroup: typeof AvatarGroup;
      Skeleton: typeof Skeleton; Alert: typeof Alert; AlertStack: typeof AlertStack; Accordion: typeof Accordion; Kbd: typeof Kbd;
      HoldButton: typeof HoldButton; Pile: typeof Pile; ScrollArea: typeof ScrollArea; DropZone: typeof DropZone; SortableList: typeof SortableList; Drilldown: typeof Drilldown; useDepth: typeof useDepth; useApproach: typeof useApproach;
      Tooltip: typeof Tooltip; Popover: typeof Popover; DropdownMenu: typeof DropdownMenu; Dialog: typeof Dialog; Toaster: typeof Toaster; toast: typeof toast;
      Sheet: typeof Sheet; SheetHeader: typeof SheetHeader; SheetTitle: typeof SheetTitle; SheetDescription: typeof SheetDescription; SheetFooter: typeof SheetFooter;
      CommandPalette: typeof CommandPalette; commandScore: typeof commandScore; checkScheme: typeof checkScheme;
      Select: typeof Select; SelectItem: typeof SelectItem; Combobox: typeof Combobox; Stepper: typeof Stepper; EmptyState: typeof EmptyState;
      Board: typeof Board; BoardColumn: typeof BoardColumn; BoardCard: typeof BoardCard; HoverCard: typeof HoverCard;
      Table: typeof Table; FilterBar: typeof FilterBar; filterValueText: typeof filterValueText; TableHeader: typeof TableHeader; TableBody: typeof TableBody; TableFooter: typeof TableFooter; TableRow: typeof TableRow; TableHead: typeof TableHead; TableCell: typeof TableCell; TableCaption: typeof TableCaption; DataTable: typeof DataTable;
      deriveAccent: typeof deriveAccent; contrast: typeof contrast;
      Await: typeof Await; RevealGroup: typeof RevealGroup; readPromised: typeof readPromised; LoadingScope: typeof LoadingScope;
    };
  }
}
