import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

// Pages about the project, not about a release: never versioned (stardelt/stardelt-docs#1145).
const sidebars: SidebarsConfig = {
  project: [
    'roadmap',
    { type: 'category', label: 'Contribute', collapsed: false, items: ['developer/index', 'developer/writing-issues', 'developer/diagrams'] },
    'community/wallpapers',
  ],
};

export default sidebars;
