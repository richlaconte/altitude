// Billing: usage as readings, a plan change reviewed with its price before it's confirmed (an upgrade starts now, a
// downgrade at the end of the cycle and lists what will be lost), a scheduled downgrade that can be cancelled, invoices.
// Upgrading to Business unlocks custom roles in Members; a scheduled downgrade to Free warns on the audit log.
import * as React from 'react';
import {
  Alert, Badge, Button, FormattedNumber, Link, Meter, PageHeader, PageHeaderDescription, PageHeaderTitle, PlanPicker,
  SettingsSection, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, WorkflowStatus, formatNumber, useReviewSubmit,
} from 'altitude-design';
import { useDemoQuery } from '../shared/react';
import { DOWNGRADE_DATE, PLAN_NAMES, PLAN_PRICE, service } from './data';
import type { Billing as BillingData, Period, PlanId } from './data';
import { Resource, isKind, message } from './ui';

const PLANS = [
  { id: 'free', name: 'Free', price: 0, currency: 'EUR', unit: 'per seat', features: ['3 projects', 'Community support'] },
  { id: 'pro', name: 'Pro', price: PLAN_PRICE.pro, currency: 'EUR', unit: 'per seat', features: ['Unlimited projects', 'SAML SSO', 'Audit log'] },
  { id: 'business', name: 'Business', price: PLAN_PRICE.business, currency: 'EUR', unit: 'per seat', features: ['Everything in Pro', 'Custom roles', '99.9% uptime SLA'] },
];
const LOSSES: Partial<Record<PlanId, string[]>> = {
  free: ['SAML SSO', 'The audit log and its history', 'All but 3 projects become read-only'],
  pro: ['Custom roles: everyone moves to Admin, Member or Viewer'],
};
const rank = (p: PlanId) => ['free', 'pro', 'business'].indexOf(p);
const eur = (minor: number) => formatNumber(minor, { format: 'currency', currency: 'EUR', locale: 'en-IE' });

