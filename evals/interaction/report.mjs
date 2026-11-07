import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const PROTOCOL_VERSION = '1.0.0';
const requireThat = (condition, message) => { if (!condition) throw new Error(message); };
const text = value => typeof value === 'string' && value.trim().length > 0;
const strings = value => Array.isArray(value) && value.every(text);
const hash = (value, length) => typeof value === 'string' && new RegExp(`^[a-f0-9]{${length}}$`).test(value);
const oneOf = (value, values, name) => requireThat(values.includes(value), `Invalid ${name}: ${value}`);

/** Validate recording integrity, never whether an unfavorable finding is acceptable. Unknown fields survive. */
export function validateRecord(r) {
  requireThat(r?.protocolVersion === PROTOCOL_VERSION, 'Unsupported protocolVersion');
  requireThat(text(r.id) && text(r.task), 'id and task are required');
  requireThat(text(r.recordedAt) && Number.isFinite(Date.parse(r.recordedAt)) && text(r.sessionId), 'Recording date and pseudonymous session ID required');
  oneOf(r.evidenceType, ['maintainer-preference', 'participant-study', 'engineering', 'model-review', 'synthetic-test'], 'evidenceType');
  oneOf(r.journey, ['field-edit', 'record-movement'], 'journey');
  requireThat(hash(r.source?.commit, 40) && hash(r.source?.artifactSha256, 64) && text(r.source?.packageVersion) && typeof r.source?.dirty === 'boolean', 'Immutable source version, artifact hash, package version and dirty flag required');
  requireThat(text(r.environment?.browser) && text(r.environment?.os) && text(r.environment?.input), 'Environment browser, OS and input required');
  requireThat(Array.isArray(r.environment?.viewport) && r.environment.viewport.length === 2 && r.environment.viewport.every(v => Number.isFinite(v) && v > 0), 'Positive viewport dimensions required');
  requireThat(Number.isFinite(r.environment.zoom) && r.environment.zoom > 0 && text(r.environment.scheme), 'Zoom and scheme required');
  oneOf(r.environment.motion, ['normal', 'reduced'], 'motion');
  requireThat(r.environment.assistiveTechnology === null || text(r.environment.assistiveTechnology), 'Record AT/version or null');
  requireThat(Array.isArray(r.variants) && r.variants.length > 0, 'At least one variant required');
  const ids = r.variants.map(v => v.id);
  requireThat(ids.every(text) && new Set(ids).size === ids.length, 'Unique variant IDs required');
  for (const v of r.variants) requireThat(text(v.description) && hash(v.artifactSha256, 64), 'Exact variant description and artifact digest required');
  requireThat(Array.isArray(r.order) && r.order.length > 0 && r.order.every(id => ids.includes(id)), 'Displayed order must reference known variants');
  requireThat(r.observedVariant === r.order.at(-1), 'Outcome and comprehension must name the current exposure');
  requireThat(strings(r.priorRecordRefs) && r.priorRecordRefs.length >= r.order.length - 1, 'Preserve a record reference for each prior exposure');
  oneOf(r.stimulus?.status, ['valid', 'invalid', 'unverified'], 'stimulus status');
  requireThat(text(r.stimulus.reason) && (r.stimulus.healthRef === null || text(r.stimulus.healthRef)), 'Stimulus reason and health reference/null required');
  oneOf(r.outcome?.result, ['completed', 'partial', 'failed', 'not-attempted'], 'outcome');
  requireThat(strings(r.outcome.observations) && text(r.outcome.assistance), 'Observed evidence and assistance required');
  oneOf(r.comprehension?.result, ['correct', 'partial', 'incorrect', 'not-assessed'], 'comprehension');
  requireThat((r.comprehension.response === null || text(r.comprehension.response)) && text(r.comprehension.reason), 'Comprehension response/null and reason required');
  requireThat(r.comprehension.result === 'not-assessed' || text(r.comprehension.response), 'Assessed comprehension requires the participant response');
  requireThat(Array.isArray(r.ratings), 'ratings must be an array');
  const rated = new Set();
  for (const rating of r.ratings) {
    requireThat(r.order.includes(rating.variant) && !rated.has(rating.variant), 'Ratings must reference distinct exposed variants');
    requireThat(rating.score === null || (Number.isInteger(rating.score) && rating.score >= 1 && rating.score <= 5), 'Rating must be null or an integer from 1 to 5');
    rated.add(rating.variant);
  }
  if (['maintainer-preference', 'participant-study'].includes(r.evidenceType)) requireThat(r.order.every(id => rated.has(id)), 'Every exposed variant needs an absolute rating or explicit null');
  oneOf(r.comparison?.status, ['selected', 'neither', 'no-preference', 'indistinguishable', 'misunderstood', 'not-assessed'], 'comparison');
  requireThat(text(r.comparison.reason), 'Comparison reason required');
  if (r.comparison.status !== 'not-assessed') requireThat(new Set(r.order).size >= 2, 'A comparison requires two exposed alternatives');
  if (r.comparison.status === 'selected') {
    requireThat(r.order.includes(r.comparison.selected), 'Selected variant must have been exposed');
  } else requireThat(r.comparison.selected === null, 'Only a selected comparison may name a winner');
  requireThat(strings(r.negativeEvidence) && strings(r.uncertainty), 'Negative evidence and uncertainty must be explicit arrays');
  if (['engineering', 'model-review'].includes(r.evidenceType)) {
    requireThat(r.ratings.length === 0 && r.comparison.status === 'not-assessed' && r.comprehension.result === 'not-assessed' && r.comprehension.response === null, 'Engineering/model records cannot contain participant judgments');
  }
  return r;
}

export function interpretRecord(record) {
  const r = validateRecord(record);
  const cautions = ['Relative choice does not establish approval, human effectiveness or population preference.'];
  const valid = r.stimulus.status === 'valid';
  if (!valid) cautions.push('Invalid or unverified stimulus: judgments cannot establish a presentation preference.');
  if (['indistinguishable', 'misunderstood'].includes(r.comparison.status)) cautions.push('The comparison was not understood as distinct alternatives; no winner is inferred.');
  const selectedRating = r.ratings.find(x => x.variant === r.comparison.selected)?.score;
  if (typeof selectedRating === 'number' && selectedRating <= 2) cautions.push('The selected alternative has a low absolute rating; selection is not approval.');
  if (['engineering', 'model-review', 'synthetic-test'].includes(r.evidenceType)) cautions.push(`${r.evidenceType}: no participant effectiveness evidence.`);
  return {
    approval: 'not-inferred',
    comparisonUsable: valid && ['maintainer-preference', 'participant-study'].includes(r.evidenceType) && ['selected', 'neither', 'no-preference'].includes(r.comparison.status),
    cautions,
  };
}

export function renderRecord(record) {
  const summary = interpretRecord(record);
  // Keep the raw record, including future fields. Escape backticks inside JSON strings so raw notes cannot end a fence.
  const json = JSON.stringify(record, null, 2).replace(/`/g, '\\u0060');
  return `# Interaction evidence\n\n${summary.cautions.map(c => `- ${c}`).join('\n')}\n\nApproval: ${summary.approval}. Comparative preference evidence usable: ${summary.comparisonUsable}.\n\n\`\`\`json\n${json}\n\`\`\`\n`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!process.argv[2]) throw new Error('Usage: node evals/interaction/report.mjs <record.json>');
  process.stdout.write(renderRecord(JSON.parse(readFileSync(process.argv[2], 'utf8'))));
}
