import * as React from 'react';
import type { Preview } from '@storybook/react-vite';
import { AltitudeProvider } from '../project/components/src/index';
import './generated/tokens.css';
import '../project/components/bundle.css';
import './preview.css';

type Scheme = 'daylight' | 'nightfall';

/** Puts the chosen scheme on the whole frame too, so the page behind a story matches it. */
function Frame({ scheme, motion, contrast, children }: { scheme: Scheme; motion: 'system' | 'full' | 'reduced'; contrast: 'system' | 'more'; children: React.ReactNode }) {
  React.useLayoutEffect(() => { document.documentElement.setAttribute('data-theme', scheme); }, [scheme]);
  return <AltitudeProvider scheme={scheme} motion={motion} contrast={contrast}>{children}</AltitudeProvider>;
}

const preview: Preview = {
  globalTypes: {
    scheme: { description: 'Colour scheme', toolbar: { title: 'Scheme', icon: 'paintbrush', dynamicTitle: true, items: [
      { value: 'daylight', title: 'Daylight' }, { value: 'nightfall', title: 'Nightfall' }] } },
    motion: { description: 'Motion', toolbar: { title: 'Motion', icon: 'transfer', dynamicTitle: true, items: [
      { value: 'system', title: 'Motion: system' }, { value: 'full', title: 'Motion: full' }, { value: 'reduced', title: 'Motion: reduced' }] } },
    contrast: { description: 'Contrast', toolbar: { title: 'Contrast', icon: 'contrast', dynamicTitle: true, items: [
      { value: 'system', title: 'Contrast: system' }, { value: 'more', title: 'Contrast: more' }] } },
  },
  initialGlobals: { scheme: 'daylight', motion: 'system', contrast: 'system' },
  decorators: [(Story, { globals }) => (
    <Frame scheme={globals.scheme} motion={globals.motion} contrast={globals.contrast}><Story /></Frame>
  )],
  parameters: {
    layout: 'padded',
    backgrounds: { disable: true },
    options: { storySort: { order: ['Guide', ['Introduction', 'Elevation', 'Motion', 'Theming', 'Research', 'Actions in place'], 'Foundations', 'Actions', 'Inputs', 'Navigation', 'Display', 'Layout', 'Overlays', 'Patterns'] } },
  },
};
export default preview;
