import type {ReactNode} from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import clsx from 'clsx';

import stars from '@site/src/data/stars.json';
import styles from './StarButton.module.css';

/** Octicons `mark-github`, 16 px, MIT. Inlined so the page makes no third-party request. */
const GITHUB_MARK =
  'M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z';

/** Below this the number says nothing ("★ 2"), so the button shows no number at all. */
const SHOW_COUNT_FROM = 50;

type Props = {variant: 'nav' | 'band'};

export default function StarButton({variant}: Props): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  const repo = (siteConfig.customFields?.starRepo as string) ?? 'stardelt/stardelt';
  const count =
    typeof stars.stars === 'number' && stars.stars >= SHOW_COUNT_FROM
      ? stars.stars
      : null;
  const label =
    count === null
      ? 'Star stardelt on GitHub'
      : `Star stardelt on GitHub, ${new Intl.NumberFormat('en').format(count)} stars`;

  return (
    <a
      href={`https://github.com/${repo}`}
      className={clsx(styles.button, styles[variant])}
      aria-label={label}>
      <svg
        className={styles.mark}
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="currentColor"
        aria-hidden="true"
        focusable="false">
        <path d={GITHUB_MARK} />
      </svg>
      <span className={styles.star} aria-hidden="true">
        ★
      </span>
      <span className={styles.text}>
        {variant === 'nav' ? 'Star' : 'Star stardelt on GitHub'}
      </span>
      {count === null ? null : (
        <span className={styles.count} aria-hidden="true">
          {new Intl.NumberFormat('en', {notation: 'compact'}).format(count)}
        </span>
      )}
    </a>
  );
}
