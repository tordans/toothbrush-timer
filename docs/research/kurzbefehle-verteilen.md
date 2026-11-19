# Kurzbefehle an andere Eltern verteilen

Stand: 19. November 2026. Nur Recherche. Nichts davon ist in die App eingebaut und nichts auf einem
Gerät ausprobiert. Was nur aus Foren oder Blogs stammt oder offen ist, ist mit **(unbestätigt)**
markiert. Hintergrund zur Bild-Aktion: `apple-intelligence-rewards.md`.

## Ergebnis in Kürze

- **Der einzige Weg, der für Fremde zuverlässig geht, ist der iCloud-Link** (`icloud.com/shortcuts/…`).
  Die App zeigt im Elternbereich nur einen Knopf, der diesen Link öffnet. Dann „Kurzbefehl holen“.
- **Eigene `.shortcut`-Datei von unserer Domain: nicht empfohlen.** Sie müsste von Apple signiert
  sein („Anyone“), das geht nur am Mac mit iCloud-Anmeldung und ist bei Entwicklern oft gescheitert.
  Ob Safari sie dann direkt in Kurzbefehle öffnet, ist ungeprüft.
- **`shortcuts://import-shortcut?url=…` steht nicht in Apples Dokumentation.** Dort stehen nur
  `open-shortcut`, `create-shortcut`, `run-shortcut`. Nicht darauf bauen.
- **Ein Link ist eine Momentaufnahme.** Nach einer Änderung muss man neu teilen. Ob der alte Link
  dann auch den neuen Stand zeigt, ist nirgends belegt (Community: nein). Die Link-Adresse gehört
  deshalb in die App-Konfiguration, nicht in den Text.
- **„Kurzbefehl aus Beschreibung“ gibt es erst ab iOS/iPadOS/macOS 27** (Apple Intelligence, nicht
  in iOS 26). Es ist ein Werkzeug für die eigene Nutzung, kein Verteilweg und kein sicherer
  Ersatz für den Link. Ein Copy-and-paste-Textformat für Kurzbefehle gibt es nicht.
- **Importfragen gibt es** (Reiter „Setup“). Für Stil oder Themen sind **mehrere Kurzbefehle**
  einfacher zu pflegen als ein Menü. Aber: Fehlermeldungen zu Importfragen im Jahr 2025.
- **Direkt-Upload aus dem Kurzbefehl ist machbar** („Inhalt von URL abrufen“, POST, Formular mit
  Datei, Header `Authorization`). Aber: Der Schlüssel darf **nicht** im geteilten Kurzbefehl stehen.
  Apple bekommt eine Kopie, und jeder mit dem Link kann alles lesen.
- **Teilen-Menü auf dem iPad:** Die Option „Im Share Sheet zeigen“ und die erlaubten Eingabetypen
  gehören zum Kurzbefehl selbst. Mit eingeschalteter iCloud-Synchronisierung wandert der am Mac
  gebaute Kurzbefehl samt dieser Einstellung auf das iPad. Das erklärt wohl das „irgendwie“.
- **Empfehlung:** Ein iCloud-Link pro Kurzbefehl, in der App als Karte mit drei Schritten. Version 1
  ohne Upload (Bild speichern, in der App hochladen). Upload aus dem Kurzbefehl erst als Version 2,
  mit eigenem, nur zum Hochladen berechtigten Code.

## 1. Wie kommt ein Kurzbefehl zu anderen Eltern?

### 1a. iCloud-Link

- **Erzeugen:** Im Editor auf Teilen tippen, dann „iCloud-Link kopieren“ (Copy iCloud Link). Wer den
  Link öffnet, sieht eine Vorschau und tippt auf „Kurzbefehl holen“. Er landet in der Mediathek.
  Auf dem Mac geht es ebenso. (Apple-Hilfe „Share shortcuts“)
- **Datenschutz laut Apple:** Beim Teilen erhält Apple den Kurzbefehl samt eingebetteter Inhalte.
  Jeder mit dem Link kann ihn ansehen, kopieren, ändern und weitergeben. Apple darf geteilte
  Kurzbefehle prüfen, sperren oder entfernen. Kurzbefehle von außerhalb der Gallery sind von Apple
  nicht geprüft. (Apple, „Shortcuts Sharing & Privacy“)
