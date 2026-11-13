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
const streamingBus = 'services/kafka';

const sidebars: SidebarsConfig = {
  docs: [
    {
      type: 'category',
      label: 'Start here',
      collapsed: false,
      items: [
        'intro/overview',
        'getting-started/quickstart',
        'guides/pegelonline-demo',
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
      label: 'Identity',
      collapsed: false,
      items: [
        'architecture/identity-integrations',
        'architecture/identity-blocks-core',
        'architecture/identity-blocks-platform',
        'architecture/identity-providers',
      ],
    },
    {
      type: 'category',
      label: 'Work with data',
      collapsed: false,
      items: [
        'guides/overview',
        'guides/source-to-dashboard',
        'guides/load-and-transfer',
        'guides/connections',
        'guides/connections-access',
        'guides/connections-notebooks',
        'guides/connections-secret-stores',
        'guides/connections-troubleshooting',
        'guides/published-notebooks',
        'guides/schedule-sql',
        'guides/runs',
        'guides/notebooks-in-git',
        'guides/destinations',
        'guides/streams',
        'guides/airflow',
        'guides/query-log',
        'guides/command-palette',
        'guides/catalog',
        'guides/sql-editor',
        'guides/compute',
        'guides/lineage',
      ],
    },
    {
      type: 'category',
      label: 'Automate',
      collapsed: true,
      items: [
        'guides/publish-pipelines',
        'guides/bundle-reference',
        'guides/deployments',
        'guides/sdk-cli-mcp',
        'guides/cli-pipelines',
        'guides/sql-statements',
        'guides/python',
        'guides/mcp',
        'guides/service-principals',
        'developer/develop',
      ],
    },
    {
      type: 'category',
      label: 'Operate',
      collapsed: true,
      items: [
        'operations/catalogs-access',
        'operations/production',
        'operations/backups',
        'operations/checks',
        'operations/health',
        'operations/logs',
        'operations/monitoring',
        'operations/pod-security',
        'operations/rotating-secrets',
        'operations/network-access',
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
        'architecture/security-model',
        'architecture/sovereignty',
        'architecture/licenses',
        'architecture/current-generation',
      ],
    },
    {
      type: 'category',
      label: 'Services',
      collapsed: true,
      // Kafka follows Spark (opt-in streaming bus), overriding alphabetical order.
      items: servicePages
        .filter((p) => p !== streamingBus)
        .flatMap((p) => (p === 'services/spark' ? [p, streamingBus] : [p])),
    },
    {
      type: 'category',
      label: 'Reference',
      collapsed: true,
      items: ['reference/resources/index', ...referenceResources, 'reference/api', 'api-versions', 'glossary'],
    },
    {
      type: 'category',
      label: 'Contribute',
      collapsed: true,
      link: { type: 'doc', id: 'developer/index' },
      items: [
        'developer/contributing',
        'developer/how-it-is-built',
        'developer/recipes',
        'developer/writing-issues',
        'developer/diagrams',
        'developer/skills',
        'community/wallpapers',
      ],
    },
    'roadmap',
  ],
};

export default sidebars;
