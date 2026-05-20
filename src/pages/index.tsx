import type { ReactNode } from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import clsx from 'clsx';

import styles from './index.module.css';

function HomepageHero(): ReactNode {
  return (
    <header className={styles.hero}>
      <div className={styles.heroInner}>
        <div className={styles.status}>
          <span className={styles.statusDot} aria-hidden="true" />
          Phase 0 — design complete, no code yet
        </div>
        <img
          className={styles.wordmark}
          src="/img/logo-wordmark.svg"
          alt="Stardelt"
        />
        <h1 className={styles.heroTitle}>
          A self-hostable data platform for Kubernetes.
        </h1>
        <p className={styles.heroSubtitle}>
          Lakehouse, batch ETL, streaming and ML/AI workloads composed from
          upstream OSS into one declarative platform CRD. Apache 2.0. Runs
          in your cluster.
        </p>
        <div className={styles.ctaRow}>
          <Link
            className={clsx('button button--primary button--lg', styles.ctaPrimary)}
            to="/docs/architecture/overview"
          >
            Read the design
          </Link>
          <Link
            className={clsx('button button--secondary button--lg', styles.ctaSecondary)}
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
    body: 'Apache 2.0 / MIT / BSD across the stack, with one documented MPL-2.0 exception (OpenBao). Components on BSL, SSPL, ELv2 or AGPL are excluded by policy.',
  },
  {
    title: 'One CRD per workload',
    body: 'A small set of top-level CRDs (Lakehouse, Pipeline, StreamApp, MLWorkspace) reconcile into the per-component operators, instead of asking platform teams to assemble them by hand.',
  },
  {
    title: 'Stardelt Nova — single UI',
    body: 'SSO, catalog browser, lineage view, cost attribution, audit search, and deep-links into the underlying tools. One place to start for engineers, one place to look for auditors.',
  },
  {
    title: 'Open formats at rest',
    body: 'Tables are Iceberg + Parquet on object storage. Uninstalling Stardelt leaves your data readable by any Iceberg-compatible engine — no proprietary metadata to peel off.',
  },
];

function Vision(): ReactNode {
  return (
    <section id="vision" className={styles.section}>
      <div className={styles.container}>
        <span className={styles.eyebrow}>Why Stardelt</span>
        <h2 className={styles.sectionTitle}>
          Built for teams that need the data to stay inside their cluster.
        </h2>
        <p className={styles.sectionLede}>
          Managed data warehouses keep the control plane at the vendor and
          charge per credit. Stardelt runs the whole stack inside your
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

type Pillar = { icon: string; title: string; body: string; tools: string[] };

const pillars: Pillar[] = [
  {
    icon: '◆',
    title: 'Lakehouse',
    body: 'Federated MPP and embedded engines on shared Iceberg tables.',
    tools: ['Trino', 'DuckDB', 'Superset', 'JupyterHub', 'Kyuubi'],
  },
  {
    icon: '▣',
    title: 'Batch ETL',
    body: 'Orchestration and transformation, declared in code.',
    tools: ['Spark', 'Airflow', 'dbt-core', 'SQLMesh', 'SeaTunnel'],
  },
  {
    icon: '∿',
    title: 'Streaming',
    body: 'Pipelines, CDC, materialized views on Apache-licensed streaming SQL.',
    tools: ['Kafka', 'Flink', 'RisingWave', 'Debezium', 'Apicurio'],
  },
  {
    icon: '★',
    title: 'ML / AI',
    body: 'Training, serving and inference — including LLMs — on your hardware.',
    tools: ['Ray', 'Kubeflow', 'MLflow', 'KServe', 'vLLM', 'Qdrant'],
  },
];

function Pillars(): ReactNode {
  return (
    <section id="pillars" className={styles.section}>
      <div className={styles.container}>
        <span className={styles.eyebrow}>Architecture</span>
        <h2 className={styles.sectionTitle}>
          Four workload pillars on a shared foundation.
        </h2>
        <p className={styles.sectionLede}>
          Modern 2026 component picks on a shared Iceberg + Lakekeeper
          foundation. Identity by Keycloak, secrets by OpenBao, fine-grained
          authorization by OpenFGA.
        </p>
        <div className={styles.pillarGrid}>
          {pillars.map((p) => (
            <div key={p.title} className={styles.pillarCard}>
              <h3 className={styles.pillarTitle}>
                <span className={styles.pillarIcon} aria-hidden="true">{p.icon}</span>
                {p.title}
              </h3>
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
            className={clsx('button button--secondary button--lg', styles.ctaSecondary)}
            to="/docs/architecture/sovereignty"
          >
            Read the sovereignty commitments →
          </Link>
        </div>
      </div>
    </section>
  );
}

type DocCard = { icon: string; title: string; body: string; to: string; cta: string };

const docCards: DocCard[] = [
  {
    icon: '◬',
    title: 'Architecture',
    body: 'Four-layer model, control-plane CRDs, the operating model, and how the upstream operators compose.',
    to: '/docs/architecture/overview',
    cta: 'Read the architecture →',
  },
  {
    icon: '▦',
    title: 'Components',
    body: 'Per-layer inventory of upstream OSS picks with licenses, rationale, and a rejection list with reasons.',
    to: '/docs/architecture/components',
    cta: 'Browse components →',
  },
  {
    icon: '⌬',
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
          Phase 0 is documentation. Architecture, component selection,
          licensing analysis, diagrams — load-bearing for everything that
          comes later.
        </p>
        <div className={styles.docGrid}>
          {docCards.map((d) => (
            <Link key={d.title} to={d.to} className={styles.docCard}>
              <div className={styles.docHead}>
                <span className={styles.docIcon} aria-hidden="true">{d.icon}</span>
                <h3 className={styles.docTitle}>{d.title}</h3>
              </div>
              <p className={styles.docBody}>{d.body}</p>
              <span className={styles.docLink}>{d.cta}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

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
