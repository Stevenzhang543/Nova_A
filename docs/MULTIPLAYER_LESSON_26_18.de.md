# 26.18 Multiplayer-Workshop

Verwende getrennte Kopien von `multiplayer-v2618-coop-host` und `multiplayer-v2618-coop-client`. Beide Projekte teilen Szenen-, Objekt- und Skriptidentitäten und bieten zwei Spielerplätze. Weitere Clients erzeugen keine weiteren Figuren. Das optionale Netzwerkpaket ist enthalten; Berechtigung und automatischer Start sind zunächst ausgeschaltet. Offline-Projekte benötigen keinen Netzwerkdienst.

## Verbinden und spielen

Öffne Host und Client in getrennten Editor-Fenstern desselben Browser-Ursprungs. Beide Fenster müssen weiter rendern; Browser können Aktualisierungen in Hintergrund-Tabs aussetzen. Wähle Network Studio → Session, erteile in beiden Projekten ausdrücklich die Berechtigung und behalte Local lobby sowie denselben Sitzungsnamen. Verbinde zuerst Host, dann Client. Jede Peer-Liste muss die andere Spieleridentität zeigen. Der lokale Kanal benötigt dasselbe Gerät, denselben Ursprung und dieselbe Browser-Speicherpartition; verschiedene Browserprofile bilden keine Internet-Sitzung.

Starte Play in beiden Projekten. Fokussiere die Host-Spielfläche und verwende WASD oder Pfeiltasten: Host Player bewegt sich. Auf Client fordert der begrenzte RPC `coop.move` die Bewegung von Client Player beim Host an; dessen Zustand wird an beide Spieler übertragen. Stop stellt den bearbeiteten Ausgangszustand wieder her. Bei fehlender Bewegung prüfe Play, Tastaturfokus, Berechtigung, Verbindung, Peer-Aufnahme, RPC-Vertrag und Skriptfehler. Eine Verbindung allein startet kein Spiel.

## Autorität und Felder

Server-Autorität lässt Host/Server den replizierten Zustand berechnen. Owner-Autorität weist ihn einer benannten Peer-ID zu; ein leeres Feld erlaubt keine beliebige Übernahme. Wähle ein Objekt, füge es unter Replication hinzu und trage bei Owner eine aufgenommene Peer-ID ein. Orchestration → Authority transfer überträgt die vorhandene Zuordnung ausdrücklich. Kontrolliere beide Peer-Diagnosen. Eine vom Host weitergeleitete Momentaufnahme darf den lokalen Eigentümer nicht überschreiben. Das mitgelieferte Koop-Spiel bleibt serverautoritativ, da seine Skripte den Host um Simulation bitten.

Transform, Rotation und Velocity sind getrennte Auswahlfelder. Laufende Momentaufnahmen und spätes Beitreten beachten dieselbe Auswahl. Transform bezeichnet hier die Position; Skalierung, Aktivierung und Winkelgeschwindigkeit sind keine zusätzlichen laufenden Replikationsfelder. Manuelle Multiplayer-Spielstände speichern absichtlich mehr Zustand. Interpolate glättet erlaubte entfernte Felder. Predict verwendet aufgezeichnete Transformationsdifferenzen und führt weder Physik noch Skripte erneut aus. Übergeordnete Welttransformationen werden vor ihren Kindern angewandt.

## Bearbeiten und wiederherstellen

Protocol zeigt Kanalnamen, geordnete zuverlässige oder sequenzierte Übertragung, Nutzlastbytes, Rate und Priorität. RPC-Karten zeigen Richtung, Autorität, Schema, Größe und Aufrufrate. Ein Object-Schema prüft nicht automatisch jedes Spielfeld: validiere eigene Nutzlasten im Spielcode. RPCs müssen ihren festgelegten Kanal benutzen. Im laufenden Spiel hinzugefügte oder entfernte Verträge aktualisieren die Spielanbindung beim Produktionstakt.

Zahlen werden beim Verlassen des Feldes übernommen. Gib einen ungültigen Wert ein und korrigiere ihn: zuerst bleibt der gespeicherte Wert mit Fehlermeldung erhalten, danach muss der gültige Wert gelten. Prüfe Undo/Redo und Speichern/erneutes Öffnen. Änderungen an Sitzungsidentität, Transport, Authentifizierung oder Kanalidentität beenden die alte Verbindung; anschließend Reconnect verwenden. Eigentümer- und Feldauswahl bleiben live. Wiederverbinden stellt Aufnahme und Ausgangszustand her, keine beliebige Anwendungshistorie.

Trenne Client, bewege Host und verbinde Client erneut. Prüfe aktuellen Zustand und Late-join-Zähler. Fehlerhafte Eigentümer, Metadaten, Prüfsummen oder Grenzen dürfen keine teilweise Weltänderung erzeugen. Ausgeschöpfte zuverlässige Zustellung entfernt Peer-Warteschlangen und meldet den Fehler. Alte Epochen dürfen innerhalb des verfolgten Verbindungslebenszyklus nicht zurückkehren. Prüfsummen ersetzen keine geprüfte Authentifizierung.

## Diagnose und Export

Simulation bietet Latenz, Jitter, Verlust, Duplikate, Umordnung und Seed. Prüfe zuerst eine saubere Verbindung, danach mäßige Störungen sowie ACKs, Wiederholungen, Ablehnungen und begrenzte Historie. Bei Duplikatsimulation ist eine Duplikatablehnung zu erwarten. Seitenzähler beziehen sich auf den zuletzt adressierten Peer; zurückgestellte Objekte folgen in späteren Snapshot-Intervallen.

Instanz-Logs zeigen vom Editor beobachtete Ereignisse; Inspector zeigt Prozessidentität und Status. Spielzustand und Netzwerkereignisse werden im laufenden Spieler geprüft. Das ist kein nativer Ferndebugger und keine vollständige Standardausgabe des Kindprozesses. Diagnoseexporte vor dem Teilen auf sensible Inhalte prüfen.

Aktiviere vor dem Export ausdrücklich Berechtigung und automatischen Spielstart und teste die tatsächlichen Spieler zusammen. Lokale Browser-Sitzungen benötigen den gleichen unterstützten Ursprung/Speicherkontext. Bei direktem Windows-UDP verbindet sich jeder Client mit dem Host-Port und verwendet einen eigenen Bind-Port. Die separate Serverreferenz exportiert einen Windows-Spieler mit deaktiviertem Renderer und WebView. Sie ist kein fensterloser Rust-Server. Architektur und erforderliche Paritätsprüfungen stehen in NATIVE_SERVER_ARCHITECTURE_26_18.md.

## Grenzen und eigene Abnahme

Transformationswiederholung setzt Solverkontakte, Rhai-Speicher, Objektlebenszeiten, Audio, UI, Dateien, Plugins und externe Dienste nicht zurück. Beliebige Spielframes erneut auszuführen würde Effekte duplizieren. Öffentliche Vermittlungs-, Relay- und Authentifizierungsdienste benötigen ausdrücklich konfigurierte geprüfte Anbieter und eigene Infrastrukturtests.

Dokumentiere zwei bewegte Spieler, Eigentümeränderung, Trennen/Wiederverbinden, spätes Beitreten, ungültige/gültige Bearbeitung, Undo/Redo, Speichern/Öffnen und die tatsächlichen Client-/Serverexporte samt Logs. Vergleiche Code-, Block- und Mischreferenz: dieselbe Quelle muss dieselbe Spielhandlung ausführen. Generierte Dateien und isolierte Tests allein belegen keinen Benutzerablauf.
