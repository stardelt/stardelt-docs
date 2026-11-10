import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import Link from '@docusaurus/Link';
import useBrokenLinks from '@docusaurus/useBrokenLinks';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import CodeBlock from '@theme/CodeBlock';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import Layout from '@theme/Layout';
import ThemedImage from '@theme/ThemedImage';
import clsx from 'clsx';

import styles from './index.module.css';

/* ------------------------------------------------------------------ */
/*  SVG icons                                                           */
/* ------------------------------------------------------------------ */

type IconProps = {size?: number};

function IconLayers({size = 22}: IconProps): ReactNode {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M10 2L2 6l8 4 8-4-8-4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
      <path d="M2 10l8 4 8-4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
      <path d="M2 14l8 4 8-4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
    </svg>
  );
}

function IconGrid({size = 22}: IconProps): ReactNode {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect x="2.5" y="2.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="11.5" y="2.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="2.5" y="11.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="11.5" y="11.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  );
}

function IconTimeline({size = 22}: IconProps): ReactNode {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden>
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
          {/* The class is on this wrapper, not on the images: ThemedImage renders both theme
              variants and Docusaurus hides the inactive one with a `:where(...)` rule. A
              `display` on the <img> outranks it, and both wordmarks showed until hydration. */}
          <div className={styles.wordmark}>
            <ThemedImage
              alt="stardelt"
              sources={{light: '/img/logo-wordmark-dark.svg', dark: '/img/logo-wordmark-dark.svg'}}
            />
          </div>
          <span className={styles.eyebrow}>Open source · Apache 2.0 · Kubernetes-native</span>
          <h1 className={styles.heroTitle}>
            Your own data platform. Built new, for how data works now.
          </h1>
          <p className={styles.heroSubtitle}>
            Iceberg tables, SQL, pipelines, notebooks, streams and dashboards behind one sign-in, one interface and one API, inside your own Kubernetes.
          </p>
          <div className={styles.ctaRow}>
            <Link
              className={clsx('button button--primary button--lg', styles.ctaPrimary)}
              to="/docs/getting-started/quickstart"
            >
              Start the quickstart
            </Link>
            <Link className="button button--secondary button--lg" href="#story">
              See it work ↓
            </Link>
          </div>
          <div className={styles.techRow}>
            {techChips.map((t) => (
              <code key={t} className={styles.techChip}>{t}</code>
            ))}
          </div>
          <p className={styles.heroLinks}>
            <Link href="https://github.com/stardelt" className={styles.githubLink}>GitHub ↗</Link>
          </p>
        </div>
        <div className={styles.heroVisual}>
          <img
            className={styles.heroScreenshot}
            src="/img/nova/overview.png"
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
              API, Python, CLI and MCP →
            </Link>
            .
          </p>
        </div>
      </div>
    </section>
  );
}

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
  behind: string[];
  why: string;
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
    behind: ['Nova', 'Iceberg', 'Lakekeeper', 'your S3 storage'],
    why: 'A file becomes a table with a schema and a history from the first minute, not a folder someone has to remember.',
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
    behind: ['SQL', 'Pipeline resource', 'Airflow 3'],
    why: 'The schedule lives in Git next to the SQL, so dev and prod run exactly the same thing.',
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
    behind: ['Trino', 'OpenFGA', 'OPA'],
    why: 'One SQL engine for every team, and each person sees only the tables their group may read.',
  },
  {
    n: 4,
    title: 'Trace',
    body: 'Lineage is recorded by every run, with no extra setup.',
    img: '/img/nova/lineage.png',
    alt: 'Nova lineage view: a table with its upstream and downstream tables from recorded runs.',
    code: {lang: 'bash', text: 'stardelt run stardelt mobility-medallion --wait'},
    behind: ['Nova lineage', 'pipeline runs'],
    why: 'When a number looks wrong, you can see which run wrote it and from which source.',
  },
  {
    n: 5,
    title: 'Share',
    body:
      "Dashboards in the team's own space, with the same sign-in and the same permissions.",
    img: '/img/nova/dashboards.png',
    alt: 'Nova showing the Mobility Operations dashboard embedded from Superset.',
    code: null,
    behind: ['Superset', 'Trino'],
    why: 'Dashboards query the same governed tables, so there is no extract to keep in sync.',
  },
];

