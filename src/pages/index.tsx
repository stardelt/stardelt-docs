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

function IconWave(): ReactNode {
  return (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M2 8c1-2 2-2 3 0s2 2 3 0 2-2 3 0 2 2 3 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2 13c1-2 2-2 3 0s2 2 3 0 2-2 3 0 2 2 3 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
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
          Pre-alpha · MVP / vibecoding phase — moving fast
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
          An opinionated collection of upstream OSS services — lakehouse SQL,
          distributed compute, streaming, notebooks and BI — composed by one
          declarative platform operator. Apache 2.0. Runs in your cluster.
        </p>
        <div className={styles.ctaRow}>
          <Link
            className={clsx('button button--primary button--lg', styles.ctaPrimary)}
            to="/docs/architecture/overview"
          >
            Read the design
          </Link>
          <Link
            className="button button--secondary button--lg"
            href="https://github.com/stardelt"
          >
            GitHub org →
          </Link>
        </div>
        <p className={styles.heroTagline}>
          No managed control plane. No phone-home at runtime. No license server.
        </p>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/*  Vision                                                              */
/* ------------------------------------------------------------------ */

type Principle = { title: string; body: string };

const visionPrinciples: Principle[] = [
  {
    title: 'Runs on any Kubernetes',
    body: 'Hyperscaler, sovereign cloud, on-prem, edge, air-gapped. The control plane is operators in your cluster — there is no SaaS side.',
  },
  {
    title: 'No outbound calls at runtime',
    body: 'No telemetry, no license check, no usage report. Each release ships with a documented network-egress matrix listing every call its components make.',
  },
  {
    title: 'OSI-permissive licenses',
    body: 'Apache 2.0 / MIT / BSD across the stack. Services on BSL, SSPL, ELv2 or AGPL are excluded by policy.',
  },
  {
    title: 'One CRD per workload',
    body: 'A small set of top-level CRDs (Lakehouse, Pipeline, StreamApp) reconcile into the per-service operators, instead of asking platform teams to assemble them by hand.',
  },
  {
    title: 'stardelt Nova — single UI',
    body: 'SSO, catalog browser, lineage view, cost attribution, audit search, and deep-links into the underlying tools. One place to start for engineers, one place to look for auditors.',
  },
  {
    title: 'Open formats at rest',
    body: 'Tables are Iceberg + Parquet on object storage. Uninstalling stardelt leaves your data readable by any Iceberg-compatible engine — no proprietary metadata to peel off.',
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
          Managed data warehouses keep the control plane at the vendor and
          charge per credit. stardelt runs the whole stack inside your
          Kubernetes cluster — same engines, same SQL, same ML — operated by
          you.
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
    icon: <IconWave />,
    title: 'Streaming',
    body: 'Kafka as the event backbone; Flink (opt-in) for stream processing.',
    tools: ['Kafka (KRaft)', 'Flink'],
  },
  {
    icon: <IconNeural />,
    title: 'Notebooks & BI',
    body: 'JupyterHub for analysis, Superset for dashboards — both wired into Trino and Spark.',
    tools: ['JupyterHub', 'Superset'],
  },
];

function Pillars(): ReactNode {
  return (
    <section id="pillars" className={styles.section}>
      <div className={styles.container}>
        <span className={styles.eyebrow}>Architecture</span>
        <h2 className={styles.sectionTitle}>
          An opinionated collection of services on a shared foundation.
        </h2>
        <p className={styles.sectionLede}>
          Modern 2026 service picks on a shared Iceberg + Lakekeeper
          foundation. Composed by the stardelt Operator and surfaced through
          stardelt Nova.
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
    title: 'Documented egress',
    body: 'Every release publishes a network-egress matrix. Every outbound call is listed; nothing undocumented at runtime.',
  },
  {
    title: 'Air-gap install path',
    body: 'Helm/OLM bundles ship every image. Harbor (or any OCI registry) as the in-cluster mirror; no DNS to external hosts required at install or upgrade.',
  },
  {
    title: 'Sovereign-cloud CI',
    body: 'CI runs installs on European sovereign-cloud Kubernetes (STACKIT, OVHcloud, IONOS, Hetzner, Open Telekom Cloud, Scaleway) alongside the hyperscalers.',
  },
  {
    title: 'No non-EU vendor in the default path',
    body: 'Default install pulls only from the Apache Software Foundation, CNCF, Linux Foundation and vendor-neutral projects. Useful when GDPR Article 28 or the US CLOUD Act are in scope.',
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
            Read the sovereignty commitments →
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
    title: 'Architecture',
    body: 'How the core stack and opt-in services compose on Kubernetes, and how requests flow between them.',
    to: '/docs/architecture/overview',
    cta: 'Read the architecture →',
  },
  {
    icon: <IconGrid />,
    title: 'Services',
    body: 'Per-service descriptions, licenses, and upstream links for the core stack and the opt-in services.',
    to: '/docs/architecture/services',
    cta: 'Browse services →',
  },
  {
    icon: <IconTimeline />,
    title: 'Roadmap',
    body: 'Phases 0 through 6, what ships when, and an explicit list of what is out of scope for v1.',
    to: '/docs/roadmap',
    cta: 'See the roadmap →',
  },
];

function DiveDeeper(): ReactNode {
  return (
    <section id="docs" className={styles.section}>
      <div className={styles.container}>
        <span className={styles.eyebrow}>Dive deeper</span>
        <h2 className={styles.sectionTitle}>The full design lives in the docs.</h2>
        <p className={styles.sectionLede}>
          Architecture, component selection, licensing analysis, diagrams —
          load-bearing for everything that comes later. The codebase is
          pre-alpha; the docs are where the design is settled.
        </p>
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
      description="A self-hostable, Kubernetes-native data platform: lakehouse, batch ETL, streaming and ML/AI composed from upstream OSS into one declarative platform CRD. Apache 2.0."
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
