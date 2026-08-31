# Nova_A 6.2.0 – Vollständiges Handbuch

## 6.2.0 Verhaltensverträge

Öffne ein Rhai-Asset unter **Skript → Script Studio → Vertrag**. Bestehende Skripte brauchen keine Änderung. **Vertragskopf hinzufügen** fügt einen strikten, deterministischen Kopf mit begrenzten Befehlen und Logs ein. Ergänze bei Bedarf `// @requires component RigidBody2D`, `// @requires input Jump`, `// @requires asset Assets/Prefabs/Ball.nova-prefab` oder `// @requires package top.whitelists.example`.

Die Vertragsseite zeigt für API-Aufrufe Modul, Thread-Regel, Determinismus und Berechtigungen. Deterministische Verträge dürfen die hostabhängigen Rohdaten `mouse_x`, `mouse_y`, `wheel_x` und `wheel_y` nicht verwenden. Budgets gelten pro Callback und können die globalen Grenzen nur verkleinern.

Beim Start prüft Nova_A Objektkomponenten, Input Map, Asset-Datenbank und aktivierte Projektpakete. Derselbe Fehler erscheint in **Verwalten → Projektzustand** und **Build-Einstellungen**. Behebe die genannte Voraussetzung, speichere und starte erneut. Visual Graph und verknüpftes Rhai bleiben synchron; Project Format 2/Schema 29 bleibt unverändert.

## 6.1.0: Portabler Arbeitsordner und reaktionsschneller Editor

Nach dem Verschieben auf ein anderes Laufwerk einmal `pnpm install --frozen-lockfile` ausführen, damit pnpm ortsabhängige Links neu erstellt. Build-, WASM-, Tauri-, Export- und Release-Pfade sind relativ zum Repository. Der Desktop-Editor startet maximiert, bleibt aber ein normales, dekoriertes und frei skalierbares Fenster. Das Balanced-Profil bündelt schnelle Zeigerereignisse pro Anzeigebild und verwendet standardmäßig die Profiler-Einstellung **Low overhead**; **Full** bleibt jederzeit verfügbar. Keine Funktion oder Animation wurde entfernt.

## 6.0.4: Verknüpfte Logik und Build trotz Dateisperre

Öffne ein `.nova-graph`, wähle **Erzeugtes Rhai** und dann **Verknüpftes Rhai erstellen / aktualisieren**. Das Speichern des Graphen aktualisiert den verknüpften Text; das Speichern dieses Textes im Script Studio aktualisiert Knoten und Werte. Quelltext ohne Standardknoten bleibt in einem sichtbaren Code-Knoten erhalten. Unabhängige Rhai-Dateien bleiben unabhängig.

Ein Windows-Build wird vollständig zwischengespeichert und geprüft. Läuft die ältere exportierte `.exe` noch, bleibt sie aktiv und der neue Build erhält einen Build-ID-Suffix statt mit Fehler 5 abzubrechen. **Einstellungen → Leistungsprofile → Low-end** reduziert nur redundante Arbeit im Editor; Inhalte, Exportqualität, Funktionen und Animationen bleiben erhalten.

<!-- NOVA_V601_MOUSE_KNOCKOUT_START -->

## Nova_A 6.0.1 — Mouse Knockout vom Projekt bis zum portablen Spiel bauen

Dies ist ein exakter, spielbarer Ablauf und keine Liste von Panelnamen. Die Vorlage enthält das vollständige Spiel; das Handbuch erklärt außerdem Prüfung, Änderung, Neuaufbau, Test und Export.

### Was Nova_A jetzt erzeugen kann

Ja. Nova_A kann dieses Spiel erstellen, mit deterministischer 2D-Physik ausführen, Maus/Tastatur/Gamepad lesen, Prefabs erzeugen, Rhai oder Visual Graph ausführen, UI aktualisieren und einen eigenständigen Player exportieren.

Unter Windows erzeugt der Nova_A-Desktop-Editor eine portable x86-64-.exe, wenn die passende Windows-Player-Vorlage installiert ist und Project Health besteht. Der Browser-Editor kann einen Web-Ordner bauen, aber keine native .exe kompilieren. Codesignatur und Prüfung auf einem sauberen Rechner bleiben getrennte Freigabeschritte.

### 1. Spielbereites Projekt erstellen

1. Nova_A-Desktop-Editor starten und **New Project** wählen.
2. Projektname, etwa **Mouse Knockout**, und einen beschreibbaren leeren Ordner eingeben; unter Templates **Maus-Knockout** wählen.
3. **Create Project** wählen. **Mouse Knockout Arena** ist Startszene und `Assets/Tutorials/Getting Started.md` wird angezeigt.
4. Einmal speichern, bevor Inhalte geändert oder gebaut werden.

### 2. Das unveränderte Spiel prüfen

1. In der Laufzeitleiste **Play** wählen.
2. Den Zeiger in der Game-Ansicht bewegen. Das blaue Quadrat folgt in Kamera-/Weltkoordinaten; Zoom, DPI und Seitenverhältnis ändern den Physikmaßstab nicht.
3. Alle acht orangefarbenen Ziele aus der Ansicht stoßen. Gezählt wird erst außerhalb der Kameragrenze plus Sicherheitsrand.
4. **Score 1 / 8** bis **8 / 8** und danach die Glückwunschleiste prüfen.
5. **Stop** wählen. Laufzeitänderungen werden verworfen; Szene und Assets bleiben unverändert.

### 3. Objekte und Einstellungen der Vorlage

- **Main Camera** — aktive Camera2D, Orthografiegröße 10.
- **Mouse Player** — Rectangle, kinematischer RigidBody2D, BoxCollider2D, Rückprall 0,7, geringe Reibung und native **MouseFollower2D**. Höchstgeschwindigkeit 40 reagiert direkt und begrenzt Kollisionsimpulse; 0 bleibt der optionale unbegrenzte Modus.
- **Game Manager** — erzeugt acht Ziele, prüft ihre Kameragrenzen per Timer und verwaltet Punktestand und Sieg.
- **Game HUD** — bildschirmbezogene Canvas mit 1920 × 1080 Referenz.
- **Score Text / Instruction Text** — Punktestand und Anleitung.
- **Congratulations Bar / Congratulations Text** — anfangs deaktiviert, bei 8 / 8 aktiviert.
- **Knockout Target.nova-prefab** — dynamischer Körper mit Rückprall 0,86, geringer Reibung und Gruppe `knockout-target`.
- **Szenenphysik** — Gravitation 0, 60-Hz-Fixed-Step, Interpolation; Ebene 0 kollidiert mit Ebene 0.

### 4. Eigenes Objekt zeichnen oder ersetzen

1. Play stoppen, **Design** öffnen, das **Rectangle**-Zeichenwerkzeug wählen und in der Scene-Ansicht ziehen. Die Ziehstrecke bestimmt echte Weltgröße.
2. Objekt in Hierarchy wählen, im Inspector umbenennen, Transform2D einstellen und ShapeRenderer2D sowie BoxCollider2D prüfen.
3. Für einen Player RigidBody2D auf **Kinematic**, Gravity scale 0 und geringe Reibung setzen; **MouseFollower2D** hinzufügen. Offset 0, 0 und Höchstgeschwindigkeit 40 liefern direkte, begrenzte Kollisionen; 0 nur bewusst für unbegrenzte Geschwindigkeit verwenden. Original erst nach erfolgreichem Play-Test entfernen oder deaktivieren.
4. Für ein Ziel **Dynamic**, Gravity scale 0, Rückprall etwa 0,86 und geringe Reibung verwenden und die Gruppe `knockout-target` hinzufügen; ein eigenes Zielskript ist nicht nötig.
5. Ziel auswählen, im Inspector **Create Prefab** wählen, `asset://GUID` aus Assets kopieren und `TARGET_PREFAB_GUID` im Manager ersetzen.
6. Zielgröße etwa 1,25 × 1,25 halten und Spawnpunkte innerhalb der Camera2D-Ansicht setzen.

### 5. Automatische Zeigerkomponente verstehen und Managerskript bearbeiten

`MouseFollower2D` liest den Zeiger der aktiven Game-Ansicht in Weltkoordinaten und liefert die kinematische Geschwindigkeit direkt im nativen Fixed-Step. Dadurch bleiben Kollisionen erhalten, ohne pro Frame ein Skript auszuführen.

`KnockoutGameManager.rhai` verwaltet Spawns, Kameragrenzen, Zerstörung, Punktestand und UI. Es prüft die gruppierten Ziele alle 50 ms, sodass identische Skripte an jedem Ziel entfallen. Die Vorlage enthält acht vollständige `spawn_at`-Aufrufe; unten steht der verkürzte Vertrag.

```rhai
@export(type="int", min=1, max=64, step=1, group="Game") let remaining = 8;
fn start() {
  score_set(0.0);
  entity_set_enabled(find_entity_handle("Congratulations Bar"), false);
  entity_set_enabled(find_entity_handle("Congratulations Text"), false);
  ui_set_text_on(find_entity_handle("Score Text"), "Score  0 / 8");
  spawn_at("asset://TARGET_PREFAB_GUID", -6.0, -3.8, 0.0, 1.0, 1.0);
  // Repeat spawn_at at the seven other authored positions.
  timer_start("bounds", 0.05, true);
}
fn on_timer(name) {
  if name != "bounds" || remaining <= 0 { return; }
  let margin = 0.8;
  for target in query_group("knockout-target", 16) {
    let x = entity_position_x_on(target);
    let y = entity_position_y_on(target);
    if x < view_min_x() - margin || x > view_max_x() + margin
      || y < view_min_y() - margin || y > view_max_y() + margin {
      entity_destroy(target); score_add(1.0); remaining = remaining - 1;
    }
  }
  ui_set_text_on(find_entity_handle("Score Text"), `Score  ${8 - remaining} / 8`);
  if remaining == 0 {
    timer_cancel("bounds");
    entity_set_enabled(find_entity_handle("Congratulations Bar"), true);
    entity_set_enabled(find_entity_handle("Congratulations Text"), true);
  }
}
```

### 6. Konfiguration vor der Freigabe

- Project Settings → Physics: 60 Hz, Szenengravitation 0, Interpolation an.
- Collision Matrix: Player und Ziel besitzen ein aktiviertes Kollisionspaar; UI hat keine Collider.
- Input: Für den Zeiger ist keine Aktion nötig; `mouse_world_x/y` liest die aktive Game-Ansicht. Tastatur/Gamepad wird über Input Map konfiguriert.
- Camera: genau eine aktive Camera2D; Orthografiegröße und Viewport bestimmen `view_min/max_x/y`.
- Build Settings: Runtime **Game**, Startszene **Mouse Knockout Arena**, **Windows**, **x86_64**, **Package into executable**, Kennung z. B. `top.whitelists.mouseknockout`, Version `1.0.0`.
- Project Health: alle Fehler vor Build beheben; Signatur- oder externe Testwarnungen verändern die Spiellogik nicht.

### 7. Portables Windows-Spiel bauen

1. Projekt speichern und **Manage → Project Health** validieren.
2. **Manage → Build Settings → Overview** öffnen.
3. **Windows**, **x86_64**, Runtime **Game** und **Portable application / Package into executable** wählen.
4. **Mouse Knockout Arena** aufnehmen, an erste Stelle setzen und als Startup wählen.
5. Development zum Testen oder Release zur Verteilung; deterministisches Paketieren aktiviert lassen.
6. Ausgabeordner außerhalb des Quellprojekts wählen und **Build & Run** drücken.
7. Nova_A erzeugt Daten, ruft die lokale passende Player-Vorlage auf, schreibt die `.exe` und startet sie. Danach auf einem anderen Windows-x86-64-Rechner prüfen.
8. Für Web: Web und **Web player folder** wählen und den gesamten Ordner über HTTP(S) bereitstellen, nicht über `file://`.

### 8. Fehler und genaue Korrekturen

- Player bewegt sich nicht: Zeiger über Game-Ansicht; aktivierte MouseFollower2D, kinematischen Körper und genau eine aktive Kamera prüfen.
- Ziele bewegen sich nicht: Dynamic, BoxCollider2D, Gravitation 0 und Ebene 0 ↔ 0 prüfen.
- Kein Punkt außerhalb der Ansicht: Gruppe exakt `knockout-target`, laufenden Manager-Timer und API v2 `view_min/max` prüfen.
- Doppelte Punkte: Gruppe nur einmal vergeben und kein zweites Punkteskript hinzufügen.
- Keine Siegesleiste: Namen exakt `Congratulations Bar`, `Congratulations Text`, `Score Text`; remaining entspricht Spawnanzahl.
- Build fehlt: Desktop-Editor auf Zielhost, Windows-x86-64-Vorlage, Startszene und fehlerfreies Project Health erforderlich.

<!-- NOVA_V601_MOUSE_KNOCKOUT_END -->

## Nova_A 5.0.1 – Editororganisation

Version 5.0.1 behält alle Befehle, Kürzel, Arbeitsabläufe, Animationen und Datenverträge von 5.0 bei und ordnet den Editor nach Häufigkeit und Kontext. Arbeitsbereiche, Transformationswerkzeuge, Navigationsverlauf und Simulation bleiben direkt sichtbar. **Layout** steuert Panels und Fokusmodus. **Befehle** enthält Schnellöffnen und die Befehlspalette. **Werkzeuge** enthält Drehpunkt-, Rechteck-, Pfad-, Polygon-, Collider-, Mess- und Zeichenwerkzeuge. **Ansichtseinstellungen** enthält Transformations-/Drehpunktbezug, Raster-/Winkeleinrasten, Hilfslinien/Lineale und Kamerarahmen. Alle Einträge bleiben per Tastatur und Suche erreichbar.

Die Oberfläche verwendet mindestens 12 px für Hinweise und 13 px für dichte Steuerelemente, abgerundete mehrsprachige UI-Schriften, deutlichere Paneltrennung, Rollenfarben für Erstellen-Aktionen und responsive benannte Popover statt einer horizontal scrollenden Szenenleiste. Englisch, Deutsch und Chinesisch werden in beiden Themes und drei UI-Skalierungen geprüft; reduzierte Bewegung entfernt nur nicht notwendige Übergänge.

## Nova_A 5.0 – Produktionsbasis und Zertifizierungsstatus

Nova_A 5.0 friert Project Format 2/Schema 29, Rhai API v2, Plugin API 2, Paketmanifest 1, Build CLI 1, Workspace-Dokument 3 und das Release-Format mit elf Dateien für 5.x ein. Neue Projekte verwenden ausschließlich Rhai v2; importierte v1-Skripte bleiben bis zur Migration schreibgeschützte Kompatibilitätsdaten. Im normalen Release-Workflow erscheinen nur Windows x86-64 und Web als nachgewiesene Tier-1-Ziele. Linux/macOS bleiben Experimental, Android ist nicht verfügbar.

Warnungen in Launcher-Migration, Projektzustand, Paketmanager, Script Studio und Build-Einstellungen besitzen stabile Ziele im Offline-Handbuch. 4.x-Layouts werden normalisiert und unter Erhalt eigener Profile nach Workspace-Dokument 3 migriert. Die endgültigen Richtlinien und Handbücher befinden sich unter `docs/`.

Das lokal erzeugte 5.0-Paket bleibt ein Kandidat, bis 72-Stunden-Soak, 14-tägige Beobachtung, Vergleich auf zwei Rechnern, Wegwerf-Installation, externe Browser/Hardware, Signatur, exakter Git-Tag und unabhängige Prüfung belegt sind. Nicht ausgeführte externe Prüfungen werden niemals als bestanden dargestellt.

## Nova_A 4.9 – Build, Pakete, Zusammenarbeit und Release Candidate

Nova_A 4.9 friert Project Format 2/Schema 29, Rhai API v2, Plugin API 2, Paketmanifest 1, Build CLI 1, Plattformstufen und das Release-Format mit elf Dateien für den 5.0 Release Candidate ein. Während der mindestens 14-tägigen Beobachtung sind nur Release-Blocker sowie Dokumentations- und Nachweiskorrekturen zulässig.

Build-Einstellungen zeigen Vorgaben, echte Zielverfügbarkeit, Plattformidentität, Inhaltsregeln, Symbole, Signatur-/Notarisierungs-Hooks, lokale oder explizite Remote-Auslieferung, Verlauf, Cache-/Ein-/Ausgabe-Hashes, Provenienz, CycloneDX-SBOM und Nachweise. Windows und Web sind Tier 1. Linux/macOS sind Experimental und nur auf passendem CI-Host verfügbar. Android bleibt sichtbar, aber bis zur vollständigen Matrix nicht verfügbar.

Pakete werden vor der Ausführung geprüft: Registry-Regel, Herausgeber, Lizenz, Provenienz, Archiv-/Abhängigkeitshashes, Signatur, Engine-/API-Bereich, Zertifizierung und Berechtigungen erscheinen vor der Zustimmung. Stable verwendet exakte Locks und den geprüften Offline-Cache. Manipulation, Konflikte, verweigerte Rechte und fehlendes Vertrauen führen in die Quarantäne; Updates behalten Rollback, Safe Mode überspringt Drittanbieter.

Der Team-Tab ist optional und lokal. Er bietet semantischen Projektvergleich, Ignore/Hooks/CI, explizite Diff-/Merge-Tools, CODEOWNERS, Aufgabenlinks, Änderungsnotizen, geteilte Build-Vorgaben und beratende Binärsperren. Kein Nova_A-Cloud-Dienst ist erforderlich; Netzwerkaktionen sind standardmäßig aus.

## Nova_A 4.8 – Renderer, Materialien, Partikel, Audio und Profiler

Unter **Verwalten → Rendering** werden Auto, Native oder Kompatibilität gewählt und das echte Gerät, der Treiber, die API, Erweiterungen und Grenzen angezeigt. Jede unterstützte, eingeschränkte oder nicht unterstützte Funktion besitzt eine direkte Korrektur. Qualitätswerte enthalten Pixelverhältnis, Farbraum sowie Draw-Call-, Texturspeicher-, Overdraw-, GPU- und Partikelbudgets. Diagnose zeigt Texturspeicher, Frame-Captures, Kontextzustand und Batch-Unterbrechungsgründe. Canvas2D ist ausschließlich ein ausdrücklich gekennzeichneter Diagnose-Fallback.

Materialien bieten wiederverwendbare Assets, Vererbung, Textur/Blend, typisierte Uniforms, Includes und Shader-Quelltext. Compiler- oder Plattformfehler erzeugen einen sichtbaren Fallback-Eintrag und blockieren die Produktionsprüfung. Aus einem Emitter kann ein `.nova-particle`-Asset erstellt und wieder angewendet werden. Raten, Bursts, Formen, Bewegung, Lebenskurven, Verläufe, Sortierung, Material, Vorschau, Kollision, Subemitter und Budgets sind editierbar.

Unter **Verwalten → Präsentation → Audio** befinden sich Busse, Effekte, Sends, Snapshots, Ducking, Automation, Limiter und semantische Peak/RMS/dB/Clipping-Anzeigen. AudioSource unterstützt Routing, Polyphonie, Priorität, Voice-Stealing/Virtualisierung, Streaming/Vorladen, Seek, Fades, Schleifen, Playlists und räumliche Dämpfung. Ausgabegerät, Hot-Plug, Suspend und Fehler sind diagnostiziert; **Audio wiederherstellen** startet eine kontrollierte Wiederherstellung. Doppler bleibt im Stereo-Web-Audio-Pfad sichtbar eingeschränkt.

Der **Profiler** speichert Frames, Renderer-/Audio-/Partikeldaten, Marker, Zähler, Anmerkungen, Remote-Player und Overhead-Modus. Baselines lassen sich vergleichen und als Capture plus CI-Ergebnis exportieren. Projektzustand und Build-Diagnose erzwingen die gespeicherten Budgets.

## Nova_A 4.4 – Produktions-Assets, Sprites, TileMap, Pfade und Fonts

Im unteren Dock öffnet **Assets** den täglichen Import-, Skript-, Szenen- und Ordnerablauf; **•••** enthält Ordnerexport und geprüften Stapelimport. Raster/Liste, Suche, Typ, Tag, Favoriten, gespeicherte Filter und Sammlungen navigieren auch große Projekte inkrementell.

Der Asset-Importer besitzt **Quelle**, **Import**, **Abhängigkeiten**, **Herkunft** und **Plattform**. Quelle verwaltet Pfad, Quellstatus, Tags, Sammlungen, Inhaltsgruppe und Nur-Editor. Import enthält formatspezifische Einstellungen und versionierte Vorgaben. Abhängigkeiten zeigt Ein-/Ausgänge, Build-Abschluss, Zyklen, Duplikate und fehlende Referenzen. Herkunft zeigt vollständige kopierbare Hashes, Importer/Vorgabe/Version/Einstellungen/Cache-Entscheidung, Vergleich, Diagnose und Wiederherstellung. Plattform legt Kompression, Maximalgröße und Format ausdrücklich fest. Ungültige Daten schlagen mit Diagnose fehl; das letzte geprüfte Artefakt bleibt erhalten.

Bildimport bietet Filter, Mipmaps, Farbraum, Transparenz, Kompression, PPU, Pivot, Trimmen, manuelles/Raster-/Auto-Slicing, Animation, Nine-Slice, Polygon/Kollision, Atlas und SVG. TileMap bietet Suche, alle Mal-/Auswahlwerkzeuge, Ebenenphysik, Weltkoordinaten, Streaming-Grenzen, Baking, Verlauf, Diagnose und deterministische Speicherung. Kameras behalten Grenzen, Glättung, Ränder, Vorschau und Safe Frames. Parallax ergänzt Wiederholung/Spiegelung/Tiefe; Pfade ergänzen Punkte, Tangenten, geschlossene Splines, `.nova-path` und Laufzeitfolger. Fontimport bietet Fallbacks, Shaping, OpenType, Hinting, Oversampling, Bitmap/SDF/MSDF und Glyphenberichte für CJK, RTL, Kombinationszeichen und Emoji.

## Nova_A 4.3 – Szenen, Hierarchie, Inspektor, Komponenten und Prefabs

Die Szenen-Tabs über Design zeigen ungespeicherte, externe, geprüfte und Prefab-Zustände. Zurück/Vorwärts folgt dem Szenenverlauf; **+** erstellt Leere-2D-, Gameplay-2D-, UI-Overlay- oder Kamera-Vorlagen. Das Zahnrad verwaltet Laufzeit-Laden, Vererbung, Tags, benannte Ebenen, Sichtbarkeit/Sperre und Abhängigkeiten. Zyklen werden abgewiesen.

Die Hierarchie virtualisiert 10.000 Objekte. Suche umfasst Name, ID, Tags und Komponenten; Typ- und eigene Tag-Filter, gespeicherte Suchen, Pins, Auswahl Zurück/Vorwärts, Breadcrumbs, Isolation, Sichtbarkeit, Sperre, Aktivierung, Bereichsauswahl, Umhängen und Sortieren bleiben verfügbar. Der Inspektor bietet gemischte Mehrfachwerte, Tags/Gruppen/Ebenen, Eigentum, Nur-Editor/Persistenz, sichere Rechenausdrücke, Pins/Änderungsfilter, Vorgaben und vollständige Komponentenwerkzeuge mit Abhängigkeits-/Konfliktprüfung.

Prefabs unterstützen Erstellen, Instanziieren, Anwenden, Zurücksetzen, Eigenschafts-Reset, Vergleich, Entpacken, Varianten, Quellnavigation, Konflikte, Verschachtelung, Zyklusschutz und sicheren Auswahlersatz. Ansichts-Ausrichtung, Messung, Kamera-Rahmen, Lineale, Hilfslinien und sieben Snap-Ziele verwenden exakte Welteinheiten. Siehe [Schema](../docs/SCENE_PREFAB_SCHEMA_4_3.md), [Komponenten](../docs/COMPONENT_AUTHORING_4_3.md) und [Hierarchie/Inspektor](../docs/HIERARCHY_INSPECTOR_4_3.md).

## Nova_A 4.2 – Projektintegrität

Alle Änderungen an Projektdaten verwenden das zentrale Rückgängig-Modell und einen sichtbaren Ungespeichert-Zustand. **Bearbeiten → Rückgängig-Verlauf** zeigt Aktion, Ressource, Bereich, Zeitpunkt, angewendeten/Redo-Zustand und Speicherbedarf. Speichern validiert und serialisiert deterministisch; erst danach werden Projekt, Szenen, Asset-/Skript-/Animations-/UI-Metadaten, Einstellungen, Build-Daten und `Packages.lock` protokolliert, temporär geschrieben, geprüft und atomar übernommen. Fehler lassen den letzten manuellen Speicherstand unverändert.

Der Projektmanager führt durch Öffnen, Vorhandenes hinzufügen, älteres Projekt migrieren und sicheren Archivimport. Schemas 5–29 erhalten Probelauf, Kompatibilitäts-/Änderungsbericht, Backup, Task-Center-Protokoll, deterministische Wiederholung, Vollprüfung und Rollback. Projektzustand bündelt schreibgeschützte Reparaturvorschau, Referenzzuordnung, Cache-Neuaufbau, Transaktionen, Wiederherstellung, Migration, Rollback und Papierkorb. Nach Absturz oder externer Änderung muss der Benutzer Vorschau/Vergleich sowie Wiederherstellen, Verwerfen, als Kopie öffnen, Datenträger oder Editor ausdrücklich wählen.

## Nova_A 4.1 – moderner Editor

Die sechs Arbeitsbereiche sind **Design**, **Skript**, **Animation**, **UI**, **Debug** und **Verwalten**. Die linke Leiste ist kontextbezogen. Verwalten enthält Einstellungen, Pakete, Projektzustand, globale Darstellung und Build; das untere Dock enthält kontextbezogene Assets, Konsole, Animation, Audio und Profiler. Strg+Umschalt+P öffnet alle stabilen Befehle, Strg+P Assets, Strg+Umschalt+F die globale und Strg+K die Kontextsuche. Arbeitsbereichsprofile, benannte Layouts, Docking, Teilung, schwebende Fenster, Anheften, Auto-Ausblenden, Tab-Sortierung, Import/Export und Reset bleiben deterministisch gespeichert.

Nunito Sans Variable, Noto Sans SC Variable und JetBrains Mono werden lokal mitgeliefert. Der Projektmanager erzwingt genau eine Vorlage, prüft Name/Pfad, zeigt Details und legt Anleitung als ausblendbares Tutorial-Asset ab. Physics Monitor liegt nur in Debug; Projektzustand und vier Build-Bereitschaftsstufen liegen in Verwalten. Das Task Center bündelt Fortschritt, Abbruch, Wiederholung, Details, Protokolle und Ressourcen.

## Nova_A 4.0 – Produktionsbasis

Nova_A 4.0 ist die stabile Basis für Project Format 2, Schema 29. Vor dem Öffnen externer Projekte zeigt die Vorabprüfung Engine/Schema, Inhalte, Pakete und Migrationsschritte. Unterstützte 3.x-Projekte erhalten ein Pflicht-Backup und eine lokale Rollback-Kopie, werden im Speicher migriert, vollständig validiert und erst danach in die Sitzung übernommen. Neuere Schemas bleiben schreibgeschützt. Siehe [Migration](../docs/MIGRATION_4_0.md) und [archivierte Engines](../docs/ARCHIVED_ENGINE_GUIDANCE_4_0.md).

Studio Status erklärt Stable-, Beta- und Development-Kanal, Offline-Problemliste, feste Verträge und datenschutzgeprüfte Diagnosen. Absturzpakete sind freiwillig und bleiben lokal. Experimentelles Networking ist weiterhin als optionales Paket/Referenz verfügbar, jedoch keine Stable-Startvorlage. Der Einstieg [Kleines Spiel erstellen und exportieren](../docs/CREATE_EXPORT_SMALL_GAME_4_0.md) führt durch Autoring, Test und Export.

## Nova_A 3.8 – Weltdaten

Bei ausgewählter TileMap2D erscheint das kontextbezogene **Tilemap**-Werkzeug. TileSet-v2-Quellen unterstützen Atlasrand/-abstand, explizite Bereiche, Animation, gewichtete Varianten, Terrainregeln sowie Kollision-, Navigation-, Verdeckungs-, Metadaten- und Szenen-/Prefab-Daten pro Kachel. Pinsel, Stempel, Muster, Linie, Rechteck, Füllen, Ersetzen, Auswahl, Kopieren, Drehen und Spiegeln aktualisieren Chunks. Ebenen besitzen Sichtbarkeit, Sperre, Deckkraft, Mischung, Parallaxe, Z-Reihenfolge und getrennte Bake-Schalter. **Prüfen** und **Backen** melden beziehungsweise erzeugen die verwendeten Daten.

NavigationRegion2D bietet Grid- oder Polygon-A*, Quelle, Maske, Kosten, Agentenradius und Links. Hindernisse, Agenten, dynamische Neuplanung, Ausweichen, Debugpfade und Profile verwenden dieselben Daten. WorldChunk2D definiert Grenzen, Besitzer, Szene, Abhängigkeiten, Vorladen, Entfernungen, Speicherwert, Cache und Speicherübergabe; der Laufzeit-Streamer lädt, aktiviert, deaktiviert und entlädt abbrechbar innerhalb des Budgets. Der Viewport und Profiler zeigen Zustand, Zeit und Speicher.

Der **Debug-Speicherinspektor** zeigt Schema, Prüfsumme, Zeit, Größe, Plattformort, Fortschritt und Wiederherstellung. Schema-2-Speicherstände verwenden Migration, Journal, temporäre Prüfung, atomaren Commit und Backup. Object Pool und KI sind optionale Pakete: deaktivierte Pakete verbergen die Erstellung, behalten aber serialisierte Daten.

## Nova_A 3.7: Visueller und Audio-Workflow

Das untere Werkzeug **Rendering** trennt **Beleuchtung**, **Materialien**, **Shader**, **Partikel**, **Diagnose** und **Qualität**. Beleuchtung steuert Umgebung, Schatten und Ebenenmasken für Light2D/ShadowCaster2D. Materialien erzeugen typisierte Felder für Zahlen, Ganzzahlen, Bereiche, Enums, Schalter, Vektoren, Farben und Texturen sowie Vererbung, Blend, Sampling, Farbraum und Variante. Shader bietet begrenzten GLSL-ES-Quelltext, Includes, Live-Vorschau und anklickbare Quellfehler; rohe JSON-Felder liegen nur unter Erweitert. Partikel besitzt Vorschau, Budget, Formen, Burst/Rate, Bewegung, Kurven, Verläufe, Material und Subemitter.

Diagnose zeigt GPU-Zeit (falls verfügbar), Draw Calls, Batches, Unterbrechungen, Dreiecke, Overdraw, Atlasseiten, Renderziele und Passzeiten. Frame-Captures können als A/B verglichen werden. Der Capability-Bericht unterscheidet WebGL2 Tier 1 und Canvas2D-Fallback und bietet Renderer-Reset/Context-Recovery. Qualitätsvorgaben ändern Schatten, Pixeldichte, Partikelbudget, Pixel-Snap und Post-Processing; nicht ausführbare Canvas2D-Optionen werden ausgeblendet und in Project Health erklärt.

Assets bietet General-, Pixel-Art-, UI- und Normal-Map-Profile sowie skalierbare/Bitmap-Schrift, Ersatzfamilien, Outline und Textformung. Audio bietet Vorschau, Sound/Musik/Sprache/Streaming, Codec/Qualität, Normalisierung, Schnitt und Loop. AudioSource unterstützt 2D-Pan/Abstand, Bus, Priorität, Polyphonie, deterministische Variation, Limits und Virtualisierung. Busse besitzen Sends, Effekte, Snapshots, Ducking und Meter; der Profiler zeigt Stimmen, Latenz, Aussetzer und Gerätewechsel. Für kurze zeitkritische Loops PCM und Nulldurchgänge verwenden. Neue Formen nutzen eine verbundene 0,04-Einheiten-Kontur ohne hervorstehende Ecken.

## Nova_A 3.6: Präsentationsworkflow

Der Arbeitsbereich **UI** enthält responsive Spieloberflächen, Themes, Lokalisierung, UI-Klangreferenzen und Barrierefreiheit im Spiel. Projektweite Busse und Mischungen bleiben im unteren System **Audio**. Canvas konfiguriert DPI, Sprachvorschau, Safe Area und Theme-Variante. RectTransform unterstützt Ankerbereiche, Offsets, minimale/bevorzugte/maximale Größe, Seitenverhältnis, Größenflags, Lesereihenfolge, Skip-Navigation sowie zugänglichen Namen, Beschreibung, Rolle, Zustand, Wert und Live-Region. Panel bietet Row, Column, Grid, Flow, Overlay, Center, Margin, Aspect und Split sowie Scroll-, Modal-, Popup-, Tooltip-, Drag-and-drop-Verhalten. Telefon-, Tablet-, Desktop- und Ultrawide-Vorschauen prüfen Auflösung, DPI, Safe Area und RTL.

Die **Input Map** unterstützt logische und physische Tasten, Maustasten, Rad und Bewegung, Gamepad-Tasten und -Achsen, Touch und Gesten. Suche, Gerätefilter, Duplizieren, Aufzeichnung und Konfliktliste erleichtern die Bearbeitung. Eine Bindung speichert Controlleridentität, Totzone, Schwelle, Invertierung, Reaktionskurve, Modifikatoren und Akkord. Laufzeit-Rebinding bleibt beim Speichern erhalten; Aufnahme/Wiedergabe enthält Zeigerbewegung, Touchpunkte und angeschlossene Geräte.

Die Lokalisierung importiert/exportiert CSV, verwaltet Schlüssel, Kontext, Pluralformen, Fallback-Sprachen, Metadaten und Schrift-Fallbacks, extrahiert UI- sowie `localize(...)`/`tr(...)`-Aufrufe und erzeugt einen Fehlbericht. Akzent-, Erweiterungs- und BiDi-Pseudolokalisierung sowie RTL-Vorschau decken Clipping auf. Die Barrierefreiheitsprüfung verbindet hohen Kontrast, reduzierte Bewegung, Textskalierung und Mindestzielgröße mit der Spiel-Laufzeit und meldet Beschriftung, Erreichbarkeit, Kontrast und Fokus-/Lesereihenfolge mit Quellort.

Animation behält Dope Sheet, Kurven, Inspector-Keyframes, Snapping, Tangenten, Loop, Animator-Übergänge/Blends/Live-Debug, Sprite-Onion-Skin und Skeleton/Skin/IK/Constraints. Neu persistieren Geschwindigkeit, Easing, Marker sowie Property-, Method-, Event-, Audio- und Nested-Animation-Tracks und wiederverwendbare Clip-Bibliotheken.

## Neu in 3.5: Rhai API v1 und professioneller Skript-Arbeitsbereich

**Skript** öffnet Dateien und Projektsuche links, Dateireiter/Breakpoint-Rand/Find-Ersetzen/semantische Vervollständigung/Parameterhilfe/Editor in der Mitte und getrennte Seiten für **Probleme**, **Gliederung**, **Debug**, **Tests**, **API**, **Module** und **Signale** rechts. **Speichern** prüft den vollständigen Modulgraphen, **Formatieren** nutzt das deterministische Format, Definition/Referenzen/Umbenennen verwenden den Projektindex. Diagnosen unterscheiden Parser, Semantik, Kompatibilität, Laufzeit und Test, besitzen `NOVA-*`-Code, Bereich, Hilfelink und sichere Code-Aktion. Ungespeicherter Quelltext und letzter gespeicherter Hash sind getrennt wiederherstellbar.

Die Vorlagen Component, UI, Physics, Animation Event und Test enthalten nur unterstützte Callbacks. `use "Module.rhai"` löst ausschließlich Projekt-Skriptassets auf und weist Pfadflucht/Zyklen ab. API v1 dokumentiert 108 Symbole in Lebenszyklus, Szene, Objekt, Komponente, Transformation, Eingabe, Physik, UI, Audio, Animation, Navigation, Speichern, Zeit, Logging, Ressourcen, Signalen, Aufgaben und Tests. Jeder Eintrag hat ein Beispiel. Versionierte Handles tragen Gültigkeit, Typ, stabile ID, Fehler, API-Version und deterministische Generation; rohe Editor-Interna werden nicht ausgegeben.

`@export(...)` unterstützt Typ/Standard, Minimum/Maximum, Schritt, Enum, Ressourcentyp, Gruppe, Tooltip und Serialisierung und steuert damit direkt den Inspektor. Signale besitzen sichtbare Quelle/Ziel/Callback-Verbindungen. Timer können gestartet, pausiert, fortgesetzt und abgebrochen werden; aufgeschobene Tasks sind abbrechbar. Ungültige Argumente und Runtimefehler werden sichtbar gemeldet. Line-/Funktions-/Bedingungs-/Trefferzahl-Breakpoints und Logpoints bleiben im Projekt. Pause, Fortsetzen, Schritt hinein/über/heraus, Neustart, Stack, Locals, Watches, Ausdrucksauswertung und Objektprüfung funktionieren an sicheren Callback-Grenzen. API v1 hält nicht an beliebigen Anweisungen innerhalb eines einzelnen Rhai-Callbacks.

Hot Reload hat **kompatiblen Zustand behalten**, **Instanzen neu erstellen** und **deaktiviert**. Der komplette Graph wird vorgeprüft und atomar getauscht; Fehler behalten AST, Zustand und laufende Instanzen. Tests verwenden `test_*`, `// @test tags=… timeout=… seed=… cases=a|b`, `skip=true`, Setup/Teardown und `expect`. `pnpm test:scripts:headless -- … --format json|junit` liefert Exit 0/1/2 für Erfolg/Testfehler/Runnerfehler. **Debug → Profiler → Skripte** zeigt Aufrufe, Gesamt-/Maximalzeit, Allokationsschätzung, Captures, JSON-Export und Vergleich. `pnpm script:lsp` startet das dokumentierte JSON-Lines-Protokoll für externe Editoren. Vollständige API: `docs/RHAI_API_V1.md`; Protokoll: `docs/RHAI_LANGUAGE_PROTOCOL.md`.

## Neu in 3.4: produktionsreife 2D-Physik

**Projekteinstellungen → Physik** enthält Simulation, Kollisionsschichten, Materialien und Konformität. Hier werden Schwerkraft, Dämpfung, Zeitfaktor, feste Tickrate, Aufhollimit und Interpolation mit Einheiten und Validierung eingestellt. Die 32 stabilen Kollisionsbits besitzen eindeutige Namen, Beschreibungen, Farben, Vorgaben, Suche, einen kompakten Paar-Editor und die vollständige Matrix unter „Erweitert“. Umbenennen verändert niemals das Kollisionsbit.

`.nova-material`-Assets verbinden Dichte, Haft-/Gleitreibung, Restitution, Schwelle und Kombinationsmodus direkt mit dem nativen Solver. Collider2D bietet Box, Kreis/Ellipse, Kapsel, endliches Segment, Kette, konvexes und konkaves Polygon und zeigt den jeweiligen Supportstatus. Bis zu sieben zusätzliche lokale Formen besitzen eigenen Versatz, Drehung und Größe und bewegen sich als ein Körper über eine deterministische konvexe Kollisionshülle. Kette und konkave Form sind bewusst nur abfragbar, solange keine stabile Zerlegung verfügbar ist.

Statische, kinematische/animationsgesteuerte, Charakter-, dynamische/physikgesteuerte und Area-/Trigger-Körper haben klare Transformationshoheit. Für dynamische Sprünge dient `Physics2D.teleport`; Ray-, Shape-, Punkt-, Überlappungs- und Kontaktabfragen sowie `moveAndSlide` stehen öffentlich bereit. Charaktere klassifizieren Boden, Wand und Decke und berücksichtigen Neigung, Stufen, Bodeneinrastung, Sicherheitsabstand und bewegte Plattformen. Trigger und Kollisionen liefern Enter, Stay und Exit in stabiler Reihenfolge.

