# Nova_A 26.26 / 26.26.0

## 26.26 — Produktionsressourcen und lesbare Bibliotheken

Engine: **26.26.0** · Project Format 2/schema 29.

### Import und erneuter Import

Zuerst einen kleinen gültigen Stapel importieren. Sprite, Audio oder Schrift über die vorhandene Ressource ersetzen, damit die UUID stabil bleibt; eine neue Ressource besitzt eine eigene Identität. Ein fehlgeschlagener Stapel darf frühere Dateien nicht unbemerkt übernehmen. Rückgängig/Wiederholen und Speichern/Öffnen erhalten Identität und eigene Überschreibungen.

### Abhängigkeiten und Export

Vor Löschen oder Ersetzen Abhängigkeiten und Verbraucher prüfen. Fehlende Verweise mit der beabsichtigten vorhandenen Identität reparieren. Atlas und Variante nach Änderungen kontrollieren. Vor dem Neubau speichern; das heruntergeladene Paket mit den gespeicherten Ressourcen vergleichen. Eine lose Datei aktualisiert kein älteres Spielpaket.

### Bibliothek und Fenster

Raster/Liste dienen der Suche; Inspektor/Details zeigen vollständige Pfade, Herkunft und Importeinstellungen. Lange Namen müssen lesbar und Bedienelemente per Tastatur erreichbar bleiben. Große Sammlungen begrenzen gerenderte Zeilen; Messwerte gelten nur für die dokumentierte Last. Alle vierzig Vorlagen bleiben erhalten.

### Prüfungen und Grenzen

Während der Wiedergabe ersetzen, rückgängig machen, fehlende Verweise reparieren, verschobenes Projekt öffnen, Variante wählen, Atlas neu erstellen und exportieren. Audio und Schriften auf Zielgeräten prüfen. Offline-Bearbeitung bleibt möglich; gehostete Veröffentlichung braucht echte Dienste. Die Fensterübersicht trennt Quellzweige von tatsächlich bedienten Zuständen.

