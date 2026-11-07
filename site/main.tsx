// Promotional homepage. Task: try Altitude, explore an example, then install.
// Lead: a real interactive workspace. Primary page action: Get started.
// The workbench has its own PrimaryScope; all persistence is explicitly browser-local.
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { AltitudeProvider, CodeBlock } from '../project/components/src/index';
import type { BuiltInScheme } from '../project/components/src/index';
import { Showcase } from './showcase';
import { installTabs } from './snippets';

declare const __SITE__: {
  version: string;
  examples: { slug: string; title: string; what: string }[];
  previews: Record<string, string>;
};

const REPO = 'https://github.com/richlaconte/altitude';
const LINKS = {
  components: 'https://richlaconte.github.io/altitude/storybook/',
  guide: `${REPO}/blob/main/project/README.md`,
  setup: `${REPO}/blob/main/docs/framework/AGENT-SETUP.md`,
  research: `${REPO}/blob/main/project/Research.md`,
  npm: 'https://www.npmjs.com/package/altitude-design',
};
const FEATURED = [
  { slug: 'support-inbox', title: 'Support inbox', description: 'A place to work through the queue.', alt: 'Support inbox with a ticket list, an open conversation, and a reply composer.' },
  { slug: 'booking', title: 'Appointment booking', description: 'From choosing a time to checking the details.', alt: 'Appointment booking with available times and a summary of the appointment.' },
  { slug: 'docs-editor', title: 'Document editor', description: 'Write, comment, and review changes together.', alt: 'Document editor showing a travel policy and its review tools.' },
];
const SETUP = [
  { label: 'Codex', language: 'sh', code: 'npx altitude init --client codex\n# After reviewing the preview:\nnpx altitude init --client codex --apply' },
  { label: 'Claude Code', language: 'sh', code: 'npx altitude init --client claude\n# After reviewing the preview:\nnpx altitude init --client claude --apply' },
];

function systemScheme(): BuiltInScheme {
  const theme = document.documentElement.getAttribute('data-theme');
  if (theme === 'dark' || theme === 'nightfall') return 'nightfall';
  if (theme === 'light' || theme === 'daylight') return 'daylight';
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'nightfall' : 'daylight';
}

function ExternalLink({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a href={href} target="_blank" rel="noopener noreferrer" {...props}>{children}<span className="alt-sr"> (opens in a new tab)</span></a>;
}

function Page() {
  const [scheme, setScheme] = React.useState<BuiltInScheme>(systemScheme);
  React.useLayoutEffect(() => { document.body.setAttribute('data-theme', scheme); }, [scheme]);
  const otherExamples = __SITE__.examples.filter((example) => !FEATURED.some((item) => item.slug === example.slug));

  return (
    <AltitudeProvider scheme={scheme} className="page promo-page">
      <a className="skip" href="#main">Skip to content</a>
      <header className="nav promo-nav">
        <div className="wrap nav-row">
          <a className="brand" href="#top" aria-label="Altitude, back to top">
            <span className="mark" aria-hidden="true"><i /><i /><i /></span>Altitude
          </a>
          <nav className="nav-links" aria-label="Site">
            <ExternalLink href={LINKS.components}>Components</ExternalLink>
            <ExternalLink className="nav-local" href={LINKS.guide}>Docs</ExternalLink>
            <a className="alt-btn" data-variant="primary" data-size="md" href="#start"><span className="alt-btn-label">Get started</span></a>
          </nav>
        </div>
      </header>

      <main id="main">
        <section className="wrap promo-intro" id="top" aria-labelledby="intro-title">
          <h1 id="intro-title">Give your app<br />some depth.</h1>
          <div className="promo-description">
            <p>React components and guidance for your coding agent.</p>
            <span>Open source <span aria-hidden="true">·</span> MIT licence <span aria-hidden="true">·</span> v{__SITE__.version}</span>
          </div>
        </section>

        <section className="wrap workbench-section" aria-label="Try Altitude">
          <Showcase scheme={scheme} onSchemeChange={setScheme} />
        </section>
        <div className="wrap workbench-tail">
          <p>These are the components you install.</p>
          <ExternalLink href={LINKS.components}>Browse the components <span aria-hidden="true">↗</span></ExternalLink>
        </div>

        <section className="wrap promo-examples" id="examples" aria-labelledby="examples-title">
          <div className="promo-section-head">
            <h2 id="examples-title">Example apps</h2>
            <p>Open one and try it. All data is simulated.</p>
          </div>
          <div className="example-gallery">
            {FEATURED.map((example) => (
              <article className="example-preview" key={example.slug}>
                <ExternalLink className="example-image-link" href={`examples/${example.slug}.html`} aria-label={`Open ${example.title} example (opens in a new tab)`}>
                  <img src={__SITE__.previews[example.slug]} alt={example.alt} width={1280} height={720} loading="lazy" decoding="async" />
                </ExternalLink>
                <div className="example-caption">
                  <h3><ExternalLink href={`examples/${example.slug}.html`}>{example.title}<span aria-hidden="true">↗</span></ExternalLink></h3>
                  <p>{example.description}</p>
                </div>
              </article>
            ))}
          </div>
          <nav className="more-examples" aria-label="More example apps">
            <span>Also try</span>
            {otherExamples.map((example) => <ExternalLink key={example.slug} href={`examples/${example.slug}.html`}>{example.title}</ExternalLink>)}
          </nav>
        </section>

        <section className="wrap promo-start" id="start" aria-labelledby="start-title">
          <div className="promo-section-head">
            <h2 id="start-title">Make something with it.</h2>
            <p>Install the package. Add the guidance when you’re working with a coding agent.</p>
          </div>
          <div className="setup-grid">
            <div className="setup-block">
              <CodeBlock title="Install Altitude" tabs={installTabs} />
              <p>React 18.2 or 19. <ExternalLink href={LINKS.guide}>Open the quick start <span aria-hidden="true">↗</span></ExternalLink></p>
            </div>
            <div className="setup-block">
              <CodeBlock title="Set up your coding agent" tabs={SETUP} />
              <p>Preview the project instructions before applying them. <ExternalLink href={LINKS.setup}>Setup guide <span aria-hidden="true">↗</span></ExternalLink></p>
            </div>
          </div>
        </section>
      </main>

      <footer className="wrap promo-footer">
        <div><a className="brand" href="#top">Altitude</a><p>Built with the same components.</p></div>
        <nav className="footer-links" aria-label="Resources">
          <ExternalLink href={REPO}>GitHub</ExternalLink>
          <ExternalLink href={LINKS.npm}>npm</ExternalLink>
          <ExternalLink href={LINKS.research}>Research</ExternalLink>
          <ExternalLink href="agent.html">Agent demo</ExternalLink>
          <ExternalLink href={`${REPO}/issues/new/choose`}>Report an issue</ExternalLink>
        </nav>
      </footer>
    </AltitudeProvider>
  );
}

createRoot(document.getElementById('altitude-site')!).render(<Page />);