Distanz-, Dreh-, Schiebe-, Schweiß-, Feder-, Seil- und Motorgelenke bieten Anker, Grenzen, Motor, Bruchschwellen und Diagnose. Debug zeichnet Collider, Kontakte, Normalen, AABBs, Schlafzustand, Gelenke, Seilknoten, Charakterkontakte und Schichtfarben. Der Profiler zählt Physikzeit, Körper, Kontakte, schlafende/CCD-Körper, Gelenke, Schritte, verlorene Zeit und Neuaufbauten. Sieben Physik-Referenzprojekte sowie Determinismus-, Tunnel-, Charakter-, Leistungs-, Stapel- und Soak-Nachweise gehören zur Version.

## Neu in 3.3: vollständige 2D-Bearbeitung

**Umschalt+A**, **Objekt erstellen**, das **+** der Hierarchie und der leere Inspektor öffnen dieselbe transaktionale Palette. Sie durchsucht Typen, Komponenten und Core/2D/Physik/UI/Audio/Kamera/Navigation/Skript/Pakete, zeigt Abhängigkeiten und Stabilität und speichert Favoriten sowie zuletzt verwendete Typen. Leer, Sprite, animiertes Sprite, Text, Polygon, Linie, Pfad, Grundformen, Collider, Canvas-/Parallax-Ebene, Kamera, Audioquelle, Licht, Navigationsregion und Skriptobjekt entstehen jeweils in genau einem Undo-Schritt.

Die Werkzeugleiste enthält Auswahl, Verschieben, Drehen, Skalieren, Pivot, Rechteck, Pfad-/Polygonpunkte, Collider und Messlineal. Ausrichten, Verteilen, Spiegeln, 90°-Drehung, Gruppieren, Einrahmen, Isolieren und Kamera-Fokus sind transaktional. Raster-, Pixel-, Vertex-, Kanten-, Zentrum-, Winkel- und Objekt-Snapping sind getrennt. Kamera-Overlays bieten Aus, 16:9, 16:10, 4:3, 9:16 und benutzerdefinierte Auflösung. Rahmen-/Mehrfachauswahl, Sperren, Ausblenden, Filter und 5.000-Objekt-Performance-Modus verändern keine Spieldaten unnötig.

Der Inspektor unterstützt Suche, Kategorien, Mehrfachauswahl und gemischte Werte. Das Kontextmenü einer Eigenschaft bietet Standard zurücksetzen, Prefab-Override zurücksetzen, Wert kopieren/einfügen, Pfad kopieren, Keyframe, Anheften und Hilfe mit Einheit/Bereich. Komponenten lassen sich aktivieren, kopieren, einfügen, umordnen, zurücksetzen und nach App-Bestätigung entfernen. Sprite-Import bietet Region, Pivot-Vorgaben, transparentes Trimmen, Sprite-Sheet-Spalten/-Zeilen/-Rand/-Abstand, Filter, Kompression, Farbraum, Pixelmodus und Nine-Slice-Ränder. Asset-Drop erzeugt Sprite/Prefab mit einem Undo-Schritt.

Camera2D bietet Größe, Zoom, Grenzen, Glättung, Drag-Ränder, Zielverfolgung, Vorschau, Pixel-Perfect, Viewport, Sortierbereich, Priorität, Maske und Rendertextur. Hierarchiesuche umfasst Name, ID, Tags und Komponenten; Breadcrumb und Prefab-/Szenen-/Override-Status sind sichtbar. Ziehen erhält die Welttransformation, **Alt** die lokale Transformation, **Umschalt** ändert die Reihenfolge. Alle Änderungen bleiben Undo/Redo-fähig.

## Neu in 3.1: Arbeitsbereiche, Navigation und sichere Wiederherstellung

Nova_A startet standardmäßig rahmenlos im Vollbild des aktiven Monitors. **F11** wechselt zum letzten gültigen Fensterzustand zurück. **Einstellungen > Editor > Editor im Vollbild starten** steuert den nächsten Start; ein nicht mehr vorhandener Monitor führt zu einem sicher zentrierten Fenster.

Die obere Reihe enthält **Zurück**, **Vorwärts**, **Design**, **Skript**, **Animation**, **UI**, **Debug**, **Benutzerdefiniert**, **Hierarchie**, **Inspektor**, **Unterer Bereich**, **Verwalten**, **Befehlspalette** und **Fokusmodus**. Seitenbereiche lassen sich einklappen, an beiden Seiten andocken und über den Griff skalieren. **Arbeitsbereiche verwalten** speichert, dupliziert, benennt um, aktualisiert, importiert/exportiert oder setzt Layouts zurück; Layouts gelten wahlweise pro Benutzer oder Projekt. `?safe-layout=1` ignoriert gespeicherte Geometrie.

Die frühere untere **Präsentation** ist vollständig in den zentralen **UI-Arbeitsbereich** migriert. **Production Lab** heißt jetzt **Profiler**. Laufzeitdiagnose und Spielstände befinden sich unter **Debug > Profiler > Diagnose**, Plugin-Installation und Sicherheit unter **Pakete > Plugin API**, Projektinformationen unter **Projektzustand**. Optionale KI-, Navigation-, Streaming-, Pool- und Netzwerkwerkzeuge erscheinen nur bei passendem Paket, vorhandenen Projektdaten oder aktivierten experimentellen Funktionen.

**Strg/Befehl+K** oder **Strg/Befehl+Umschalt+P** öffnet die Palette. Sie durchsucht Befehle, Einstellungen, Assets, Szenen, Objekte, Komponenten, Skripte und Plugin-Befehle. Speichern, Rückgängig, Wiederholen, Kopieren, Einfügen, Duplizieren, Löschen, Start und Stopp sind in Menü und Palette erreichbar. Der Tastenkürzel-Editor weist Konflikte ab und kann einzelne oder alle Belegungen zurücksetzen. Einstellungen sind durchsuchbar und nach Editor, Projekt und Laufzeit gefiltert.

Benannte Dokumenttransaktionen halten einhundert Schritte; zusammenhängende Ziehbewegungen werden gruppiert. Autosaves sind begrenzte, geprüfte Schnappschüsse und überschreiben nie die letzte manuelle Speicherung. Nach einem unsauberen Ende zeigt **Absturzwiederherstellung** Projekt, Zeit, Grund und Größe; beschädigte Einträge werden übersprungen. Ein Schnappschuss kann normal, schreibgeschützt oder im Sicherheitsmodus geöffnet werden. Der Sicherheitsmodus deaktiviert nicht verifizierte Drittanbieterpakete und stellt das Standardlayout her.

Die **Aufgabenzentrale** bündelt Importe, Builds, Paketoperationen, Migrationen und Speicherungen mit Fortschritt, Abbruch, Wiederholung und Fehlerdetails. **Diagnose kopieren** erzeugt einen begrenzten Fehlerbericht. Toast, Banner, App-Modal und Inline-Fehler haben getrennte Aufgaben; Browser-Dialoge werden nicht verwendet. Die Freigabeprüfung umfasst F11/Monitorwechsel, alle Arbeitsbereichsaktionen, 100 Undo/Redo-Schritte, beschädigte Wiederherstellung, Tastaturbedienung, drei Sprachen, Kontrast und Layouts von 1366×768 bis 3840×2160.

Nova_A ist eine quelloffene 2D-Spielengine mit Editor. Dieses Handbuch erklärt den vollständigen Weg vom Projekt bis zum eigenständigen Player. Eine Welteinheit entspricht einer Rastereinheit; physikalische Angaben verwenden die angezeigten SI-Einheiten.

## Inhalt

1. Erste Schritte
2. Projektmanager und Vorlagen
3. Editor und alle Hauptschaltflächen
4. Szenen, Hierarchie und Ebenen
5. Inspektor
6. Stabile Komponenten-API
7. Physik
8. Verbindungen, Seile, Gelenke und Bindung
9. Renderer und Kamera
10. Assets
11. Eingabe und Skripting
12. Animation, Audio, UI, Tilemaps und Partikel
13. Szenen, Prefabs und Spielmodus
14. Konsole, Profiler und Debugger
15. Spielstände
16. Plugins
17. Build und Export
18. Migration
19. Drei Tutorials
20. Kürzel und Fehlerbehebung
21. Asset-Pipeline, Pakete, Plugin API 2 und Physikmonitor
22. Welten, Navigation und Gameplay
23. Responsive UI, Themes, Lokalisierung, Audio und Barrierefreiheit

## 1. Erste Schritte

1. Nova_A starten; zuerst erscheint der Projektmanager.
2. Vorlage und Namen wählen und **Projekt erstellen** drücken oder ein vorhandenes `.nova`-/JSON-Projekt öffnen.
3. Auf der Szenenseite Objekte erstellen, positionieren und im Objektinspektor Komponenten hinzufügen.
4. Benannte Aktionen unter Einstellungen > Eingabebelegung anlegen.
5. **Play** drücken, im Spiel-Tab testen und mit Pause/Einzelschritt untersuchen.
6. Über Datei > Projekt speichern das bearbeitbare Projekt sichern.
7. In den Build-Einstellungen Szenenreihenfolge, Startszene und Ziel wählen und bauen.

Spielmodus und Bearbeitungsmodus sind getrennt. Beim Stoppen wird der Zustand vor Play wiederhergestellt.

## 2. Projektmanager und Vorlagen

- **Projekt öffnen** validiert eine Datei und behält ihre Projektidentität.
- **Projekt importieren** öffnet eine Kopie mit neuer Projekt-UUID.
- **Projekt fortsetzen** kehrt zum bereits geöffneten Projekt zurück.
- **Projektname** ist ein bereinigter Name mit höchstens 80 Zeichen.
- **Projekt erstellen** erzeugt und prüft die ausgewählte Vorlage.
- **Zuletzt verwendet** enthält lokale Snapshots. Zu große Projekte müssen erneut als Datei gewählt werden.
- **×** entfernt nur den Verlaufseintrag, niemals eine Projektdatei.
- Sprachumschalter, **Handbuch** und **GitHub** wechseln Sprache bzw. öffnen Dokumentation/Quellcode.

Vorlagen:

- **Leeres 2D**: Kamera, Eingabebelegung und Build-Konfiguration.
- **Platformer**: Sprite, Animation, Eingabe, Skript, Physik, Tilemap, Audio und HUD.
- **Top-down**: zwei Szenen, Prefab-Erzeugung, Triggerwechsel, Gegnerpatrouille, Partikel und Spielstand.
- **Physik-Sandbox**: Körper, Materialien, Distanzgelenk und physikalisches, reißbares Seil.

## 3. Editor und Hauptschaltflächen

### Datei

- **Projektmanager** speichert einen lokalen Verlaufseintrag und öffnet den Startbildschirm.
- **Projekt speichern / Strg+S** speichert das vollständige bearbeitbare Dokument.
- **Projekt importieren** nutzt dieselbe Formatprüfung wie der Projektmanager.
- **Szene leeren** entfernt Objekte und Verbindungen nach dem Nova-Dialog; Undo bleibt möglich.

### Bearbeiten

- **Undo / Strg+Z**, **Redo / Strg+Y oder Strg+Umschalt+Z**.
- **Kopieren / Einfügen / Duplizieren** erhalten Komponenten und Hierarchie, vergeben aber neue UUIDs.
- **Umbenennen / F2**, **Löschen / Entf oder Rücktaste**, **Auswahl aufheben / Esc**.

### Ansicht und Hilfe

- Raster schaltet nur parallele Rasterlinien. X-, Y- und alle Achsen verändern das Raster nicht.
- Kamera zurücksetzen stellt Schwenken/Zoom des Editors zurück.
- Konsole, Profiler, Projekt und Build-Einstellungen öffnen das jeweilige untere Werkzeug.
- Hilfe öffnet das Handbuch innerhalb der App oder GitHub; das Versionsfeld zeigt 3.8.0.

### Arbeitsbereiche, Panels und Befehlspalette

Unter der oberen Leiste liegen fünf Aufgabenlayouts. **Design** zeigt Hierarchie und Inspektor bei eingeklapptem unteren Bereich. **Skript** öffnet einen hohen Assets-Bereich, **Animation** das Animationswerkzeug, **Oberfläche** die Szene mit Hierarchie und Inspektor, und **Debug** die Spielansicht mit Konsole. Dabei werden vorhandene Werkzeuge nur angeordnet; Projektdaten und Funktionen bleiben erhalten.

**H**, **I** und **B** schalten Hierarchie, Inspektor und unteren Bereich unabhängig. Der **Fokusmodus** blendet sie vorübergehend aus, ohne das gespeicherte Layout zu löschen. Layoutdaten bleiben lokal auf diesem Computer und ändern das Projekt nicht. Ansicht > Layout zurücksetzen stellt Design wieder her. Die kleinste unterstützte Fenstergröße ist 900 x 600.

**Strg/Befehl+K** oder **Strg/Befehl+Umschalt+P** öffnet die Befehlspalette. Suche findet Arbeitsbereiche, Seiten, alle unteren Werkzeuge, Panel-Schalter, Fokusmodus und Layout-Reset; Pfeile, Enter und Escape ermöglichen reine Tastaturbedienung.

Der Kopf des Inspektors bleibt beim Scrollen sichtbar. Suche und Kategorien Alle/Allgemein/Transform/Darstellung/Physik/Gameplay/UI filtern Abschnitte. **Komponente hinzufügen** öffnet oben einen durchsuchbaren, kategorisierten Dialog. Filter ändern nur die Darstellung und deaktivieren oder entfernen keine Komponente.

### Seiten und Werkzeugleiste

- **Szene** zeigt bearbeitbare Welt, Auswahl, Hierarchie und Gizmos.
- **Spiel** zeigt Camera2D-Ausgabe und Runtime-UI; echte Texteingabe funktioniert hier.
- **Einstellungen** enthält Darstellung, Sprache, Barrierefreiheit, Physik-Defaults, Eingabe, Audio, Plugins, Spielstände und Sicherheit.
- **Auswahl** klickt oder zieht einen Auswahlrahmen; Umschalt toggelt Elemente.
- **Verschieben/Drehen/Skalieren** nutzt Gizmos und optional Rasterfang.
- Rechteck/Ellipse/Dreieck werden durch Ziehen erzeugt; kurze Klicks nach Verlassen des Inspektors erzeugen nichts.
- Mausrad zoomt; mittlere/rechte Taste schwenkt je nach Kontext.
- Play startet, Pause friert ein, Step führt exakt einen festen Physikschritt aus, Stop stellt den Editorzustand wieder her.

## 4. Szenen, Hierarchie und Ebenen

Die Hierarchie listet alle Objekte der aktiven Szene. Suche filtert Namen. Pfeile öffnen Kinder. Parenting verwendet Transform2D-UUIDs und lehnt Zyklen ab. Gesperrte Objekte sind nicht bearbeitbar; im Editor unsichtbare bleiben gespeichert.

Ebenen lassen sich erstellen, umbenennen, duplizieren, sortieren, isolieren und löschen. Render-/Sortierebenen sind nicht Physikebenen. Physikinteraktion benötigt passende Physikebene und Maske; Verbindungen verlangen zusätzlich dieselbe Editorebene.

Die Szenenliste erstellt, dupliziert, lädt/entlädt, benennt um, löscht und aktiviert Szenen. Runtime-Wechsel akzeptiert UUID oder exakten Namen. Als persistent markierte Objekte überleben den Wechsel.

## 5. Objektinspektor

Allgemein: Name, aktiviert, sichtbar, gesperrt, Tags, Ebene, Prefab-Zustand und Komponenten. Komponenten bieten je nach Typ Aktivieren, Kopieren, Einfügen, Zurücksetzen und Entfernen. Transform2D ist obligatorisch. Eindeutige Komponenten können nicht doppelt hinzugefügt werden.

Zahlen müssen endlich sein. Grenzen werden nur bei echten Format-/Physikgrenzen angewandt. Position 10 bedeutet exakt 10 Welt- und Rastereinheiten.

Der UI-Add-Bereich erzeugt Canvas, Panel, Image, Text, Button, Slider, ProgressBar, Checkbox und TextInput. Ohne Eltern-Canvas wird automatisch einer erzeugt. Lesbare Standardgrößen/Positionen verhindern unsichtbare Kontrollen. Alle Elemente erscheinen und sind auswählbar in Szene und Spiel. Fehlende Bilder zeigen Platzhalter. TextInput unterstützt im Spiel IME, Auswahl, Einfügen, Mehrzeilen- und Passwortmodus.

## 6. Stabile Komponenten-API 2.0

Jede Komponente besitzt UUID, `enabled` und `removed`.

| Komponente | Aufgabe / wichtigste Werte |
|---|---|
| Transform2D | Pflicht: lokale Position, Bogenmaß-Drehung, Skalierung und Parent-UUID. |
| Camera2D | Aktiv, Orthogröße, Zoom, Hintergrund, Pixel-Perfect, Viewport, Sortierbereich. |
| SpriteRenderer2D | Bild, Tönung, Deckkraft, Größe, Pivot, Spiegelung, Sortierung, Material, Filter. |
| ShapeRenderer2D | Rechteck/Ellipse/Polygon, Füllung, Kontur, Textur, Material und Sortierung. |
| TextRenderer2D | Welttext, Font, Größe, Gewicht, Ausrichtung, Farbe und Sortierung. |
| RigidBody2D | Dynamisch/kinematisch/statisch, Dichte/Masse, Trägheit, Geschwindigkeit, Dämpfung, Gravitation, Constraints, Sleep, CCD. |
| BoxCollider2D | Größe/Offset, Material, Sensor, One-Way, Physikebene und Maske. |
| EllipseCollider2D | Ellipsenradien; gleiche Radien ergeben einen Kreis. |
| PolygonCollider2D | Gültige konvexe Punkte plus Material/Filter. |
| FixedJoint2D | Fixiert relative Position und Drehung. |
| DistanceJoint2D | Hält Abstand mit Steifigkeit/Dämpfung. |
| RevoluteJoint2D | Gemeinsamer Anker, freie/begrenzte Rotation. |
| PrismaticJoint2D | Bewegung entlang einer Achse mit Grenzen. |
| SpringJoint2D | Gedämpfte Hooke-Feder. |
| Rope2D | Segmentiertes, dehn-/bieg-/reißbares Seil mit Ankern/Kollision. |
| Script2D | Rhai-Asset, exportierte Eigenschaften und letzter Fehler. |
| Animator | Controller, Tempo, Autoplay, Zustand und Parameter. |
| AudioSource / AudioListener | Clip/Mixer/Spatial-Werte bzw. aktive Hörposition. |
| ParticleEmitter2D | Rate/Burst, Lebensdauer, Maximum, Geschwindigkeit, Farbe, Deckkraft, Textur. |
| Canvas / RectTransform | UI-Wurzel/Auflösung/Sortierung bzw. Anker, Position und Pixelgröße. |
| Panel / Image / Text | UI-Fläche, Bild oder Beschriftung mit Farben/Deckkraft/Layout. |
| Button | Interaktivität und Normal/Hover/Pressed/Disabled-Farben. |
| Slider | Minimum, Maximum, Wert, Schritt, Richtung, Interaktivität. |
| ProgressBar | Nur Anzeige: Bereich, Wert und Füllfarbe. |
| Checkbox | Boolescher Wert, Text, Farben und Interaktivität. |
| TextInput | Wert, Platzhalter, Maximallänge, Mehrzeilen/Passwort/Interaktivität. |
| TileMap2D | TileSet, Größe, Kachel-/Chunkgröße, Zellen und Kollision. |

Panel, ProgressBar, Checkbox und TextInput sind stabile Nova-Erweiterungen. EllipseCollider2D ist der verallgemeinerte Kreis-Collider.

## 7. Physik

Eine persistente Rust-PhysicsWorld läuft mit fester Tickrate; 30, 60, 144 oder 240 Render-FPS ändern das Ergebnis nicht. Dynamische Körper integrieren Kräfte/Impulse. Kinematische folgen Geschwindigkeit und übertragen Bewegung. Statische bewegen sich nicht.

Automatische Masse = Dichte × Fläche; automatische Trägheit ist analytisch. Kraft wirkt kontinuierlich, Impuls sofort. Drehmoment/Angularimpuls berücksichtigen Anwendungsort und Trägheit. Dämpfung ist zeitschrittunabhängig. Reibung darf größer als 1 sein; Restitutionsschwelle unterdrückt langsames Hüpfen. Sensoren melden Ereignisse ohne Impuls. One-Way blockiert von einer Seite. Continuous aktiviert adaptive Substeps gegen Tunneling. Sleeping wacht bei Kraft, Impuls, Transform oder Kontakt auf. Raycasts, Overlaps und Shape-Casts beachten Masken.

Renderer und Collider sind unabhängig: Sprite erzeugt keinen Collider und Collider kein Bild.

## 8. Verbindungen, Seile, Gelenke und Bindung

Im Verbindungseditor genau zwei Objekte derselben Ebene wählen, dann **Gerade** oder **Manuell**. Von Zentrum, Oberfläche, Seite oder Vertex des ersten zum zweiten ziehen. Blaue Ringe mit weißem Mittelpunkt markieren Zentren; **Zentrum anzeigen** blendet sie ein/aus.

Dehnung, Biegung, Steifigkeit, Dämpfung, maximale Dehnung, Belastungsgrenzen, Dicke, Dichte und Kollision sind echte Runtime-Werte. Gerade Verbindungen werden bei Bewegung/Skalierung neu gezogen. Manuelle Pfade verformen sich als gesampeltes Seil. Es kollidiert nie mit seinen zwei Trägerkörpern, optional aber mit anderen Körpern derselben Ebene. Impulse erreichen Anker und erzeugen Kraft/Drehmoment. Überlast reißt den korrekten Link; Fragmente simulieren weiter.

Bei Überlappung erzeugt **Binden** einen Compound-Körper: interne Kanten verschwinden, Drag bewegt alles, Masse/Trägheit/Kollision werden gemeinsam berechnet. **Trennen** stellt Einzelkörper wieder her.

## 9. Renderer und Kamera

WebGL2 ist der Produktionsrenderer; Canvas-Overlays dienen Editorhilfen. Befehle werden gebündelt und nach Sortierebene/Reihenfolge geordnet. Texturatlas, Filter, Welttext, Tile-Chunks und Partikel werden unterstützt. Raster/Gizmos erscheinen nie im Player.

Camera2D bestimmt die Spielansicht. Orthogröße/Zoom, normalisierter Viewport, Pixel-Perfect, Hintergrund und Sortierbereich sind einstellbar. Raster liegt hinter Objekten. Fehlende Assets zeigen Platzhalter und Konsolenmeldung.

Das untere Werkzeug **Rendering** zeigt den Rendergraphen mit World, Lighting, Post Process, Editor Overlay und UI sowie Passzeit, Draw Calls, Dreiecken, Texturen, Renderzielen, Overdraw und – falls unterstützt – GPU-Zeit. **Frame aufnehmen** erzeugt ein PNG; Overdraw, Lighting und Normals sind reine Diagnoseansichten.

**Light2D** bietet Point, Spot, Directional und Area mit Farbe, Intensität, Reichweite, Winkeln, Flächengröße und 32-Bit-Maske. Umgebunglicht gilt projektweit. **ShadowCaster2D** und Off/Hard/Soft/Ultra steuern Schatten. SpriteRenderer2D-Normal-Maps erzeugen richtungsabhängiges Licht.

Materialien speichern sicheres GLSL ES `nova_material`, bis zu acht Texturen, 32 endliche Uniforms, vier Blend-Modi, Nearest/Linear, sRGB/Linear und Color Write. Unsichere Operationen/Laufzeitschleifen sind verboten, Quelltext ist auf 32 KB begrenzt; Live-Diagnose und Default-Fallback schützen den Frame. Ein Material kann als Vollbild-Post-Material dienen.

Camera2D unterstützt Priorität/Stapel, Viewport, Culling-Maske, Sortierbereich, Pixel-Perfect und benannte Rendertexturen. Optionale Effekte: Belichtung, Kontrast, Sättigung, Vignette, Bloom, Blur und User-Material. Nur das User-Material reserviert den optionalen WebGL-Framebuffer. Sprite und UI Image unterstützen Nine-Slice; Importe speichern Atlas, Filter, sRGB/Linear und Plattform-Kompressionsvarianten. Canvas2D bleibt Fallback.

## 10. Assets

Ordner: Scenes, Sprites, Audio, Scripts, Fonts, Prefabs, Plugins, Tiles, TileSets, Materials, Animations und Controllers; `.nova/cache` und `.nova/imported` verwaltet die Engine.

**Assets importieren** vergibt GUIDs. Typ-Schaltflächen erzeugen Skript, Clip, Controller, TileSet usw. Importwerte umfassen Filter, Kompression, Pixel pro Einheit, Region, Pivot und Atlas. Umbenennen/Verschieben/Duplizieren/Löschen aktualisiert die Datenbank. Referenzen sind `asset://UUID`. Fehlende Referenzen bleiben reparierbar. Projektordner nutzt, wenn verfügbar, die File-System-Access-API, sonst Datei-Speichern/Import.

## 11. Eingabe und Skripting

Aktionen: Button, Axis, Vector2; Bindings: Tastatur, Maus, Rad, Gamepad mit Skalierung, Vektoranteil, Index und Totzone.

Rhai-Lifecycle: `awake`, `start`, `fixed_update(dt)`, `update(dt)`, `late_update(dt)`, `on_destroy`, `on_timer` sowie Collision Enter/Stay/Exit und Trigger Enter/Exit. `@export let speed = 5.0;` erscheint im Inspektor.

Lesen: `entity`, `entity_name`, `find_entity`, `has_component`, `get_component`, `transform`, `rigid_body`, `animator`, `audio_source`, alle `time_*`, `input_down/pressed/released`, `input_axis`, `input_vector`, Maus/Rad.

Befehle: `apply_force`, `apply_impulse`, `set_velocity/position/rotation/scale/angular_velocity`; Animator-Set/Trigger/Play; Audio Play/Pause/Stop; `instantiate`, `destroy`, `scene_load`, `scene_reload`, `scene_quit`; Timer Start/Pause/Resume/Cancel; Save-API unten.

Kein Dateisystem, Netzwerk, Prozess, DOM oder dynamischer Import. Operations-/Call-/Depth-Limits stoppen Endlosschleifen. Ein fehlerhaftes Skript wird mit Asset/Zeile geloggt, ohne den Editor zu beenden.

## 12. Animation, Audio, UI, Tilemaps und Partikel

Das Animationsstudio öffnet Clip-, Controller-, Masken-, Rig-, Skin- und Timeline-Assets in passenden Editoren. Der Dope-Sheet- und Kurveneditor unterstützt mehrere Zielspuren, Box-/Mehrfachauswahl, Frame-Snapping, Ziehen, Kopieren/Einfügen und Auto-, Linear-, Konstant- oder freie Tangenten. Spriteframes und Signal-/Payload-Ereignisse verwenden dieselbe exakte Zeit. Der explizite Aufnahmemodus schreibt Inspector- und Gizmo-Änderungen als eingerastete Keyframes.

AnimatorController unterstützt typisierte Parameter mit Standardwerten, Zustände und Untergraphen, Übergangsbedingungen, Exit-Zeit, Dauer, Unterbrechungsstrategie, gewichtete/additive Ebenen, Eigenschaftsmasken und 1D-Blend-Trees. Die Livevorschau startet den gewählten Zustand auf einem passenden Animator. Feste Simulationsticks machen Kurven und Ereignisreihenfolge unabhängig von der Renderbildrate; Animationsereignisse laufen durch die begrenzte Signalwarteschlange.

Rig-Assets enthalten Elternknochen, lokale Transformationen/Länge, IK-Ketten, Rotations-/Kopier-/Positions-Constraints und Pose-Werkzeuge. Skin-Assets speichern Meshpunkte, UVs, Dreiecke und normalisierte Knochengewichte. `Skeleton2D` verbindet Rig und Skin; inverse Bindeposen verformen Sprites in WebGL2 und Canvas2D. `TimelinePlayer` spielt Animation-, Audio-, Kamera-, Event-, Sichtbarkeits- und ScriptCall-Spuren mit Autoplay, Loop, Geschwindigkeit und genauer Zeit.

Im Asset-Inspector kann ein anderer Animationsclip als Quelle gewählt, eine Abtastrate von 1–240 Hz eingestellt und eine Eigenschaftszuordnung angelegt werden. Neuimport tastet deterministisch ab und behält die GUID des Zielclips.

Audio läuft über Master/Music/SFX/UI-Busse; Listener und Spatial Blend/Min/Max steuern räumlichen Ton.

Runtime-UI verwendet Canvas/RectTransform und verarbeitet Hover, Press, Click, Slider-Drag, Checkbox und Text. ProgressBar ist nur Anzeige. TileMap malt/löscht/pickt/füllt, rendert Chunks und unterstützt None/Box/Polygon/OneWay-Kollision. Partikel nutzen begrenzten Pool, deterministischen Seed, Rate/Burst, Lebensdauer, Geschwindigkeiten, Farb-/Deckkraftverlauf und Textur.

## 13. Szenen, Prefabs und Spielmodus

Jede Szene speichert eigene Objekte, Verbindungen, Ebenen und globale Physik. Prefabs speichern Unterbäume, Quell-UUIDs und Overrides. Änderungen aktualisieren nicht überschriebene Werte; Revert entfernt Overrides. Fehlende Prefabs bleiben diagnostizierbar. Skript-Instanziierung erfolgt in einer sicheren Strukturphase.

Play erstellt Snapshot, startet Eingabe/Skripte/Audio/Animation/Plugins und verbindet feste Physik mit Renderupdates. Pause stoppt normale Zeit, Step macht einen Tick, Stop ruft Destroy-Lifecycle auf und restauriert den Snapshot.

## 14. Konsole, Profiler und Debugger

Konsole: Trace, Debug, Info, Warning, Error, Fatal; Filter nach Stufe/Kategorie, Suche, Löschen und klickbare Quelle. Kategorien trennen Engine, Runtime, Physics, Script, Asset, Build, Save und Plugin.

Profiler: Frame, Physik, Skripte, Rendern, Animation, Audio, Assets, FPS, Bodies, Draw Calls und Speicher; 180 Samples, Freeze und Clear. Physikdebugger zeigt Collider, AABB, Kontakte, Normalen, Gelenke, Seilknoten und schlafende Körper, ohne Simulation zu ändern. Crashprotokolle werden plattformabhängig geschrieben; defekte Einzelressourcen beenden die Engine nicht.

## 15. Spielstand-API

Spielstände sind getrennt von Projekten/Szenen und durch Projekt-UUID plus Slot isoliert. Erlaubt: endliche Zahl, Bool, String, Null, Arrays und Maps; keine Engineobjekte/binäre Daten.

- `save_has`, `save_get(key, fallback)` lesen.
- `save_set`, `save_delete`, `save_clear` ändern Arbeitsdaten.
- `save_load(slot)` lädt; `save_commit(slot)` prüft und persistiert.

Einstellungen > Spielstände bietet Slot, Laden, Commit, Leeren und JSON-Vorschau. Grenzen: 1 MB, Tiefe 8, 2.000 Elemente pro Sammlung.

## 16. WASM-Plugins

Nova_A 2.0 akzeptiert WebAssembly, keine nativen DLLs. Manifest und passende `.wasm` gemeinsam importieren. Manifest: Reverse-Domain-ID, Name, SemVer, `apiVersion: 1`, Enginebereich, sicherer relativer Entry, `log`/`events`, enabled. Exporte: zwingend `nova_plugin_api_version() == 1` und `nova_plugin_init()`; optional Update/Shutdown.

Kein Datei-/Prozess-/Netzwerkzugriff. Über 16 MB, unsichere Pfade, unbekannte Rechte oder falsche API werden abgelehnt. Trap deaktiviert das Plugin für die laufende Session.

## 17. Build und Export

Game-Name, Windows/Linux/macOS/Web, x86_64, geordnete Szenen, Startszene, Development-Build, Zielordner. Single-Executable gibt es für Windows/Linux; Standard ist Player plus `game.nova-pak`. Build paketiert, Build & Run startet native Ergebnisse.

`.nova-pak` besitzt Magic/Version, Index mit Pfad/Typ/GUID, relative Offsets, Original-/Speicherlängen, optionale gzip-Blöcke und SHA-256. Unsichere Pfade, Grenzen oder Checksummen werden abgelehnt. Desktopziele werden auf dem jeweiligen Host gebaut; Web erzeugt statische Dateien. Player enthält keine Editor-UI. CI prüft Windows, Linux und macOS.

## 18. Migration

**Nova_A Project Format 2**, Schema 23, unterstützt Legacy ab Schema 5. Dokumente enthalten Format/Major, Schema, Engineversion, Kompatibilität, Projekt-UUID und Manifest. Schema 23 ergänzt deterministische Projekt-, Szenen-, Prefab- und Assetdaten und erhält Produktion, Präsentation, Audio, Welt, Rig/Skin, Timeline sowie unbekannte Felder. Geordnete Migrationen erhalten IDs, Komponenten, Hierarchie, Szenen, Assets, Prefabs, Eingabe, Audio, Tilemaps, Partikel, Gelenke, Build- und Renderingwerte. Neuere Formate öffnen nur in der schreibgeschützten Kompatibilitätsansicht.

Vor Migration Backup/Commit erstellen. Danach Assets, Skripte, Ebenen, Szenen und Buildreihenfolge prüfen und als Format 2 speichern. Künftige Schemaänderungen benötigen Migrationen.

## 19. Tutorials

### A – Physik-Spielplatz

Physik-Sandbox erstellen. RigidBody/Collider und Reibung/Restitution ändern. Play. DistanceJoint und Seil prüfen, physische Kollision aktivieren, Steifigkeit/Dämpfung ändern. Debug-Overlays einschalten und Last bis zum Riss erhöhen.

### B – Platformer

Platformer erstellen. PlayerController mit Speed/Jump, Sprite, Animator-Clip/Controller und Jump-Audio prüfen. MoveHorizontal/Jump ansehen, Tilemap malen, Plattform/Kamera/HUD anpassen. Mit A/D und Leertaste spielen, zweite Szene hinzufügen, Buildreihenfolge setzen und Player exportieren.

### C – Top-down

Top-down erstellen. WASD bewegt, E instanziiert Gegner-Prefab. Gegner-Skript und Partikel prüfen. Exit Trigger speichert Checkpoint und wechselt zum Hauptmenü. Slot `slot1` in Einstellungen laden. Prefab ändern, Overrides erhalten und beide Szenen bauen.

## 20. Kürzel und Fehlerbehebung

Strg/Cmd+S Speichern; Strg/Cmd+Z Undo; Strg/Cmd+Y oder Umschalt+Z Redo; Strg/Cmd+C/V/D Kopieren/Einfügen/Duplizieren; Entf Löschen; F2 Umbenennen; Esc Abbrechen.

Unsichtbar: Enabled, Szene/Ebene, Kamera, Sortierung und Asset prüfen. Keine Kollision: beide Collider, Bodytyp, Physikebene/Maske und Sensor prüfen. Skriptfehler: Konsole/Quelle öffnen, Aktionsnamen und Exporttypen prüfen. Buildfehler: vorhandene Szenen und Startszene prüfen, Desktop auf passendem OS bauen. Alte Projekte niemals blind per Hand ändern; Original behalten und exakte Migration melden.

Release-Audit: jede Vorlage erstellen/importieren, speichern/neu öffnen, Play/Pause/Step/Stop, Szenenwechsel, Prefab, Physikevents, Save laden/schreiben, Player+Pack bauen/starten und Abwesenheit der Editor-UI bestätigen.
## 21. Skriptstudio 2.2

Der Arbeitsbereich **Skript** öffnet jetzt einen eigenen Vollbild-Editor. Links befinden sich Projektsuche und Dateien, oben Tabs, in der Mitte Rhai-Quelltext mit Zeilen, Haltepunkten, Suchen/Ersetzen, Status, Vervollständigung, Signaturhilfe und Definitionen. Rechts stehen Diagnose, Symbole, Module, Debugger, Tests, Signale und die aus einem gemeinsamen Katalog erzeugte Engine-API. F2 benennt ein Symbol erst nach Bestätigung und erfolgreicher Kompilierung aller betroffenen Module projektweit um.

`use "Movement.rhai";` importiert schreibgeschützte Projektmodule; fehlende und zyklische Abhängigkeiten werden abgelehnt. Gültiges Speichern ersetzt das kompilierte Programm nur an einer sicheren Frame-Grenze; bei einem Fehler läuft die vorherige gültige Version weiter. Entwicklungssitzungen bieten Continue/Step, Stack, Locals und sichere Watches. `test_*` läuft isoliert und `expect` meldet Fehler. Getypte Handles liefern `valid/kind/id/error`. `task_wait` wird mit Objekt/Szene abgebrochen. `signal_emit` erreicht `on_signal`; Physik, UI, Animation und Szenenlebenszyklus benutzen dieselbe begrenzte Warteschlange. Format 2 Schema 23 speichert die Metadaten; Release-Builds entfernen Debugdaten.


## 21. Nova_A 2.5: Asset-Pipeline, Pakete, Plugin API 2 und Physikmonitor

### Asset-Import und Cache

Im unteren Panel **Assets** öffnen. **Assets importieren** unterstützt Bilder, Audio, Schriften, Szenen, Prefabs, Rhai-Skripte, Materialien, Animationen/Controller/Masken, Rigs/Skins/Timelines, TileSets, Atlanten, Shader und Lokalisierungsdateien. Jeder Auftrag zeigt Warteschlange, Lesen, Verarbeitung, Cache-Schreiben, Fertig, Abgebrochen oder Fehlgeschlagen; Abbrechen stoppt Warteschlange, Stream-Lesen und Hashing. Der Schlüssel enthält SHA-256 der Quelldaten, Importer-Version, Zielplattform und normalisierte Einstellungen. Ein identischer Import zeigt **Artefakt aus Cache**. Neuimport behält die GUID; bei Fehlern bleibt das letzte gültige Artefakt aktiv.

Die Auswahl zeigt Vorschau und typspezifische Einstellungen. Bilder bieten Filterung, Regionen, Atlas, Farbraum, Pixel pro Einheit, Pivot, Kompression und Plattformvarianten. Audio bietet Vorschau, Normalisierung, Streaming und Abtastrate. Schriften zeigen eine Vorschau. Skripte zeigen UTF-8/Modul-Metadaten und öffnen das Skriptstudio. Atlas-, Tile-, Shader-, Animations- und Lokalisierungsressourcen besitzen eigene Einstellungen.

**Ungenutzte Assets** durchsucht Projekt- und Asset-Referenzen. **Fehlende Referenzen** meldet unbekannte `asset://`-GUIDs. Referenzen und Build nennt Besitzer und Aufnahmegrund. Verschieben/Umbenennen repariert Pfade; Löschen nutzt den Nova_A-Dialog und bereinigt bekannte Referenzen.

### Pakete und Plugin API 2

**Pakete** im unteren Panel oder in der Befehlspalette öffnen. Ansichten trennen Installiert, Projekt, Updates, Inkompatibel und Deaktiviert. JSON-Manifeste können lokale, Git- oder Registry-Quellen beschreiben. Nova_A prüft Reverse-Domain-ID, SemVer, Engine-Bereich, Abhängigkeiten, Quelle, Hash und Lockdatei. Ein neueres Manifest wird als Update zwischengespeichert; vor **Update anwenden** den Bericht prüfen. Bei abhängigen Paketen wird die Deinstallation blockiert.

Plugin API 2 deklariert Editorbefehle, Menüs, Panels, Importer, Asset-Editoren, Komponenten, Inspektoren, Gizmos, Einstellungen, Build-Hooks, Runtime-Systeme und Ereignisse. Jeder Beitrag braucht seine Berechtigung. WASM-Plugins besitzen 16-MB- und Aufrufzeitgrenzen; SHA-256 und optionale Ed25519-Signaturen werden geprüft. Native Erweiterungen werden nie heruntergeladen oder ausgeführt. Pakete lassen sich pro Projekt deaktivieren; der Sicherheitsmodus überspringt Drittanbieter-Code. `?safe-mode=1` startet einmal sicher. API-1-Projekte mit Log/Ereignis-Berechtigung bleiben kompatibel.

