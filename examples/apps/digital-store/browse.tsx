// The browse frame (#636): the catalog and a product's page. Public reads, so anyone may open them and a failed refresh
// keeps the last answer. The catalog's facets (#633), the product page's gallery and acquisition (#641, #634) are their
// own slices; this is the record they build on: products, immutable versions, licenses and what was tested.
import * as React from 'react';
import {
  Alert, Badge, Breadcrumb, Button, Input, PageHeader, PageHeaderDescription, PageHeaderTitle,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from 'altitude-design';
import { isDemoError } from '../shared/react';
import { bytes, date, go, KIND_WORD, money, usePublic } from './client';
import type { CompatibilityEvidence, Version } from './model.ts';
import { CATALOG, href } from './routes.ts';
import type { Route } from './routes.ts';
import type { ProductDetail, ProductSummary } from './store.ts';
import { Empty, Failed, Loading, NotFound, useTitle } from './states';

const KINDS = [
  { value: 'all', label: 'Everything' },
  { value: 'engine-asset', label: 'Engine assets' },
  { value: 'download', label: 'Downloads' },
] as const;

const price = (p: ProductSummary) => (p.fromPrice === null ? 'Free' : `From ${money(p.fromPrice)}`);

export function Catalog({ route }: { route: Extract<Route, { name: 'catalog' }> }) {
  const query = usePublic<ProductSummary[]>('catalog.list');
  const [q, setQ] = React.useState(route.q);
  React.useEffect(() => setQ(route.q), [route.q]);
  useTitle(route.q ? `“${route.q}” in the catalog` : 'Catalog');
  const words = route.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const shown = (query.data ?? []).filter((p) => (route.kind === 'all' || p.kind === route.kind)
    && words.every((w) => [p.title, p.summary, p.publisher, ...p.tags].join(' ').toLowerCase().includes(w)));

  return (
    <main className="ds-page ds-browse" id="main">
      <PageHeader>
        <PageHeaderTitle tabIndex={-1}>Catalog</PageHeaderTitle>
        <PageHeaderDescription>Models, textures and props that import into Injin, and files you download.</PageHeaderDescription>
      </PageHeader>
      <form className="ds-search" role="search" onSubmit={(e) => { e.preventDefault(); go(href({ ...route, q: q.trim() })); }}>
        <Input type="search" aria-label="Search the catalog" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button type="submit" variant="secondary">Search</Button>
      </form>
      <nav aria-label="Kind of product" className="ds-kinds">
        {KINDS.map((k) => <a key={k.value} className="ds-pill" href={href({ ...route, kind: k.value })} aria-current={route.kind === k.value ? 'page' : undefined}>{k.label}</a>)}
      </nav>
      {query.data === undefined
        ? query.error ? <Failed noun="the catalog" error={query.error} retry={() => void query.reload()} /> : <Loading noun="the catalog" />
        : <>
          {query.error && <Alert tone="caution" title="We couldn’t refresh the catalog" action={<Button size="sm" onClick={() => void query.reload()}>Try again</Button>}>What you see may be out of date.</Alert>}
          <p className="ds-count" role="status">{shown.length === 1 ? '1 product' : `${shown.length} products`}{route.q ? ` for “${route.q}”` : ''}</p>
          {shown.length === 0
            ? <Empty title="Nothing matches" description="Try fewer words, or look at everything." action={<a className="ds-link" href={href(CATALOG)}>Show everything</a>} />
            : (
              <ul className="ds-grid">
                {shown.map((p) => (
                  <li key={p.id} className="ds-tile">
                    <img src={p.thumbnail.src} alt="" width={400} height={300} />
                    <h2 className="ds-tile-title"><a href={href({ name: 'product', id: p.id })}>{p.title}</a></h2>
                    <p className="ds-meta">{p.publisher}</p>
                    <p className="ds-meta">{KIND_WORD[p.kind]} · {price(p)}</p>
                  </li>
                ))}
              </ul>
            )}
        </>}
    </main>
  );
}

const evidenceFor = (d: ProductDetail, v: Version) => d.evidence.filter((e) => e.versionId === v.id && e.digestTested === v.digest);

function Evidence({ items }: { items: CompatibilityEvidence[] }) {
  if (!items.length) return <span className="ds-meta">Not tested</span>;
  return (
    <ul className="ds-evidence">
      {items.map((e) => <li key={e.id}><Badge tone={e.result === 'verified' ? 'positive' : 'critical'} variant="soft">{e.result === 'verified' ? 'Verified' : 'Incompatible'}</Badge> Injin {e.enginePin}</li>)}
    </ul>
  );
}

export function ProductPage({ route }: { route: Extract<Route, { name: 'product' }> }) {
  const query = usePublic<ProductDetail>('product.get', { id: route.id });
  const d = query.data && query.data.product.id === route.id ? query.data : undefined;
  useTitle(d ? (route.version ? `${d.product.title} ${route.version}` : d.product.title) : 'Product');
  if (!d) {
    if (query.error && isDemoError(query.error, 'not-found')) return <NotFound title="There’s no product here" detail="It may have been mistyped, or the link is from somewhere else." />;
    return <main className="ds-page" id="main">{query.error ? <Failed noun="this product" error={query.error} retry={() => void query.reload()} /> : <Loading noun="the product" />}</main>;
  }
  const { product, publisher, versions, licenses, dependencies } = d;
  const engine = product.kind === 'engine-asset';
  const chosen = route.version ? versions.find((v) => v.semver === route.version) : undefined;
  if (route.version && !chosen) {
    return <NotFound title={`There’s no version ${route.version}`} detail={`${product.title} has ${versions.map((v) => v.semver).join(' and ')}.`} back={{ label: `Go to ${product.title}`, to: href({ name: 'product', id: product.id }) }} />;
  }
  const latest = versions.find((v) => v.id === product.latestVersionId)!;
  const shown = chosen ?? latest;
  const crumbs = [{ label: 'Catalog', href: href(CATALOG) }, ...(chosen ? [{ label: product.title, href: href({ name: 'product', id: product.id }) }] : [])];

  return (
    <main className="ds-page ds-browse" id="main">
      <PageHeader breadcrumb={<Breadcrumb fit="wrap" items={[...crumbs, { label: chosen ? `Version ${chosen.semver}` : product.title }]} />}>
        <PageHeaderTitle tabIndex={-1}>{product.title}{chosen ? ` ${chosen.semver}` : ''}</PageHeaderTitle>
        <PageHeaderDescription>{product.summary} By {publisher.name}.</PageHeaderDescription>
      </PageHeader>
      {product.status === 'withdrawn' && (
        <Alert tone="caution" title="No longer available">
          {product.withdrawn!.reason} {date(product.withdrawn!.at)}. If you own it, it stays in your library.
        </Alert>
      )}
      <div className="ds-product">
        <figure className="ds-figure">
          <img src={product.media[0].src} alt={product.media[0].alt} width={400} height={300} />
          <figcaption className="ds-meta">{product.media[0].label}. Preview: {product.media[0].rights.license}, {product.media[0].rights.author}.</figcaption>
        </figure>
        <div className="ds-facts">
          <dl className="ds-dl">
            <div><dt>Kind</dt><dd>{KIND_WORD[product.kind]}</dd></div>
            <div><dt>{chosen ? 'Version' : 'Latest version'}</dt><dd>{shown.semver}, released {date(shown.releasedAt)}</dd></div>
            <div><dt>Size</dt><dd>{bytes(shown.sizeBytes)} in {shown.files.length} files</dd></div>
            <div><dt>Package digest</dt><dd><code className="ds-digest">{shown.digest}</code></dd></div>
            {engine && <div><dt>Tested on</dt><dd><Evidence items={evidenceFor(d, shown)} /></dd></div>}
            {dependencies.length > 0 && <div><dt>Needs</dt><dd>{dependencies.map((x) => <span key={x.productId}><a className="ds-link" href={href({ name: 'product', id: x.productId })}>{x.title}</a> {x.range}</span>)}</dd></div>}
          </dl>
          <section aria-labelledby="ds-licenses">
            <h2 id="ds-licenses" className="ds-h2">Licenses</h2>
            <ul className="ds-licenses">
              {licenses.map((l) => (
                <li key={l.id}>
                  <span className="ds-strong">{l.name}</span> · {l.prices ? money(l.prices.USD) : 'Free'} · terms v{l.termsVersion}
                  <p className="ds-meta">{l.summary}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
      {chosen && (
        <section aria-labelledby="ds-files">
          <h2 id="ds-files" className="ds-h2">What’s in {chosen.semver}</h2>
          <p>{chosen.notes}</p>
          {engine && evidenceFor(d, chosen).flatMap((e) => e.limitations).map((l) => <p key={l} className="ds-meta">Limitation: {l}</p>)}
          <ul className="ds-files">{chosen.files.map((f) => <li key={f.path}><code>{f.path}</code> <span className="ds-meta">{bytes(f.bytes)}</span></li>)}</ul>
        </section>
      )}
      <section aria-labelledby="ds-versions">
        <h2 id="ds-versions" className="ds-h2">Versions</h2>
        <div className="ds-table">
          <Table>
            <TableHeader><TableRow><TableHead>Version</TableHead><TableHead>Released</TableHead><TableHead align="end">Size</TableHead>{engine && <TableHead>Tested on</TableHead>}</TableRow></TableHeader>
            <TableBody>
              {versions.map((v) => (
                <TableRow key={v.id}>
                  <TableCell><a className="ds-link" href={href({ name: 'product', id: product.id, version: v.semver })} aria-current={chosen?.id === v.id ? 'page' : undefined}>{v.semver}</a>{v.id === product.latestVersionId ? ' (latest)' : ''}</TableCell>
                  <TableCell>{date(v.releasedAt)}</TableCell>
                  <TableCell className="ds-num">{bytes(v.sizeBytes)}</TableCell>
                  {engine && <TableCell><Evidence items={evidenceFor(d, v)} /></TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </main>
  );
}