- **Zeigt der Link Namen oder Apple-ID der Autorin?** Apples Seiten sagen dazu nichts. Die Vorschau
  zeigt laut MacStories (iOS-15-Test) Name, Symbol und Auslöser, eine Autorenzeile wird nicht
  erwähnt. **(unbestätigt)** Einfach prüfen: Link im Safari-Privatfenster ohne Anmeldung öffnen.
- **Bleibt er gültig?** Es gibt keine Frist in der Doku. Im März 2021 funktionierten ältere Links
  plötzlich nicht mehr, Apple stellte sie später wieder her (MacRumors). Einzelfall, aber ein Beleg,
  dass man kein Dauerversprechen hat. Beenden kann man das Teilen nur selbst: Link in Kurzbefehle
  öffnen, Menü, „Teilen beenden“. Dann ist er tot.
- **Aktualisiert sich der Link beim Bearbeiten?** Apple sagt dazu nichts. Eine Antwort in der Apple
  Community sagt: nein, man muss erneut „iCloud-Link kopieren“ wählen. **(unbestätigt)** Wer den
  Kurzbefehl schon hat, bekommt **nie** automatisch eine neue Version. Er muss ihn neu holen.
- **Folge:** Link-Adresse als Konfigurationswert der App führen, damit man sie an einer Stelle
  tauschen kann, wenn der Kurzbefehl neu geteilt wird.
- **Warnung:** Im Entwicklerforum (Juli 2024, ohne Antwort) steht: Öffnet man einen iCloud-Link aus
  einer App heraus, fehlen die Importfragen, es erscheint nur „Hinzufügen“. In Mail erscheinen sie.
  Für uns relevant, falls wir Importfragen nutzen: den Weg aus der PWA testen.

### 1b. Signierte Datei

- **Am iPhone/iPad:** Teilen, Optionen, „Datei“, dann „Anyone“ (jeder kann ihn ausführen, Apple
  bekommt zur Prüfung eine Kopie) oder „People Who Know Me“ (nur wer die Autorin in den Kontakten
  hat, Kontaktdaten stecken in der Datei). Das gilt für Fremde nur für „Anyone“. (Apple-Hilfe)
- **Am Mac:** `shortcuts sign --mode anyone|people-who-know-me --input X.shortcut --output Y.shortcut`.
  Apples Beispiel nutzt `people-who-know-me`. Auch hier erhält Apple eine Kopie zur Prüfung.
- **Probleme:** Ein Blogeintrag (macOS 14.6) berichtet: handgebaute Dateien werden abgelehnt, eine
  echte Datei bricht mit „you must be signed into iCloud“ ab, auch bei angemeldetem Konto.
  **(unbestätigt, ein Einzelfall)** Im Entwicklerforum gibt es einen Thread „Can't get shortcuts sign
  to work“. Die Signatur ist an Apples Server gebunden, wir könnten sie also nicht automatisch pro
  Familie erzeugen.
- **Öffnen im Browser:** Aus der Datei öffnet iOS laut MacStories eine Vorschau (Quick Look). Ob
  Safari ein von unserer Domain geladenes `.shortcut` direkt an Kurzbefehle übergibt, steht in keiner
  Quelle. Auch zum MIME-Typ fand sich nichts. **(ungeprüft)**
- **Fazit:** Nur sinnvoll als Notlösung. Der iCloud-Link ist einfacher und von Apple gedacht.

### 1c. `shortcuts://`-Adressen

Apple dokumentiert (Stand der Prüfung): `shortcuts://`, `shortcuts://create-shortcut`,
`shortcuts://open-shortcut?name=…`, `shortcuts://run-shortcut?name=…&input=…&text=…`.
Eine Seite in der Community nennt außerdem `shortcuts://import-shortcut?url=…&name=…` (optional
`silent=true`), das ist bei Apple nicht zu finden. Ein Entwickler meldete, nur iCloud-Adressen
seien akzeptiert worden, eigene HTTP- und HTTPS-Adressen nicht. **(beides unbestätigt)**
`run-shortcut` ist nützlich, nachdem der Kurzbefehl installiert ist: Die App kann einen Knopf
„Kurzbefehl starten“ zeigen (nur über den Namen, der Name darf sich nie ändern).

