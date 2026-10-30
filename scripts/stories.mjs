import { syncActionsGuide } from './sync-actions-guide.mjs';
syncActionsGuide();
// Generates Storybook's stories from the design system's own sources, so there is one source for both:
//   build/previews.txt          → .storybook/generated/<Name>.stories.jsx (one story per preview card)
//   project/components/*/README → each component's docs page
//   project/*.md                → the Guide pages
//   project/tokens.json         → .storybook/generated/tokens.css
// The output is not committed; `npm run storybook` and `npm run build-storybook` regenerate it.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tokensCss } from './tokens-css.mjs';

const out = '.storybook/generated';
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
writeFileSync(`${out}/tokens.css`, tokensCss('project/tokens.json'));

const rel = (p) => '../../' + p; // from .storybook/generated to the repo root
const guides = [['Introduction', 'README.md'], ['Elevation', 'Elevation.md'], ['Motion', 'Motion.md'], ['Charts', 'Charts.md'], ['Mobile', 'Mobile.md'], ['Theming', 'Theming.md'], ['Distinctiveness', 'Distinctiveness.md'], ['Research', 'Research.md'], ['Actions in place', 'ActionsInPlace.md'], ['Framework', 'framework/README.md'], ['Edit record', 'framework/patterns/edit-record.md'], ['Async collection', 'framework/patterns/async-collection.md'], ['Consequential action', 'framework/patterns/consequential-action.md'], ['Review and submit', 'framework/patterns/review-submit.md'], ['Settings', 'framework/patterns/settings.md'], ['Members', 'framework/patterns/members.md'], ['Billing', 'framework/patterns/billing.md'], ['Auth', 'framework/patterns/auth.md'], ['Audit log', 'framework/patterns/audit-log.md'], ['Import', 'framework/patterns/import.md'], ['Sync', 'framework/patterns/sync.md'], ['Developer settings', 'framework/patterns/developer-settings.md'], ['Agent action', 'framework/patterns/agent-action.md'], ['Assistant conversation', 'framework/patterns/assistant-conversation.md'], ['Onboarding', 'framework/patterns/onboarding.md'], ['Screen layout', 'framework/patterns/screen-layout.md'], ['App skeleton', 'framework/app-skeleton.md']];
for (const [title, file] of guides) {
  writeFileSync(`${out}/guide-${title}.mdx`, `import { Meta, Markdown } from '@storybook/addon-docs/blocks';
import md from '${rel('project/' + file)}?raw';

<Meta title="Guide/${title}" />

<Markdown>{md}</Markdown>
`);
}

const pageDocs = { Elevation: 'project/Elevation.md', Motion: 'project/Motion.md', ActionsInPlace: 'project/ActionsInPlace.md', EditRecord: 'project/framework/patterns/edit-record.md', AsyncCollection: 'project/framework/patterns/async-collection.md', ConsequentialAction: 'project/framework/patterns/consequential-action.md', ReviewSubmit: 'project/framework/patterns/review-submit.md', SettingsPattern: 'project/framework/patterns/settings.md', MembersPattern: 'project/framework/patterns/members.md', BillingPattern: 'project/framework/patterns/billing.md', AuthPattern: 'project/framework/patterns/auth.md', AuditLogPattern: 'project/framework/patterns/audit-log.md', ImportPattern: 'project/framework/patterns/import.md', SyncPattern: 'project/framework/patterns/sync.md', DeveloperSettingsPattern: 'project/framework/patterns/developer-settings.md', AgentActionPattern: 'project/framework/patterns/agent-action.md', ScreenLayoutEditor: 'project/framework/patterns/screen-layout.md', ScreenLayoutDecision: 'project/framework/patterns/screen-layout.md', ScreenLayoutReport: 'project/framework/patterns/screen-layout.md', OnboardingPattern: 'project/framework/patterns/onboarding.md', AppSkeleton: 'project/framework/app-skeleton.md' };
const src = readFileSync('build/previews.txt', 'utf8');
const names = [];
for (const sec of src.split(/^=== /m).filter((s) => s.trim())) {
  const [head, ...restLines] = sec.split('\n');
  const [name, marker] = head.split(' | ');
  const body = restLines.join('\n');
  const css = (body.match(/--- css\n([\s\S]*?)(?=--- jsx)/) || [, ''])[1].trim();
  const jsx = body.split('--- jsx\n')[1].trim();
  const attr = (k) => (marker.match(new RegExp(k + '="([^"]*)"')) || [])[1];
  const group = attr('group') || 'Components';
  const subtitle = attr('subtitle') || '';
  const height = +(marker.match(/height=(\d+)/) || [, 300])[1];
  const readme = existsSync(`project/components/${name}/README.md`) ? `project/components/${name}/README.md` : pageDocs[name];
  writeFileSync(`${out}/${name}.stories.jsx`, `// Generated from build/previews.txt by scripts/stories.mjs. Edit the preview there, not here.
import * as React from 'react';
import * as A from '${rel('project/components/src/index.tsx')}';
${readme ? `import guide from '${rel(readme)}?raw';\n` : ''}
const css = ${JSON.stringify(css)};

${jsx}

export default {
  title: ${JSON.stringify(group + '/' + name)},
  tags: ['autodocs'],
  parameters: {
    docs: {
      // The docs page already shows the title, so the guide's own top heading is dropped.
      description: { component: ${readme ? "guide.replace(/^# .*\\n+/, '')" : JSON.stringify(subtitle)} },
      // Each story renders in its own frame at the height the design system gives its card, so overlays stay inside it.
      story: { inline: false, height: '${height + 40}px' },
    },
  },
};

export const Preview = {
  parameters: { docs: { description: { story: ${JSON.stringify(subtitle)} } } },
  render: () => <><style>{css}</style><App /></>,
};
`);
  names.push(name);
}
console.log(names.length + ' stories, ' + guides.length + ' guide pages');
