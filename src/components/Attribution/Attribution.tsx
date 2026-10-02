import Link from 'next/link';
import styles from './Attribution.module.css';

export default function Attribution() {
  return <footer className={styles.notice}><Link href="/impressum/">Impressum</Link> · <Link href="/datenschutz/">Datenschutz</Link> · Basiert auf <a href="https://github.com/vincentchalamon/scavenger-hunt">Scavenger Hunt</a> von <a href="https://github.com/vincentchalamon">Vincent CHALAMON</a> · Für Köthen angepasst · <Link href="/lizenzen/">CC BY-NC-SA 4.0 · Lizenzen &amp; Mitwirkende</Link></footer>;
}