### 1d. Grenzen bei fremden Kurzbefehlen (2026)

- Die alte Option „Nicht vertrauenswürdige Kurzbefehle erlauben“ taucht auf Apples Seite zu iOS 26
  nicht mehr auf. Dort steht nur „Skripte erlauben“ (Einstellungen > Kurzbefehle > Erweitert), nötig
  für Kurzbefehle mit JavaScript. Unsere Kurzbefehle brauchen das nicht. **(unbestätigt, ob der alte
  Schalter überall weg ist)**
- Seit iOS 15 fragt Kurzbefehle beim ersten Zugriff auf Daten oder Apps um Erlaubnis, mit Vorschau
  der Daten und „Einmal erlauben“. Eltern sehen also Rückfragen (z. B. Fotos). Das muss die
  Anleitung vorwegnehmen.
- Ab iOS 27 sind **Automationen** in geteilten Kurzbefehlen möglich, aber nach der Installation
  **ausgeschaltet**. Für uns egal, wir nutzen keine.
- Ein Kurzbefehl, der in einer neueren Kurzbefehle-Version gebaut wurde, lässt sich auf älteren
  Geräten nicht öffnen (Fehlermeldung). Der Link sollte also mit einer nicht zu neuen Aktion
  gebaut werden, oder die Anleitung nennt die Mindestversion.

## 2. Kann Apple Intelligence einen Kurzbefehl aus einer Beschreibung bauen?

- **iOS/iPadOS/macOS 26: nein.** Die 26er bringen nur neue Aktionen („Modell verwenden“, „Bild
  erstellen“ …), die man von Hand zusammensteckt. Einzelne Blogs behaupten anderes, Apples Seiten
  nicht.
- **iOS/iPadOS/macOS 27: ja.** Laut Apple („New in iOS … 27“, veröffentlicht 26. 10. 2026) kann man
  Kurzbefehle per natürlicher Sprache erstellen. Es steht auf der Apple-Seite als Apple-Intelligence-
  Funktion, Voraussetzung ist ein Gerät mit Apple Intelligence und eine unterstützte Sprache
  (Deutsch ist dabei). In der Kurzbefehle-App heißt das „Describe a Shortcut“, und es ist der
  Standard-Startbildschirm für neue Kurzbefehle. Man kann danach auch Änderungen beschreiben.
- **Qualität (MacStories, iOS-27-Test):** gut für einfache bis mittlere Kurzbefehle, etwa 15
  Sekunden, nicht für sehr große. Es kann keine Kurzbefehle für Apps von Drittanbietern bauen und
  keine fremde Web-API recherchieren. MacRumors nennt es eine Beta, „nicht immer perfekt“.
- **EU:** Apple schreibt, „Siri AI“ sei zunächst nicht in der EU verfügbar. Ob das auch für die
  Beschreibungs-Funktion gilt, ist nicht klar. **(unbestätigt)** Für unsere Familien in
  Deutschland wichtig, vor jeder Zusage prüfen.
- **Was das für uns heißt:** Ein Textbaustein „Baue mir einen Kurzbefehl, der …“ aus unserer App
  könnte auf iOS 27 funktionieren, ist aber nicht reproduzierbar (Aktionen, Stil, Parameter können
  abweichen) und läuft nicht auf iOS 26. **Ein offizielles Austauschformat als Text gibt es nicht.**
  Die Datei ist ein Plist, das Apple signiert haben will, siehe 1b.
- **Sinnvoll als Zusatz:** Eine Anleitung „So baust du ihn selbst nach“ in 8 bis 10 Schritten, mit
  Bildschirmfotos, als Notlösung, wenn der Link nicht mehr geht.

## 3. Importfragen und Stil-Auswahl

