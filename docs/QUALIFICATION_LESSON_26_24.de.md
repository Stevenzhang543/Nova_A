# 26.24: Strukturierte Graphen und lesbarer Arbeitsbereich

Diese Lektion beschreibt den vorgesehenen Ablauf und die implementierten Verträge für 26.24. Entwicklungsprüfungen sind keine endgültige Freigabe. Maßgeblich sind der Umsetzungsstand und die Nachweise des eingefrorenen Quelltexts.

## Code und Graph

Öffnen Sie das Codebeispiel und erstellen Sie im Bereich Script ein Rhai-Skript. Benannte Funktionen gehören in den Modulbereich, break/continue in Schleifen. Arrays, Zuordnungen, Closures, dynamische Aufrufe, Verzweigungen, Schleifen, Fehlerbehandlung und Projektabhängigkeiten mit use behalten dieselben Parser- und Laufzeitgrenzen. Strukturierte Bereiche besitzen bearbeitbare Knoten. Alte Execute-Rhai-Bereiche bewahren Quelltext und gelten ausdrücklich nicht als strukturierte Abdeckung. Fehlerhafte Bereiche sperren die Konvertierung; Editor und ungespeicherter Entwurf bleiben geöffnet.

Schreiben Sie eine Funktion mit chinesischem Kommentar, wechseln Sie zum Graphen, benennen Sie eine Deklaration um und ändern Sie einen Literalwert. Prüfen Sie danach im Code Kommentare, Gültigkeitsbereiche und Referenzen. Machen Sie Änderungen rückgängig und wiederholen Sie sie; speichern, öffnen und exportieren Sie das Projekt ins Web. Eine neue Parameterreihenfolge verändert die Aufrufsemantik und passt Aufrufer nicht automatisch an. Unsichere Umbenennungen mit Verbrauchern in anderen Modulen müssen abgelehnt werden. Prüfen Sie Aufrufer vor Schnittstellenänderungen.

## Anordnung und feste Positionen

Knoten verwenden gemessene Abmessungen. Ein abgeschlossener manueller Zug fixiert die Position; Escape bricht ab, ohne sie zu fixieren. Über die Graphbefehle lassen sich ausgewählte Positionen fixieren oder lösen. Normales Anordnen lässt feste Positionen stehen und umgeht sie. Nur die ausdrücklich vollständige Neuanordnung einschließlich fixierter Knoten darf sie bewegen. Diese Metadaten betreffen die Editoransicht, nicht den erzeugten Rhai-Code. Ein Rückgängig-Schritt muss Position und Fixierung gemeinsam wiederherstellen.

Wechseln Sie mehrfach zwischen Script und Design und prüfen Sie Rastergröße, Auswahl und Graphzustand. Die vorhandene Zeichenfläche bleibt beim Bereichswechsel erhalten und wird beim Einblenden angepasst. Beim Schließen des Projekts müssen Ressourcen freigegeben werden. Kurze lokale Messungen beweisen weder Speicherleckfreiheit noch allgemeine Bildraten.

## Diagnose und Originaldetails

Englische, deutsche und chinesische Beschriftungen, Anschlüsse und Diagnoseanzeigen verwenden gemeinsame Quellen. Diagnosekennungen bleiben stabil. Deutsche und chinesische Erklärungen bieten aufklappbare Originaldetails mit unveränderten Bezeichnern, Positionen und Meldungen. Unbekannte Diagnosen bleiben im Original sichtbar. Schreiben Sie const broken; und versuchen Sie die Konvertierung: Der fehlende Anfangswert muss gemeldet werden, der Entwurf unverändert bleiben. Korrigieren Sie ihn vor dem Fortfahren.

## Untere Bereiche und Ressourcenlisten

Prüfen Sie alle unteren Register bei Breiten 1024, 1440 und 1920 sowie 100%/200% Oberflächenskalierung. Schmale Bereiche verwenden eine Registerauswahl; Vergrößern und Einklappen bleiben erreichbar. Die Ressourcenwerkzeugleiste erhält ihre vollständige Zeilenhöhe. Der Ressourcenbereich besitzt den Hauptscrollbereich. Bei 600 Testressourcen erhält ein innerer Abstandhalter die Gesamtlänge, während nur das nahe sichtbare Fenster aufgebaut wird. Erreichen Sie das letzte Element, wechseln Sie zur Liste, verlassen Sie Assets und kehren Sie nach einer Breitenänderung zurück: Alle Ressourcen müssen erhalten bleiben.

## Prüfungen und Grenzen

Führen Sie die neuen Prüfungen für Graphgleichwertigkeit, Übersetzungen, echte Graphbedienung, Diagnosen, Ressourcenfenster und untere Bereiche sowie die vorhandenen Syntax-, Typgraph-, Layout- und Freigabewerkzeugprüfungen aus. Die Gleichwertigkeitsprüfung erzwingt eine strukturelle Neuerzeugung und vergleicht Original und Ausgabe auf nativer und WASM-Laufzeit. Tabellen ersetzen keine Ausführung, Bildschirmbilder keine Maus- und Tastaturprüfung. Alle 21 Freigabestufen, eingefrorener Quelltext und elf unabhängig geprüfte Ausgabedateien bleiben Voraussetzungen.

Nur tatsächlich ausgeführte lokale Windows/Web-Prüfungen gelten als bestanden. Linux/macOS/iPhone/Android, echte ältere Rechner, Signierung, unabhängige Barrierefreiheits- und Sicherheitsprüfungen sowie ein echter 72-Stunden-Lauf benötigen passende Umgebungen. Die chinesische Kommentarabdeckung wird gesondert geprüft; Dateizahlen oder allgemeine automatisch erzeugte Sätze ersetzen keine inhaltliche Prüfung.
