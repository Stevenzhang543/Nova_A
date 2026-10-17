# Nova_A 26.22 — Eigenschaften und Rückgängig

Entwicklungsleitfaden zur Abnahme. Die Beispiele verwenden Engine 26.22.0 und Project Format 2/schema 29. Generierte Beispiele sind noch keine qualifizierte Veröffentlichung.

## Referenz öffnen

Öffnen Sie `creator-v2622-code-game`, `creator-v2622-blocks-game` oder `creator-v2622-mixed-game`. Bewegen Sie sich mit WASD/Pfeiltasten, sammeln Sie Kontrollpunkte und starten Sie mit R neu. Animationen und Render-Effekte bleiben eingeschaltet. Die Referenzen für Ausgabequalität, animierte Menüs und den autoritativen Server behalten ihre bisherigen Abläufe.

## Bearbeiten und rückgängig machen

Wählen Sie Player. Ändern Sie rasch X und Y. Einmal Rückgängig stellt nur Y wieder her, ein zweites Mal X. Wiederholen Sie beide Änderungen mit Wiederherstellen. Ziehen Sie einen Regler länger als zwei Sekunden; einmal Rückgängig muss den Zustand vor dem Ziehen wiederherstellen. Wiederholen Sie dies in einer anderen Szene. Speichern Sie unmittelbar nach einer gültigen Eingabe wie `120+3`, öffnen Sie das Projekt erneut und prüfen Sie den Wert.

Wählen Sie zwei Objekte mit verschiedenen Positionen. Der gemischte Wert muss erkennbar sein. Setzen Sie einen gemeinsamen Wert und kontrollieren Sie beide Objekte. Wenden Sie eine Prefab-Überschreibung an, setzen Sie sie zurück und prüfen Sie jeweils Rückgängig. Eine externe Zusammenführung muss erneut geprüft werden, wenn zwischenzeitliche Änderungen ihre Grundlage veralten lassen.

## Ungültige Eingaben korrigieren

Geben Sie `1/0` oder einen Wert außerhalb der Feldgrenzen ein. Der Entwurf bleibt mit einer Erklärung sichtbar, der gespeicherte Wert bleibt unverändert. Speichern und Wiedergabe warten auf die Korrektur. Escape stellt den gespeicherten Wert wieder her. Beim Wechsel des Objekts oder der Ressource darf der alte Entwurf nicht auf die neue Auswahl übertragen werden. Unbegrenzte Gelenkgrenzen werden ausdrücklich gewählt; große endliche Werte bleiben endlich.

## Import und Audio

Importieren Sie eine kurze WAV-Datei. Wählen Sie sie im Audiomischer und legen Sie einen Schleifenbereich an. Ein Startpunkt hinter dem Endpunkt muss als ungültiger Entwurf erscheinen, ohne den Bereich zu löschen. Korrigieren Sie den Start, ändern Sie das Ende und machen Sie beide Änderungen einzeln rückgängig. Ziehen Sie den Master-Regler länger als zwei Sekunden und machen Sie die gesamte Bewegung einmal rückgängig. Prüfen Sie auch Pixel pro Einheit und den Drehpunkt eines Bildes sowie Speichern und erneutes Öffnen.

Codec-, Qualitäts- und plattformspezifische Kompressionsoptionen speichern derzeit die Importabsicht; der Importer transkodiert die Quelldatei nicht in diese Formate. Gleiche gespeicherte Werte beweisen keine hörbare oder sichtbare Qualität. Wiedergabe, Filter, Schleifen und Export benötigen eigene Ausführungsprüfungen.

## Lesbarkeit und Ausgabe

Prüfen Sie schmale und maximierte Eigenschaften-, Asset- und Audiofenster bei 100%, 150% und 200% UI-Skalierung. Zahlenfelder müssen mindestens sechs lesbare Ziffernplätze behalten; Feldpaare umbrechen. Prüfen Sie Tastaturbedienung, Fokus, Beschriftungen, gemischte Werte, Standardwerte, Überschreibungen und Zielressourcen in allen drei Sprachen und fünf Paletten.

Speichern, schließen und öffnen Sie das Projekt erneut. Exportieren Sie Web und wiederholen Sie Spiel- und Menüabläufe mit den geänderten Eigenschaften. Kontrollieren Sie Verhalten und Daten. Vor den elf neuen Dateien in `releases/v26.22` bleiben die Prüfsummen älterer Veröffentlichungen unverändert.

## Nachweise und Grenzen

Abgeschlossene Prüfungen stehen in `IMPLEMENTATION_TRACKER_26_22.md`, nicht ausgeführte Fähigkeiten in `GAP_REGISTER_26_22.md`. Die Lebenszyklusmatrix enthält benannte Zuordnungen und ausdrückliche Nachweisgrenzen; eine Zuordnung ist keine vollständige Feldfreigabe. Entwicklungsberichte qualifizieren keine eingefrorene Veröffentlichung. Unabhängige Benutzer, assistive Technik, andere Betriebssysteme, Signierung, Geräte-Audio und Langzeittests bleiben gesonderte externe Prüfungen.

Projekt speichern, Export, Wiedergabe und Einzelschritt werden bei ungespeicherten Asset-Änderungen in einem Studio angehalten. Speichern Sie das Asset in seinem Editor oder laden Sie es ausdrücklich neu, um den Entwurf zu verwerfen. Versuchen Sie den Vorgang danach erneut. Zahlenentwürfe werden zuerst geprüft. Die eigene Animationsvorschau kann weiterhin ungespeicherte Clips abspielen. Beim Trennen eines Skripts vom Graphen wird nur die tatsächliche Verknüpfungsmarkierung entfernt; Quelltext, Zeichenketten und andere Kommentare bleiben erhalten.
