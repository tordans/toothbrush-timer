# Belohnungsbilder aus Familienfotos mit Apple Intelligence – Machbarkeit

Stand: 7. November 2026. Nur Recherche und Tests, nichts davon ist in die App eingebaut.

## Ergebnis in Kürze

**Es geht teilweise, und das auch nur auf Zeit.**

- **Heute auf diesem Mac (macOS 26.6.2) geht es.** Ein kleines Swift-Programm erzeugt aus einem
  Bild über `ImageCreator` ohne Klicken ein Cartoon-Bild, auf dem Gerät selbst. Getestet: 1536 ×
  1536 Pixel, 8 bis 43 Sekunden pro Bild. Das Programm muss eine echte `.app` sein und im
  Vordergrund laufen. Ein reines Kommandozeilen-Tool bekommt `backgroundCreationForbidden`.
- **Mit macOS 27 hört es auf.** Apple stellt `ImageCreator` ein. Laut Apples Hinweis vom 11. Juni 2026 funktioniert es unter macOS 27 nicht mehr. Danach gibt es nur noch das
  Image-Playground-Fenster, also einen Klick pro Bild. Laut WWDC26 läuft das neue Image Playground
  außerdem auf Private Cloud Compute, also nicht mehr nur auf dem Gerät.
- **Fotos mit Menschen sind nicht getestet** (dafür hätte ich die Fotomediathek öffnen müssen).
  Die Schnittstelle kennt Fehler wie `faceInImageTooSmall` und `conceptsRequirePersonIdentity`. Bei
  Gruppenfotos, kleinen Gesichtern oder Fotos ohne klares Gesicht ist also mit Ausfällen zu rechnen.
  Wie ähnlich das Kind dem Foto bleibt, muss ein Test mit echten Fotos zeigen.

Empfehlung, falls ihr es wollt: auf macOS 26 bleiben, einmal einen Vorrat für 2026 erzeugen und
die Ergebnisse von Hand aussuchen. Nicht darauf bauen, dass der Ablauf nach dem Update auf macOS 27
noch automatisch läuft.

## Die Fragen im Einzelnen

### 1. Image-Playground-Schnittstellen auf macOS – **teilweise**

| Teil                                                                                                         | Seit       | Status                                                    | Bedienung                                             |
| ------------------------------------------------------------------------------------------------------------ | ---------- | --------------------------------------------------------- | ----------------------------------------------------- |
| Framework `ImagePlayground`, `ImagePlaygroundConcept`                                                        | macOS 15.1 | aktiv                                                     | –                                                     |
| `imagePlaygroundSheet(…)` (SwiftUI), `ImagePlaygroundViewController` (AppKit)                                | macOS 15.1 | aktiv                                                     | Fenster, die Nutzerin oder der Nutzer klickt „Fertig“ |
| `ImageCreator` (ohne Oberfläche)                                                                             | macOS 15.4 | in macOS 27 abgekündigt, **funktioniert dort nicht mehr** | rein im Programm                                      |
| `ImagePlaygroundStyle.externalProvider` (z. B. ChatGPT)                                                      | macOS 26.0 | aktiv                                                     | Cloud, nur wenn in den Einstellungen eingerichtet     |
| `ImagePlaygroundOptions` (Variety, Personalization)                                                          | macOS 26.4 | aktiv                                                     | –                                                     |
| `ImagePlaygroundOptions.creationStrategy` (`editExisting` / `generateNew`), `sizeSpecification`, Stil `.any` | macOS 27.0 | neu                                                       | –                                                     |

Geprüft in der Swift-Schnittstelle des macOS-27-SDK (Xcode 27.0 auf diesem Mac) und in Apples
Dokumentation.

- **Foto als Vorlage: ja.** `ImageCreator.images(for:style:limit:)` nimmt Konzepte entgegen:
  `.text(_)`, `.extracted(from:title:)`, `.drawing(_)`, `.image(_ CGImage)` und `.image(_ URL)`.
  Getestet: Ein Bild als einziges Konzept ergibt ein neues Bild, das Motiv, Farben und Haltung
  übernimmt. Das Fenster nimmt zusätzlich `sourceImage` oder `sourceImageURL` an.