### Physikmonitor und Kollisionsverlauf

Play oder Pause drücken. Der rechte Physikmonitor zeigt Weltposition, Richtung, Betrag/Geschwindigkeit, Beschleunigung, Kraft, Winkelgeschwindigkeit, kinetische Energie, Kontakte und Aktiv/Ruhezustand aus der autoritativen Rust-Runtime. Der Kollisionsverlauf zeigt Objektpaare, Fixed-Step/Zeit, Punkt, relative Geschwindigkeit vorher/nachher, Richtungsänderung, Normal-/Tangentialimpuls und Normal-/Reibungskraft. Einfrieren hält den Stand, Leeren entfernt nur den Verlauf, Suche filtert beide Ansichten und Einklappen gibt Platz zurück. Verlauf und DOM-Zeilen bleiben begrenzt.

### Release-Prüfung 2.5

Alle Templates, Assettypen, Neuimport/Abbruch/Cache/Fallback, Verschieben/Umbenennen/Löschen, Referenzberichte, kompatible/inkompatible/API-1/API-2/native Manifeste, Update/Deinstallationsauswirkung/Sicherheitsmodus, Play/Pause/Step/Stop, Physikmonitor, Ansichten/Arbeitsbereiche/Themen/Sprachen, Speichern/Öffnen, Build und Player prüfen. Pflicht: Rust-Format, striktes Clippy, alle Rust-Tests, Vue-Typprüfung, Produktionsbuild, Audit-Skripte und Browser-Smoke-Test bei 900 × 600 sowie normaler Desktopgröße.

## 22. Nova_A 2.6: Welten, Navigation und Gameplay

**Weltwerkzeuge** über unteres Panel oder Befehlspalette öffnen. Die Tabs halten Weltfunktionen aus dem langen Objektinspektor; **Hinzufügen** nutzt die normale Undo-Historie.

- **CharacterBody2D:** an einen kinematischen Körper mit Collider hängen. Neigungswinkel, Stufenhöhe, Bodenfang, Sicherheitsabstand und Gleitvorgänge gehen in Welt­einheiten an den Rust-Solver. Plattformgeschwindigkeit und Boden/Wand/Decke werden angezeigt. Rhai bietet `move_character`, `can_coyote_jump`, Kontakthelfer, Bodennormale und Plattformgeschwindigkeit. Ein Meter bleibt exakt ein Weltmeter.
- **Area2D:** Box/Kreis und Maske wählen; Schwerkraft, Wind, Widerstand, Auftrieb, Schaden oder Signal hinzufügen. Kräfte gelten genau einen festen Rust-Schritt; Enter/Exit, Schaden und benutzerdefinierte Signale laufen durch die begrenzte Ereigniswarteschlange.
- **Navigation:** optionales Nova-Navigationspaket aktivieren. Polygon-/Gitterregion, Hindernisse und Agenten mit A* oder FlowField, Diagonalen, Layer, Repath/Rebake, Vermeidung und Glättung bearbeiten. Debug zeigt den begrenzten Pfad. Reine Physikprojekte laden das Modul nicht.
- **AI:** optionales Gameplay-AI-Paket liefert Behavior Tree und hierarchische State Machine als Assets; Aktionen und Zustandswechsel senden Runtime-Signale.
- **Streaming:** WorldChunk2D speichert Grenzen, Lade-/Entladedistanz, Priorität, Speicher und Szene. Speicherbudget begrenzt geladene Chunks; Szenen werden asynchron geplant. Origin Shift stabilisiert große Koordinaten. Portal2D lädt beim Eintritt eines Players/CharacterBody die Zielszene.
- **Object Pool:** Prefab, Vorwärmen, Kapazität und begrenzte Erweiterung festlegen. `instantiate` übernimmt freie Instanzen, `despawn()` gibt sie zurück; Spawn/Despawn-Signale beachten den Lebenszyklus.

Das **Tilemap**-Panel erstellt Tile Palette, Brush Preset und Terrain Rules. Sichtbare, gesperrte Ebenen mit Deckkraft können hinzugefügt, dupliziert, gewechselt oder entfernt werden. Tiles speichern Gelände, Navigationskosten, Occluder und None/Box/Polygon/OneWay-Kollision. **Kachelkarte backen** meldet Kollisionsformen, Navigation, Occluder und Chunks. Schema 19 speichert Weltwerte, Komponenten und Assets und erhält unbekannte Felder. Der Platformer nutzt CharacterBody2D mit exakter Bewegung und Kulanzsprung.

## 23. Nova_A 2.7: Responsive UI, Themes, Lokalisierung, Audio und Accessibility

**Präsentation** wird aus dem unteren Panel, dem Interface-Arbeitsbereich oder der Befehlspalette geöffnet. UI bündelt Canvas/RectTransform/Panel-Werkzeuge: Anker, Fixed/Fill/Content-Größenregeln, Min/Max, Seitenverhältnis, sichere Bereiche, bis zu 32 Breiten-Breakpoints, Horizontal/Vertical/Grid-Container, Innenabstand, Umbruch, Clip, runde Maske, Mausrad-Scrollansicht, Scrollleisten und wiederverwendbare UI-Prefabs. **UI-Szene speichern** legt den gewählten Teilbaum unter `Assets/Prefabs/UI` ab.

`.nova-theme`-Ressourcen besitzen Elternvererbung, Variablen, Stilklassen und Normal/Hovered/Pressed/Disabled/Focused-Zustände. Canvas wählt das Theme; jedes Steuerelement wählt eine Klasse und kann den Hintergrund gezielt überschreiben. Die Vorschau reagiert live.

Focusable RectTransforms verwenden Tab-Reihenfolge, optionale Richtungs-UUIDs und sonst räumliche Pfeil-/D-Pad-Navigation. Enter, Leertaste und Gamepad-Taste 0 aktivieren. Rolle, Label und Beschreibung werden im Game-View in einen begrenzten Screenreader-Baum exportiert. Ein Button mit Remap-Aktion erfasst die nächste Tastatur-/Gamepad-Taste. Runtime-Barrierefreiheit ist ausdrücklich von Editor-Kontrast, Schrift und Bewegungsoptionen getrennt.

Lokalisierungstabellen speichern Strings sowie Plural-/Select-Maps. `{name}`, `{value, number}` und `{value, date}` werden formatiert. Quellsprache, Live-Vorschau, Fallback-Kette, Pseudolokalisierung, Font-Fallback, RTL und Build-Sprachen sind Projekteinstellungen; nicht gewählte Sprachen werden aus dem Player entfernt.

Der Audiomixer unterstützt höchstens 32 Busse, 8 Effekte und 16 Sends pro Bus, Snapshots, Ducking, Mute/Solo, Pegelanzeigen und Voice-Limits. Low/High Pass, Compressor, Delay und Reverb wenden Aktivierung und Wet/Dry tatsächlich an; Delay verwendet Feedback. AudioSource bietet Bus, Priorität, Streaming, räumliche Kurve und Distanz. Die Asset-Vorschau zeigt dekodierte Wellenform, Loop-Marken, Normalisierungsziel/-verstärkung; der Profiler zeigt aktive, gestreamte, gepufferte und begrenzte Stimmen.

**Hilfe > Handbuch** öffnet die gebündelte Seite gleichursprünglich in Nova_A. Dadurch wird keine interne `tauri.localhost`-URL an den externen Opener gegeben. Release-Audit: sämtliche UI-Layouts/States/Fokus/Remaps, drei Sprachen plus Pseudo/RTL/Fallback, Build-Sprachfilter, Mixerpfade/Effekte/Ducking/Snapshots/Voice-Limits, Wellenform/Loop/Streaming/Spatial, Handbuch, Speichern/Migration, Play/Pause/Step/Stop und alle Web-/Windows-Artefakte prüfen.

## 24. Nova_A 2.8: Profiler, Tests, Daten, Jobs und optionales Netzwerk

**Profiler** (bis 3.0 „Production Lab“) ist im unteren Panel und in der Befehlspalette erreichbar. **Trace** zeichnet eine begrenzte Frame-Historie für Eingabe, Skripte, Animation, Physik, Audio, Rendering, Assets, Allokationen und GPU-Pässe auf. Capacity begrenzt den Speicher; Capture friert einen Vergleichsstand ein. Der Physik-Debugger liest den Solver nur. **Memory** setzt Gesamt-/Asset-/Textur-/Audio-/Skriptbudgets, zeigt aktuelle/Spitzenwerte und Lebensdauerereignisse. Leak-Erkennung meldet lange überlebende Objekte, löscht aber nichts. Zwei Speicher-Captures liefern signierte Byte-/Objektdifferenzen.

**Replay:** Seed und Kapazität einstellen, Record starten und stoppen. Pro Fixed Step werden normalisierte Eingaben und Physik-Checksumme gespeichert. Play stellt das Startprojekt wieder her und meldet Frame/Erwartet/Ist bei Abweichungen. Rhai `random()` und `random_range()` benutzen denselben Seed. Beliebige Gleitkomma-Skripte sind nicht auf jeder Hardware garantiert bitgleich.

**Tests:** Add Test erzeugt Unit, Scene, Integration oder Headless mit Szene, Timeout, Schrittlimit und Screenshot. Assertions prüfen Mindestzahl/Existenz von Entities, endliche Physik, Physik-Checksumme oder das Fehlen von Runtime-Fehlern. Run Selected/All liefern Pass/Fail/Error/Timeout; Export JSON/JUnit ist CI-lesbar. Headless erzeugt keine Screenshots.

**Data:** Data Schema definiert eindeutige String/Number/Integer/Boolean/JSON-Felder, Required und Default. Data Table wählt ein Schema; Import JSON/CSV/Database Result nimmt lokale Zeilen entgegen und Validation zeigt Zeile/Feld/Schwere/Text. Generate Accessor lädt einen getypten TypeScript-Zugriff herunter. Nova_A speichert keine Datenbank-Zugangsdaten. Spielstände sind versionierte `nova-save`-Hüllen; geordnete Rename/Remove/Default-Migrationen werden lückenlos angewandt, zukünftige Versionen abgelehnt.

**Jobs:** Worker-Zahl und Queue sind begrenzt; Status ist Queued/Running/Complete/Failed/Cancelled. Cancel beendet Queue oder ausstehenden Auftrag. Ohne Worker läuft genau ein serieller, nachgebender Fallback.

**Networking:** Standard ist deinstalliert, deaktiviert und aus dem Player entfernt. Erst offizielles Paket installieren, dann WebSocket oder natives UDP, Endpunkt, Client/Server/Host, Grenzen, Snapshot-Rate, Interpolation, Prediction und Rollback wählen. Connect/Disconnect steuern Transport, Reconnect und Queues. Replicate Selected fügt eine Entity mit Authority/Eigenschaften hinzu; RPC/Snapshot-Größen sind begrenzt. Diagnose zeigt Zustand, Peers, Latenz, Bytes/Pakete, Drops und Korrekturen. Build Settings **Authoritative headless server** benötigt nativen Target und aktives Netzwerk, entfernt Canvas und tickt Fixed Simulation.

WebGL nutzt Multisampling; Canvas hohe Glättung und runde Linien; Text Kerning/Ligaturen/optische Größe. Explizites Nearest-Pixelart bleibt scharf. Release-Audit: alle Tabs/Buttons, Captures/Budgets/Leaks, Replay/Mismatch, vier Testarten/Berichte, Datenimporte/Migrationen, Job-Sättigung/Abbruch/Fallback, Netzwerk aus/installiert/WebSocket/UDP/Abbruch beim Laden, Game/Headless-Build, alle Sprachen/Themes/Größen sowie Format, Clippy, Rust-Tests, TypeScript, Build, Audits, Browser-Smoke, Installer, Release-Dateien und SHA-256 prüfen.

## 25. Nova_A 2.9: Auslieferung, Teamarbeit, Pakete und Upgrades

### Übersichtliches Build Settings

**Projekt → Build Settings** ist in **Übersicht**, **Plattform**, **Auslieferung** und **Team** gegliedert. Übersicht enthält Name, Ziel, x86_64/aarch64, Debug/Release, Runtime, Szenen, Startszene, Ausgabe sowie Build/Build & Run. Fehler der Vorprüfung blockieren den Export; Warnungen erklären Einschränkungen. Plattform enthält Identifier, Version, Icon, Splash, Orientierung, Berechtigungen sowie Signatur-/Notarisierungshinweise. Windows, Linux, macOS und Web sind eingebaut. Android benötigt das ausdrücklich installierte offizielle Paket, SDK/JDK und `NOVA_A_ANDROID_TEMPLATE`; sonst bleibt es sicher deaktiviert.

### Reproduzierbare Builds und Datenschutz

Deterministische Metadaten, inkrementelle Schreibvorgänge, drei Kompressionsstufen, Cache, SHA-256, Patch-Manifest und Build-Bericht sind verbunden. `nova-build-report.json`, Cache-Manifest, optionales Delta-Manifest und native Symbolmap erklären jedes Ergebnis. Der Headless-CLI-Aufruf lautet `pnpm export -- --project ./project.nova --target web --profile release --output ./Builds/MyGame`; `--help` zeigt weitere begrenzte Optionen.

Strukturierte Logs und Crash Capture sind explizite Build-Optionen. Telemetrie ist standardmäßig aus, akzeptiert nur skalare Werte in einer begrenzten Queue und sendet nach Einwilligung ausschließlich an HTTPS. Eine HTTPS-Datenschutzerklärung ist Pflicht; Deaktivieren beendet Sammlung und leert die Queue.

### Team, Registry und Upgrade

Die Team-Seite zeigt UUID-basierten Status, erzeugt `.gitignore`, startet nur gewählte Diff-/Merge-Programme ohne Shell, prüft eingehende `.nova`-Dateien dreiseitig und verwaltet ablaufende Sperren. `{base}`, `{ours}`, `{theirs}` und `{output}` sind begrenzte Dateien; das Ergebnis wird nach Prüfung wieder importiert. Stable JSON sortiert Objektschlüssel, aber nie semantische Array-Reihenfolgen.

Registry Browse zeigt verifizierten Publisher, Rating, Berechtigungen, Dokumentation und Security-Link. Browsen führt keinen Code aus; nur **Installieren** verändert Lockfile/Projekt. Offline-Cache und lokale Spiegel werden ausdrücklich importiert. Alte Projekte zeigen vor dem Öffnen Schema-/Paketfolgen, vollständiges Backup und Validierung; eine lokale Rückrollkopie kann im Projektmanager heruntergeladen werden.

Sechs geprüfte Vorlagen decken Empty, Platformer, Top-down, Physics Sandbox, UI Showcase und Networked Optional ab. Das Release-Audit prüft alle Oberflächen/Sprachen/Themes/Größen, Vorlagen, Speicherung/Migration/Rollback, Runtime/Physik, Pakete/Team, Plattform-/CLI-/Delta-Builds, Datenschutz, Rust fmt/Clippy/Tests, TypeScript, Audits, Browser, Installer, Archive und SHA-256.

## 26. Nova_A 3.0: stabile Verträge, Wiederherstellung und Nachweise

**Hilfe → Studio-Status** zeigt Project Format 2/Schema 23, Runtime API 1, Plugin API 2, Package Manifest 1 und Build CLI 1. Projekte der Schemata 5–23 verwenden Vorschau, vollständige Sicherung, Paketprüfung, In-Memory-Validierung, atomaren Sitzungswechsel und Rollback. Ein zukünftiges Schema bleibt in einer nicht verändernden Kompatibilitätsansicht.

Bei einem unerwarteten Fehler erscheint ein Nova_A-Dialog mit begrenzter Meldung, Kontext, Zeit und optionalem Stack. Diagnose kann kopiert/heruntergeladen, die Operation sicher verlassen oder Nova_A im Sicherheitsmodus ohne Drittanbieter-Plugins gestartet werden. Abbruch und harmlose ResizeObserver-Meldungen sind nicht fatal; ein Atlasfehler behält den letzten gültigen Atlas.

`reference-projects` enthält sechs bearbeitbare Quellprojekte und ein berechtigungsfreies Plugin-API-2-Beispiel. `pnpm benchmark:v3` und `pnpm stability:v3` schreiben maschinenlesbare Nachweise. Ein Smoke ist kein 24-Stunden-Pass; Plattformen bleiben bis zu einem erfolgreichen CI-Artefakt als ausstehend markiert. Verträge, Methodik und Grenzen stehen in `docs/`.

## Nova_A 3.2: Projektdaten, Szenen, Prefabs und Assets

Nova_A 3.2 schreibt Project Format 2, Schema 23. Das Manifest enthält Projekt-UUID, Enginebereich, Schema, `Packages.lock`, Buildvorgaben sowie Rollen für `Assets`, `ProjectSettings`, `.nova/imported`, `.nova/cache` und `.nova/user`. Generierte Artefakte sind markiert und nicht direkt bearbeitbar. Kanonisches JSON verwendet sortierte Schlüssel, zwei Leerzeichen, LF, eine Schlusszeile, endliche Zahlen, stabile Assetreihenfolge und unveränderte Autorenreihenfolgen. Persistente Referenzen benutzen `asset://UUID`, sodass Verschieben und Umbenennen ihre Identität nicht ändert.

**Szenen-Asset erstellen** erzeugt aus der Auswahl eine instanziierbare Szene. Verschachtelte Szenen- und Prefabebenen sowie UUID-Neuzuordnung bleiben beim Duplizieren erhalten. Der Inspector vergleicht Prefab-Überschreibungen, setzt einzelne Werte zurück und bietet Apply, Revert und Unpack. Transform2D ist zwingend, CharacterBody2D verlangt RigidBody2D und Area2D einen Collider.

Das suchbare Assetmenü unterstützt Favoriten und gespeicherte Filter. Metadaten zeigen Importerversion, Quell-/Artefakt-Hash, Cache und Abhängigkeiten. Die Hintergrundwarteschlange bietet Fortschritt, Abbruch, Wiederholung und Logs. Verknüpfte externe Quellen melden Änderungen mit Reimportieren/Behalten/Als Kopie. Verschieben, Umbenennen und Löschen zeigen bekannte Abhängigkeiten; fehlende UUIDs lassen sich reparieren.

**Projekt prüfen** und **Projekt reparieren** stehen in Palette und Projektzustand. Reparaturen werden angezeigt, vollständig gesichert und erneut geprüft; Fehler stellen die vorige Sitzung wieder her. Schema 5–22 zeigt vorab Engine-/Paketkompatibilität und jeden Migrationsschritt. Zukünftige Schemata werden nur schreibgeschützt angezeigt. Das Desktopfenster startet maximiert, dekoriert und größenveränderbar; F11 aktiviert echtes Vollbild.
## Nova_A 3.9 — Build, Pakete, Zusammenarbeit und 4.0-RC

Diese Ausgabe dokumentiert Engine 3.9.0 und Project Format 2, Schema 29.

Build-Einstellungen bieten Vorgaben, Plattformprofile, Ausgabe/Signatur, Auslieferung, Diagnose/Verlauf und Team. Windows x86-64 und Web sind Tier 1; Linux und macOS bleiben experimentell; Mobilgeräte und Konsolen werden erst nach 4.0 unterstützt. Die Headless-CLI führt Validierung, Import, Test, Build, Export, Paketierung und Version aus und schreibt JSONL, Cache-, Größen-, Abhängigkeits- und Symbolberichte.

Stable installiert nur Manifeste mit SemVer, Engine/API-Bereich, Berechtigungen, Pakettyp, Abhängigkeitshashes, Archiv-SHA-256 und verifizierter Signatur. Neue Berechtigungen benötigen Prüfung; Fehler gelangen in Quarantäne. Cache-Prüfung, deterministische Lockdatei, Rollback und Sicherheitsmodus sind verbunden.

Team zeigt Projekt-, Einstellungs-, Paket-, Szenen-, Prefab- und Ressourcendiffs, externe Neu-Laden/Vergleichen-Auswahl, kanonische No-op-Ausgabe, lokale und gemeinsame Einstellungen, Git-Initialisierung, Sperren sowie Hook/CI-Vorlagen. Studio-Status exportiert Diagnosen erst nach Datenschutzprüfung und lädt nichts automatisch hoch. Schema 29 und Runtime API 1, Plugin API 2, Package Manifest 1 sowie Build CLI 1 sind für 4.0 eingefroren.

## Nova_A 4.5 — Produktionsphysik und Figurenablauf

Projekteinstellungen → Physik beginnt mit Präzise, Ausgewogen, Schnell oder Benutzerdefiniert. Das Profil steuert feste Rate, Aufholen, Interpolation, Zeitverlustregel, Teilschritte, Solver-Iterationen, Schlaf und Diagnosebudget. Einstellungen, benannte Kollisionsschichten und die erweiterte Matrix sind Projektdaten. Die rohe 32×32-Matrix bleibt unter Erweitert; tägliche Arbeit nutzt Namen und Paare.

RigidBody2D kennzeichnet statische, dynamische und kinematische Eigentümerschaft. CharacterBody2D und Area2D zeigen Figur- und Triggerrollen. Formen umfassen Rechteck, Kreis, Kapsel, Segment, Polygon, Kette, Weltgrenze und zusammengesetzte Kinder. Weltgrenzen sind immer statisch. Masse, Dichte, Trägheit, lokales Zentrum, Reibung, Restitution, Schwerkraftskalierung, Dämpfung, Schlaf, feste Rotation und CCD zeigen Einheiten.

Strukturierte Abfragen sind `rayQuery`, `pointQuery`, `overlapQuery`, `sweep`, `nearest` und `contactQuery`. Kollisions-/Trigger-Phasen sind stabil geordnet; Schlaf/Wachen und Gelenk-/Seilbruch werden auf UUIDs aufgelöst. Figuren trennen Frame-Eingabe von Festschrittbewegung. Gelenke und Rope2D zeigen Anker, Grenzen, Dämpfung, Kollision, Bruch und Telemetrie; Rope2D ergänzt Segmente, Compliance, Biegung, Dichte, Radius und Bruchstelle.

Der virtuelle Physics Monitor sortiert, heftet an, zeigt Verlauf/Delta, Kollisionen, Gelenke/Seile und exportierbare Vergleichsaufnahmen. Overlays zeigen Collider, Kontakte, Normalen, AABBs, Schlaf, Schwerpunkt, Geschwindigkeit, Kraft, Figurenkontakte, Gelenke und Seilknoten. Projektzustand meldet Budget-, Zeitverlust- und Skalierungswarnungen.

## Nova_A 4.6 — vollständiger Programmierablauf

Der Arbeitsbereich **Script** besteht aus Explorer, Mehrdatei-Editor und einem rechts/unten andockbaren Detailbereich für Probleme, Tests und Debugging. Semantische Vervollständigung, Signaturhilfe, Hover-Dokumentation, Diagnose, Gliederung, Definition, Referenzen, Umbenennen, Codeaktionen, Formatierung, Modulhilfe und ein absturzsicherer persistenter Index sind verbunden. Format- und Lintregeln werden im Projekt gespeichert; API-Änderungen erzwingen einen klaren Neuaufbau des Index.

Rhai API v2 dokumentiert 110 stabile Einträge mit Modul, Typ-/Ergebnismodell, Lebensdauer, Threadregel, Determinismus, Berechtigungen, Beispielen und Veraltung. Importierte API-v1-Skripte behalten den Adapter; Migrationsdiagnosen schlagen v2-Ersatz vor und 4.x schreibt Quelltext nie still um. Projektzustand zeigt API-Version, v1-Ressourcen und veraltete Aufrufe.

Der Debugger unterstützt persistente gruppierte Zeilen-/Funktions-/Bedingungs-/Treffer-/Log-Punkte, Stack und Frame-Auswahl, Lokale, Watches/Auswertung, Ausnahmeregel, Tasks, Quellnavigation und sichere Schritte an Callback-Grenzen. Player-Debugging ist standardmäßig aus, nur lokal, explizit freigegeben und tokenauthentifiziert. Hot Reload kompiliert und klassifiziert zuerst, überträgt kompatiblen Zustand transaktional und behält Verlauf/Rollback; fehlerhafte Kandidaten ersetzen niemals das gültige Programm.

Tests können Datei, Projekt, Tags oder frühere Fehlschläge abdecken. Unit, Integration, Szene, UI, Physik, Animation und Regression unterstützen Fixtures, Setup/Teardown, Fälle, Timeout, Abbruch und deterministische Seeds. Die Headless-CLI schreibt JSON, JUnit und JSON/LCOV, bietet geänderte Auswahl und Shards und liefert stabile Exitcodes 0/1/2. Gemeinsame Welt-Tests laufen seriell; unabhängige CLI-Shards sind die sichere Parallelstrategie.

## Nova_A 4.7 — Animation und produktionsreife Runtime-UI

Der Arbeitsbereich **Animation** aktiviert Werkzeuge erst nach Auswahl eines Clips. Eigenschafts-, Ereignis-, Methoden-, Audio-, verschachtelte, Marker-, Sprite-Frame- und benutzerdefinierte Spuren verwenden Step-, Linear- oder Cubic-Interpolation. Retime, Ripple, Reduce und Slice ändern Zeiten transaktional. Ziele werden gegen Szeneneigenschaften, Skriptsymbole und Audio-Assets geprüft. Zustands-Layer, Parameter, Bedingungen, Übergänge, Blend Trees, Unterbrechung und Laufzeitstatus sind sichtbar. Rigs enthalten Knochen, Skins, Masken, Constraints, IK, Anhänge und explizite Retarget-Aliase; Import-Mapping, Kompression und Sampling werden validiert.

Der Arbeitsbereich **UI** teilt Hierarchie, Auswahl und Inspektor. RectTransform bietet responsive Anker, Container-/Fixed-Modus, Breakpoints, Safe Area, Clipping, Scrollen, Z-Reihenfolge sowie wiederverwendbare Quellen und Varianten. Sechs Gerätevorgaben decken 16:9, 16:10, Ultrawide, 4:3 und Mobil Hoch/Quer ab; Diagnose führt direkt zum Steuerelement. Feste Pixelpositionen verlangen den ausdrücklichen Fixed-Modus. Runtime-Fonts bleiben von Editor-Fonts getrennt.

Themes umfassen Farben, Typografie, Abstand, Radien, Zustände, Symbole, Sounds und Animation sowie Vererbung, Vergleich und Bericht unbenutzter Tokens. Lokalisierung unterstützt stabile Schlüssel, Extraktion, CSV/PO, Plural, Fallback, Zahlen/Datum, Pseudolokalisierung, RTL/Bidi und Font-Fallback. Projektzustand und Build-Einstellungen prüfen Budgets, Namen/Rollen/Zustände, Fokus, Kontrast, Textskalierung, reduzierte Bewegung und Untertitel. Eingabehinweise wechseln automatisch zwischen Tastatur, Maus, Gamepad und Touch.

## Nova_A 5.3 — produktionsreife visuelle Skripte

Öffne **Skript → Visueller Graph**. Die Bereichsauswahl wechselt zwischen Hauptgraph, Funktionen, Makros und Subgraphen. Unter **Struktur** entstehen typisierte Ein-/Ausgaben, lokale Variablen, Ereignisse, Schnittstellen und Knotenbibliotheken installierter Projektpakete. Signaturänderungen behalten kompatible stabile Pins und entfernen unvereinbare Verbindungen sichtbar; die Prüfung blockiert fehlende Verträge, Pakete, Pins, Typen, Zyklen oder Identitäten vor Play/Build.

Der Kreis im Knotenkopf setzt einen Haltepunkt. **Debug** bietet Bedingungen, Treffer, Logpunkte, Watches, Fortsetzen/Schritte, aktive Knoten/Leitungen, Stack, Zeiten, Fehler und Abdeckung aus der echten geordneten Rust-Laufzeitspur. Reduzierte Bewegung behält die Hervorhebung ohne Animation. **Refaktorieren** bietet UUID-sicheres Umbenennen/Referenzen, Funktion extrahieren, kompatiblen Knotentausch und Veraltungsmigration. **Vergleich / Zusammenführen** arbeitet semantisch und verlangt für jeden Konflikt Unsere/Eingehende. **Erzeugtes Rhai** zeigt die exakte API-v2-Quelle und erstellt eine neue Einwegkopie, ohne den Graphen zu überschreiben. Kompatible Änderungen werden am Frame-Rand hot-geladen; Signatur- oder Lebensdauerbruch verlangt Neustart.

## Nova_A 5.4 — Gameplay-Framework und dynamische Objekte

Unter **Inspector → Komponente hinzufügen → Gameplay** lassen sich Rasterbewegung, Plattformer-/Top-down-Steuerung, Gesundheit, Schadens-Hitbox, Sammelobjekt, Projektil, Erzeuger, Abklingzeit, Lebensdauer und Kamerafolge hinzufügen. Aktionen, Ressourcen und begrenzte Physikwerte werden im selben Inspector bearbeitet. Plattformer und Top-down schließen sich aus und ergänzen CharacterBody/RigidBody automatisch. Kontakte beachten weiterhin Ebenen und Kollisionsmatrix.

Unter **Verwalten → Projekteinstellungen → Eingabezuordnung** öffnet **Aktionsverhalten** Kontext, Aktionszuordnung, Steuerungsschemata, Drücken/Halten/Tippen/Mehrfach-Tippen, Verbrauch, Priorität und optionalen Rhai-Callback. Gameplay/Default sind anfangs aktiv. Skripte verwalten Kontexte, Nicht-Standard-Zuordnungen und Schemata; Aufnahme und deterministische Wiedergabe behalten alle Phasen.

`spawn_at` erzeugt ein Prefab an einer vollständigen Transformation und liefert sofort einen ausstehenden Objekt-Handle. Damit lassen sich Position, Drehung, Skalierung, Aktivierung, Komponenten, UI, Tags, Gruppen und Zerstörung adressieren. Tag-/Gruppen-/Komponenten-/Radiusabfragen liefern höchstens 256 typisierte Handles. Veraltete oder generationfalsche Handles protokollieren einen ausdrücklichen Fehler und ändern nichts.

Der Spielablauf umfasst Pause, Szenenneustart/-wechsel, Beenden, 32 Prüfpunkte, Punkte und begrenzte Sitzungsdaten. Verhaltensbäume und Zustandsautomaten senden Knoten/Zustand, Übergänge, Abdeckung, Fehler und Zeiten an **Debug → Visueller Debugger** und **Profiler**.

## Nova_A 5.5 — Materialien, Effekte und Partikel

## Nova_A 5.6 — Animation, Audio und Filmsequenzen

### Animation — manuell und laufzeitgestützt

Erstelle einen Animator Controller und numerische Parameter. Ein **1D**-Blend-Tree verwendet eine Achse, ein **2D**-Tree zwei Achsen; jedes Kind besitzt Clip, Position/Schwelle und Geschwindigkeit. Synchronisiertes Timing gleicht die normalisierte Phase verschiedener Cliplängen an. Ebenen werden geordnet angewendet; Gewicht, Additiv, Maske und synchronisierte Ebene/Zeit steuern ihren Einfluss. Zyklusversatz, Geschwindigkeitsparameter, X/Y-Spiegelung und Root Motion verändern die Laufzeitabtastung.

Übergänge besitzen Exit-Zeit, Überblenddauer, Unterbrechung und Synchronisierung. Normalized Time übernimmt die Quellphase; Marker verlangt denselben Marker in beiden Clips. Ereignisse und Method-/Audio-/Nested-Animation-/Timeline-/Visual-Graph-/Custom-Befehle laufen deterministisch. Für Gameplay-Aufnahmen: Objekt wählen, Play starten, **Laufzeit in Clip aufnehmen**, Bewegung ausführen und Aufnahme stoppen. Nova_A schreibt reduzierte Transform-/Deckkraft-Keys in ein Clip-Asset.

### Timeline — manuelle Filmsequenz

Spuren unterstützen Animation, Audio, Kamera, Ereignis, Sichtbarkeit, Script Call, Nested Timeline, Untertitel und Branch. Clips speichern Start, Dauer, Versatz, Rate, Ziel und Payload. Kamera verwendet Ein-/Ausblendung; Untertitel verwenden Sprache und TitleSafe 80 %, ActionSafe 90 % oder FullFrame 96 %. Marker bestimmen Kapitel, Überspringen und Fortsetzen. Branch springt zu seinem Marker; optionales JSON wie `{"variable":"rescued","equals":true}` prüft eine TimelinePlayer-Variable. Verschachtelung ist zyklusgeschützt und auf acht Ebenen begrenzt. Diagnose zeigt Validierung, Clipzahl, Tiefe, Zeit und Warnungen.

### Audio — manuelle Bereiche, automatische Diagnose

Im Wellenformeditor setzt ein Klick den Cursor, Pfeile verschieben 10 ms und Ziehen markiert einen Bereich. **Loop-Bereich** speichert eine benannte Schleife; Preview beginnt am Cursor. Busse behalten Effekte, Sends, Automation und Limits. Snapshots können umbenannt, im Master-Gain bearbeitet und mit gewählter Dauer überblendet werden. Ducking zeigt Aktivierung, Trigger-/Zielbus, Reduktion, Attack und Release. Diagnose meldet geschätzte momentane/integrierte LUFS, True Peak, Crest-Faktor, Clipping, Latenz, Underruns sowie Gerätewechsel/-wiederherstellung.

Details: [5.6-Anleitung](../docs/ANIMATION_AUDIO_CINEMATICS_5_6.md).
Öffne **Rendering → Visueller Materialgraph** und wähle ein Material. **Klassifikation: Unterstützt, umkehrbar, assetweit.** Wähle Sprite, UI oder Licht, füge Knoten hinzu, verbinde benannte Eingänge, bearbeite Farben/Werte, prüfe das Backend und speichere nach der Validierung. Genau ein Output und ein azyklischer Graph sind Pflicht. Canvas2D nennt Fallbacks; WebGL2 berechnet den vollständigen Graph. Ein Shaderfehler betrifft nur dieses Material.

**Geschichtete 2D-Effekte** sind ein geordneter Stapel. **Klassifikation: Manuell, umkehrbar, assetweit.** Füge Färbung, Maske, Verlauf, Palette, Kontur, Auflösen oder Verzerrung hinzu; bearbeite Farbe/Textur/Stärke/Schwelle/Weichheit, Mischmodus, Deckkraft und Reihenfolge. Masken benötigen ein Bild-Asset.

Unter **Post-Processing** bearbeitest/duplizierst du Vorgaben und legst Kameravolumen mit Mitte, Größe, Überblendabstand, Priorität und Vorgabe an. **Klassifikation: Manuell mit automatischer Kameraauswahl, projektweit.** Die aktive Kamera wählt vor jedem Frame das höchstpriorisierte passende Volumen. Kostenwerte sind Schätzungen.

Füge `ParticleEmitter2D` hinzu und öffne **Partikel**. **Klassifikation: Unterstützte Asset-Erstellung, Anwendung pro Objekt, Laufzeit.** Erzeuge ein Asset, ordne Spawn-, Form-, Geschwindigkeits-, Kraft-, Farb-, Größen-, Rotations-, Kollisions-, Ereignis-, Sub-Emitter-, Spur- und Renderer-Module, speichere und wende es ausdrücklich an. Bloßes Öffnen verändert kein Szenenobjekt. CPU-Simulation ist deterministisch; WebGL2 bündelt die Ausgabe, Canvas2D meldet CPU-Ausgabe korrekt.

**Diagnose** zeigt echte Atlas-/Import-Miniaturen, Draw Calls, Batch-Unterbrechungen, Overdraw, Texturspeicher und Maßnahmen. **Klassifikation: Automatisch, nur Editor.** Details: `docs/MATERIALS_EFFECTS_5_5.md` und `docs/PARTICLES_POST_5_5.md`.

## Nova_A 5.7 — Weltstudio

Öffne das untere Panel und wähle **Weltstudio**. **Klassifikation: Manuelles Authoring, automatische Laufzeitdiagnose, objekt-/projektweit, umkehrbar.** Navigation bietet Grid/Polygon, A*, HierarchicalAStar und FlowField. Bearbeite Polygon, Zell-/Clustergröße, Kosten, Ebene, Links und Kostenbereiche und starte dann **Navigation backen**. Agenten und Hindernisse gehören an ihre jeweiligen Objekte. Pending bedeutet begrenzte Zurückstellung, Unreachable einen unmöglichen Pfad; Abbrechen meldet keinen Teilerfolg.

Für KI: offizielles Paket aktivieren, BehaviorTree2D hinzufügen und ein v2-Asset erstellen. Die Vorlage nimmt `player`-Tags wahr, schreibt `target.count/uuid/distance` ins Blackboard und wählt den stabil höchsten Nutzwert. Play zeigt Knoten, Blackboard, Wahrnehmung und Bewertungen. V1 bleibt kompatibel; 10.000 Objekte und 2.048 fällige Ticks pro Frame sind harte Grenzen.

WorldChunk2D kommt an einen Zellbesitzer; Inhalte werden untergeordnet. Lade-/Entlade-/Vorladedistanz, Abhängigkeiten, Cache, Szene, Speicher und Speicherschlüssel konfigurieren. Die vollständige Abhängigkeitsgruppe muss ins Budget passen. Deaktivierung erfasst Zustand, Transform und Geschwindigkeit; Aktivierung stellt sie wieder her. TileMap-Regeln/Brushes bleiben deterministisch, Szenen-/Prefab-Kacheln streamen zur Laufzeit, und der abbrechbare Hintergrund-Bake zeigt einen Artefakt-Hash. Details: `docs/WORLDS_NAVIGATION_AI_5_7.md`.

## Nova_A 5.8 — Netzwerkstudio

Öffne das untere Panel und wähle **Netzwerkstudio**. **Klassifikation: optionales Paket; manuelles Projekt-Authoring; ausdrückliche Berechtigung; automatische Fixed-Step-Laufzeit; projektweit.** Paket installieren, Zugriff prüfen/erlauben, Projekt aktivieren und lokale Lobby oder Direktverbindung wählen. Beim Öffnen von Projekt oder Panel startet keine Verbindung. Die lokale Lobby bleibt im selben Origin und kontaktiert keine Nova_A-Cloud; Direktverbindung nutzt nur den eingetragenen WebSocket-/UDP-Endpunkt.

Unter **Protokoll** gehören Transform-/Eingabe-Snapshots auf unzuverlässig sequenzierte und Lebenszyklus-/RPC-Ereignisse auf zuverlässig geordnete Kanäle. Kanal und Projekt begrenzen Bytes, Rate, Priorität, Paket, Warteschlange, Wiederholungen und Bandbreite. Jede RPC wird manuell mit Richtung, Aufruferautorität, Payload-Schema, Bytes und Aufrufen/Sekunde definiert. Rhai/Visual Graph verwendet `network_rpc(name, payload)` nur über diesen Vertrag; Empfang erzeugt `network.<name>`. Rohe Sockets oder Zugangsdaten sind nicht verfügbar.

Unter **Replikation** ein Objekt ausdrücklich hinzufügen, Server-/Besitzerautorität wählen und nur Transform, Rotation oder Geschwindigkeit aktivieren. Snapshot-Rate, Interpolation, Vorhersage und Abgleichschwelle steuern den Laufzeitpfad. Eingabe und Physik-Prüfsumme werden pro Fixed Step im Rollback-Fenster gespeichert; Diagnose zeigt Abweichung, Rollback und erneut abgespielte Eingaben.

