import Link from 'next/link';
import styles from './Attribution.module.css';

export default function Attribution() {
  return <div className={styles.notice}>Basiert auf <a href="https://github.com/vincentchalamon/scavenger-hunt">Scavenger Hunt</a> von <a href="https://github.com/vincentchalamon">Vincent CHALAMON</a> · Für Köthen angepasst · <Link href="/lizenzen/" target="_blank" rel="noopener">CC BY-NC-SA 4.0 · Lizenzen &amp; Mitwirkende</Link></div>;
}