- **Stile:** `animation` (3D, Pixar-artig), `illustration` (2D), `sketch`, `emoji`; ab macOS 26
  `externalProvider` (ChatGPT), ab 27 `any`. `ImageCreator.availableStyles` meldet auf diesem Mac:
  `animation`, `emoji`, `illustration`, `sketch`, `messages-background`. ChatGPT ist für
  `ImageCreator` also nicht verfügbar. Für „lustig, cartoonartig“ passen `animation` oder
  `illustration`.
- **Grenzen:** höchstens 4 Bilder pro Aufruf (`limit`). Feste Ratenlimits sind nicht dokumentiert.
  Fehlerfälle: `notSupported`, `unavailable`, `creationCancelled`, `faceInImageTooSmall`,
  `unsupportedLanguage`, `unsupportedInputImage`, `backgroundCreationForbidden`, `creationFailed`,
  `conceptsRequirePersonIdentity` (ab 26.0).
- **Verfügbarkeit prüfen:** `try await ImageCreator()` wirft einen Fehler, wenn es nicht geht.
  SwiftUI bietet `@Environment(\.supportsImagePlayground)`, AppKit
  `ImagePlaygroundViewController.isAvailable`.
- **Menschen und Kinder:** Laut Dokumentation verlangt `conceptsRequirePersonIdentity` ein
  Quellbild mit dem Gesicht einer Person, wenn der Text einen Menschen beschreibt. Im Test kam der
  Fehler schon bei „a happy fox brushing its teeth“ und bei einem vermenschlichten Fuchsbild mit
  Zusatztext. Das Modell ist dabei also recht empfindlich. Eine Aussage von Apple speziell zu
  Kindern habe ich nicht gefunden. Bis macOS 26 erzeugt Image Playground keine Fotos, nur Stile
  wie Animation oder Illustration. Gesichter werden also immer in einen Stil übersetzt. Ab
  macOS 27 kann das neue Modell laut WWDC26 auch fotorealistisch.
- **Auf dem Gerät:** `ImageCreator` nutzt laut Apples Hinweis „das Bildmodell auf dem Gerät“. Auf
  macOS 26 läuft nur der ChatGPT-Stil in der Cloud. Laut WWDC26 (Session 375) läuft das neue Image
  Playground in iOS/macOS 27 auf Private Cloud Compute, mit Nutzungsgrenze und mehr Kontingent für
  iCloud+.

### 2. Kurzbefehle – **teilweise (vielversprechend, nicht getestet)**

Auf diesem Mac gibt es die Aktion **„Bild erstellen“ / „Create Image“**. Ihre Metadaten liegen in
`ImagePlaygroundInternal.framework`. Parameter laut diesen Metadaten:

- `prompt` (Beschreibung, optional)
- `style` (Stil, Pflicht, Auswahl aus den Image-Playground-Stilen)
- `image` (Eingabebild, optional)
- `saveToLibrary` („In Playground sichern“: Immer / Beim Ausführen fragen / Nie)
- Ausgabe: das Bild. `openAppWhenRun = false`, die App öffnet sich also nicht.

Eine Schleife „Fotos suchen → Wiederhole mit jedem → Bild erstellen → Datei sichern“ ist damit
denkbar, ganz ohne eigenen Code. **Nicht geprüft:** ob die Aktion im Hintergrund oder über
`shortcuts run` läuft (ein Kommandozeilenprogramm wird bei `ImageCreator` abgewiesen), ob sie pro
Bild nachfragt, welches Modell sie unter macOS 27 nutzt, und ob „Fotos suchen“ nach Favorit und
Aufnahmedatum filtern kann. Laut Apple-Hilfe gibt es Filter, die Favoriten-Bedingung habe ich in
keiner Quelle bestätigt gesehen. Ein Test dauert in der Kurzbefehle-App etwa zehn Minuten.

### 3. Zugriff auf die Fotomediathek – **ja**

Drei Wege:

