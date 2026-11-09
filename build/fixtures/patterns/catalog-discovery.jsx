// Catalog discovery pattern (project/framework/patterns/catalog-discovery.md): a public catalog searched on a simulated
// service. Facets edit a draft and Apply writes the query to the URL (so Back and Forward restore it); applied filters
// are removable tags; counts come from the applied query; the latest response wins and a late one is dropped; a failed
// refresh keeps the previous results with Retry. Each result has one link (its title) and a comparison checkbox outside
// it. Product detail shows exact facts, three-valued compatibility with evidence, and the person's own copy apart from
// public facts. Comparison is a semantic table that says "Not stated by publisher" and "Doesn't apply" in words.
// Returning from a product restores the scroll offset and focuses that product's link.
// The lines between the preview markers are its "CatalogDiscoveryPattern" preview (scripts/pattern-previews.mjs copies
// them); build/checks/pattern-types.mjs type-checks this file against the public declarations and fails if the two differ.
import * as React from 'react';
import * as A from 'altitude-design';
// preview:start
const cdSvg = (fill, ink) => 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="${fill}"/><path d="M0 220 120 120l90 70 70-50 120 80v80H0z" fill="${ink}"/></svg>`);
const TYPES = [{ value: 'model', label: '3D models' }, { value: 'texture', label: 'Textures' }, { value: 'audio', label: 'Audio' }, { value: 'template', label: 'Document templates' }];
const LICENSES = [{ value: 'standard', label: 'Standard' }, { value: 'cc-by', label: 'CC BY 4.0' }, { value: 'extended', label: 'Extended' }];
// Public facts only. `compat.status` is one of verified, incompatible or untested; untested is never shown as compatible.
const PRODUCTS = [
  { id: 'tidewater', name: 'Tidewater stone textures', type: 'texture', license: 'standard', price: 1400, publisher: 'Harbour Lane Studio', released: '2026-10-02', version: '1.3.0', versions: ['1.3.0', '1.2.0'], formats: 'PNG, KTX2', size: '1.4 GB', engine: true, compat: { status: 'verified', engine: 'Ikta 0.9', digest: 'sha256:9f2c…41ad', tested: '2026-10-04', limits: 'KTX2 needs GPU compression support' } },
  { id: 'pine', name: 'Pine forest kit', type: 'model', license: 'standard', price: 2400, publisher: 'Fernwood', released: '2026-09-18', version: '2.0.1', versions: ['2.0.1'], formats: 'GLB, FBX', size: '820 MB', engine: true, compat: { status: 'untested' } },
  { id: 'quarry', name: 'Quarry rock set', type: 'model', license: 'cc-by', price: 0, publisher: 'Open Terrain Collective', released: '2026-08-30', version: '0.4.0', versions: ['0.4.0'], formats: 'GLB', size: '310 MB', engine: true, compat: { status: 'incompatible', engine: 'Ikta 0.9', digest: 'sha256:11be…07c3', tested: '2026-09-02', limits: 'Uses a vertex format Ikta 0.9 can’t read' } },
  { id: 'harbour-ambience', name: 'Harbour ambience', type: 'audio', license: 'standard', price: 900, publisher: 'Harbour Lane Studio', released: '2026-07-11', version: '1.0.0', versions: ['1.0.0'], formats: 'WAV, OGG', size: '640 MB', engine: false, compat: { status: 'untested' } },
  { id: 'slate', name: 'Slate roof textures', type: 'texture', license: 'extended', price: 3200, publisher: 'Fernwood', released: '2026-10-20', version: '1.0.0', versions: ['1.0.0'], formats: 'PNG, EXR', size: '2.1 GB', engine: true, compat: { status: 'verified', engine: 'Ikta 0.9', digest: 'sha256:c0a7…9e12', tested: '2026-10-22' } },
  { id: 'invoice', name: 'Studio invoice template', type: 'template', license: 'standard', price: 500, publisher: 'Paperworks', released: '2026-06-01', version: '3.1.0', versions: ['3.1.0'], formats: 'DOCX, ODT', size: '2 MB', engine: false, compat: { status: 'untested' } },
  { id: 'cobble', name: 'Cobblestone textures', type: 'texture', license: 'cc-by', price: 0, publisher: 'Open Terrain Collective', released: '2026-05-14', version: '1.1.0', versions: ['1.1.0'], formats: 'PNG', size: '540 MB', engine: true, compat: { status: 'untested' } },
  { id: 'gulls', name: 'Gull calls', type: 'audio', license: 'cc-by', price: 0, publisher: 'Fieldnotes Audio', released: '2026-04-02', version: '1.0.0', versions: ['1.0.0'], formats: null, size: '90 MB', engine: false, compat: { status: 'untested' } },
];
// The signed-in person's own state, kept apart from public facts.
const OWNED = { tidewater: '1.2.0' };
const PAGE = 4;
const usd = (minor) => (minor === 0 ? 'Free' : A.formatNumber(minor, { format: 'currency', currency: 'USD', locale: 'en-US' }));
const label = (list, v) => list.find((o) => o.value === v)?.label || v;
const COMPAT = { verified: 'Verified', incompatible: 'Incompatible', untested: 'Not tested' };
const SORTS = [{ value: 'relevance', label: 'Relevance' }, { value: 'newest', label: 'Newest' }, { value: 'price-asc', label: 'Price: low to high' }, { value: 'price-desc', label: 'Price: high to low' }];

// The URL holds the applied query, never a draft: #/catalog?q=stone&type=texture&sort=newest&page=2
const EMPTY = { q: '', type: [], license: [], sort: 'relevance', page: 1 };
const toHash = (s) => { const p = new URLSearchParams(); if (s.q) p.set('q', s.q); s.type.forEach((t) => p.append('type', t)); s.license.forEach((l) => p.append('license', l)); if (s.sort !== 'relevance') p.set('sort', s.sort); if (s.page > 1) p.set('page', String(s.page)); const q = p.toString(); return '#/catalog' + (q ? '?' + q : ''); };
const parse = (hash) => {
  const [path, qs = ''] = hash.replace(/^#/, '').split('?'), p = new URLSearchParams(qs);
  if (path.startsWith('/product/')) return { view: 'product', id: path.slice(9), v: p.get('v') };
  if (path === '/compare') return { view: 'compare', ids: (p.get('ids') || '').split(',').filter(Boolean) };
  return { view: 'catalog', query: { q: p.get('q') || '', type: p.getAll('type'), license: p.getAll('license'), sort: p.get('sort') || 'relevance', page: Number(p.get('page')) || 1 } };
};

// The simulated search service. Counts for one facet ignore that facet's own selection (so other choices stay countable).
const sim = { delay: 400, failNext: false };
const matches = (p, q, skip) => (!q.q || (p.name + ' ' + p.publisher).toLowerCase().includes(q.q.toLowerCase()))
  && (skip === 'type' || !q.type.length || q.type.includes(p.type)) && (skip === 'license' || !q.license.length || q.license.includes(p.license));
async function search(q) {
  await new Promise((r) => setTimeout(r, sim.delay));
  if (sim.failNext) { sim.failNext = false; throw new Error('The search service didn’t respond.'); }
  const hits = PRODUCTS.filter((p) => matches(p, q));
  const order = { newest: (a, b) => b.released.localeCompare(a.released), 'price-asc': (a, b) => a.price - b.price, 'price-desc': (a, b) => b.price - a.price };
  if (order[q.sort]) hits.sort(order[q.sort]);
  const count = (key, opts) => opts.map((o) => ({ ...o, count: PRODUCTS.filter((p) => matches(p, q, key) && p[key] === o.value).length }));
  return { total: hits.length, items: hits.slice((q.page - 1) * PAGE, q.page * PAGE), facets: { type: count('type', TYPES), license: count('license', LICENSES) } };
}

// "Back to results" goes back through history only when the previous entry is the catalog, so its position is restored;
// otherwise (a deep link, a version link, the comparison) it follows its href to the last catalog URL.
let previous = '', lastCatalog = '#/catalog';
const back = (e) => { if (previous.startsWith('#/catalog')) { e.preventDefault(); history.back(); } };
function useRoute() {
  const [hash, setHash] = React.useState(() => location.hash || '#/catalog');
  React.useEffect(() => { const on = (e) => { previous = new URL(e.oldURL).hash; setHash(location.hash || '#/catalog'); }; addEventListener('hashchange', on); return () => removeEventListener('hashchange', on); }, []);
  if (parse(hash).view === 'catalog') lastCatalog = hash;
  return { route: parse(hash), hash };
}

function Catalog({ query, hash, compare, onCompare }) {
  const [draft, setDraft] = React.useState(query);
  const [result, setResult] = React.useState(/** @type {Awaited<ReturnType<typeof search>> | null} */ (null));
  const [phase, setPhase] = React.useState('loading');
  const [error, setError] = React.useState('');
  const [attempt, setAttempt] = React.useState(0);
  const [failNext, setFailNext] = React.useState(false);
  const seq = React.useRef(0);
  const key = JSON.stringify(query);
  React.useEffect(() => { setDraft(query); }, [key]);
  React.useEffect(() => {
    const mine = ++seq.current;
    setPhase((p) => (p === 'loading' || p === 'first-failed' ? 'loading' : 'refreshing'));
    search(query).then((r) => { if (mine !== seq.current) return; setResult(r); setPhase('settled'); setError(''); },
      (e) => { setFailNext(sim.failNext); if (mine !== seq.current) return; setError(e.message); setPhase((p) => (p === 'loading' ? 'first-failed' : 'failed')); });
  }, [key, attempt]);
  // Back to a catalog URL: restore the offset and focus the product that was opened, or the results heading if it's gone.
  React.useEffect(() => {
    if (phase !== 'settled') return;
    let saved = null; try { saved = JSON.parse(sessionStorage.getItem('cd-return:' + hash) || 'null'); } catch { /* storage may be unavailable */ }
    if (!saved) return;
    try { sessionStorage.removeItem('cd-return:' + hash); } catch { /* ignore */ }
    scrollTo(0, saved.y);
    /** @type {HTMLElement | null} */ (document.querySelector(`[data-product="${saved.id}"]`) || document.getElementById('cd-results-h'))?.focus({ preventScroll: true });
  }, [phase, hash]);
  // Apply, sort, removing a tag and clearing all start at page 1; only Pagination's links choose a page.
  const go = (next) => { location.hash = toHash({ ...next, page: 1 }); };
  // Removing a tag keeps focus among the tags: the next one's remove button, or the results heading when none is left.
  const refocus = React.useRef(-1);
  React.useEffect(() => {
    if (refocus.current < 0 || phase === 'loading') return;
    const buttons = /** @type {HTMLElement[]} */ ([...document.querySelectorAll('.cd-applied button')]);
    (buttons[Math.min(refocus.current, buttons.length - 1)] || document.getElementById('cd-results-h'))?.focus();
    refocus.current = -1;
  }, [key, phase]);
  const remember = (id) => { try { sessionStorage.setItem('cd-return:' + hash, JSON.stringify({ y: scrollY, id })); } catch { /* ignore */ } };
  const applied = [...query.type.map((v) => ({ key: 'type', v, text: label(TYPES, v) })), ...query.license.map((v) => ({ key: 'license', v, text: label(LICENSES, v) }))];
  const counts = phase === 'refreshing' ? 'refreshing' : phase === 'failed' ? 'stale' : 'current';
  const pages = result ? Math.max(1, Math.ceil(result.total / PAGE)) : 1;
  const status = phase === 'loading' || phase === 'refreshing' ? 'Updating results…' : phase === 'settled' && result ? `${result.total} ${result.total === 1 ? 'product' : 'products'}${query.q ? ` for “${query.q}”` : ''}` : '';
  return (
    <div className="cd-catalog">
      <form className="cd-side" aria-label="Filters" onSubmit={(e) => { e.preventDefault(); go(draft); }}>
        <A.Field label="Search products"><A.Input type="search" value={draft.q} onChange={(e) => setDraft({ ...draft, q: e.target.value })} /></A.Field>
        <A.FacetFilter label="Asset type" noun="asset types" options={result?.facets.type || TYPES} value={draft.type} onValueChange={(type) => setDraft({ ...draft, type })} counts={result ? counts : 'unavailable'} countsLabel="Counts for your applied search" />
        <A.FacetFilter label="License" noun="licenses" options={result?.facets.license || LICENSES} value={draft.license} onValueChange={(license) => setDraft({ ...draft, license })} counts={result ? counts : 'unavailable'} />
        <div><A.Button type="submit" variant="secondary">Apply filters</A.Button></div>
        {JSON.stringify(draft) !== key && <p className="cd-note">You have changes that aren’t applied yet.</p>}
      </form>
      <section className="cd-results" aria-labelledby="cd-results-h">
        <div className="cd-bar">
          <h2 id="cd-results-h" tabIndex={-1} className="cd-sub">{result ? `${result.total} ${result.total === 1 ? 'product' : 'products'}` : 'Products'}</h2>
          <A.Field label="Sort by"><A.Select value={query.sort} items={SORTS} onValueChange={(sort) => go({ ...query, sort })} /></A.Field>
        </div>
        {applied.length > 0 && <div className="cd-applied" aria-label="Applied filters" role="group">
          {applied.map((f, i) => <A.Tag key={f.key + f.v} label={f.text} onRemove={() => { refocus.current = i; go({ ...query, [f.key]: query[f.key].filter((x) => x !== f.v) }); }}>{f.text}</A.Tag>)}
        </div>}
        {phase === 'failed' && <A.Alert tone="critical" title="We couldn’t update the results" action={<A.Button size="sm" onClick={() => setAttempt((n) => n + 1)}>Retry search</A.Button>}>{error} These are the results for your previous search.</A.Alert>}
        {phase === 'first-failed' && <A.EmptyState title="We couldn’t load the catalog" description={error} action={<A.Button onClick={() => setAttempt((n) => n + 1)}>Retry search</A.Button>} />}
        {result && result.total === 0 && phase !== 'refreshing' && <A.EmptyState announce title="No products match"
          description={`Nothing matches ${[query.q && `“${query.q}”`, ...applied.map((f) => f.text)].filter(Boolean).join(', ')}. ${applied.length ? 'Remove a filter or clear them all.' : 'Change your search.'}`}
          action={<A.Button onClick={() => go({ ...EMPTY, sort: query.sort })}>{!applied.length ? 'Clear search' : query.q ? 'Clear search and filters' : 'Clear all filters'}</A.Button>} />}
        {result && result.total > 0 && <ul className="cd-list" aria-busy={phase === 'refreshing'}>
          {result.items.map((p) => <li key={p.id}><A.Card className="cd-card">
            <img className="cd-thumb" src={cdSvg('#e4e8ee', '#8796a8')} alt="" /><A.CardContent className="cd-card-body">
            <h3 className="cd-name"><A.Link href={`#/product/${p.id}`} data-product={p.id} onClick={() => remember(p.id)}>{p.name}</A.Link></h3>
            <p className="cd-meta">{label(TYPES, p.type)} · {p.publisher} · {label(LICENSES, p.license)}</p>
            <p className="cd-price">{usd(p.price)}</p>
            {p.engine && <p className="cd-meta">Ikta 0.9: {COMPAT[p.compat.status]}</p>}
            <A.Checkbox label={`Compare ${p.name}`} checked={compare.includes(p.id)} disabled={!compare.includes(p.id) && compare.length >= 4}
              description={!compare.includes(p.id) && compare.length >= 4 ? 'Comparison holds 4 products; remove one first.' : undefined}
              onCheckedChange={(on) => onCompare(on ? [...compare, p.id] : compare.filter((x) => x !== p.id))} />
          </A.CardContent></A.Card></li>)}
        </ul>}
        {result && pages > 1 && <A.Pagination page={query.page} pageCount={pages} total={result.total} pageSize={PAGE} noun="products" hrefFor={(n) => toHash({ ...query, page: n })} />}
        {compare.length >= 2 && <p className="cd-note"><A.Link href={`#/compare?ids=${compare.join(',')}`}>Compare {compare.length} products</A.Link></p>}
      </section>
      <A.WorkflowStatus className="cd-vh">{status}</A.WorkflowStatus>
      <fieldset className="cd-sim"><legend>Simulate the service</legend>
        <A.Switch label="Slow responses" onCheckedChange={(on) => { sim.delay = on ? 1600 : 400; }} />
        <A.Switch label="Fail the next search" checked={failNext} onCheckedChange={(on) => { sim.failNext = on; setFailNext(on); }} />
      </fieldset>
    </div>
  );
}

