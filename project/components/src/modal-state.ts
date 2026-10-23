import * as React from 'react';

/** Private document-scoped modal ownership. It deliberately has no public export. */
declare const process: { env: { NODE_ENV?: string } };
export interface ModalProvider {
  stage: HTMLElement | null;
  parent: ModalProvider | null;
  recede: boolean;
  owners: Set<ModalOwner>;
  legacy: Set<symbol>;
}
export const AltitudeContext = React.createContext<{ host: HTMLElement | null; provider: ModalProvider } | null>(null);
export const useAltitudeContext = () => React.useContext(AltitudeContext);
export interface ModalOwner {
  panel: HTMLElement;
  root: HTMLElement;
  provider: ModalProvider | null;
  open: boolean;
  modal: boolean;
  summit: boolean;
  background: 'recede' | 'stationary';
  invoker: HTMLElement | null;
  autoFocus: boolean;
  restoreFocus: boolean;
  focusSelector: string;
  returnFocus?: () => HTMLElement | null;
  retired: boolean;
  lastFocus?: HTMLElement | null;
}
const documents = new WeakMap<Document, ModalDocument>();
const candidates = 'button, [href], input, textarea, select, [tabindex], [contenteditable="true"], summary, audio[controls], video[controls]';
export function focusable(el: HTMLElement | null, doc?: Document): el is HTMLElement {
  if (!el?.isConnected || (doc && el.ownerDocument !== doc) || el.closest('[inert], [hidden]') || el.matches(':disabled, [aria-disabled="true"]')) return false;
  const style = el.ownerDocument.defaultView!.getComputedStyle(el);
  return style.visibility !== 'hidden' && style.visibility !== 'collapse' && !!el.getClientRects().length && el.matches(candidates);
}
export function tabbables(panel: HTMLElement) {
  return Array.from(panel.querySelectorAll<HTMLElement>(candidates)).filter(el => el.tabIndex >= 0 && focusable(el));
}
function putFocus(el: HTMLElement | null, doc: Document) {
  if (!focusable(el, doc)) return false;
  el.focus({ preventScroll: true });
  return doc.activeElement === el;
}
function focusInside(owner: ModalOwner, initial = false) {
  const { panel } = owner;
  if (initial && owner.autoFocus) {
    // Selectors may match more than one control; hidden and disabled matches never receive initial focus.
    for (const el of Array.from(panel.querySelectorAll<HTMLElement>(owner.focusSelector))) if (putFocus(el, panel.ownerDocument)) return;
  }
  panel.focus({ preventScroll: true });
}
class ModalDocument {
  owners: ModalOwner[] = [];
  active: ModalOwner | null = null;
  inert = new Map<HTMLElement, string | null>();
  stages = new Set<HTMLElement>();
  legacyProviders = new Set<ModalProvider>();
  listeners = new Set<() => void>();
  observer: MutationObserver | null = null;
  overflow: { value: string; priority: string } | null = null;
  live: HTMLElement | null = null;
  said = new Set<number>();
  constructor(readonly doc: Document) {}
  vote(provider: ModalProvider) {
    const token = Symbol('legacy recession');
    provider.legacy.add(token); this.legacyProviders.add(provider); this.reconcile();
    return () => { provider.legacy.delete(token); if (!provider.legacy.size) this.legacyProviders.delete(provider); this.reconcile(); };
  }
  releaseProvider(provider: ModalProvider) { provider.legacy.clear(); this.legacyProviders.delete(provider); this.reconcile(); }
  notify = () => this.listeners.forEach(f => f());
  guard = (event: FocusEvent) => {
    if (this.active && !this.active.panel.contains(event.target as Node)) focusInside(this.active);
  };
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  add(owner: ModalOwner) {
    const previous = this.owners.find(o => o.summit && !o.retired);
    if (owner.summit && previous?.open) {
      // React production builds replace NODE_ENV, so expected collision warnings stay in development only.
      if (process.env.NODE_ENV !== 'production') console.warn('Altitude: only one Dialog or CommandPalette may occupy the summit. Close this competing request before opening it again.');
      owner.retired = true;
      return false;
    }
    if (owner.summit && previous) {
      if (previous.panel.contains(owner.invoker)) owner.invoker = previous.invoker;
      previous.retired = true;
      previous.root.hidden = true;
      previous.panel.removeAttribute('aria-modal');
      previous.provider?.owners.delete(previous);
      this.owners = this.owners.filter(o => o !== previous);
    }
    owner.provider?.owners.add(owner);
    this.owners.push(owner);
    this.reconcile(true);
    if (!owner.modal && !this.active && owner.autoFocus) focusInside(owner, true);
    return true;
  }
  remove(owner: ModalOwner) {
    if (!this.owners.includes(owner)) return;
    const wasActive = this.active === owner;
    this.owners = this.owners.filter(o => o !== owner);
    owner.provider?.owners.delete(owner);
    this.reconcile();
    if ((!wasActive && owner.modal) || !owner.restoreFocus) return;
    if (this.active) {
      // A Sheet resumes at its invoking control; a later summit always keeps its own focus.
      if (!this.active.panel.contains(this.doc.activeElement)) {
        if (!(this.active.panel.contains(owner.invoker) && putFocus(owner.invoker, this.doc))) focusInside(this.active);
      }
      return;
    }
    const current = this.doc.activeElement as HTMLElement | null;
    if (current !== this.doc.body && !owner.root.contains(current) && focusable(current, this.doc)) return;
    if (putFocus(owner.invoker, this.doc) || putFocus(owner.returnFocus?.() ?? null, this.doc)) return;
    let provider = owner.provider;
    while (provider) {
      const stage = provider.stage;
      if (stage?.isConnected && !stage.closest('[inert]') && stage.getClientRects().length) {
        const original = stage.getAttribute('tabindex');
        stage.tabIndex = -1;
        stage.focus({ preventScroll: true });
        if (original === null) stage.removeAttribute('tabindex'); else stage.setAttribute('tabindex', original);
        return;
      }
      provider = provider.parent;
    }
    this.doc.body.focus({ preventScroll: true });
  }
  reconcile(initial = false) {
    const before = this.active;
    if (before?.panel.contains(this.doc.activeElement)) before.lastFocus = this.doc.activeElement as HTMLElement;
    const modals = this.owners.filter(o => o.modal && !o.retired && o.root.isConnected);
    this.active = [...modals].reverse().find(o => o.summit) ?? modals[modals.length - 1] ?? null;
    const active = this.active;
    if (active && !this.overflow) {
      const style = this.doc.body.style;
      this.overflow = { value: style.getPropertyValue('overflow'), priority: style.getPropertyPriority('overflow') };
      style.setProperty('overflow', 'hidden');
      this.doc.addEventListener('focusin', this.guard, true);
      this.observer = new MutationObserver(() => this.reconcile());
      this.observer.observe(this.doc.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden', 'disabled', 'tabindex'] });
    }
    const required = new Set<HTMLElement>();
    if (active) {
      let branch: HTMLElement | null = active.root;
      while (branch && branch !== this.doc.body) {
        const parent: HTMLElement | null = branch.parentElement;
        if (!parent) break;
        for (const sibling of Array.from(parent.children)) if (sibling !== branch && sibling.nodeType === 1) required.add(sibling as HTMLElement);
        branch = parent;
      }
    }
    for (const [el, original] of this.inert) if (!required.has(el)) {
      if (original === null) el.removeAttribute('inert'); else el.setAttribute('inert', original);
      this.inert.delete(el);
    }
    for (const el of required) if (!this.inert.has(el)) { this.inert.set(el, el.getAttribute('inert')); el.setAttribute('inert', ''); }
    for (const stage of this.stages) stage.removeAttribute('data-receded');
    this.stages.clear();
    for (const owner of this.owners) {
      if (owner.modal && owner === active) owner.panel.setAttribute('aria-modal', 'true'); else owner.panel.removeAttribute('aria-modal');
      owner.root.toggleAttribute('data-modal-stationary', active?.background === 'stationary');
      const stage = owner.provider?.stage;
      if (owner.modal && stage && owner.provider?.recede && active && active.background !== 'stationary' && !stage.contains(active.root)) {
        stage.setAttribute('data-receded', ''); this.stages.add(stage);
      }
    }
    for (const provider of this.legacyProviders) {
      const stage = provider.stage;
      if (stage && provider.recede && active?.background !== 'stationary' && (!active || !stage.contains(active.root))) {
        stage.setAttribute('data-receded', ''); this.stages.add(stage);
      }
    }
    if (before !== active) {
      this.live?.remove(); this.live = null; this.said.clear();
      if (active) {
        this.live = this.doc.createElement('span'); this.live.className = 'alt-sr'; this.live.dataset.modalAnnouncements = '';
        this.live.setAttribute('aria-live', 'polite'); this.live.setAttribute('aria-relevant', 'additions'); active.panel.append(this.live);
      }
      this.notify();
    }
    if (!active && this.overflow) {
      const style = this.doc.body.style;
      if (style.getPropertyValue('overflow') === 'hidden' && !style.getPropertyPriority('overflow')) {
        if (this.overflow.value) style.setProperty('overflow', this.overflow.value, this.overflow.priority); else style.removeProperty('overflow');
      }
      this.overflow = null; this.observer?.disconnect(); this.observer = null; this.doc.removeEventListener('focusin', this.guard, true);
    }
    if (active && !active.panel.contains(this.doc.activeElement)) {
      if (!(before !== active && active.lastFocus && putFocus(active.lastFocus, this.doc))) focusInside(active, initial || before !== active);
    }
  }
  announce(id: number, message: string) {
    if (!this.live || this.said.has(id)) return;
    this.said.add(id); const text = this.doc.createElement('span'); text.textContent = message + ' '; this.live.append(text);
  }
}
export function modalDocument(doc: Document) {
  let state = documents.get(doc);
  if (!state) { state = new ModalDocument(doc); documents.set(doc, state); }
  return state;
}
