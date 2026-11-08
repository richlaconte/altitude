// The store's seed (#636): six fictional products from three invented studios, mixed in kind and shape, with two
// buyers (so library isolation can be checked), two creators, a moderator and a support agent. Names are mixed in
// shape; addresses use the reserved .example domain. Every preview is SVG generated here and recorded as CC0, authored
// for this repository. Deterministic: Reset calls it again and gets the same store.
import type { CompatibilityEvidence, License, MediaRef, Principal, Product, Publisher, StoreState, Version, Order, Grant, Submission } from './model.ts';

/** The seeded clock: Monday 2 November 2026, 09:00 UTC. */
export const T0 = Date.UTC(2026, 10, 2, 9, 0);
const DAY = 86_400_000;
const day = (y: number, m: number, d: number) => Date.UTC(y, m - 1, d, 12, 0);

// A stand-in package hash: 32 deterministic bytes in base64, shaped like a lockfile's integrity field.
export function digestOf(text: string): string {
  const bytes: number[] = [];
  for (let salt = 0; salt < 8; salt++) {
    let h = 0x811c9dc5 ^ salt;
    for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    for (let k = 0; k < 4; k++) bytes.push((h >>> (k * 8)) & 0xff);
  }
  return 'sha256-' + btoa(String.fromCharCode(...bytes));
}

const RIGHTS = { license: 'CC0-1.0', author: 'Altitude contributors', source: 'Generated from code in examples/apps/digital-store/seed.ts' } as const;
const svg = (body: string) => 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">${body}</svg>`);
const image = (id: string, label: string, alt: string, body: string): MediaRef => ({ id, kind: 'image', label, alt, src: svg(body), rights: { ...RIGHTS } });

const pines = [40, 110, 170, 250, 320].map((x, i) => `<path d="M${x} ${70 + (i % 2) * 20}l${36 + i * 3} 140h-${72 + i * 6}z" fill="${i % 2 ? '#3f6b4a' : '#2f5a3c'}"/><rect x="${x - 5}" y="210" width="10" height="18" fill="#6b4a32"/>`).join('');
const stones = Array.from({ length: 20 }, (_, i) => `<ellipse cx="${30 + (i % 5) * 85}" cy="${40 + Math.floor(i / 5) * 70}" rx="${34 + (i * 7) % 12}" ry="${24 + (i * 5) % 10}" fill="${['#8a9499', '#6f7a80', '#a3abb0'][i % 3]}"/>`).join('');
const wave = (amp: number, color: string) => `<path d="${Array.from({ length: 41 }, (_, i) => `${i ? 'L' : 'M'}${i * 10} ${150 + Math.round(Math.sin(i * 0.7) * amp * Math.sin(i * 0.13))}`).join('')}" stroke="${color}" stroke-width="3" fill="none"/>`;
const sheet = (accent: string) => `<rect width="400" height="300" fill="#eceae4"/><rect x="110" y="24" width="180" height="252" fill="#fff" stroke="#c9c5bb"/><rect x="128" y="44" width="70" height="12" fill="${accent}"/>${Array.from({ length: 9 }, (_, i) => `<rect x="128" y="${84 + i * 18}" width="${144 - (i % 3) * 22}" height="6" fill="#c9c5bb"/>`).join('')}`;
const props = `<rect width="400" height="300" fill="#efe6dc"/><rect y="220" width="400" height="80" fill="#c9b49c"/><path d="M80 220l20-90h60l20 90z" fill="#9c5a3c"/><rect x="220" y="150" width="90" height="70" fill="#6b4a32"/><rect x="215" y="140" width="100" height="14" fill="#4e3826"/><circle cx="340" cy="200" r="20" fill="#b07a4a"/>`;

export const PUBLISHERS: Publisher[] = [
  { id: 'pub-fernhollow', name: 'Fernhollow Studio', creatorId: 'u-ines' },
  { id: 'pub-saltmarsh', name: 'Saltmarsh Sound', creatorId: 'u-wen' },
  { id: 'pub-kiln', name: 'Kiln & Cinder Works' },
];

