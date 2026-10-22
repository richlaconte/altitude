import { addons } from 'storybook/manager-api';
import { create } from 'storybook/theming';

addons.setConfig({
  theme: create({ base: 'light', brandTitle: 'Altitude', fontBase: '"Instrument Sans", system-ui, sans-serif' }),
  // The previews take no args, so the controls panel would only ever say so. The toolbar switches scheme, motion and contrast.
  layoutCustomisations: { showPanel: () => false },
});
