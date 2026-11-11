import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';

import styles from './NextStep.module.css';

type Props = {
  to: string;
  title: string;
  children: ReactNode;
};

/** The one place a page ends: the whole card is the link to the next page. */
export default function NextStep({to, title, children}: Props): ReactNode {
  return (
    <Link to={to} className={styles.card}>
      <span className={styles.label}>Next</span>
      <span className={styles.title}>{title} →</span>
      <span className={styles.body}>{children}</span>
    </Link>
  );
}