- **Was es ist (Apple-Hilfe):** Man öffnet den Kurzbefehl, Reiter „Setup“, „Neue Frage hinzufügen“,
  wählt einen Parameter und schreibt den Fragetext, optional eine Standardantwort. Beim Teilen wird
  das Feld des Autors geleert. Wer den Kurzbefehl holt, wird der Reihe nach gefragt. Beliebig viele
  Fragen. Im Setup-Reiter kann man die Antworten später ändern (MacStories).
- **Offen:** Apple sagt nicht, welche Parameter sich verknüpfen lassen. Ob die Aktion „Bild
  erstellen“ (Stil, Eingabebild) und ein Header-Wert angebunden werden können, muss man ausprobieren.
  Im Juli 2025 meldete jemand bei AppleVis, dass die Frage im Setup nicht angezeigt wird (Mac und
  iPhone, ohne Lösung). Auch MacSparky nennt Fehler am Mac. **(unbestätigt, Stand unklar für iOS 27)**
- **Testen:** Beim Testen überschreibt man die eigene Konfiguration (Apple-Hilfe).

|                             | Ein Kurzbefehl mit „Aus Menü auswählen“ bei jedem Lauf                | Mehrere Kurzbefehle (einer je Stil/Thema)              |
| --------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------ |
| Eltern                      | ein Eintrag in der Mediathek, ein Tippen mehr pro Lauf                | mehrere Einträge, kein Menü, schneller                 |
| Neue Themen (Weihnachten …) | nur über einen **neuen Link**, alle müssen neu holen und alte löschen | neue Karte in der App, alte bleiben unberührt          |
| Pflege                      | ein Stück Code, Menü wächst                                           | jeder Kurzbefehl klein, ein Fehler trifft nur ihn      |
| Fehlerquellen               | Verzweigungen, Menü-Reihenfolge                                       | mehr Links zu verwalten                                |
| Teilen-Menü                 | ein Eintrag                                                           | mehrere Einträge, Namen nötig (z. B. „Weihnachtsbild“) |

**Einschätzung:** Mehrere Kurzbefehle. Saisonale Themen sind sowieso zeitlich begrenzt und kommen
ohne Eingriff beim Rest dazu. Ein Menü nur für den Grundstil (Animation, Illustration, Skizze) ist
okay, wenn es in einen Kurzbefehl passt. Es gilt dasselbe für die Importfrage nach Stil.

## 4. Teilen-Menü und Abgleich zwischen Mac, iPhone und iPad

- **So erscheint er (Apple-Hilfe):** Im Editor „Details“, „Im Share Sheet zeigen“. Es entsteht am
  Anfang eine Aktion, die festlegt, welche Eingabe der Kurzbefehl annimmt. Im Teilen-Menü einer App
  (Bild markieren, Teilen) die Liste nach unten scrollen und den Kurzbefehl antippen. Er erscheint nur,
  wenn der Inhalt zu den erlaubten Eingabetypen passt. Für Fotos also „Bilder“.
- **Speicher:** Ein Kurzbefehl aus dem Teilen-Menü hat wenig Arbeitsspeicher und kann bei großen
  Daten abbrechen (Community, nicht in Apples Seite). **(unbestätigt)** Das Cartoon-Bild ist beim
  Erzeugen laut unserem Test 1536 × 1536 Pixel, rund 3,4 MB als PNG. Vor dem Upload verkleinern.
- **Abgleich:** Voraussetzung ist die Anmeldung mit demselben Apple-Konto und **iCloud-Synchronisierung
  in den Kurzbefehle-Einstellungen**: auf dem iPhone/iPad unter Einstellungen > Kurzbefehle, am Mac
  in der App unter Kurzbefehle > Einstellungen > Allgemein. Hinzugefügte, geänderte und gelöschte
  Kurzbefehle werden automatisch gespiegelt. Persönliche Automationen werden nicht mitgenommen.