export const PRINCIPALS: Principal[] = [
  { id: 'u-mara', name: 'Mara Lindqvist', email: 'mara.lindqvist@mail.example', role: 'buyer' },
  { id: 'u-kofi', name: 'Kofi Mensah-Baptiste', email: 'kofi@studio-kmb.example', role: 'buyer' },
  { id: 'u-ines', name: 'Inês Duarte', email: 'ines@fernhollow.example', role: 'creator', publisherId: 'pub-fernhollow' },
  { id: 'u-wen', name: 'Wen Zhao', email: 'wen@saltmarsh.example', role: 'creator', publisherId: 'pub-saltmarsh' },
  { id: 'u-oluwaseun', name: 'Oluwaseun Hart', email: 'o.hart@lanternyard.example', role: 'moderator' },
  { id: 'u-pia', name: 'Pia Okonkwo', email: 'pia.okonkwo@lanternyard.example', role: 'support' },
];

const files = (root: string, names: [string, number][]) => names.map(([n, bytes]) => ({ path: `${root}/${n}`, bytes }));
const version = (id: string, productId: string, semver: string, releasedAt: number, notes: string, f: { path: string; bytes: number }[]): Version =>
  ({ id, productId, semver, digest: digestOf(`${productId}@${semver}`), sizeBytes: f.reduce((n, x) => n + x.bytes, 0), files: f, releasedAt, notes });

export const VERSIONS: Version[] = [
  version('v-pines-1.2.0', 'p-pines', '1.2.0', day(2026, 9, 10), 'Five tree models with three levels of detail each.',
    files('Fernhollow/Pines', [['tall-pine.mesh', 4_820_000], ['young-pine.mesh', 2_310_000], ['pine-cluster.mesh', 6_940_000], ['bark.tex', 8_388_608], ['needles.tex', 4_194_304]])),
  version('v-pines-1.3.0', 'p-pines', '1.3.0', day(2026, 10, 28), 'Adds a fallen log and wind-ready needle cards; bark texture at 4K.',
    files('Fernhollow/Pines', [['tall-pine.mesh', 4_820_000], ['young-pine.mesh', 2_310_000], ['pine-cluster.mesh', 6_940_000], ['fallen-log.mesh', 1_720_000], ['bark.tex', 16_777_216], ['needles.tex', 4_194_304]])),
  version('v-tidewater-2.0.1', 'p-tidewater', '2.0.1', day(2026, 8, 3), 'Twelve tiling stone textures with normal and roughness maps.',
    files('Fernhollow/Tidewater', Array.from({ length: 4 }, (_, i): [string, number] => [`stone-${i + 1}.tex`, 4_194_304]))),
  version('v-saltmarsh-1.0.0', 'p-saltmarsh', '1.0.0', day(2026, 7, 21), 'Forty minutes of estuary recordings: wind, birds, water and reeds.',
    files('saltmarsh-field-recordings', [['estuary-dawn.flac', 182_000_000], ['reeds-wind.flac', 96_000_000], ['curlews.flac', 64_000_000], ['README.txt', 2_400]])),
  version('v-ledgerline-3.1.0', 'p-ledgerline', '3.1.0', day(2026, 6, 2), 'Adds a credit-note template and right-to-left layouts.',
    files('ledgerline-invoice-templates', [['invoice.docx', 48_000], ['invoice.odt', 41_000], ['credit-note.docx', 44_000], ['LICENSE.txt', 1_900]])),
  version('v-kiln-0.9.2', 'p-kiln', '0.9.2', day(2026, 9, 30), 'Pottery-workshop props: kiln, wheel, shelves and twenty vessels.',
    files('KilnCinder/Props', [['kiln.mesh', 3_100_000], ['wheel.mesh', 1_400_000], ['shelves.mesh', 900_000], ['vessels.mesh', 5_600_000], ['glazes.mat', 220_000]])),
  version('v-ferry-1.1.0', 'p-ferry', '1.1.0', day(2026, 5, 14), 'A seamless two-minute loop of an overnight ferry deck.',
    files('night-ferry-ambience', [['night-ferry-loop.wav', 42_000_000]])),
];