function Compat({ p }) {
  if (!p.engine) return <p className="cd-note">Engine compatibility doesn’t apply: this is a {label(TYPES, p.type).toLowerCase()} download.</p>;
  const c = p.compat;
  return <div className="cd-compat"><A.Badge tone={c.status === 'verified' ? 'positive' : c.status === 'incompatible' ? 'critical' : 'neutral'}>{COMPAT[c.status]}</A.Badge>
    <p className="cd-note">{c.status === 'untested' ? 'Nobody has tested this version with Ikta 0.9. It may or may not work.' : `${c.engine}, package ${c.digest}, tested ${c.tested}.${c.limits ? ' ' + c.limits + '.' : ''}`}</p></div>;
}

function Product({ id, v }) {
  const p = PRODUCTS.find((x) => x.id === id);
  const [media, setMedia] = React.useState('front');
  React.useEffect(() => { document.getElementById('cd-product-h')?.focus(); }, [id]);
  if (!p) return <A.EmptyState title="This product isn’t available" description="It may have been withdrawn, or the link is wrong." action={<A.Link href="#/catalog">Browse the catalog</A.Link>} />;
  const version = p.versions.includes(v) ? v : p.version, owned = OWNED[p.id];
  return (
    <article className="cd-product" aria-labelledby="cd-product-h">
      <p><A.Link href={lastCatalog} onClick={back}>Back to results</A.Link></p>
      <h2 id="cd-product-h" tabIndex={-1} className="cd-h">{p.name}</h2>
      {owned && <A.Alert tone="neutral" title={`You own ${owned}`}>{owned !== p.version ? `Version ${p.version} is available.` : 'This is the latest version.'}</A.Alert>}
      <A.MediaGallery aria-label={`${p.name} previews`} value={media} onValueChange={setMedia} aspectRatio="16 / 9"
        items={[{ id: 'front', kind: 'image', label: 'Overview', src: cdSvg('#dfe6dc', '#6f8a66'), thumbnail: cdSvg('#dfe6dc', '#6f8a66'), alt: `${p.name}: overview render` }, { id: 'detail', kind: 'image', label: 'Close-up', src: cdSvg('#ece6dc', '#9a8466'), thumbnail: cdSvg('#ece6dc', '#9a8466'), alt: `${p.name}: close-up` }]} />
      <A.PropertyList aria-label="Facts" layout="inline">
        <A.PropertyListItem label="Version" value={`${version}${version === p.version ? ' (latest)' : ''}`} />
        <A.PropertyListItem label="Released" value={p.released} />
        <A.PropertyListItem label="File formats" value={p.formats} emptyLabel="Not stated by publisher" />
        <A.PropertyListItem label="Download size" value={p.size} />
        <A.PropertyListItem label="License" value={label(LICENSES, p.license)} />
        <A.PropertyListItem label="Publisher" value={p.publisher} />
        <A.PropertyListItem label="Price" value={usd(p.price)} />
      </A.PropertyList>
      {p.versions.length > 1 && <p className="cd-note">Other versions: {p.versions.filter((x) => x !== version).map((x) => <A.Link key={x} href={`#/product/${p.id}?v=${x}`}>{x}</A.Link>)}</p>}
      <section aria-labelledby="cd-compat-h"><h3 id="cd-compat-h" className="cd-sub">Compatibility with Ikta 0.9</h3><Compat p={p} /></section>
    </article>
  );
}

