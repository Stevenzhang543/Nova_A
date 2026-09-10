# Nova_A 26.19: Bauen, prüfen und wiederherstellen

Arbeiten Sie mit Wegwerfkopien der sechs Projekte mit `v2619` unter `reference-projects/projects`. Öffnen Sie `project.nova` im Startfenster. Quell- und Referenzarchiv enthalten die Dateien; ein Dienstkonto ist nicht erforderlich. Project Format 2/Schema 29, Rhai API 2, Graph Format 1, Plugin API 2 und Package Manifest 1 bleiben kompatibel.

## Ein vollständiges Spiel in drei Arbeitsweisen

Öffnen Sie `creator-v2619-code-game`, `creator-v2619-blocks-game` oder `creator-v2619-mixed-game`. Starten Sie das Spiel, fokussieren Sie die Spielfläche und sammeln Sie mit WASD/Pfeiltasten sechs Kontrollpunkte. Der Titel wechselt von Checkpoint 1/6 zur Abschlussmeldung. R setzt Punktestand, Position und Kontrollpunkte zurück. Vor der Bearbeitung stoppen.

In Code öffnen Sie CheckpointGame.rhai und ändern beide Bewegungsmultiplikatoren von 6.0 auf 4.0. In Blocks öffnen Sie CheckpointGame.nova-graph und ändern die Zahlenknoten in den X/Y-Bewegungsausdrücken auf 4.0. Mixed verknüpft Code und typisierten Graphen: wechseln Sie die Ansicht, kontrollieren Sie beide Werte und speichern Sie. Rückgängig/Wiederholen muss die beabsichtigte Änderung wiedergeben. Syntaxfehler bleiben sichtbar; ein unvollständiger Graph darf den Quelltext nicht still ersetzen.

Die Aufnahmeprüfung liest die Weltposition des aktiven Checkpoint-Objekts mit `find_entity_handle`, `entity_position_x_on` und `entity_position_y_on`. Verschieben Sie Checkpoint 1 in Design: auch sein Aufnahmeort verschiebt sich. Die neue Lektion verwendet damit keine fest eingebauten Koordinaten mehr. Speichern, neu öffnen und Transformations- sowie Code/Graph-Werte vor dem Export prüfen. Die drei Arbeitsweisen führen dieselben unterstützten Rhai-Operationen aus; Graphanordnung ändert keine Auswertungsreihenfolge.

## Einen echten Konflikt lösen

Öffnen Sie `delivery-v2619-semantic-merge/project.nova`. Wählen Sie Checkpoint 1 und ändern Sie Transform position X von -6 auf -4. Unter Manage → Build Settings → Team aktivieren Sie den optionalen Team-Arbeitsablauf und importieren die benachbarte Datei `incoming.nova`. Diese ändert X desselben Objekts auf -2.

Vergleichen Sie lokale und eingehende Werte; Basisversion zeigt -6. Übernehmen Sie den eingehenden Wert und wenden Sie die Zusammenführung an. Das gleiche Objekt hat nun X=-2. Rückgängig stellt -4 wieder her, Wiederholen -2. Speichern, neu öffnen und exportieren. Identität und Objektanzahl bleiben erhalten. Ein Reihenfolgekonflikt entscheidet die Reihenfolge und bewahrt bereits zusammengeführte Eigenschaftsänderungen. Bei Löschen gegen Bearbeiten lässt sich die bearbeitete Identität wiederherstellen; die Wahl kann erneut geändert werden.

Ändern Sie das Projekt während der Prüfung, wird die alte Vorschau abgelehnt. Importieren Sie erneut und prüfen Sie die aktuellen Werte. Ungelöste Konflikte verhindern die Anwendung. Doppelte Identitäten und zu große/tiefe Eingaben werden vor einer Teiländerung abgelehnt. Dies ist eine lokale Dreiwege-Zusammenführung, kein Cloud-Dienst. Die Zusammenführung benötigt keine Netzwerkoperation.

## Paketprüfung und Lebensdauer

