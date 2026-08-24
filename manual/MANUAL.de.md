# Nova_A 4.4.0 – Vollständiges Handbuch

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
