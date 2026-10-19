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
        'getting-started/your-cluster',
        'getting-started/hetzner-k3s',
        'getting-started/local-kind'
      ],
    },
    {
      type: 'category',
      label: 'Architecture',
      collapsed: false,
      items: [
        'architecture/overview',
        'architecture/services',
        'architecture/identity',
        'architecture/identity-integrations',
        'architecture/permissions-research',
        'architecture/copilot-research',
        'architecture/security-model',
        'architecture/licenses',
        'architecture/sovereignty',
      ],
    },
    {
      type: 'category',
      label: 'Design',
      collapsed: false,
      items: [
        'design/master-spec',
        'design/execution-plan',
        'design/nova-feature-parity',
        'design/gap-decisions',
        'design/gap-analysis', 'design/market-gap-analysis', 'design/scheduled-jobs',
        {
          type: 'link',
          label: 'Permission model research (Unity Catalog / Dremio)',
          href: '/docs/architecture/permissions-research',
        },
        'design/multitenant-catalogs',
      ],
    },
    {
      type: 'category',
      label: 'Operations',
      collapsed: false,
      items: [
        'operations/production',
        'operations/backups',
        'operations/rotating-secrets',
      ],
    },
    'roadmap',
    {
      type: 'category',
      label: 'Developer',
      collapsed: true,
      link: { type: 'doc', id: 'developer/index' },
      items: [
        'developer/index',
        'developer/contributing',
        'developer/ai-fleet',
      ],
    },
  ],
};

export default sidebars;