Öffnen Sie `delivery-v2619-package-build`, dann Manage → Packages → Browse. Wählen Sie Nova Navigation 2D. Lesen Sie Herausgeber, Version, Kompatibilität, Abhängigkeiten, Berechtigungen, SHA-256 und Lizenz. Installieren Sie nach Prüfung des Bestätigungsdialogs. Der gebündelte Offline-Katalog benötigt keinen Download. Deaktivieren, aktivieren und entfernen Sie das Paket anschließend in der installierten Liste. Machen Sie das Entfernen rückgängig, speichern Sie und öffnen Sie erneut.

Abhängige Pakete verhindern das Entfernen. Eine fehlgeschlagene Update-Freigabe stellt frühere Berechtigungen wieder her. Abgelehnte Updates bewahren installierte Version und Sperrdatei; die Quarantäne einer ungültigen neueren Version deaktiviert keine gültige ältere Version. Rollback prüft Sicherheit und den vollständigen Abhängigkeitsgraphen, bevor Verlauf verbraucht wird. Deaktivieren oder Entfernen entlädt das laufende Plugin. Ein Versionswechsel entlädt und deaktiviert die alte Binärdatei, bis passendes geprüftes Manifest und Binärdatei importiert werden. Ein neues Versionsetikett ersetzt keinen Code. Native Erweiterungen bleiben außerhalb der WASM-Sandbox. Entfernte Plugin-URLs werden nicht automatisch geladen; importieren Sie die Ressource lokal.

## Bauen und Ergebnis prüfen

Manage → Build Settings enthält Ziel, Architektur, Profil, Szenenreihenfolge und Startszene unter Overview. Platform enthält Anwendungskennung und optionale Signaturangaben. Delivery enthält deterministische Ausgabe, Cache, Einschlussregeln und Berichte. Diagnostics & history zeigt Ausgaben und Fehler. Team enthält die lokale Zusammenarbeit.

Im Browser wählen Sie Web. Native Ausgabe erfordert eine erfolgreiche Prüfung des Desktop-Hosts; das Betriebssystem des Browsers reicht nicht aus. Bei fehlgeschlagener Erkennung erscheint eine Neustart-/Wiederholungsanweisung. Android benötigt seine lokale Werkzeugkette und für Geräteprüfung ein echtes Gerät. Linux/macOS bleiben Ziele für passende Hosts; Windows-Ergebnisse qualifizieren sie nicht.

Vor dem Bauen speichern und das Ende des Speichervorgangs abwarten. Web exportieren, ZIP in einen eigenen Ordner entpacken, über lokales HTTP bereitstellen und index öffnen. Positionen, Bewegungsgeschwindigkeit, Punkte, Neustart und Ressourcen mit dem gespeicherten Editorprojekt vergleichen. Der Buildbericht enthält Dateigrößen und Hashes. `server-v2619-headless-authority` bleibt ein Server in einer WebView mit deaktivierter Darstellung, kein fensterloser nativer Server.

## Offline und nach einem Ordnerwechsel bauen

Voraussetzungen zuvor bewusst installieren: Node 22.22.2, pnpm 10.30.0, Rust 1.92.0, clippy, rustfmt, wasm32-unknown-unknown sowie wasm-pack und dessen zwischengespeicherte Bindgen-Werkzeuge. `.node-version`, `packageManager` und `rust-toolchain.toml` halten die Versionen fest. Native Windows-Builds benötigen passende MSVC-/Windows-SDK- und Tauri-Paketierungswerkzeuge. Verwenden Sie die eingecheckten Sperrdateien. Direkte Anwendungsabhängigkeiten wurden nicht allein wegen der Kalendernummer geändert.

Mit gefüllten Caches: `pnpm install --offline --frozen-lockfile --ignore-scripts`, anschließend `wasm-pack build crates/nova_wasm --target web --out-dir ../../nova_core/pkg --out-name nova_core --release --mode no-install -- --locked --offline` und `pnpm build`. Fehlende Cache-Inhalte müssen eine klare Fehlermeldung ergeben. Offline ersetzt keine Voraussetzungen.