1. **PhotoKit** in einer kleinen Swift-App:
   ```swift
   let opts = PHFetchOptions()
   opts.predicate = NSPredicate(format: "favorite == YES AND creationDate >= %@ AND creationDate < %@",
                                start as NSDate, end as NSDate)
   let assets = PHAsset.fetchAssets(with: .image, options: opts)
   ```
   Laut Entwicklerforum funktioniert der Schlüssel `favorite`, `isFavorite` nicht. Sicherer ist,
   nur nach Datum zu filtern und `asset.isFavorite` im Code zu prüfen. Originale aus iCloud
   („Mac-Speicher optimieren“) lädt `PHAssetResourceManager` mit `isNetworkAccessAllowed = true`.
   Rechte: `PHPhotoLibrary.requestAuthorization(for: .readOnly/.readWrite)` und
   `NSPhotoLibraryUsageDescription` in der `Info.plist`. Als `.app` bekommt das Programm einen
   eigenen Eintrag unter Datenschutz → Fotos. Ein nacktes Kommandozeilen-Tool würde dem Terminal
   zugerechnet oder gar nicht gefragt.
2. **osxphotos** (Open Source, Version 0.78.0, unterstützt macOS 26 mit dem Vermerk „limited
   testing“):
   ```bash
   uv tool install osxphotos
   osxphotos export ~/Bilder/zahnputz-input --favorite --from-date 2026-01-01 --to-date 2026-12-31 --download-missing --convert-to-jpeg
   ```
   `--favorite` vor dem ersten Lauf mit `osxphotos help export` prüfen. `--download-missing`
   steuert die Fotos-App per AppleScript und gilt als wackelig. Rechte: Zugriff auf Fotos für das
   Terminal.
3. **Kurzbefehl „Fotos suchen“:** Die Filter für Favorit und Datum sind auf dem Mac zu prüfen,
   siehe oben.

Ausgaben als PNG in einen Ordner zu schreiben braucht kein Fotos-Recht. Zurück in ein Album zu
schreiben ginge mit `PHAssetCreationRequest`, ist hier aber nicht nötig.

### 4. Empfohlener Ablauf

```
osxphotos export (Favoriten 2026) ──► ~/Bilder/zahnputz-input/*.jpg
                                              │
            kleine Swift-App „Waldbilder.app“ (Fenster im Vordergrund)
              für jede neue Datei: ImageCreator
                concepts: [.image(url)]   (+ evtl. .text("im Wald"))
                style: .animation oder .illustration, limit: 2–4
                                              │
                         ~/Bilder/zahnputz-output/<foto-id>-<n>.png
                         + verkleinerte WebP-Fassung (768 px)
                                              │
                         Eltern sehen durch und wählen aus
```

- **Was noch von Hand bleibt:** den Export starten, die App starten und im Vordergrund lassen (nicht
  minimieren, Mac nicht sperren), danach die Ergebnisse durchsehen und gute auswählen.
- **Dauer:** im Test 8 bis 10 Sekunden pro Bild aus Text oder Landschaft. Das erste Bild mit einem
  Bild als Vorlage brauchte 43 Sekunden (vermutlich Laden des Modells). Für 50 Favoriten mit je 2
  Varianten also grob 15 bis 40 Minuten.
- **Neue Favoriten:** Export und App erneut starten. Die App überspringt Fotos, zu denen es schon
  eine Ausgabe gibt (Dateiname = Foto-ID). osxphotos hat dafür `--update`.
- **Zeitfenster:** Funktioniert nur bis zum Update auf macOS 27. Das Xcode-27-SDK kompiliert den
  Code heute noch mit Warnung, für Ziel macOS 26.
- **Variante ohne osxphotos:** PhotoKit direkt in derselben App. Ein Programm, ein Rechte-Dialog,
  aber mehr Code.

Die Testprogramme liegen in diesem Ordner (nur Text, keine Fotos):
`/private/tmp/claude-501/-Users-tordans-Development-PRIVAT-zahnputtimer/92d955d7-7d04-4bf3-b210-ae4d5fbeb3e0/scratchpad/iptest/`.
Er ist temporär und verschwindet irgendwann.

### 5. Dieser Mac – **ja, alles vorhanden**

