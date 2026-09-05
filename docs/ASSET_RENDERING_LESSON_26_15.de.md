# Produktionsressourcen und Rendering

## Mit einem sichtbaren Ergebnis beginnen
Empty eignet sich zum Importieren, Rendering Lab zur Beleuchtung. Der Projektstarter zeigt eine echte Laufzeitvorschau, Voraussetzungen, Steuerung und erwartetes Ergebnis. Suche, Kategorie und Schwierigkeit wirken gemeinsam; Zurücksetzen zeigt alle vierzig Einträge. Das Funktionshandbuch öffnet das betreffende Fachkapitel, die zugehörige Aufgabe die Anleitung des ausgewählten Starters. Wiederverwendete Grundlagen und noch ungebundene Beispielaktionen sind ausdrücklich angegeben.

## Importieren, prüfen und Fehler beheben
Design → Assets öffnen. Ein Bild zusammen mit seiner Atlas-JSON-Datei importieren oder eine orthogonale Tiled-Karte mit den benötigten Bildern und Tilesets. Der Stapel zeigt abgeschlossene, fehlgeschlagene und abgebrochene Dateien. Abbrechen beendet noch nicht übernommene Arbeit; bereits erfolgreiche Importe bleiben bestehen. Einzelne Aufträge lassen sich im aufklappbaren Protokoll prüfen und wiederholen. In schmalen Bereichen öffnet eine Auswahl die Details über die volle Breite; Durchsuchen führt zurück.

Die Vorschau nutzt die tatsächlichen Bilddaten, auch bei verknüpften Atlas-Ausschnitten. Übersicht zeigt Quelle, Fehler und typisierte Abhängigkeitsfelder. Ein fehlendes Bild importieren, im passenden Quellfeld auswählen und dem Navigationsknopf folgen. Verschieben und Umbenennen der Originaldatei müssen deren UUID-Verknüpfungen erhalten. Ein fehlgeschlagener Reimport behält den letzten gültigen Stand. Beim Projektwechsel werden verspätete Importergebnisse verworfen.

## Ausschnitte und Animation
Beim Atlas Ausschnitte öffnen und Frames extrahieren oder aktualisieren. Jeder erzeugte Frame behält seine stabile Quellidentität und verweist auf das Original. Eine andere Quellreihenfolge oder ein neuer Dateiname erzeugt keine neue Identität. Fehlerhafte oder nicht unterstützte Daten werden diagnostiziert.

Bei regulären Bildern Raster-Slicing einschalten und Spalten, Zeilen, Rand und Abstand festlegen. Zuschneiden analysiert die echte Transparenz. Automatisches Slicing speichert zusammenhängende sichtbare Regionen und die erste Region samt Kontur; es erzeugt allein noch keine getrennten Frame-Assets. Animation aus Frames erstellt einen normalen AnimationClip in Quellreihenfolge mit individuellen Zeitwerten, ersatzweise1/12 Sekunde. Den Clip anschließend über den normalen Animationsablauf an ein Objekt binden. Bloßes Extrahieren bindet keine Animation.

## Tiled-Karten bearbeiten
Vor dem Erzeugen einer Tilemap alle Bild- und Tileset-Quellen zuordnen. firstgid, horizontale/vertikale/diagonale Spiegelungen, die Umrechnung abwärts laufender Quellzeilen und individuelle Animationszeiten bleiben erhalten. Unterstützt sind endliche orthogonale JSON-Karten mit Atlas-Tilesets sowie die dokumentierte einfache CSV-TMX/TSX-Untermenge. Unendliche/isometrische Karten, komprimierte Gruppen-/Objekt-/Bildebenen und komplexe Kollisionsgeometrie werden abgewiesen. Solche Funktionen weiter im Originalwerkzeug bearbeiten.

Die importierte Karte besitzt ihre Quelle und Ebenen. Für lokale Tile-Definitionen im Tilemap-Werkzeug eine bearbeitbare Kopie anlegen. Das unabhängige TileSet teilt die Bild-UUIDs; Bearbeiten, Rückgängig/Wiederholen und Export verwenden die Kopie. Reimport verändert das Original, nicht die lokalen Definitionen. Ebenenmalen bleibt möglich, ohne die Quellkarte mit einem anderen Dokumentformat zu überschreiben.

## Gemeinsame Ressourcen und Varianten
In Assets Theme, Material, InputMap, PhysicsMaterial, AnimationLibrary oder DataTable anlegen. Änderungen bleiben bis Ressource speichern ein Entwurf. Ungültiges JSON und unfertige Varianten gehen beim Asset-/Arbeitsbereichwechsel nicht verloren. Gespeicherte Laufzeitwerte zeigen ausdrücklich den gespeicherten Resolverzustand. Eine benannte Variante mit partiellen Werten speichern und anschließend eine abgeleitete Überschreibung anlegen. Das Kind erbt Elternwerte und Varianten; lokale Felder überschreiben gezielt. Doppelte Namen, JSON ohne Objektstruktur, fehlende Eltern, Typkonflikte und Zyklen werden abgewiesen. Eltern und Kind nach Speichern/Öffnen erneut prüfen.

## Rendering beobachten und exportieren
In Rendering Lab Point Light auswählen und die Intensität ändern. Unter Verwalten → Rendering sind globale Szenenbeleuchtung und Ausgabeeinstellungen von den Objektfeldern getrennt. Tatsächliche Bildänderungen und Diagnosen prüfen. Nicht unterstützte Richtungsschatten sind mit Erklärung deaktiviert; Typwechsel erhalten gespeicherte Werte. Normalen folgen Bildrotation und Spiegelungen. Initialisierungs-/Shaderfehler verwenden einen erklärten Rückfallpfad; Kontextwiederherstellung baut Ressourcen neu auf.

Begrenzte Texturanzahl/-bytes, höchstens512MiB GPU-Budget und ein faires Upload-Budget pro Frame begrenzen Wachstum. Der Vorladerand fordert bei aktivem Culling nahe Bilder an. Warteschlange, Bytes und Aufschübe prüfen, bevor Budgets erhöht werden. Canvas-/Videotexturen werden pro Frame erneuert. Canvas-Kanten von Mesh-Dreiecken können von WebGL abweichen.

Projekt → Build öffnen und Web wählen. Ohne Verzeichnisdialog wird ein vollständiges ZIP mit Player, WASM, Spielpaket und Dateimanifest heruntergeladen. Entpacken und per HTTP bereitstellen; game.nova-pak allein ist keine vollständige Browseranwendung. Für Windows den passenden aktuellen nativen Player verwenden. Beleuchtung und Ressourcen im Export mit dem Editor vergleichen und das gespeicherte Projekt erneut öffnen. Messungen gelten für die geprüften Programme und diesen Rechner, nicht pauschal für jede GPU oder Installation.
