import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'stardelt',
  tagline: 'Your own data platform, on any Kubernetes.',
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
  themes: [
    '@docusaurus/theme-mermaid',
    [
      '@easyops-cn/docusaurus-search-local',
      {
        hashed: true,
        docsRouteBasePath: '/docs',
        indexDocs: true,
        indexBlog: false,
        indexPages: false,
        language: ['en'],
        highlightSearchTermsOnTargetPage: true,
        searchResultLimits: 8,
        searchResultContextMaxLength: 60,
        explicitSearchResultPath: true,
        searchBarShortcutHint: true,
      },
    ],
  ],

  plugins: [
    [
      '@docusaurus/plugin-client-redirects',
      {
        redirects: [
          { from: '/docs/guides/overview', to: '/docs/guides/tour-of-nova' },
          { from: '/docs/guides/command-palette', to: '/docs/guides/tour-of-nova' },
          { from: '/docs/operations/catalogs-access', to: '/docs/operations/access' },
          { from: '/docs/operations/network-access', to: '/docs/operations/access' },
          { from: '/docs/operations/health', to: '/docs/operations/troubleshooting' },
          { from: '/docs/guides/schedule-sql', to: '/docs/guides/schedule' },
          { from: '/docs/guides/published-notebooks', to: '/docs/guides/schedule' },
          { from: '/docs/guides/notebooks-in-git', to: '/docs/guides/schedule' },
          { from: '/docs/guides/connections-access', to: '/docs/guides/connections' },
          { from: '/docs/guides/connections-notebooks', to: '/docs/guides/connections' },
          { from: '/docs/guides/connections-troubleshooting', to: '/docs/guides/connections' },
        ],
      },
    ],
  ],

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

  customFields: {
    demoUrl: 'https://alpha.dev.stardelt.io',
    starRepo: 'stardelt/stardelt',
  },

  themeConfig: {
    metadata: [
      {name: 'theme-color', content: '#18191b'},
      {name: 'twitter:card', content: 'summary_large_image'},
    ],
    image: 'img/og-stardelt.png',
    announcementBar: {
      id: 'pre-alpha-disclaimer',
      content:
        '<b>Pre-alpha.</b> stardelt changes quickly. <a href="/docs/roadmap#what-works-today">What works today →</a>',
      backgroundColor: '#282a2e',
      textColor: '#e8eaed',
      isCloseable: false,
    },
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    mermaid: {
      theme: { dark: 'base', light: 'base' },
      options: {
        themeVariables: {
          background: '#18191b',
          primaryColor: '#282a2e',
          primaryTextColor: '#e8eaed',
          primaryBorderColor: '#3e4147',
          lineColor: '#8e949e',
          secondaryColor: '#1f2124',
          tertiaryColor: '#1f2124',
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Helvetica, Arial, sans-serif",
          noteBkgColor: '#282a2e',
          noteTextColor: '#e8eaed',
          noteBorderColor: '#3e4147',
          actorBkg: '#282a2e',
          actorBorder: '#3e4147',
          actorTextColor: '#e8eaed',
          signalColor: '#8e949e',
          signalTextColor: '#b0b5bd',
          labelBoxBkgColor: '#282a2e',
          labelBoxBorderColor: '#3e4147',
          labelTextColor: '#e8eaed',
          clusterBkg: '#1f2124',
          clusterBorder: '#3e4147',
          edgeLabelBackground: '#18191b',
        },
      },
    },
    navbar: {
      title: 'stardelt',
      logo: { alt: 'stardelt', src: 'img/logo.svg' },
      items: [
        { type: 'docSidebar', sidebarId: 'start', label: 'Start', position: 'left' },
        { type: 'docSidebar', sidebarId: 'use', label: 'Use', position: 'left' },
        { type: 'docSidebar', sidebarId: 'build', label: 'Build', position: 'left' },
        { type: 'docSidebar', sidebarId: 'operate', label: 'Operate', position: 'left' },
        { type: 'docSidebar', sidebarId: 'reference', label: 'Reference', position: 'left' },
        { to: '/demo', label: 'Try the demo', position: 'right', className: 'navbar-demo-button' },
        { type: 'custom-star', position: 'right' },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            { label: 'What is stardelt', to: '/docs/intro/overview' },
            { label: 'Quickstart', to: '/docs/getting-started/quickstart' },
            { label: 'How it works', to: '/docs/architecture/how-it-works' },
            { label: 'Roadmap', to: '/docs/roadmap' },
            { label: 'Slides', href: 'https://slides.stardelt.io' },
            { label: 'Sovereignty', to: '/docs/architecture/sovereignty' },
          ],
        },
        {
          title: 'Community',
          items: [
            { label: 'GitHub', href: 'https://github.com/stardelt' },
            { label: 'Star on GitHub ★', href: 'https://github.com/stardelt/stardelt' },
            { label: 'Wallpapers', to: '/docs/community/wallpapers' },
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
