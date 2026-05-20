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

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  i18n: { defaultLocale: 'en', locales: ['en'] },

  markdown: { mermaid: true },
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
    image: 'img/logo-wordmark.svg',
    announcementBar: {
      id: 'pre-alpha-disclaimer',
      content:
        '⚠️ <b>Pre-alpha.</b> stardelt is in an MVP / vibecoding phase — moving fast, iterating in the open. Expect breaking changes; not ready for production.',
      backgroundColor: '#1a1f3d',
      textColor: '#e6e9ff',
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
        { to: '/docs/architecture/overview', label: 'Architecture', position: 'left' },
        { to: '/docs/roadmap', label: 'Roadmap', position: 'left' },
        { to: '/docs/design/master-spec', label: 'Design', position: 'left' },
        { to: '/docs/mvp', label: 'MVP', position: 'left' },
        { href: 'https://github.com/stardelt', label: 'GitHub', position: 'right' },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            { label: 'Architecture', to: '/docs/architecture/overview' },
            { label: 'Components', to: '/docs/architecture/components' },
            { label: 'Roadmap', to: '/docs/roadmap' },
            { label: 'Sovereignty', to: '/docs/architecture/sovereignty' },
          ],
        },
        {
          title: 'Community',
          items: [
            { label: 'GitHub org', href: 'https://github.com/stardelt' },
            { label: 'stardelt.io', href: 'https://stardelt.io' },
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