Unter **Simulation & Replay** deterministische Latenz, Jitter, Verlust, Duplikate, Reihenfolge und Seed einstellen. Verbunden aufnehmen und zwei Assets vergleichen, um den ersten abweichenden Tick zu finden. Ein Multiplayer-Speicherstand enthält nur ausdrücklich replizierten Zustand und wird per Prüfsumme validiert. **Diagnose** zeigt Pakete, Bytes, Bandbreite, Ablehnungen, Wiederholungen, spätes Beitreten und Korrekturen; Export bleibt lokal und bereinigt. Headless-Autorität erfordert Desktop, Server/Host, Native UDP, Paket und Berechtigung. Details: `docs/NETWORKING_REPLAY_5_8.md`.

## Nova_A 5.9 — Ökosystem-Studio und Plattformauslieferung

Öffne den unteren Dock und wähle **Ökosystem-Studio**. **Klassifikation: unterstützt/manuell, nur Editor, projektweit, bis Installation/Vertrauen umkehrbar, berechtigungspflichtig.** Erweiterungen zeigt API-Matrix, Manifeste und Beiträge. Laden startet nur aktive WASM-Module; Neuladen erzeugt eine neue Generation; Entladen ruft Shutdown auf. Sicherheitsmodus überspringt Drittanbieter. Fehler oder Zeit-/Speicherüberschreitungen werden pro Modul isoliert.

Ein Plugin deklariert nur benötigte Rechte für Docks, Inspektoren, Importer, Komponenten, Graphknoten, Render-Pässe, Build-Schritte, Vorlagen, Befehle oder Einstellungen. Der `entry` eines Graphknotens benennt einen stabilen Rhai-API-2-Aufruf. Nativer Code verwendet ein separates ABI-1-Manifest mit Plattform-/Architektur-Hashes, Sidecar-Isolation, Heartbeat/Neustart und Einzelrechten. Nova_A erzeugt nur einen Plan mit `implicitExecution:false` und startet keine Binärdatei automatisch.

Im **Paketlabor** Reverse-Domain-ID, SemVer, Herausgeber, Archiv-SHA-256, Lizenz sowie HTTPS-Dokumentation/Sicherheitsseite eintragen. Die kanonische Anfrage extern mit Ed25519 signieren; niemals einen privaten Schlüssel einfügen. Öffentlichen Schlüssel und Base64-Signatur prüfen und Zertifizierung starten. Unsichere Pfade, versteckte Programme, unbekannte Rechte, Archivbomben, mehr als 50.000 Dateien oder über 512 MB werden blockiert. Registry-Import/-Export bleibt offline und enthält nur Manifeste.

**Exportvorlagen** zeigt Ziel, Architektur, Laufzeit und Nachweisgrenzen. Windows/Web sind lokal verfügbar; saubere Fremdmaschine und Signatur bleiben extern. Linux/macOS benötigen den passenden Host; Android bleibt bis zu allen SDK-/Vorlagen-/Signatur-/Geräte-/Installations-/Eingabe-/Audioprüfungen blockiert. In **Auslieferung** sind Cache-Schlüssel deterministisch, Delta-Builds an Patch-Manifeste gebunden und Remote-/Befehlsverbinder berechtigungspflichtig. Plan vorbereiten führt nichts aus und greift nicht auf das Netzwerk zu. Siehe `docs/EXTENSIONS_PLATFORM_DELIVERY_5_9.md`.

<!-- NOVA_V6_TEACHING_START -->
# Nova_A 6.0 aufgabenorientiertes Lehrhandbuch

Lernen durch echte Aufgaben. Jede öffentliche Funktion erklärt Zuständigkeit, Speicherung, Wiederherstellung, Barrierefreiheit und Release-Verhalten.

- Engine: **6.0.0**
- Stable contracts: Project Format 2/schema 29; Rhai API 2; Graph Format 1; Plugin API 2; Package Manifest 1; Build CLI 1; workspace document 3.
- External signing, independent clean-machine evidence, two-machine reproduction, matching-host builds and a real 72-hour soak remain pending until independently captured.

## Vollständige geführte Projekte

