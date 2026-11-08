// The digital store's records (#636). Each is its own type with a stable id, and the axes stay independent: a product
// is the public listing, a version is immutable, a license prices it, compatibility evidence says what was tested (no
// evidence means "Not tested", never "compatible"), and a principal is who's asking. Orders and grants exist here only
// as far as the seed needs them to prove protected reads; checkout (#634) and delivery (#635) own their lifecycles.
// Installation and operation records are added by the slices that create them: only their id shapes are reserved.
//
// No imports and only erasable TypeScript, so Node can run the store directly for its unit check.

export type Role = 'guest' | 'buyer' | 'creator' | 'moderator' | 'support';
/** The capability that separates the two kinds: only an engine asset exposes import; a download ends at a download receipt. */
export type ProductKind = 'engine-asset' | 'download';
export type Category = 'models' | 'textures' | 'audio' | 'documents' | 'props';
export type Currency = 'USD' | 'EUR';

/** Who may use a piece of media, recorded per item. Everything in this example is authored for the repository. */
export interface Rights { license: 'CC0-1.0'; author: string; source: string }

/** A preview. Images are SVG generated from code, so nothing is fetched from another host. */
export interface MediaRef { id: string; kind: 'image'; label: string; alt: string; src: string; rights: Rights }

export interface Publisher { id: string; name: string; /** The creator principal who manages it, if any. */ creatorId?: string }

export interface Product {
  id: string;
  title: string;
  summary: string;
  publisherId: string;
  kind: ProductKind;
  category: Category;
  tags: string[];
  /** Withdrawn products leave the catalog; owners keep their records. */
  status: 'listed' | 'withdrawn';
  withdrawn?: { at: number; reason: string };
  latestVersionId: string;
  licenseIds: string[];
  media: MediaRef[];
  /** Other products this one needs, by semver range. */
  dependencies: { productId: string; range: string }[];
}

export interface FileEntry { path: string; bytes: number }

/** Immutable once released: a new build is a new version with its own digest. */
export interface Version {
  id: string;
  productId: string;
  semver: string;
  /** Subresource-integrity style: `sha256-` and the package hash, as a lockfile records it. */
  digest: string;
  sizeBytes: number;
  files: FileEntry[];
  releasedAt: number;
  notes: string;
}

export interface License {
  id: string;
  productId: string;
  name: string;
  termsVersion: number;
  /** Minor units per currency. Null: free to claim. */
  prices: Record<Currency, number> | null;
  summary: string;
}

/** One test of one version on one engine pin. Its absence means "Not tested". */
export interface CompatibilityEvidence {
  id: string;
  versionId: string;
  engine: 'Injin';
  enginePin: string;
  result: 'verified' | 'incompatible';
  /** The package digest that was tested, which must match the version's. */
  digestTested: string;
  testedAt: number;
  limitations: string[];
}

export interface Principal { id: string; name: string; email: string; role: Exclude<Role, 'guest'>; publisherId?: string }

export interface OrderLine { productId: string; versionId: string; licenseId: string; amount: number }
export interface Order { id: string; principalId: string; lines: OrderLine[]; currency: Currency; total: number; placedAt: number; payment: 'paid' | 'free' }
export interface Grant { id: string; principalId: string; productId: string; licenseId: string; orderId: string; grantedAt: number }

export type SubmissionState = 'in-review' | 'changes-requested' | 'approved';
export interface Submission {
  id: string;
  productId: string;
  publisherId: string;
  semver: string;
  submittedAt: number;
  state: SubmissionState;
  changes: string;
  /** What a moderator asked for, when changes were requested. */
  reviewNote?: string;
}

/** Reserved for later slices: their records are created by the operations that need them. */
export type InstallationId = `ins_${string}`;
export type OperationId = `op_${string}`;

export interface StoreState {
  /** The server's clock (ms since epoch), seeded and moved only by the fixtures drawer. */
  now: number;
  /** The server-side session. Null: a guest. */
  session: { principalId: string | null };
  publishers: Publisher[];
  products: Product[];
  versions: Version[];
  licenses: License[];
  evidence: CompatibilityEvidence[];
  principals: Principal[];
  orders: Order[];
  grants: Grant[];
  submissions: Submission[];
}

/** A principal as the app may see it. */
export interface SessionView { principal: Principal | null; now: number }
