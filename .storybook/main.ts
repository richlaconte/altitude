import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: ['./generated/*.mdx', './generated/*.stories.jsx'],
  addons: ['@storybook/addon-docs'],
  core: { disableTelemetry: true },
  // Served from https://<owner>.github.io/<repo>/storybook/: Storybook's static build uses relative paths, so no base is needed.
};
export default config;
