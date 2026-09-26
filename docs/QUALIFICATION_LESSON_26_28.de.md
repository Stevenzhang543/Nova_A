## 26.28 — Animation, Audio und lokalisierte Spieloberflächen

Engine: **26.28.0** · Project Format 2/schema 29. Öffnen Sie creator-v2628-animated-menu: Die Zeitleiste steuert Titelanimation, Musik und übersetzte Untertitel; Schaltflächen verwenden ausdrückliche @timeline-Aktionen. Bestehende Spiele, Standardanimationen und Qualitätseinstellungen bleiben erhalten.

Wählen Sie unter Animate das gespeicherte Asset, vergrößern Sie das untere Panel und wählen Sie eine Spur oder einen Kurvenschlüssel. Ändern Sie Schlüsselwert oder Musikpegel, speichern Sie den Asset-Entwurf und prüfen Sie Vorschau, Pause und Positionswechsel. Vorschau stoppen stellt den bearbeiteten Szenenzustand wieder her. Undo/Redo bearbeitet das Projekt; der Vorschau-Abspielkopf erzeugt keinen neuen Schlüssel. Prüfen Sie lange Bindungspfade. Speichern Sie das Projekt, öffnen Sie den Download erneut und prüfen Sie Werte und Untertitel.

Ein- und Ausblendgewichte verschachtelter Sequenzen multiplizieren den Beitrag ihrer Kindanimation und Audiospur. Positionswechsel und Rückwärtslauf verwenden dieselbe begrenzte lokale Zeit. Bildrate und Audio-Abtastrate bleiben getrennt. Mixeränderungen gehören zum Projekt; vorübergehende Vorschau- und Abhörsteuerungen dürfen sie nicht stillschweigend überschreiben.

Wählen Sie die Projektsprache in der UI-Lokalisierung und bearbeiten Sie die Übersetzungstabelle. Die Editorsprache ist unabhängig. Fehlende Übersetzungen verwenden den Rückfall auf die Ausgangssprache; eigene Bezeichner bleiben erhalten. Spieltext und zugängliche Beschreibungen müssen gemeinsam wechseln. Browser-Textlayout und verfügbare Schriftarten bestimmen die Zeichenabdeckung.

Öffnen Sie ein modales Fenster, während ein anderer Button den Fokus besitzt. Tastatur und Controller dürfen nur berechtigte Elemente bedienen. Deaktivierte oder versteckte Elemente dürfen nicht aktiv bleiben. Ein zweiter unbenutzter Controller darf gehaltene Navigation nicht zurücksetzen. Native Texteingabe bewahrt laufende IME-Komposition; deren Escape, Pfeiltasten und Enter gehören der Eingabemethode. Prüfen Sie RTL-Schieberegler mit Tastatur und Touch.

Exportieren Sie ein Web-ZIP, stellen Sie es über HTTP(S) bereit und prüfen Sie ausschließlich den exportierten Player: Start, Pause, Überspringen, Fortsetzen, Unicode-Eingabe und Untertitel. PCM-/DOM-Tests prüfen Semantik; Hörqualität, echte Controller, mobile IME und assistive Technik benötigen reale Geräte. Unveränderte Renderer- und Vorlagenmatrizen werden nicht erneut ausgeführt.
