import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';
import fs from 'node:fs';
import path from 'node:path';

// A new schema adds a page; the sidebar picks it up without a second edit.
const referenceResources = fs
  .readdirSync(path.join(process.cwd(), 'docs', 'reference', 'resources'))
  .filter((file) => file.endsWith('.md') && file !== 'index.md')
  .sort()
  .map((file) => `reference/resources/${file.slice(0, -3)}`);

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
    cat('Find and understand data', ['guides/tour-of-nova', 'guides/catalog', 'guides/query-log']),
    cat('Query', ['guides/sql-editor', 'guides/ask', 'guides/connect-your-tools']),
    cat('Bring data in', ['guides/load-and-transfer', 'guides/connections', 'guides/connections-secret-stores']),
    cat('Schedule and run', ['guides/schedule', 'guides/runs', 'guides/airflow']),
    cat('Streams', ['guides/streams']),
  ],
  build: [
    'build',
    cat('Command line and Python', ['guides/cli', 'guides/python']),
    cat('AI agents', ['guides/mcp', 'guides/models', 'guides/service-principals']),
    cat('Publish from Git', ['guides/publish-pipelines', 'guides/bundle-reference']),
    'developer/develop',
  ],
  operate: [
    'operate',
    cat('Install and upgrade', ['getting-started/prerequisites', 'getting-started/your-cluster', 'getting-started/hetzner-k3s', 'operations/upgrade', 'operations/production']),
    cat('Sign-in and access', ['operations/sign-in', 'operations/access']),
    cat('Keep it running', ['operations/backups', 'operations/checks', 'operations/monitoring', 'operations/troubleshooting']),
    'operations/security',
  ],
  reference: [
    'reference/index',
    cat('Resources', ['reference/resources/index', ...referenceResources]),
    'reference/api',
    cat('Architecture', ['architecture/overview', 'architecture/spark-connection', 'architecture/services', 'architecture/identity', 'architecture/licenses']),
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