type TeamStory = {id: string; tab: string; title: string; lede: string; steps: StoryStep[]};
const stories: TeamStory[] = [
  {
    id: 'mobility',
    tab: 'Mobility team',
    title: 'A day with the mobility team.',
    lede: 'Taxi trips arrive as a file at 7:00. By 9:00 the team has a modelled table, a daily schedule, lineage and a dashboard, without leaving one interface.',
    steps: storySteps,
  },
];

function Story(): ReactNode {
  // `<section id="story">` is a real target, but Docusaurus only indexes anchors from
  // content pages; registering it keeps the `#story` links from `src/pages/index.tsx`
  // and `docs/intro/overview.md` checkable (docs#332).
  useBrokenLinks().collectAnchor('story')
  const [storyIdx, setStoryIdx] = useState(0);
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [inView, setInView] = useState(false);
  const [hover, setHover] = useState(false);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const story = stories[storyIdx];
  const steps = story.steps;

  useEffect(() => {
    setPlaying(!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => setInView(entries[0].isIntersecting),
      {threshold: 0.3},
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onVisibility = () => setHover(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    const running = playing && inView && !hover;
    const timer = running
      ? window.setTimeout(() => setActive((a) => (a + 1) % steps.length), 7000)
      : undefined;
    return () => {
      if (timer !== undefined) {
        window.clearTimeout(timer);
      }
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [active, playing, inView, hover, steps.length]);

  const go = (delta: number) => {
    setActive((a) => (a + delta + steps.length) % steps.length);
  };

  const onTabKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') {
      return;
    }
    e.preventDefault();
    const next =
      (active + (e.key === 'ArrowRight' ? 1 : steps.length - 1)) % steps.length;
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  const step = steps[active];
  const progressState = playing && inView && !hover ? 'running' : 'paused';

  return (
    <section id="story" className={styles.section}>
      <div className={styles.container}>
        <span className={styles.eyebrow}>See it work</span>
        <h2 className={styles.sectionTitle}>{story.title}</h2>
        <p className={styles.sectionLede}>{story.lede}</p>
        {stories.length > 1 ? (
          <div role="tablist">
            {stories.map((s, i) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={storyIdx === i}
                onClick={() => {
                  setStoryIdx(i);
                  setActive(0);
                }}>
                {s.tab}
              </button>
            ))}
          </div>
        ) : null}
        <div
          role="tablist"
          aria-label="Steps"
          className={styles.slideTabs}
          onKeyDown={onTabKeyDown}>
          {steps.map((s, i) => (
            <button
              key={s.n}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-controls="story-stage"
              className={clsx(styles.slideTab, i === active && styles.slideTabActive)}
              onClick={() => setActive(i)}>
              <span className={styles.slideTabNum}>{s.n}</span>
              <span className={styles.slideTabTitle}>{s.title}</span>
              {i === active ? (
                <span
                  key={active}
                  className={styles.slideProgress}
                  style={{animationPlayState: progressState}}
                />
              ) : null}
            </button>
          ))}
          <button
            type="button"
            className={styles.slidePause}
            aria-label={playing ? 'Pause the tour' : 'Play the tour'}
            onClick={() => {
              // The button keeps focus after a click, and focus inside the stage
              // pauses the tour; starting again must clear that pause.
              if (!playing) {
                setHover(false);
              }
              setPlaying((p) => !p);
            }}>
            {playing ? '❚❚' : '▶'}
          </button>
        </div>
        <div
          id="story-stage"
          ref={stageRef}
          className={styles.slideStage}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          onFocusCapture={() => setHover(true)}
          onBlurCapture={() => setHover(false)}>
          {steps.map((s, i) => (
            <img
              key={s.n}
              className={clsx(styles.slideImage, i === active && styles.slideImageActive)}
              src={s.img}
              alt={s.alt}
              loading={i === 0 ? 'eager' : 'lazy'}
              width={1440}
              height={900}
              aria-hidden={i !== active}
            />
          ))}
          <button
            type="button"
            className={styles.slideNav}
            aria-label="Previous step"
            onClick={() => go(-1)}>
            ‹
          </button>
          <button
            type="button"
            className={styles.slideNav}
            aria-label="Next step"
            onClick={() => go(1)}>
            ›
          </button>
        </div>
        <div className={styles.slideCaption} aria-live="polite">
          <p className={styles.slideBody}>{step.body}</p>
          {step.code ? (
            <CodeBlock language={step.code.lang}>{step.code.text}</CodeBlock>
          ) : null}
          <div className={styles.chips}>
            {step.behind.map((item) => (
              <span key={item} className={styles.chip}>
                {item}
              </span>
            ))}
          </div>
          <p className={styles.why}>
            <strong>Why: </strong>
            {step.why}
          </p>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Why                                                                 */
/* ------------------------------------------------------------------ */

function Why(): ReactNode {
  return (
    <section id="why" className={styles.section}>
      <div className={styles.container}>
        <span className={styles.eyebrow}>Why stardelt</span>
        <h2 className={styles.sectionTitle}>Yours. Open. Current.</h2>
        <p className={styles.sectionLede}>Three promises that hold from the first install.</p>
        <div className={styles.whyCards}>
          <article className={styles.whyCard}>
            <div className={styles.whyIcon}>
              <IconLayers size={28} />
            </div>
            <h3>Yours</h3>
            <p className={styles.whyLine}>Your cluster, your sign-in, your storage, your law.</p>
            <ul className={styles.whyPoints}>
              <li>Runs in your cluster, on storage you choose</li>
              <li>Any OIDC provider you already run; Nova keeps no passwords</li>
              <li>No phone-home, no licence server</li>
            </ul>
            <Link to="/docs/architecture/sovereignty">Sovereignty in detail →</Link>
          </article>
          <article className={styles.whyCard}>
            <div className={styles.whyIcon}>
              <IconGrid size={28} />
            </div>
            <h3>Open</h3>
            <p className={styles.whyLine}>Apache 2.0, open formats, and a real way out.</p>
            <ul className={styles.whyPoints}>
              <li>Apache 2.0 across stardelt</li>
              <li>Iceberg and Parquet at rest</li>
              <li>Uninstall it and any Iceberg engine still reads your tables</li>
            </ul>
            <Link to="/docs/architecture/licenses">Licences →</Link>
          </article>
          <article className={styles.whyCard}>
            <div className={styles.whyIcon}>
              <IconTimeline size={28} />
            </div>
            <h3>Current</h3>
            <p className={styles.whyLine}>
              No legacy inside: every part is current-generation open source.
            </p>
            <ul className={styles.whyPoints}>
              {generations.slice(0, 3).map((g) => (
                <li key={g.then}>{`${g.now}, not ${g.then}`}</li>
              ))}
            </ul>
            <Link to="/docs/architecture/current-generation">Read the rule →</Link>
          </article>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Pillars                                                             */
/* ------------------------------------------------------------------ */

type Kind = 'core' | 'starter' | 'default' | 'opt-in' | 'plug';
type Part = {name: string; kind: Kind};
type Feature = {title: string; line: string; parts: Part[]; why: string; to: string};

const features: Feature[] = [
  {
    title: 'SQL on your lakehouse',
    line: 'Query every table with standard SQL.',
    parts: [
      {name: 'Trino', kind: 'core'},
      {name: 'Apache Iceberg', kind: 'core'},
      {name: 'Lakekeeper', kind: 'core'},
    ],
    why: 'Trino reads Iceberg tables in place and scales out.',
    to: '/docs/services/trino',
  },
  {
    title: 'Storage',
    line: 'Tables live on object storage you choose.',
    parts: [
      {name: 'Your S3 storage', kind: 'plug'},
      {name: 'SeaweedFS', kind: 'starter'},
    ],
    why: 'Enterprises already run object storage, and stardelt uses it.',
    to: '/docs/services/seaweedfs',
  },
  {
    title: 'Load and connect',
    line: 'Files and sources become tables.',
    parts: [
      {name: 'Nova', kind: 'core'},
      {name: 'Connections', kind: 'core'},
    ],
    why: 'Loading is a feature of the platform, not a separate tool to buy and operate.',
    to: '/docs/guides/connections',
  },
  {
    title: 'Pipelines and schedules',
    line: 'Bronze to silver to gold, on a schedule.',
    parts: [
      {name: 'Pipeline resource', kind: 'core'},
      {name: 'Airflow', kind: 'default'},
    ],
    why: 'Pipelines are declared in Git and moved between stages.',
    to: '/docs/guides/schedule-sql',
  },
  {
    title: 'Spark',
    line: 'Python and Spark jobs without a Spark cluster per person.',
    parts: [{name: 'Spark Connect', kind: 'default'}],
    why: 'A thin client talks to a shared Spark server: no spark-submit, no driver on your laptop.',
    to: '/docs/services/spark',
  },
  {
    title: 'Notebooks',
    line: 'Explore next to the data, then publish and schedule.',
    parts: [{name: 'JupyterHub', kind: 'default'}],
    why: "Notebooks run inside the platform with the person's own permissions, and published ones run as pipeline steps.",
    to: '/docs/guides/notebooks-in-git',
  },
  {
    title: 'Streams',
    line: 'Events in, tables out.',
    parts: [
      {name: 'Kafka in KRaft mode', kind: 'opt-in'},
      {name: 'StreamApp resource', kind: 'core'},
    ],
    why: 'The streaming pillar is opt-in and off until you enable it.',
    to: '/docs/guides/streams',
  },
  {
    title: 'Dashboards',
    line: 'Charts on governed tables.',
    parts: [
      {name: 'Superset', kind: 'default'},
      {name: 'Your BI tool', kind: 'plug'},
    ],
    why: "Dashboards query through Trino with the viewer's permissions, so there is no copy of the data.",
    to: '/docs/services/superset',
  },
  {
    title: 'Sign-in and permissions',
    line: 'One sign-in, permissions by team.',
    parts: [
      {name: 'Your OIDC provider', kind: 'plug'},
      {name: 'Keycloak', kind: 'starter'},
      {name: 'OpenFGA', kind: 'core'},
      {name: 'OPA', kind: 'core'},
    ],
    why: 'You keep the identity provider you already have.',
    to: '/docs/architecture/identity',
  },
  {
    title: 'Secrets',
    line: 'No passwords in files.',
    parts: [
      {name: 'Your secret store', kind: 'plug'},
      {name: 'OpenBao', kind: 'starter'},
    ],
    why: 'Secrets come from the store you already run, through External Secrets.',
    to: '/docs/services/openbao',
  },
];

function Pillars(): ReactNode {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      {threshold: 0.2},
    );
    if (ref.current) {
      observer.observe(ref.current);
    }
    return () => observer.disconnect();
  }, []);

  const KIND_CLASS: Record<Part['kind'], string> = {
    core: styles.core,
    starter: styles.starter,
    default: styles.defaultKind,
    'opt-in': styles.optIn,
    plug: styles.plug,
  };

  return (
    <section id="pillars" className={styles.section}>
      <div className={styles.container}>
        <span className={styles.eyebrow}>Architecture</span>
        <h2 className={styles.sectionTitle}>
          One interface. Open engines. Your infrastructure.
        </h2>
        <p className={styles.sectionLede}>
          Every engine reads and writes the same Iceberg tables through one
          catalog. stardelt Nova brings them together.
        </p>
        <div ref={ref} className={clsx(styles.reveal, shown && styles.revealShown)}>
          <a className={styles.stackOverviewLink} href="/img/stack-overview.svg">
            <img
              className={styles.stackOverview}
              src="/img/stack-overview.svg"
              width={1200}
              height={660}
              loading="lazy"
              alt="Nova gives one interface and API over open engines (Trino, Spark, Kafka, Airflow, Jupyter), which all share Apache Iceberg tables, on your Kubernetes, your OIDC provider and your S3 storage."
            />
          </a>
          <img
            className={clsx(styles.stackOverview, styles.stackOverviewDesktop)}
            src="/img/stack-overview.svg"
            width={1200}
            height={660}
            loading="lazy"
            alt="Nova gives one interface and API over open engines (Trino, Spark, Kafka, Airflow, Jupyter), which all share Apache Iceberg tables, on your Kubernetes, your OIDC provider and your S3 storage."
          />
        </div>
        <p className={styles.stackOverviewNotice}>
          Logos are trademarks of their respective owners; their use does not imply endorsement.
        </p>
        <p className={styles.partsLegend}>
          <span className={styles.chip}>core <em className={styles.core}>always installed</em></span>
          <span className={styles.chip}>starter <em className={styles.starter}>for small installs, replaceable</em></span>
          <span className={styles.chip}>default <em className={styles.defaultKind}>full profile, switchable per pillar</em></span>
          <span className={styles.chip}>opt-in <em className={styles.optIn}>off until you enable it</em></span>
          <span className={styles.chip}>plug <em className={styles.plug}>you bring your own</em></span>
        </p>
        <div className={styles.featureList}>
          {features.map((f) => (
            <article className={styles.featureCard} key={f.title}>
              <h3 className={styles.featureTitle}><Link to={f.to}>{f.title} →</Link></h3>
              <p className={styles.featureLine}>{f.line}</p>
              <div className={styles.chips}>
                {f.parts.map((p) => (
                  <span className={styles.chip} key={p.name}>
                    {p.name} <em className={KIND_CLASS[p.kind]}>{p.kind}</em>
                  </span>
                ))}
              </div>
              <p className={styles.featureWhy}><strong>Why: </strong>{f.why}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Closing CTA                                                         */
/* ------------------------------------------------------------------ */

const quickstartCommands = `git clone https://github.com/stardelt/stardelt-platform
cd stardelt-platform
helm dependency build chart

helm upgrade --install stardelt chart \\
  --namespace stardelt --create-namespace \\
  -f chart/values-slim.yaml --wait --timeout 15m`;

function DiveDeeper(): ReactNode {
  return (
    <section id="docs" className={styles.section}>
      <div className={styles.container}>
        <span className={styles.eyebrow}>Next steps</span>
        <h2 className={styles.sectionTitle}>Run it on one node this afternoon.</h2>
        <div className={styles.ctaCodeBlock}>
          <CodeBlock language="bash">{quickstartCommands}</CodeBlock>
        </div>
        <div className={styles.ctaRow}>
          <Link
            className={clsx('button button--primary button--lg', styles.ctaPrimary)}
            to="/docs/getting-started/quickstart">
            Start the quickstart
          </Link>
          <Link
            className="button button--secondary button--lg"
            to="/docs/architecture/how-it-works">
            How it works →
          </Link>
        </div>
        <p className={styles.roadmapLine}>
          stardelt is pre-alpha and grows in milestones.{' '}
          <Link to="/docs/roadmap">See what works today and what comes next →</Link>
        </p>
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
      <main>
        <Story />
        <Pillars />
        <Why />
        <EveryScreenHasAnApi />
        <DiveDeeper />
      </main>
    </Layout>
  );
}
