# Nova_A26.20 — erstellen, abstimmen, vergleichen und ausliefern

Diese Lektion ergänzt das vollständige deutsche Handbuch und die40 Vorlagen-Anleitungen. Engine26.20.0 behält Projektformat2/Schema29, Rhai API2, Graph1, Plugin API2 und Netzwerkprotokoll2. Eine lokale Freigabe zertifiziert nicht jede Plattform und jedes mögliche Programm.

## Editorpalette auswählen

Manage → Project & safety → Settings → Darstellung öffnen. Die Farbpalette bietet Wolkenblau, Wiesencreme, Beerenrosa, Mitternachtsblau und Nachtgarten. Die ersten drei sind hell, die letzten zwei dunkel. Eine Auswahl gilt sofort. Hell/Dunkel stellt die zuletzt gewählte Palette des jeweiligen Modus wieder her. Die Pfeiltasten eines nativen Auswahlfelds übernehmen jede durchlaufene Option; mit den Modusschaltern kehren Sie zur vorherigen Auswahl zurück. Anwendung schließen und neu öffnen, um die Speicherung zu prüfen.

Hintergrund, Oberfläche, Primärfarbe, Sekundärfarbe, Akzent und Haupttext entsprechen exakt den sechs vorgegebenen Rollen. Rahmen, dezenter Text, Hover und Auswahl sind daraus abgeleitet. Dunkle Textlinks verwenden eine aufgehellte Primärfarbe. Hoher Kontrast bleibt eine ausdrückliche Übersteuerung. Editorfarben verändern weder Spielmaterialien noch UI-Themes im Spiel. Bewegungsreduktion, Animationsdauer und Effekte bleiben erhalten.

## Dasselbe Spiel mit Code, Blöcken und gemischt erstellen

Die passende Referenz creator-v2620-code-game, creator-v2620-blocks-game oder creator-v2620-mixed-game öffnen. In Play mit WASD/Pfeiltasten sechs Checkpoints der Reihe nach einsammeln; R startet neu. Vor dem Bearbeiten stoppen. CheckpointGame.rhai im Script-Arbeitsbereich öffnen und den Geschwindigkeitswert suchen. Im Code den Wert ändern; im Blockmodus den entsprechenden Zahlenblock des verknüpften Graphen bearbeiten; im gemischten Modus beide Wege verwenden. Speichern, Darstellung wechseln und den erhaltenen Wert prüfen. Typisierte Graphstruktur und quelltextgestützte Bereiche sind unterschiedliche Unterstützungsstufen. Nicht unterstützten Quelltext nicht löschen, um eine Konvertierung zu erzwingen.

Checkpoint1 in Design auswählen und X verschieben. Das Skript fragt die aktuelle Weltposition ab; der Einsammelpunkt folgt dem Objekt. Rückgängig/Wiederholen prüfen. Projekt speichern, neu öffnen, Play wiederholen, über Manage → Build Settings nach Web exportieren und Bewegung, Einsammeln und Neustart erneut prüfen. Ein Inspector-Wert allein beweist kein korrektes Exportverhalten.

## Auflösung und Kantenglättung ohne Funktionsverlust

Manage → Rendering → Quality öffnen. Animation, Beleuchtung, Partikel, Audio, Timeline, UI und Nachbearbeitung eingeschaltet lassen. Auflösungsskalierung1 nutzt die vorhandenen Grenzen der Gerätedichte.1,5 oder2 erhöht die Pixelzahl für Supersampling innerhalb der Geräte- und Speichergrenzen.0,5 ist eine ausdrückliche Benutzeroption; diese Version wählt sie nicht heimlich. Vorhandene adaptive Qualitäts- und Profiloptionen behalten ihre bisherige Bedeutung.

Automatisch verwendet die normale Framebuffer-Glättung und ergänzt begrenztes Multisampling für die separate Nachbearbeitungsfläche. Bei aktiviertem Pixel-Snapping wird dort keine zusätzliche Glättung angewendet. MSAA2/4/8 fordert Samples an; die tatsächliche Unterstützung kann geringer sein. Aus deaktiviert angefordertes WebGL-Anti-Aliasing. Tatsächliche Pixel / MSAA-Samples zeigt reale Größe und Samplezahl. Canvas2D nutzt Browserglättung und meldet keine GPU-Samples. Nächster-Nachbar-Filter und pixelgenaue Kamera bleiben für Pixelgrafik verfügbar.

