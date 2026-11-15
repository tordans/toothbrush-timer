# Datenschutz: was wo liegt und wer was sehen kann

Technische Beschreibung für Nutzer:innen von brush.ingsparks.de und für alle, die den Code selbst
betreiben. Stand: November 2026, gilt für den Code in diesem Repository. Keine Rechtsberatung; wer
eine eigene Instanz öffentlich betreibt, ist selbst für Datenschutzerklärung und ggf. Impressum
verantwortlich. Die App zeigt eine Kurzfassung unter „Datenschutz und Impressum“ (`/datenschutz`).

## Verantwortlich und Impressum

Tobias Jordans, Böhmische Straße 54, 12055 Berlin, E-Mail: t@tobiasjordans.de. Privates, nicht
kommerzielles Projekt.

Kontakt für Fragen, Auskunft und das Löschen einer Familie: dieselbe Adresse.

## Grundsätze

- Es gibt keine Konten und keine Registrierung, keine Cookies, kein Tracking und keine Werbung.
  Schrift, Bilder und Code werden vom eigenen Server geladen. Die Content-Security-Policy erlaubt
  nur die eigene Domain; der Browser ruft keine Dienste von Dritten auf.
- Wer die Daten einer Familie sehen oder ändern will, braucht deren Familien-Link. Eine neue Familie
  legt nur an, wer das Einladungswort kennt, das wir persönlich weitergeben.
- Die App sammelt keine Punkte, Statistiken oder Nutzungsdaten. Gespeichert wird nur, was sie für
  die Woche im Wald braucht.

## Im Browser

| Was                                                                                                        | Wo                                                 | Hinweis                                                                                                                                                                                              |
| ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kopie der Familiendaten (Kinder, Putz-Einträge, Ton-Einstellungen, siehe unten) und der Familien-Schlüssel | `localStorage`, Schlüssel `brushing-sparks`        | Damit die App ohne Netz funktioniert und später abgleicht; der Schlüssel öffnet die Familie auf dem Server.                                                                                          |
| Liste der Belohnungsfotos (Kennung, Größe, Zeitpunkt; keine Bilder)                                        | `localStorage`, Schlüssel `brushing-sparks-photos` | Damit die App weiß, welche Fotos es gibt, auch ohne Netz. Die Bilder selbst lädt die App bei Bedarf vom Server; der Browser darf sie im HTTP-Cache behalten (`private`), bis der Cache geleert wird. |
| App-Dateien (HTML, JavaScript, Schrift, Bilder)                                                            | Cache des Service Workers (`brushing-sparks-v1`)   | Nur Programmdateien, keine Daten. Damit die App bei schwachem WLAN startet.                                                                                                                          |

Wer Zugriff auf das entsperrte Gerät bzw. Browserprofil hat, sieht die Daten und kann die Familie mit
dem gespeicherten Schlüssel öffnen. Der Schlüssel steht nur kurz in der Adresszeile; die App entfernt
ihn nach dem Öffnen des Links. Der Teil nach `#` wird von Browsern nie an einen Server gesendet und
taucht deshalb nicht in Zugriffsprotokollen auf.

## Auf dem Server

Der Server ist Webspace bei **all-inkl.com** (ALL-INKL.COM – Neue Medien Münnich) in Deutschland,
mit PHP und einer MariaDB-Datenbank.

