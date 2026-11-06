import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';
import fs from 'node:fs';
import path from 'node:path';

// A new schema adds a page; the sidebar picks it up without a second edit.
const referenceResources = fs
  .readdirSync(path.join(process.cwd(), 'docs', 'reference', 'resources'))
  .filter((file) => file.endsWith('.md') && file !== 'index.md')
  .sort()
  .map((file) => `reference/resources/${file.slice(0, -3)}`);

// One page per service; adding a page adds it to the sidebar (stardelt-docs#4).
const servicePages = fs
  .readdirSync(path.join(process.cwd(), 'docs', 'services'))
  .filter((file) => file.endsWith('.md'))
  .sort()
  .map((file) => `services/${file.slice(0, -3)}`);

const sidebars: SidebarsConfig = {
  docs: [
    {
      type: 'category',
      label: 'Start here',
      collapsed: false,
      items: [
        'intro/overview',
        'getting-started/quickstart',
        'architecture/how-it-works',
      ],
    },
    {
      type: 'category',
      label: 'Install',
      collapsed: false,
      items: [
        'getting-started/prerequisites',
        'getting-started/hetzner-k3s',
        'getting-started/your-cluster',
      ],
    },
    {
      type: 'category',
      label: 'Work with data',
      collapsed: false,
      items: [
        'guides/source-to-dashboard',
        'guides/connections',
        'guides/schedule-sql',
        'guides/notebooks-in-git',
        'developer/vscode',
        'guides/airflow',
        'guides/publish-pipelines',
        'guides/bundle-reference',
        'guides/query-log',
        'guides/lineage',
        'guides/sdk-cli-mcp',
      ],
    },
    {
      type: 'category',
      label: 'Operate',
      collapsed: true,
      items: [
        'operations/production',
        'operations/backups',
        'operations/rotating-secrets',
        'operations/troubleshooting',
      ],
    },
    {
      type: 'category',
      label: 'Understand',
      collapsed: true,
      items: [
        'architecture/overview',
        'architecture/services',
        'architecture/identity',
        'architecture/identity-integrations',
        'architecture/security-model',
        'architecture/sovereignty',
        'architecture/licenses',
      ],
    },
    {
      type: 'category',
      label: 'Services',
      collapsed: true,
      items: servicePages,
    },
    {
      type: 'category',
      label: 'Reference',
      collapsed: true,
      items: ['reference/resources/index', ...referenceResources, 'reference/api'],
    },
    {
      type: 'category',
      label: 'Contribute',
      collapsed: true,
      link: { type: 'doc', id: 'developer/index' },
      items: ['developer/contributing'],
    },
    'roadmap',
  ],
};

export default sidebars;
