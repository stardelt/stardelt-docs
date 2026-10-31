import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';
import fs from 'node:fs';
import path from 'node:path';

// A new schema adds a page; the sidebar picks it up without a second edit.
const referenceResources = fs
  .readdirSync(path.join(process.cwd(), 'docs', 'reference', 'resources'))
  .filter((file) => file.endsWith('.md') && file !== 'index.md')
  .sort()
  .map((file) => `reference/resources/${file.slice(0, -3)}`);

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
        'getting-started/hetzner-k3s'
      ],
    },
    {
      type: 'category',
      label: 'Guides',
      collapsed: false,
      items: [
        'guides/source-to-dashboard',
        'guides/connections',
        'guides/schedule-sql',
        'guides/query-log',
        'guides/notebooks-in-git',
        'guides/sdk-cli-mcp',
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
        'architecture/security-model',
        'architecture/licenses',
        'architecture/sovereignty',
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
        'developer/vscode',
      ],
    },
    {
      type: 'category',
      label: 'Reference',
      collapsed: true,
      items: ['reference/resources/index', ...referenceResources, 'reference/api'],
    },
  ],
};

export default sidebars;
