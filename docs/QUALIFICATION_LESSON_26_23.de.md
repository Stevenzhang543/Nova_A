# Nova_A 26.23: Arbeitsablauf

## Start und Entwürfe

Neu öffnet Name, Speicherort und alle vierzig Vorlagen. Abbrechen oder Escape stellt den Fokus wieder her und behält den Entwurf. Öffnen und Fortsetzen bleiben direkt sichtbar. Mehr enthält Import, Migration und Wiederherstellung. Ein abgebrochener Entwurf ist kein gespeichertes Projekt.

## Dynamische Skripte und Neuladen

Rhai unterstützt dynamische Werte, veränderbare Arrays und Maps, Closures und Funktionszeiger. Projektmodule verwenden literales use und einen gemeinsamen Namensraum. Native Import-Aliase und freie Auswertung sind gesperrt. Exportierte Konstanten unterstützen verschachtelte Arrays/Maps und null. Zuerst wird das betroffene Programmpaket geprüft, danach atomar ersetzt. Ein neuer ungültiger Auftrag verwirft den älteren wartenden Auftrag desselben Skripts. Bei Fehlern läuft das alte Programm weiter; kompatibler exportierter Zustand bleibt erhalten. Stop beendet die Rücknahmezuordnung der Sitzung. SCRIPTING_CONTRACT_26_23.md dokumentiert Grenzen und Berechtigungen.

## Anzeige und Bedienung

Skriptdetails sind breiter; lange Meldungen umbrechen. Watches zeigen Typen und begrenzte Momentaufnahmen, nicht sämtliche lokalen VM-Variablen. Getter, Prototypen und ausführbare Ausdrücke werden nicht ausgewertet. Tasks lösen besitzgebundene Rückrufe aus, keine beliebigen pausierten VM-Stacks. Menüs haben einen gepolsterten Mausweg mit kurzer Wartezeit. Zurückkehren verhindert Schließen; Escape stellt den Fokus wieder her. Dialogentwürfe bleiben bestehen. Abgewiesene Website-Aufrufe bleiben behebbare Meldungen.

## Web-Veröffentlichung und Prüfung

Das Web-ZIP vollständig auf einem statischen HTTP(S)-Server entpacken; Stammverzeichnis und Unterordner funktionieren. HOSTING.md erklärt MIME und Cache. Lokales Bearbeiten braucht keinen Anwendungsserver; Netzwerkdienste sind optional. Web erstellen → Web-ZIP herunterladen bleibt auch mit Ordnerausgabe verfügbar. Das Spiel mit sämtlichen Dateien über index.html ausliefern; file:// ist kein unterstützter Hostingweg.

Neu/Abbrechen/erneut öffnen, alle Vorlagen, Sprachen, Link per Tastatur, schnelle Menüwechsel, fehlerhaftes und repariertes Neuladen, Speichern/Öffnen sowie exportiertes Spiel prüfen. Leerlauf und Fortsetzen mit realer Zeit messen. Animationen und Spielqualität bleiben erhalten. Browserautomatisierung und simulierte native Aufrufe ersetzen keine Geräteprüfung. Linux, macOS, iPhone, alte PCs, Signierung und unabhängige Sicherheits-/Barrierefreiheitsprüfung bleiben getrennt nachzuweisen.
