// Storefront service health (#406): the simulated metrics, the incidents, and the rules that read them.
// The metrics are a deterministic function of the minute and the scenario, so every run, check and screenshot sees the
// same numbers; the store holds only the clock, the scenario, the deploys and the incidents. The clock is the real one:
// the newest minute is now, and the answers carry timestamps, as a metrics API's would, so RelativeTime and "Updated"
// tell the truth. "Skip ahead a minute" in the drawer moves the simulated clock ahead of the real one.
import { createDemoService, reject } from '../shared/react';
import type { ExternalEvent } from '../shared/react';

// ---- Services and time -------------------------------------------------------------------------------------------

export interface ServiceInfo { id: string; name: string; rpm: number; errorRate: number; p50: number; rota: number; team: string }
/** Eight storefront services. rpm: requests a minute; errorRate: the usual fraction failing; p50 in ms. */
export const SERVICES: ServiceInfo[] = [
  { id: 'checkout', name: 'Checkout', rpm: 1200, errorRate: 0.0004, p50: 92, rota: 3, team: 'Payments and checkout' },
  { id: 'payments', name: 'Payments', rpm: 900, errorRate: 0.0003, p50: 140, rota: 3, team: 'Payments and checkout' },
  { id: 'search', name: 'Search', rpm: 3400, errorRate: 0.0005, p50: 48, rota: 2, team: 'Discovery' },
  { id: 'catalog', name: 'Catalog', rpm: 2600, errorRate: 0.0002, p50: 35, rota: 2, team: 'Discovery' },
  { id: 'accounts', name: 'Accounts', rpm: 700, errorRate: 0.0003, p50: 60, rota: 2, team: 'Identity' },
  { id: 'inventory', name: 'Inventory', rpm: 800, errorRate: 0.0004, p50: 55, rota: 2, team: 'Fulfilment' },
  { id: 'notifications', name: 'Notifications', rpm: 450, errorRate: 0.0006, p50: 110, rota: 2, team: 'Fulfilment' },
  { id: 'recommendations', name: 'Recommendations', rpm: 1900, errorRate: 0.0005, p50: 75, rota: 2, team: 'Discovery' },
];
export const serviceName = (id: string) => SERVICES.find((s) => s.id === id)?.name ?? id;

/** The page opens at minute 119 with two hours behind it; minute 119 is the current real minute. */
export const START_MINUTE = 119;
export const WINDOW = 120;
const MINUTE = 60_000;
const floorMinute = (t: number) => Math.floor(t / MINUTE) * MINUTE;
/** Times are the reader's own, on a 24-hour clock, matching the charts' own "Updated" captions. (Incident tooling often
 *  uses UTC; ChartContainer's captions can't, so one clock on the page beats two.) */
export const hhmm = (t: number) => new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

/** The SLO: 99.9% of requests succeed, so 0.1% may fail. */
export const SLO = 0.999;
export const BUDGET = 1 - SLO;

export type Scenario = 'bad-deploy' | 'all-clear' | 'search-silent';
export const SCENARIOS: { value: Scenario; label: string }[] = [
  { value: 'bad-deploy', label: 'A Checkout deploy goes bad' },
  { value: 'all-clear', label: 'All clear' },
  { value: 'search-silent', label: 'Search stops reporting' },
];

interface DeployRecord { id: string; service: string; minute: number; by: string; change: string }
/** A deploy, as the API answers it: when, as a timestamp. */
export interface Deploy { id: string; service: string; at: number; by: string; change: string }
const DEPLOY_MINUTE = 94; // 25 minutes before the page opens
const SILENT_FROM = 110;  // 9 minutes before