Windows-pnpm-Verknüpfungen können nach einem Ordnerwechsel auf den alten Pfad zeigen. Führen Sie im neuen Ordner ausdrücklich `pnpm install --offline --frozen-lockfile --ignore-scripts --force` aus und bauen Sie erneut. Generierte Abhängigkeiten gehören nicht in das Quellarchiv. Der Reproduzierbarkeitstest vergleicht die Web-Dateien vor und nach dem Umzug Byte für Byte und bewahrt Protokolle. Er behauptet keinen Offline-Build auf einem völlig unvorbereiteten Rechner.

## Externer Editor und Wiederherstellung

Ein Standard-LSP-Client startet `node scripts/nova-rhai-language-server.mjs --stdio` aus dem Checkout mit installierten Abhängigkeiten. Das Protokoll nutzt Content-Length-JSON-RPC, UTF-16-Positionen und vollständige Dokumentübertragung. Unterstützt werden Diagnosen, Vervollständigung, Hover, Symbole, Definitionen, Referenzen, Umbenennung und Formatierung im beschriebenen Rhai-Modell. Dokumentversionen müssen steigen; alte Änderungen werden ignoriert. Schließen entfernt den Dokumentindex, Herunterfahren wartet auf vorgemerkte Arbeit. Der optionale Index ist ein Cache, keine maßgebliche Skriptdatei.

Bei extern geänderten Projektdateien zuerst vergleichen, dann Editor oder Datenträger wählen. Ein beendeter/ersetzter Beobachter darf keine alte Antwort in ein anderes Projekt übernehmen. Unvollständig geschriebene ungültige Dateien behalten eine Diagnose und werden erneut geprüft. Bei unvollständigem Datenträgerstand Editorversion behalten, externe Datei reparieren und erneut vergleichen. Wiederherstellung zuerst mit Wegwerfkopien erproben.

Signierte Update-Vorbereitung benötigt ausdrückliche Aktivierung, passenden Kanal, gültige Signatur/Fingerabdruck, passende Basisversion und neue Sequenz. Abbruch oder veränderte Basis/Kanal während der Prüfung verhindert das Bereitstellen. Dabei wird nichts geladen oder installiert. Commit-/Rollback-Einträge protokollieren vom Bediener bestätigte Installeraktionen; sie bilden keinen atomaren Binär-Updater. Produktionssignierung und Installation/Start/Update/Deinstallation auf Wegwerfrechnern bleiben getrennte Nachweise. Der vorhandene Windows-Rechner wird nicht als Wegwerfsystem verwendet. Ein iPhone qualifiziert Android nicht.

## Nachweise und Grenzen

Programmiererprüfungen umfassen ungültige Archivdaten, Abbruch, Rechteentzug, Identität/Reihenfolge, echte LSP-Prozessnachrichten, Offline-Builds nach Umzug und alle Freigabegates. Benutzerprüfungen erfassen echte Eingaben, Konfliktentscheidungen, Rückgängig/Wiederholen, Speichern/Öffnen, Paketprüfung und exportiertes Spiel. Geänderte Paneele werden in EN/DE/ZH, hell/dunkel, 100/150/200 Prozent und drei Breiten geprüft. Die lokale native UI-Automatisierung konnte nicht initialisiert werden; Browserbeobachtungen sind keine nativen Klicknachweise. Maßgeblich sind die an den exakten Quellstand gebundenen Freigabenachweise mit ihren offenen externen Prüfungen.

Ein mit einem Paket importiertes Plugin muss dieselbe ID, Version und API besitzen. Importierte Freigaben werden gelöscht; das Plugin bleibt deaktiviert. Prüfe seine Rechte in den Plugin-Werkzeugen vor dem Aktivieren. Der Austausch der Deklaration beendet die vorherige Instanz.

Auch die generierten nativen Tauri-Berechtigungen enthalten absolute Cachepfade. Nach einem Umzug ein neues Zielverzeichnis verwenden: `cargo check --manifest-path src-tauri/Cargo.toml --target-dir src-tauri/target/relocated --locked --offline`. Für einen paketierten Build vor `pnpm tauri build` die Variable `CARGO_TARGET_DIR` auf ein neues Verzeichnis setzen; dort liegt die Ausgabe. Quelldateien und alten Cache bis zum Erfolg bewahren. Der Reproduzierbarkeitstest protokolliert diese Reparatur und verwendet vier Compilerjobs.
