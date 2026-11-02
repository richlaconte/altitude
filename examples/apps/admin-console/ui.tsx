// Pieces every section of the admin console uses: the loading and failed states of a read, and error words.
import * as React from 'react';
import { Alert, Button, Skeleton } from 'altitude-design';
import { DemoError } from '../shared/react';
import type { DemoQuery } from '../shared/react';

export const message = (e: unknown) => (e instanceof Error ? e.message : String(e));
export const isKind = (e: unknown, kind: DemoError['kind']) => e instanceof DemoError && e.kind === kind;

/**
 * A section's read. While the first answer is on its way: an imprint of the section. If it fails: what happened and
 * Try again. If a refresh fails after an answer: the answer stays, with a note that it may be out of date.
 */
export function Resource<T>({ query, noun, children }: { query: DemoQuery<T>; noun: string; children: (data: T) => React.ReactNode }) {
  if (query.data === undefined) {
    if (query.error) {
      return <Alert tone="critical" title={`We couldn’t load ${noun}`} action={<Button size="sm" onClick={() => void query.reload()}>Try again</Button>}>{message(query.error)}</Alert>;
    }
    return <div className="ac-loading" role="status" aria-label={`Loading ${noun}`}><Skeleton shape="text" lines={4} /></div>;
  }
  return <>
    {query.error && <Alert tone="caution" title={`We couldn’t refresh ${noun}`} action={<Button size="sm" onClick={() => void query.reload()}>Try again</Button>}>What you see may be out of date. {message(query.error)}</Alert>}
    {children(query.data)}
  </>;
}
