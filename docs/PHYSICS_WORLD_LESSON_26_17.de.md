# Physik, Navigation und gestreamte Welten bauen und prüfen

Die X/Y-Anzeige speichert ihren Zeitgeber in der exportierten Eigenschaft readout_elapsed. Gewöhnliche Rhai-Variablen werden bei jedem Callback neu initialisiert; dauerhafter Zustand gehört in exportierte Eigenschaften.

Verwenden Sie die separaten26.17-Referenzen für Platformer, Navigation und Physikrätsel. Behalten Sie eine Originalkopie. Generierte Projekte sind Ausgangspunkte; die Release-Evidenz enthält separat bearbeitete, gespeicherte Projekte und tatsächlich ausgeführte Player. Project Format2/Schema29 sowie Rhai-/Visual-Formate bleiben erhalten. PHYSICS_WORLD_FIELD_MATRIX_26_17.md ordnet jedes deklarierte Feld einschließlich Teilformen, Materialien, Effekten, Verbindungen und Profilen seinem Auswertungspfad zu.

## Körper, Einheiten und Bewegungsbesitz

Wählen Sie in Design ein Objekt, öffnen Sie die Physikabschnitte und verbreitern Sie den Inspector. World Studio bietet größere Formulare für Character, Areas, Navigation, AI, Streaming und Simulation. Physik- und Weltstatus zeigt schreibgeschützte Körperzahlen, Konfigurationsaufbauten, Navigationszeiten, Speicherabschätzungen und Ursprungsversatz. Intern gelten Meter, Sekunden, Kilogramm, Newton und Radiant. Der Hauptinspector zeigt Winkel in Grad, Teilcollider verwenden Radiant. Geschwindigkeit: m/s beziehungsweise rad/s; Flächendichte: kg/m²; Trägheit: kg·m². Positive globale Gravitation wirkt in Richtung negativer Welt-Y.

Dynamic integriert Kräfte; Kinematic folgt Bewegungsbefehlen; Static dient unbewegter Geometrie. Animation-Besitz behandelt animierte Transformationen kinematisch und erhält verfasste Geschwindigkeit für späteren Physics-Besitz. Automatische Masse verwendet aktive Collidergeometrie, vorzeichenbehaftete Eltern-/Weltskalierung und effektive Materialdichte. Manuelle Masse und automatische/manuelle Trägheit sind ausdrückliche Alternativen. Ein verknüpftes Material ersetzt keine Inline-Werte, sondern liefert effektive Koeffizienten. Das ausdrückliche Anwenden eines Materials im Inspector bleibt eine Bearbeitung.

Ändern Sie Größe, Versatz, Drehung, Dichte, Reibung, Rückprall, Dämpfung, Gravitation, Kraft und Drehmoment nach dem ersten Start. Pausieren Sie und vergleichen Sie Eingaben mit Kontakt-/Schlafbeobachtungen. Die nächste native Synchronisierung muss die Änderung anwenden und unabhängige Körperzustände erhalten. Prüfen Sie Undo/Redo, Stop und erneutes Öffnen. Ungültige Zahlen in Welt-/Einstellungsformularen stellen den vorherigen Wert mit Diagnose wieder her.

## Platformer und Kontakte

Player verwendet CharacterBody2D. Stellen Sie Bodenschnappen, Sicherheitsrand, Stufenhöhe, maximale Gleitversuche, Neigungswinkel, Coyote-Zeit und Plattformübernahme ein. A/D und Space bewegen beziehungsweise springen. Play, Pause und Step dürfen Bewegung pro festem Tick nur einmal integrieren. Prüfen Sie niedrige Stufe, einseitige Platform und Moving Platform. Die Demonstrationsplattform fährt kontinuierlich; testen Sie innerhalb20Sekunden oder ergänzen Sie einen Umkehrcontroller.

Ändern Sie Reibung und Masken; testen Sie Landung von oben und Durchgang von unten. Physiklayer verwenden0–31, Navigation1–32. Renderlayer filtern keine Physikabfragen. Teilcollider besitzen eigene Sensor-, Masken- und Einseitigkeitseinstellungen. Volle Breite/Höhe bestimmen Teilkreise/-ellipsen; das alte Radiusfeld ist Kompatibilitätsmetadatum. Dynamische konkave/Chain-Geometrie und WorldBoundary-Besitz unterliegen ausdrücklichen Einschränkungen.

Character-Bewegung verwendet eine konservative Hülle einschließlich Teilcollider-Versatz und -Drehung; Lücken zusammengesetzter Figuren werden eingeschlossen. Stufen prüfen Deckenfreiheit. Ruhende Figuren aktualisieren Bodenkontakte; entfernte Plattformen dürfen keine alte Geschwindigkeit übertragen. CCD kostet zusätzliche Arbeit. Prüfen Sie Tunneln, Stapel und Schlafzustand mit dem tatsächlich gewählten Tick-/Substep-/Solverprofil.

## Verbindungen und Physikrätsel

Bearbeiten Sie bei Jointed Box Distanz und lokale Anker. Joint-Typ bestimmt Achse, lineare/Winkelgrenzen, Motor und Kraftlimit. Positive Bruchschwellen aktivieren Bruch; historischer Wert0 bedeutet unbegrenzt. Ein gebrochenes Komponenten-Joint bleibt gebrochen bis Deaktivieren/Aktivieren, Entfernen oder Sitzungsreset. Explizite Distanz bleibt beim ersten Play erhalten; Referenzversatz/-winkel werden einmal initialisiert.

