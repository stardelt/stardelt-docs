import {useEffect, useState, type ReactNode} from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';

import styles from './demo.module.css';
import StarButton from '@site/src/components/StarButton';

/* ------------------------------------------------------------------ */
/*  The shared sign-in                                                  */
/* ------------------------------------------------------------------ */

/** One row of the sign-in card: the label, the value, and a copy button that says "Copied" for two seconds. */
function CopyRow({label, value}: {label: string; value: string}): ReactNode {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copy = () => {
    // The clipboard API is absent on insecure origins (plain http); the value stays readable either way.
    void navigator.clipboard?.writeText(value).then(() => setCopied(true));
  };

  return (
    <div className={styles.row}>
      <span className={styles.rowLabel}>{label}</span>
      <code className={styles.rowValue}>{value}</code>
      <button type="button" className={styles.copy} onClick={copy}>
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

type Status = 'checking' | 'up' | 'down';

/** A no-cors request settles once the lab answers anything at all; a timeout covers a lab that accepts the connection and never replies. */
function useLabStatus(url: string): Status {
  const [status, setStatus] = useState<Status>('checking');

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!cancelled) {
        setStatus((current) => (current === 'checking' ? 'down' : current));
      }
    }, 6000);

    fetch(`${url}/api/health`, {mode: 'no-cors', cache: 'no-store'})
      .then(() => {
        if (!cancelled) {
          window.clearTimeout(timer);
          setStatus('up');
        }
      })
      .catch(() => {
        if (!cancelled) {
          window.clearTimeout(timer);
          setStatus('down');
        }
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [url]);

  return status;
}

/* ------------------------------------------------------------------ */
/*  Things to try                                                       */
/* ------------------------------------------------------------------ */

const thingsToTry = [
  {
    title: 'Look at the shop',
    sql: 'select * from gold.shop.daily_revenue order by order_date desc limit 7;',
    note: null,
  },
  {
    title: 'Rank customers',
    sql: 'select * from gold.shop.customer_ltv order by value_rank limit 10;',
    note: null,
  },
  {
    title: 'Make your own table',
    sql: 'create table playground.scratch.my_orders as select * from silver.shop.stg_order_lines limit 100;',
    note: 'Then open it in the catalog and look at its lineage.',
  },
];

const goodToKnow = [
  'Everyone signs in as the same person: others can see what you type and save.',
  'You can query, create tables, open a notebook and publish a pipeline.',
  'A pipeline runs when you click Run or on a schedule, and it writes only to the playground.',
  'The notebook is shared, and Start/Restart wipes its home directory.',
  'Everything you create is deleted every night at 03:00 UTC.',
  'Please do not enter personal or confidential data.',
  'The lab is our development cluster: it can be slow, changed or down.',
];

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function Demo(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  const demoUrl = siteConfig.customFields?.demoUrl as string;
  const status = useLabStatus(demoUrl);

  return (
    <Layout
      title="Try the demo"
      description="Sign in to a live stardelt and query sample data. No install.">
      <main className={styles.page}>
        <header className={styles.hero}>
          <h1 className={styles.title}>Try stardelt in your browser</h1>
          <p className={styles.lead}>
            A live stardelt in our lab, with a small shop&apos;s data: browse the
            catalog, query it, follow its lineage, and build your own tables.
          </p>
          <p className={styles.starLine}>
            Free and open source. <StarButton variant="nav" />
          </p>
        </header>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Sign in</h2>
          <CopyRow label="User" value="demo" />
          <CopyRow label="Password" value="demo" />
          <a
            className={`button button--primary button--lg ${styles.open}`}
            href={`${demoUrl}/api/auth/login?login_hint=demo&return_to=/catalog`}
            target="_blank"
            rel="noopener">
            Open the demo
          </a>
          <p className={styles.hint}>
            The sign-in page fills in the user; type the password demo.
          </p>
        </section>

        <p
          className={`${styles.status} ${styles[status]}`}
          role="status"
          aria-live="polite">
          {status === 'checking' ? (
            'Checking the lab…'
          ) : status === 'up' ? (
            <>
              <span className={styles.dot} aria-hidden>
                ●
              </span>{' '}
              The lab is up
            </>
          ) : (
            <>
              <span className={styles.dot} aria-hidden>
                ●
              </span>{' '}
              The lab is down right now. It is a development cluster; try again later.
            </>
          )}
        </p>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Things to try</h2>
          <div className={styles.grid}>
            {thingsToTry.map((item) => (
              <article className={styles.card} key={item.title}>
                <h3 className={styles.tryTitle}>{item.title}</h3>
                <pre className={styles.sql}>
                  <code>{item.sql}</code>
                </pre>
                {item.note ? <p className={styles.note}>{item.note}</p> : null}
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Good to know</h2>
          <ul className={styles.rules}>
            {goodToKnow.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </section>

        <p className={styles.footerLine}>
          Want your own?{' '}
          <Link to="/docs/getting-started/quickstart">Install stardelt</Link>
        </p>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Liked it?</h2>
          <p>
            Star stardelt on GitHub, then install it on your own cluster with the
            quickstart.
          </p>
          <div className={styles.starRow}>
            <StarButton variant="band" />
            <Link to="/docs/getting-started/quickstart">Start the quickstart →</Link>
          </div>
        </section>
      </main>
    </Layout>
  );
}
