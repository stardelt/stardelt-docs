import {useEffect, useRef, useState, type ReactNode} from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import CodeBlock from '@theme/CodeBlock';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
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
  const techChips = [
    'Iceberg REST',
    'Trino',
    'Spark Connect',
    'Kafka (KRaft)',
    'Airflow 3',
    'OIDC',
    'OpenFGA',
    'Rust control plane',
  ];

  return (
    <header className={styles.hero}>
      <div className={styles.heroInner}>
        <div className={styles.heroText}>
          <span className={styles.eyebrow}>Open source · Apache 2.0 · Kubernetes-native</span>
          <img
            className={styles.wordmark}
            src="/img/logo-wordmark.svg"
            alt="stardelt"
          />
          <h1 className={styles.heroTitle}>
            Your own data platform. Built new, for how data works now.
          </h1>
          <p className={styles.heroSubtitle}>
            Iceberg tables, SQL, pipelines, notebooks, streams and dashboards behind one sign-in, one interface and one API, inside your own Kubernetes. Only current-generation open source: no Hadoop heritage, no vendor cloud, no phone-home.
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
              to="/docs/guides/source-to-dashboard"
            >
              See it work ↓
            </Link>
          </div>
          <div className={styles.techRow}>
            {techChips.map((t) => (
              <code key={t} className={styles.techChip}>{t}</code>
            ))}
          </div>
          <p className={styles.heroLinks}>
            <Link href="https://github.com/stardelt" className={styles.githubLink}>GitHub →</Link>
            <span className={styles.heroTagline}>No managed control plane. No phone-home at runtime. No license server.</span>
          </p>
        </div>
        <div className={styles.heroVisual}>
          <img
            className={styles.heroScreenshot}
            src="/img/nova-overview.png"
            alt="stardelt Nova overview: catalogs, recent activity and the platform apps"
            width={1440}
            height={900}
            loading="eager"
          />
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/*  Every screen has an API                                             */
/* ------------------------------------------------------------------ */

const pipelineYaml = `apiVersion: stardelt.io/v1alpha1
kind: Pipeline
metadata: { name: mobility-medallion }
spec:
  ownerGroup: mobility-analytics
  runAs: pipeline-mobility-analytics
  schedule: { cron: "0 3 * * *", timezone: Europe/Berlin }
  tasks:
    - { name: silver_schema, kind: sql, sql: "CREATE SCHEMA IF NOT EXISTS mobility.silver" }
    - { name: silver_init, kind: sql, dependsOn: [silver_schema], sql: "CREATE OR REPLACE TABLE mobility.silver.yellow_trips AS …" }`;

function EveryScreenHasAnApi(): ReactNode {
  return (
    <section id="api" className={styles.section}>
      <div className={styles.container}>
        <span className={styles.eyebrow}>Automate everything</span>
        <h2 className={styles.sectionTitle}>Every screen has an API.</h2>
        <p className={styles.sectionLede}>
          What you click in Nova, you can script, schedule, review in Git, or
          hand to an AI assistant, always as yourself and with your
          permissions.
        </p>
        <div className={styles.apiPanel}>
          <Tabs>
            <TabItem value="cli" label="CLI">
              <CodeBlock language="bash">{`stardelt login
stardelt sql "select * from mobility.silver.yellow_trips limit 5"
stardelt run stardelt mobility-medallion --wait`}</CodeBlock>
            </TabItem>
            <TabItem value="python" label="Python">
              <CodeBlock language="python">{`from stardelt import runs
run, tasks = runs.start(nova, "stardelt", "mobility-medallion", wait=True)`}</CodeBlock>
            </TabItem>
            <TabItem value="yaml" label="YAML">
              <CodeBlock language="yaml">{pipelineYaml}</CodeBlock>
            </TabItem>
            <TabItem value="ai-assistants" label="AI assistants">
              <CodeBlock language="bash">{`stardelt mcp config      # how to register the server in your assistant
stardelt mcp serve       # read-only tools unless you allow more`}</CodeBlock>
            </TabItem>
          </Tabs>
          <p className={styles.apiNote}>
            <strong>Read operations only by default. Every call is checked
            against your groups, exactly as in the interface.</strong>{' '}
            <Link to="/docs/guides/sdk-cli-mcp">
              Python, command line and agents
            </Link>
            .
          </p>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Current generation                                                  */
/* ------------------------------------------------------------------ */

const generations = [
  { now: 'S3 object storage', then: 'HDFS' },
  { now: 'Apache Iceberg', then: 'Hive-style directories of files' },
  { now: 'Iceberg REST catalog', then: 'Hive Metastore' },
  { now: 'Spark Connect', then: 'spark-submit on YARN' },
  { now: 'Trino', then: 'SQL on MapReduce' },
  { now: 'Kafka in KRaft mode', then: 'ZooKeeper' },
  { now: 'Airflow 3', then: 'cron files and XML workflows' },
  { now: 'OIDC and OPA', then: 'Kerberos and per-service user lists' },
];

function CurrentGeneration(): ReactNode {
  return (
    <section id="current-generation" className={styles.section}>
      <div className={styles.container}>
        <span className={styles.eyebrow}>Built new</span>
        <h2 className={styles.sectionTitle}>No legacy inside.</h2>
        <p className={styles.sectionLede}>
          Every part of stardelt is current-generation open source. Nothing is
          there for compatibility with the last decade.
        </p>
        <div className={styles.generationList} role="table" aria-label="Current generation compared to legacy">
          <div className={styles.generationHeader} role="row">
            <div className={styles.generationHead} role="columnheader">stardelt uses</div>
            <div className={styles.generationHead} role="columnheader">left behind</div>
          </div>
          {generations.map((g) => (
            <div key={g.then} className={styles.generationRow} role="row">
              <div className={styles.now} role="cell">
                <span className={styles.nowDot} aria-hidden="true" />
                {g.now}
              </div>
              <div className={styles.then} role="cell">{g.then}</div>
            </div>
          ))}
        </div>
        <div className={styles.sectionCta}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/architecture/current-generation"
          >
            Read the rule →
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Story                                                               */
/* ------------------------------------------------------------------ */

type StoryStep = {
  n: number;
  title: string;
  body: string;
  img: string;
  alt: string;
  code: {lang: string; text: string} | null;
};

const storySteps: StoryStep[] = [
  {
    n: 1,
    title: 'Load',
    body:
      "Drop a CSV or connect a source. It lands as an Iceberg table in the team's own catalog.",
    img: '/img/nova/activity.png',
    alt: 'Nova showing a recent load of data into the team catalog as an Iceberg table.',
    code: {
      lang: 'python',
      text: 'stardelt.write_df(df, "mobility.bronze.trips", bronze=True)',
    },
  },
  {
    n: 2,
    title: 'Model and schedule',
    body:
      "Bronze to silver to gold in SQL, scheduled every night, running as the team's own service principal.",
    img: '/img/nova/pipeline.png',
    alt: 'Nova showing the mobility pipeline with scheduled SQL steps and their runs.',
    code: {
      lang: 'yaml',
      text: `apiVersion: stardelt.io/v1alpha1
kind: Pipeline
metadata: { name: mobility-medallion }
spec:
  ownerGroup: mobility-analytics
  runAs: pipeline-mobility-analytics
  schedule: { cron: "0 3 * * *", timezone: Europe/Berlin }
  tasks:
    - { name: silver_schema, kind: sql, sql: "CREATE SCHEMA IF NOT EXISTS mobility.silver" }
    - { name: silver_init, kind: sql, dependsOn: [silver_schema], sql: "CREATE OR REPLACE TABLE mobility.silver.yellow_trips AS …" }`,
    },
  },
  {
    n: 3,
    title: 'Query',
    body:
      'One SQL editor over every catalog you may read, with the query log of everything that ran.',
    img: '/img/nova/sql.png',
    alt: 'Nova SQL editor running a query over the mobility trips table with results.',
    code: {
      lang: 'sql',
      text: 'SELECT pickup_dow_name, count(*) AS trips, round(avg(tip_pct), 1) AS avg_tip_pct FROM mobility.silver.yellow_trips GROUP BY 1 ORDER BY 2 DESC',
    },
  },
  {
    n: 4,
    title: 'Trace',
    body: 'Lineage is recorded by every run, with no extra setup.',
    img: '/img/nova/lineage.png',
    alt: 'Nova lineage view showing how mobility tables flow from bronze to downstream tables.',
    code: {lang: 'bash', text: 'stardelt run stardelt mobility-medallion --wait'},
  },
  {
    n: 5,
    title: 'Share',
    body:
      "Dashboards in the team's own space, with the same sign-in and the same permissions.",
    img: '/img/nova/dashboards.png',
    alt: 'Nova dashboards view showing team dashboards in their own space.',
    code: null,
  },
];

function Story(): ReactNode {
  const [active, setActive] = useState(0);
  const [showFrame, setShowFrame] = useState(true);
  const stepRefs = useRef<Array<HTMLElement | null>>([]);

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1100px)');
    const onChange = () => setShowFrame(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          const index = Number((visible.target as HTMLElement).dataset.index);
          if (!Number.isNaN(index)) {
            setActive(index);
          }
        }
      },
      {rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.25, 0.5, 0.75, 1]},
    );
    for (const el of stepRefs.current) {
      if (el) {
        observer.observe(el);
      }
    }
    return () => observer.disconnect();
  }, []);

  return (
    <section id="story" className={styles.section}>
      <div className={styles.container}>
        <span className={styles.eyebrow}>See it work</span>
        <h2 className={styles.sectionTitle}>A day with the mobility team.</h2>
        <p className={styles.sectionLede}>
          Taxi trips arrive as a file at 7:00. By 9:00 the team has a modelled
          table, a daily schedule, lineage and a dashboard, without leaving one
          interface.
        </p>
        <div className={styles.storyLayout}>
          <div className={styles.storySteps}>
            {storySteps.map((step, index) => (
              <article
                key={step.n}
                className={styles.storyStep}
                data-index={index}
                ref={(el) => {
                  stepRefs.current[index] = el;
                }}>
                <div className={styles.storyStepHeader}>
                  <span
                    className={clsx(
                      styles.storyStepNumber,
                      active === index && styles.storyStepNumberActive,
                    )}>
                    {step.n}
                  </span>
                  <h3 className={styles.storyStepTitle}>{step.title}</h3>
                </div>
                <p className={styles.storyStepBody}>{step.body}</p>
                {step.code ? (
                  <CodeBlock language={step.code.lang}>{step.code.text}</CodeBlock>
                ) : null}
                {!showFrame ? (
                  <img
                    className={styles.storyStepImageInline}
                    src={step.img}
                    alt={step.alt}
                    loading="lazy"
                    width={1440}
                    height={900}
                  />
                ) : null}
              </article>
            ))}
          </div>
          {showFrame ? (
            <div className={styles.storyFrame}>
              <div className={styles.storyFrameInner}>
                {storySteps.map((step, index) => (
                  <img
                    key={step.n}
                    className={clsx(
                      styles.storyFrameImage,
                      active === index && styles.storyFrameImageActive,
                    )}
                    src={step.img}
                    alt={step.alt}
                    loading="lazy"
                    width={1440}
                    height={900}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
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
    body: 'One sign-in through any OIDC provider, from the browser to the query, and table permissions by group. Keycloak is included if you need one.',
    tools: ['OIDC', 'OpenFGA', 'OPA'],
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
      description="Your own data platform on Kubernetes: Iceberg, SQL, pipelines, notebooks, streams and dashboards with one sign-in, one interface and one API. Apache 2.0."
    >
      <HomepageHero />
      <Story />
      <CurrentGeneration />
      <EveryScreenHasAnApi />
      <main>
        <Vision />
        <Pillars />
        <Sovereignty />
        <DiveDeeper />
      </main>
    </Layout>
  );
}