Öffnen Sie ein vorhandenes Seil unter Connections. Die gespeicherte Route öffnet direkt die Physikeinstellungen. Radius in Metern, Liniendichte in kg/m, Steifigkeit, Dämpfung, Dehnung/Biegung und Punktzahl bearbeiten. Die historische Bezeichnung Seilsegmente wählt3–32 simulierte Punkte. Speichern baut ausdrücklich neu auf und setzt Bruch zurück, erhält jedoch UUID, Aktivierung und verborgene Joint-Felder. Abbrechen verwirft nur den Entwurf. Testen Sie ungültige Punktzahl, Abbrechen, erneutes Bearbeiten, Speichern, Undo/Redo und erneutes Öffnen. Stoff ist hier ein Körper-/Verbindungsgitter ohne Stoff-Selbstkollision.

## Navigation und KI

World Navigation unterstützt Manual, SceneGeometry und TileMap. Manual liefert die Grenze, SceneGeometry erfasst passende Collider, TileMap erfasst Inhalte/Transformationen/Masken/Assetdaten und verwendet immer ein Raster. Positive Zellgröße und Agentenfreiheit wählen; größere Freiheit kann enge Durchgänge schließen. AStar, HierarchicalAStar mit Fallback und FlowField verwenden gewichtete Verbindungen/Kostenflächen. Polygonmodus besitzt eine eigene Sichtbarkeitssuche mit kontinuierlicher Freiraumprüfung. Gerichtete Links können mehrere Inseln verbinden; FlowField speichert vier Ziele je Raster.

Bake veröffentlicht nur vollständige aktuelle Ergebnisse. Bei längeren Vorgängen Abbrechen verwenden; der Fortschrittsbalken kann die Schaltflächen verschieben. Abgebrochene Arbeit startet nicht automatisch neu. Quelle reparieren und erneut backen. Geometrie, Skalierung, Radius, Kosten, Links, Tile-Inhalte und Assetbytes invalidieren Routen. Veraltete Agenten halten bis zur Neuberechnung an. Ein gespeicherter bakedRevision-Wert ist kein portables Bake-Artefakt.

WASD bewegt Player; Navigator verfolgt ihn um die Barriere. Ziel-UUID, Tempo, Beschleunigung, Radius, Stoppdistanz, Repath-Intervall und Ausweichparameter prüfen. Beschleunigung0 erhält Geschwindigkeit; statische Hindernisse sagen keine Bewegung voraus. Navigation- und AI-Paket aktivieren. Das Behavior-Asset enthält Wahrnehmung und Wait: Tags, Radius, Sichtfeld, Trefferlimit und Blackboard-Schlüssel prüfen. Overrides initialisieren bei Quellen-/Override-Änderung; spätere Laufzeitwerte bleiben bestehen. Zurückgestellte Agenten konsumieren Signalgenerationen einmal. Fehlende Assets/Pakete und Budgetgrenzen benötigen sichtbare Reparatur.

## Streaming, Ursprung und Export

Stream Cell steuert echte Mitgliedschaft über Szene, Abhängigkeiten, Lade-/Entlade-/Prefetch-Distanzen, Priorität, Cachepolitik, Eigentum, Saveschlüssel und Speicherabschätzung. Prefetch hält Daten getrennt; Active installiert sichtbare und abfragbare Objekte. Streamed Landmark erscheint in der Hierarchie. Geteilte Eigentümer halten Objekte bis zur letzten Freigabe. Deaktivierte Kinder bleiben deaktiviert; persistente Objekte/Nachkommen behalten UUIDs und interne Verbindungen.

Ausstehendes Streaming abbrechen, Fehlerquelle/Zyklus/Budget reparieren und Retry verwenden. MiB-Werte sind Admission-Schätzungen, keine gemessene Heapbelegung. Fehlgeschlagenes Portal-Prefetch nach Quellenreparatur aus-/einschalten. Das Zielportal wird nach dem Szenencommit per UUID/Name aufgelöst, setzt Geschwindigkeit zurück und verhindert sofortigen Rücksprung. Fehlende Ziele melden einen Fehler.

Pausieren Sie in Play, wählen Sie Player und verschieben Sie den Ursprung zum Objekt. Relative Positionen, native Handles, Geschwindigkeit, Schlaf/Kontakte, Seilpunkte, Navigationsziele und gecachte Szenen müssen zusammenpassen. Absolutposition = Weltposition + Ursprungsversatz. Stop stellt die verfasste Szene wieder her. Wiederholte Verschiebungen dürfen persistente UUIDs nicht duplizieren oder Seile doppelt verschieben.

Speichern, über Open Project erneut öffnen und die Abläufe wiederholen. Vollständiges Web-ZIP exportieren, entpacken und per HTTP starten. X/Y-Anzeige mit pausiertem Inspector vergleichen. Die Prüfung vergleicht alle verfassten Szenenwerte und Paket-/Dateihashes und startet ausschließlich heruntergeladene Dateien in frischen Browserprozessen. Gemeinsame Export-/Player-Browserläufe hatten lokale Navigations-Timeouts; diese Versuche bleiben Fehlerberichte.

Profiler auf dem Zielgerät verwenden. Positionsiterationen korrigieren nun unabhängig von Geschwindigkeitsiterationen; ältere Zeitannahmen neu messen. Abfragen, Navigation, KI, Streaming und Handoffs haben ausdrückliche Grenzen. Native/WASM-Analytik, Fuzz, Replay und Cleanup sind Programmiererevidenz; Maus/Tastatur, Layout, Save und exportiertes Spiel werden separat geprüft. Software-Rendering und begrenzte lokale Tests beweisen weder universelle Höchstleistung noch reale Hilfstechnologien, Signierung oder alle Geräte.