| Prüfung                                               | Ergebnis                                                               |
| ----------------------------------------------------- | ---------------------------------------------------------------------- |
| macOS                                                 | 26.6.2 (25G83)                                                         |
| Chip                                                  | Apple M4, 24 GB Arbeitsspeicher                                        |
| Apple Intelligence                                    | aktiv (`com.apple.CloudSubscriptionFeatures.optIn`: `auto_opt_in = 1`) |
| Image Playground                                      | `/System/Applications/Image Playground.app` vorhanden                  |
| Xcode / Swift                                         | Xcode 27.0, Swift 6.4, SDK macOS 27.0                                  |
| `ImageCreator` aus Kommandozeilen-Tool                | Start klappt, Erzeugen: `backgroundCreationForbidden`                  |
| …aus Kommandozeilen-Tool mit eigenem Fenster          | ebenfalls `backgroundCreationForbidden`                                |
| …aus signierter `.app` (ad hoc), gestartet mit `open` | **klappt**: 1536 × 1536 PNG, 8,4 s, etwa 3,4 MB                        |
| Bild als Vorlage (Fuchs-Bild, Landschaft)             | klappt, 43 s bzw. 9,8 s                                                |
| Text, der einen Menschen andeutet                     | `conceptsRequirePersonIdentity`                                        |
| osxphotos                                             | nicht installiert                                                      |

Es wurde nichts an den Einstellungen geändert und die Fotomediathek nicht geöffnet.

### 6. Wie das in die App passt – **Optionen, keine Entscheidung**

Die App verzichtet bewusst auf Punkte, Sticker, Alben und Freischaltungen. Ein Bild darf daher
nicht zur Währung oder Sammlung werden.

**Wann ein Bild erscheint**

- **A. Bild der Woche:** Wenn die Woche vorbei ist (oder alle Lichtungen gefüllt sind), steht am
  Ende des Waldwegs ein Bild. Beim Zurückblättern zu früheren Wochen ist es weiter da, als Teil
  dieser Woche, nicht als Album.
- **B. Ohne Bedingung:** Das Bild gehört einfach zur Woche, egal wie oft geputzt wurde. Ganz ruhig,
  aber dann ist es keine Belohnung mehr.
- **C. Von Hand:** Die Eltern geben im Elternbereich ein Bild frei, wann sie wollen.

In keinem Fall Ankündigungen wie „Noch 2 Mal bis zum Bild“, das wäre wieder ein Zähler.

**Wie die Bilder auf die Telefone kommen**

| Weg                                                                                                                                                         | Datenschutz                                                                                                                                       | Aufwand                                                                    |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Im Build mitliefern (`public/`)                                                                                                                             | **nein**: alles in `public/` ist für jeden mit der Adresse abrufbar und landet im Repo                                                            | klein                                                                      |
| Auf den all-inkl-Server, **außerhalb** von `public/`, ausgeliefert von der PHP-API nur mit Familienschlüssel (`Authorization: Bearer`), so wie `/api/state` | Bilder liegen beim Hoster, aber nur mit Schlüssel erreichbar. Nicht in den Zustand (`state` ist auf 256 KiB begrenzt), sondern als eigene Dateien | mittel: Upload-Weg (FTP von Hand oder Endpunkt) und ein Endpunkt zum Lesen |
| Nur auf dem Gerät: Eltern wählen Bilder im Elternbereich aus, die App speichert sie in IndexedDB                                                            | nichts verlässt das Telefon                                                                                                                       | pro Telefon einzeln, kein Abgleich                                         |
| Gar nicht in die App: ausdrucken oder am Mac zeigen                                                                                                         | am privatesten                                                                                                                                    | keiner                                                                     |

**Dateigrößen** (gemessen am Testbild): PNG 1536 px etwa 3,4 MB, JPEG 1024 px etwa 200 KB,
JPEG 768 px etwa 120 KB, **WebP 768 px etwa 35 KB**. WebP läuft in Chrome 87 und iOS 15. 52 Bilder
im Jahr sind als WebP also nur wenige Megabyte.

Auch als Cartoon bleiben die Bilder Familienfotos eines Kindes: kein Ort, der ohne Schlüssel
erreichbar ist, und nicht ins Git-Repo.

## Alternativen

1. **Kurzbefehl „Bild erstellen“ in einer Schleife:** kein Code, Stil und Eingabebild sind
   Parameter. Hintergrundverhalten und Verhalten unter macOS 27 sind ungeprüft. Der erste Versuch,
   wenn man keine App bauen will.