function PlanChange({ billing, onChanged, onAgain }: { billing: BillingData; onChanged: (b: BillingData) => void; onAgain: () => void }) {
  const [period, setPeriod] = React.useState<Period>(billing.period);
  const current = billing.plan;
  const flow = useReviewSubmit<{ plan: PlanId }, BillingData>({
    initialValue: { plan: billing.scheduled?.plan ?? current },
    validate: (d) => (d.plan === current && !billing.scheduled ? { plan: 'Choose a plan you’re not on.' }
      : d.plan === billing.scheduled?.plan ? { plan: `The change to ${PLAN_NAMES[d.plan]} is already scheduled for ${billing.scheduled.on}. To cancel it, choose ${PLAN_NAMES[current]}.` } : {}),
    submit: async (d) => {
      try { return { ok: true, receipt: await service.request<BillingData>('billing.change', { plan: d.plan, period }) }; }
      catch (e) {
        if (isKind(e, 'lost-response')) {
          try {
            const now = await service.request<BillingData>('billing.get');
            const landed = rank(d.plan) < rank(current) ? now.scheduled?.plan === d.plan : now.plan === d.plan && !now.scheduled;
            if (landed) return { ok: true, receipt: now };
          } catch { /* fall through */ }
          return { ok: false, error: 'The connection dropped before we heard back. Your plan hasn’t been confirmed: check the plan shown here before trying again.' };
        }
        return { ok: false, error: `We couldn’t change your plan. Nothing was charged. ${message(e)}` };
      }
    },
    messages: { submitting: 'Changing plan…', complete: 'Plan changed' },
  });
  React.useEffect(() => {
    if (flow.phase === 'review' || flow.phase === 'complete') document.getElementById('ac-plan-h')?.focus();
    if (flow.phase === 'complete' && flow.receipt) onChanged(flow.receipt);
  }, [flow.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const next = flow.draft.plan;
  const down = rank(next) < rank(current);
  const keep = next === current && !!billing.scheduled;
  const per = (p: PlanId) => PLAN_PRICE[p][period] * billing.seats;
  const today = Math.max(0, Math.round((per(next) - per(current)) * 0.35));
  const title = flow.phase === 'complete' ? (down ? `${PLAN_NAMES[next]} starts on ${DOWNGRADE_DATE}` : `You’re on ${PLAN_NAMES[next]}`)
    : flow.phase === 'editing' ? 'Change plan' : keep ? `Keep ${PLAN_NAMES[current]}?` : down ? `Downgrade to ${PLAN_NAMES[next]}?` : `Upgrade to ${PLAN_NAMES[next]}?`;
  return (
    <section className="ac-plan" aria-labelledby="ac-plan-h">
      <h2 id="ac-plan-h" tabIndex={-1} className="ac-h2">{title}</h2>
      {flow.phase === 'editing' && <>
        <PlanPicker plans={PLANS} value={flow.draft.plan} onValueChange={(v) => flow.setField('plan', v as PlanId)} current={current} period={period} onPeriodChange={(p) => setPeriod(p as Period)} locale="en-IE" aria-label="Plans" />
        {flow.errors.plan && <p className="ac-error" role="alert">{flow.errors.plan}</p>}
        <div><Button variant="primary" onClick={flow.review}>Review change</Button></div>
      </>}
      {(flow.phase === 'review' || flow.phase === 'submitting') && <>
        <p className="ac-prose">{keep ? `You stay on ${PLAN_NAMES[current]} at ${eur(per(current))}/${period}, and nothing changes on ${DOWNGRADE_DATE}.`
          : down ? `Your plan changes to ${PLAN_NAMES[next]} at the end of this cycle, on ${DOWNGRADE_DATE}. Until then everything keeps working. Then you’ll pay ${eur(per(next))}/${period} for ${billing.seats} seats.`
          : `You’ll pay ${eur(today)} today for the rest of this cycle, then ${eur(per(next))}/${period} for ${billing.seats} seats.`}</p>
        {down && <div className="ac-losses"><strong>You’ll lose</strong><ul>{(LOSSES[next] ?? []).map((l) => <li key={l}>{l}</li>)}</ul></div>}
        {flow.error && <p className="ac-error" role="alert">{flow.error}</p>}
        <div className="ac-actions">
          <Button disabled={flow.phase === 'submitting'} onClick={flow.correct}>Choose another plan</Button>
          <Button variant={down ? 'danger' : 'primary'} loading={flow.phase === 'submitting'} onClick={() => void flow.submit()}>
            {flow.phase === 'submitting' ? 'Changing plan' : keep ? `Keep ${PLAN_NAMES[current]}` : down ? `Downgrade to ${PLAN_NAMES[next]}` : `Upgrade to ${PLAN_NAMES[next]} for ${eur(today)}`}
          </Button>
        </div>
      </>}
      {flow.phase === 'complete' && <>
        <p className="ac-prose">{down ? `Until ${DOWNGRADE_DATE} everything on ${PLAN_NAMES[current]} keeps working. You can keep ${PLAN_NAMES[current]} any time before then.` : keep ? `Nothing changes on ${DOWNGRADE_DATE}.` : `${PLAN_NAMES[next]} features are on now. A receipt is on its way to finance@fenwicktools.example.`}</p>
        <div><Button variant="ghost" onClick={onAgain}>Change plan again</Button></div>
      </>}
      <WorkflowStatus>{flow.status}</WorkflowStatus>
    </section>
  );
}

export function Billing() {
  const q = useDemoQuery<unknown, BillingData>(service, 'billing.get');
  const [attempt, setAttempt] = React.useState(0);
  return <>
    <PageHeader>
      <PageHeaderTitle id="ac-title" tabIndex={-1}>Billing</PageHeaderTitle>
      <PageHeaderDescription>Your plan, what you’ve used this cycle, and invoices.</PageHeaderDescription>
    </PageHeader>
    <div className="ac-body">
      <Resource query={q} noun="billing">
        {(b) => <>
          {b.scheduled && (
            <Alert tone="caution" title={`Your plan changes to ${PLAN_NAMES[b.scheduled.plan]} on ${b.scheduled.on}`}>
              Until then everything on {PLAN_NAMES[b.plan]} keeps working. To stay on {PLAN_NAMES[b.plan]}, choose it below.
            </Alert>
          )}
          <SettingsSection title="Usage this cycle" description={`You’re on ${PLAN_NAMES[b.plan]}, billed every ${b.period}.`}>
            <div className="ac-meters">
              <Meter label="Seats" value={b.seats} max={10} high={8} format={(v) => String(v)} />
              <Meter label="Storage" value={b.storageGb} max={100} high={80} format={(v) => `${v} GB`} />
              <Meter label="API calls" value={b.apiCallsM} max={1} high={0.8} format={(v) => `${v}M`} />
            </div>
          </SettingsSection>
          <PlanChange key={attempt} billing={b} onChanged={(nb) => q.setData(() => nb)} onAgain={() => setAttempt((n) => n + 1)} />
          <section aria-labelledby="ac-inv-h" className="ac-stack">
            <h2 id="ac-inv-h" className="ac-h2">Invoices</h2>
            <Table aria-labelledby="ac-inv-h">
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Invoice</TableHead><TableHead align="end">Amount</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {[{ d: '1 Oct 2026', n: 'INV-0042', a: 9600, s: 'Paid' }, { d: '1 Sep 2026', n: 'INV-0041', a: 9600, s: 'Paid' }, { d: '1 Aug 2026', n: 'INV-0040', a: 7200, s: 'Refunded' }].map(({ d, n, a, s }) => (
                  <TableRow key={n}>
                    <TableCell>{d}</TableCell>
                    <TableCell><Link href={`#/billing/${n}`}>View invoice {n}</Link></TableCell>
                    <TableCell align="end"><FormattedNumber value={a} format="currency" currency="EUR" locale="en-IE" /></TableCell>
                    <TableCell><Badge tone={s === 'Paid' ? 'positive' : 'neutral'}>{s}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        </>}
      </Resource>
    </div>
  </>;
}
