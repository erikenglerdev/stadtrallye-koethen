import Link from 'next/link';
import type {Metadata} from 'next';
import styles from '../legal.module.css';

export const metadata: Metadata = {title: 'Datenschutzerklärung · Köthener Stadtrallye'};

export default function DatenschutzPage() {
  return <main className={styles.page}>
    <nav className={styles.nav} aria-label="Rechtliche Informationen"><Link href="/">Zur Stadtrallye</Link><Link href="/impressum/">Impressum</Link><Link href="/lizenzen/">Lizenzen &amp; Mitwirkende</Link></nav>
    <p className={styles.eyebrow}>Rechtliche Informationen</p>
    <h1>Datenschutzerklärung</h1>
    <p className={styles.lead}>Diese Erklärung beschreibt die Datenverarbeitung auf dieser Website, insbesondere bei der Köthener Stadtrallye und im Hilfe-Chat.</p>
    <p className={styles.note}>Stand: 2. Oktober 2026</p>

    <section>
      <h2>Verantwortliche Stelle</h2>
      <address>Studierendenschaft der Hochschule Anhalt<br/>Körperschaft des öffentlichen Rechts<br/>vertreten durch den Sprecherrat des Studierendenrates<br/>Bernburger Straße 55<br/>06366 Köthen<br/>Deutschland</address>
      <p>E-Mail: <a href="mailto:stura@hs-anhalt.de">stura@hs-anhalt.de</a></p>
      <p>Die Studierendenschaft ist für den Betrieb dieser Website und die hier beschriebenen Rallye-Daten verantwortlich. Weitere Anbieterangaben findest du im <Link href="/impressum/">Impressum</Link>.</p>
    </section>

    <section>
      <h2>Aufruf der Website und Hosting</h2>
      <p>Beim Aufruf der Website werden technisch erforderliche Verbindungsdaten verarbeitet. Dazu gehören insbesondere IP-Adresse, Zeitpunkt, angeforderte Seite, Browser- und Geräteinformationen. Diese Daten werden benötigt, um die Website auszuliefern und ihren sicheren Betrieb zu ermöglichen. Die Anwendung selbst schreibt IP-Adressen nicht in die Rallye-Datenbank.</p>
      <p>Nach Betreiberangabe sind Zugriffs- und Fehlerprotokolle im globalen Host-Nginx abgeschaltet. Einzelne Regeln für diese Website können davon abweichen; ihre wirksame Konfiguration ist noch nicht geprüft. Deshalb ist nicht bestätigt, ob der vorgeschaltete Webserver für diese Website Zugriffs- oder Fehlerprotokolle speichert und wie lange solche Einträge gegebenenfalls aufbewahrt werden.</p>
      <p>Die Website läuft auf einem Server von Hostinger in Deutschland. Hosting-Dienstleister ist Hostinger International Ltd., 61 Lordou Vironos Street, 6023 Larnaca, Zypern. Hostinger kann für den Betrieb Unterauftragnehmer einsetzen. Hinweise zu möglichen Übermittlungen außerhalb des Europäischen Wirtschaftsraums und zu den vereinbarten Schutzmaßnahmen stehen im <a href="https://www.hostinger.com/legal/dpa">Datenschutzvertrag von Hostinger</a>.</p>
      <p>Rechtsgrundlage für die Bereitstellung und Absicherung dieses Angebots ist Art. 6 Abs. 1 Buchst. e DSGVO in Verbindung mit § 65 Abs. 1 HSG LSA.</p>
    </section>

    <section>
      <h2>System- und Sicherheitsprotokolle</h2>
      <p>Auf dem gemeinsam genutzten Server können bei Systemereignissen, Fehlern oder sicherheitsrelevanten Vorgängen Daten in systemd-journald, rsyslog und Fail2ban erfasst werden. Soweit Ereignisse dieses Angebots betroffen sind, können dazu je nach Vorgang insbesondere IP-Adresse, Zeitpunkt, betroffener Dienst, Fehlerangaben oder Angaben zu Anmeldeversuchen an Serverdiensten gehören. Nicht jeder Aufruf dieser Website führt zu einem solchen Eintrag. Die Protokolle dienen dazu, Störungen und Angriffe zu erkennen, zu untersuchen und den Server zu schützen. Zugriff können berechtigte Personen für die Serververwaltung und der Hosting-Dienstleister erhalten. Rechtsgrundlage ist Art. 6 Abs. 1 Buchst. e DSGVO in Verbindung mit § 65 Abs. 1 HSG LSA.</p>
      <p>Nach Betreiberangabe begrenzen die konfigurierten Aufbewahrungs- und Rotationsregeln diese lokalen System- und Sicherheitsprotokolle im regulären Betrieb auf etwa 15 Tage, einschließlich des täglichen Bereinigungslaufs. Dies betrifft das Systemjournal, die rsyslog-Dateien für System-, Mail-, Kernel-, Anmelde-, Nutzer- und Cron-Ereignisse sowie das Fail2ban-Protokoll. Es ist keine Zusage, dass jede Protokolldatei auf dem Server nach 15 Tagen gelöscht ist. Für etwaige Webserver-, Anwendungs- oder Containerprotokolle und eigene Protokolle von Hostinger ist damit keine Speicherdauer belegt.</p>
    </section>

    <section>
      <h2>Server-Backups</h2>
      <p>Nach Betreiberangabe erstellt Hostinger wöchentlich ein automatisches Server-Backup. Zwei Backups werden aufbewahrt; mit dem nächsten Backup wird das älteste gelöscht. Die Backup-Server stehen innerhalb der EU.</p>
      <p>Ein Eintrag aus den oben genannten lokalen Sicherheitsprotokollen kann, sofern er von einem Backup erfasst wird, planmäßig noch bis zu etwa 29 Tage nach seiner Entstehung in einem Backup enthalten sein: etwa 15 Tage lokal und bis zu etwa 14 weitere Tage in den aufbewahrten Sicherungen. Diese Schätzung gilt nicht pauschal für andere Daten oder sämtliche Inhalte eines Backups. Der genaue Sicherungsumfang, insbesondere für die Rallye-Datenbank im Docker-Volume und mögliche weitere Protokolle, ist für diese Website nicht geprüft.</p>
    </section>

    <section>
      <h2>Teilnahme an der Rallye</h2>
      <p>Bei der Anmeldung werden Teamkennung, Teamname und Startposition gespeichert. Während der Runde speichert der Server den Fortschritt, bestätigte Stationen und Zeitpunkte, Beginn und Ende der Runde sowie in Anspruch genommene Ortshilfen und daraus entstehende Strafzeit. Diese Angaben ermöglichen die gemeinsame Runde auf mehreren Geräten, die Zeitmessung und die Anzeige im passwortgeschützten Organisations-Dashboard. Ein persönliches Nutzerkonto wird nicht angelegt.</p>
      <p>Zur Wiedererkennung der Teamrunde setzt die Website ein technisch notwendiges Sitzungscookie. Es enthält einen zufälligen Sitzungsschlüssel, ist vor JavaScript-Zugriff geschützt und läuft spätestens nach 30 Tagen ab. Auf dem Server liegt dazu nur ein Hashwert; beim Abmelden auf einem Gerät wird die zugehörige Sitzung widerrufen. Die Rundendaten bleiben davon unberührt. Für das Organisations-Dashboard wird ein gesondertes, technisch notwendiges Anmeldecookie mit einer Laufzeit von zwölf Stunden verwendet. Für diese Cookies ist nach § 25 Abs. 2 Nr. 2 TDDDG keine Einwilligung erforderlich.</p>
      <p>Die Teilnahme ist freiwillig. Ohne Teamkennung und Teamname kann keine gemeinsame Runde angelegt werden. Rechtsgrundlage für die Verarbeitung der Rallye-Daten ist Art. 6 Abs. 1 Buchst. e DSGVO in Verbindung mit § 65 Abs. 1 HSG LSA.</p>
    </section>

    <section>
      <h2>Standortprüfung</h2>
      <p>Erst wenn du eine Station bestätigen möchtest, fragt die Rallye den Browser nach deinem Standort. Für die Prüfung werden mehrere aktuelle GPS-Messungen mit Koordinaten, Genauigkeit und Zeitstempel an den Server übertragen. Der Server vergleicht sie mit der erwarteten Station. Er speichert die einzelnen GPS-Messungen nicht als Bewegungsverlauf; gespeichert werden nur die bestätigte Station und ihr Zeitpunkt. Nach Abschluss oder Abbruch der Prüfung beendet die Website die Standortbeobachtung.</p>
      <p>Ohne Standortfreigabe kann die Station nicht bestätigt werden. Die Standortprüfung dient der Durchführung der Rallye; Rechtsgrundlage ist Art. 6 Abs. 1 Buchst. e DSGVO in Verbindung mit § 65 Abs. 1 HSG LSA.</p>
    </section>

    <section>
      <h2>Hilfe-Chat und Organisations-Dashboard</h2>
      <p>Wenn du den Hilfe-Chat nutzt, werden deine Nachricht, die Zuordnung zur Teamrunde und der Sendezeitpunkt gespeichert. Antworten der Organisation werden ebenfalls gespeichert. Angemeldete Geräte derselben Teamrunde und die berechtigten Personen im Dashboard können den Verlauf sehen. Bitte sende keine unnötigen persönlichen oder vertraulichen Angaben. Die Nachrichten dienen ausschließlich der Bearbeitung deiner Hilfeanfrage; Rechtsgrundlage ist Art. 6 Abs. 1 Buchst. e DSGVO in Verbindung mit § 65 Abs. 1 HSG LSA.</p>
      <p>Das Dashboard zeigt Teamkennung, Teamname, Status, Zeiten, Strafzeit und Hilfeanfragen. Es ist mit einem Passwort geschützt. Standortmessungen werden dort nicht angezeigt.</p>
    </section>

    <section>
      <h2>Karten und Ortssuche</h2>
      <p>Wenn du eine Karte öffnest, lädt dein Browser Kartenkacheln direkt von der OpenStreetMap Foundation (OSMF), St John’s Innovation Centre, Cowley Road, Cambridge, CB4 0WS, Vereinigtes Königreich. Dabei werden technisch unter anderem deine IP-Adresse und der betrachtete Kartenausschnitt übermittelt. Wenn die Karte auf deinen Standort zentriert wird, kann der betrachtete Ausschnitt Rückschlüsse auf dessen ungefähre Lage erlauben. In den zusätzlich erreichbaren Beispielrallyes wird bei einer Ortssuche ab drei Zeichen die Suchanfrage direkt an den OSMF-Dienst Nominatim gesendet. Für diese Dienste ist die OSMF eigenständig verantwortlich. Ihre Dienste können Infrastruktur außerhalb der EU nutzen. Einzelheiten findest du in den <a href="https://osmfoundation.org/wiki/Services_and_tile_users_privacy_FAQ">Datenschutzhinweisen zu Karten und Suche</a> und der <a href="https://osmfoundation.org/wiki/Privacy_Policy">OSMF-Datenschutzrichtlinie</a>.</p>
      <p>Die Karte und die Ortssuche unterstützen die Orientierung. Rechtsgrundlage für ihre Einbindung ist Art. 6 Abs. 1 Buchst. e DSGVO in Verbindung mit § 65 Abs. 1 HSG LSA. Die Rallye kann grundsätzlich auch ohne Öffnen der Karte gespielt werden.</p>
    </section>

    <section>
      <h2>Lokale Daten, externe Links und Analyse</h2>
      <p>Die zusätzlich erreichbaren Beispielrallyes speichern Sprache, den Hinweis auf eine bereits gezeigte Einführung sowie besuchte Orte und gefundene Schlüsselwörter im lokalen Speicher deines Browsers. Diese Angaben werden für den Spielfortschritt auf deinem Gerät benötigt und bleiben dort, bis du sie in der Anwendung oder im Browser löschst. Für den technisch notwendigen Zugriff auf diesen Speicher gilt § 25 Abs. 2 Nr. 2 TDDDG.</p>
      <p>Schriftdateien werden von dieser Website selbst ausgeliefert. Es gibt keine Werbe-, Analyse- oder Trackingdienste. Externe Links, etwa zu Wikipedia oder zum Quellcode, werden erst nach deiner Auswahl geöffnet. Ab diesem Zeitpunkt gelten die Datenschutzhinweise des jeweiligen Anbieters.</p>
    </section>

    <section>
      <h2>Speicherdauer</h2>
      <p>Teamdaten, Stationsbestätigungen, Zeit- und Strafzeitdaten sowie Chatnachrichten bleiben in der Serverdatenbank, bis die verantwortliche Stelle sie löscht. Eine automatische Löschfrist ist derzeit nicht eingerichtet. Das Abmelden oder das Ablaufen eines Sitzungscookies löscht die Rundendaten nicht. Lokal gespeicherte Daten der Beispielrallyes bleiben bis zu ihrer Löschung durch dich oder deinen Browser erhalten. Die oben beschriebenen Fristen für lokale System- und Sicherheitsprotokolle sowie mögliche Kopien in Backups gelten nicht für diese Rundendaten.</p>
    </section>

    <section>
      <h2>Deine Rechte</h2>
      <p>Du hast nach Maßgabe der DSGVO Rechte auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch. Wende dich dafür an <a href="mailto:stura@hs-anhalt.de">stura@hs-anhalt.de</a>. Es findet keine automatisierte Entscheidungsfindung und kein Profiling statt.</p>
      <p>Du kannst dich außerdem gemäß Art. 77 DSGVO bei einer Datenschutzaufsichtsbehörde beschweren, insbesondere bei der <a href="https://datenschutz.sachsen-anhalt.de/service/online-formulare/beschwerde">Landesbeauftragten für den Datenschutz Sachsen-Anhalt</a>, Otto-von-Guericke-Straße 34a, 39104 Magdeburg.</p>
    </section>
  </main>;
}