function Compare({ ids }) {
  const items = ids.map((id) => PRODUCTS.find((p) => p.id === id)).filter(Boolean).slice(0, 4);
  React.useEffect(() => { document.getElementById('cd-compare-h')?.focus(); }, []);
  /** @type {{ name: string, get: (p: any) => string | null }[]} */
  const rows = [{ name: 'Price', get: (p) => usd(p.price) }, { name: 'License', get: (p) => label(LICENSES, p.license) }, { name: 'Version', get: (p) => p.version },
    { name: 'File formats', get: (p) => p.formats || null }, { name: 'Ikta 0.9', get: (p) => (p.engine ? COMPAT[p.compat.status] : 'Doesn’t apply') },
    { name: 'Tested limits', get: (p) => (!p.engine ? 'Doesn’t apply' : p.compat.status === 'untested' ? 'Not tested' : p.compat.limits || null) }, { name: 'Publisher', get: (p) => p.publisher }];
  return (
    <section className="cd-compare" aria-labelledby="cd-compare-h">
      <p><A.Link href={lastCatalog} onClick={back}>Back to results</A.Link></p>
      <h2 id="cd-compare-h" tabIndex={-1} className="cd-h">Compare {items.length} products</h2>
      <div className="cd-scroll">
        <A.Table>
          <A.TableHeader><A.TableRow><A.TableHead><span className="cd-vh">Attribute</span></A.TableHead>{items.map((p) => <A.TableHead key={p.id} scope="col"><A.Link href={`#/product/${p.id}`}>{p.name}</A.Link></A.TableHead>)}</A.TableRow></A.TableHeader>
          <A.TableBody>{rows.map(({ name, get }) => { const vals = items.map(get), same = vals.every((x) => x === vals[0]);
            return <A.TableRow key={name}><A.TableHead scope="row">{name}{!same && <span className="cd-diff"> (differs)</span>}</A.TableHead>{vals.map((x, i) => <A.TableCell key={items[i].id}>{x ?? 'Not stated by publisher'}</A.TableCell>)}</A.TableRow>; })}</A.TableBody>
        </A.Table>
      </div>
    </section>
  );
}

function App() {
  const { route, hash } = useRoute();
  const [compare, setCompare] = React.useState([]);
  return (
    <main className="cd-page">
      <h1 className="cd-title">Lanternyard catalog</h1>
      {route.view === 'product' ? <Product id={route.id} v={route.v} /> : route.view === 'compare' ? <Compare ids={route.ids} />
        : <Catalog query={route.query} hash={hash} compare={compare} onCompare={setCompare} />}
    </main>
  );
}
// preview:end
export default App;
