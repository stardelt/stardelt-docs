import type { ReactNode } from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import clsx from 'clsx';

import styles from './index.module.css';

/* ------------------------------------------------------------------ */
/*  SVG icons                                                           */
/* ------------------------------------------------------------------ */

function IconDatabase(): ReactNode {
  return (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden>
      <ellipse cx="10" cy="6" rx="6.5" ry="2.5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M3.5 6v3.5c0 1.38 2.91 2.5 6.5 2.5s6.5-1.12 6.5-2.5V6" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M3.5 9.5V13c0 1.38 2.91 2.5 6.5 2.5S16.5 14.38 16.5 13V9.5" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  );
}

function IconFlow(): ReactNode {
  return (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect x="1.5" y="7.5" width="4" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="8" y="7.5" width="4" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="14.5" y="7.5" width="4" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M5.5 10h2.5M12.5 10h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function IconNeural(): ReactNode {
  return (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="4" cy="5" r="1.75" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="4" cy="10" r="1.75" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="4" cy="15" r="1.75" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="16" cy="10" r="1.75" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M5.75 5.3L14.25 9.5M5.75 10H14.25M5.75 14.7L14.25 10.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

function IconLayers(): ReactNode {
  return (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M10 2L2 6l8 4 8-4-8-4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
      <path d="M2 10l8 4 8-4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
      <path d="M2 14l8 4 8-4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
    </svg>
  );
}

function IconGrid(): ReactNode {
  return (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect x="2.5" y="2.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="11.5" y="2.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="2.5" y="11.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="11.5" y="11.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  );
}

function IconTimeline(): ReactNode {
  return (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="10" cy="5" r="2" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="10" cy="10.5" r="2" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="10" cy="16" r="2" stroke="currentColor" strokeWidth="1.5" strokeDasharray="1.5 1.5"/>
      <path d="M10 7v1.5M10 12.5v1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Hero                                                                */
/* ------------------------------------------------------------------ */

function HomepageHero(): ReactNode {
  return (
    <header className={styles.hero}>
      <div className={styles.heroInner}>
        <div className={styles.status}>
          <span className={styles.statusDot} aria-hidden="true" />
          Pre-alpha · changing quickly
        </div>
        <img
          className={styles.wordmark}
          src="/img/logo-wordmark.svg"
          alt="stardelt"
        />
        <h1 className={styles.heroTitle}>
          A self-hostable data platform for Kubernetes.
        </h1>
        <p className={styles.heroSubtitle}>
          Open-source SQL, tables, notebooks, schedules and dashboards with
          one sign-in and one interface. Apache 2.0. Runs in your cluster.
        </p>
        <div className={styles.ctaRow}>
          <Link
            className={clsx('button button--primary button--lg', styles.ctaPrimary)}
            to="/docs/getting-started/quickstart"
          >
            Try the quickstart
          </Link>
          <Link
            className="button button--secondary button--lg"
            href="https://github.com/stardelt"
          >
            GitHub →
          </Link>
        </div>
        <p className={styles.heroTagline}>
          No managed control plane. No phone-home at runtime. No license server.
        </p>
      </div>
      <img
        className={styles.heroShot}
        src="/img/nova/overview.png"
        width={1440}
        height={900}
        loading="eager"
        alt="stardelt Nova, the Overview of the mobility team: three catalogs, recent loads and queries, the engine status and the platform apps"
      />
    </header>
  );
}

/* ------------------------------------------------------------------ */
/*  Vision                                                              */
/* ------------------------------------------------------------------ */

type Principle = { title: string; body: string };

const visionPrinciples: Principle[] = [
  {
    title: 'Runs on your Kubernetes',
    body: 'In a cloud, on your own servers, or on one small node to try it. There is no SaaS side.',
  },
  {
    title: 'No required outbound calls',
    body: "stardelt's own components have no telemetry, no license check and no usage report.",
  },
  {
    title: 'Permissive licenses',
    body: 'Apache 2.0, MIT or BSD across the stack, with one documented, optional MPL 2.0 exception.',
  },
  {
    title: 'One command to install',
    body: 'One command installs and upgrades the platform. An operator with small declarative resources is growing to take that over.',
  },
  {
    title: 'One interface',
    body: 'Catalog, SQL editor, loads, pipelines, query log, lineage and health in Nova, with an API behind every screen.',
  },
  {
    title: 'Open formats at rest',
    body: 'Tables are Iceberg and Parquet on object storage. Uninstall stardelt and any Iceberg engine can still read them.',
  },
];

function Vision(): ReactNode {
  return (
    <section id="vision" className={styles.section}>
      <div className={styles.container}>
        <span className={styles.eyebrow}>Why stardelt</span>
        <h2 className={styles.sectionTitle}>
          Built for teams that need the data to stay inside their cluster.
        </h2>
        <p className={styles.sectionLede}>
          stardelt runs the whole stack inside your Kubernetes cluster,
          operated by you, on standard open-source engines and open table
          formats.
        </p>
        <div className={styles.principles}>
          {visionPrinciples.map((p) => (
            <div key={p.title} className={styles.principle}>
              <strong>{p.title}</strong>
              <p>{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Pillars                                                             */
/* ------------------------------------------------------------------ */

type Pillar = { icon: ReactNode; title: string; body: string; tools: string[] };

const pillars: Pillar[] = [
  {
    icon: <IconDatabase />,
    title: 'Lakehouse SQL',
    body: 'Interactive SQL over Iceberg tables on object storage.',
    tools: ['Trino', 'Iceberg', 'Lakekeeper', 'SeaweedFS'],
  },
  {
    icon: <IconFlow />,
    title: 'Compute & orchestration',
    body: 'Spark Connect for distributed jobs, Airflow for scheduling.',
    tools: ['Spark Connect', 'Airflow'],
  },
  {
    icon: <IconNeural />,
    title: 'Notebooks & BI',
    body: 'JupyterHub for analysis and Superset for dashboards, both connected to the same tables.',
    tools: ['JupyterHub', 'Superset'],
  },
  {
    icon: <IconGrid />,
    title: 'Sign-in & permissions',
    body: 'One sign-in from the browser to the query, and table permissions by group.',
    tools: ['Keycloak', 'OpenFGA', 'OPA'],
  },
];

function Pillars(): ReactNode {
  return (
    <section id="pillars" className={styles.section}>
      <div className={styles.container}>
        <span className={styles.eyebrow}>Architecture</span>
        <h2 className={styles.sectionTitle}>
          Proven services on a shared foundation.
        </h2>
        <p className={styles.sectionLede}>
          Every engine reads and writes the same Iceberg tables through one
          catalog. stardelt Nova brings them together.
        </p>
        <div className={styles.pillarGrid}>
          {pillars.map((p) => (
            <div key={p.title} className={styles.pillarCard}>
              <div className={styles.cardIcon}>{p.icon}</div>
              <h3 className={styles.pillarTitle}>{p.title}</h3>
              <p className={styles.pillarBody}>{p.body}</p>
              <div className={styles.pillarTools}>
                {p.tools.map((t) => (
                  <span key={t} className={styles.tool}>{t}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Sovereignty                                                         */
/* ------------------------------------------------------------------ */

const sovereigntyPrinciples: Principle[] = [
  {
    title: 'Your perimeter',
    body: 'Data, catalog and engines all run in your cluster, on storage you choose.',
  },
  {
    title: 'Your identity provider',
    body: 'Use the bundled Keycloak or your own OIDC provider. Nova keeps no passwords.',
  },
  {
    title: 'A way out',
    body: 'Your tables stay readable without stardelt, by any Iceberg-compatible engine.',
  },
  {
    title: 'Plain about the gaps',
    body: 'The sovereignty page separates what holds today from what is still a goal, such as a tested air-gapped install.',
  },
];

function Sovereignty(): ReactNode {
  return (
    <section id="sovereignty" className={styles.section}>
      <div className={styles.container}>
        <span className={styles.eyebrow}>Sovereignty</span>
        <h2 className={styles.sectionTitle}>
          For environments where data has to stay in your perimeter.
        </h2>
        <div className={styles.principles}>
          {sovereigntyPrinciples.map((p) => (
            <div key={p.title} className={styles.principle}>
              <strong>{p.title}</strong>
              <p>{p.body}</p>
            </div>
          ))}
        </div>
        <div className={styles.sectionCta}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/architecture/sovereignty"
          >
            Read what holds today →
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Dive deeper                                                         */
/* ------------------------------------------------------------------ */

type DocCard = { icon: ReactNode; title: string; body: string; to: string; cta: string };

const docCards: DocCard[] = [
  {
    icon: <IconLayers />,
    title: 'How it works',
    body: 'One picture of the platform: who talks to what, and why.',
    to: '/docs/architecture/how-it-works',
    cta: 'See the picture →',
  },
  {
    icon: <IconFlow />,
    title: 'From source to dashboard',
    body: 'Load data, model it in layers, schedule it and show it.',
    to: '/docs/guides/source-to-dashboard',
    cta: 'Read the guide →',
  },
  {
    icon: <IconTimeline />,
    title: 'Roadmap',
    body: 'The milestones, what works today, and what stardelt will not be.',
    to: '/docs/roadmap',
    cta: 'See the roadmap →',
  },
];

function DiveDeeper(): ReactNode {
  return (
    <section id="docs" className={styles.section}>
      <div className={styles.container}>
        <span className={styles.eyebrow}>Next steps</span>
        <h2 className={styles.sectionTitle}>Find your way around.</h2>
        <div className={styles.docGrid}>
          {docCards.map((d) => (
            <Link key={d.title} to={d.to} className={styles.docCard}>
              <div className={styles.cardIcon}>{d.icon}</div>
              <h3 className={styles.docTitle}>{d.title}</h3>
              <p className={styles.docBody}>{d.body}</p>
              <span className={styles.docLink}>{d.cta}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={siteConfig.title}
      description="A self-hostable, Kubernetes-native data platform: SQL over Iceberg tables, notebooks, schedules and dashboards with one sign-in. Apache 2.0."
    >
      <HomepageHero />
      <main>
        <Vision />
        <Pillars />
        <Sovereignty />
        <DiveDeeper />
      </main>
    </Layout>
  );
}
