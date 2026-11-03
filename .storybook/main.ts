import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: ['./generated/*.mdx', './generated/*.stories.jsx', './adapters/*.stories.jsx', './examples/*.stories.tsx'],
  addons: ['@storybook/addon-docs'],
  core: { disableTelemetry: true },
  // The example apps (./examples) import the package by name, as a consumer would. Here, as in
  // scripts/build-examples.mjs, it's the components' own sources (#428).
  viteFinal: async (vite) => {
    const target = `${process.cwd()}/project/components/src/index.tsx`; // Storybook runs from the repository root
    vite.resolve = vite.resolve ?? {};
    const existing = Array.isArray(vite.resolve.alias)
      ? vite.resolve.alias
      : Object.entries(vite.resolve.alias ?? {}).map(([find, replacement]) => ({ find, replacement: replacement as string }));
    // Exactly the package name, so a subpath (altitude-design/chart-themes) isn't redirected too.
    vite.resolve.alias = [...existing, { find: /^altitude-design$/, replacement: target }];
    return vite;
  },
  // Served from https://<owner>.github.io/<repo>/storybook/: Storybook's static build uses relative paths, so no base is needed.
};
export default config;
