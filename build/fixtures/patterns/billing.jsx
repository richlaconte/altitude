// Billing pattern (project/framework/patterns/billing.md): usage against plan limits as readings (Meters, never
// Progress), history with the rest of the cycle as Projected, an estimate that says how it's computed, a plan change
// reviewed with its proration before it's confirmed (a downgrade lists what will be lost), a locked feature, a failed
// payment as a page banner, and invoices.
// The lines between the preview markers are its "BillingPattern" preview (scripts/pattern-previews.mjs copies them);
// build/checks/pattern-types.mjs type-checks this file against the public declarations and fails if the two differ.
import * as React from 'react';
import * as A from 'altitude-design';
// preview:start
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const PLANS = [
  { id: 'free', name: 'Free', price: 0, currency: 'EUR', unit: 'per seat', features: ['3 projects', 'Community support'] },
  { id: 'pro', name: 'Pro', price: { month: 2400, year: 2000 }, currency: 'EUR', unit: 'per seat', features: ['Unlimited projects', 'SAML SSO', 'Audit log'] },
  { id: 'business', name: 'Business', price: { month: 4800, year: 4000 }, currency: 'EUR', unit: 'per seat', features: ['Everything in Pro', 'Custom roles', '99.9% uptime SLA'] },
];
const LOSSES = { free: ['SAML SSO, which 8 members sign in with', 'The audit log and its 90 days of history', '9 of your 12 projects become read-only'], pro: ['Custom roles: 2 members on the “Finance” role move to Member'] };
const eur = (minor) => A.formatNumber(minor, { format: 'currency', currency: 'EUR', locale: 'en-IE' });
const usage = [
  { week: '2026-10-05', calls: 210000 }, { week: '2026-10-12', calls: 260000 }, { week: '2026-10-19', calls: 310000 },
  { week: '2026-10-26', calls: 290000 }, { week: '2026-11-02', calls: 300000 }, { week: '2026-11-09', calls: 320000 },
];
function PlanChange({ current, period, onPeriod, onChanged, onAgain }) {
  const rank = (id) => PLANS.findIndex((p) => p.id === id);
  const flow = A.useReviewSubmit({
    initialValue: { plan: current }, validate: (d) => (d.plan === current ? { plan: 'Choose a plan you’re not on.' } : {}),
    submit: async (d) => { await wait(900); return { ok: true, receipt: { plan: d.plan } }; },
    messages: { submitting: 'Changing plan…', complete: 'Plan changed', failed: 'We couldn’t change your plan. Nothing was charged. Try again.' },
  });
  React.useEffect(() => { if (flow.phase === 'review' || flow.phase === 'complete') document.getElementById('bl-plan-h')?.focus(); if (flow.phase === 'complete' && flow.receipt) onChanged(flow.receipt.plan); }, [flow.phase]);
  const next = PLANS.find((p) => p.id === flow.draft.plan) || PLANS[0], down = rank(flow.draft.plan) < rank(current);
  const per = (p) => (typeof p.price === 'number' ? p.price : p.price[period]) * 10;
  const today = Math.max(0, Math.round((per(next) - per(PLANS[rank(current)])) * 0.35));
  return (
    <section className="bl-section" aria-labelledby="bl-plan-h">
      <h3 id="bl-plan-h" tabIndex={-1} className="bl-sub">{flow.phase === 'complete' ? `You’re on ${next.name}` : flow.phase === 'editing' ? 'Change plan' : down ? `Downgrade to ${next.name}?` : `Upgrade to ${next.name}?`}</h3>
      {flow.phase === 'editing' && <>
        <A.PlanPicker plans={PLANS} value={flow.draft.plan} onValueChange={(v) => flow.setField('plan', v)} current={current} recommended="business" period={period} onPeriodChange={onPeriod} locale="en-IE" aria-label="Plans" />
        {flow.errors.plan && <p className="bl-note" role="alert">{flow.errors.plan}</p>}
        <div><A.Button variant="primary" onClick={flow.review}>Review change</A.Button></div>
      </>}
      {(flow.phase === 'review' || flow.phase === 'submitting') && <>
        <p className="bl-proration">{down ? `Your plan changes to ${next.name} at the end of this cycle, on 30 November. Then you’ll pay ${eur(per(next))}/${period}.` : `You’ll pay ${eur(today)} today for the rest of this cycle, then ${eur(per(next))}/${period} for 10 seats.`}</p>
        {down && <div className="bl-losses"><strong>You’ll lose</strong><ul>{(LOSSES[next.id] || []).map((l) => <li key={l}>{l}</li>)}</ul></div>}
        <div className="bl-actions"><A.Button disabled={flow.phase === 'submitting'} onClick={flow.correct}>Choose another plan</A.Button>
          <A.Button variant={down ? 'danger' : 'primary'} loading={flow.phase === 'submitting'} onClick={() => void flow.submit()}>{flow.phase === 'submitting' ? 'Changing plan' : down ? `Downgrade to ${next.name}` : `Upgrade to ${next.name}`}</A.Button></div>
      </>}
      {flow.phase === 'complete' && <p className="bl-note">{down ? `${next.name} starts on 30 November. Until then everything on your current plan keeps working.` : `${next.name} features are on now. A receipt is on its way to finance@acme.dev.`}</p>}
      {flow.phase === 'complete' && <div><A.Button variant="ghost" onClick={onAgain}>Change plan again</A.Button></div>}
      <A.WorkflowStatus>{flow.status}</A.WorkflowStatus>
    </section>
  );
}
function App() {
  const [current, setCurrent] = React.useState('pro');
  const [period, setPeriod] = React.useState('month');
  const [attempt, setAttempt] = React.useState(0);
  const [failed, setFailed] = React.useState(false);
  return (
    <main className="bl-page">
      {failed && <A.Alert placement="page" tone="critical" variant="raised" title="Your last payment failed"
        action={<A.Button size="sm" onClick={() => setFailed(false)}>Update payment method</A.Button>}>We couldn’t charge the card ending 4242 on 1 November. Update it by 8 November to keep your workspace active.</A.Alert>}
      <h2 className="bl-h">Billing</h2>
      <A.Switch label="Simulate a failed payment" checked={failed} onCheckedChange={setFailed} />
      <section className="bl-section" aria-labelledby="bl-usage-h">
        <h3 id="bl-usage-h" className="bl-sub">Usage this cycle</h3>
        <div className="bl-meters">
          <A.Meter label="Seats" value={8} max={10} high={8} format={(v) => String(v)} />
          <A.Meter label="Storage" value={62} max={100} high={80} format={(v) => `${v} GB`} />
          <A.Meter label="API calls" value={1.2} max={1} high={0.8} format={(v) => `${v}M`} />
        </div>
        <A.Stat label="Estimated next bill" value={28800} format={eur} help="10 seats × €24, plus €48 for 0.2M API calls over the 1M included. Updated hourly; the final amount is on your invoice." />
        <A.ChartContainer aria-labelledby="bl-calls-h" config={{ calls: { label: 'API calls', format: (v) => A.formatNumber(v, { format: 'compact', locale: 'en-IE' }) } }} height={180}>
          <A.BarChart data={usage} x="week" status={(d) => (String(d.week) > '2026-10-30' ? 'projected' : undefined)} />
        </A.ChartContainer>
        <p id="bl-calls-h" className="bl-note">API calls per week. The last two weeks of the cycle are projected.</p>
      </section>
      <PlanChange key={attempt} current={current} period={period} onPeriod={setPeriod} onChanged={setCurrent} onAgain={() => setAttempt((n) => n + 1)} />
      <section className="bl-section" aria-labelledby="bl-roles-h">
        <h3 id="bl-roles-h" className="bl-sub">Custom roles</h3>
        <A.FeatureGate requires="Business" description="Create roles with exactly the permissions a team needs." onUpgrade={() => document.getElementById('bl-plan-h')?.focus()}>
          <A.Button>Create a role</A.Button>
        </A.FeatureGate>
      </section>
      <section className="bl-section" aria-labelledby="bl-inv-h">
        <h3 id="bl-inv-h" className="bl-sub">Invoices</h3>
        <A.Table aria-labelledby="bl-inv-h">
          <A.TableHeader><A.TableRow><A.TableHead>Date</A.TableHead><A.TableHead>Invoice</A.TableHead><A.TableHead align="end">Amount</A.TableHead><A.TableHead>Status</A.TableHead></A.TableRow></A.TableHeader>
          <A.TableBody>{[{ d: '1 Oct 2026', n: 'INV-0042', a: 26400, s: 'Paid' }, { d: '1 Sep 2026', n: 'INV-0041', a: 24000, s: 'Paid' }, { d: '1 Aug 2026', n: 'INV-0040', a: 24000, s: 'Refunded' }].map(({ d, n, a, s }) =>
            <A.TableRow key={n}><A.TableCell>{d}</A.TableCell><A.TableCell><A.Link href={'#/invoices/' + n}>{n}</A.Link></A.TableCell><A.TableCell align="end"><A.FormattedNumber value={a} format="currency" currency="EUR" locale="en-IE" /></A.TableCell><A.TableCell><A.Badge tone={s === 'Paid' ? 'positive' : 'neutral'}>{s}</A.Badge></A.TableCell></A.TableRow>)}</A.TableBody>
        </A.Table>
      </section>
    </main>
  );
}
// preview:end
export default App;
