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

const cat = (label: string, items: any[], collapsed = false) => ({ type: 'category' as const, label, collapsed, items });

const sidebars: SidebarsConfig = {
  start: [
    'intro/overview',
    'getting-started/quickstart',
    'guides/pegelonline-demo',
    'architecture/how-it-works',
    cat('Why stardelt', ['architecture/sovereignty', 'architecture/current-generation']),
    'roadmap',
  ],
  use: [
    'use',
    cat('Find and understand data', ['guides/overview', 'guides/command-palette', 'guides/catalog', 'guides/lineage', 'guides/query-log']),
    cat('Query', ['guides/sql-editor', 'guides/ask', 'guides/connect-your-tools', 'guides/compute']),
    cat('Bring data in', ['guides/source-to-dashboard', 'guides/load-and-transfer', 'guides/connections', 'guides/connections-access', 'guides/connections-notebooks', 'guides/connections-secret-stores', 'guides/connections-troubleshooting']),
    cat('Schedule and run', ['guides/schedule-sql', 'guides/published-notebooks', 'guides/runs', 'guides/destinations', 'guides/airflow', 'guides/notebooks-in-git']),
    cat('Streams', ['guides/streams']),
  ],
  build: [
    'build',
    cat('Command line and Python', ['guides/cli', 'guides/sdk-cli-mcp', 'guides/python', 'guides/sql-statements', 'guides/cli-pipelines']),
    cat('AI agents', ['guides/mcp', 'guides/models', 'guides/service-principals']),
    cat('Publish from Git', ['guides/publish-pipelines', 'guides/deployments', 'guides/bundle-reference']),
    'developer/develop',
  ],
  operate: [
    'operate',
    cat('Install and upgrade', ['getting-started/prerequisites', 'getting-started/your-cluster', 'getting-started/hetzner-k3s', 'operations/production', 'api-versions']),
    cat('Sign-in and access', ['architecture/identity-providers', 'architecture/identity-integrations', 'architecture/identity-blocks-core', 'architecture/identity-blocks-platform', 'operations/catalogs-access', 'operations/network-access']),
    cat('Keep it running', ['operations/backups', 'operations/health', 'operations/checks', 'operations/monitoring', 'operations/logs', 'operations/performance', 'operations/troubleshooting']),
    cat('Security', ['architecture/security-model', 'operations/pod-security', 'operations/rotating-secrets']),
    cat('Components', servicePages.filter((p) => p !== streamingBus).flatMap((p) => (p === 'services/spark' ? [p, streamingBus] : [p])), true),
  ],
  reference: [
    'reference/index',
    cat('Resources', ['reference/resources/index', ...referenceResources]),
    'reference/api',
    cat('Architecture', ['architecture/overview', 'architecture/services', 'architecture/identity', 'architecture/licenses']),
    'glossary',
  ],
  contribute: [
    'developer/index',
    'developer/contributing',
    'developer/how-it-is-built',
    'developer/recipes',
    'developer/writing-issues',
    'developer/diagrams',
    'developer/skills',
    'community/wallpapers',
  ],
};

export default sidebars;