const usd = (usd: number, eur: number) => ({ USD: usd, EUR: eur });
export const LICENSES: License[] = [
  { id: 'l-pines-standard', productId: 'p-pines', name: 'Standard', termsVersion: 2, prices: usd(1400, 1300), summary: 'One studio, unlimited projects, no redistribution of source files.' },
  { id: 'l-pines-studio', productId: 'p-pines', name: 'Studio', termsVersion: 2, prices: usd(4900, 4500), summary: 'Up to 20 seats, including contractors working on your projects.' },
  { id: 'l-tidewater-free', productId: 'p-tidewater', name: 'Free license', termsVersion: 1, prices: null, summary: 'Use in any project, credit appreciated, no resale of the textures alone.' },
  { id: 'l-saltmarsh-standard', productId: 'p-saltmarsh', name: 'Standard', termsVersion: 1, prices: usd(900, 850), summary: 'Use in films, games and podcasts; no resale as a sound library.' },
  { id: 'l-ledgerline-free', productId: 'p-ledgerline', name: 'Free license', termsVersion: 3, prices: null, summary: 'Use and adapt for your own business documents.' },
  { id: 'l-kiln-standard', productId: 'p-kiln', name: 'Standard', termsVersion: 1, prices: usd(1900, 1750), summary: 'One studio, unlimited projects.' },
  { id: 'l-ferry-standard', productId: 'p-ferry', name: 'Standard', termsVersion: 1, prices: usd(400, 380), summary: 'Use in films, games and podcasts.' },
];

const evidence = (id: string, versionId: string, enginePin: string, result: 'verified' | 'incompatible', testedAt: number, limitations: string[] = []): CompatibilityEvidence => {
  const v = VERSIONS.find((x) => x.id === versionId)!;
  return { id, versionId, engine: 'Injin', enginePin, result, digestTested: v.digest, testedAt, limitations };
};
export const EVIDENCE: CompatibilityEvidence[] = [
  evidence('e-1', 'v-pines-1.2.0', '2.3.0', 'verified', day(2026, 9, 11)),
  evidence('e-2', 'v-pines-1.3.0', '2.4.1', 'verified', day(2026, 10, 29), ['Wind animation needs the 2.4 foliage shader.']),
  evidence('e-3', 'v-tidewater-2.0.1', '2.4.1', 'verified', day(2026, 10, 29)),
  evidence('e-4', 'v-kiln-0.9.2', '2.3.0', 'verified', day(2026, 10, 1)),
  evidence('e-5', 'v-kiln-0.9.2', '2.4.1', 'incompatible', day(2026, 10, 29), ['Glaze materials use a shader model removed in 2.4.']),
];

export const PRODUCTS: Product[] = [
  { id: 'p-pines', title: 'Fernhollow pine forest pack', summary: 'Five game-ready pine trees with bark and needle textures.', publisherId: 'pub-fernhollow', kind: 'engine-asset', category: 'models', tags: ['trees', 'forest', 'foliage'], status: 'listed', latestVersionId: 'v-pines-1.3.0', licenseIds: ['l-pines-standard', 'l-pines-studio'],
    media: [image('m-pines-scene', 'Forest scene', 'Five pine trees of different heights on a grassy slope', `<rect width="400" height="300" fill="#dfe8dc"/><rect y="210" width="400" height="90" fill="#8fa77f"/>${pines}`)],
    dependencies: [{ productId: 'p-tidewater', range: '^2.0.0' }] },
  { id: 'p-tidewater', title: 'Tidewater stone textures', summary: 'Twelve tiling river-stone textures, free.', publisherId: 'pub-fernhollow', kind: 'engine-asset', category: 'textures', tags: ['stone', 'tiling'], status: 'listed', latestVersionId: 'v-tidewater-2.0.1', licenseIds: ['l-tidewater-free'],
    media: [image('m-tidewater', 'Stone tiles', 'Rounded grey river stones packed together', `<rect width="400" height="300" fill="#59636a"/>${stones}`)], dependencies: [] },
  { id: 'p-saltmarsh', title: 'Saltmarsh field recordings', summary: 'Forty minutes of estuary ambience, recorded at dawn.', publisherId: 'pub-saltmarsh', kind: 'download', category: 'audio', tags: ['ambience', 'nature', 'water'], status: 'listed', latestVersionId: 'v-saltmarsh-1.0.0', licenseIds: ['l-saltmarsh-standard'],
    media: [image('m-saltmarsh', 'Waveform', 'A calm waveform over a pale estuary blue', `<rect width="400" height="300" fill="#dde7ec"/>${wave(40, '#2a6f9e')}${wave(18, '#7aa3bf')}`)], dependencies: [] },
  { id: 'p-ledgerline', title: 'Ledgerline invoice templates', summary: 'Invoice and credit-note templates for word processors.', publisherId: 'pub-kiln', kind: 'download', category: 'documents', tags: ['business', 'templates'], status: 'listed', latestVersionId: 'v-ledgerline-3.1.0', licenseIds: ['l-ledgerline-free'],
    media: [image('m-ledgerline', 'Invoice page', 'A single invoice page with a coloured title bar and line items', sheet('#2a6f9e'))], dependencies: [] },
  { id: 'p-kiln', title: 'Kiln & Cinder props', summary: 'A pottery workshop: kiln, wheel, shelves and twenty vessels.', publisherId: 'pub-kiln', kind: 'engine-asset', category: 'props', tags: ['interior', 'workshop'], status: 'listed', latestVersionId: 'v-kiln-0.9.2', licenseIds: ['l-kiln-standard'],
    media: [image('m-kiln', 'Workshop', 'A brick kiln, a wooden bench and a clay pot on a workshop floor', props)], dependencies: [] },
  { id: 'p-ferry', title: 'Night-ferry ambience loop', summary: 'A seamless loop of an overnight ferry deck.', publisherId: 'pub-saltmarsh', kind: 'download', category: 'audio', tags: ['ambience', 'loop'], status: 'withdrawn', withdrawn: { at: day(2026, 10, 20), reason: 'Withdrawn by Saltmarsh Sound.' }, latestVersionId: 'v-ferry-1.1.0', licenseIds: ['l-ferry-standard'],
    media: [image('m-ferry', 'Night deck', 'A dark sea under a deep blue night, with a faint waveform', `<rect width="400" height="300" fill="#1d2a3a"/>${wave(14, '#7aa3bf')}`)], dependencies: [] },
];

