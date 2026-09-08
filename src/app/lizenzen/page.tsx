import Link from 'next/link';
import type {Metadata} from 'next';
import styles from './page.module.css';

export const metadata: Metadata = {title: 'Lizenzen & Mitwirkende · Köthener Stadtrallye'};
const legal = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/legal`;

export default function LicensesPage() {
  return <main className={styles.page}>
    <Link href="/">Zur Stadtrallye</Link>
    <h1>Lizenzen &amp; Mitwirkende</h1>
    <h2>Ursprungsprojekt</h2>
    <p>Die Köthener Stadtrallye basiert auf <a href="https://github.com/vincentchalamon/scavenger-hunt">Scavenger Hunt</a> von <a href="https://github.com/vincentchalamon">Vincent CHALAMON</a>. Ihm gebührt die Anerkennung für die ursprüngliche Idee, das Design und die Entwicklung der Anwendung.</p>
    <h2>Lizenz und Anpassungen</h2>
    <p>Das Ursprungsprojekt und diese Bearbeitung stehen unter <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/deed.de">Creative Commons Namensnennung – Nicht kommerziell – Weitergabe unter gleichen Bedingungen 4.0 International (CC BY-NC-SA 4.0)</a>. Fremde Bestandteile behalten ihre jeweils eigene Lizenz.</p>
    <p>Die Bearbeitung durch Erik Engler ergänzt die deutschsprachige GPS-Rallye in Köthen, eine Kreisroute mit fiktiven Hinweisen, Teamkennungen und gemeinsamen Fortschritt, serverseitige Zeitmessung mit Strafzeiten, ein Live-Dashboard, lokale Simulation, Verbindungsbehandlung und Docker-Bereitstellung. Ursprüngliche Komponenten, Gestaltung und Beispielrallyes wurden übernommen und teilweise angepasst.</p>
    <p><a href="https://github.com/erikenglerdev/stadtrallye-koethen">Quellcode und Änderungshistorie dieser Bearbeitung</a>. Eine Unterstützung oder Billigung durch den ursprünglichen Entwickler wird nicht behauptet.</p>
    <p>Bei Weitergabe sind Urheber-, Lizenz- und Änderungshinweise beizubehalten. Die Nutzung muss nicht kommerziell im Sinne der Lizenz sein. Geteilte Bearbeitungen müssen deren ShareAlike-Bedingungen erfüllen. Maßgeblich ist der vollständige Lizenztext einschließlich Gewährleistungs- und Haftungsausschluss.</p>
    <ul><li><a href={`${legal}/LICENSE.txt`}>Unveränderter vollständiger Lizenztext</a></li><li><a href={`${legal}/NOTICE.txt`}>Herkunft, Änderungen und Hinweise zur Weitergabe</a></li></ul>
    <h2>Bibliotheken, Komponenten und Schriften</h2>
    <p>Die ursprünglichen Danksagungen bleiben erhalten. Dazu gehören Next.js, React, TypeScript, Zod, Bootstrap, React Bootstrap, driver.js, Leaflet, React Leaflet, Leaflet GeoSearch und Nominatim sowie die Entwickler der folgenden Komponenten:</p>
    <ul>
      <li><a href="https://github.com/AaronCCWong/react-card-flip">React Card Flip — Aaron Wong</a></li>
      <li><a href="https://github.com/Josh-McFarlin/react-looking-glass">React Looking Glass — Josh Mc Farlin</a></li>
      <li><a href="https://github.com/Nodlik/react-pageflip">React Page Flip — Oleg Nodlik</a></li>
      <li><a href="https://github.com/gshudhanshu/react-scratchcard-v4">React Scratch Card — Shudhanshu Gunjal</a></li>
      <li><a href="https://github.com/pmndrs/react-three-fiber">React Three Fiber — Poimandres</a></li>
    </ul>
    <p>Schriften über Fontsource: Inter Tight — © 2022 The Inter Project Authors (ursprünglicher Credit: Rasmus Andersson); Geist Mono — © 2024 The Geist Project Authors (Vercel). Beide werden unter der SIL Open Font License 1.1 verwendet. Die vollständigen Schriftlizenzen werden mitgeliefert.</p>
    <p><a href={`${legal}/original-credits.txt`}>Vollständige ursprüngliche Danksagungen</a> · <a href={`${legal}/third-party-notices.txt`}>Lizenztexte und Urheberhinweise der Drittanbieter einschließlich Schriften</a></p>
    <h2>Karten</h2>
    <p>© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap-Mitwirkende</a>. Die Kartendaten stehen unter der Open Database License (ODbL). Der Herkunftshinweis bleibt unmittelbar auf der Karte sichtbar.</p>
  </main>;
}