Mehr Pixel und Samples benötigen GPU-Zeit und Speicher. Multisample-Farbfläche samt aufgelöster Textur sind zusammen auf256MiB begrenzt. Die Samplezahl wird bei Bedarf reduziert; der logische Sichtbereich bleibt erhalten. Allgemeine Oberflächen sind auf8192 Pixel pro Achse und16.777.216 Pixel insgesamt begrenzt; Geräte können niedrigere Grenzen haben. Eine Auflösungsänderung darf die Editorkamera nicht verschieben. Eine Einstellung ändern, Rückgängig/Wiederholen ausführen, speichern, neu öffnen und im exportierten Spiel vergleichen.

## Animation erhalten und Leistung messen

creator-v2620-animated-menu öffnen. Menü abspielen, Eingabe und Checkbox bedienen und dabei Titelfade und Timeline beobachten. Bei zwei Auflösungsskalierungen und im Webexport wiederholen. Die vorhandenen Kapitel zu Assets, Animation, Controllern, Rig, Timeline, Audio und UI bleiben vollständig erhalten. Diese Referenz bewahrt ihre Inhalte; kein System wird für einen günstigeren Messwert entfernt.

Für Vergleiche dasselbe Projekt, Kamera, Objektzahl, Auflösung, Effekte, Build, Gerät und Aufwärmphase verwenden. CPU-Zeit, verfügbare GPU-Zeit, Draw Calls und tatsächliche Pixel zusätzlich zu FPS dokumentieren. Die optimierte Gruppierung erhält Reihenfolge und Vertex-/Indexdaten. Gleich große Batches verwenden Speicher erneut. Indexreiche Gruppen können in zusätzliche Draw Calls geteilt werden, damit der Speicher begrenzt bleibt. Isolierte Gruppierungszeiten sind keine Gesamt-FPS. Umfang und Gerät des aktuellen Berichts lesen.

## Probleme beheben und ausliefern

Bei fehlendem WebGL den sichtbaren Fallback-Grund lesen und Canvas2D-Ausgabe prüfen. Bei niedrigerem MSAA zuerst tatsächliche Samples und Auflösung ansehen. Bei abgeschnittenen Beschriftungen Panel vergrößern oder maximieren und Palette, Sprache, Skalierung und Panel angeben. Bei Shaderfehlern den genannten Materialfehler und Fallback prüfen. Bei unvollständiger Graphkonvertierung den quelltextgestützten Bereich erhalten und die gemeldete Syntax-/Unterstützungsgrenze bearbeiten.

Vor Export Project Health ausführen. Blockierter nativer Export im Browser ist korrekt; dafür wird der Desktop-Host benötigt. Build-Protokolle und Reparaturaktionen nennen Voraussetzungen. Vor externer Bearbeitung speichern; Konflikte in Team vergleichen, lokal/eingehend/Basis wählen, einmal anwenden und Rückgängig/Wiederholen prüfen. Veraltete Vorschauen erneuern. Paketberechtigungen überprüfen; Deaktivierung/Entfernung entlädt das Plugin. Signierte Update-Vormerkungen dokumentieren Prüf-/Operatoraktionen und installieren keine Binärdateien.

Für saubere/verschobene Quellverzeichnisse Node22.22.2, pnpm10.30.0, Rust1.92.0 mit rustfmt/clippy/wasm32 sowie Windows-Voraussetzungen installieren. Offline sind gefüllte Caches erforderlich. Nach einem Umzug pnpm-Verknüpfungen ausdrücklich offline reparieren und native Metadaten in einem neuen Target-Verzeichnis bauen. Cache-Reparatur darf keine Autoren-Assets löschen.

Alle lokalen Gates gegen eingefrorenen Quellstand ausführen und exakt11 Release-Dateien mit Prüfsummen verifizieren. Historische Releases bleiben unverändert. Unabhängige Anfänger-/Expertenbeobachtung, Hilfstechnologien, schwache/mobile Hardware, Linux/macOS/Android, Signierung/disposable Installation, unabhängige Sicherheit und echte Langzeittests benötigen ihre tatsächlichen Umgebungen. Lokal steht nur dieser Windows-Rechner bereit.
