import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docs: [
    {
      type: 'category',
      label: 'Intro',
      collapsed: false,
      items: ['intro/overview'],
    },
    {
      type: 'category',
      label: 'Getting started',
      collapsed: false,
      items: [
        'getting-started/prerequisites',
        'getting-started/local-kind',
        'getting-started/smoke-test',
      ],
    },
    {
      type: 'category',
      label: 'Architecture',
      collapsed: false,
      items: [
        'architecture/overview',
        'architecture/services',        
        'architecture/licenses',
        'architecture/sovereignty',
      ],
    },
    'roadmap',
    {
      type: 'category',
      label: 'Developer',
      collapsed: true,
      link: { type: 'doc', id: 'developer/index' },
      items: [
        'developer/contributing',
        'developer/implementation-log',
      ],
    },
  ],
};

export default sidebars;