- **Warum der Mac-Kurzbefehl im iPad-Teilen-Menü auftauchte (Schluss, nicht bestätigt):** Der Schalter
  „Im Share Sheet zeigen“ samt Eingabetypen ist Teil des Kurzbefehls und wird mit ihm synchronisiert.
  Am Mac war er schon an, oder die Aktion „Eingabe vom Share Sheet“ war mit „Bilder“ im Kurzbefehl.
  Auf dem iPad erscheint er dann ohne weiteres Zutun, sobald ein Bild geteilt wird. „Irgendwie“ ist
  also iCloud-Sync plus ein im Kurzbefehl gespeicherter Schalter.
- **Fallen:** Auf dem iPad fehlen Kurzbefehle manchmal im Teilen-Menü, auch bei eingeschaltetem
  Schalter (Apple-Community-Thread, ohne verlässliche Lösung). Die Aktion „Bild erstellen“ läuft
  nur auf Geräten mit Apple Intelligence (iPad mit M1 oder neuer, iPad mini mit A17 Pro).

## 5. Direkt hochladen aus dem Kurzbefehl

- **Geht es?** Ja, nach allem, was dokumentiert ist. Apple: „Inhalt von URL abrufen“ mit POST, PUT
  oder PATCH hat einen Anfragetext (Request Body) als JSON, Formular oder Datei. Die Apple-Seite
  sagt nichts zu Headern. Ein IndieWeb-Beispiel macht es genau so: POST, Header
  `Authorization: Bearer …`, Body „Formular“, Feld `file` mit der Eingabe des Kurzbefehls. In der
  Praxis wird bei einer Datei im Formular `multipart/form-data` gesendet.
- **Aber:** Es gibt Forenmeldungen zu Fehlern bei POST mit Datei oder JSON und zu Headern, die nicht
  wirken. Die Fälle sind alt, ohne bestätigte Ursache. **(unbestätigt, auf iOS 26/27 zu testen)**
- **Rückfrage:** Beim ersten Mal fragt Kurzbefehle wohl um Erlaubnis, Daten an die Adresse zu
  senden (iOS-15-Datenschutzabfragen). Ob und wie oft, ist nicht dokumentiert.
- **Wichtig, Schlüssel:** Der Familienschlüssel darf nicht im geteilten Kurzbefehl stehen. Apple
  bekommt den Inhalt, und jeder mit dem Link liest ihn. Auswege: (a) Importfrage für den
  Header-Wert (geht das? zu testen), (b) „Nach Eingabe fragen“ bei jedem Lauf, (c) ein kurzer
  einmaliger Code aus dem Elternbereich, der nur das Hochladen erlaubt und sich widerrufen lässt. Wir
  sollten nicht den Hauptschlüssel verwenden.
- **Serverseite:** `POST` mit `multipart/form-data` und `Authorization` an einen eigenen Endpunkt, der
  das Bild verkleinert (WebP, siehe Größen im anderen Dokument). Keine CORS-Regeln nötig, weil es
  kein Browser ist.
- **Ohne Upload:** Der Kurzbefehl endet mit „Bild sichern“ (Fotos oder Dateien). Die Eltern laden es
  wie bisher in der App hoch. Weniger Technik, aber ein Schritt mehr.

## 6. Empfehlung

1. **Verteilen per iCloud-Link.** Im Elternbereich eine Karte pro Kurzbefehl: Titel, Beispielbild,
   Knopf „Kurzbefehl holen“ (der Link), darunter drei Schritte: Link öffnen, „Kurzbefehl holen“,
   beim ersten Start Rückfragen mit „Erlauben“ beantworten. Hinweis: Apple Intelligence nötig, und
   dass ein Bild geteilt wird, bevor der Kurzbefehl läuft.
2. **Links in der App-Konfiguration** halten, nicht im Text. Bei jeder Änderung neu teilen und den
   Link tauschen. Wer ihn schon hat, bekommt keine neue Version, deshalb Versionsnamen nur in der
   Karte, nicht im Kurzbefehl.
3. **Themen als eigene Kurzbefehle.** Basis-Kurzbefehl zuerst, Weihnachten, Ostern, Halloween später
   als weitere Karten. Gleiche Schritte, nur der Text („prompt“) und der Stil unterscheiden sich.
4. **Version 1 ohne Upload,** damit kein Schlüssel im Spiel ist. **Version 2 mit Upload** über einen
   nur zum Hochladen berechtigten Code, den die Eltern als Importfrage oder per Eingabe abgeben.