const order = (id: string, principalId: string, placedAt: number, lines: [string, string, string, number][]): Order => {
  const total = lines.reduce((n, l) => n + l[3], 0);
  return { id, principalId, placedAt, currency: 'USD', total, payment: total ? 'paid' : 'free', lines: lines.map(([productId, versionId, licenseId, amount]) => ({ productId, versionId, licenseId, amount })) };
};
export const ORDERS: Order[] = [
  order('o-1001', 'u-mara', day(2026, 9, 15), [['p-pines', 'v-pines-1.2.0', 'l-pines-standard', 1400]]),
  order('o-1002', 'u-mara', day(2026, 9, 15), [['p-tidewater', 'v-tidewater-2.0.1', 'l-tidewater-free', 0]]),
  order('o-1003', 'u-kofi', day(2026, 10, 5), [['p-saltmarsh', 'v-saltmarsh-1.0.0', 'l-saltmarsh-standard', 900]]),
  order('o-1004', 'u-kofi', day(2026, 10, 2), [['p-ferry', 'v-ferry-1.1.0', 'l-ferry-standard', 400]]),
  order('o-1005', 'u-mara', day(2026, 10, 22), [['p-kiln', 'v-kiln-0.9.2', 'l-kiln-standard', 1900]]),
  order('o-1006', 'u-kofi', day(2026, 10, 18), [['p-pines', 'v-pines-1.3.0', 'l-pines-studio', 4900]]),
];
export const GRANTS: Grant[] = ORDERS.flatMap((o, i) => o.lines.map((l): Grant => ({ id: `g-${i + 1}`, principalId: o.principalId, productId: l.productId, licenseId: l.licenseId, orderId: o.id, grantedAt: o.placedAt })));

export const SUBMISSIONS: Submission[] = [
  { id: 's-201', productId: 'p-pines', publisherId: 'pub-fernhollow', semver: '1.4.0', submittedAt: T0 - DAY, state: 'in-review', changes: 'Adds two autumn variants and fixes the young pine’s collision mesh.' },
  { id: 's-202', productId: 'p-saltmarsh', publisherId: 'pub-saltmarsh', semver: '1.1.0', submittedAt: T0 - 4 * DAY, state: 'changes-requested', changes: 'Adds a night recording of the same estuary.', reviewNote: 'The new recording has a phone notification at 03:12. Remove it and resubmit.' },
  { id: 's-203', productId: 'p-kiln', publisherId: 'pub-kiln', semver: '1.0.0', submittedAt: T0 - 2 * DAY, state: 'in-review', changes: 'Rebuilds the glaze materials for Injin 2.4.' },
];

/** A fresh store: Mara signed in, the clock at T0. Copies, so nothing can mutate the constants. */
export const seed = (): StoreState => structuredClone({
  now: T0,
  session: { principalId: 'u-mara' },
  publishers: PUBLISHERS, products: PRODUCTS, versions: VERSIONS, licenses: LICENSES, evidence: EVIDENCE,
  principals: PRINCIPALS, orders: ORDERS, grants: GRANTS, submissions: SUBMISSIONS,
});
