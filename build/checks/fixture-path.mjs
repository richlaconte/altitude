import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
export const fixtureRoot = process.env.ALT_FIXTURE_ROOT
  ? resolve(process.env.ALT_FIXTURE_ROOT)
  : fileURLToPath(new URL('../test/', import.meta.url));
export const fixturePath = (name, scheme = 'daylight') => resolve(fixtureRoot, `p-${name}-${scheme}.html`);
