// The store's working pages (#636), each in the frame its task needs rather than one dashboard: a creator's listings,
// a submission in the editor frame (the record with its review beside it), a statement in the report frame, the
// moderation queue and a support lookup in the list-and-detail triage frame. Read-only here: submitting (#640),
// deciding (#643), statements' payouts (#644) and support actions (#642) are their slices.
import * as React from 'react';
import {
  Alert, Badge, Breadcrumb, Button, Field, Input, PageHeader, PageHeaderDescription, PageHeaderTitle,
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from 'altitude-design';
import type { Tone } from 'altitude-design';
import { date, go, KIND_WORD, money, useProtected, useSession } from './client';
import type { SubmissionState } from './model.ts';
import { href } from './routes.ts';
import { periodLabel, STORE_FEE } from './store.ts';
import type { OrderView, ProductSummary, Statement, SubmissionView } from './store.ts';
import { Receipt } from './account';
import { Empty, NotFound, Protected, useTitle } from './states';

const STATE: Record<SubmissionState, { word: string; tone: Tone }> = {
  'in-review': { word: 'In review', tone: 'neutral' },
  'changes-requested': { word: 'Changes requested', tone: 'caution' },
  approved: { word: 'Approved', tone: 'positive' },
};
const StateBadge = ({ state }: { state: SubmissionState }) => <Badge tone={STATE[state].tone} variant="soft">{STATE[state].word}</Badge>;

/** The month before the server's clock: the last complete statement. */
export const lastPeriod = (now: number) => {
  const d = new Date(now);
  const m = d.getUTCMonth() === 0 ? 12 : d.getUTCMonth();
  const y = d.getUTCMonth() === 0 ? d.getUTCFullYear() - 1 : d.getUTCFullYear();
  return `${y}-${String(m).padStart(2, '0')}`;
};
const shiftPeriod = (period: string, by: number) => {
  const [y, m] = period.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};

export function Creator() {
  const query = useProtected<{ publisher: { name: string }; products: ProductSummary[]; submissions: SubmissionView[] }>('creator.listings');
  const { now } = useSession();
  useTitle('Your listings');
  return (
    <Protected query={query} noun="your listings">
      {({ publisher, products, submissions }) => (
        <main className="ds-page" id="main">
          <PageHeader><PageHeaderTitle tabIndex={-1}>{publisher.name}</PageHeaderTitle>
            <PageHeaderDescription>Your listings and the versions you’ve sent for review. <a className="ds-link" href={href({ name: 'statement', period: lastPeriod(now) })}>{periodLabel(lastPeriod(now))} statement</a></PageHeaderDescription>
          </PageHeader>
          <section aria-labelledby="ds-submissions">
            <h2 id="ds-submissions" className="ds-h2">Submissions</h2>
            {submissions.length === 0 ? <Empty title="Nothing sent for review" /> : (
              <ul className="ds-rows">
                {submissions.map((x) => (
                  <li key={x.id}><a className="ds-link" href={href({ name: 'submission', id: x.id })}>{x.productTitle} {x.semver}</a> <StateBadge state={x.state} /> <span className="ds-meta">Sent {date(x.submittedAt)}</span></li>
                ))}
              </ul>
            )}
          </section>
          <section aria-labelledby="ds-listed">
            <h2 id="ds-listed" className="ds-h2">Listings</h2>
            <div className="ds-table">
              <Table>
                <TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Kind</TableHead><TableHead>Latest version</TableHead></TableRow></TableHeader>
                <TableBody>
                  {products.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell><a className="ds-link" href={href({ name: 'product', id: p.id })}>{p.title}</a></TableCell>
                      <TableCell>{KIND_WORD[p.kind]}</TableCell>
                      <TableCell>{p.latest}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
        </main>
      )}
    </Protected>
  );
}

function SubmissionRecord({ x }: { x: SubmissionView }) {
  return (
    <>
      {x.reviewNote && <Alert tone="caution" title="The moderator asked for changes">{x.reviewNote}</Alert>}
      <section aria-labelledby="ds-changes">
        <h2 id="ds-changes" className="ds-h2">What changed</h2>
        <p>{x.changes}</p>
      </section>
    </>
  );
}

function SubmissionFacts({ x }: { x: SubmissionView }) {
  return (
    <dl className="ds-dl">
      <div><dt>Status</dt><dd><StateBadge state={x.state} /></dd></div>
      <div><dt>Sent</dt><dd>{date(x.submittedAt)}</dd></div>
      <div><dt>Replaces</dt><dd>{x.currentVersion}</dd></div>
      <div><dt>Publisher</dt><dd>{x.publisher}</dd></div>
    </dl>
  );
}

/** The editor frame: the submission's record leads, its status sits beside it. */
export function SubmissionPage({ id }: { id: string }) {
  const query = useProtected<SubmissionView>('submission.get', { id });
  useTitle(`Submission ${id}`);
  return (
    <Protected query={query} noun="the submission" missing={<NotFound title="There’s no submission here" back={{ label: 'Go to your listings', to: href({ name: 'creator' }) }} />}>
      {(x) => (
        <main className="ds-page ds-editor" id="main">
          <PageHeader breadcrumb={<Breadcrumb fit="wrap" items={[{ label: 'Listings', href: href({ name: 'creator' }) }, { label: `${x.productTitle} ${x.semver}` }]} />}>
            <PageHeaderTitle tabIndex={-1}>{x.productTitle} {x.semver}</PageHeaderTitle>
          </PageHeader>
          <div className="ds-editor-body">
            <div className="ds-editor-main"><SubmissionRecord x={x} /></div>
            <aside className="ds-editor-side" aria-label="Submission status"><SubmissionFacts x={x} /></aside>
          </div>
        </main>
      )}
    </Protected>
  );
}

/** The report frame: one period, its lines, and the totals they add up to. */
export function StatementPage({ period }: { period: string }) {
  const query = useProtected<Statement>('statement.get', { period });
  useTitle(`Statement ${period}`);
  return (
    <Protected query={query} noun="the statement" missing={<NotFound title="There’s no statement for that period" back={{ label: 'Go to your listings', to: href({ name: 'creator' }) }} />}>
      {(s) => (
        <main className="ds-page ds-report" id="main">
          <PageHeader><PageHeaderTitle tabIndex={-1}>{s.label} statement</PageHeaderTitle>
            <PageHeaderDescription>{s.publisher}. Sales in the month, the store’s {Math.round(STORE_FEE * 100)}% fee, and what you earned.</PageHeaderDescription>
          </PageHeader>
          <nav aria-label="Other months" className="ds-kinds">
            <a className="ds-link" href={href({ name: 'statement', period: shiftPeriod(s.period, -1) })}>Previous month</a>
            <a className="ds-link" href={href({ name: 'statement', period: shiftPeriod(s.period, 1) })}>Next month</a>
          </nav>
          {s.lines.length === 0 ? <Empty title={`No sales in ${s.label}`} /> : (
            <div className="ds-table">
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Order</TableHead><TableHead>Item</TableHead><TableHead align="end">Sale</TableHead></TableRow></TableHeader>
                <TableBody>
                  {s.lines.map((l, i) => (
                    <TableRow key={i}><TableCell>{date(l.placedAt)}</TableCell><TableCell>{l.orderId}</TableCell><TableCell>{l.title}, {l.license}</TableCell><TableCell className="ds-num">{money(l.gross)}</TableCell></TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow><TableCell colSpan={3}>Sales</TableCell><TableCell className="ds-num">{money(s.gross)}</TableCell></TableRow>
                  <TableRow><TableCell colSpan={3}>Store fee</TableCell><TableCell className="ds-num">−{money(s.fee)}</TableCell></TableRow>
                  <TableRow><TableCell colSpan={3} className="ds-strong">You earned</TableCell><TableCell className="ds-num ds-strong">{money(s.net)}</TableCell></TableRow>
                </TableFooter>
              </Table>
            </div>
          )}
        </main>
      )}
    </Protected>
  );
}

/** The triage frame: the queue beside the item you're on. */
export function Moderation({ id }: { id?: string }) {
  const queue = useProtected<SubmissionView[]>('moderation.queue');
  useTitle(id ? `Review ${id}` : 'Moderation');
  return (
    <Protected query={queue} noun="the queue">
      {(items) => (
        <main className="ds-page ds-triage" id="main">
          <PageHeader><PageHeaderTitle tabIndex={-1}>Moderation</PageHeaderTitle>
            <PageHeaderDescription>{items.length === 1 ? '1 submission' : `${items.length} submissions`} waiting for review, oldest first.</PageHeaderDescription>
          </PageHeader>
          <div className="ds-triage-body">
            <nav aria-label="Submissions waiting" className="ds-triage-list">
              {items.length === 0 ? <Empty title="Nothing waiting" /> : (
                <ul className="ds-rows">
                  {items.map((x) => <li key={x.id}><a className="ds-link" href={href({ name: 'moderation-item', id: x.id })} aria-current={x.id === id ? 'page' : undefined}>{x.productTitle} {x.semver}</a><div className="ds-meta">{x.publisher} · sent {date(x.submittedAt)}</div></li>)}
                </ul>
              )}
            </nav>
            <section className="ds-triage-detail" aria-label="Submission">
              {id ? <ModerationItem id={id} /> : <p className="ds-meta">Choose a submission to review it.</p>}
            </section>
          </div>
        </main>
      )}
    </Protected>
  );
}

function ModerationItem({ id }: { id: string }) {
  const query = useProtected<SubmissionView>('submission.get', { id });
  if (query.status === 'loading') return <p className="ds-meta" role="status">Loading the submission…</p>;
  if (query.status === 'missing') return <p>There’s no submission {id}. Choose one from the queue.</p>;
  if (query.status !== 'ready') return <Alert tone="critical" title="We couldn’t load the submission" action={<Button size="sm" onClick={query.reload}>Try again</Button>}>{query.error?.message}</Alert>;
  const x = query.data!;
  return (
    <>
      <h2 className="ds-h2">{x.productTitle} {x.semver}</h2>
      <SubmissionFacts x={x} />
      <SubmissionRecord x={x} />
    </>
  );
}

export function SupportLookup() {
  const [value, setValue] = React.useState('');
  const [error, setError] = React.useState('');
  useTitle('Find an order');
  return (
    <main className="ds-page ds-triage ds-narrow" id="main">
      <PageHeader><PageHeaderTitle tabIndex={-1}>Find an order</PageHeaderTitle>
        <PageHeaderDescription>Look up an order by the number on the buyer’s receipt.</PageHeaderDescription>
      </PageHeader>
      <form className="ds-search" onSubmit={(e) => { e.preventDefault(); const v = value.trim(); if (!v) { setError('Enter an order number, like o-1001.'); return; } go(href({ name: 'support-order', id: v })); }}>
        <Field label="Order number" error={error || undefined}><Input value={value} onChange={(e) => { setValue(e.target.value); setError(''); }} /></Field>
        <Button type="submit" variant="secondary">Find order</Button>
      </form>
    </main>
  );
}

export function SupportOrder({ id }: { id: string }) {
  const query = useProtected<OrderView>('support.order', { id });
  useTitle(`Order ${id}`);
  return (
    <Protected query={query} noun="the order" missing={<NotFound title={`There’s no order ${id}`} detail="Check the number with the buyer." back={{ label: 'Find another order', to: href({ name: 'support' }) }} />}>
      {(order) => (
        <main className="ds-page ds-triage ds-narrow" id="main">
          <PageHeader breadcrumb={<Breadcrumb fit="wrap" items={[{ label: 'Find an order', href: href({ name: 'support' }) }, { label: `Order ${order.id}` }]} />}>
            <PageHeaderTitle tabIndex={-1}>Order {order.id}</PageHeaderTitle>
          </PageHeader>
          <Receipt order={order} />
        </main>
      )}
    </Protected>
  );
}
