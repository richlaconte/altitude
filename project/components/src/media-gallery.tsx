import * as React from 'react';
import { cx, Icons } from './core';
import { Button } from './controls';
import { Dialog } from './overlays';

/* MediaGallery (#632): inspect a product through images and playable previews without leaving its page. The media is
   the record, so the stage lies on the ground; only controls live above it. Every preview has a thumbnail, all of them
   visible and wrapping onto more lines, never truncated behind dots (Baymard: dots or text alone left 50% of testers
   unable to find additional images; truncated thumbnails were overlooked by 50–80%). Video, audio and custom previews
   sit in the same set with a kind icon and word (Baymard: splitting them into tabs troubled a third of testers).
   Thumbnails are ordinary buttons (APG carousel, grouped pickers) named for what they show; the current one has
   aria-current and a 2px accent-ink outline, never extra height. Nothing rotates or plays by itself (WCAG 1.4.2, 2.2.2).
   Only the active item is mounted, so switching can't leave hidden media playing, and a custom renderer's unmount is
   its signal to stop work. The gallery adds no key handlers to the stage, so an embedded renderer keeps its keys. */

interface MediaBase {
  /** Stable id. Selection is by id, so reordering or refreshing `items` keeps it. */
  id: string;
  /** What the preview shows ("Turntable", "Bark texture close-up"). Names its thumbnail and the position line. */
  label: string;
  /** A small image for the thumbnail. Without one the thumbnail shows the kind's icon. */
  thumbnail?: string;
  caption?: React.ReactNode;
}
export interface MediaImage extends MediaBase { kind: 'image'; src: string; alt: string; srcSet?: string; sizes?: string }
export interface MediaTrack { src: string; kind: 'captions' | 'subtitles' | 'descriptions'; srcLang: string; label: string; default?: boolean }
export interface MediaVideo extends MediaBase { kind: 'video'; src: string; type?: string; poster?: string; tracks?: MediaTrack[]; transcript?: React.ReactNode }
export interface MediaAudio extends MediaBase { kind: 'audio'; src: string; type?: string; poster?: string; transcript?: React.ReactNode }
export interface MediaCustom extends MediaBase {
  kind: 'custom';
  /** A still shown while the renderer loads, if it fails, or when there's no renderer. */
  poster?: string;
  /** What the preview shows, in words: the alternative to the renderer. */
  alt: string;
  /** The kind word in the thumbnail's name ("3D model", "Model poster (not interactive)"). Default "Interactive preview". */
  kindLabel?: string;
}
export type MediaItem = MediaImage | MediaVideo | MediaAudio | MediaCustom;

export interface MediaGalleryProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Names the gallery ("Pine forest pack previews"). Don't include the word "carousel". */
  'aria-label': string;
  items: MediaItem[];
  /** The active item's id. */
  value: string;
  onValueChange: (id: string) => void;
  /** Renders a custom item. Mounted only while it's active; unmounting is the signal to stop work. */
  renderCustom?: (item: MediaCustom, state: { active: true }) => React.ReactNode;
  /** Failures you know of, by item id ("Preview unavailable in your region"). */
  error?: Record<string, string>;
  /** Offered as "Retry preview" when an item fails. The gallery also remounts the item. */
  onRetry?: (id: string) => void;
  /** Adds "View larger", opening the same gallery in a Dialog. */
  enlargeable?: boolean;
  /** The stage's shape, reserved before anything loads so nothing shifts. Default '4 / 3'. */
  aspectRatio?: string;
}

