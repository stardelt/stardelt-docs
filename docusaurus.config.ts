import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'stardelt',
  tagline: 'A self-hostable data platform for Kubernetes.',
  favicon: 'img/logo.svg',

  url: 'https://stardelt.io',
  baseUrl: '/',

  organizationName: 'stardelt',
  projectName: 'stardelt-docs',

  onBrokenLinks: 'throw',

  i18n: { defaultLocale: 'en', locales: ['en'] },

  markdown: {
    mermaid: true,
    hooks: { onBrokenMarkdownLinks: 'warn' },
  },
  themes: ['@docusaurus/theme-mermaid'],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/docs',
          editUrl: 'https://github.com/stardelt/stardelt-docs/tree/main/',
        },
        blog: false,
        theme: { customCss: './src/css/custom.css' },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    metadata: [
      {name: 'theme-color', content: '#18191b'},
      {name: 'twitter:card', content: 'summary_large_image'},
    ],
    image: 'img/og-stardelt.png',
    announcementBar: {
      id: 'pre-alpha-disclaimer',
      content:
        '<b>Pre-alpha.</b> stardelt changes quickly and is not ready for production.',
      backgroundColor: '#282a2e',
      textColor: '#e8eaed',
      isCloseable: false,
    },
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: true,
      respectPrefersColorScheme: false,
    },
    navbar: {
      title: 'stardelt',
      logo: { alt: 'stardelt', src: 'img/logo.svg' },
      items: [
        { to: '/docs/getting-started/quickstart', label: 'Quickstart', position: 'left' },
        { to: '/docs/intro/overview', label: 'Docs', position: 'left' },
        { to: '/docs/roadmap', label: 'Roadmap', position: 'left' },
        { to: '/docs/developer', label: 'Contribute', position: 'left' },
        { href: 'https://github.com/stardelt', label: 'GitHub', position: 'right' },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            { label: 'Quickstart', to: '/docs/getting-started/quickstart' },
            { label: 'How it works', to: '/docs/architecture/how-it-works' },
            { label: 'Roadmap', to: '/docs/roadmap' },
            { label: 'Sovereignty', to: '/docs/architecture/sovereignty' },
          ],
        },
        {
          title: 'Community',
          items: [
            { label: 'GitHub org', href: 'https://github.com/stardelt' },
            { label: 'Contribute', to: '/docs/developer' },
            { label: 'Report a security problem', href: 'https://github.com/stardelt/.github/blob/main/SECURITY.md' },
          ],
        },
      ],
      copyright: `Apache 2.0 — stardelt. Runs in your Kubernetes cluster.`,
    },
    prism: {
      theme: prismThemes.dracula,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'yaml', 'toml', 'rust', 'sql', 'python', 'json'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