| Was                                                                                                                                                                                             | Form                                                                                                                                                   | Lesbar für                                                                                                                   |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Die Familie: Namen der Kinder (frei wählbar), gewähltes Tier, Putz-Einträge (Tag, morgens oder abends, Uhrzeit, Dauer in Sekunden, ob vom Timer oder von Eltern eingetragen), Ton-Einstellungen | **Klartext** (JSON) in der Datenbank. Keine Ende-zu-Ende-Verschlüsselung                                                                               | wer den Familien-Link hat; der Betreiber; der Hoster                                                                         |
| Belohnungsfotos: verkleinerte Kopien (längste Seite höchstens 2048 Pixel, JPEG oder WebP) und je ein Eintrag mit Größe, Maßen und Zeitpunkt                                                     | Dateien auf dem Webspace, **unverschlüsselt**; die Metadaten in der Datenbank. Keine Originale, keine Auswertung, keine Weitergabe an Dritte           | wer den Familien-Link hat (Abruf nur mit Schlüssel); der Betreiber; der Hoster                                               |
| Familien-Schlüssel                                                                                                                                                                              | nur als SHA-256-Fingerabdruck; der Schlüssel selbst geht nur einmal beim Anlegen oder Erneuern an das Gerät                                            | – (nicht umkehrbar)                                                                                                          |
| Einladungswort                                                                                                                                                                                  | nur als SHA-256-Fingerabdruck in der Konfiguration                                                                                                     | –                                                                                                                            |
| Fehlversuche mit dem Einladungswort                                                                                                                                                             | IP-Adresse gemischt mit einem täglich wechselnden Salz und gehasht (keine Klar-IP), mit Zeitpunkt; Einträge älter als etwa eine Stunde werden gelöscht | Betreiber, Hoster                                                                                                            |
| Fehlversuche mit einem falschen Familien-Link                                                                                                                                                   | derselbe gesalzene Fingerabdruck als Dateiname mit Zeitpunkten; zählt zehn Minuten, die Datei wird nach einem ruhigen Tag gelöscht                     | Betreiber, Hoster                                                                                                            |
| Fehlerprotokoll der API                                                                                                                                                                         | nur Server-Fehler: Methode, Pfad, Status, Dauer und Fehlermeldung; keine Inhalte der Anfrage, keine IP-Adressen                                        | Betreiber                                                                                                                    |
| Zugriffsprotokolle des Webservers (IP-Adresse, Zeit, aufgerufene Adresse, Browser)                                                                                                              | beim Hoster                                                                                                                                            | Hoster, nach dessen Regeln; siehe [Datenschutzinformationen von all-inkl.com](https://all-inkl.com/datenschutzinformationen) |

Die Familie ist **nicht verschlüsselt**, damit der Server Änderungen von mehreren Handys annehmen und
zusammenführen kann, ohne Passphrasen zu verwalten. Tragt deshalb nur ein, was ihr auch einem
Webhoster in Deutschland anvertrauen würdet. Für die Kinder reichen Vornamen oder Spitznamen.

Pro Familie gibt es einen Link, aber keine Nutzerkonten und keine Zuordnung zu Personen. Die
Datenbank enthält keine E-Mail-Adressen und keine Klar-IP-Adressen.

## Wer kann was?

- **Familien-Link:** Wer ihn hat, kann alles sehen und ändern: Kinder, Putz-Einträge, Einstellungen.
  Eine Leseansicht ohne Änderungsrecht gibt es nicht.
- **Link erneuern:** Unter „Für Eltern“ → „Weitere Handys“ → „Neuen Link erzeugen“. Der alte Link
  gilt sofort nicht mehr, auf allen Geräten; dort erscheint „Dieser Familien-Link gilt nicht mehr“.
  Weil nur Fingerabdrücke gespeichert sind, kann niemand einen verlorenen Link wieder anzeigen. Auf
  einem angemeldeten Gerät steht er unter „Weitere Handys“; speichert ihn am besten in einem
  Passwortmanager.
- **Belohnungsfotos:** Die Fotos lassen sich nur mit dem Familien-Link abrufen, nicht über eine
  öffentliche Adresse. Der Betreiber und der Hoster könnten sie technisch einsehen; sie werden nicht
  ausgewertet und nicht an Dritte weitergegeben. Hochgeladen wird nur die im Browser verkleinerte
  Kopie, das Original verlässt das Gerät nicht.
- **Weitergabe:** Wer den Link weitergibt, gibt den Zugriff weiter. Nur in der Familie teilen.
- **Einladungswort:** Es schützt davor, dass Fremde Familien auf dem Server anlegen. Es öffnet keine
  bestehende Familie.

## Löschen

- **Eine Familie:** Auf Anfrage an den Betreiber (E-Mail oben) löscht dieser die Familie samt allen
  Einträgen, Fotos und dem Schlüssel. Dazu den Familien-Link mitschicken. Eine
  Löschfunktion in der App gibt es noch nicht.
- **Ein Foto:** „Für Eltern“ → „Belohnungsfotos“ → „Löschen“ entfernt die Datei und den Eintrag
  sofort vom Server. War das Foto schon in einer Woche dran, sehen die Kinder es dort nicht mehr.
  Beim Löschen der Familie (siehe oben) werden alle Fotos mit gelöscht.
- **Ein Kind:** „Für Eltern“ → Kind → „Ändern“ → „Entfernen“ markiert das Kind als gelöscht und
  blendet es mit seinen Einträgen aus, damit auch die anderen Handys es übernehmen. Die Daten bleiben
  in der Familie, bis die Familie gelöscht wird.
- **Im Browser:** „Auf diesem Gerät abmelden“ (Für Eltern → Weitere Handys) entfernt den Schlüssel
  und die lokale Kopie. Die App-Dateien im Cache verschwinden über „Websitedaten löschen“ in den
  Browser-Einstellungen.
- **Zugriffsprotokolle** beim Hoster löscht dieser nach seinen Fristen.
