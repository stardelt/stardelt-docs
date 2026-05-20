import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docs: [
    {
      type: 'category',
      label: 'Architecture',
      collapsed: false,
      items: [
        'architecture/overview',
        'architecture/components',
        'architecture/licenses',
        'architecture/sovereignty',
      ],
    },
    'roadmap',
    {
      type: 'category',
      label: 'Design',
      collapsed: true,
      items: ['design/master-spec'],
    },
    'mvp',
    {
      type: 'category',
      label: 'Diagrams',
      collapsed: true,
      items: ['diagrams/layers', 'diagrams/control-plane', 'diagrams/data-flow'],
    },
  ],
};

export default sidebars;