5. **Nicht tun:** eigenes `.shortcut` hosten, `import-shortcut` verwenden oder den Kurzbefehl nur
   per „Beschreibung“ weitergeben.
6. **Datenschutz:** Der Link ist kein Geheimnis (jeder mit der Adresse kann ihn öffnen, Apple hat
   eine Kopie). Keine Namen, Adressen oder Schlüssel in den Kurzbefehl. Die Karten sollen das nicht
   verschweigen.

### Was als Nächstes getestet werden sollte (30 bis 60 Minuten)

Link im Privatfenster öffnen (Vorschau, Autorenname?). Link aus der installierten PWA tippen (öffnet
Kurzbefehle, Importfragen?). Importfrage an Stil und an den `Authorization`-Header. Neu teilen: gilt
der alte Link weiter? POST mit Datei an einen Testendpunkt auf iOS 26 und 27. Ein Gerät ohne Apple
Intelligence: welche Fehlermeldung kommt?

## Quellen

- Apple, Kurzbefehle: Share shortcuts: <https://support.apple.com/guide/shortcuts/apdf01f8c054/ios>
- Apple, `shortcuts sign`: <https://support.apple.com/guide/shortcuts-mac/apd455c82f02/mac>
- Apple, „Shortcuts Sharing & Privacy“: <https://apple.com/legal/privacy/data/en/shortcuts-sharing>
- Apple, URL-Schemata: <https://support.apple.com/guide/shortcuts/apda283236d7/ios> und
  <https://support.apple.com/guide/shortcuts/apd624386f42/ios>
- Apple, Importfragen: <https://support.apple.com/guide/shortcuts/apdf330fd3a0/ios>
- Apple, Skripte erlauben (iOS 26): <https://support.apple.com/guide/shortcuts/apdfeb05586f/ios>
- Apple, Share Sheet: <https://support.apple.com/guide/shortcuts/apd163eb9f95/ios>
- Apple, Synchronisieren: <https://support.apple.com/guide/shortcuts/apdb3a4240b0/ios>
- Apple, erste API („Request Body“): <https://support.apple.com/guide/shortcuts/apd58d46713f/ios>
- Apple, „New in iOS, iPadOS, macOS, watchOS, and visionOS 27“: <https://support.apple.com/en-us/149045>
- MacStories, iOS-27-Test, Kurzbefehle: <https://www.macstories.net/stories/ios-and-ipados-27-review/13/>
- MacStories, iOS-15-Test (Teilen, Datenschutz, Setup): <https://macstories.net/stories/ios-and-ipados-15-the-macstories-review/12>
- MacRumors, iOS 27 Shortcuts: <https://www.macrumors.com/guide/ios-27-shortcuts/> und
  <https://www.macrumors.com/2026/06/08/apple-brings-natural-language-to-shortcuts/>
- MacRumors, Link-Ausfall 2021: <https://www.macrumors.com/2021/03/25/apple-fixes-icloud-shortcut-links/>
- Apple Community, Link nach Änderung: <https://discussions.apple.com/thread/256071581>
- Apple Community, Kurzbefehle fehlt im Teilen-Menü: <https://discussions.apple.com/thread/254821741>
- Apple Developer Forums, `shortcuts sign`: <https://developer.apple.com/forums/thread/728447>
- Apple Developer Forums, iCloud-Link aus App ohne Importfragen: <https://developer.apple.com/forums/thread/759049>
- Entwickler-Blog zu Import und Signatur (Einzelfall): <https://dev.to/eugeniya_ivanova_4a58eadc/i-tried-to-build-an-apple-shortcut-from-code-apple-said-no-four-times-4l5d>
- Community-Referenz `import-shortcut`: <https://www.github.com/sebj/iOS-Shortcuts-Reference>
- AppleVis, Importfragen-Fehler 2025: <https://www.applevis.com/comment/192531> (nur Suchtreffer, Seite nicht abrufbar)
- IndieWeb, Upload per Kurzbefehl: <https://indieweb.org/Shortcut>
