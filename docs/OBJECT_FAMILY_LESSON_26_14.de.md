# Wiederverwendbare Gegnerfamilie

Einen gemeinsamen Gegner und eine abgeleitete Variante erstellen und die tatsächlichen Autoren von Eigenschaften und Rückrufen prüfen.

Blueprints bestimmen gemeinsame Komponenten; Event Sheets bestimmen deklarierte Ereignisse. Nur abweichende Instanzwerte ändern.

- Play vor der Bearbeitung stoppen.
- Script → Event Sheet öffnen und ein Rechteck erstellen oder ein vorhandenes Skriptobjekt wählen.

1. Im Objektablauf Prefab, gespeichertes Event Sheet und Object Blueprint erstellen. Den Blueprint Enemy Family nennen und speichern. Widersprüchliche Komponenten oder fehlende Vererbungsquellen verhindern das Speichern.

2. Einen untergeordneten Blueprint ableiten und Scout Enemy nennen. Prefab und Event Sheet geerbt lassen, speichern und die gespeicherte Vorlage instanziieren.

3. In Design die Script2D-Eigenschaften aktualisieren. Nur bei der neuen Instanz move_speed von 6 auf 9 ändern. Objekteigentum öffnen und Autorenwert mit geerbtem Standard vergleichen.

4. Unter Ereignisautoren den Rückrufautor öffnen. Die eindeutige Deklaration im tatsächlichen Quellasset wird ausgewählt. Mehrdeutige oder fehlerhafte Deklarationen werden gemeldet.

5. Im Referenzprojekt Kollisions- und Task-Rückrufe, das UI-Neustartsignal und ObjectPool2D prüfen. spawn_at verwendet den passenden Pool; despawn() gibt die ausführende Instanz in den Pool zurück. pool_spawn existiert nicht als eigener Befehl.

6. Play starten und pausieren. Im Laufzeitzustand ursprüngliche Autorenwerte mit aktuellen Eigenschaften, Abonnements und Timer-/Task-Warteschlangen vergleichen. Diese Ansicht verändert die VM nicht.

7. Pausiert eine gültige Logikänderung speichern. Alle betroffenen Skripte werden vor dem Austausch geprüft. Auch einen ungültigen Versuch prüfen: bisherige Laufzeit und ungespeicherter Quelltext bleiben erhalten.

8. Stoppen, eine Instanzänderung rückgängig machen und wiederholen, Projekt speichern und öffnen. Play und die geerbten Verweise sowie die absichtliche Überschreibung erneut prüfen.

Die Variante erbt ihre Komponenten; einzelne Überschreibungen und Laufzeitwerte bleiben unterscheidbar; Navigation führt zum tatsächlichen Autor; ungültige Änderungen ersetzen keinen funktionierenden Zustand.

Blueprints, Event Sheets, Prefab-Verweise und Instanzwerte werden gespeichert. Laufzeitbeobachtungen bleiben Momentaufnahmen.

Erstellen, Ableiten und Instanziieren verwenden den Verlauf. Ungültige Entwürfe bleiben bei Abbrechen und Arbeitsbereichswechsel erhalten. Eine extern geänderte Basis erzeugt einen sichtbaren Konflikt.

Felder besitzen sichtbare Beschriftungen. Tab navigiert im Dialog; Escape führt zu Speichern/Verwerfen/Abbrechen. Bei großer UI-Skalierung bleibt die Fußzeile erreichbar.

```rhai
@export(type="float") let move_speed = 6.0;
fn update(dt) { if input_pressed("Jump") { set_position(move_speed, 0.0); } }
```

reference-projects/projects/creator-v2614-enemy-family/project.nova öffnen. test-controls.json beschreibt Kollision, UI-Neustart, Pool-Wiederverwendung, pausiertes Neuladen und Speichern/Öffnen. Nur die Prüfberichte belegen ausgeführte Tests.