const svg = (paths: React.ReactNode, size = 16) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths}</svg>
);
const KindIcon = ({ kind, size = 16 }: { kind: MediaItem['kind']; size?: number }) =>
  kind === 'video' ? svg(<path d="M8 5.5v13l10.5-6.5z" />, size)
  : kind === 'audio' ? svg(<path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2" />, size)
  : kind === 'custom' ? svg(<><path d="M12 3 20 7.5v9L12 21l-8-4.5v-9z" /><path d="M4 7.5 12 12l8-4.5M12 12v9" /></>, size)
  : svg(<><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><circle cx="9" cy="10" r="1.75" /><path d="m20.5 16-5-5-9 8.5" /></>, size);
const Chevron = ({ dir }: { dir: 'left' | 'right' }) => svg(<path d={dir === 'left' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />);
const Expand = () => svg(<><path d="M15 3h6v6" /><path d="M9 21H3v-6" /><path d="M21 3l-7 7" /><path d="M3 21l7-7" /></>);

const mediaKindWord = (item: MediaItem) =>
  item.kind === 'image' ? 'image' : item.kind === 'video' ? 'video' : item.kind === 'audio' ? 'audio' : (item.kindLabel ?? 'Interactive preview');

class CustomBoundary extends React.Component<{ fallback: React.ReactNode; children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

/** Images and playable previews of one product: a stage on the ground, every thumbnail visible, nothing playing by itself. */
export function MediaGallery(props: MediaGalleryProps) {
  const { enlargeable, ...rest } = props;
  const [large, setLarge] = React.useState(false);
  return (
    <>
      <GalleryCore {...rest} enlarge={enlargeable ? () => setLarge(true) : undefined} parked={large} />
      {enlargeable && (
        <Dialog open={large} onOpenChange={setLarge} title={props['aria-label']} size="lg" initialFocus="title" className="alt-media-dialog">
          <GalleryCore {...rest} aria-label={`${props['aria-label']}, larger`} />
        </Dialog>
      )}
    </>
  );
}

function GalleryCore({ 'aria-label': label, items, value, onValueChange, renderCustom, error, onRetry, aspectRatio = '4 / 3', enlarge, parked, className, style, ...rest }:
  Omit<MediaGalleryProps, 'enlargeable'> & { enlarge?: () => void; parked?: boolean }) {
  const id = React.useId();
  const lastIndex = React.useRef(0);
  const [said, setSaid] = React.useState('');
  const [nonce, setNonce] = React.useState<Record<string, number>>({});
  const found = items.findIndex((i) => i.id === value);
  // When the active item disappears, fall back to the item now at its position (or the last one), and say so.
  const index = found >= 0 ? found : Math.min(lastIndex.current, items.length - 1);
  const active = index >= 0 ? items[index] : undefined;
  const removed = found < 0 && !!active;
  React.useEffect(() => { if (found >= 0) lastIndex.current = found; }, [found]);
  // The removal is said once, with the item now shown; the selection change that follows stays quiet.
  const removal = React.useRef(false);
  React.useEffect(() => {
    if (removed && active) {
      removal.current = true;
      setSaid(`That preview was removed. Showing ${index + 1} of ${items.length}: ${active.label}`);
      onValueChange(active.id);
    }
  }, [removed, active, index, items.length, onValueChange]);
  // Announce a settled selection once; not on first render.
  const first = React.useRef(true);
  React.useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (removal.current) { removal.current = false; return; }
    if (found >= 0 && active) setSaid(`Showing ${index + 1} of ${items.length}: ${active.label}`);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!active) return <div className={cx('alt-media', className)} role="group" aria-label={label} {...rest}><p className="alt-media-empty">No previews yet.</p></div>;
  const go = (step: number) => onValueChange(items[(index + step + items.length) % items.length].id);
  const retry = (itemId: string) => { setNonce((n) => ({ ...n, [itemId]: (n[itemId] ?? 0) + 1 })); onRetry?.(itemId); };
  const position = `Preview ${index + 1} of ${items.length}`;

  return (
    <div className={cx('alt-media', className)} role="group" aria-label={label} style={style} {...rest}>
      <figure className="alt-media-figure" aria-labelledby={`${id}-cap`}>
        <div className="alt-media-stage" style={{ aspectRatio }}>
          {parked
            ? <div className="alt-media-parked"><KindIcon kind={active.kind} size={24} /><span>Shown in the larger view</span></div>
            : <Stage key={`${active.id}:${nonce[active.id] ?? 0}`} item={active} renderCustom={renderCustom} hostError={error?.[active.id]}
                onRetry={onRetry ? () => retry(active.id) : undefined} />}
        </div>
        <figcaption className="alt-media-caption" id={`${id}-cap`}>
          <span className="alt-media-title">{active.label}</span>
          <span className="alt-media-pos">{position}</span>
          {active.caption && <span className="alt-media-text">{active.caption}</span>}
        </figcaption>
      </figure>
      {(active.kind === 'video' || active.kind === 'audio') && active.transcript && (
        <details className="alt-media-transcript"><summary>Transcript: {active.label}</summary><div className="alt-media-transcript-body">{active.transcript}</div></details>
      )}
      <div className="alt-media-bar">
        {items.length > 1 && <Button variant="secondary" size="sm" square aria-label="Previous preview" onClick={() => go(-1)}><Chevron dir="left" /></Button>}
        {items.length > 1 && (
          <ul className="alt-media-thumbs" aria-label="Choose a preview" role="list">
            {items.map((it, i) => (
              <li key={it.id}>
                <button type="button" className="alt-media-thumb" aria-current={i === index ? 'true' : undefined}
                  aria-label={`${it.label}, ${mediaKindWord(it)}`} onClick={() => onValueChange(it.id)}>
                  {it.thumbnail ? <img src={it.thumbnail} alt="" draggable={false} /> : <span className="alt-media-thumb-icon"><KindIcon kind={it.kind} size={20} /></span>}
                  {it.kind !== 'image' && it.thumbnail && <span className="alt-media-thumb-kind"><KindIcon kind={it.kind} size={12} /></span>}
                </button>
              </li>
            ))}
          </ul>
        )}
        {items.length > 1 && <Button variant="secondary" size="sm" square aria-label="Next preview" onClick={() => go(1)}><Chevron dir="right" /></Button>}
        {enlarge && <Button variant="ghost" size="sm" leading={<Expand />} onClick={enlarge} aria-haspopup="dialog" className="alt-media-enlarge">View larger</Button>}
      </div>
      <span className="alt-sr" role="status" aria-live="polite">{said}</span>
    </div>
  );
}

type Load = 'loading' | 'ready' | 'error' | 'unsupported';

function Stage({ item, renderCustom, hostError, onRetry }: { item: MediaItem; renderCustom?: MediaGalleryProps['renderCustom']; hostError?: string; onRetry?: () => void }) {
  const [load, setLoad] = React.useState<Load>(item.kind === 'image' ? 'loading' : 'ready');
  const img = React.useRef<HTMLImageElement>(null);
  React.useEffect(() => { const el = img.current; if (el?.complete) setLoad(el.naturalWidth > 0 ? 'ready' : 'error'); }, []);
  const mediaError = (e: React.SyntheticEvent<HTMLMediaElement>) => setLoad(e.currentTarget.error?.code === 4 ? 'unsupported' : 'error');

  if (hostError || load === 'error' || load === 'unsupported') {
    const message = hostError ?? (load === 'unsupported'
      ? `This browser can't play this ${item.kind === 'audio' ? 'audio' : 'video'}.`
      : "We couldn't load this preview.");
    const hasTranscript = (item.kind === 'video' || item.kind === 'audio') && !!item.transcript;
    return (
      <div className="alt-media-failed" data-state="failed">
        <Icons.AlertCircle size={20} />
        <p>{message}{hasTranscript ? ' The transcript is below.' : ''}</p>
        {onRetry && <Button size="sm" leading={<Icons.Refresh size={16} />} onClick={onRetry}>Retry preview</Button>}
      </div>
    );
  }
  switch (item.kind) {
    case 'image':
      return (
        <div className="alt-media-frame" data-state={load}>
          <img ref={img} src={item.src} srcSet={item.srcSet} sizes={item.sizes} alt={item.alt} onLoad={() => setLoad('ready')} onError={() => setLoad('error')} />
          {load === 'loading' && <span className="alt-sr">Loading preview</span>}
        </div>
      );
    case 'video':
      return (
        <div className="alt-media-frame" data-state="ready">
          <video controls preload="metadata" poster={item.poster} onError={mediaError} playsInline aria-label={item.label}>
            <source src={item.src} type={item.type} onError={() => setLoad('error')} />
            {item.tracks?.map((t) => <track key={t.src} src={t.src} kind={t.kind} srcLang={t.srcLang} label={t.label} default={t.default} />)}
          </video>
        </div>
      );
    case 'audio':
      return (
        <div className="alt-media-frame alt-media-audio" data-state="ready">
          {item.poster ? <img src={item.poster} alt="" className="alt-media-audio-art" /> : <span className="alt-media-audio-icon"><KindIcon kind="audio" size={32} /></span>}
          <audio controls preload="metadata" onError={mediaError} aria-label={item.label}>
            <source src={item.src} type={item.type} onError={() => setLoad('error')} />
          </audio>
        </div>
      );
    case 'custom': {
      const poster = (
        <div className="alt-media-frame alt-media-poster" data-state="ready">
          {item.poster ? <img src={item.poster} alt={item.alt} /> : <p className="alt-media-alt">{item.alt}</p>}
        </div>
      );
      return renderCustom ? <div className="alt-media-frame alt-media-custom" data-state="ready"><CustomBoundary fallback={poster}>{renderCustom(item, { active: true })}</CustomBoundary></div> : poster;
    }
  }
}