2. **Image-Playground-Fenster** (`imagePlaygroundSheet`) in einer kleinen App, die ein Foto nach dem
   anderen anbietet: ein Klick pro Bild, dafür weiter unterstützt. Unter macOS 27 aber
   wahrscheinlich über Private Cloud Compute.
3. **Image Playground App von Hand:** Foto hineinziehen, Stil wählen, sichern. Für 10 bis 20 Bilder
   im Jahr völlig ausreichend und ohne jede Technik.
4. **Andere lokale Bildmodelle** (z. B. Stable Diffusion mit Core ML): würden dauerhaft lokal und
   automatisch laufen, sind aber per Vorgabe ausgeschlossen („nur Apple Intelligence“).

## Offene Fragen

- Wie gut erkennt man die eigene Tochter wieder, und wie oft kommt `faceInImageTooSmall`? Braucht
  einen Test mit 5 bis 10 echten Favoriten, und dafür eure Freigabe für die Fotomediathek.
- Läuft „Bild erstellen“ in Kurzbefehlen in einer Schleife ohne Nachfrage, und über `shortcuts run`?
- Bleibt dieser Mac bis zur Erzeugung auf macOS 26? Ein Update auf 27 beendet den automatischen Weg.
- Ist Private Cloud Compute (macOS 27) für euch noch „lokal genug“? Es ist Apples eigener Dienst
  ohne Speicherung, aber nicht mehr auf dem Gerät.
- Welche Option für Zeitpunkt und Auslieferung (Abschnitt 6)?

## Quellen

- Apple Developer News, „Deprecation of the ImageCreator class“, 11. 6. 2026:
  <https://developer.apple.com/news/?id=dz9wvq0r>
- ImagePlayground-Dokumentation: <https://developer.apple.com/documentation/imageplayground>
- `ImageCreator`: <https://developer.apple.com/documentation/imageplayground/imagecreator>
- `images(for:style:limit:)` (höchstens 4 Bilder):
  <https://developer.apple.com/documentation/imageplayground/imagecreator/images(for:style:limit:)>
- `ImageCreator.Error`: <https://developer.apple.com/documentation/imageplayground/imagecreator/error>
- `ImagePlaygroundConcept`: <https://developer.apple.com/documentation/imageplayground/imageplaygroundconcept>
- `ImagePlaygroundStyle`: <https://developer.apple.com/documentation/imageplayground/imageplaygroundstyle>
- `ImagePlaygroundOptions`: <https://developer.apple.com/documentation/imageplayground/imageplaygroundoptions>
- `supportsImagePlayground`:
  <https://developer.apple.com/documentation/swiftui/environmentvalues/supportsimageplayground>
- WWDC26 Session 375, „Create high-quality images using Image Playground“ (Private Cloud Compute,
  Personalisierung): <https://developer.apple.com/videos/play/wwdc2026/375/>
- Swift-Schnittstelle im SDK: `MacOSX.sdk/System/Library/Frameworks/ImagePlayground.framework/…/arm64e-apple-macos.swiftinterface` (Xcode 27.0)
- Metadaten der Kurzbefehl-Aktion: `/System/Library/PrivateFrameworks/ImagePlaygroundInternal.framework/Resources/Metadata.appintents/extract.actionsdata`
- Kurzbefehle-Hilfe, „Fotos suchen“: <https://support.apple.com/guide/shortcuts-mac/apdbdab3433f/mac>
- Kurzbefehle-Hilfe, Apple-Intelligence-Aktionen: <https://support.apple.com/guide/shortcuts-mac/mchl91750563/mac>
- Entwicklerforum, PhotoKit-Prädikat `favorite`: <https://developer.apple.com/forums/thread/781180>
- Entwicklerforum, Fotos-Rechte auf macOS: <https://developer.apple.com/forums/thread/749286>
- Entwicklerforum, ChatGPT-Stil in der Cloud: <https://developer.apple.com/forums/thread/809194>
- osxphotos: <https://github.com/RhetTbull/osxphotos>, <https://pypi.org/project/osxphotos/>
- Eigene Tests auf diesem Mac am 7. 11. 2026 (siehe Abschnitt 5).
