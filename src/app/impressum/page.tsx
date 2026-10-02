import Link from 'next/link';
import type {Metadata} from 'next';
import styles from '../legal.module.css';

export const metadata: Metadata = {title: 'Impressum · Köthener Stadtrallye'};

export default function ImpressumPage() {
  return <main className={styles.page}>
    <nav className={styles.nav} aria-label="Rechtliche Informationen"><Link href="/">Zur Stadtrallye</Link><Link href="/datenschutz/">Datenschutzerklärung</Link><Link href="/lizenzen/">Lizenzen &amp; Mitwirkende</Link></nav>
    <p className={styles.eyebrow}>Rechtliche Informationen</p>
    <h1>Impressum</h1>
    <p className={styles.lead}>Angaben zum Angebot „Köthener Stadtrallye“.</p>
    <section>
      <h2>Anbieterin</h2>
      <address>Studierendenschaft der Hochschule Anhalt<br/>Körperschaft des öffentlichen Rechts<br/>vertreten durch den Sprecherrat des Studierendenrates<br/>Bernburger Straße 55<br/>06366 Köthen<br/>Deutschland</address>
      <p>E-Mail: <a href="mailto:stura@hs-anhalt.de">stura@hs-anhalt.de</a></p>
    </section>
    <section>
      <h2>Inhalt und technische Umsetzung</h2>
      <p>Die Studierendenschaft der Hochschule Anhalt verantwortet dieses Angebot. Die technische Anpassung der Anwendung für Köthen erfolgte durch Erik Engler. Informationen zum Ursprungsprojekt, zur Lizenz und zu Mitwirkenden stehen unter <Link href="/lizenzen/">Lizenzen &amp; Mitwirkende</Link>.</p>
      <p>Die Studierendenschaft ist rechtlich selbstständig. Die Köthener Stadtrallye ist kein offizielles Angebot der Hochschule Anhalt.</p>
    </section>
    <p className={styles.note}>Stand: 2. Oktober 2026</p>
  </main>;
}