// A small deterministic noise in [-1, 1], from the service, the minute and a salt.
const noise = (i: number, m: number, salt: number) => {
  let h = (i * 374761393 + m * 668265263 + salt * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (((h ^ (h >>> 16)) >>> 0) / 4294967296) * 2 - 1;
};

export interface Minute { requests: number; errors: number; p50: number; p99: number }
/** One service's minute, or null when it didn't report. */
export function minuteOf(serviceId: string, m: number, scenario: Scenario): Minute | null {
  const i = SERVICES.findIndex((s) => s.id === serviceId);
  const s = SERVICES[i];
  if (scenario === 'search-silent' && serviceId === 'search' && m >= SILENT_FROM) return null;
  // Traffic breathes a little over the two hours, as a lunchtime tail does.
  const requests = Math.round(s.rpm * (1 + 0.06 * Math.sin(m / 19 + i) + 0.03 * noise(i, m, 1)));
  let rate = s.errorRate * (1 + 0.35 * noise(i, m, 2));
  let p50 = s.p50 * (1 + 0.08 * noise(i, m, 3));
  let tail = 4.2 + 0.6 * noise(i, m, 4);
  if (scenario === 'bad-deploy' && m > DEPLOY_MINUTE) {
    // Deploy 4f2c retries payment authorisation on timeout: Checkout starts failing and its tail stretches, and
    // Payments, which it calls, slows a little.
    if (serviceId === 'checkout') { rate = 0.036 * (1 + 0.12 * noise(i, m, 5)); tail = 11 + noise(i, m, 6); p50 *= 1.35; }
    if (serviceId === 'payments') { p50 *= 1.15; tail += 1.2; }
  }
  return { requests, errors: Math.floor(requests * rate + (noise(i, m, 7) + 1) / 2), p50: Math.round(p50), p99: Math.round(p50 * tail) };
}

// ---- The rules --------------------------------------------------------------------------------------------------

/** The fraction of requests that failed over minutes [from, to], or null when nothing reported in them. */
function errorRate(serviceId: string, from: number, to: number, scenario: Scenario): number | null {
  let req = 0, err = 0;
  for (let m = from; m <= to; m++) { const x = minuteOf(serviceId, m, scenario); if (x) { req += x.requests; err += x.errors; } }
  return req ? err / req : null;
}

export type Health = 'operational' | 'degraded' | 'outage' | 'no-data';
export const HEALTH: Record<Health, { word: string; tone: 'positive' | 'caution' | 'critical' | 'neutral' }> = {
  operational: { word: 'Operational', tone: 'positive' },
  degraded: { word: 'Degraded', tone: 'caution' },
  outage: { word: 'Partial outage', tone: 'critical' },
  // Missing data is never healthy: a neutral plate, never positive.
  'no-data': { word: 'No data', tone: 'neutral' },
};

/**
 * The burn-rate rule (SRE workbook, "Alerting on SLOs", multiwindow, multi-burn-rate). Burn rate is the error rate
 * divided by the budget (0.1%): 1 spends the 30-day budget in exactly 30 days. Over BOTH the last 60 and the last 5
 * minutes: 14.4 or more is a partial outage (2% of the budget in an hour, the workbook's page rule), 6 or more is
 * degraded. The workbook pairs 6 with 6-hour and 30-minute windows; this page holds two hours, so it uses the 1h/5m
 * pair for both and says so rather than faking a longer window. The long window keeps a page from firing on a blip;
 * a person reading the dashboard also needs a fresh spike, so 14.4 or more over the last 5 minutes alone reads degraded
 * (never an outage, and never the all-clear). No points in the last 5 minutes: no data.
 */
export interface Reading {
  id: string; health: Health; burn60: number | null; burn5: number | null; rate5: number | null;
  /** The share of the 30-day error budget spent. */
  budgetUsed: number;
  /** When it last reported, for no-data. */
  silentSince?: number;
}
// The server computes readings, as a metrics backend's recording rules would; the page only puts them into words.
function readService(id: string, s: Store): Reading {
  const now = s.minute, scenario = s.scenario;
  const r60 = errorRate(id, now - 59, now, scenario), r5 = errorRate(id, now - 4, now, scenario);
  const used = budgetUsed(id, now, scenario);
  if (r5 === null) {
    let m = now; while (m > now - WINDOW && !minuteOf(id, m, scenario)) m--;
    return { id, health: 'no-data', burn60: r60 === null ? null : r60 / BUDGET, burn5: null, rate5: null, budgetUsed: used, silentSince: timeOf(s, m + 1) };
  }
  const b60 = (r60 ?? 0) / BUDGET, b5 = r5 / BUDGET;
  return { id, health: classify(b60, b5), burn60: b60, burn5: b5, rate5: r5, budgetUsed: used };
}
/** The rule above, on its own: burn rates over the last 60 and the last 5 minutes. */
export const classify = (burn60: number, burn5: number): Health =>
  Math.min(burn60, burn5) >= 14.4 ? 'outage' : Math.min(burn60, burn5) >= 6 || burn5 >= 14.4 ? 'degraded' : 'operational';

// Earlier this month's spend, so the meter reads a month rather than an hour.
const SPENT_BEFORE: Record<string, number> = { checkout: 0.54, payments: 0.31, search: 0.22, catalog: 0.12, accounts: 0.18, inventory: 0.27, notifications: 0.4, recommendations: 0.2 };
/** The share of the 30-day budget used: earlier this month, plus the last hour at its burn rate (an hour is 1/720 of 30 days). */
const budgetUsed = (id: string, now: number, scenario: Scenario) => SPENT_BEFORE[id] + ((errorRate(id, now - 59, now, scenario) ?? 0) / BUDGET) / 720;

const pct = (x: number) => `${(x * 100).toFixed(x < 0.001 ? 2 : x < 0.1 ? 1 : 0)}%`;
export const formatRate = pct;

/**
 * The lead chart's takeaway: written by this fixed rule from the data shown, never generated. In priority order:
 *   1. the error rates couldn't be loaded: no all-clear;
 *   2. a service is burning its budget: name the worst, its error rate before and after the burn began, the nearest
 *      deploy to it in the 30 minutes before (a claim about time, not cause), and when what's left of its 30-day
 *      budget runs out at the last 5 minutes' rate;
 *   3. a service stopped reporting: no all-clear;
 *   4. otherwise, all clear.
 * Stale data says when it was true.
 */
export interface Takeaway { text: string; worst?: string; health: Health | 'unknown' }
export function writeTakeaway(answer: ErrorsAnswer | undefined, stale: boolean): Takeaway {
  if (!answer) return { text: 'We couldn’t load error rates, so this can’t say whether everything is fine.', health: 'unknown' };
  const { readings, rows, deploys, asOf } = answer;
  const prefix = stale ? `As of ${hhmm(asOf)}: ` : '';
  const rank: Record<Health, number> = { outage: 3, degraded: 2, 'no-data': 1, operational: 0 };
  const burning = readings.filter((r) => r.health === 'outage' || r.health === 'degraded')
    .sort((a, b) => rank[b.health] - rank[a.health] || (b.burn5 ?? 0) - (a.burn5 ?? 0));
  const silent = readings.filter((r) => r.health === 'no-data');
  if (burning.length) {
    const w = burning[0];
    const series = rows.map((r) => r[w.id] as number | null);
    // When the burn began: the first minute of the latest run of minutes at 6× the budget or more, within the hour.
    let start = series.length - 1;
    while (start > series.length - 60 && (series[start - 1] ?? 0) / BUDGET >= 6) start--;
    const mean = (xs: Array<number | null>) => { const v = xs.filter((x): x is number => x !== null); return v.length ? v.reduce((n, x) => n + x, 0) / v.length : null; };
    const before = mean(series.slice(Math.max(0, start - 15), start)), after = mean(series.slice(start, start + 15));
    const began = rows[start].t as number;
    const deploy = deploys.filter((d) => d.service === w.id && d.at < began && d.at >= began - 30 * MINUTE).sort((a, b) => b.at - a.at)[0];
    // What's left of the 30-day budget, spent at the last 5 minutes' rate.
    const left = Math.max(0, 1 - w.budgetUsed);
    const hours = (left * 30 * 24) / Math.max(w.burn5 ?? 0, 0.01);
    const runsOut = left === 0 ? 'is already spent' : hours < 36 ? `runs out in ${Math.max(1, Math.round(hours))} hour${Math.round(hours) <= 1 ? '' : 's'}` : `runs out in ${Math.round(hours / 24)} days`;
    const rose = before !== null && after !== null ? ` rose from ${pct(before)} to ${pct(after)} of requests` : ` are at ${pct(w.rate5 ?? 0)} of requests`;
    const when = deploy ? ` after the ${hhmm(deploy.at)} deploy` : ` since ${hhmm(began)}`;
    const more = burning.length > 1 ? ` ${burning.length - 1} more service${burning.length > 2 ? 's are' : ' is'} over budget too.` : '';
    return { text: `${prefix}${serviceName(w.id)} errors${rose}${when}. At this rate the rest of its 30-day error budget ${runsOut}.${more}`, worst: w.id, health: w.health };
  }
  if (silent.length) {
    const x = silent[0];
    const also = silent.length > 1 ? ` (and ${silent.length - 1} more)` : '';
    return { text: `${prefix}${serviceName(x.id)}${also} stopped reporting at ${hhmm(x.silentSince ?? asOf)}, so this can’t say whether everything is fine.`, worst: x.id, health: 'no-data' };
  }
  return { text: `${prefix}All ${readings.length} services are within their error budgets.`, health: 'operational' };
}

// ---- Incidents --------------------------------------------------------------------------------------------------

export type Severity = 'sev1' | 'sev2' | 'sev3';
export interface IncidentUpdate { id: string; text: string; by: string; at: number }
export interface Incident { id: string; key: string; service: string; severity: Severity; summary: string; by: string; at: number; paged: number; updates: IncidentUpdate[] }

/** Who each severity pages, for a service's rota: the consequence, in people. */
export const paged = (severity: Severity, rota: number) => (severity === 'sev1' ? rota + 2 : severity === 'sev2' ? rota : 0);
export const SEVERITIES: { value: Severity; label: string; description: (rota: number) => string }[] = [
  { value: 'sev1', label: 'SEV-1', description: (r) => `Customers can’t complete a core task. Pages the rota (${r}), an incident commander and comms.` },
  { value: 'sev2', label: 'SEV-2', description: (r) => `Customers are affected but can work around it. Pages the rota (${r}).` },
  { value: 'sev3', label: 'SEV-3', description: () => 'Little or no customer impact yet. Opens a channel; pages nobody.' },
];

// ---- The store and its operations -------------------------------------------------------------------------------

/** `anchor` is when `minute` is: the newest minute's timestamp. Incidents are stamped with the server's own clock. */
export interface Store { minute: number; anchor: number; scenario: Scenario; deploys: DeployRecord[]; incidents: Incident[] }
const timeOf = (s: Store, m: number) => s.anchor + (m - s.minute) * MINUTE;
const deployOut = (s: Store, d: DeployRecord): Deploy => ({ id: d.id, service: d.service, at: timeOf(s, d.minute), by: d.by, change: d.change });
const seed = (): Store => ({
  minute: START_MINUTE,
  anchor: floorMinute(Date.now()),
  scenario: 'bad-deploy',
  deploys: [
    { id: '9a1e', service: 'search', minute: 41, by: 'Kenji Mori', change: 'Raise the typo-tolerance threshold for short queries' },
    { id: '4f2c', service: 'checkout', minute: DEPLOY_MINUTE, by: 'Ana Ruiz', change: 'Retry payment authorisation on timeout' },
  ],
  incidents: [],
});

const minutesTo = (now: number) => Array.from({ length: WINDOW }, (_, k) => now - WINDOW + 1 + k);

/** Every answer says when it's as of, as a timestamp of its newest minute. */
export interface ErrorsAnswer { asOf: number; rows: Array<Record<string, number | null>>; readings: Reading[]; deploys: Deploy[] }
export interface LatencyAnswer { asOf: number; service: string | null; rows: Array<{ t: number; p50: number | null; p99: number | null }>; deploys: Deploy[] }
export interface HeatAnswer { asOf: number; cells: Array<{ service: string; bucket: string; errors: number | null }> }
export interface ServiceRow { id: string; name: string; reading: Reading; spark: Array<number | null>; p99: number | null; rpm: number | null }
export interface ServicesAnswer { asOf: number; rows: ServiceRow[]; traffic: Array<number | null> }
export interface EndpointsAnswer { asOf: number; items: Array<{ name: string; value: number }> }
export interface DetailAnswer {
  asOf: number; service: ServiceInfo; reading: Reading; saturation: number; deploys: Deploy[];
  spans: Array<{ name: string; value: number }>; slowest: number; log: string;
}

const ENDPOINTS: Record<string, Array<[string, number]>> = {
  checkout: [['POST /checkout/confirm', 0.62], ['POST /checkout/payment-intent', 0.31], ['GET /checkout/summary', 0.07]],
  payments: [['POST /payments/authorise', 0.8], ['POST /payments/capture', 0.2]],
  search: [['GET /search', 0.9], ['GET /search/suggest', 0.1]],
  catalog: [['GET /products/:id', 0.7], ['GET /categories', 0.3]],
  accounts: [['POST /sessions', 0.6], ['GET /me', 0.4]],
  inventory: [['GET /stock/:sku', 1]],
  notifications: [['POST /emails/order-confirmation', 1]],
  recommendations: [['GET /recommendations/home', 0.75], ['GET /recommendations/basket', 0.25]],
};

export const service = createDemoService<Store>({
  name: 'service-health',
  seed,
  // Not persisted: the two hours are anchored to the moment the page opens.
  persist: false,
  handlers: {
    'metrics.errors': {
      read: (s): ErrorsAnswer => ({
        asOf: s.anchor, deploys: s.deploys.map((d) => deployOut(s, d)),
        rows: minutesTo(s.minute).map((m) => {
          const row: Record<string, number | null> = { t: timeOf(s, m) };
          for (const x of SERVICES) { const v = minuteOf(x.id, m, s.scenario); row[x.id] = v ? v.errors / v.requests : null; }
          return row;
        }),
        readings: SERVICES.map((x) => readService(x.id, s)),
      }),
    },
    // The latency of one service (the takeaway's), or of all traffic, request-weighted.
    'metrics.latency': {
      read: (s, input: { service: string | null } | undefined): LatencyAnswer => {
        const id = input?.service ?? null;
        return {
          asOf: s.anchor, service: id, deploys: s.deploys.filter((d) => !id || d.service === id).map((d) => deployOut(s, d)),
          rows: minutesTo(s.minute).map((m) => {
            const xs = (id ? [id] : SERVICES.map((x) => x.id)).map((k) => minuteOf(k, m, s.scenario)).filter((v): v is Minute => !!v);
            const req = xs.reduce((n, v) => n + v.requests, 0);
            const avg = (k: 'p50' | 'p99') => (req ? Math.round(xs.reduce((n, v) => n + v[k] * v.requests, 0) / req) : null);
            return { t: timeOf(s, m), p50: avg('p50'), p99: avg('p99') };
          }),
        };
      },
    },
    'metrics.heatmap': {
      read: (s): HeatAnswer => {
        const cells: HeatAnswer['cells'] = [];
        for (let b = 0; b < WINDOW / 10; b++) {
          const from = s.minute - WINDOW + 1 + b * 10;
          for (const x of SERVICES) {
            let errors = 0, any = false;
            for (let m = from; m < from + 10; m++) { const v = minuteOf(x.id, m, s.scenario); if (v) { errors += v.errors; any = true; } }
            cells.push({ service: x.name, bucket: hhmm(timeOf(s, from)), errors: any ? errors : null });
          }
        }
        return { asOf: s.anchor, cells };
      },
    },
    'services.list': {
      read: (s): ServicesAnswer => ({
        asOf: s.anchor,
        rows: SERVICES.map((x) => {
          const last5 = [0, 1, 2, 3, 4].map((k) => minuteOf(x.id, s.minute - k, s.scenario)).filter((v): v is Minute => !!v);
          return {
            id: x.id, name: x.name, reading: readService(x.id, s),
            spark: minutesTo(s.minute).slice(-60).map((m) => { const v = minuteOf(x.id, m, s.scenario); return v ? v.errors / v.requests : null; }),
            p99: last5.length ? Math.max(...last5.map((v) => v.p99)) : null,
            rpm: last5.length ? Math.round(last5.reduce((n, v) => n + v.requests, 0) / last5.length) : null,
          };
        }),
        traffic: minutesTo(s.minute).slice(-60).map((m) => SERVICES.reduce<number | null>((n, x) => { const v = minuteOf(x.id, m, s.scenario); return v ? (n ?? 0) + v.requests : n; }, null)),
      }),
    },
    'endpoints.noisy': {
      read: (s): EndpointsAnswer => ({
        asOf: s.anchor,
        items: SERVICES.flatMap((x) => {
          let errors = 0;
          for (let m = s.minute - 14; m <= s.minute; m++) errors += minuteOf(x.id, m, s.scenario)?.errors ?? 0;
          return ENDPOINTS[x.id].map(([name, share]) => ({ name, value: Math.round(errors * share) }));
        }).filter((e) => e.value > 0),
      }),
    },
    'service.detail': {
      read: (s, input: { id: string }): DetailAnswer => {
        const info = SERVICES.find((x) => x.id === input?.id);
        if (!info) reject('not-found', 'There’s no such service.');
        const i = SERVICES.indexOf(info!);
        const bad = s.scenario === 'bad-deploy' && s.minute > DEPLOY_MINUTE && info!.id === 'checkout';
        const spans: Array<[string, number]> = bad
          ? [['payments.authorise (3 attempts)', 2310], ['db: load basket', 84], ['inventory.reserve', 61], ['render confirmation', 22]]
          : [['payments.authorise', 410], ['db: load basket', 78], ['inventory.reserve', 58], ['render confirmation', 20]];
        const own: Array<[string, number]> = info!.id === 'checkout' ? spans : [[`${info!.id}: handler`, Math.round(info!.p50 * 3.1)], ['db: query', Math.round(info!.p50 * 1.2)], ['cache: lookup', 9]];
        const t = new Date(s.anchor).toISOString().slice(11, 16); // logs are UTC, and say so with Z
        const log = bad
          ? `${t}:58Z WARN  checkout  payments.authorise timed out after 800ms (attempt 1 of 3)\n${t}:59Z WARN  checkout  payments.authorise timed out after 800ms (attempt 2 of 3)\n${t}:59Z ERROR checkout  payments.authorise: 409 duplicate idempotency key\n${t}:59Z ERROR checkout  POST /checkout/confirm 502 in 2.4s`
          : `${t}:57Z INFO  ${info!.id}  GET healthz 200 in 3ms\n${t}:59Z INFO  ${info!.id}  pool: 18 of 40 connections in use`;
        return {
          asOf: s.anchor, service: info!, reading: readService(info!.id, s),
          saturation: bad ? 0.86 : 0.38 + 0.05 * i, deploys: s.deploys.filter((d) => d.service === info!.id).sort((a, b) => b.minute - a.minute).map((d) => deployOut(s, d)),
          spans: own.map(([name, value]) => ({ name, value })), slowest: own.reduce((n, [, v]) => n + v, 0), log,
        };
      },
    },
    'incidents.list': { read: (s) => s.incidents },
    'incidents.declare': {
      // Idempotent by key, so a retry after a lost response never pages anyone twice; one open incident per service,
      // so two people can't declare the same one.
      write: (s, input: Omit<Incident, 'id' | 'at' | 'updates' | 'paged'>) => {
        const same = s.incidents.find((x) => x.key === input.key);
        if (same) return { state: s, result: same };
        if (!input.summary?.trim()) reject('invalid', 'Say what’s happening, in a sentence.', { field: 'summary' });
        const open = s.incidents.find((x) => x.service === input.service);
        if (open) reject('conflict', `${open.by} declared ${open.id} for ${serviceName(open.service)} at ${hhmm(open.at)}. Join it rather than declaring a second.`, { current: open });
        const info = SERVICES.find((x) => x.id === input.service)!;
        const incident: Incident = { ...input, id: `INC-${213 + s.incidents.length}`, at: Date.now(), paged: paged(input.severity, info.rota), updates: [] };
        return { state: { ...s, incidents: [incident, ...s.incidents] }, result: incident };
      },
      current: (s) => s.incidents,
    },
    'incidents.update': {
      write: (s, input: { incident: string; update: IncidentUpdate }) => {
        const inc = s.incidents.find((x) => x.id === input.incident);
        if (!inc) reject('not-found', 'That incident is gone.');
        if (!input.update.text.trim()) reject('invalid', 'Write the update first.', { field: 'text' });
        if (inc!.updates.some((u) => u.id === input.update.id)) return { state: s, result: inc };
        const next = { ...inc!, updates: [...inc!.updates, { ...input.update, at: Date.now() }] };
        return { state: { ...s, incidents: s.incidents.map((x) => (x.id === inc!.id ? next : x)) }, result: next };
      },
    },
  },
});

/** A minute passes and its metrics arrive: the live feed. Never behind the real clock. */
export const tick = (label = 'A minute of metrics arrives') =>
  service.external(label, (s) => ({ ...s, minute: s.minute + 1, anchor: Math.max(s.anchor + MINUTE, floorMinute(Date.now())) }));
export const setScenario = (scenario: Scenario) =>
  service.external(`Scenario: ${SCENARIOS.find((x) => x.value === scenario)!.label}`, (s) => ({ ...s, scenario }));

export const events: ExternalEvent[] = [
  { label: 'Skip ahead a minute', run: () => tick('Skipped ahead a minute') },
  {
    label: 'Ana declares an incident for Checkout',
    run: () => service.external('Ana Ruiz declares an incident for Checkout', (s) => s.incidents.some((x) => x.service === 'checkout') ? s : ({
      ...s,
      incidents: [{ id: `INC-${213 + s.incidents.length}`, key: `ext-${s.minute}`, service: 'checkout', severity: 'sev2', summary: 'Checkout confirm failing after deploy 4f2c.', by: 'Ana Ruiz', at: Date.now() - 45_000, paged: 3, updates: [] }, ...s.incidents],
    })),
  },
  {
    label: 'Ana posts an incident update',
    run: () => service.external('Ana Ruiz posts an incident update', (s) => {
      const inc = s.incidents[0];
      if (!inc) return s;
      const update: IncidentUpdate = { id: `u-ext-${s.minute}-${inc.updates.length}`, text: 'Rolling back 4f2c. Checkout errors should fall within 5 minutes.', by: 'Ana Ruiz', at: Date.now() };
      return { ...s, incidents: s.incidents.map((x) => (x.id === inc.id ? { ...x, updates: [...x.updates, update] } : x)) };
    }),
  },
];

// ---- The live feed's switch, which the drawer owns -----------------------------------------------------------------

// A minute of metrics arrives at each real minute while it's on. Off, the pipeline has stalled: the page should notice
// its data getting old, and say so.
let liveOn = true;
let timer: ReturnType<typeof setTimeout> | undefined;
const liveListeners = new Set<() => void>();
const schedule = () => {
  clearTimeout(timer);
  if (!liveOn) return;
  timer = setTimeout(() => { tick(); schedule(); }, MINUTE - (Date.now() % MINUTE) + 50);
};
export const live = {
  get: () => liveOn,
  set: (on: boolean) => { liveOn = on; schedule(); for (const l of [...liveListeners]) l(); },
  subscribe: (l: () => void) => { liveListeners.add(l); return () => { liveListeners.delete(l); }; },
  start: schedule,
};