- [Complete Snake game](#task-snake-complete-snake-game)
- [Complete platformer](#task-platformer-complete-platformer)
- [Complete top-down game](#task-top-down-complete-top-down-game)
- [Physics puzzle with rope and joints](#task-physics-puzzle-physics-puzzle-with-rope-and-joints)
- [Localized responsive menu](#task-menu-localized-responsive-menu)
- [Animation and cutscene](#task-cutscene-animation-and-cutscene)
- [TileMap streamed world](#task-tilemap-tilemap-streamed-world)
- [Save and checkpoint workflow](#task-save-save-and-checkpoint-workflow)
- [Package and plugin workflow](#task-package-package-and-plugin-workflow)
- [Local network sample](#task-network-local-network-sample)
- [Windows portable export](#task-windows-windows-portable-export)
- [Web deployment](#task-web-web-deployment)

## Project Manager

<a id="project-manager-create-project"></a>

### Create project

**Klassifikation:** Assisted · Project-wide · Reversible

**Zweck und Einsatz:** Create project im Bereich Project Manager erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Launcher. Verwenden, wenn das Projekt Create project benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A writable project folder
- A supported .nova/.json document for import or migration

**Exakter Ablauf:**

1. Launcher und danach Project Manager öffnen.
2. Create project wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Create project ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Create project wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Create project mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Create project konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Create project ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="project-manager-open-project"></a>

### Open project

**Klassifikation:** Assisted · Project-wide · Reversible

**Zweck und Einsatz:** Open project im Bereich Project Manager erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Launcher. Verwenden, wenn das Projekt Open project benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A writable project folder
- A supported .nova/.json document for import or migration

**Exakter Ablauf:**

1. Launcher und danach Project Manager öffnen.
2. Open project wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Open project ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Open project wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Open project mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Open project konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Open project ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="project-manager-add-existing-project"></a>

### Add existing project

**Klassifikation:** Assisted · Project-wide · Reversible

**Zweck und Einsatz:** Add existing project im Bereich Project Manager erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Launcher. Verwenden, wenn das Projekt Add existing project benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A writable project folder
- A supported .nova/.json document for import or migration

**Exakter Ablauf:**

1. Launcher und danach Project Manager öffnen.
2. Add existing project wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Add existing project ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Add existing project wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Add existing project mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Add existing project konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Add existing project ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="project-manager-import-archive"></a>

### Import archive

**Klassifikation:** Assisted · Project-wide · Reversible

**Zweck und Einsatz:** Import archive im Bereich Project Manager erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Launcher. Verwenden, wenn das Projekt Import archive benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A writable project folder
- A supported .nova/.json document for import or migration

**Exakter Ablauf:**

1. Launcher und danach Project Manager öffnen.
2. Import archive wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Import archive ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Import archive wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Import archive mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Import archive konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Import archive ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="project-manager-migration-preflight"></a>

### Migration preflight

**Klassifikation:** Assisted · Project-wide · Reversible

**Zweck und Einsatz:** Migration preflight im Bereich Project Manager erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Launcher. Verwenden, wenn das Projekt Migration preflight benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A writable project folder
- A supported .nova/.json document for import or migration

**Exakter Ablauf:**

1. Launcher und danach Project Manager öffnen.
2. Migration preflight wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Migration preflight ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Migration preflight wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Migration preflight mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Migration preflight konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Migration preflight ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="project-manager-rollback-download"></a>

### Rollback download

**Klassifikation:** Assisted · Project-wide · Reversible

**Zweck und Einsatz:** Rollback download im Bereich Project Manager erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Launcher. Verwenden, wenn das Projekt Rollback download benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A writable project folder
- A supported .nova/.json document for import or migration

**Exakter Ablauf:**

1. Launcher und danach Project Manager öffnen.
2. Rollback download wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Rollback download ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Rollback download wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Rollback download mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Rollback download konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Rollback download ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="project-manager-recent-projects"></a>

### Recent projects

**Klassifikation:** Assisted · Project-wide · Reversible

**Zweck und Einsatz:** Recent projects im Bereich Project Manager erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Launcher. Verwenden, wenn das Projekt Recent projects benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A writable project folder
- A supported .nova/.json document for import or migration

**Exakter Ablauf:**

1. Launcher und danach Project Manager öffnen.
2. Recent projects wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Recent projects ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Recent projects wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Recent projects mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Recent projects konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Recent projects ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="project-manager-project-templates"></a>

### Project templates

**Klassifikation:** Assisted · Project-wide · Reversible

**Zweck und Einsatz:** Project templates im Bereich Project Manager erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Launcher. Verwenden, wenn das Projekt Project templates benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A writable project folder
- A supported .nova/.json document for import or migration

**Exakter Ablauf:**

1. Launcher und danach Project Manager öffnen.
2. Project templates wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Project templates ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Project templates wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Project templates mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Project templates konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Project templates ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A


## Workspace Bar

<a id="workspaces-design-workspace"></a>

### Design workspace

**Klassifikation:** Manual · Editor-only · Reversible

**Zweck und Einsatz:** Design workspace im Bereich Workspace Bar erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich All. Verwenden, wenn das Projekt Design workspace benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An open project

**Exakter Ablauf:**

1. All und danach Workspace Bar öffnen.
2. Design workspace wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Design workspace ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Design workspace wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Design workspace mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Design workspace konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Design workspace ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="workspaces-script-workspace"></a>

### Script workspace

**Klassifikation:** Manual · Editor-only · Reversible

**Zweck und Einsatz:** Script workspace im Bereich Workspace Bar erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich All. Verwenden, wenn das Projekt Script workspace benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An open project

**Exakter Ablauf:**

1. All und danach Workspace Bar öffnen.
2. Script workspace wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Script workspace ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Script workspace wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Script workspace mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Script workspace konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Script workspace ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="workspaces-animation-workspace"></a>

### Animation workspace

**Klassifikation:** Manual · Editor-only · Reversible

**Zweck und Einsatz:** Animation workspace im Bereich Workspace Bar erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich All. Verwenden, wenn das Projekt Animation workspace benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An open project

**Exakter Ablauf:**

1. All und danach Workspace Bar öffnen.
2. Animation workspace wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Animation workspace ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Animation workspace wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Animation workspace mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Animation workspace konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Animation workspace ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="workspaces-interface-workspace"></a>

### Interface workspace

**Klassifikation:** Manual · Editor-only · Reversible

**Zweck und Einsatz:** Interface workspace im Bereich Workspace Bar erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich All. Verwenden, wenn das Projekt Interface workspace benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An open project

**Exakter Ablauf:**

1. All und danach Workspace Bar öffnen.
2. Interface workspace wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Interface workspace ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Interface workspace wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Interface workspace mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Interface workspace konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Interface workspace ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="workspaces-debug-workspace"></a>

### Debug workspace

**Klassifikation:** Manual · Editor-only · Reversible

**Zweck und Einsatz:** Debug workspace im Bereich Workspace Bar erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich All. Verwenden, wenn das Projekt Debug workspace benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An open project

**Exakter Ablauf:**

1. All und danach Workspace Bar öffnen.
2. Debug workspace wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Debug workspace ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Debug workspace wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Debug workspace mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Debug workspace konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Debug workspace ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="workspaces-manage-workspace"></a>

### Manage workspace

**Klassifikation:** Manual · Editor-only · Reversible

**Zweck und Einsatz:** Manage workspace im Bereich Workspace Bar erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich All. Verwenden, wenn das Projekt Manage workspace benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An open project

**Exakter Ablauf:**

1. All und danach Workspace Bar öffnen.
2. Manage workspace wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Manage workspace ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Manage workspace wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Manage workspace mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Manage workspace konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Manage workspace ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="workspaces-dock-and-float-panels"></a>

### Dock and float panels

**Klassifikation:** Manual · Editor-only · Reversible

**Zweck und Einsatz:** Dock and float panels im Bereich Workspace Bar erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich All. Verwenden, wenn das Projekt Dock and float panels benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An open project

**Exakter Ablauf:**

1. All und danach Workspace Bar öffnen.
2. Dock and float panels wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Dock and float panels ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Dock and float panels wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Dock and float panels mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Dock and float panels konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Dock and float panels ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="workspaces-saved-layouts"></a>

### Saved layouts

**Klassifikation:** Manual · Editor-only · Reversible

**Zweck und Einsatz:** Saved layouts im Bereich Workspace Bar erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich All. Verwenden, wenn das Projekt Saved layouts benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An open project

**Exakter Ablauf:**

1. All und danach Workspace Bar öffnen.
2. Saved layouts wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Saved layouts ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Saved layouts wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Saved layouts mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Saved layouts konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Saved layouts ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="workspaces-focus-mode"></a>

### Focus mode

**Klassifikation:** Manual · Editor-only · Reversible

**Zweck und Einsatz:** Focus mode im Bereich Workspace Bar erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich All. Verwenden, wenn das Projekt Focus mode benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An open project

**Exakter Ablauf:**

1. All und danach Workspace Bar öffnen.
2. Focus mode wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Focus mode ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Focus mode wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Focus mode mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Focus mode konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Focus mode ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="workspaces-navigation-history"></a>

### Navigation history

**Klassifikation:** Manual · Editor-only · Reversible

**Zweck und Einsatz:** Navigation history im Bereich Workspace Bar erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich All. Verwenden, wenn das Projekt Navigation history benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An open project

**Exakter Ablauf:**

1. All und danach Workspace Bar öffnen.
2. Navigation history wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Navigation history ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Navigation history wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Navigation history mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Navigation history konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Navigation history ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="workspaces-command-palette"></a>

### Command Palette

**Klassifikation:** Manual · Editor-only · Reversible

**Zweck und Einsatz:** Command Palette im Bereich Workspace Bar erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich All. Verwenden, wenn das Projekt Command Palette benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An open project

**Exakter Ablauf:**

1. All und danach Workspace Bar öffnen.
2. Command Palette wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Command Palette ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Command Palette wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Command Palette mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Command Palette konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Command Palette ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="workspaces-shortcut-editor"></a>

### Shortcut Editor

**Klassifikation:** Manual · Editor-only · Reversible

**Zweck und Einsatz:** Shortcut Editor im Bereich Workspace Bar erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich All. Verwenden, wenn das Projekt Shortcut Editor benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An open project

**Exakter Ablauf:**

1. All und danach Workspace Bar öffnen.
2. Shortcut Editor wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Shortcut Editor ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Shortcut Editor wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Shortcut Editor mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Shortcut Editor konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Shortcut Editor ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A


## Hierarchy

<a id="hierarchy-search-and-filters"></a>

### Search and filters

**Klassifikation:** Manual · Editor-only · Reversible · Per-object

**Zweck und Einsatz:** Search and filters im Bereich Hierarchy erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Search and filters benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An open scene

**Exakter Ablauf:**

1. Design und danach Hierarchy öffnen.
2. Search and filters wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Search and filters ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Search and filters wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Search and filters mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Search and filters konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Search and filters ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="hierarchy-virtualized-10-000-object-list"></a>

### Virtualized 10,000-object list

**Klassifikation:** Manual · Editor-only · Reversible · Per-object

**Zweck und Einsatz:** Virtualized 10,000-object list im Bereich Hierarchy erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Virtualized 10,000-object list benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An open scene

**Exakter Ablauf:**

1. Design und danach Hierarchy öffnen.
2. Virtualized 10,000-object list wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Virtualized 10,000-object list ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Virtualized 10,000-object list wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Virtualized 10,000-object list mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Virtualized 10,000-object list konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Virtualized 10,000-object list ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="hierarchy-multi-selection"></a>

### Multi-selection

**Klassifikation:** Manual · Editor-only · Reversible · Per-object

**Zweck und Einsatz:** Multi-selection im Bereich Hierarchy erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Multi-selection benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An open scene

**Exakter Ablauf:**

1. Design und danach Hierarchy öffnen.
2. Multi-selection wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Multi-selection ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Multi-selection wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Multi-selection mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Multi-selection konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Multi-selection ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="hierarchy-rename"></a>

### Rename

**Klassifikation:** Manual · Editor-only · Reversible · Per-object

**Zweck und Einsatz:** Rename im Bereich Hierarchy erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Rename benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An open scene

**Exakter Ablauf:**

1. Design und danach Hierarchy öffnen.
2. Rename wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Rename ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Rename wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Rename mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Rename konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Rename ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="hierarchy-duplicate"></a>

### Duplicate

**Klassifikation:** Manual · Editor-only · Reversible · Per-object

**Zweck und Einsatz:** Duplicate im Bereich Hierarchy erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Duplicate benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An open scene

**Exakter Ablauf:**

1. Design und danach Hierarchy öffnen.
2. Duplicate wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Duplicate ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Duplicate wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Duplicate mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Duplicate konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Duplicate ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="hierarchy-group"></a>

### Group

**Klassifikation:** Manual · Editor-only · Reversible · Per-object

**Zweck und Einsatz:** Group im Bereich Hierarchy erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Group benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An open scene

**Exakter Ablauf:**

1. Design und danach Hierarchy öffnen.
2. Group wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Group ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Group wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Group mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Group konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Group ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="hierarchy-reparent"></a>

### Reparent

**Klassifikation:** Manual · Editor-only · Reversible · Per-object

**Zweck und Einsatz:** Reparent im Bereich Hierarchy erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Reparent benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An open scene

**Exakter Ablauf:**

1. Design und danach Hierarchy öffnen.
2. Reparent wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Reparent ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Reparent wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Reparent mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Reparent konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Reparent ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="hierarchy-reorder"></a>

### Reorder

**Klassifikation:** Manual · Editor-only · Reversible · Per-object

**Zweck und Einsatz:** Reorder im Bereich Hierarchy erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Reorder benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An open scene

**Exakter Ablauf:**

1. Design und danach Hierarchy öffnen.
2. Reorder wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Reorder ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Reorder wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Reorder mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Reorder konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Reorder ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="hierarchy-lock"></a>

### Lock

**Klassifikation:** Manual · Editor-only · Reversible · Per-object

**Zweck und Einsatz:** Lock im Bereich Hierarchy erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Lock benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An open scene

**Exakter Ablauf:**

1. Design und danach Hierarchy öffnen.
2. Lock wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Lock ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Lock wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Lock mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Lock konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Lock ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="hierarchy-hide"></a>

### Hide

**Klassifikation:** Manual · Editor-only · Reversible · Per-object

**Zweck und Einsatz:** Hide im Bereich Hierarchy erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Hide benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An open scene

**Exakter Ablauf:**

1. Design und danach Hierarchy öffnen.
2. Hide wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Hide ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Hide wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Hide mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Hide konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Hide ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="hierarchy-isolate"></a>

### Isolate

**Klassifikation:** Manual · Editor-only · Reversible · Per-object

**Zweck und Einsatz:** Isolate im Bereich Hierarchy erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Isolate benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An open scene

**Exakter Ablauf:**

1. Design und danach Hierarchy öffnen.
2. Isolate wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Isolate ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Isolate wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Isolate mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Isolate konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Isolate ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="hierarchy-breadcrumbs"></a>

### Breadcrumbs

**Klassifikation:** Manual · Editor-only · Reversible · Per-object

**Zweck und Einsatz:** Breadcrumbs im Bereich Hierarchy erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Breadcrumbs benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An open scene

**Exakter Ablauf:**

1. Design und danach Hierarchy öffnen.
2. Breadcrumbs wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Breadcrumbs ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Breadcrumbs wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Breadcrumbs mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Breadcrumbs konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Breadcrumbs ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="hierarchy-scene-tabs"></a>

### Scene tabs

**Klassifikation:** Manual · Editor-only · Reversible · Per-object

**Zweck und Einsatz:** Scene tabs im Bereich Hierarchy erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Scene tabs benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An open scene

**Exakter Ablauf:**

1. Design und danach Hierarchy öffnen.
2. Scene tabs wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Scene tabs ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Scene tabs wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Scene tabs mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Scene tabs konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Scene tabs ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="hierarchy-additive-and-overlay-loading"></a>

### Additive and overlay loading

**Klassifikation:** Manual · Editor-only · Reversible · Per-object

**Zweck und Einsatz:** Additive and overlay loading im Bereich Hierarchy erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Additive and overlay loading benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An open scene

**Exakter Ablauf:**

1. Design und danach Hierarchy öffnen.
2. Additive and overlay loading wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Additive and overlay loading ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Additive and overlay loading wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Additive and overlay loading mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Additive and overlay loading konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Additive and overlay loading ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A


## Scene View

<a id="viewport-select"></a>

### Select

**Klassifikation:** Manual · Editor-only · Reversible · Per-object

**Zweck und Einsatz:** Select im Bereich Scene View erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Select benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An editable scene
- At least one object for transform tools

**Exakter Ablauf:**

1. Design und danach Scene View öffnen.
2. Select wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Select ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Select wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Select mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Select konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Select ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="viewport-move"></a>

### Move

**Klassifikation:** Manual · Editor-only · Reversible · Per-object

**Zweck und Einsatz:** Move im Bereich Scene View erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Move benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An editable scene
- At least one object for transform tools

**Exakter Ablauf:**

1. Design und danach Scene View öffnen.
2. Move wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Move ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Move wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Move mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Move konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Move ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="viewport-rotate"></a>

### Rotate

**Klassifikation:** Manual · Editor-only · Reversible · Per-object

**Zweck und Einsatz:** Rotate im Bereich Scene View erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Rotate benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An editable scene
- At least one object for transform tools

**Exakter Ablauf:**

1. Design und danach Scene View öffnen.
2. Rotate wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Rotate ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Rotate wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Rotate mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Rotate konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Rotate ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="viewport-scale"></a>

### Scale

**Klassifikation:** Manual · Editor-only · Reversible · Per-object

**Zweck und Einsatz:** Scale im Bereich Scene View erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Scale benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An editable scene
- At least one object for transform tools

**Exakter Ablauf:**

1. Design und danach Scene View öffnen.
2. Scale wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Scale ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Scale wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Scale mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Scale konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Scale ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="viewport-pivot"></a>

### Pivot

**Klassifikation:** Manual · Editor-only · Reversible · Per-object

**Zweck und Einsatz:** Pivot im Bereich Scene View erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Pivot benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An editable scene
- At least one object for transform tools

**Exakter Ablauf:**

1. Design und danach Scene View öffnen.
2. Pivot wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Pivot ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Pivot wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Pivot mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Pivot konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Pivot ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="viewport-rectangle-tool"></a>

### Rectangle tool

**Klassifikation:** Manual · Editor-only · Reversible · Per-object

**Zweck und Einsatz:** Rectangle tool im Bereich Scene View erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Rectangle tool benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An editable scene
- At least one object for transform tools

**Exakter Ablauf:**

1. Design und danach Scene View öffnen.
2. Rectangle tool wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Rectangle tool ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Rectangle tool wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Rectangle tool mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Rectangle tool konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Rectangle tool ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="viewport-polygon-tool"></a>

### Polygon tool

**Klassifikation:** Manual · Editor-only · Reversible · Per-object

**Zweck und Einsatz:** Polygon tool im Bereich Scene View erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Polygon tool benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An editable scene
- At least one object for transform tools

**Exakter Ablauf:**

1. Design und danach Scene View öffnen.
2. Polygon tool wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Polygon tool ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Polygon tool wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Polygon tool mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Polygon tool konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Polygon tool ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="viewport-path-tool"></a>

### Path tool

**Klassifikation:** Manual · Editor-only · Reversible · Per-object

**Zweck und Einsatz:** Path tool im Bereich Scene View erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Path tool benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An editable scene
- At least one object for transform tools

**Exakter Ablauf:**

1. Design und danach Scene View öffnen.
2. Path tool wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Path tool ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Path tool wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Path tool mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Path tool konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Path tool ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="viewport-collider-tool"></a>

### Collider tool

**Klassifikation:** Manual · Editor-only · Reversible · Per-object

**Zweck und Einsatz:** Collider tool im Bereich Scene View erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Collider tool benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An editable scene
- At least one object for transform tools

**Exakter Ablauf:**

1. Design und danach Scene View öffnen.
2. Collider tool wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Collider tool ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Collider tool wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Collider tool mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Collider tool konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Collider tool ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="viewport-ruler"></a>

### Ruler

**Klassifikation:** Manual · Editor-only · Reversible · Per-object

**Zweck und Einsatz:** Ruler im Bereich Scene View erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Ruler benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An editable scene
- At least one object for transform tools

**Exakter Ablauf:**

1. Design und danach Scene View öffnen.
2. Ruler wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Ruler ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Ruler wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Ruler mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Ruler konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Ruler ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="viewport-grid-snapping"></a>

### Grid snapping

**Klassifikation:** Manual · Editor-only · Reversible · Per-object

**Zweck und Einsatz:** Grid snapping im Bereich Scene View erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Grid snapping benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An editable scene
- At least one object for transform tools

**Exakter Ablauf:**

1. Design und danach Scene View öffnen.
2. Grid snapping wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Grid snapping ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Grid snapping wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Grid snapping mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Grid snapping konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Grid snapping ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="viewport-pixel-snapping"></a>

### Pixel snapping

**Klassifikation:** Manual · Editor-only · Reversible · Per-object

**Zweck und Einsatz:** Pixel snapping im Bereich Scene View erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Pixel snapping benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An editable scene
- At least one object for transform tools

**Exakter Ablauf:**

1. Design und danach Scene View öffnen.
2. Pixel snapping wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Pixel snapping ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Pixel snapping wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Pixel snapping mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Pixel snapping konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Pixel snapping ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="viewport-vertex-snapping"></a>

### Vertex snapping

**Klassifikation:** Manual · Editor-only · Reversible · Per-object

**Zweck und Einsatz:** Vertex snapping im Bereich Scene View erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Vertex snapping benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An editable scene
- At least one object for transform tools

**Exakter Ablauf:**

1. Design und danach Scene View öffnen.
2. Vertex snapping wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Vertex snapping ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Vertex snapping wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Vertex snapping mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Vertex snapping konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Vertex snapping ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="viewport-edge-snapping"></a>

### Edge snapping

**Klassifikation:** Manual · Editor-only · Reversible · Per-object

**Zweck und Einsatz:** Edge snapping im Bereich Scene View erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Edge snapping benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An editable scene
- At least one object for transform tools

**Exakter Ablauf:**

1. Design und danach Scene View öffnen.
2. Edge snapping wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Edge snapping ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Edge snapping wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Edge snapping mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Edge snapping konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Edge snapping ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="viewport-center-snapping"></a>

### Center snapping

**Klassifikation:** Manual · Editor-only · Reversible · Per-object

**Zweck und Einsatz:** Center snapping im Bereich Scene View erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Center snapping benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An editable scene
- At least one object for transform tools

**Exakter Ablauf:**

1. Design und danach Scene View öffnen.
2. Center snapping wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Center snapping ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Center snapping wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Center snapping mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Center snapping konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Center snapping ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="viewport-angle-snapping"></a>

### Angle snapping

**Klassifikation:** Manual · Editor-only · Reversible · Per-object

**Zweck und Einsatz:** Angle snapping im Bereich Scene View erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Angle snapping benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An editable scene
- At least one object for transform tools

**Exakter Ablauf:**

1. Design und danach Scene View öffnen.
2. Angle snapping wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Angle snapping ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Angle snapping wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Angle snapping mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Angle snapping konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Angle snapping ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="viewport-guides-and-rulers"></a>

### Guides and rulers

**Klassifikation:** Manual · Editor-only · Reversible · Per-object

**Zweck und Einsatz:** Guides and rulers im Bereich Scene View erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Guides and rulers benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An editable scene
- At least one object for transform tools

**Exakter Ablauf:**

1. Design und danach Scene View öffnen.
2. Guides and rulers wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Guides and rulers ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Guides and rulers wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Guides and rulers mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Guides and rulers konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Guides and rulers ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="viewport-alignment-and-distribution"></a>

### Alignment and distribution

**Klassifikation:** Manual · Editor-only · Reversible · Per-object

**Zweck und Einsatz:** Alignment and distribution im Bereich Scene View erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Alignment and distribution benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An editable scene
- At least one object for transform tools

**Exakter Ablauf:**

1. Design und danach Scene View öffnen.
2. Alignment and distribution wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Alignment and distribution ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Alignment and distribution wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Alignment and distribution mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Alignment and distribution konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Alignment and distribution ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="viewport-mirror"></a>

### Mirror

**Klassifikation:** Manual · Editor-only · Reversible · Per-object

**Zweck und Einsatz:** Mirror im Bereich Scene View erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Mirror benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An editable scene
- At least one object for transform tools

**Exakter Ablauf:**

1. Design und danach Scene View öffnen.
2. Mirror wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Mirror ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Mirror wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Mirror mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Mirror konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Mirror ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="viewport-camera-framing"></a>

### Camera framing

**Klassifikation:** Manual · Editor-only · Reversible · Per-object

**Zweck und Einsatz:** Camera framing im Bereich Scene View erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Camera framing benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An editable scene
- At least one object for transform tools

**Exakter Ablauf:**

1. Design und danach Scene View öffnen.
2. Camera framing wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Camera framing ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Camera framing wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Camera framing mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Camera framing konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Camera framing ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A


## Inspector

<a id="inspector-transform2d"></a>

### Transform2D

**Klassifikation:** Manual · Assisted · Reversible · Per-object

**Zweck und Einsatz:** Transform2D im Bereich Inspector erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Transform2D benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- One or more selected objects

**Exakter Ablauf:**

1. Design und danach Inspector öffnen.
2. Transform2D wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Transform2D ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Transform2D wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Transform2D mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Transform2D konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Transform2D ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="inspector-renderer-components"></a>

### Renderer components

**Klassifikation:** Manual · Assisted · Reversible · Per-object

**Zweck und Einsatz:** Renderer components im Bereich Inspector erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Renderer components benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- One or more selected objects

**Exakter Ablauf:**

1. Design und danach Inspector öffnen.
2. Renderer components wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Renderer components ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Renderer components wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Renderer components mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Renderer components konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Renderer components ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="inspector-physics-components"></a>

### Physics components

**Klassifikation:** Manual · Assisted · Reversible · Per-object

**Zweck und Einsatz:** Physics components im Bereich Inspector erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Physics components benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- One or more selected objects

**Exakter Ablauf:**

1. Design und danach Inspector öffnen.
2. Physics components wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Physics components ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Physics components wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Physics components mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Physics components konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Physics components ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="inspector-gameplay-components"></a>

### Gameplay components

**Klassifikation:** Manual · Assisted · Reversible · Per-object

**Zweck und Einsatz:** Gameplay components im Bereich Inspector erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Gameplay components benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- One or more selected objects

**Exakter Ablauf:**

1. Design und danach Inspector öffnen.
2. Gameplay components wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Gameplay components ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Gameplay components wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Gameplay components mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Gameplay components konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Gameplay components ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="inspector-ui-components"></a>

### UI components

**Klassifikation:** Manual · Assisted · Reversible · Per-object

**Zweck und Einsatz:** UI components im Bereich Inspector erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt UI components benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- One or more selected objects

**Exakter Ablauf:**

1. Design und danach Inspector öffnen.
2. UI components wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** UI components ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** UI components wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- UI components mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, UI components konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für UI components ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="inspector-audio-components"></a>

### Audio components

**Klassifikation:** Manual · Assisted · Reversible · Per-object

**Zweck und Einsatz:** Audio components im Bereich Inspector erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Audio components benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- One or more selected objects

**Exakter Ablauf:**

1. Design und danach Inspector öffnen.
2. Audio components wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Audio components ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Audio components wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Audio components mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Audio components konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Audio components ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="inspector-script2d"></a>

### Script2D

**Klassifikation:** Manual · Assisted · Reversible · Per-object

**Zweck und Einsatz:** Script2D im Bereich Inspector erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Script2D benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- One or more selected objects

**Exakter Ablauf:**

1. Design und danach Inspector öffnen.
2. Script2D wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Script2D ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Script2D wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Script2D mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Script2D konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Script2D ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="inspector-multi-edit-mixed-values"></a>

### Multi-edit mixed values

**Klassifikation:** Manual · Assisted · Reversible · Per-object

**Zweck und Einsatz:** Multi-edit mixed values im Bereich Inspector erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Multi-edit mixed values benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- One or more selected objects

**Exakter Ablauf:**

1. Design und danach Inspector öffnen.
2. Multi-edit mixed values wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Multi-edit mixed values ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Multi-edit mixed values wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Multi-edit mixed values mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Multi-edit mixed values konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Multi-edit mixed values ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="inspector-property-expressions"></a>

### Property expressions

**Klassifikation:** Manual · Assisted · Reversible · Per-object

**Zweck und Einsatz:** Property expressions im Bereich Inspector erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Property expressions benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- One or more selected objects

**Exakter Ablauf:**

1. Design und danach Inspector öffnen.
2. Property expressions wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Property expressions ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Property expressions wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Property expressions mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Property expressions konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Property expressions ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="inspector-property-search"></a>

### Property search

**Klassifikation:** Manual · Assisted · Reversible · Per-object

**Zweck und Einsatz:** Property search im Bereich Inspector erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Property search benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- One or more selected objects

**Exakter Ablauf:**

1. Design und danach Inspector öffnen.
2. Property search wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Property search ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Property search wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Property search mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Property search konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Property search ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="inspector-changed-only-filter"></a>

### Changed-only filter

**Klassifikation:** Manual · Assisted · Reversible · Per-object

**Zweck und Einsatz:** Changed-only filter im Bereich Inspector erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Changed-only filter benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- One or more selected objects

**Exakter Ablauf:**

1. Design und danach Inspector öffnen.
2. Changed-only filter wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Changed-only filter ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Changed-only filter wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Changed-only filter mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Changed-only filter konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Changed-only filter ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="inspector-pinned-properties"></a>

### Pinned properties

**Klassifikation:** Manual · Assisted · Reversible · Per-object

**Zweck und Einsatz:** Pinned properties im Bereich Inspector erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Pinned properties benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- One or more selected objects

**Exakter Ablauf:**

1. Design und danach Inspector öffnen.
2. Pinned properties wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Pinned properties ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Pinned properties wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Pinned properties mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Pinned properties konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Pinned properties ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="inspector-reset-and-copy-paste"></a>

### Reset and copy/paste

**Klassifikation:** Manual · Assisted · Reversible · Per-object

**Zweck und Einsatz:** Reset and copy/paste im Bereich Inspector erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Reset and copy/paste benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- One or more selected objects

**Exakter Ablauf:**

1. Design und danach Inspector öffnen.
2. Reset and copy/paste wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Reset and copy/paste ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Reset and copy/paste wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Reset and copy/paste mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Reset and copy/paste konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Reset and copy/paste ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="inspector-keyframe-property"></a>

### Keyframe property

**Klassifikation:** Manual · Assisted · Reversible · Per-object

**Zweck und Einsatz:** Keyframe property im Bereich Inspector erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Keyframe property benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- One or more selected objects

**Exakter Ablauf:**

1. Design und danach Inspector öffnen.
2. Keyframe property wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Keyframe property ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Keyframe property wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Keyframe property mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Keyframe property konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Keyframe property ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="inspector-component-validation"></a>

### Component validation

**Klassifikation:** Manual · Assisted · Reversible · Per-object

**Zweck und Einsatz:** Component validation im Bereich Inspector erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Component validation benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- One or more selected objects

**Exakter Ablauf:**

1. Design und danach Inspector öffnen.
2. Component validation wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Component validation ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Component validation wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Component validation mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Component validation konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Component validation ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="inspector-prefab-overrides"></a>

### Prefab overrides

**Klassifikation:** Manual · Assisted · Reversible · Per-object

**Zweck und Einsatz:** Prefab overrides im Bereich Inspector erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Prefab overrides benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- One or more selected objects

**Exakter Ablauf:**

1. Design und danach Inspector öffnen.
2. Prefab overrides wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Prefab overrides ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Prefab overrides wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Prefab overrides mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Prefab overrides konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Prefab overrides ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A


## Assets

<a id="assets-import-assets"></a>

### Import assets

**Klassifikation:** Manual · Assisted · Project-wide · Reversible

**Zweck und Einsatz:** Import assets im Bereich Assets erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Import assets benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An open project
- Source files for import operations

**Exakter Ablauf:**

1. Design und danach Assets öffnen.
2. Import assets wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Import assets ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Import assets wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Import assets mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Import assets konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Import assets ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="assets-create-scripts-and-graphs"></a>

### Create scripts and graphs

**Klassifikation:** Manual · Assisted · Project-wide · Reversible

**Zweck und Einsatz:** Create scripts and graphs im Bereich Assets erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Create scripts and graphs benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An open project
- Source files for import operations

**Exakter Ablauf:**

1. Design und danach Assets öffnen.
2. Create scripts and graphs wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Create scripts and graphs ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Create scripts and graphs wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Create scripts and graphs mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Create scripts and graphs konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Create scripts and graphs ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="assets-folders"></a>

### Folders

**Klassifikation:** Manual · Assisted · Project-wide · Reversible

**Zweck und Einsatz:** Folders im Bereich Assets erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Folders benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An open project
- Source files for import operations

**Exakter Ablauf:**

1. Design und danach Assets öffnen.
2. Folders wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Folders ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Folders wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Folders mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Folders konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Folders ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="assets-grid-and-list-views"></a>

### Grid and list views

**Klassifikation:** Manual · Assisted · Project-wide · Reversible

**Zweck und Einsatz:** Grid and list views im Bereich Assets erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Grid and list views benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An open project
- Source files for import operations

**Exakter Ablauf:**

1. Design und danach Assets öffnen.
2. Grid and list views wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Grid and list views ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Grid and list views wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Grid and list views mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Grid and list views konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Grid and list views ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="assets-search-tags-and-favorites"></a>

### Search, tags and favorites

**Klassifikation:** Manual · Assisted · Project-wide · Reversible

**Zweck und Einsatz:** Search, tags and favorites im Bereich Assets erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Search, tags and favorites benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An open project
- Source files for import operations

**Exakter Ablauf:**

1. Design und danach Assets öffnen.
2. Search, tags and favorites wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Search, tags and favorites ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Search, tags and favorites wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Search, tags and favorites mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Search, tags and favorites konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Search, tags and favorites ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="assets-collections-and-saved-filters"></a>

### Collections and saved filters

**Klassifikation:** Manual · Assisted · Project-wide · Reversible

**Zweck und Einsatz:** Collections and saved filters im Bereich Assets erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Collections and saved filters benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An open project
- Source files for import operations

**Exakter Ablauf:**

1. Design und danach Assets öffnen.
2. Collections and saved filters wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Collections and saved filters ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Collections and saved filters wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Collections and saved filters mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Collections and saved filters konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Collections and saved filters ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="assets-source-provenance"></a>

### Source provenance

**Klassifikation:** Manual · Assisted · Project-wide · Reversible

**Zweck und Einsatz:** Source provenance im Bereich Assets erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Source provenance benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An open project
- Source files for import operations

**Exakter Ablauf:**

1. Design und danach Assets öffnen.
2. Source provenance wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Source provenance ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Source provenance wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Source provenance mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Source provenance konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Source provenance ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="assets-import-presets"></a>

### Import presets

**Klassifikation:** Manual · Assisted · Project-wide · Reversible

**Zweck und Einsatz:** Import presets im Bereich Assets erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Import presets benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An open project
- Source files for import operations

**Exakter Ablauf:**

1. Design und danach Assets öffnen.
2. Import presets wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Import presets ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Import presets wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Import presets mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Import presets konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Import presets ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="assets-platform-overrides"></a>

### Platform overrides

**Klassifikation:** Manual · Assisted · Project-wide · Reversible

**Zweck und Einsatz:** Platform overrides im Bereich Assets erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Platform overrides benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An open project
- Source files for import operations

**Exakter Ablauf:**

1. Design und danach Assets öffnen.
2. Platform overrides wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Platform overrides ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Platform overrides wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Platform overrides mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Platform overrides konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Platform overrides ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="assets-reimport-and-compare"></a>

### Reimport and compare

**Klassifikation:** Manual · Assisted · Project-wide · Reversible

**Zweck und Einsatz:** Reimport and compare im Bereich Assets erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Reimport and compare benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An open project
- Source files for import operations

**Exakter Ablauf:**

1. Design und danach Assets öffnen.
2. Reimport and compare wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Reimport and compare ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Reimport and compare wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Reimport and compare mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Reimport and compare konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Reimport and compare ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="assets-reference-repair"></a>

### Reference repair

**Klassifikation:** Manual · Assisted · Project-wide · Reversible

**Zweck und Einsatz:** Reference repair im Bereich Assets erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Reference repair benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An open project
- Source files for import operations

**Exakter Ablauf:**

1. Design und danach Assets öffnen.
2. Reference repair wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Reference repair ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Reference repair wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Reference repair mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Reference repair konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Reference repair ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="assets-unused-asset-report"></a>

### Unused-asset report

**Klassifikation:** Manual · Assisted · Project-wide · Reversible

**Zweck und Einsatz:** Unused-asset report im Bereich Assets erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Unused-asset report benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An open project
- Source files for import operations

**Exakter Ablauf:**

1. Design und danach Assets öffnen.
2. Unused-asset report wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Unused-asset report ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Unused-asset report wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Unused-asset report mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Unused-asset report konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Unused-asset report ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="assets-sprite-slicing"></a>

### Sprite slicing

**Klassifikation:** Manual · Assisted · Project-wide · Reversible

**Zweck und Einsatz:** Sprite slicing im Bereich Assets erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Sprite slicing benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An open project
- Source files for import operations

**Exakter Ablauf:**

1. Design und danach Assets öffnen.
2. Sprite slicing wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Sprite slicing ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Sprite slicing wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Sprite slicing mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Sprite slicing konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Sprite slicing ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="assets-deterministic-atlases"></a>

### Deterministic atlases

**Klassifikation:** Manual · Assisted · Project-wide · Reversible

**Zweck und Einsatz:** Deterministic atlases im Bereich Assets erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Deterministic atlases benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An open project
- Source files for import operations

**Exakter Ablauf:**

1. Design und danach Assets öffnen.
2. Deterministic atlases wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Deterministic atlases ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Deterministic atlases wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Deterministic atlases mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Deterministic atlases konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Deterministic atlases ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="assets-audio-import"></a>

### Audio import

**Klassifikation:** Manual · Assisted · Project-wide · Reversible

**Zweck und Einsatz:** Audio import im Bereich Assets erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Audio import benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An open project
- Source files for import operations

**Exakter Ablauf:**

1. Design und danach Assets öffnen.
2. Audio import wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Audio import ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Audio import wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Audio import mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Audio import konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Audio import ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="assets-font-shaping-settings"></a>

### Font shaping settings

**Klassifikation:** Manual · Assisted · Project-wide · Reversible

**Zweck und Einsatz:** Font shaping settings im Bereich Assets erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Font shaping settings benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An open project
- Source files for import operations

**Exakter Ablauf:**

1. Design und danach Assets öffnen.
2. Font shaping settings wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Font shaping settings ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Font shaping settings wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Font shaping settings mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Font shaping settings konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Font shaping settings ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="assets-50-000-asset-virtual-window"></a>

### 50,000-asset virtual window

**Klassifikation:** Manual · Assisted · Project-wide · Reversible

**Zweck und Einsatz:** 50,000-asset virtual window im Bereich Assets erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt 50,000-asset virtual window benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An open project
- Source files for import operations

**Exakter Ablauf:**

1. Design und danach Assets öffnen.
2. 50,000-asset virtual window wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** 50,000-asset virtual window ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** 50,000-asset virtual window wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- 50,000-asset virtual window mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, 50,000-asset virtual window konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für 50,000-asset virtual window ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="assets-project-trash"></a>

### Project trash

**Klassifikation:** Manual · Assisted · Project-wide · Reversible

**Zweck und Einsatz:** Project trash im Bereich Assets erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Project trash benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An open project
- Source files for import operations

**Exakter Ablauf:**

1. Design und danach Assets öffnen.
2. Project trash wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Project trash ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Project trash wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Project trash mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Project trash konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Project trash ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A


## Physics Settings and Monitor

<a id="physics-rigid-bodies"></a>

### Rigid bodies

**Klassifikation:** Manual · Runtime · Per-object · Reversible

**Zweck und Einsatz:** Rigid bodies im Bereich Physics Settings and Monitor erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design / Debug. Verwenden, wenn das Projekt Rigid bodies benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Objects with physics components
- Play mode for runtime evidence

**Exakter Ablauf:**

1. Design / Debug und danach Physics Settings and Monitor öffnen.
2. Rigid bodies wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Rigid bodies ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Rigid bodies wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Rigid bodies mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Rigid bodies konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Rigid bodies ergänzen.

**Rhai-API:** `apply_force`, `apply_impulse`, `raycast`, `query_radius`

**Visual-Graph-API:** `Physics/Apply Force`, `Physics/Apply Impulse`, `Physics/Raycast`

<a id="physics-character-bodies"></a>

### Character bodies

**Klassifikation:** Manual · Runtime · Per-object · Reversible

**Zweck und Einsatz:** Character bodies im Bereich Physics Settings and Monitor erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design / Debug. Verwenden, wenn das Projekt Character bodies benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Objects with physics components
- Play mode for runtime evidence

**Exakter Ablauf:**

1. Design / Debug und danach Physics Settings and Monitor öffnen.
2. Character bodies wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Character bodies ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Character bodies wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Character bodies mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Character bodies konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Character bodies ergänzen.

**Rhai-API:** `apply_force`, `apply_impulse`, `raycast`, `query_radius`

**Visual-Graph-API:** `Physics/Apply Force`, `Physics/Apply Impulse`, `Physics/Raycast`

<a id="physics-colliders"></a>

### Colliders

**Klassifikation:** Manual · Runtime · Per-object · Reversible

**Zweck und Einsatz:** Colliders im Bereich Physics Settings and Monitor erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design / Debug. Verwenden, wenn das Projekt Colliders benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Objects with physics components
- Play mode for runtime evidence

**Exakter Ablauf:**

1. Design / Debug und danach Physics Settings and Monitor öffnen.
2. Colliders wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Colliders ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Colliders wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Colliders mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Colliders konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Colliders ergänzen.

**Rhai-API:** `apply_force`, `apply_impulse`, `raycast`, `query_radius`

**Visual-Graph-API:** `Physics/Apply Force`, `Physics/Apply Impulse`, `Physics/Raycast`

<a id="physics-sensors-and-area2d"></a>

### Sensors and Area2D

**Klassifikation:** Manual · Runtime · Per-object · Reversible

**Zweck und Einsatz:** Sensors and Area2D im Bereich Physics Settings and Monitor erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design / Debug. Verwenden, wenn das Projekt Sensors and Area2D benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Objects with physics components
- Play mode for runtime evidence

**Exakter Ablauf:**

1. Design / Debug und danach Physics Settings and Monitor öffnen.
2. Sensors and Area2D wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Sensors and Area2D ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Sensors and Area2D wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Sensors and Area2D mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Sensors and Area2D konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Sensors and Area2D ergänzen.

**Rhai-API:** `apply_force`, `apply_impulse`, `raycast`, `query_radius`

**Visual-Graph-API:** `Physics/Apply Force`, `Physics/Apply Impulse`, `Physics/Raycast`

<a id="physics-collision-layers-and-masks"></a>

### Collision layers and masks

**Klassifikation:** Manual · Runtime · Per-object · Reversible

**Zweck und Einsatz:** Collision layers and masks im Bereich Physics Settings and Monitor erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design / Debug. Verwenden, wenn das Projekt Collision layers and masks benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Objects with physics components
- Play mode for runtime evidence

**Exakter Ablauf:**

1. Design / Debug und danach Physics Settings and Monitor öffnen.
2. Collision layers and masks wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Collision layers and masks ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Collision layers and masks wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Collision layers and masks mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Collision layers and masks konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Collision layers and masks ergänzen.

**Rhai-API:** `apply_force`, `apply_impulse`, `raycast`, `query_radius`

**Visual-Graph-API:** `Physics/Apply Force`, `Physics/Apply Impulse`, `Physics/Raycast`

<a id="physics-mass-density-and-inertia"></a>

### Mass, density and inertia

**Klassifikation:** Manual · Runtime · Per-object · Reversible

**Zweck und Einsatz:** Mass, density and inertia im Bereich Physics Settings and Monitor erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design / Debug. Verwenden, wenn das Projekt Mass, density and inertia benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Objects with physics components
- Play mode for runtime evidence

**Exakter Ablauf:**

1. Design / Debug und danach Physics Settings and Monitor öffnen.
2. Mass, density and inertia wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Mass, density and inertia ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Mass, density and inertia wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Mass, density and inertia mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Mass, density and inertia konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Mass, density and inertia ergänzen.

**Rhai-API:** `apply_force`, `apply_impulse`, `raycast`, `query_radius`

**Visual-Graph-API:** `Physics/Apply Force`, `Physics/Apply Impulse`, `Physics/Raycast`

<a id="physics-forces-and-impulses"></a>

### Forces and impulses

**Klassifikation:** Manual · Runtime · Per-object · Reversible

**Zweck und Einsatz:** Forces and impulses im Bereich Physics Settings and Monitor erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design / Debug. Verwenden, wenn das Projekt Forces and impulses benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Objects with physics components
- Play mode for runtime evidence

**Exakter Ablauf:**

1. Design / Debug und danach Physics Settings and Monitor öffnen.
2. Forces and impulses wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Forces and impulses ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Forces and impulses wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Forces and impulses mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Forces and impulses konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Forces and impulses ergänzen.

**Rhai-API:** `apply_force`, `apply_impulse`, `raycast`, `query_radius`

**Visual-Graph-API:** `Physics/Apply Force`, `Physics/Apply Impulse`, `Physics/Raycast`

<a id="physics-friction-and-restitution"></a>

### Friction and restitution

**Klassifikation:** Manual · Runtime · Per-object · Reversible

**Zweck und Einsatz:** Friction and restitution im Bereich Physics Settings and Monitor erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design / Debug. Verwenden, wenn das Projekt Friction and restitution benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Objects with physics components
- Play mode for runtime evidence

**Exakter Ablauf:**

1. Design / Debug und danach Physics Settings and Monitor öffnen.
2. Friction and restitution wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Friction and restitution ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Friction and restitution wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Friction and restitution mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Friction and restitution konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Friction and restitution ergänzen.

**Rhai-API:** `apply_force`, `apply_impulse`, `raycast`, `query_radius`

**Visual-Graph-API:** `Physics/Apply Force`, `Physics/Apply Impulse`, `Physics/Raycast`

<a id="physics-damping-and-sleep"></a>

### Damping and sleep

**Klassifikation:** Manual · Runtime · Per-object · Reversible

**Zweck und Einsatz:** Damping and sleep im Bereich Physics Settings and Monitor erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design / Debug. Verwenden, wenn das Projekt Damping and sleep benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Objects with physics components
- Play mode for runtime evidence

**Exakter Ablauf:**

1. Design / Debug und danach Physics Settings and Monitor öffnen.
2. Damping and sleep wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Damping and sleep ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Damping and sleep wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Damping and sleep mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Damping and sleep konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Damping and sleep ergänzen.

**Rhai-API:** `apply_force`, `apply_impulse`, `raycast`, `query_radius`

**Visual-Graph-API:** `Physics/Apply Force`, `Physics/Apply Impulse`, `Physics/Raycast`

<a id="physics-continuous-collision"></a>

### Continuous collision

**Klassifikation:** Manual · Runtime · Per-object · Reversible

**Zweck und Einsatz:** Continuous collision im Bereich Physics Settings and Monitor erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design / Debug. Verwenden, wenn das Projekt Continuous collision benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Objects with physics components
- Play mode for runtime evidence

**Exakter Ablauf:**

1. Design / Debug und danach Physics Settings and Monitor öffnen.
2. Continuous collision wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Continuous collision ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Continuous collision wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Continuous collision mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Continuous collision konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Continuous collision ergänzen.

**Rhai-API:** `apply_force`, `apply_impulse`, `raycast`, `query_radius`

**Visual-Graph-API:** `Physics/Apply Force`, `Physics/Apply Impulse`, `Physics/Raycast`

<a id="physics-one-way-platforms"></a>

### One-way platforms

**Klassifikation:** Manual · Runtime · Per-object · Reversible

**Zweck und Einsatz:** One-way platforms im Bereich Physics Settings and Monitor erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design / Debug. Verwenden, wenn das Projekt One-way platforms benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Objects with physics components
- Play mode for runtime evidence

**Exakter Ablauf:**

1. Design / Debug und danach Physics Settings and Monitor öffnen.
2. One-way platforms wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** One-way platforms ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** One-way platforms wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- One-way platforms mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, One-way platforms konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für One-way platforms ergänzen.

**Rhai-API:** `apply_force`, `apply_impulse`, `raycast`, `query_radius`

**Visual-Graph-API:** `Physics/Apply Force`, `Physics/Apply Impulse`, `Physics/Raycast`

<a id="physics-physics-queries"></a>

### Physics queries

**Klassifikation:** Manual · Runtime · Per-object · Reversible

**Zweck und Einsatz:** Physics queries im Bereich Physics Settings and Monitor erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design / Debug. Verwenden, wenn das Projekt Physics queries benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Objects with physics components
- Play mode for runtime evidence

**Exakter Ablauf:**

1. Design / Debug und danach Physics Settings and Monitor öffnen.
2. Physics queries wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Physics queries ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Physics queries wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Physics queries mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Physics queries konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Physics queries ergänzen.

**Rhai-API:** `apply_force`, `apply_impulse`, `raycast`, `query_radius`

**Visual-Graph-API:** `Physics/Apply Force`, `Physics/Apply Impulse`, `Physics/Raycast`

<a id="physics-distance-joint"></a>

### Distance joint

**Klassifikation:** Manual · Runtime · Per-object · Reversible

**Zweck und Einsatz:** Distance joint im Bereich Physics Settings and Monitor erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design / Debug. Verwenden, wenn das Projekt Distance joint benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Objects with physics components
- Play mode for runtime evidence

**Exakter Ablauf:**

1. Design / Debug und danach Physics Settings and Monitor öffnen.
2. Distance joint wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Distance joint ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Distance joint wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Distance joint mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Distance joint konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Distance joint ergänzen.

**Rhai-API:** `apply_force`, `apply_impulse`, `raycast`, `query_radius`

**Visual-Graph-API:** `Physics/Apply Force`, `Physics/Apply Impulse`, `Physics/Raycast`

<a id="physics-revolute-joint"></a>

### Revolute joint

**Klassifikation:** Manual · Runtime · Per-object · Reversible

**Zweck und Einsatz:** Revolute joint im Bereich Physics Settings and Monitor erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design / Debug. Verwenden, wenn das Projekt Revolute joint benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Objects with physics components
- Play mode for runtime evidence

**Exakter Ablauf:**

1. Design / Debug und danach Physics Settings and Monitor öffnen.
2. Revolute joint wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Revolute joint ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Revolute joint wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Revolute joint mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Revolute joint konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Revolute joint ergänzen.

**Rhai-API:** `apply_force`, `apply_impulse`, `raycast`, `query_radius`

**Visual-Graph-API:** `Physics/Apply Force`, `Physics/Apply Impulse`, `Physics/Raycast`

<a id="physics-prismatic-joint"></a>

### Prismatic joint

**Klassifikation:** Manual · Runtime · Per-object · Reversible

**Zweck und Einsatz:** Prismatic joint im Bereich Physics Settings and Monitor erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design / Debug. Verwenden, wenn das Projekt Prismatic joint benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Objects with physics components
- Play mode for runtime evidence

**Exakter Ablauf:**

1. Design / Debug und danach Physics Settings and Monitor öffnen.
2. Prismatic joint wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Prismatic joint ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Prismatic joint wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Prismatic joint mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Prismatic joint konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Prismatic joint ergänzen.

**Rhai-API:** `apply_force`, `apply_impulse`, `raycast`, `query_radius`

**Visual-Graph-API:** `Physics/Apply Force`, `Physics/Apply Impulse`, `Physics/Raycast`

<a id="physics-weld-joint"></a>

### Weld joint

**Klassifikation:** Manual · Runtime · Per-object · Reversible

**Zweck und Einsatz:** Weld joint im Bereich Physics Settings and Monitor erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design / Debug. Verwenden, wenn das Projekt Weld joint benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Objects with physics components
- Play mode for runtime evidence

**Exakter Ablauf:**

1. Design / Debug und danach Physics Settings and Monitor öffnen.
2. Weld joint wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Weld joint ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Weld joint wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Weld joint mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Weld joint konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Weld joint ergänzen.

**Rhai-API:** `apply_force`, `apply_impulse`, `raycast`, `query_radius`

**Visual-Graph-API:** `Physics/Apply Force`, `Physics/Apply Impulse`, `Physics/Raycast`

<a id="physics-spring-joint"></a>

### Spring joint

**Klassifikation:** Manual · Runtime · Per-object · Reversible

**Zweck und Einsatz:** Spring joint im Bereich Physics Settings and Monitor erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design / Debug. Verwenden, wenn das Projekt Spring joint benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Objects with physics components
- Play mode for runtime evidence

**Exakter Ablauf:**

1. Design / Debug und danach Physics Settings and Monitor öffnen.
2. Spring joint wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Spring joint ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Spring joint wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Spring joint mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Spring joint konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Spring joint ergänzen.

**Rhai-API:** `apply_force`, `apply_impulse`, `raycast`, `query_radius`

**Visual-Graph-API:** `Physics/Apply Force`, `Physics/Apply Impulse`, `Physics/Raycast`

<a id="physics-rope2d"></a>

### Rope2D

**Klassifikation:** Manual · Runtime · Per-object · Reversible

**Zweck und Einsatz:** Rope2D im Bereich Physics Settings and Monitor erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design / Debug. Verwenden, wenn das Projekt Rope2D benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Objects with physics components
- Play mode for runtime evidence

**Exakter Ablauf:**

1. Design / Debug und danach Physics Settings and Monitor öffnen.
2. Rope2D wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Rope2D ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Rope2D wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Rope2D mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Rope2D konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Rope2D ergänzen.

**Rhai-API:** `apply_force`, `apply_impulse`, `raycast`, `query_radius`

**Visual-Graph-API:** `Physics/Apply Force`, `Physics/Apply Impulse`, `Physics/Raycast`

<a id="physics-compound-bind-and-separate"></a>

### Compound bind and separate

**Klassifikation:** Manual · Runtime · Per-object · Reversible

**Zweck und Einsatz:** Compound bind and separate im Bereich Physics Settings and Monitor erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design / Debug. Verwenden, wenn das Projekt Compound bind and separate benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Objects with physics components
- Play mode for runtime evidence

**Exakter Ablauf:**

1. Design / Debug und danach Physics Settings and Monitor öffnen.
2. Compound bind and separate wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Compound bind and separate ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Compound bind and separate wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Compound bind and separate mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Compound bind and separate konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Compound bind and separate ergänzen.

**Rhai-API:** `apply_force`, `apply_impulse`, `raycast`, `query_radius`

**Visual-Graph-API:** `Physics/Apply Force`, `Physics/Apply Impulse`, `Physics/Raycast`

<a id="physics-collision-timeline"></a>

### Collision timeline

**Klassifikation:** Manual · Runtime · Per-object · Reversible

**Zweck und Einsatz:** Collision timeline im Bereich Physics Settings and Monitor erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design / Debug. Verwenden, wenn das Projekt Collision timeline benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Objects with physics components
- Play mode for runtime evidence

**Exakter Ablauf:**

1. Design / Debug und danach Physics Settings and Monitor öffnen.
2. Collision timeline wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Collision timeline ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Collision timeline wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Collision timeline mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Collision timeline konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Collision timeline ergänzen.

**Rhai-API:** `apply_force`, `apply_impulse`, `raycast`, `query_radius`

**Visual-Graph-API:** `Physics/Apply Force`, `Physics/Apply Impulse`, `Physics/Raycast`

<a id="physics-deterministic-replay"></a>

### Deterministic replay

**Klassifikation:** Manual · Runtime · Per-object · Reversible

**Zweck und Einsatz:** Deterministic replay im Bereich Physics Settings and Monitor erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design / Debug. Verwenden, wenn das Projekt Deterministic replay benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Objects with physics components
- Play mode for runtime evidence

**Exakter Ablauf:**

1. Design / Debug und danach Physics Settings and Monitor öffnen.
2. Deterministic replay wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Deterministic replay ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Deterministic replay wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Deterministic replay mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Deterministic replay konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Deterministic replay ergänzen.

**Rhai-API:** `apply_force`, `apply_impulse`, `raycast`, `query_radius`

**Visual-Graph-API:** `Physics/Apply Force`, `Physics/Apply Impulse`, `Physics/Raycast`


## Script Studio

<a id="script-rhai-editor"></a>

### Rhai editor

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Reversible

**Zweck und Einsatz:** Rhai editor im Bereich Script Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Script. Verwenden, wenn das Projekt Rhai editor benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A .rhai asset
- Script2D attached to an object for runtime callbacks

**Exakter Ablauf:**

1. Script und danach Script Studio öffnen.
2. Rhai editor wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Rhai editor ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Rhai editor wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Rhai editor mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Rhai editor konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Rhai editor ergänzen.

**Rhai-API:** `awake`, `start`, `fixed_update`, `update`, `late_update`, `signal_emit`, `task_start`

**Visual-Graph-API:** `Events/Awake`, `Events/Start`, `Events/Fixed Update`, `Signals/Emit`

<a id="script-diagnostics-and-code-actions"></a>

### Diagnostics and code actions

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Reversible

**Zweck und Einsatz:** Diagnostics and code actions im Bereich Script Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Script. Verwenden, wenn das Projekt Diagnostics and code actions benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A .rhai asset
- Script2D attached to an object for runtime callbacks

**Exakter Ablauf:**

1. Script und danach Script Studio öffnen.
2. Diagnostics and code actions wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Diagnostics and code actions ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Diagnostics and code actions wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Diagnostics and code actions mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Diagnostics and code actions konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Diagnostics and code actions ergänzen.

**Rhai-API:** `awake`, `start`, `fixed_update`, `update`, `late_update`, `signal_emit`, `task_start`

**Visual-Graph-API:** `Events/Awake`, `Events/Start`, `Events/Fixed Update`, `Signals/Emit`

<a id="script-completion-and-api-browser"></a>

### Completion and API browser

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Reversible

**Zweck und Einsatz:** Completion and API browser im Bereich Script Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Script. Verwenden, wenn das Projekt Completion and API browser benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A .rhai asset
- Script2D attached to an object for runtime callbacks

**Exakter Ablauf:**

1. Script und danach Script Studio öffnen.
2. Completion and API browser wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Completion and API browser ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Completion and API browser wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Completion and API browser mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Completion and API browser konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Completion and API browser ergänzen.

**Rhai-API:** `awake`, `start`, `fixed_update`, `update`, `late_update`, `signal_emit`, `task_start`

**Visual-Graph-API:** `Events/Awake`, `Events/Start`, `Events/Fixed Update`, `Signals/Emit`

<a id="script-definition-and-references"></a>

### Definition and references

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Reversible

**Zweck und Einsatz:** Definition and references im Bereich Script Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Script. Verwenden, wenn das Projekt Definition and references benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A .rhai asset
- Script2D attached to an object for runtime callbacks

**Exakter Ablauf:**

1. Script und danach Script Studio öffnen.
2. Definition and references wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Definition and references ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Definition and references wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Definition and references mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Definition and references konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Definition and references ergänzen.

**Rhai-API:** `awake`, `start`, `fixed_update`, `update`, `late_update`, `signal_emit`, `task_start`

**Visual-Graph-API:** `Events/Awake`, `Events/Start`, `Events/Fixed Update`, `Signals/Emit`

<a id="script-rename-and-formatting"></a>

### Rename and formatting

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Reversible

**Zweck und Einsatz:** Rename and formatting im Bereich Script Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Script. Verwenden, wenn das Projekt Rename and formatting benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A .rhai asset
- Script2D attached to an object for runtime callbacks

**Exakter Ablauf:**

1. Script und danach Script Studio öffnen.
2. Rename and formatting wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Rename and formatting ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Rename and formatting wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Rename and formatting mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Rename and formatting konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Rename and formatting ergänzen.

**Rhai-API:** `awake`, `start`, `fixed_update`, `update`, `late_update`, `signal_emit`, `task_start`

**Visual-Graph-API:** `Events/Awake`, `Events/Start`, `Events/Fixed Update`, `Signals/Emit`

<a id="script-lifecycle-callbacks"></a>

### Lifecycle callbacks

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Reversible

**Zweck und Einsatz:** Lifecycle callbacks im Bereich Script Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Script. Verwenden, wenn das Projekt Lifecycle callbacks benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A .rhai asset
- Script2D attached to an object for runtime callbacks

**Exakter Ablauf:**

1. Script und danach Script Studio öffnen.
2. Lifecycle callbacks wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Lifecycle callbacks ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Lifecycle callbacks wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Lifecycle callbacks mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Lifecycle callbacks konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Lifecycle callbacks ergänzen.

**Rhai-API:** `awake`, `start`, `fixed_update`, `update`, `late_update`, `signal_emit`, `task_start`

**Visual-Graph-API:** `Events/Awake`, `Events/Start`, `Events/Fixed Update`, `Signals/Emit`

<a id="script-exported-inspector-properties"></a>

### Exported Inspector properties

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Reversible

**Zweck und Einsatz:** Exported Inspector properties im Bereich Script Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Script. Verwenden, wenn das Projekt Exported Inspector properties benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A .rhai asset
- Script2D attached to an object for runtime callbacks

**Exakter Ablauf:**

1. Script und danach Script Studio öffnen.
2. Exported Inspector properties wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Exported Inspector properties ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Exported Inspector properties wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Exported Inspector properties mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Exported Inspector properties konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Exported Inspector properties ergänzen.

**Rhai-API:** `awake`, `start`, `fixed_update`, `update`, `late_update`, `signal_emit`, `task_start`

**Visual-Graph-API:** `Events/Awake`, `Events/Start`, `Events/Fixed Update`, `Signals/Emit`

<a id="script-modules"></a>

### Modules

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Reversible

**Zweck und Einsatz:** Modules im Bereich Script Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Script. Verwenden, wenn das Projekt Modules benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A .rhai asset
- Script2D attached to an object for runtime callbacks

**Exakter Ablauf:**

1. Script und danach Script Studio öffnen.
2. Modules wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Modules ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Modules wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Modules mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Modules konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Modules ergänzen.

**Rhai-API:** `awake`, `start`, `fixed_update`, `update`, `late_update`, `signal_emit`, `task_start`

**Visual-Graph-API:** `Events/Awake`, `Events/Start`, `Events/Fixed Update`, `Signals/Emit`

<a id="script-transactional-hot-reload"></a>

### Transactional hot reload

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Reversible

**Zweck und Einsatz:** Transactional hot reload im Bereich Script Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Script. Verwenden, wenn das Projekt Transactional hot reload benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A .rhai asset
- Script2D attached to an object for runtime callbacks

**Exakter Ablauf:**

1. Script und danach Script Studio öffnen.
2. Transactional hot reload wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Transactional hot reload ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Transactional hot reload wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Transactional hot reload mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Transactional hot reload konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Transactional hot reload ergänzen.

**Rhai-API:** `awake`, `start`, `fixed_update`, `update`, `late_update`, `signal_emit`, `task_start`

**Visual-Graph-API:** `Events/Awake`, `Events/Start`, `Events/Fixed Update`, `Signals/Emit`

<a id="script-breakpoints-and-logpoints"></a>

### Breakpoints and logpoints

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Reversible

**Zweck und Einsatz:** Breakpoints and logpoints im Bereich Script Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Script. Verwenden, wenn das Projekt Breakpoints and logpoints benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A .rhai asset
- Script2D attached to an object for runtime callbacks

**Exakter Ablauf:**

1. Script und danach Script Studio öffnen.
2. Breakpoints and logpoints wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Breakpoints and logpoints ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Breakpoints and logpoints wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Breakpoints and logpoints mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Breakpoints and logpoints konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Breakpoints and logpoints ergänzen.

**Rhai-API:** `awake`, `start`, `fixed_update`, `update`, `late_update`, `signal_emit`, `task_start`

**Visual-Graph-API:** `Events/Awake`, `Events/Start`, `Events/Fixed Update`, `Signals/Emit`

<a id="script-step-and-watches"></a>

### Step and watches

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Reversible

**Zweck und Einsatz:** Step and watches im Bereich Script Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Script. Verwenden, wenn das Projekt Step and watches benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A .rhai asset
- Script2D attached to an object for runtime callbacks

**Exakter Ablauf:**

1. Script und danach Script Studio öffnen.
2. Step and watches wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Step and watches ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Step and watches wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Step and watches mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Step and watches konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Step and watches ergänzen.

**Rhai-API:** `awake`, `start`, `fixed_update`, `update`, `late_update`, `signal_emit`, `task_start`

**Visual-Graph-API:** `Events/Awake`, `Events/Start`, `Events/Fixed Update`, `Signals/Emit`

<a id="script-tasks-and-signals"></a>

### Tasks and signals

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Reversible

**Zweck und Einsatz:** Tasks and signals im Bereich Script Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Script. Verwenden, wenn das Projekt Tasks and signals benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A .rhai asset
- Script2D attached to an object for runtime callbacks

**Exakter Ablauf:**

1. Script und danach Script Studio öffnen.
2. Tasks and signals wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Tasks and signals ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Tasks and signals wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Tasks and signals mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Tasks and signals konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Tasks and signals ergänzen.

**Rhai-API:** `awake`, `start`, `fixed_update`, `update`, `late_update`, `signal_emit`, `task_start`

**Visual-Graph-API:** `Events/Awake`, `Events/Start`, `Events/Fixed Update`, `Signals/Emit`

<a id="script-project-tests"></a>

### Project tests

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Reversible

**Zweck und Einsatz:** Project tests im Bereich Script Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Script. Verwenden, wenn das Projekt Project tests benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A .rhai asset
- Script2D attached to an object for runtime callbacks

**Exakter Ablauf:**

1. Script und danach Script Studio öffnen.
2. Project tests wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Project tests ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Project tests wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Project tests mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Project tests konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Project tests ergänzen.

**Rhai-API:** `awake`, `start`, `fixed_update`, `update`, `late_update`, `signal_emit`, `task_start`

**Visual-Graph-API:** `Events/Awake`, `Events/Start`, `Events/Fixed Update`, `Signals/Emit`

<a id="script-coverage"></a>

### Coverage

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Reversible

**Zweck und Einsatz:** Coverage im Bereich Script Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Script. Verwenden, wenn das Projekt Coverage benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A .rhai asset
- Script2D attached to an object for runtime callbacks

**Exakter Ablauf:**

1. Script und danach Script Studio öffnen.
2. Coverage wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Coverage ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Coverage wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Coverage mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Coverage konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Coverage ergänzen.

**Rhai-API:** `awake`, `start`, `fixed_update`, `update`, `late_update`, `signal_emit`, `task_start`

**Visual-Graph-API:** `Events/Awake`, `Events/Start`, `Events/Fixed Update`, `Signals/Emit`

<a id="script-headless-ci"></a>

### Headless CI

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Reversible

**Zweck und Einsatz:** Headless CI im Bereich Script Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Script. Verwenden, wenn das Projekt Headless CI benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A .rhai asset
- Script2D attached to an object for runtime callbacks

**Exakter Ablauf:**

1. Script und danach Script Studio öffnen.
2. Headless CI wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Headless CI ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Headless CI wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Headless CI mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Headless CI konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Headless CI ergänzen.

**Rhai-API:** `awake`, `start`, `fixed_update`, `update`, `late_update`, `signal_emit`, `task_start`

**Visual-Graph-API:** `Events/Awake`, `Events/Start`, `Events/Fixed Update`, `Signals/Emit`

<a id="script-external-editor-protocol"></a>

### External editor protocol

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Reversible

**Zweck und Einsatz:** External editor protocol im Bereich Script Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Script. Verwenden, wenn das Projekt External editor protocol benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A .rhai asset
- Script2D attached to an object for runtime callbacks

**Exakter Ablauf:**

1. Script und danach Script Studio öffnen.
2. External editor protocol wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** External editor protocol ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** External editor protocol wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- External editor protocol mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, External editor protocol konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für External editor protocol ergänzen.

**Rhai-API:** `awake`, `start`, `fixed_update`, `update`, `late_update`, `signal_emit`, `task_start`

**Visual-Graph-API:** `Events/Awake`, `Events/Start`, `Events/Fixed Update`, `Signals/Emit`


## Visual Graph Editor

<a id="visual-graph-node-palette"></a>

### Node palette

**Klassifikation:** Manual · Assisted · Runtime · Reversible

**Zweck und Einsatz:** Node palette im Bereich Visual Graph Editor erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Script. Verwenden, wenn das Projekt Node palette benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A .nova-graph asset

**Exakter Ablauf:**

1. Script und danach Visual Graph Editor öffnen.
2. Node palette wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Node palette ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Node palette wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Node palette mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Node palette konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Node palette ergänzen.

**Rhai-API:** `Generated Rhai API v2 command stream`

**Visual-Graph-API:** `All Rhai API v2 generated nodes`

<a id="visual-graph-typed-pins-and-wires"></a>

### Typed pins and wires

**Klassifikation:** Manual · Assisted · Runtime · Reversible

**Zweck und Einsatz:** Typed pins and wires im Bereich Visual Graph Editor erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Script. Verwenden, wenn das Projekt Typed pins and wires benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A .nova-graph asset

**Exakter Ablauf:**

1. Script und danach Visual Graph Editor öffnen.
2. Typed pins and wires wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Typed pins and wires ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Typed pins and wires wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Typed pins and wires mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Typed pins and wires konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Typed pins and wires ergänzen.

**Rhai-API:** `Generated Rhai API v2 command stream`

**Visual-Graph-API:** `All Rhai API v2 generated nodes`

<a id="visual-graph-branches-and-bounded-loops"></a>

### Branches and bounded loops

**Klassifikation:** Manual · Assisted · Runtime · Reversible

**Zweck und Einsatz:** Branches and bounded loops im Bereich Visual Graph Editor erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Script. Verwenden, wenn das Projekt Branches and bounded loops benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A .nova-graph asset

**Exakter Ablauf:**

1. Script und danach Visual Graph Editor öffnen.
2. Branches and bounded loops wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Branches and bounded loops ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Branches and bounded loops wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Branches and bounded loops mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Branches and bounded loops konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Branches and bounded loops ergänzen.

**Rhai-API:** `Generated Rhai API v2 command stream`

**Visual-Graph-API:** `All Rhai API v2 generated nodes`

<a id="visual-graph-functions-and-macros"></a>

### Functions and macros

**Klassifikation:** Manual · Assisted · Runtime · Reversible

**Zweck und Einsatz:** Functions and macros im Bereich Visual Graph Editor erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Script. Verwenden, wenn das Projekt Functions and macros benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A .nova-graph asset

**Exakter Ablauf:**

1. Script und danach Visual Graph Editor öffnen.
2. Functions and macros wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Functions and macros ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Functions and macros wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Functions and macros mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Functions and macros konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Functions and macros ergänzen.

**Rhai-API:** `Generated Rhai API v2 command stream`

**Visual-Graph-API:** `All Rhai API v2 generated nodes`

<a id="visual-graph-subgraphs-and-interfaces"></a>

### Subgraphs and interfaces

**Klassifikation:** Manual · Assisted · Runtime · Reversible

**Zweck und Einsatz:** Subgraphs and interfaces im Bereich Visual Graph Editor erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Script. Verwenden, wenn das Projekt Subgraphs and interfaces benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A .nova-graph asset

**Exakter Ablauf:**

1. Script und danach Visual Graph Editor öffnen.
2. Subgraphs and interfaces wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Subgraphs and interfaces ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Subgraphs and interfaces wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Subgraphs and interfaces mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Subgraphs and interfaces konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Subgraphs and interfaces ergänzen.

**Rhai-API:** `Generated Rhai API v2 command stream`

**Visual-Graph-API:** `All Rhai API v2 generated nodes`

<a id="visual-graph-graph-libraries"></a>

### Graph libraries

**Klassifikation:** Manual · Assisted · Runtime · Reversible

**Zweck und Einsatz:** Graph libraries im Bereich Visual Graph Editor erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Script. Verwenden, wenn das Projekt Graph libraries benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A .nova-graph asset

**Exakter Ablauf:**

1. Script und danach Visual Graph Editor öffnen.
2. Graph libraries wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Graph libraries ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Graph libraries wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Graph libraries mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Graph libraries konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Graph libraries ergänzen.

**Rhai-API:** `Generated Rhai API v2 command stream`

**Visual-Graph-API:** `All Rhai API v2 generated nodes`

<a id="visual-graph-variables-and-exposed-properties"></a>

### Variables and exposed properties

**Klassifikation:** Manual · Assisted · Runtime · Reversible

**Zweck und Einsatz:** Variables and exposed properties im Bereich Visual Graph Editor erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Script. Verwenden, wenn das Projekt Variables and exposed properties benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A .nova-graph asset

**Exakter Ablauf:**

1. Script und danach Visual Graph Editor öffnen.
2. Variables and exposed properties wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Variables and exposed properties ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Variables and exposed properties wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Variables and exposed properties mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Variables and exposed properties konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Variables and exposed properties ergänzen.

**Rhai-API:** `Generated Rhai API v2 command stream`

**Visual-Graph-API:** `All Rhai API v2 generated nodes`

<a id="visual-graph-breakpoints-and-active-wires"></a>

### Breakpoints and active wires

**Klassifikation:** Manual · Assisted · Runtime · Reversible

**Zweck und Einsatz:** Breakpoints and active wires im Bereich Visual Graph Editor erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Script. Verwenden, wenn das Projekt Breakpoints and active wires benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A .nova-graph asset

**Exakter Ablauf:**

1. Script und danach Visual Graph Editor öffnen.
2. Breakpoints and active wires wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Breakpoints and active wires ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Breakpoints and active wires wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Breakpoints and active wires mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Breakpoints and active wires konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Breakpoints and active wires ergänzen.

**Rhai-API:** `Generated Rhai API v2 command stream`

**Visual-Graph-API:** `All Rhai API v2 generated nodes`

<a id="visual-graph-watches-and-call-stack"></a>

### Watches and call stack

**Klassifikation:** Manual · Assisted · Runtime · Reversible

**Zweck und Einsatz:** Watches and call stack im Bereich Visual Graph Editor erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Script. Verwenden, wenn das Projekt Watches and call stack benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A .nova-graph asset

**Exakter Ablauf:**

1. Script und danach Visual Graph Editor öffnen.
2. Watches and call stack wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Watches and call stack ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Watches and call stack wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Watches and call stack mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Watches and call stack konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Watches and call stack ergänzen.

**Rhai-API:** `Generated Rhai API v2 command stream`

**Visual-Graph-API:** `All Rhai API v2 generated nodes`

<a id="visual-graph-per-node-timings-and-coverage"></a>

### Per-node timings and coverage

**Klassifikation:** Manual · Assisted · Runtime · Reversible

**Zweck und Einsatz:** Per-node timings and coverage im Bereich Visual Graph Editor erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Script. Verwenden, wenn das Projekt Per-node timings and coverage benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A .nova-graph asset

**Exakter Ablauf:**

1. Script und danach Visual Graph Editor öffnen.
2. Per-node timings and coverage wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Per-node timings and coverage ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Per-node timings and coverage wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Per-node timings and coverage mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Per-node timings and coverage konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Per-node timings and coverage ergänzen.

**Rhai-API:** `Generated Rhai API v2 command stream`

**Visual-Graph-API:** `All Rhai API v2 generated nodes`

<a id="visual-graph-graph-to-rhai-view"></a>

### Graph-to-Rhai view

**Klassifikation:** Manual · Assisted · Runtime · Reversible

**Zweck und Einsatz:** Graph-to-Rhai view im Bereich Visual Graph Editor erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Script. Verwenden, wenn das Projekt Graph-to-Rhai view benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A .nova-graph asset

**Exakter Ablauf:**

1. Script und danach Visual Graph Editor öffnen.
2. Graph-to-Rhai view wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Graph-to-Rhai view ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Graph-to-Rhai view wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Graph-to-Rhai view mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Graph-to-Rhai view konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Graph-to-Rhai view ergänzen.

**Rhai-API:** `Generated Rhai API v2 command stream`

**Visual-Graph-API:** `All Rhai API v2 generated nodes`

<a id="visual-graph-refactor-and-find-references"></a>

### Refactor and find references

**Klassifikation:** Manual · Assisted · Runtime · Reversible

**Zweck und Einsatz:** Refactor and find references im Bereich Visual Graph Editor erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Script. Verwenden, wenn das Projekt Refactor and find references benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A .nova-graph asset

**Exakter Ablauf:**

1. Script und danach Visual Graph Editor öffnen.
2. Refactor and find references wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Refactor and find references ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Refactor and find references wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Refactor and find references mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Refactor and find references konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Refactor and find references ergänzen.

**Rhai-API:** `Generated Rhai API v2 command stream`

**Visual-Graph-API:** `All Rhai API v2 generated nodes`

<a id="visual-graph-semantic-diff-and-merge"></a>

### Semantic diff and merge

**Klassifikation:** Manual · Assisted · Runtime · Reversible

**Zweck und Einsatz:** Semantic diff and merge im Bereich Visual Graph Editor erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Script. Verwenden, wenn das Projekt Semantic diff and merge benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A .nova-graph asset

**Exakter Ablauf:**

1. Script und danach Visual Graph Editor öffnen.
2. Semantic diff and merge wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Semantic diff and merge ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Semantic diff and merge wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Semantic diff and merge mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Semantic diff and merge konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Semantic diff and merge ergänzen.

**Rhai-API:** `Generated Rhai API v2 command stream`

**Visual-Graph-API:** `All Rhai API v2 generated nodes`

<a id="visual-graph-hot-reload"></a>

### Hot reload

**Klassifikation:** Manual · Assisted · Runtime · Reversible

**Zweck und Einsatz:** Hot reload im Bereich Visual Graph Editor erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Script. Verwenden, wenn das Projekt Hot reload benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A .nova-graph asset

**Exakter Ablauf:**

1. Script und danach Visual Graph Editor öffnen.
2. Hot reload wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Hot reload ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Hot reload wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Hot reload mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Hot reload konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Hot reload ergänzen.

**Rhai-API:** `Generated Rhai API v2 command stream`

**Visual-Graph-API:** `All Rhai API v2 generated nodes`

<a id="visual-graph-package-graph-nodes"></a>

### Package graph nodes

**Klassifikation:** Manual · Assisted · Runtime · Reversible

**Zweck und Einsatz:** Package graph nodes im Bereich Visual Graph Editor erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Script. Verwenden, wenn das Projekt Package graph nodes benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A .nova-graph asset

**Exakter Ablauf:**

1. Script und danach Visual Graph Editor öffnen.
2. Package graph nodes wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Package graph nodes ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Package graph nodes wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Package graph nodes mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Package graph nodes konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Package graph nodes ergänzen.

**Rhai-API:** `Generated Rhai API v2 command stream`

**Visual-Graph-API:** `All Rhai API v2 generated nodes`

<a id="visual-graph-1-000-node-authoring-profile"></a>

### 1,000-node authoring profile

**Klassifikation:** Manual · Assisted · Runtime · Reversible

**Zweck und Einsatz:** 1,000-node authoring profile im Bereich Visual Graph Editor erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Script. Verwenden, wenn das Projekt 1,000-node authoring profile benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A .nova-graph asset

**Exakter Ablauf:**

1. Script und danach Visual Graph Editor öffnen.
2. 1,000-node authoring profile wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** 1,000-node authoring profile ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** 1,000-node authoring profile wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- 1,000-node authoring profile mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, 1,000-node authoring profile konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für 1,000-node authoring profile ergänzen.

**Rhai-API:** `Generated Rhai API v2 command stream`

**Visual-Graph-API:** `All Rhai API v2 generated nodes`


## Animation and Timeline

<a id="animation-property-clips"></a>

### Property clips

**Klassifikation:** Manual · Assisted · Runtime · Reversible · Per-object

**Zweck und Einsatz:** Property clips im Bereich Animation and Timeline erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Animation. Verwenden, wenn das Projekt Property clips benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Animation, controller, rig or timeline assets

**Exakter Ablauf:**

1. Animation und danach Animation and Timeline öffnen.
2. Property clips wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Property clips ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Property clips wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Property clips mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Property clips konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Property clips ergänzen.

**Rhai-API:** `animation_play`, `animation_parameter`, `signal_emit`

**Visual-Graph-API:** `Animation/Play`, `Animation/Set Parameter`, `Timeline/Signal`

<a id="animation-sprite-frames"></a>

### Sprite frames

**Klassifikation:** Manual · Assisted · Runtime · Reversible · Per-object

**Zweck und Einsatz:** Sprite frames im Bereich Animation and Timeline erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Animation. Verwenden, wenn das Projekt Sprite frames benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Animation, controller, rig or timeline assets

**Exakter Ablauf:**

1. Animation und danach Animation and Timeline öffnen.
2. Sprite frames wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Sprite frames ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Sprite frames wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Sprite frames mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Sprite frames konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Sprite frames ergänzen.

**Rhai-API:** `animation_play`, `animation_parameter`, `signal_emit`

**Visual-Graph-API:** `Animation/Play`, `Animation/Set Parameter`, `Timeline/Signal`

<a id="animation-events-and-method-tracks"></a>

### Events and method tracks

**Klassifikation:** Manual · Assisted · Runtime · Reversible · Per-object

**Zweck und Einsatz:** Events and method tracks im Bereich Animation and Timeline erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Animation. Verwenden, wenn das Projekt Events and method tracks benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Animation, controller, rig or timeline assets

**Exakter Ablauf:**

1. Animation und danach Animation and Timeline öffnen.
2. Events and method tracks wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Events and method tracks ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Events and method tracks wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Events and method tracks mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Events and method tracks konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Events and method tracks ergänzen.

**Rhai-API:** `animation_play`, `animation_parameter`, `signal_emit`

**Visual-Graph-API:** `Animation/Play`, `Animation/Set Parameter`, `Timeline/Signal`

<a id="animation-audio-and-nested-clips"></a>

### Audio and nested clips

**Klassifikation:** Manual · Assisted · Runtime · Reversible · Per-object

**Zweck und Einsatz:** Audio and nested clips im Bereich Animation and Timeline erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Animation. Verwenden, wenn das Projekt Audio and nested clips benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Animation, controller, rig or timeline assets

**Exakter Ablauf:**

1. Animation und danach Animation and Timeline öffnen.
2. Audio and nested clips wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Audio and nested clips ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Audio and nested clips wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Audio and nested clips mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Audio and nested clips konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Audio and nested clips ergänzen.

**Rhai-API:** `animation_play`, `animation_parameter`, `signal_emit`

**Visual-Graph-API:** `Animation/Play`, `Animation/Set Parameter`, `Timeline/Signal`

<a id="animation-state-machines"></a>

### State machines

**Klassifikation:** Manual · Assisted · Runtime · Reversible · Per-object

**Zweck und Einsatz:** State machines im Bereich Animation and Timeline erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Animation. Verwenden, wenn das Projekt State machines benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Animation, controller, rig or timeline assets

**Exakter Ablauf:**

1. Animation und danach Animation and Timeline öffnen.
2. State machines wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** State machines ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** State machines wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- State machines mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, State machines konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für State machines ergänzen.

**Rhai-API:** `animation_play`, `animation_parameter`, `signal_emit`

**Visual-Graph-API:** `Animation/Play`, `Animation/Set Parameter`, `Timeline/Signal`

<a id="animation-parameters-and-transitions"></a>

### Parameters and transitions

**Klassifikation:** Manual · Assisted · Runtime · Reversible · Per-object

**Zweck und Einsatz:** Parameters and transitions im Bereich Animation and Timeline erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Animation. Verwenden, wenn das Projekt Parameters and transitions benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Animation, controller, rig or timeline assets

**Exakter Ablauf:**

1. Animation und danach Animation and Timeline öffnen.
2. Parameters and transitions wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Parameters and transitions ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Parameters and transitions wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Parameters and transitions mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Parameters and transitions konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Parameters and transitions ergänzen.

**Rhai-API:** `animation_play`, `animation_parameter`, `signal_emit`

**Visual-Graph-API:** `Animation/Play`, `Animation/Set Parameter`, `Timeline/Signal`

<a id="animation-blend-trees"></a>

### Blend trees

**Klassifikation:** Manual · Assisted · Runtime · Reversible · Per-object

**Zweck und Einsatz:** Blend trees im Bereich Animation and Timeline erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Animation. Verwenden, wenn das Projekt Blend trees benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Animation, controller, rig or timeline assets

**Exakter Ablauf:**

1. Animation und danach Animation and Timeline öffnen.
2. Blend trees wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Blend trees ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Blend trees wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Blend trees mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Blend trees konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Blend trees ergänzen.

**Rhai-API:** `animation_play`, `animation_parameter`, `signal_emit`

**Visual-Graph-API:** `Animation/Play`, `Animation/Set Parameter`, `Timeline/Signal`

<a id="animation-layers-and-masks"></a>

### Layers and masks

**Klassifikation:** Manual · Assisted · Runtime · Reversible · Per-object

**Zweck und Einsatz:** Layers and masks im Bereich Animation and Timeline erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Animation. Verwenden, wenn das Projekt Layers and masks benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Animation, controller, rig or timeline assets

**Exakter Ablauf:**

1. Animation und danach Animation and Timeline öffnen.
2. Layers and masks wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Layers and masks ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Layers and masks wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Layers and masks mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Layers and masks konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Layers and masks ergänzen.

**Rhai-API:** `animation_play`, `animation_parameter`, `signal_emit`

**Visual-Graph-API:** `Animation/Play`, `Animation/Set Parameter`, `Timeline/Signal`

<a id="animation-2d-rigs-and-skinning"></a>

### 2D rigs and skinning

**Klassifikation:** Manual · Assisted · Runtime · Reversible · Per-object

**Zweck und Einsatz:** 2D rigs and skinning im Bereich Animation and Timeline erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Animation. Verwenden, wenn das Projekt 2D rigs and skinning benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Animation, controller, rig or timeline assets

**Exakter Ablauf:**

1. Animation und danach Animation and Timeline öffnen.
2. 2D rigs and skinning wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** 2D rigs and skinning ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** 2D rigs and skinning wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- 2D rigs and skinning mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, 2D rigs and skinning konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für 2D rigs and skinning ergänzen.

**Rhai-API:** `animation_play`, `animation_parameter`, `signal_emit`

**Visual-Graph-API:** `Animation/Play`, `Animation/Set Parameter`, `Timeline/Signal`

<a id="animation-retarget-aliases"></a>

### Retarget aliases

**Klassifikation:** Manual · Assisted · Runtime · Reversible · Per-object

**Zweck und Einsatz:** Retarget aliases im Bereich Animation and Timeline erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Animation. Verwenden, wenn das Projekt Retarget aliases benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Animation, controller, rig or timeline assets

**Exakter Ablauf:**

1. Animation und danach Animation and Timeline öffnen.
2. Retarget aliases wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Retarget aliases ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Retarget aliases wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Retarget aliases mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Retarget aliases konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Retarget aliases ergänzen.

**Rhai-API:** `animation_play`, `animation_parameter`, `signal_emit`

**Visual-Graph-API:** `Animation/Play`, `Animation/Set Parameter`, `Timeline/Signal`

<a id="animation-runtime-recording"></a>

### Runtime recording

**Klassifikation:** Manual · Assisted · Runtime · Reversible · Per-object

**Zweck und Einsatz:** Runtime recording im Bereich Animation and Timeline erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Animation. Verwenden, wenn das Projekt Runtime recording benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Animation, controller, rig or timeline assets

**Exakter Ablauf:**

1. Animation und danach Animation and Timeline öffnen.
2. Runtime recording wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Runtime recording ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Runtime recording wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Runtime recording mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Runtime recording konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Runtime recording ergänzen.

**Rhai-API:** `animation_play`, `animation_parameter`, `signal_emit`

**Visual-Graph-API:** `Animation/Play`, `Animation/Set Parameter`, `Timeline/Signal`

<a id="animation-timeline-cameras"></a>

### Timeline cameras

**Klassifikation:** Manual · Assisted · Runtime · Reversible · Per-object

**Zweck und Einsatz:** Timeline cameras im Bereich Animation and Timeline erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Animation. Verwenden, wenn das Projekt Timeline cameras benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Animation, controller, rig or timeline assets

**Exakter Ablauf:**

1. Animation und danach Animation and Timeline öffnen.
2. Timeline cameras wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Timeline cameras ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Timeline cameras wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Timeline cameras mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Timeline cameras konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Timeline cameras ergänzen.

**Rhai-API:** `animation_play`, `animation_parameter`, `signal_emit`

**Visual-Graph-API:** `Animation/Play`, `Animation/Set Parameter`, `Timeline/Signal`

<a id="animation-subtitles"></a>

### Subtitles

**Klassifikation:** Manual · Assisted · Runtime · Reversible · Per-object

**Zweck und Einsatz:** Subtitles im Bereich Animation and Timeline erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Animation. Verwenden, wenn das Projekt Subtitles benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Animation, controller, rig or timeline assets

**Exakter Ablauf:**

1. Animation und danach Animation and Timeline öffnen.
2. Subtitles wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Subtitles ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Subtitles wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Subtitles mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Subtitles konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Subtitles ergänzen.

**Rhai-API:** `animation_play`, `animation_parameter`, `signal_emit`

**Visual-Graph-API:** `Animation/Play`, `Animation/Set Parameter`, `Timeline/Signal`

<a id="animation-branches-and-markers"></a>

### Branches and markers

**Klassifikation:** Manual · Assisted · Runtime · Reversible · Per-object

**Zweck und Einsatz:** Branches and markers im Bereich Animation and Timeline erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Animation. Verwenden, wenn das Projekt Branches and markers benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Animation, controller, rig or timeline assets

**Exakter Ablauf:**

1. Animation und danach Animation and Timeline öffnen.
2. Branches and markers wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Branches and markers ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Branches and markers wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Branches and markers mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Branches and markers konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Branches and markers ergänzen.

**Rhai-API:** `animation_play`, `animation_parameter`, `signal_emit`

**Visual-Graph-API:** `Animation/Play`, `Animation/Set Parameter`, `Timeline/Signal`

<a id="animation-cinematic-skip-and-resume"></a>

### Cinematic skip and resume

**Klassifikation:** Manual · Assisted · Runtime · Reversible · Per-object

**Zweck und Einsatz:** Cinematic skip and resume im Bereich Animation and Timeline erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Animation. Verwenden, wenn das Projekt Cinematic skip and resume benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Animation, controller, rig or timeline assets

**Exakter Ablauf:**

1. Animation und danach Animation and Timeline öffnen.
2. Cinematic skip and resume wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Cinematic skip and resume ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Cinematic skip and resume wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Cinematic skip and resume mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Cinematic skip and resume konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Cinematic skip and resume ergänzen.

**Rhai-API:** `animation_play`, `animation_parameter`, `signal_emit`

**Visual-Graph-API:** `Animation/Play`, `Animation/Set Parameter`, `Timeline/Signal`


## Interface Studio

<a id="interface-canvas-and-recttransform"></a>

### Canvas and RectTransform

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Zweck und Einsatz:** Canvas and RectTransform im Bereich Interface Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Interface. Verwenden, wenn das Projekt Canvas and RectTransform benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A Canvas UI object or UI Showcase template

**Exakter Ablauf:**

1. Interface und danach Interface Studio öffnen.
2. Canvas and RectTransform wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Canvas and RectTransform ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Canvas and RectTransform wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Canvas and RectTransform mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Canvas and RectTransform konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Canvas and RectTransform ergänzen.

**Rhai-API:** `ui_set_text`, `ui_set_value`, `input_pressed`

**Visual-Graph-API:** `UI/Set Text`, `UI/Set Value`, `Input/Pressed`

<a id="interface-panels-images-and-text"></a>

### Panels, images and text

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Zweck und Einsatz:** Panels, images and text im Bereich Interface Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Interface. Verwenden, wenn das Projekt Panels, images and text benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A Canvas UI object or UI Showcase template

**Exakter Ablauf:**

1. Interface und danach Interface Studio öffnen.
2. Panels, images and text wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Panels, images and text ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Panels, images and text wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Panels, images and text mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Panels, images and text konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Panels, images and text ergänzen.

**Rhai-API:** `ui_set_text`, `ui_set_value`, `input_pressed`

**Visual-Graph-API:** `UI/Set Text`, `UI/Set Value`, `Input/Pressed`

<a id="interface-buttons-and-inputs"></a>

### Buttons and inputs

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Zweck und Einsatz:** Buttons and inputs im Bereich Interface Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Interface. Verwenden, wenn das Projekt Buttons and inputs benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A Canvas UI object or UI Showcase template

**Exakter Ablauf:**

1. Interface und danach Interface Studio öffnen.
2. Buttons and inputs wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Buttons and inputs ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Buttons and inputs wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Buttons and inputs mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Buttons and inputs konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Buttons and inputs ergänzen.

**Rhai-API:** `ui_set_text`, `ui_set_value`, `input_pressed`

**Visual-Graph-API:** `UI/Set Text`, `UI/Set Value`, `Input/Pressed`

<a id="interface-checkbox-slider-and-progress"></a>

### Checkbox, slider and progress

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Zweck und Einsatz:** Checkbox, slider and progress im Bereich Interface Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Interface. Verwenden, wenn das Projekt Checkbox, slider and progress benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A Canvas UI object or UI Showcase template

**Exakter Ablauf:**

1. Interface und danach Interface Studio öffnen.
2. Checkbox, slider and progress wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Checkbox, slider and progress ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Checkbox, slider and progress wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Checkbox, slider and progress mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Checkbox, slider and progress konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Checkbox, slider and progress ergänzen.

**Rhai-API:** `ui_set_text`, `ui_set_value`, `input_pressed`

**Visual-Graph-API:** `UI/Set Text`, `UI/Set Value`, `Input/Pressed`

<a id="interface-anchors-and-constraints"></a>

### Anchors and constraints

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Zweck und Einsatz:** Anchors and constraints im Bereich Interface Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Interface. Verwenden, wenn das Projekt Anchors and constraints benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A Canvas UI object or UI Showcase template

**Exakter Ablauf:**

1. Interface und danach Interface Studio öffnen.
2. Anchors and constraints wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Anchors and constraints ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Anchors and constraints wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Anchors and constraints mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Anchors and constraints konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Anchors and constraints ergänzen.

**Rhai-API:** `ui_set_text`, `ui_set_value`, `input_pressed`

**Visual-Graph-API:** `UI/Set Text`, `UI/Set Value`, `Input/Pressed`

<a id="interface-layout-containers"></a>

### Layout containers

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Zweck und Einsatz:** Layout containers im Bereich Interface Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Interface. Verwenden, wenn das Projekt Layout containers benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A Canvas UI object or UI Showcase template

**Exakter Ablauf:**

1. Interface und danach Interface Studio öffnen.
2. Layout containers wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Layout containers ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Layout containers wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Layout containers mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Layout containers konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Layout containers ergänzen.

**Rhai-API:** `ui_set_text`, `ui_set_value`, `input_pressed`

**Visual-Graph-API:** `UI/Set Text`, `UI/Set Value`, `Input/Pressed`

<a id="interface-clipping-and-scrolling"></a>

### Clipping and scrolling

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Zweck und Einsatz:** Clipping and scrolling im Bereich Interface Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Interface. Verwenden, wenn das Projekt Clipping and scrolling benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A Canvas UI object or UI Showcase template

**Exakter Ablauf:**

1. Interface und danach Interface Studio öffnen.
2. Clipping and scrolling wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Clipping and scrolling ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Clipping and scrolling wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Clipping and scrolling mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Clipping and scrolling konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Clipping and scrolling ergänzen.

**Rhai-API:** `ui_set_text`, `ui_set_value`, `input_pressed`

**Visual-Graph-API:** `UI/Set Text`, `UI/Set Value`, `Input/Pressed`

<a id="interface-themes-and-variants"></a>

### Themes and variants

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Zweck und Einsatz:** Themes and variants im Bereich Interface Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Interface. Verwenden, wenn das Projekt Themes and variants benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A Canvas UI object or UI Showcase template

**Exakter Ablauf:**

1. Interface und danach Interface Studio öffnen.
2. Themes and variants wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Themes and variants ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Themes and variants wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Themes and variants mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Themes and variants konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Themes and variants ergänzen.

**Rhai-API:** `ui_set_text`, `ui_set_value`, `input_pressed`

**Visual-Graph-API:** `UI/Set Text`, `UI/Set Value`, `Input/Pressed`

<a id="interface-reusable-ui-components"></a>

### Reusable UI components

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Zweck und Einsatz:** Reusable UI components im Bereich Interface Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Interface. Verwenden, wenn das Projekt Reusable UI components benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A Canvas UI object or UI Showcase template

**Exakter Ablauf:**

1. Interface und danach Interface Studio öffnen.
2. Reusable UI components wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Reusable UI components ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Reusable UI components wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Reusable UI components mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Reusable UI components konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Reusable UI components ergänzen.

**Rhai-API:** `ui_set_text`, `ui_set_value`, `input_pressed`

**Visual-Graph-API:** `UI/Set Text`, `UI/Set Value`, `Input/Pressed`

<a id="interface-localization-tables"></a>

### Localization tables

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Zweck und Einsatz:** Localization tables im Bereich Interface Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Interface. Verwenden, wenn das Projekt Localization tables benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A Canvas UI object or UI Showcase template

**Exakter Ablauf:**

1. Interface und danach Interface Studio öffnen.
2. Localization tables wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Localization tables ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Localization tables wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Localization tables mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Localization tables konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Localization tables ergänzen.

**Rhai-API:** `ui_set_text`, `ui_set_value`, `input_pressed`

**Visual-Graph-API:** `UI/Set Text`, `UI/Set Value`, `Input/Pressed`

<a id="interface-fallback-and-pseudolocales"></a>

### Fallback and pseudolocales

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Zweck und Einsatz:** Fallback and pseudolocales im Bereich Interface Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Interface. Verwenden, wenn das Projekt Fallback and pseudolocales benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A Canvas UI object or UI Showcase template

**Exakter Ablauf:**

1. Interface und danach Interface Studio öffnen.
2. Fallback and pseudolocales wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Fallback and pseudolocales ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Fallback and pseudolocales wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Fallback and pseudolocales mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Fallback and pseudolocales konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Fallback and pseudolocales ergänzen.

**Rhai-API:** `ui_set_text`, `ui_set_value`, `input_pressed`

**Visual-Graph-API:** `UI/Set Text`, `UI/Set Value`, `Input/Pressed`

<a id="interface-rtl-and-bidirectional-text"></a>

### RTL and bidirectional text

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Zweck und Einsatz:** RTL and bidirectional text im Bereich Interface Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Interface. Verwenden, wenn das Projekt RTL and bidirectional text benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A Canvas UI object or UI Showcase template

**Exakter Ablauf:**

1. Interface und danach Interface Studio öffnen.
2. RTL and bidirectional text wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** RTL and bidirectional text ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** RTL and bidirectional text wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- RTL and bidirectional text mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, RTL and bidirectional text konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für RTL and bidirectional text ergänzen.

**Rhai-API:** `ui_set_text`, `ui_set_value`, `input_pressed`

**Visual-Graph-API:** `UI/Set Text`, `UI/Set Value`, `Input/Pressed`

<a id="interface-number-date-currency-formatting"></a>

### Number/date/currency formatting

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Zweck und Einsatz:** Number/date/currency formatting im Bereich Interface Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Interface. Verwenden, wenn das Projekt Number/date/currency formatting benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A Canvas UI object or UI Showcase template

**Exakter Ablauf:**

1. Interface und danach Interface Studio öffnen.
2. Number/date/currency formatting wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Number/date/currency formatting ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Number/date/currency formatting wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Number/date/currency formatting mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Number/date/currency formatting konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Number/date/currency formatting ergänzen.

**Rhai-API:** `ui_set_text`, `ui_set_value`, `input_pressed`

**Visual-Graph-API:** `UI/Set Text`, `UI/Set Value`, `Input/Pressed`

<a id="interface-focus-navigation"></a>

### Focus navigation

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Zweck und Einsatz:** Focus navigation im Bereich Interface Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Interface. Verwenden, wenn das Projekt Focus navigation benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A Canvas UI object or UI Showcase template

**Exakter Ablauf:**

1. Interface und danach Interface Studio öffnen.
2. Focus navigation wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Focus navigation ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Focus navigation wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Focus navigation mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Focus navigation konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Focus navigation ergänzen.

**Rhai-API:** `ui_set_text`, `ui_set_value`, `input_pressed`

**Visual-Graph-API:** `UI/Set Text`, `UI/Set Value`, `Input/Pressed`

<a id="interface-screen-reader-metadata"></a>

### Screen-reader metadata

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Zweck und Einsatz:** Screen-reader metadata im Bereich Interface Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Interface. Verwenden, wenn das Projekt Screen-reader metadata benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A Canvas UI object or UI Showcase template

**Exakter Ablauf:**

1. Interface und danach Interface Studio öffnen.
2. Screen-reader metadata wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Screen-reader metadata ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Screen-reader metadata wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Screen-reader metadata mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Screen-reader metadata konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Screen-reader metadata ergänzen.

**Rhai-API:** `ui_set_text`, `ui_set_value`, `input_pressed`

**Visual-Graph-API:** `UI/Set Text`, `UI/Set Value`, `Input/Pressed`

<a id="interface-contrast-and-target-size-audit"></a>

### Contrast and target-size audit

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Zweck und Einsatz:** Contrast and target-size audit im Bereich Interface Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Interface. Verwenden, wenn das Projekt Contrast and target-size audit benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A Canvas UI object or UI Showcase template

**Exakter Ablauf:**

1. Interface und danach Interface Studio öffnen.
2. Contrast and target-size audit wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Contrast and target-size audit ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Contrast and target-size audit wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Contrast and target-size audit mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Contrast and target-size audit konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Contrast and target-size audit ergänzen.

**Rhai-API:** `ui_set_text`, `ui_set_value`, `input_pressed`

**Visual-Graph-API:** `UI/Set Text`, `UI/Set Value`, `Input/Pressed`

<a id="interface-reduced-motion"></a>

### Reduced motion

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Zweck und Einsatz:** Reduced motion im Bereich Interface Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Interface. Verwenden, wenn das Projekt Reduced motion benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A Canvas UI object or UI Showcase template

**Exakter Ablauf:**

1. Interface und danach Interface Studio öffnen.
2. Reduced motion wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Reduced motion ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Reduced motion wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Reduced motion mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Reduced motion konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Reduced motion ergänzen.

**Rhai-API:** `ui_set_text`, `ui_set_value`, `input_pressed`

**Visual-Graph-API:** `UI/Set Text`, `UI/Set Value`, `Input/Pressed`

<a id="interface-input-prompts-and-captions"></a>

### Input prompts and captions

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Zweck und Einsatz:** Input prompts and captions im Bereich Interface Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Interface. Verwenden, wenn das Projekt Input prompts and captions benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A Canvas UI object or UI Showcase template

**Exakter Ablauf:**

1. Interface und danach Interface Studio öffnen.
2. Input prompts and captions wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Input prompts and captions ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Input prompts and captions wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Input prompts and captions mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Input prompts and captions konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Input prompts and captions ergänzen.

**Rhai-API:** `ui_set_text`, `ui_set_value`, `input_pressed`

**Visual-Graph-API:** `UI/Set Text`, `UI/Set Value`, `Input/Pressed`


## Audio Studio

<a id="audio-audio-clips-and-sources"></a>

### Audio clips and sources

**Klassifikation:** Manual · Runtime · Project-wide · Per-object · Reversible

**Zweck und Einsatz:** Audio clips and sources im Bereich Audio Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Animation / Debug. Verwenden, wenn das Projekt Audio clips and sources benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An imported audio asset

**Exakter Ablauf:**

1. Animation / Debug und danach Audio Studio öffnen.
2. Audio clips and sources wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Audio clips and sources ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Audio clips and sources wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Audio clips and sources mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Audio clips and sources konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Audio clips and sources ergänzen.

**Rhai-API:** `audio_play`, `audio_stop`, `audio_set_bus`

**Visual-Graph-API:** `Audio/Play`, `Audio/Stop`

<a id="audio-waveform-regions"></a>

### Waveform regions

**Klassifikation:** Manual · Runtime · Project-wide · Per-object · Reversible

**Zweck und Einsatz:** Waveform regions im Bereich Audio Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Animation / Debug. Verwenden, wenn das Projekt Waveform regions benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An imported audio asset

**Exakter Ablauf:**

1. Animation / Debug und danach Audio Studio öffnen.
2. Waveform regions wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Waveform regions ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Waveform regions wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Waveform regions mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Waveform regions konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Waveform regions ergänzen.

**Rhai-API:** `audio_play`, `audio_stop`, `audio_set_bus`

**Visual-Graph-API:** `Audio/Play`, `Audio/Stop`

<a id="audio-loop-and-seek"></a>

### Loop and seek

**Klassifikation:** Manual · Runtime · Project-wide · Per-object · Reversible

**Zweck und Einsatz:** Loop and seek im Bereich Audio Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Animation / Debug. Verwenden, wenn das Projekt Loop and seek benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An imported audio asset

**Exakter Ablauf:**

1. Animation / Debug und danach Audio Studio öffnen.
2. Loop and seek wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Loop and seek ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Loop and seek wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Loop and seek mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Loop and seek konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Loop and seek ergänzen.

**Rhai-API:** `audio_play`, `audio_stop`, `audio_set_bus`

**Visual-Graph-API:** `Audio/Play`, `Audio/Stop`

<a id="audio-bus-routing"></a>

### Bus routing

**Klassifikation:** Manual · Runtime · Project-wide · Per-object · Reversible

**Zweck und Einsatz:** Bus routing im Bereich Audio Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Animation / Debug. Verwenden, wenn das Projekt Bus routing benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An imported audio asset

**Exakter Ablauf:**

1. Animation / Debug und danach Audio Studio öffnen.
2. Bus routing wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Bus routing ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Bus routing wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Bus routing mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Bus routing konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Bus routing ergänzen.

**Rhai-API:** `audio_play`, `audio_stop`, `audio_set_bus`

**Visual-Graph-API:** `Audio/Play`, `Audio/Stop`

<a id="audio-mixer-effects-and-limiter"></a>

### Mixer effects and limiter

**Klassifikation:** Manual · Runtime · Project-wide · Per-object · Reversible

**Zweck und Einsatz:** Mixer effects and limiter im Bereich Audio Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Animation / Debug. Verwenden, wenn das Projekt Mixer effects and limiter benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An imported audio asset

**Exakter Ablauf:**

1. Animation / Debug und danach Audio Studio öffnen.
2. Mixer effects and limiter wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Mixer effects and limiter ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Mixer effects and limiter wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Mixer effects and limiter mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Mixer effects and limiter konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Mixer effects and limiter ergänzen.

**Rhai-API:** `audio_play`, `audio_stop`, `audio_set_bus`

**Visual-Graph-API:** `Audio/Play`, `Audio/Stop`

<a id="audio-sends-and-snapshots"></a>

### Sends and snapshots

**Klassifikation:** Manual · Runtime · Project-wide · Per-object · Reversible

**Zweck und Einsatz:** Sends and snapshots im Bereich Audio Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Animation / Debug. Verwenden, wenn das Projekt Sends and snapshots benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An imported audio asset

**Exakter Ablauf:**

1. Animation / Debug und danach Audio Studio öffnen.
2. Sends and snapshots wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Sends and snapshots ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Sends and snapshots wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Sends and snapshots mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Sends and snapshots konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Sends and snapshots ergänzen.

**Rhai-API:** `audio_play`, `audio_stop`, `audio_set_bus`

**Visual-Graph-API:** `Audio/Play`, `Audio/Stop`

<a id="audio-automation-and-fades"></a>

### Automation and fades

**Klassifikation:** Manual · Runtime · Project-wide · Per-object · Reversible

**Zweck und Einsatz:** Automation and fades im Bereich Audio Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Animation / Debug. Verwenden, wenn das Projekt Automation and fades benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An imported audio asset

**Exakter Ablauf:**

1. Animation / Debug und danach Audio Studio öffnen.
2. Automation and fades wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Automation and fades ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Automation and fades wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Automation and fades mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Automation and fades konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Automation and fades ergänzen.

**Rhai-API:** `audio_play`, `audio_stop`, `audio_set_bus`

**Visual-Graph-API:** `Audio/Play`, `Audio/Stop`

<a id="audio-spatial-audio"></a>

### Spatial audio

**Klassifikation:** Manual · Runtime · Project-wide · Per-object · Reversible

**Zweck und Einsatz:** Spatial audio im Bereich Audio Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Animation / Debug. Verwenden, wenn das Projekt Spatial audio benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An imported audio asset

**Exakter Ablauf:**

1. Animation / Debug und danach Audio Studio öffnen.
2. Spatial audio wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Spatial audio ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Spatial audio wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Spatial audio mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Spatial audio konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Spatial audio ergänzen.

**Rhai-API:** `audio_play`, `audio_stop`, `audio_set_bus`

**Visual-Graph-API:** `Audio/Play`, `Audio/Stop`

<a id="audio-playlists"></a>

### Playlists

**Klassifikation:** Manual · Runtime · Project-wide · Per-object · Reversible

**Zweck und Einsatz:** Playlists im Bereich Audio Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Animation / Debug. Verwenden, wenn das Projekt Playlists benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An imported audio asset

**Exakter Ablauf:**

1. Animation / Debug und danach Audio Studio öffnen.
2. Playlists wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Playlists ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Playlists wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Playlists mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Playlists konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Playlists ergänzen.

**Rhai-API:** `audio_play`, `audio_stop`, `audio_set_bus`

**Visual-Graph-API:** `Audio/Play`, `Audio/Stop`

<a id="audio-preload-and-streaming"></a>

### Preload and streaming

**Klassifikation:** Manual · Runtime · Project-wide · Per-object · Reversible

**Zweck und Einsatz:** Preload and streaming im Bereich Audio Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Animation / Debug. Verwenden, wenn das Projekt Preload and streaming benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An imported audio asset

**Exakter Ablauf:**

1. Animation / Debug und danach Audio Studio öffnen.
2. Preload and streaming wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Preload and streaming ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Preload and streaming wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Preload and streaming mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Preload and streaming konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Preload and streaming ergänzen.

**Rhai-API:** `audio_play`, `audio_stop`, `audio_set_bus`

**Visual-Graph-API:** `Audio/Play`, `Audio/Stop`

<a id="audio-voice-budgets"></a>

### Voice budgets

**Klassifikation:** Manual · Runtime · Project-wide · Per-object · Reversible

**Zweck und Einsatz:** Voice budgets im Bereich Audio Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Animation / Debug. Verwenden, wenn das Projekt Voice budgets benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An imported audio asset

**Exakter Ablauf:**

1. Animation / Debug und danach Audio Studio öffnen.
2. Voice budgets wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Voice budgets ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Voice budgets wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Voice budgets mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Voice budgets konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Voice budgets ergänzen.

**Rhai-API:** `audio_play`, `audio_stop`, `audio_set_bus`

**Visual-Graph-API:** `Audio/Play`, `Audio/Stop`

<a id="audio-device-recovery"></a>

### Device recovery

**Klassifikation:** Manual · Runtime · Project-wide · Per-object · Reversible

**Zweck und Einsatz:** Device recovery im Bereich Audio Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Animation / Debug. Verwenden, wenn das Projekt Device recovery benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An imported audio asset

**Exakter Ablauf:**

1. Animation / Debug und danach Audio Studio öffnen.
2. Device recovery wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Device recovery ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Device recovery wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Device recovery mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Device recovery konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Device recovery ergänzen.

**Rhai-API:** `audio_play`, `audio_stop`, `audio_set_bus`

**Visual-Graph-API:** `Audio/Play`, `Audio/Stop`


## TileMap and World Studio

<a id="world-tile-palettes-and-paint-tools"></a>

### Tile palettes and paint tools

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Zweck und Einsatz:** Tile palettes and paint tools im Bereich TileMap and World Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Tile palettes and paint tools benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- TileSet, navigation, AI or world assets as applicable

**Exakter Ablauf:**

1. Design und danach TileMap and World Studio öffnen.
2. Tile palettes and paint tools wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Tile palettes and paint tools ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Tile palettes and paint tools wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Tile palettes and paint tools mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Tile palettes and paint tools konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Tile palettes and paint tools ergänzen.

**Rhai-API:** `navigation_target`, `pool_spawn`, `query_tag`

**Visual-Graph-API:** `Navigation/Set Target`, `Scene/Pool Spawn`, `Scene/Query Tag`

<a id="world-terrain-rules"></a>

### Terrain rules

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Zweck und Einsatz:** Terrain rules im Bereich TileMap and World Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Terrain rules benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- TileSet, navigation, AI or world assets as applicable

**Exakter Ablauf:**

1. Design und danach TileMap and World Studio öffnen.
2. Terrain rules wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Terrain rules ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Terrain rules wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Terrain rules mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Terrain rules konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Terrain rules ergänzen.

**Rhai-API:** `navigation_target`, `pool_spawn`, `query_tag`

**Visual-Graph-API:** `Navigation/Set Target`, `Scene/Pool Spawn`, `Scene/Query Tag`

<a id="world-animated-tiles"></a>

### Animated tiles

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Zweck und Einsatz:** Animated tiles im Bereich TileMap and World Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Animated tiles benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- TileSet, navigation, AI or world assets as applicable

**Exakter Ablauf:**

1. Design und danach TileMap and World Studio öffnen.
2. Animated tiles wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Animated tiles ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Animated tiles wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Animated tiles mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Animated tiles konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Animated tiles ergänzen.

**Rhai-API:** `navigation_target`, `pool_spawn`, `query_tag`

**Visual-Graph-API:** `Navigation/Set Target`, `Scene/Pool Spawn`, `Scene/Query Tag`

<a id="world-tile-collision-and-occlusion"></a>

### Tile collision and occlusion

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Zweck und Einsatz:** Tile collision and occlusion im Bereich TileMap and World Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Tile collision and occlusion benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- TileSet, navigation, AI or world assets as applicable

**Exakter Ablauf:**

1. Design und danach TileMap and World Studio öffnen.
2. Tile collision and occlusion wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Tile collision and occlusion ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Tile collision and occlusion wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Tile collision and occlusion mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Tile collision and occlusion konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Tile collision and occlusion ergänzen.

**Rhai-API:** `navigation_target`, `pool_spawn`, `query_tag`

**Visual-Graph-API:** `Navigation/Set Target`, `Scene/Pool Spawn`, `Scene/Query Tag`

<a id="world-navigation-regions"></a>

### Navigation regions

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Zweck und Einsatz:** Navigation regions im Bereich TileMap and World Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Navigation regions benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- TileSet, navigation, AI or world assets as applicable

**Exakter Ablauf:**

1. Design und danach TileMap and World Studio öffnen.
2. Navigation regions wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Navigation regions ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Navigation regions wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Navigation regions mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Navigation regions konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Navigation regions ergänzen.

**Rhai-API:** `navigation_target`, `pool_spawn`, `query_tag`

**Visual-Graph-API:** `Navigation/Set Target`, `Scene/Pool Spawn`, `Scene/Query Tag`

<a id="world-navigation-agents-and-obstacles"></a>

### Navigation agents and obstacles

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Zweck und Einsatz:** Navigation agents and obstacles im Bereich TileMap and World Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Navigation agents and obstacles benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- TileSet, navigation, AI or world assets as applicable

**Exakter Ablauf:**

1. Design und danach TileMap and World Studio öffnen.
2. Navigation agents and obstacles wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Navigation agents and obstacles ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Navigation agents and obstacles wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Navigation agents and obstacles mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Navigation agents and obstacles konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Navigation agents and obstacles ergänzen.

**Rhai-API:** `navigation_target`, `pool_spawn`, `query_tag`

**Visual-Graph-API:** `Navigation/Set Target`, `Scene/Pool Spawn`, `Scene/Query Tag`

<a id="world-links-and-cost-areas"></a>

### Links and cost areas

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Zweck und Einsatz:** Links and cost areas im Bereich TileMap and World Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Links and cost areas benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- TileSet, navigation, AI or world assets as applicable

**Exakter Ablauf:**

1. Design und danach TileMap and World Studio öffnen.
2. Links and cost areas wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Links and cost areas ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Links and cost areas wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Links and cost areas mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Links and cost areas konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Links and cost areas ergänzen.

**Rhai-API:** `navigation_target`, `pool_spawn`, `query_tag`

**Visual-Graph-API:** `Navigation/Set Target`, `Scene/Pool Spawn`, `Scene/Query Tag`

<a id="world-path-following"></a>

### Path following

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Zweck und Einsatz:** Path following im Bereich TileMap and World Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Path following benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- TileSet, navigation, AI or world assets as applicable

**Exakter Ablauf:**

1. Design und danach TileMap and World Studio öffnen.
2. Path following wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Path following ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Path following wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Path following mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Path following konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Path following ergänzen.

**Rhai-API:** `navigation_target`, `pool_spawn`, `query_tag`

**Visual-Graph-API:** `Navigation/Set Target`, `Scene/Pool Spawn`, `Scene/Query Tag`

<a id="world-behavior-trees"></a>

### Behavior trees

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Zweck und Einsatz:** Behavior trees im Bereich TileMap and World Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Behavior trees benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- TileSet, navigation, AI or world assets as applicable

**Exakter Ablauf:**

1. Design und danach TileMap and World Studio öffnen.
2. Behavior trees wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Behavior trees ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Behavior trees wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Behavior trees mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Behavior trees konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Behavior trees ergänzen.

**Rhai-API:** `navigation_target`, `pool_spawn`, `query_tag`

**Visual-Graph-API:** `Navigation/Set Target`, `Scene/Pool Spawn`, `Scene/Query Tag`

<a id="world-state-machines"></a>

### State machines

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Zweck und Einsatz:** State machines im Bereich TileMap and World Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt State machines benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- TileSet, navigation, AI or world assets as applicable

**Exakter Ablauf:**

1. Design und danach TileMap and World Studio öffnen.
2. State machines wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** State machines ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** State machines wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- State machines mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, State machines konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für State machines ergänzen.

**Rhai-API:** `navigation_target`, `pool_spawn`, `query_tag`

**Visual-Graph-API:** `Navigation/Set Target`, `Scene/Pool Spawn`, `Scene/Query Tag`

<a id="world-perception-and-utility-ai"></a>

### Perception and utility AI

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Zweck und Einsatz:** Perception and utility AI im Bereich TileMap and World Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Perception and utility AI benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- TileSet, navigation, AI or world assets as applicable

**Exakter Ablauf:**

1. Design und danach TileMap and World Studio öffnen.
2. Perception and utility AI wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Perception and utility AI ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Perception and utility AI wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Perception and utility AI mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Perception and utility AI konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Perception and utility AI ergänzen.

**Rhai-API:** `navigation_target`, `pool_spawn`, `query_tag`

**Visual-Graph-API:** `Navigation/Set Target`, `Scene/Pool Spawn`, `Scene/Query Tag`

<a id="world-world-chunks"></a>

### World chunks

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Zweck und Einsatz:** World chunks im Bereich TileMap and World Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt World chunks benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- TileSet, navigation, AI or world assets as applicable

**Exakter Ablauf:**

1. Design und danach TileMap and World Studio öffnen.
2. World chunks wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** World chunks ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** World chunks wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- World chunks mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, World chunks konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für World chunks ergänzen.

**Rhai-API:** `navigation_target`, `pool_spawn`, `query_tag`

**Visual-Graph-API:** `Navigation/Set Target`, `Scene/Pool Spawn`, `Scene/Query Tag`

<a id="world-streaming-dependencies"></a>

### Streaming dependencies

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Zweck und Einsatz:** Streaming dependencies im Bereich TileMap and World Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Streaming dependencies benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- TileSet, navigation, AI or world assets as applicable

**Exakter Ablauf:**

1. Design und danach TileMap and World Studio öffnen.
2. Streaming dependencies wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Streaming dependencies ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Streaming dependencies wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Streaming dependencies mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Streaming dependencies konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Streaming dependencies ergänzen.

**Rhai-API:** `navigation_target`, `pool_spawn`, `query_tag`

**Visual-Graph-API:** `Navigation/Set Target`, `Scene/Pool Spawn`, `Scene/Query Tag`

<a id="world-origin-shifting"></a>

### Origin shifting

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Zweck und Einsatz:** Origin shifting im Bereich TileMap and World Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Origin shifting benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- TileSet, navigation, AI or world assets as applicable

**Exakter Ablauf:**

1. Design und danach TileMap and World Studio öffnen.
2. Origin shifting wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Origin shifting ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Origin shifting wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Origin shifting mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Origin shifting konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Origin shifting ergänzen.

**Rhai-API:** `navigation_target`, `pool_spawn`, `query_tag`

**Visual-Graph-API:** `Navigation/Set Target`, `Scene/Pool Spawn`, `Scene/Query Tag`

<a id="world-object-pooling"></a>

### Object pooling

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Zweck und Einsatz:** Object pooling im Bereich TileMap and World Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Object pooling benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- TileSet, navigation, AI or world assets as applicable

**Exakter Ablauf:**

1. Design und danach TileMap and World Studio öffnen.
2. Object pooling wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Object pooling ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Object pooling wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Object pooling mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Object pooling konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Object pooling ergänzen.

**Rhai-API:** `navigation_target`, `pool_spawn`, `query_tag`

**Visual-Graph-API:** `Navigation/Set Target`, `Scene/Pool Spawn`, `Scene/Query Tag`

<a id="world-background-baking"></a>

### Background baking

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Per-object · Reversible

**Zweck und Einsatz:** Background baking im Bereich TileMap and World Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt Background baking benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- TileSet, navigation, AI or world assets as applicable

**Exakter Ablauf:**

1. Design und danach TileMap and World Studio öffnen.
2. Background baking wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Background baking ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Background baking wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Background baking mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Background baking konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Background baking ergänzen.

**Rhai-API:** `navigation_target`, `pool_spawn`, `query_tag`

**Visual-Graph-API:** `Navigation/Set Target`, `Scene/Pool Spawn`, `Scene/Query Tag`


## Rendering Studio

<a id="rendering-canvas2d-and-webgl2-selection"></a>

### Canvas2D and WebGL2 selection

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Reversible

**Zweck und Einsatz:** Canvas2D and WebGL2 selection im Bereich Rendering Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage. Verwenden, wenn das Projekt Canvas2D and WebGL2 selection benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Renderer-compatible scene content

**Exakter Ablauf:**

1. Manage und danach Rendering Studio öffnen.
2. Canvas2D and WebGL2 selection wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Canvas2D and WebGL2 selection ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Canvas2D and WebGL2 selection wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Canvas2D and WebGL2 selection mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Canvas2D and WebGL2 selection konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Canvas2D and WebGL2 selection ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** `Material and particle graph node catalogs`

<a id="rendering-material-graph"></a>

### Material graph

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Reversible

**Zweck und Einsatz:** Material graph im Bereich Rendering Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage. Verwenden, wenn das Projekt Material graph benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Renderer-compatible scene content

**Exakter Ablauf:**

1. Manage und danach Rendering Studio öffnen.
2. Material graph wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Material graph ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Material graph wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Material graph mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Material graph konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Material graph ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** `Material and particle graph node catalogs`

<a id="rendering-layered-2d-effects"></a>

### Layered 2D effects

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Reversible

**Zweck und Einsatz:** Layered 2D effects im Bereich Rendering Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage. Verwenden, wenn das Projekt Layered 2D effects benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Renderer-compatible scene content

**Exakter Ablauf:**

1. Manage und danach Rendering Studio öffnen.
2. Layered 2D effects wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Layered 2D effects ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Layered 2D effects wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Layered 2D effects mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Layered 2D effects konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Layered 2D effects ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** `Material and particle graph node catalogs`

<a id="rendering-lights-and-shadows"></a>

### Lights and shadows

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Reversible

**Zweck und Einsatz:** Lights and shadows im Bereich Rendering Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage. Verwenden, wenn das Projekt Lights and shadows benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Renderer-compatible scene content

**Exakter Ablauf:**

1. Manage und danach Rendering Studio öffnen.
2. Lights and shadows wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Lights and shadows ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Lights and shadows wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Lights and shadows mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Lights and shadows konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Lights and shadows ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** `Material and particle graph node catalogs`

<a id="rendering-render-graph-and-textures"></a>

### Render graph and textures

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Reversible

**Zweck und Einsatz:** Render graph and textures im Bereich Rendering Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage. Verwenden, wenn das Projekt Render graph and textures benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Renderer-compatible scene content

**Exakter Ablauf:**

1. Manage und danach Rendering Studio öffnen.
2. Render graph and textures wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Render graph and textures ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Render graph and textures wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Render graph and textures mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Render graph and textures konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Render graph and textures ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** `Material and particle graph node catalogs`

<a id="rendering-post-process-presets"></a>

### Post-process presets

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Reversible

**Zweck und Einsatz:** Post-process presets im Bereich Rendering Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage. Verwenden, wenn das Projekt Post-process presets benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Renderer-compatible scene content

**Exakter Ablauf:**

1. Manage und danach Rendering Studio öffnen.
2. Post-process presets wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Post-process presets ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Post-process presets wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Post-process presets mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Post-process presets konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Post-process presets ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** `Material and particle graph node catalogs`

<a id="rendering-camera-volumes"></a>

### Camera volumes

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Reversible

**Zweck und Einsatz:** Camera volumes im Bereich Rendering Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage. Verwenden, wenn das Projekt Camera volumes benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Renderer-compatible scene content

**Exakter Ablauf:**

1. Manage und danach Rendering Studio öffnen.
2. Camera volumes wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Camera volumes ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Camera volumes wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Camera volumes mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Camera volumes konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Camera volumes ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** `Material and particle graph node catalogs`

<a id="rendering-particles-and-trails"></a>

### Particles and trails

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Reversible

**Zweck und Einsatz:** Particles and trails im Bereich Rendering Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage. Verwenden, wenn das Projekt Particles and trails benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Renderer-compatible scene content

**Exakter Ablauf:**

1. Manage und danach Rendering Studio öffnen.
2. Particles and trails wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Particles and trails ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Particles and trails wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Particles and trails mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Particles and trails konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Particles and trails ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** `Material and particle graph node catalogs`

<a id="rendering-shader-validation-and-fallback"></a>

### Shader validation and fallback

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Reversible

**Zweck und Einsatz:** Shader validation and fallback im Bereich Rendering Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage. Verwenden, wenn das Projekt Shader validation and fallback benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Renderer-compatible scene content

**Exakter Ablauf:**

1. Manage und danach Rendering Studio öffnen.
2. Shader validation and fallback wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Shader validation and fallback ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Shader validation and fallback wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Shader validation and fallback mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Shader validation and fallback konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Shader validation and fallback ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** `Material and particle graph node catalogs`

<a id="rendering-color-space"></a>

### Color space

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Reversible

**Zweck und Einsatz:** Color space im Bereich Rendering Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage. Verwenden, wenn das Projekt Color space benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Renderer-compatible scene content

**Exakter Ablauf:**

1. Manage und danach Rendering Studio öffnen.
2. Color space wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Color space ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Color space wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Color space mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Color space konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Color space ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** `Material and particle graph node catalogs`

<a id="rendering-batching-and-instancing"></a>

### Batching and instancing

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Reversible

**Zweck und Einsatz:** Batching and instancing im Bereich Rendering Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage. Verwenden, wenn das Projekt Batching and instancing benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Renderer-compatible scene content

**Exakter Ablauf:**

1. Manage und danach Rendering Studio öffnen.
2. Batching and instancing wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Batching and instancing ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Batching and instancing wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Batching and instancing mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Batching and instancing konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Batching and instancing ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** `Material and particle graph node catalogs`

<a id="rendering-culling"></a>

### Culling

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Reversible

**Zweck und Einsatz:** Culling im Bereich Rendering Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage. Verwenden, wenn das Projekt Culling benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Renderer-compatible scene content

**Exakter Ablauf:**

1. Manage und danach Rendering Studio öffnen.
2. Culling wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Culling ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Culling wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Culling mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Culling konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Culling ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** `Material and particle graph node catalogs`

<a id="rendering-overdraw-diagnostics"></a>

### Overdraw diagnostics

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Reversible

**Zweck und Einsatz:** Overdraw diagnostics im Bereich Rendering Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage. Verwenden, wenn das Projekt Overdraw diagnostics benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Renderer-compatible scene content

**Exakter Ablauf:**

1. Manage und danach Rendering Studio öffnen.
2. Overdraw diagnostics wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Overdraw diagnostics ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Overdraw diagnostics wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Overdraw diagnostics mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Overdraw diagnostics konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Overdraw diagnostics ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** `Material and particle graph node catalogs`

<a id="rendering-atlas-recommendations"></a>

### Atlas recommendations

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Reversible

**Zweck und Einsatz:** Atlas recommendations im Bereich Rendering Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage. Verwenden, wenn das Projekt Atlas recommendations benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Renderer-compatible scene content

**Exakter Ablauf:**

1. Manage und danach Rendering Studio öffnen.
2. Atlas recommendations wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Atlas recommendations ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Atlas recommendations wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Atlas recommendations mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Atlas recommendations konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Atlas recommendations ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** `Material and particle graph node catalogs`

<a id="rendering-quality-profiles"></a>

### Quality profiles

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Reversible

**Zweck und Einsatz:** Quality profiles im Bereich Rendering Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage. Verwenden, wenn das Projekt Quality profiles benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Renderer-compatible scene content

**Exakter Ablauf:**

1. Manage und danach Rendering Studio öffnen.
2. Quality profiles wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Quality profiles ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Quality profiles wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Quality profiles mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Quality profiles konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Quality profiles ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** `Material and particle graph node catalogs`

<a id="rendering-pixel-perfect-and-high-dpi-rendering"></a>

### Pixel-perfect and high-DPI rendering

**Klassifikation:** Manual · Assisted · Runtime · Project-wide · Reversible

**Zweck und Einsatz:** Pixel-perfect and high-DPI rendering im Bereich Rendering Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage. Verwenden, wenn das Projekt Pixel-perfect and high-DPI rendering benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Renderer-compatible scene content

**Exakter Ablauf:**

1. Manage und danach Rendering Studio öffnen.
2. Pixel-perfect and high-DPI rendering wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Pixel-perfect and high-DPI rendering ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Pixel-perfect and high-DPI rendering wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Pixel-perfect and high-DPI rendering mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Pixel-perfect and high-DPI rendering konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Pixel-perfect and high-DPI rendering ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** `Material and particle graph node catalogs`


## Debug, Console and Profiler

<a id="debug-play-pause-and-step"></a>

### Play, pause and step

**Klassifikation:** Automatic · Manual · Runtime · Editor-only · Project-wide

**Zweck und Einsatz:** Play, pause and step im Bereich Debug, Console and Profiler erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Debug. Verwenden, wenn das Projekt Play, pause and step benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A playable scene
- Representative runtime input for profiling

**Exakter Ablauf:**

1. Debug und danach Debug, Console and Profiler öffnen.
2. Play, pause and step wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Play, pause and step ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Play, pause and step wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Play, pause and step mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Play, pause and step konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Play, pause and step ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="debug-runtime-inspector"></a>

### Runtime Inspector

**Klassifikation:** Automatic · Manual · Runtime · Editor-only · Project-wide

**Zweck und Einsatz:** Runtime Inspector im Bereich Debug, Console and Profiler erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Debug. Verwenden, wenn das Projekt Runtime Inspector benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A playable scene
- Representative runtime input for profiling

**Exakter Ablauf:**

1. Debug und danach Debug, Console and Profiler öffnen.
2. Runtime Inspector wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Runtime Inspector ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Runtime Inspector wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Runtime Inspector mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Runtime Inspector konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Runtime Inspector ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="debug-console-filters"></a>

### Console filters

**Klassifikation:** Automatic · Manual · Runtime · Editor-only · Project-wide

**Zweck und Einsatz:** Console filters im Bereich Debug, Console and Profiler erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Debug. Verwenden, wenn das Projekt Console filters benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A playable scene
- Representative runtime input for profiling

**Exakter Ablauf:**

1. Debug und danach Debug, Console and Profiler öffnen.
2. Console filters wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Console filters ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Console filters wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Console filters mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Console filters konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Console filters ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="debug-fault-center"></a>

### Fault Center

**Klassifikation:** Automatic · Manual · Runtime · Editor-only · Project-wide

**Zweck und Einsatz:** Fault Center im Bereich Debug, Console and Profiler erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Debug. Verwenden, wenn das Projekt Fault Center benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A playable scene
- Representative runtime input for profiling

**Exakter Ablauf:**

1. Debug und danach Debug, Console and Profiler öffnen.
2. Fault Center wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Fault Center ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Fault Center wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Fault Center mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Fault Center konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Fault Center ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="debug-crash-reporter"></a>

### Crash reporter

**Klassifikation:** Automatic · Manual · Runtime · Editor-only · Project-wide

**Zweck und Einsatz:** Crash reporter im Bereich Debug, Console and Profiler erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Debug. Verwenden, wenn das Projekt Crash reporter benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A playable scene
- Representative runtime input for profiling

**Exakter Ablauf:**

1. Debug und danach Debug, Console and Profiler öffnen.
2. Crash reporter wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Crash reporter ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Crash reporter wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Crash reporter mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Crash reporter konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Crash reporter ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="debug-safe-mode"></a>

### Safe Mode

**Klassifikation:** Automatic · Manual · Runtime · Editor-only · Project-wide

**Zweck und Einsatz:** Safe Mode im Bereich Debug, Console and Profiler erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Debug. Verwenden, wenn das Projekt Safe Mode benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A playable scene
- Representative runtime input for profiling

**Exakter Ablauf:**

1. Debug und danach Debug, Console and Profiler öffnen.
2. Safe Mode wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Safe Mode ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Safe Mode wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Safe Mode mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Safe Mode konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Safe Mode ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="debug-cpu-and-frame-profiler"></a>

### CPU and frame profiler

**Klassifikation:** Automatic · Manual · Runtime · Editor-only · Project-wide

**Zweck und Einsatz:** CPU and frame profiler im Bereich Debug, Console and Profiler erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Debug. Verwenden, wenn das Projekt CPU and frame profiler benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A playable scene
- Representative runtime input for profiling

**Exakter Ablauf:**

1. Debug und danach Debug, Console and Profiler öffnen.
2. CPU and frame profiler wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** CPU and frame profiler ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** CPU and frame profiler wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- CPU and frame profiler mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, CPU and frame profiler konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für CPU and frame profiler ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="debug-render-physics-audio-and-script-timing"></a>

### Render, physics, audio and script timing

**Klassifikation:** Automatic · Manual · Runtime · Editor-only · Project-wide

**Zweck und Einsatz:** Render, physics, audio and script timing im Bereich Debug, Console and Profiler erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Debug. Verwenden, wenn das Projekt Render, physics, audio and script timing benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A playable scene
- Representative runtime input for profiling

**Exakter Ablauf:**

1. Debug und danach Debug, Console and Profiler öffnen.
2. Render, physics, audio and script timing wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Render, physics, audio and script timing ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Render, physics, audio and script timing wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Render, physics, audio and script timing mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Render, physics, audio and script timing konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Render, physics, audio and script timing ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="debug-memory-and-lifetime-tracking"></a>

### Memory and lifetime tracking

**Klassifikation:** Automatic · Manual · Runtime · Editor-only · Project-wide

**Zweck und Einsatz:** Memory and lifetime tracking im Bereich Debug, Console and Profiler erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Debug. Verwenden, wenn das Projekt Memory and lifetime tracking benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A playable scene
- Representative runtime input for profiling

**Exakter Ablauf:**

1. Debug und danach Debug, Console and Profiler öffnen.
2. Memory and lifetime tracking wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Memory and lifetime tracking ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Memory and lifetime tracking wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Memory and lifetime tracking mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Memory and lifetime tracking konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Memory and lifetime tracking ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="debug-trace-captures"></a>

### Trace captures

**Klassifikation:** Automatic · Manual · Runtime · Editor-only · Project-wide

**Zweck und Einsatz:** Trace captures im Bereich Debug, Console and Profiler erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Debug. Verwenden, wenn das Projekt Trace captures benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A playable scene
- Representative runtime input for profiling

**Exakter Ablauf:**

1. Debug und danach Debug, Console and Profiler öffnen.
2. Trace captures wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Trace captures ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Trace captures wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Trace captures mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Trace captures konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Trace captures ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="debug-performance-comparisons"></a>

### Performance comparisons

**Klassifikation:** Automatic · Manual · Runtime · Editor-only · Project-wide

**Zweck und Einsatz:** Performance comparisons im Bereich Debug, Console and Profiler erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Debug. Verwenden, wenn das Projekt Performance comparisons benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A playable scene
- Representative runtime input for profiling

**Exakter Ablauf:**

1. Debug und danach Debug, Console and Profiler öffnen.
2. Performance comparisons wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Performance comparisons ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Performance comparisons wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Performance comparisons mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Performance comparisons konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Performance comparisons ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="debug-project-tests"></a>

### Project tests

**Klassifikation:** Automatic · Manual · Runtime · Editor-only · Project-wide

**Zweck und Einsatz:** Project tests im Bereich Debug, Console and Profiler erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Debug. Verwenden, wenn das Projekt Project tests benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A playable scene
- Representative runtime input for profiling

**Exakter Ablauf:**

1. Debug und danach Debug, Console and Profiler öffnen.
2. Project tests wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Project tests ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Project tests wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Project tests mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Project tests konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Project tests ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="debug-replay-and-checksums"></a>

### Replay and checksums

**Klassifikation:** Automatic · Manual · Runtime · Editor-only · Project-wide

**Zweck und Einsatz:** Replay and checksums im Bereich Debug, Console and Profiler erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Debug. Verwenden, wenn das Projekt Replay and checksums benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A playable scene
- Representative runtime input for profiling

**Exakter Ablauf:**

1. Debug und danach Debug, Console and Profiler öffnen.
2. Replay and checksums wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Replay and checksums ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Replay and checksums wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Replay and checksums mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Replay and checksums konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Replay and checksums ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="debug-screenshot-and-headless-assertions"></a>

### Screenshot and headless assertions

**Klassifikation:** Automatic · Manual · Runtime · Editor-only · Project-wide

**Zweck und Einsatz:** Screenshot and headless assertions im Bereich Debug, Console and Profiler erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Debug. Verwenden, wenn das Projekt Screenshot and headless assertions benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A playable scene
- Representative runtime input for profiling

**Exakter Ablauf:**

1. Debug und danach Debug, Console and Profiler öffnen.
2. Screenshot and headless assertions wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Screenshot and headless assertions ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Screenshot and headless assertions wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Screenshot and headless assertions mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Screenshot and headless assertions konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Screenshot and headless assertions ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="debug-physics-monitor"></a>

### Physics Monitor

**Klassifikation:** Automatic · Manual · Runtime · Editor-only · Project-wide

**Zweck und Einsatz:** Physics Monitor im Bereich Debug, Console and Profiler erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Debug. Verwenden, wenn das Projekt Physics Monitor benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A playable scene
- Representative runtime input for profiling

**Exakter Ablauf:**

1. Debug und danach Debug, Console and Profiler öffnen.
2. Physics Monitor wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Physics Monitor ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Physics Monitor wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Physics Monitor mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Physics Monitor konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Physics Monitor ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A


## Settings and Project Health

<a id="manage-theme-and-language"></a>

### Theme and language

**Klassifikation:** Manual · Assisted · Automatic · Project-wide · Reversible

**Zweck und Einsatz:** Theme and language im Bereich Settings and Project Health erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage. Verwenden, wenn das Projekt Theme and language benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An open project

**Exakter Ablauf:**

1. Manage und danach Settings and Project Health öffnen.
2. Theme and language wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Theme and language ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Theme and language wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Theme and language mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Theme and language konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Theme and language ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="manage-ui-scale-and-density"></a>

### UI scale and density

**Klassifikation:** Manual · Assisted · Automatic · Project-wide · Reversible

**Zweck und Einsatz:** UI scale and density im Bereich Settings and Project Health erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage. Verwenden, wenn das Projekt UI scale and density benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An open project

**Exakter Ablauf:**

1. Manage und danach Settings and Project Health öffnen.
2. UI scale and density wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** UI scale and density ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** UI scale and density wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- UI scale and density mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, UI scale and density konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für UI scale and density ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="manage-high-contrast-and-reduced-motion"></a>

### High contrast and reduced motion

**Klassifikation:** Manual · Assisted · Automatic · Project-wide · Reversible

**Zweck und Einsatz:** High contrast and reduced motion im Bereich Settings and Project Health erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage. Verwenden, wenn das Projekt High contrast and reduced motion benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An open project

**Exakter Ablauf:**

1. Manage und danach Settings and Project Health öffnen.
2. High contrast and reduced motion wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** High contrast and reduced motion ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** High contrast and reduced motion wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- High contrast and reduced motion mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, High contrast and reduced motion konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für High contrast and reduced motion ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="manage-autosave-and-confirmation-policy"></a>

### Autosave and confirmation policy

**Klassifikation:** Manual · Assisted · Automatic · Project-wide · Reversible

**Zweck und Einsatz:** Autosave and confirmation policy im Bereich Settings and Project Health erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage. Verwenden, wenn das Projekt Autosave and confirmation policy benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An open project

**Exakter Ablauf:**

1. Manage und danach Settings and Project Health öffnen.
2. Autosave and confirmation policy wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Autosave and confirmation policy ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Autosave and confirmation policy wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Autosave and confirmation policy mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Autosave and confirmation policy konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Autosave and confirmation policy ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="manage-input-map"></a>

### Input Map

**Klassifikation:** Manual · Assisted · Automatic · Project-wide · Reversible

**Zweck und Einsatz:** Input Map im Bereich Settings and Project Health erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage. Verwenden, wenn das Projekt Input Map benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An open project

**Exakter Ablauf:**

1. Manage und danach Settings and Project Health öffnen.
2. Input Map wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Input Map ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Input Map wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Input Map mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Input Map konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Input Map ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="manage-physics-settings"></a>

### Physics settings

**Klassifikation:** Manual · Assisted · Automatic · Project-wide · Reversible

**Zweck und Einsatz:** Physics settings im Bereich Settings and Project Health erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage. Verwenden, wenn das Projekt Physics settings benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An open project

**Exakter Ablauf:**

1. Manage und danach Settings and Project Health öffnen.
2. Physics settings wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Physics settings ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Physics settings wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Physics settings mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Physics settings konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Physics settings ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="manage-audio-settings"></a>

### Audio settings

**Klassifikation:** Manual · Assisted · Automatic · Project-wide · Reversible

**Zweck und Einsatz:** Audio settings im Bereich Settings and Project Health erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage. Verwenden, wenn das Projekt Audio settings benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An open project

**Exakter Ablauf:**

1. Manage und danach Settings and Project Health öffnen.
2. Audio settings wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Audio settings ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Audio settings wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Audio settings mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Audio settings konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Audio settings ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="manage-collision-matrix"></a>

### Collision matrix

**Klassifikation:** Manual · Assisted · Automatic · Project-wide · Reversible

**Zweck und Einsatz:** Collision matrix im Bereich Settings and Project Health erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage. Verwenden, wenn das Projekt Collision matrix benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An open project

**Exakter Ablauf:**

1. Manage und danach Settings and Project Health öffnen.
2. Collision matrix wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Collision matrix ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Collision matrix wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Collision matrix mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Collision matrix konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Collision matrix ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="manage-project-validation"></a>

### Project validation

**Klassifikation:** Manual · Assisted · Automatic · Project-wide · Reversible

**Zweck und Einsatz:** Project validation im Bereich Settings and Project Health erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage. Verwenden, wenn das Projekt Project validation benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An open project

**Exakter Ablauf:**

1. Manage und danach Settings and Project Health öffnen.
2. Project validation wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Project validation ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Project validation wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Project validation mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Project validation konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Project validation ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="manage-deterministic-repair"></a>

### Deterministic repair

**Klassifikation:** Manual · Assisted · Automatic · Project-wide · Reversible

**Zweck und Einsatz:** Deterministic repair im Bereich Settings and Project Health erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage. Verwenden, wenn das Projekt Deterministic repair benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An open project

**Exakter Ablauf:**

1. Manage und danach Settings and Project Health öffnen.
2. Deterministic repair wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Deterministic repair ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Deterministic repair wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Deterministic repair mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Deterministic repair konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Deterministic repair ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="manage-recovery-browser"></a>

### Recovery browser

**Klassifikation:** Manual · Assisted · Automatic · Project-wide · Reversible

**Zweck und Einsatz:** Recovery browser im Bereich Settings and Project Health erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage. Verwenden, wenn das Projekt Recovery browser benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An open project

**Exakter Ablauf:**

1. Manage und danach Settings and Project Health öffnen.
2. Recovery browser wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Recovery browser ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Recovery browser wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Recovery browser mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Recovery browser konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Recovery browser ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="manage-migration-status"></a>

### Migration status

**Klassifikation:** Manual · Assisted · Automatic · Project-wide · Reversible

**Zweck und Einsatz:** Migration status im Bereich Settings and Project Health erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage. Verwenden, wenn das Projekt Migration status benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An open project

**Exakter Ablauf:**

1. Manage und danach Settings and Project Health öffnen.
2. Migration status wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Migration status ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Migration status wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Migration status mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Migration status konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Migration status ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="manage-low-end-performance-profile"></a>

### Low-end performance profile

**Klassifikation:** Manual · Assisted · Automatic · Project-wide · Reversible

**Zweck und Einsatz:** Low-end performance profile im Bereich Settings and Project Health erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage. Verwenden, wenn das Projekt Low-end performance profile benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An open project

**Exakter Ablauf:**

1. Manage und danach Settings and Project Health öffnen.
2. Low-end performance profile wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Low-end performance profile ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Low-end performance profile wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Low-end performance profile mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Low-end performance profile konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Low-end performance profile ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="manage-studio-status"></a>

### Studio Status

**Klassifikation:** Manual · Assisted · Automatic · Project-wide · Reversible

**Zweck und Einsatz:** Studio Status im Bereich Settings and Project Health erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage. Verwenden, wenn das Projekt Studio Status benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- An open project

**Exakter Ablauf:**

1. Manage und danach Settings and Project Health öffnen.
2. Studio Status wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Studio Status ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Studio Status wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Studio Status mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Studio Status konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Studio Status ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A


## Packages and Ecosystem Studio

<a id="ecosystem-registry-and-lockfile"></a>

### Registry and lockfile

**Klassifikation:** Manual · Assisted · Project-wide · Reversible

**Zweck und Einsatz:** Registry and lockfile im Bereich Packages and Ecosystem Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage / Debug. Verwenden, wenn das Projekt Registry and lockfile benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A reviewed package or extension manifest
- Explicit permission for native/network operations

**Exakter Ablauf:**

1. Manage / Debug und danach Packages and Ecosystem Studio öffnen.
2. Registry and lockfile wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Registry and lockfile ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Registry and lockfile wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Registry and lockfile mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Registry and lockfile konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Registry and lockfile ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="ecosystem-dependency-resolution"></a>

### Dependency resolution

**Klassifikation:** Manual · Assisted · Project-wide · Reversible

**Zweck und Einsatz:** Dependency resolution im Bereich Packages and Ecosystem Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage / Debug. Verwenden, wenn das Projekt Dependency resolution benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A reviewed package or extension manifest
- Explicit permission for native/network operations

**Exakter Ablauf:**

1. Manage / Debug und danach Packages and Ecosystem Studio öffnen.
2. Dependency resolution wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Dependency resolution ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Dependency resolution wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Dependency resolution mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Dependency resolution konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Dependency resolution ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="ecosystem-hashes-and-signatures"></a>

### Hashes and signatures

**Klassifikation:** Manual · Assisted · Project-wide · Reversible

**Zweck und Einsatz:** Hashes and signatures im Bereich Packages and Ecosystem Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage / Debug. Verwenden, wenn das Projekt Hashes and signatures benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A reviewed package or extension manifest
- Explicit permission for native/network operations

**Exakter Ablauf:**

1. Manage / Debug und danach Packages and Ecosystem Studio öffnen.
2. Hashes and signatures wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Hashes and signatures ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Hashes and signatures wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Hashes and signatures mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Hashes and signatures konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Hashes and signatures ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="ecosystem-permissions-and-licenses"></a>

### Permissions and licenses

**Klassifikation:** Manual · Assisted · Project-wide · Reversible

**Zweck und Einsatz:** Permissions and licenses im Bereich Packages and Ecosystem Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage / Debug. Verwenden, wenn das Projekt Permissions and licenses benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A reviewed package or extension manifest
- Explicit permission for native/network operations

**Exakter Ablauf:**

1. Manage / Debug und danach Packages and Ecosystem Studio öffnen.
2. Permissions and licenses wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Permissions and licenses ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Permissions and licenses wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Permissions and licenses mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Permissions and licenses konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Permissions and licenses ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="ecosystem-quarantine-and-rollback"></a>

### Quarantine and rollback

**Klassifikation:** Manual · Assisted · Project-wide · Reversible

**Zweck und Einsatz:** Quarantine and rollback im Bereich Packages and Ecosystem Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage / Debug. Verwenden, wenn das Projekt Quarantine and rollback benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A reviewed package or extension manifest
- Explicit permission for native/network operations

**Exakter Ablauf:**

1. Manage / Debug und danach Packages and Ecosystem Studio öffnen.
2. Quarantine and rollback wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Quarantine and rollback ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Quarantine and rollback wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Quarantine and rollback mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Quarantine and rollback konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Quarantine and rollback ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="ecosystem-offline-mirror"></a>

### Offline mirror

**Klassifikation:** Manual · Assisted · Project-wide · Reversible

**Zweck und Einsatz:** Offline mirror im Bereich Packages and Ecosystem Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage / Debug. Verwenden, wenn das Projekt Offline mirror benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A reviewed package or extension manifest
- Explicit permission for native/network operations

**Exakter Ablauf:**

1. Manage / Debug und danach Packages and Ecosystem Studio öffnen.
2. Offline mirror wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Offline mirror ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Offline mirror wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Offline mirror mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Offline mirror konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Offline mirror ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="ecosystem-plugin-api-contributions"></a>

### Plugin API contributions

**Klassifikation:** Manual · Assisted · Project-wide · Reversible

**Zweck und Einsatz:** Plugin API contributions im Bereich Packages and Ecosystem Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage / Debug. Verwenden, wenn das Projekt Plugin API contributions benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A reviewed package or extension manifest
- Explicit permission for native/network operations

**Exakter Ablauf:**

1. Manage / Debug und danach Packages and Ecosystem Studio öffnen.
2. Plugin API contributions wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Plugin API contributions ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Plugin API contributions wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Plugin API contributions mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Plugin API contributions konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Plugin API contributions ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="ecosystem-load-unload-and-reload"></a>

### Load, unload and reload

**Klassifikation:** Manual · Assisted · Project-wide · Reversible

**Zweck und Einsatz:** Load, unload and reload im Bereich Packages and Ecosystem Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage / Debug. Verwenden, wenn das Projekt Load, unload and reload benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A reviewed package or extension manifest
- Explicit permission for native/network operations

**Exakter Ablauf:**

1. Manage / Debug und danach Packages and Ecosystem Studio öffnen.
2. Load, unload and reload wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Load, unload and reload ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Load, unload and reload wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Load, unload and reload mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Load, unload and reload konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Load, unload and reload ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="ecosystem-native-extension-abi"></a>

### Native Extension ABI

**Klassifikation:** Manual · Assisted · Project-wide · Reversible

**Zweck und Einsatz:** Native Extension ABI im Bereich Packages and Ecosystem Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage / Debug. Verwenden, wenn das Projekt Native Extension ABI benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A reviewed package or extension manifest
- Explicit permission for native/network operations

**Exakter Ablauf:**

1. Manage / Debug und danach Packages and Ecosystem Studio öffnen.
2. Native Extension ABI wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Native Extension ABI ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Native Extension ABI wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Native Extension ABI mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Native Extension ABI konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Native Extension ABI ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="ecosystem-package-wizard"></a>

### Package wizard

**Klassifikation:** Manual · Assisted · Project-wide · Reversible

**Zweck und Einsatz:** Package wizard im Bereich Packages and Ecosystem Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage / Debug. Verwenden, wenn das Projekt Package wizard benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A reviewed package or extension manifest
- Explicit permission for native/network operations

**Exakter Ablauf:**

1. Manage / Debug und danach Packages and Ecosystem Studio öffnen.
2. Package wizard wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Package wizard ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Package wizard wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Package wizard mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Package wizard konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Package wizard ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="ecosystem-ed25519-signing-request"></a>

### Ed25519 signing request

**Klassifikation:** Manual · Assisted · Project-wide · Reversible

**Zweck und Einsatz:** Ed25519 signing request im Bereich Packages and Ecosystem Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage / Debug. Verwenden, wenn das Projekt Ed25519 signing request benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A reviewed package or extension manifest
- Explicit permission for native/network operations

**Exakter Ablauf:**

1. Manage / Debug und danach Packages and Ecosystem Studio öffnen.
2. Ed25519 signing request wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Ed25519 signing request ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Ed25519 signing request wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Ed25519 signing request mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Ed25519 signing request konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Ed25519 signing request ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="ecosystem-certification-scanner"></a>

### Certification scanner

**Klassifikation:** Manual · Assisted · Project-wide · Reversible

**Zweck und Einsatz:** Certification scanner im Bereich Packages and Ecosystem Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage / Debug. Verwenden, wenn das Projekt Certification scanner benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A reviewed package or extension manifest
- Explicit permission for native/network operations

**Exakter Ablauf:**

1. Manage / Debug und danach Packages and Ecosystem Studio öffnen.
2. Certification scanner wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Certification scanner ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Certification scanner wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Certification scanner mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Certification scanner konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Certification scanner ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="ecosystem-offline-registry-tooling"></a>

### Offline registry tooling

**Klassifikation:** Manual · Assisted · Project-wide · Reversible

**Zweck und Einsatz:** Offline registry tooling im Bereich Packages and Ecosystem Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage / Debug. Verwenden, wenn das Projekt Offline registry tooling benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A reviewed package or extension manifest
- Explicit permission for native/network operations

**Exakter Ablauf:**

1. Manage / Debug und danach Packages and Ecosystem Studio öffnen.
2. Offline registry tooling wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Offline registry tooling ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Offline registry tooling wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Offline registry tooling mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Offline registry tooling konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Offline registry tooling ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="ecosystem-export-templates"></a>

### Export templates

**Klassifikation:** Manual · Assisted · Project-wide · Reversible

**Zweck und Einsatz:** Export templates im Bereich Packages and Ecosystem Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage / Debug. Verwenden, wenn das Projekt Export templates benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A reviewed package or extension manifest
- Explicit permission for native/network operations

**Exakter Ablauf:**

1. Manage / Debug und danach Packages and Ecosystem Studio öffnen.
2. Export templates wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Export templates ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Export templates wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Export templates mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Export templates konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Export templates ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="ecosystem-ci-matrix"></a>

### CI matrix

**Klassifikation:** Manual · Assisted · Project-wide · Reversible

**Zweck und Einsatz:** CI matrix im Bereich Packages and Ecosystem Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage / Debug. Verwenden, wenn das Projekt CI matrix benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A reviewed package or extension manifest
- Explicit permission for native/network operations

**Exakter Ablauf:**

1. Manage / Debug und danach Packages and Ecosystem Studio öffnen.
2. CI matrix wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** CI matrix ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** CI matrix wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- CI matrix mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, CI matrix konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für CI matrix ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="ecosystem-content-cache"></a>

### Content cache

**Klassifikation:** Manual · Assisted · Project-wide · Reversible

**Zweck und Einsatz:** Content cache im Bereich Packages and Ecosystem Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage / Debug. Verwenden, wenn das Projekt Content cache benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A reviewed package or extension manifest
- Explicit permission for native/network operations

**Exakter Ablauf:**

1. Manage / Debug und danach Packages and Ecosystem Studio öffnen.
2. Content cache wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Content cache ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Content cache wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Content cache mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Content cache konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Content cache ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="ecosystem-delta-builds"></a>

### Delta builds

**Klassifikation:** Manual · Assisted · Project-wide · Reversible

**Zweck und Einsatz:** Delta builds im Bereich Packages and Ecosystem Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage / Debug. Verwenden, wenn das Projekt Delta builds benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A reviewed package or extension manifest
- Explicit permission for native/network operations

**Exakter Ablauf:**

1. Manage / Debug und danach Packages and Ecosystem Studio öffnen.
2. Delta builds wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Delta builds ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Delta builds wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Delta builds mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Delta builds konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Delta builds ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="ecosystem-deployment-connectors"></a>

### Deployment connectors

**Klassifikation:** Manual · Assisted · Project-wide · Reversible

**Zweck und Einsatz:** Deployment connectors im Bereich Packages and Ecosystem Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage / Debug. Verwenden, wenn das Projekt Deployment connectors benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A reviewed package or extension manifest
- Explicit permission for native/network operations

**Exakter Ablauf:**

1. Manage / Debug und danach Packages and Ecosystem Studio öffnen.
2. Deployment connectors wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Deployment connectors ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Deployment connectors wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Deployment connectors mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Deployment connectors konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Deployment connectors ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A


## Network Studio

<a id="network-explicit-network-permission"></a>

### Explicit network permission

**Klassifikation:** Manual · Runtime · Project-wide · Reversible

**Zweck und Einsatz:** Explicit network permission im Bereich Network Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Debug. Verwenden, wenn das Projekt Explicit network permission benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Networking package
- Explicit project permission

**Exakter Ablauf:**

1. Debug und danach Network Studio öffnen.
2. Explicit network permission wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Explicit network permission ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Explicit network permission wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Explicit network permission mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Explicit network permission konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Explicit network permission ergänzen.

**Rhai-API:** `network_rpc`, `network_role`, `network_tick`

**Visual-Graph-API:** `Network/RPC`, `Network/Role`, `Network/Tick`

<a id="network-local-lobby"></a>

### Local lobby

**Klassifikation:** Manual · Runtime · Project-wide · Reversible

**Zweck und Einsatz:** Local lobby im Bereich Network Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Debug. Verwenden, wenn das Projekt Local lobby benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Networking package
- Explicit project permission

**Exakter Ablauf:**

1. Debug und danach Network Studio öffnen.
2. Local lobby wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Local lobby ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Local lobby wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Local lobby mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Local lobby konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Local lobby ergänzen.

**Rhai-API:** `network_rpc`, `network_role`, `network_tick`

**Visual-Graph-API:** `Network/RPC`, `Network/Role`, `Network/Tick`

<a id="network-direct-connect"></a>

### Direct connect

**Klassifikation:** Manual · Runtime · Project-wide · Reversible

**Zweck und Einsatz:** Direct connect im Bereich Network Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Debug. Verwenden, wenn das Projekt Direct connect benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Networking package
- Explicit project permission

**Exakter Ablauf:**

1. Debug und danach Network Studio öffnen.
2. Direct connect wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Direct connect ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Direct connect wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Direct connect mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Direct connect konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Direct connect ergänzen.

**Rhai-API:** `network_rpc`, `network_role`, `network_tick`

**Visual-Graph-API:** `Network/RPC`, `Network/Role`, `Network/Tick`

<a id="network-reliable-and-unreliable-channels"></a>

### Reliable and unreliable channels

**Klassifikation:** Manual · Runtime · Project-wide · Reversible

**Zweck und Einsatz:** Reliable and unreliable channels im Bereich Network Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Debug. Verwenden, wenn das Projekt Reliable and unreliable channels benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Networking package
- Explicit project permission

**Exakter Ablauf:**

1. Debug und danach Network Studio öffnen.
2. Reliable and unreliable channels wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Reliable and unreliable channels ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Reliable and unreliable channels wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Reliable and unreliable channels mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Reliable and unreliable channels konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Reliable and unreliable channels ergänzen.

**Rhai-API:** `network_rpc`, `network_role`, `network_tick`

**Visual-Graph-API:** `Network/RPC`, `Network/Role`, `Network/Tick`

<a id="network-rpc-contracts"></a>

### RPC contracts

**Klassifikation:** Manual · Runtime · Project-wide · Reversible

**Zweck und Einsatz:** RPC contracts im Bereich Network Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Debug. Verwenden, wenn das Projekt RPC contracts benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Networking package
- Explicit project permission

**Exakter Ablauf:**

1. Debug und danach Network Studio öffnen.
2. RPC contracts wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** RPC contracts ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** RPC contracts wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- RPC contracts mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, RPC contracts konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für RPC contracts ergänzen.

**Rhai-API:** `network_rpc`, `network_role`, `network_tick`

**Visual-Graph-API:** `Network/RPC`, `Network/Role`, `Network/Tick`

<a id="network-authority-and-replication"></a>

### Authority and replication

**Klassifikation:** Manual · Runtime · Project-wide · Reversible

**Zweck und Einsatz:** Authority and replication im Bereich Network Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Debug. Verwenden, wenn das Projekt Authority and replication benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Networking package
- Explicit project permission

**Exakter Ablauf:**

1. Debug und danach Network Studio öffnen.
2. Authority and replication wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Authority and replication ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Authority and replication wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Authority and replication mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Authority and replication konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Authority and replication ergänzen.

**Rhai-API:** `network_rpc`, `network_role`, `network_tick`

**Visual-Graph-API:** `Network/RPC`, `Network/Role`, `Network/Tick`

<a id="network-interpolation-and-prediction"></a>

### Interpolation and prediction

**Klassifikation:** Manual · Runtime · Project-wide · Reversible

**Zweck und Einsatz:** Interpolation and prediction im Bereich Network Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Debug. Verwenden, wenn das Projekt Interpolation and prediction benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Networking package
- Explicit project permission

**Exakter Ablauf:**

1. Debug und danach Network Studio öffnen.
2. Interpolation and prediction wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Interpolation and prediction ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Interpolation and prediction wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Interpolation and prediction mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Interpolation and prediction konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Interpolation and prediction ergänzen.

**Rhai-API:** `network_rpc`, `network_role`, `network_tick`

**Visual-Graph-API:** `Network/RPC`, `Network/Role`, `Network/Tick`

<a id="network-reconciliation-and-rollback"></a>

### Reconciliation and rollback

**Klassifikation:** Manual · Runtime · Project-wide · Reversible

**Zweck und Einsatz:** Reconciliation and rollback im Bereich Network Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Debug. Verwenden, wenn das Projekt Reconciliation and rollback benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Networking package
- Explicit project permission

**Exakter Ablauf:**

1. Debug und danach Network Studio öffnen.
2. Reconciliation and rollback wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Reconciliation and rollback ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Reconciliation and rollback wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Reconciliation and rollback mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Reconciliation and rollback konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Reconciliation and rollback ergänzen.

**Rhai-API:** `network_rpc`, `network_role`, `network_tick`

**Visual-Graph-API:** `Network/RPC`, `Network/Role`, `Network/Tick`

<a id="network-late-join"></a>

### Late join

**Klassifikation:** Manual · Runtime · Project-wide · Reversible

**Zweck und Einsatz:** Late join im Bereich Network Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Debug. Verwenden, wenn das Projekt Late join benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Networking package
- Explicit project permission

**Exakter Ablauf:**

1. Debug und danach Network Studio öffnen.
2. Late join wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Late join ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Late join wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Late join mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Late join konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Late join ergänzen.

**Rhai-API:** `network_rpc`, `network_role`, `network_tick`

**Visual-Graph-API:** `Network/RPC`, `Network/Role`, `Network/Tick`

<a id="network-latency-loss-simulation"></a>

### Latency/loss simulation

**Klassifikation:** Manual · Runtime · Project-wide · Reversible

**Zweck und Einsatz:** Latency/loss simulation im Bereich Network Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Debug. Verwenden, wenn das Projekt Latency/loss simulation benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Networking package
- Explicit project permission

**Exakter Ablauf:**

1. Debug und danach Network Studio öffnen.
2. Latency/loss simulation wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Latency/loss simulation ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Latency/loss simulation wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Latency/loss simulation mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Latency/loss simulation konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Latency/loss simulation ergänzen.

**Rhai-API:** `network_rpc`, `network_role`, `network_tick`

**Visual-Graph-API:** `Network/RPC`, `Network/Role`, `Network/Tick`

<a id="network-multiplayer-replay"></a>

### Multiplayer replay

**Klassifikation:** Manual · Runtime · Project-wide · Reversible

**Zweck und Einsatz:** Multiplayer replay im Bereich Network Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Debug. Verwenden, wenn das Projekt Multiplayer replay benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Networking package
- Explicit project permission

**Exakter Ablauf:**

1. Debug und danach Network Studio öffnen.
2. Multiplayer replay wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Multiplayer replay ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Multiplayer replay wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Multiplayer replay mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Multiplayer replay konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Multiplayer replay ergänzen.

**Rhai-API:** `network_rpc`, `network_role`, `network_tick`

**Visual-Graph-API:** `Network/RPC`, `Network/Role`, `Network/Tick`

<a id="network-multiplayer-save"></a>

### Multiplayer save

**Klassifikation:** Manual · Runtime · Project-wide · Reversible

**Zweck und Einsatz:** Multiplayer save im Bereich Network Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Debug. Verwenden, wenn das Projekt Multiplayer save benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Networking package
- Explicit project permission

**Exakter Ablauf:**

1. Debug und danach Network Studio öffnen.
2. Multiplayer save wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Multiplayer save ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Multiplayer save wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Multiplayer save mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Multiplayer save konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Multiplayer save ergänzen.

**Rhai-API:** `network_rpc`, `network_role`, `network_tick`

**Visual-Graph-API:** `Network/RPC`, `Network/Role`, `Network/Tick`

<a id="network-packet-diagnostics"></a>

### Packet diagnostics

**Klassifikation:** Manual · Runtime · Project-wide · Reversible

**Zweck und Einsatz:** Packet diagnostics im Bereich Network Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Debug. Verwenden, wenn das Projekt Packet diagnostics benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Networking package
- Explicit project permission

**Exakter Ablauf:**

1. Debug und danach Network Studio öffnen.
2. Packet diagnostics wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Packet diagnostics ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Packet diagnostics wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Packet diagnostics mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Packet diagnostics konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Packet diagnostics ergänzen.

**Rhai-API:** `network_rpc`, `network_role`, `network_tick`

**Visual-Graph-API:** `Network/RPC`, `Network/Role`, `Network/Tick`

<a id="network-headless-authority"></a>

### Headless authority

**Klassifikation:** Manual · Runtime · Project-wide · Reversible

**Zweck und Einsatz:** Headless authority im Bereich Network Studio erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Debug. Verwenden, wenn das Projekt Headless authority benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Networking package
- Explicit project permission

**Exakter Ablauf:**

1. Debug und danach Network Studio öffnen.
2. Headless authority wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Headless authority ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Headless authority wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Headless authority mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Headless authority konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Headless authority ergänzen.

**Rhai-API:** `network_rpc`, `network_role`, `network_tick`

**Visual-Graph-API:** `Network/RPC`, `Network/Role`, `Network/Tick`


## Build Settings

<a id="build-target-and-architecture"></a>

### Target and architecture

**Klassifikation:** Manual · Assisted · Project-wide

**Zweck und Einsatz:** Target and architecture im Bereich Build Settings erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage. Verwenden, wenn das Projekt Target and architecture benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A valid startup scene
- A matching-host export template
- Resolved Project Health errors

**Exakter Ablauf:**

1. Manage und danach Build Settings öffnen.
2. Target and architecture wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Target and architecture ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Target and architecture wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Target and architecture mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Target and architecture konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Target and architecture ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="build-portable-application"></a>

### Portable application

**Klassifikation:** Manual · Assisted · Project-wide

**Zweck und Einsatz:** Portable application im Bereich Build Settings erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage. Verwenden, wenn das Projekt Portable application benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A valid startup scene
- A matching-host export template
- Resolved Project Health errors

**Exakter Ablauf:**

1. Manage und danach Build Settings öffnen.
2. Portable application wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Portable application ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Portable application wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Portable application mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Portable application konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Portable application ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="build-player-plus-data-pack"></a>

### Player plus data pack

**Klassifikation:** Manual · Assisted · Project-wide

**Zweck und Einsatz:** Player plus data pack im Bereich Build Settings erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage. Verwenden, wenn das Projekt Player plus data pack benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A valid startup scene
- A matching-host export template
- Resolved Project Health errors

**Exakter Ablauf:**

1. Manage und danach Build Settings öffnen.
2. Player plus data pack wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Player plus data pack ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Player plus data pack wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Player plus data pack mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Player plus data pack konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Player plus data pack ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="build-web-folder"></a>

### Web folder

**Klassifikation:** Manual · Assisted · Project-wide

**Zweck und Einsatz:** Web folder im Bereich Build Settings erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage. Verwenden, wenn das Projekt Web folder benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A valid startup scene
- A matching-host export template
- Resolved Project Health errors

**Exakter Ablauf:**

1. Manage und danach Build Settings öffnen.
2. Web folder wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Web folder ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Web folder wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Web folder mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Web folder konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Web folder ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="build-startup-scene"></a>

### Startup scene

**Klassifikation:** Manual · Assisted · Project-wide

**Zweck und Einsatz:** Startup scene im Bereich Build Settings erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage. Verwenden, wenn das Projekt Startup scene benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A valid startup scene
- A matching-host export template
- Resolved Project Health errors

**Exakter Ablauf:**

1. Manage und danach Build Settings öffnen.
2. Startup scene wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Startup scene ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Startup scene wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Startup scene mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Startup scene konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Startup scene ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="build-deterministic-build"></a>

### Deterministic build

**Klassifikation:** Manual · Assisted · Project-wide

**Zweck und Einsatz:** Deterministic build im Bereich Build Settings erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage. Verwenden, wenn das Projekt Deterministic build benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A valid startup scene
- A matching-host export template
- Resolved Project Health errors

**Exakter Ablauf:**

1. Manage und danach Build Settings öffnen.
2. Deterministic build wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Deterministic build ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Deterministic build wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Deterministic build mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Deterministic build konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Deterministic build ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="build-content-stripping"></a>

### Content stripping

**Klassifikation:** Manual · Assisted · Project-wide

**Zweck und Einsatz:** Content stripping im Bereich Build Settings erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage. Verwenden, wenn das Projekt Content stripping benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A valid startup scene
- A matching-host export template
- Resolved Project Health errors

**Exakter Ablauf:**

1. Manage und danach Build Settings öffnen.
2. Content stripping wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Content stripping ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Content stripping wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Content stripping mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Content stripping konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Content stripping ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="build-build-profiles"></a>

### Build profiles

**Klassifikation:** Manual · Assisted · Project-wide

**Zweck und Einsatz:** Build profiles im Bereich Build Settings erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage. Verwenden, wenn das Projekt Build profiles benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A valid startup scene
- A matching-host export template
- Resolved Project Health errors

**Exakter Ablauf:**

1. Manage und danach Build Settings öffnen.
2. Build profiles wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Build profiles ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Build profiles wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Build profiles mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Build profiles konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Build profiles ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="build-provenance-and-sbom"></a>

### Provenance and SBOM

**Klassifikation:** Manual · Assisted · Project-wide

**Zweck und Einsatz:** Provenance and SBOM im Bereich Build Settings erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage. Verwenden, wenn das Projekt Provenance and SBOM benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A valid startup scene
- A matching-host export template
- Resolved Project Health errors

**Exakter Ablauf:**

1. Manage und danach Build Settings öffnen.
2. Provenance and SBOM wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Provenance and SBOM ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Provenance and SBOM wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Provenance and SBOM mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Provenance and SBOM konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Provenance and SBOM ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="build-patch-manifest"></a>

### Patch manifest

**Klassifikation:** Manual · Assisted · Project-wide

**Zweck und Einsatz:** Patch manifest im Bereich Build Settings erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage. Verwenden, wenn das Projekt Patch manifest benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A valid startup scene
- A matching-host export template
- Resolved Project Health errors

**Exakter Ablauf:**

1. Manage und danach Build Settings öffnen.
2. Patch manifest wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Patch manifest ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Patch manifest wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Patch manifest mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Patch manifest konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Patch manifest ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="build-symbols"></a>

### Symbols

**Klassifikation:** Manual · Assisted · Project-wide

**Zweck und Einsatz:** Symbols im Bereich Build Settings erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage. Verwenden, wenn das Projekt Symbols benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A valid startup scene
- A matching-host export template
- Resolved Project Health errors

**Exakter Ablauf:**

1. Manage und danach Build Settings öffnen.
2. Symbols wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Symbols ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Symbols wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Symbols mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Symbols konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Symbols ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="build-web-headers"></a>

### Web headers

**Klassifikation:** Manual · Assisted · Project-wide

**Zweck und Einsatz:** Web headers im Bereich Build Settings erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage. Verwenden, wenn das Projekt Web headers benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A valid startup scene
- A matching-host export template
- Resolved Project Health errors

**Exakter Ablauf:**

1. Manage und danach Build Settings öffnen.
2. Web headers wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Web headers ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Web headers wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Web headers mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Web headers konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Web headers ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="build-export-templates"></a>

### Export templates

**Klassifikation:** Manual · Assisted · Project-wide

**Zweck und Einsatz:** Export templates im Bereich Build Settings erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage. Verwenden, wenn das Projekt Export templates benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A valid startup scene
- A matching-host export template
- Resolved Project Health errors

**Exakter Ablauf:**

1. Manage und danach Build Settings öffnen.
2. Export templates wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Export templates ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Export templates wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Export templates mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Export templates konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Export templates ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="build-build-and-run"></a>

### Build and Run

**Klassifikation:** Manual · Assisted · Project-wide

**Zweck und Einsatz:** Build and Run im Bereich Build Settings erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage. Verwenden, wenn das Projekt Build and Run benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A valid startup scene
- A matching-host export template
- Resolved Project Health errors

**Exakter Ablauf:**

1. Manage und danach Build Settings öffnen.
2. Build and Run wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Build and Run ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Build and Run wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Build and Run mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Build and Run konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Build and Run ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="build-size-report"></a>

### Size report

**Klassifikation:** Manual · Assisted · Project-wide

**Zweck und Einsatz:** Size report im Bereich Build Settings erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage. Verwenden, wenn das Projekt Size report benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A valid startup scene
- A matching-host export template
- Resolved Project Health errors

**Exakter Ablauf:**

1. Manage und danach Build Settings öffnen.
2. Size report wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Size report ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Size report wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Size report mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Size report konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Size report ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="build-deployment-plan"></a>

### Deployment plan

**Klassifikation:** Manual · Assisted · Project-wide

**Zweck und Einsatz:** Deployment plan im Bereich Build Settings erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage. Verwenden, wenn das Projekt Deployment plan benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A valid startup scene
- A matching-host export template
- Resolved Project Health errors

**Exakter Ablauf:**

1. Manage und danach Build Settings öffnen.
2. Deployment plan wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Deployment plan ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Deployment plan wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Deployment plan mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Deployment plan konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Deployment plan ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="build-signing-warning"></a>

### Signing warning

**Klassifikation:** Manual · Assisted · Project-wide

**Zweck und Einsatz:** Signing warning im Bereich Build Settings erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage. Verwenden, wenn das Projekt Signing warning benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A valid startup scene
- A matching-host export template
- Resolved Project Health errors

**Exakter Ablauf:**

1. Manage und danach Build Settings öffnen.
2. Signing warning wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Signing warning ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Signing warning wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Signing warning mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Signing warning konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Signing warning ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="build-release-package"></a>

### Release package

**Klassifikation:** Manual · Assisted · Project-wide

**Zweck und Einsatz:** Release package im Bereich Build Settings erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage. Verwenden, wenn das Projekt Release package benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A valid startup scene
- A matching-host export template
- Resolved Project Health errors

**Exakter Ablauf:**

1. Manage und danach Build Settings öffnen.
2. Release package wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Release package ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Release package wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Release package mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Release package konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Release package ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A


## Recovery and Team Workflow

<a id="recovery-team-atomic-saves-and-journals"></a>

### Atomic saves and journals

**Klassifikation:** Automatic · Manual · Project-wide · Reversible

**Zweck und Einsatz:** Atomic saves and journals im Bereich Recovery and Team Workflow erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage. Verwenden, wenn das Projekt Atomic saves and journals benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A writable project; external Git remains optional

**Exakter Ablauf:**

1. Manage und danach Recovery and Team Workflow öffnen.
2. Atomic saves and journals wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Atomic saves and journals ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Atomic saves and journals wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Atomic saves and journals mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Atomic saves and journals konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Atomic saves and journals ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="recovery-team-autosaves"></a>

### Autosaves

**Klassifikation:** Automatic · Manual · Project-wide · Reversible

**Zweck und Einsatz:** Autosaves im Bereich Recovery and Team Workflow erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage. Verwenden, wenn das Projekt Autosaves benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A writable project; external Git remains optional

**Exakter Ablauf:**

1. Manage und danach Recovery and Team Workflow öffnen.
2. Autosaves wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Autosaves ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Autosaves wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Autosaves mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Autosaves konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Autosaves ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="recovery-team-manual-checkpoints"></a>

### Manual checkpoints

**Klassifikation:** Automatic · Manual · Project-wide · Reversible

**Zweck und Einsatz:** Manual checkpoints im Bereich Recovery and Team Workflow erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage. Verwenden, wenn das Projekt Manual checkpoints benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A writable project; external Git remains optional

**Exakter Ablauf:**

1. Manage und danach Recovery and Team Workflow öffnen.
2. Manual checkpoints wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Manual checkpoints ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Manual checkpoints wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Manual checkpoints mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Manual checkpoints konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Manual checkpoints ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="recovery-team-recovery-preview"></a>

### Recovery preview

**Klassifikation:** Automatic · Manual · Project-wide · Reversible

**Zweck und Einsatz:** Recovery preview im Bereich Recovery and Team Workflow erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage. Verwenden, wenn das Projekt Recovery preview benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A writable project; external Git remains optional

**Exakter Ablauf:**

1. Manage und danach Recovery and Team Workflow öffnen.
2. Recovery preview wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Recovery preview ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Recovery preview wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Recovery preview mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Recovery preview konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Recovery preview ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="recovery-team-external-change-conflict-handling"></a>

### External-change conflict handling

**Klassifikation:** Automatic · Manual · Project-wide · Reversible

**Zweck und Einsatz:** External-change conflict handling im Bereich Recovery and Team Workflow erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage. Verwenden, wenn das Projekt External-change conflict handling benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A writable project; external Git remains optional

**Exakter Ablauf:**

1. Manage und danach Recovery and Team Workflow öffnen.
2. External-change conflict handling wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** External-change conflict handling ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** External-change conflict handling wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- External-change conflict handling mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, External-change conflict handling konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für External-change conflict handling ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="recovery-team-project-trash"></a>

### Project trash

**Klassifikation:** Automatic · Manual · Project-wide · Reversible

**Zweck und Einsatz:** Project trash im Bereich Recovery and Team Workflow erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage. Verwenden, wenn das Projekt Project trash benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A writable project; external Git remains optional

**Exakter Ablauf:**

1. Manage und danach Recovery and Team Workflow öffnen.
2. Project trash wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Project trash ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Project trash wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Project trash mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Project trash konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Project trash ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="recovery-team-semantic-diff"></a>

### Semantic diff

**Klassifikation:** Automatic · Manual · Project-wide · Reversible

**Zweck und Einsatz:** Semantic diff im Bereich Recovery and Team Workflow erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage. Verwenden, wenn das Projekt Semantic diff benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A writable project; external Git remains optional

**Exakter Ablauf:**

1. Manage und danach Recovery and Team Workflow öffnen.
2. Semantic diff wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Semantic diff ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Semantic diff wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Semantic diff mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Semantic diff konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Semantic diff ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="recovery-team-git-helpers"></a>

### Git helpers

**Klassifikation:** Automatic · Manual · Project-wide · Reversible

**Zweck und Einsatz:** Git helpers im Bereich Recovery and Team Workflow erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage. Verwenden, wenn das Projekt Git helpers benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A writable project; external Git remains optional

**Exakter Ablauf:**

1. Manage und danach Recovery and Team Workflow öffnen.
2. Git helpers wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Git helpers ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Git helpers wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Git helpers mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Git helpers konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Git helpers ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="recovery-team-ownership-and-codeowners"></a>

### Ownership and CODEOWNERS

**Klassifikation:** Automatic · Manual · Project-wide · Reversible

**Zweck und Einsatz:** Ownership and CODEOWNERS im Bereich Recovery and Team Workflow erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage. Verwenden, wenn das Projekt Ownership and CODEOWNERS benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A writable project; external Git remains optional

**Exakter Ablauf:**

1. Manage und danach Recovery and Team Workflow öffnen.
2. Ownership and CODEOWNERS wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Ownership and CODEOWNERS ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Ownership and CODEOWNERS wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Ownership and CODEOWNERS mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Ownership and CODEOWNERS konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Ownership and CODEOWNERS ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="recovery-team-tasks-and-notes"></a>

### Tasks and notes

**Klassifikation:** Automatic · Manual · Project-wide · Reversible

**Zweck und Einsatz:** Tasks and notes im Bereich Recovery and Team Workflow erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage. Verwenden, wenn das Projekt Tasks and notes benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A writable project; external Git remains optional

**Exakter Ablauf:**

1. Manage und danach Recovery and Team Workflow öffnen.
2. Tasks and notes wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Tasks and notes ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Tasks and notes wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Tasks and notes mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Tasks and notes konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Tasks and notes ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="recovery-team-shared-presets"></a>

### Shared presets

**Klassifikation:** Automatic · Manual · Project-wide · Reversible

**Zweck und Einsatz:** Shared presets im Bereich Recovery and Team Workflow erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage. Verwenden, wenn das Projekt Shared presets benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A writable project; external Git remains optional

**Exakter Ablauf:**

1. Manage und danach Recovery and Team Workflow öffnen.
2. Shared presets wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Shared presets ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Shared presets wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Shared presets mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Shared presets konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Shared presets ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="recovery-team-binary-locks"></a>

### Binary locks

**Klassifikation:** Automatic · Manual · Project-wide · Reversible

**Zweck und Einsatz:** Binary locks im Bereich Recovery and Team Workflow erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage. Verwenden, wenn das Projekt Binary locks benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A writable project; external Git remains optional

**Exakter Ablauf:**

1. Manage und danach Recovery and Team Workflow öffnen.
2. Binary locks wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Binary locks ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Binary locks wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Binary locks mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Binary locks konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Binary locks ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A


## Guided Project

<a id="task-snake-complete-snake-game"></a>

### Complete Snake game

**Klassifikation:** Assisted · Runtime · Project-wide · Reversible

**Zweck und Einsatz:** Complete Snake game im Bereich Guided Project erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design / Script / Build. Verwenden, wenn das Projekt Complete Snake game benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Snake template

**Exakter Ablauf:**

1. Design / Script / Build und danach Guided Project öffnen.
2. Complete Snake game wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Complete Snake game ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Complete Snake game wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Complete Snake game mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Complete Snake game konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Complete Snake game ergänzen.

**Rhai-API:** `input_pressed`, `timer_start`, `signal_emit`, `ui_set_text`, `random_range`

**Visual-Graph-API:** `Input/Pressed`, `Time/Timer`, `Signals/Emit`, `UI/Set Text`

<a id="task-platformer-complete-platformer"></a>

### Complete platformer

**Klassifikation:** Assisted · Runtime · Project-wide · Reversible

**Zweck und Einsatz:** Complete platformer im Bereich Guided Project erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design / Script / Debug. Verwenden, wenn das Projekt Complete platformer benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Platformer template

**Exakter Ablauf:**

1. Design / Script / Debug und danach Guided Project öffnen.
2. Complete platformer wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Complete platformer ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Complete platformer wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Complete platformer mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Complete platformer konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Complete platformer ergänzen.

**Rhai-API:** `input_axis`, `character_move`, `checkpoint_set`

**Visual-Graph-API:** `Input/Axis`, `Character/Move`, `Game Flow/Checkpoint`

<a id="task-top-down-complete-top-down-game"></a>

### Complete top-down game

**Klassifikation:** Assisted · Runtime · Project-wide · Reversible

**Zweck und Einsatz:** Complete top-down game im Bereich Guided Project erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design / Script / Debug. Verwenden, wenn das Projekt Complete top-down game benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Top-down template

**Exakter Ablauf:**

1. Design / Script / Debug und danach Guided Project öffnen.
2. Complete top-down game wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Complete top-down game ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Complete top-down game wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Complete top-down game mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Complete top-down game konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Complete top-down game ergänzen.

**Rhai-API:** `input_vector`, `spawn_at`, `query_radius`

**Visual-Graph-API:** `Input/Vector2`, `Scene/Spawn`, `Scene/Query Radius`

<a id="task-physics-puzzle-physics-puzzle-with-rope-and-joints"></a>

### Physics puzzle with rope and joints

**Klassifikation:** Assisted · Runtime · Project-wide · Reversible

**Zweck und Einsatz:** Physics puzzle with rope and joints im Bereich Guided Project erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design / Debug. Verwenden, wenn das Projekt Physics puzzle with rope and joints benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Physics Sandbox template

**Exakter Ablauf:**

1. Design / Debug und danach Guided Project öffnen.
2. Physics puzzle with rope and joints wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Physics puzzle with rope and joints ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Physics puzzle with rope and joints wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Physics puzzle with rope and joints mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Physics puzzle with rope and joints konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Physics puzzle with rope and joints ergänzen.

**Rhai-API:** `apply_force`, `signal_emit`

**Visual-Graph-API:** `Physics/Apply Force`, `Signals/Emit`

<a id="task-menu-localized-responsive-menu"></a>

### Localized responsive menu

**Klassifikation:** Assisted · Runtime · Project-wide · Reversible

**Zweck und Einsatz:** Localized responsive menu im Bereich Guided Project erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Interface. Verwenden, wenn das Projekt Localized responsive menu benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- UI Showcase template

**Exakter Ablauf:**

1. Interface und danach Guided Project öffnen.
2. Localized responsive menu wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Localized responsive menu ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Localized responsive menu wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Localized responsive menu mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Localized responsive menu konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Localized responsive menu ergänzen.

**Rhai-API:** `ui_set_text`, `scene_load`

**Visual-Graph-API:** `UI/Set Text`, `Scene/Load`

<a id="task-cutscene-animation-and-cutscene"></a>

### Animation and cutscene

**Klassifikation:** Assisted · Runtime · Project-wide · Reversible

**Zweck und Einsatz:** Animation and cutscene im Bereich Guided Project erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Animation. Verwenden, wenn das Projekt Animation and cutscene benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Animation clips, controller and timeline

**Exakter Ablauf:**

1. Animation und danach Guided Project öffnen.
2. Animation and cutscene wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Animation and cutscene ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Animation and cutscene wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Animation and cutscene mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Animation and cutscene konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Animation and cutscene ergänzen.

**Rhai-API:** `animation_play`, `signal_emit`

**Visual-Graph-API:** `Animation/Play`, `Signals/Emit`

<a id="task-tilemap-tilemap-streamed-world"></a>

### TileMap streamed world

**Klassifikation:** Assisted · Runtime · Project-wide · Reversible

**Zweck und Einsatz:** TileMap streamed world im Bereich Guided Project erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Design. Verwenden, wenn das Projekt TileMap streamed world benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- TileSet and WorldChunk2D

**Exakter Ablauf:**

1. Design und danach Guided Project öffnen.
2. TileMap streamed world wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** TileMap streamed world ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** TileMap streamed world wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- TileMap streamed world mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, TileMap streamed world konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für TileMap streamed world ergänzen.

**Rhai-API:** `navigation_target`, `query_tag`

**Visual-Graph-API:** `Navigation/Set Target`, `Scene/Query Tag`

<a id="task-save-save-and-checkpoint-workflow"></a>

### Save and checkpoint workflow

**Klassifikation:** Assisted · Runtime · Project-wide · Reversible

**Zweck und Einsatz:** Save and checkpoint workflow im Bereich Guided Project erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Script / Manage. Verwenden, wenn das Projekt Save and checkpoint workflow benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A playable scene

**Exakter Ablauf:**

1. Script / Manage und danach Guided Project öffnen.
2. Save and checkpoint workflow wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Save and checkpoint workflow ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Save and checkpoint workflow wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Save and checkpoint workflow mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Save and checkpoint workflow konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Save and checkpoint workflow ergänzen.

**Rhai-API:** `save_set`, `save_commit`, `checkpoint_set`

**Visual-Graph-API:** `Save/Set`, `Save/Commit`, `Game Flow/Checkpoint`

<a id="task-package-package-and-plugin-workflow"></a>

### Package and plugin workflow

**Klassifikation:** Assisted · Project-wide · Reversible

**Zweck und Einsatz:** Package and plugin workflow im Bereich Guided Project erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage / Debug. Verwenden, wenn das Projekt Package and plugin workflow benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- A test WASM plugin and manifest

**Exakter Ablauf:**

1. Manage / Debug und danach Guided Project öffnen.
2. Package and plugin workflow wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Package and plugin workflow ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Package and plugin workflow wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Package and plugin workflow mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Package and plugin workflow konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Package and plugin workflow ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** `Package-defined graph node`

<a id="task-network-local-network-sample"></a>

### Local network sample

**Klassifikation:** Assisted · Runtime · Project-wide · Reversible

**Zweck und Einsatz:** Local network sample im Bereich Guided Project erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Debug. Verwenden, wenn das Projekt Local network sample benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Networking package and explicit permission

**Exakter Ablauf:**

1. Debug und danach Guided Project öffnen.
2. Local network sample wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Local network sample ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Local network sample wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Local network sample mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Local network sample konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Local network sample ergänzen.

**Rhai-API:** `network_rpc`, `network_role`

**Visual-Graph-API:** `Network/RPC`, `Network/Role`

<a id="task-windows-windows-portable-export"></a>

### Windows portable export

**Klassifikation:** Assisted · Project-wide

**Zweck und Einsatz:** Windows portable export im Bereich Guided Project erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage. Verwenden, wenn das Projekt Windows portable export benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Windows host
- Passing Project Health and Windows template

**Exakter Ablauf:**

1. Manage und danach Guided Project öffnen.
2. Windows portable export wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Windows portable export ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Windows portable export wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Windows portable export mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Windows portable export konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Windows portable export ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<a id="task-web-web-deployment"></a>

### Web deployment

**Klassifikation:** Assisted · Project-wide

**Zweck und Einsatz:** Web deployment im Bereich Guided Project erledigt die unterstützte Autoren- oder Laufzeitaufgabe direkt im Arbeitsbereich Manage. Verwenden, wenn das Projekt Web deployment benötigt; nicht zugehörige Einstellungen bleiben in ihrem zuständigen Arbeitsbereich.

**Voraussetzungen:**

- Passing Project Health and Web template
- An explicit external HTTP(S) host

**Exakter Ablauf:**

1. Manage und danach Guided Project öffnen.
2. Web deployment wählen und vor der Bearbeitung sichtbare Validierung und Berechtigungen prüfen.
3. Zielprojekt, Asset oder Objekt wählen und nur endliche, unterstützte Werte eingeben.
4. Änderung anwenden oder speichern und sichtbares Ergebnis sowie Probleme/Konsole prüfen.
5. Bei Laufzeitverhalten Play oder Vorschau starten; Pause/Einzelschritt für deterministische Prüfung verwenden.
6. Projekt speichern, neu laden und den unveränderten Autorenwert bestätigen.
7. Project Health und den passenden Test ausführen, Standalone-Player bauen und die sichtbare Prüfung wiederholen.

**Erwartetes Ergebnis:** Web deployment ist im Editor sichtbar, bleibt nach dem Neuladen erhalten und erreicht gegebenenfalls Vorschau, Play und exportierte Player.

**Speicherung und Export:** Web deployment wird im zuständigen Projekt, in Szene, Komponente, Asset, Arbeitsbereichseinstellung oder Build-Manifest gespeichert. Reine Editor-Daten gelangen nicht in Player.

**Rückgängig und Wiederherstellung:** Für Dokumentänderungen Rückgängig/Wiederholen, für Importe oder Pakete Zurücksetzen/Rollback, bei unterbrochenen Speicherungen Recovery Browser und für projektweite Wiederherstellung Quellverwaltung oder Migrations-Backup verwenden.

**Häufige Fehler und Lösungen:**

- Web deployment mit falscher Auswahl oder im falschen Arbeitsbereich bearbeiten.
- Berechtigungs-, Validierungs-, Referenz- oder Hostvorlagenwarnung ignorieren.
- Nur die Editorvorschau prüfen, nicht Speichern/Neuladen und Standalone-Player.

**Tastatur und Barrierefreiheit:** Command Palette oder Tastaturfokus statt reiner Zeigerbedienung verwenden. Dialoge besitzen Namen, sichtbaren Fokus, Escape/Abbrechen und reduzierte Bewegung.

**Minimales Beispiel:** Minimal: ein gültiges Ziel erstellen, Web deployment konfigurieren, speichern und ein sichtbares Play-Ergebnis prüfen.

**Produktionsbeispiel:** Produktion: Validierung, Lokalisierung/Barrierefreiheit, deterministische Tests, Budgets, Wiederherstellung und Entwicklungs-/Release-Builds für Web deployment ergänzen.

**Rhai-API:** N/A

**Visual-Graph-API:** N/A

<!-- NOVA_V6_TEACHING_END -->
