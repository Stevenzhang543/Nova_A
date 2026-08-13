# Nova_A 2.4 – Vollständiges Handbuch

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
- Hilfe öffnet Handbuch oder GitHub; das Versionsfeld zeigt 2.4.0.

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

**Nova_A Project Format 2**, Schema 17, unterstützt Legacy ab Schema 5. Dokumente enthalten Format/Major, Schema, Engineversion, Kompatibilität und Projekt-UUID. Schema 17 validiert `Skeleton2D`-Rig/Skin- und `TimelinePlayer`-Referenzen und erhält unbekannte Asset-Felder. Geordnete Migrationen erhalten IDs, Komponenten, Hierarchie, Szenen, Assets, Prefabs, Eingabe, Audio, Tilemaps, Partikel, Gelenke, Build- und Renderingwerte. Neuere unbekannte Formate werden verständlich abgelehnt.

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

`use "Movement.rhai";` importiert schreibgeschützte Projektmodule; fehlende und zyklische Abhängigkeiten werden abgelehnt. Gültiges Speichern ersetzt das kompilierte Programm nur an einer sicheren Frame-Grenze; bei einem Fehler läuft die vorherige gültige Version weiter. Entwicklungssitzungen bieten Continue/Step, Stack, Locals und sichere Watches. `test_*` läuft isoliert und `expect` meldet Fehler. Getypte Handles liefern `valid/kind/id/error`. `task_wait` wird mit Objekt/Szene abgebrochen. `signal_emit` erreicht `on_signal`; Physik, UI, Animation und Szenenlebenszyklus benutzen dieselbe begrenzte Warteschlange. Format 2 Schema 17 speichert die Metadaten; Release-Builds entfernen Debugdaten.
