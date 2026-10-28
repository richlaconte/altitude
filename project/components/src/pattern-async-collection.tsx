import * as React from 'react';
import { useIsoLayoutEffect } from './core';
export type CollectionPhase = 'loading' | 'refreshing' | 'populated' | 'empty' | 'no-results' | 'failed';
export interface AsyncCollectionOptions<T, Q> {
  initialQuery: Q;
  /** Own query semantics, permissions, pagination and URL/history in the application. Abort is advisory. */
  load: (query: Q, context: { signal: AbortSignal }) => readonly T[] | Promise<readonly T[]>;
  getKey: (item: T) => string;
  isFiltered: (query: Q) => boolean;
  /** preserve deliberately retains keys absent from the current page/filter; reconcile deleted identities in the app. */
  selection: 'clear-on-query' | 'preserve';
  messages?: Partial<{ loading: string; refreshing: string; empty: string; noResults: string; failed: string; results: (count: number) => string }>;
}
/** Stale-response-safe collection, with explicit selection policy. See altitude-design/guidance/patterns/async-collection.md. */
export function useAsyncCollection<T, Q>(options: AsyncCollectionOptions<T, Q>) {
  const [state, setState] = React.useState(() => ({ query: options.initialQuery, items: [] as readonly T[], phase: 'loading' as CollectionPhase,
    error: '', status: '', selectedKeys: new Set<string>() as ReadonlySet<string> }));
  const current = React.useRef(state);
  const config = React.useRef(options); config.current = options;
  const mounted = React.useRef(false), loaded = React.useRef(false), generation = React.useRef(0);
  const active = React.useRef<AbortController | null>(null);
  const publish = (patch: Partial<typeof state>) => { current.current = { ...current.current, ...patch }; if (mounted.current) setState(current.current); };
  const fetchItems = async (query: Q) => {
    const run = ++generation.current;
    active.current?.abort(); const controller = new AbortController(); active.current = controller;
    const opts = config.current;
    const messages = { loading: 'Loading results', refreshing: 'Refreshing results', empty: 'No records yet', noResults: 'No matching results',
      failed: 'We couldn’t load the results. Try again.', results: (count: number) => `${count} ${count === 1 ? 'result' : 'results'}`, ...opts.messages };
    publish({ phase: loaded.current ? 'refreshing' : 'loading', error: '', status: loaded.current ? messages.refreshing : messages.loading });
    try {
      const items = await opts.load(query, { signal: controller.signal });
      if (!mounted.current || run !== generation.current) return;
      if (!Array.isArray(items)) throw Error('Expected items');
      const keys = items.map(opts.getKey);
      if (keys.some(key => typeof key !== 'string' || !key) || new Set(keys).size !== keys.length) throw Error('Expected unique stable keys');
      loaded.current = true;
      const phase = items.length ? 'populated' : opts.isFiltered(query) ? 'no-results' : 'empty';
      publish({ items, phase, status: phase === 'populated' ? messages.results(items.length) : phase === 'no-results' ? messages.noResults : messages.empty });
    } catch {
      if (mounted.current && run === generation.current) publish({ phase: 'failed', error: messages.failed, status: messages.failed });
    }
  };
  useIsoLayoutEffect(() => { mounted.current = true; void fetchItems(current.current.query);
    return () => { mounted.current = false; generation.current++; active.current?.abort(); }; }, []);
  const setQuery = (query: Q) => {
    publish({ query, ...(config.current.selection === 'clear-on-query' ? { selectedKeys: new Set<string>() } : {}) });
    void fetchItems(query);
  };
  const clearSelection = () => publish({ selectedKeys: new Set<string>() });
  return { ...state, setQuery, refresh: () => { void fetchItems(current.current.query); }, reset: () => setQuery(config.current.initialQuery), clearSelection,
    toggleSelection: (key: string) => {
      const selected = new Set(current.current.selectedKeys);
      if (selected.has(key)) selected.delete(key);
      else if (current.current.items.some(item => config.current.getKey(item) === key)) selected.add(key);
      publish({ selectedKeys: selected });
    } };
}
