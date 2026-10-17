# Animiertes Menü und synchronisierte Zwischensequenz produzieren

Diese Aufgabe verbindet Animation, Audio und Interface in einem gespeicherten Projekt. Beginnen Sie mit UI Showcase oder der aktuellen Menüreferenz. Arbeiten Sie in einer Kopie, behalten Sie importierte Originaldateien und speichern Sie vor größeren Änderungen. expected-output und test-controls der Referenz beschreiben die konkreten Aktionen; Ausführungsberichte belegen nur tatsächlich beobachtete Prüfungen.

## Menü und Übersetzungen

Wählen Sie in Interface den Canvas und seine RectTransform-Kinder. Prüfen Sie Referenzgröße, Skalierung, Anker, Mindest-/Maximalgröße, sicheren Bereich, Beschneidung, Scrollen und Textüberlauf in der wirklichen Vorschau. Fixed ignoriert responsive Breakpoints bewusst. Negative Innen-/Außenabstände werden mit Diagnose begrenzt; für Überlagerungen dienen vorzeichenbehaftete Positions-/Ankerwerte. Verdeckte Kinder und modale Hintergrundelemente dürfen nicht fokussierbar bleiben. Vergeben Sie verständliche Namen, Fokus- und Lesereihenfolge. Component-source-Metadaten erzeugen keinen UI-Unterbaum; verknüpfte Inhalte benötigen ein Prefab.

Öffnen Sie das Theme, setzen Sie bei Bedarf einen Elternwert und ändern Sie nur beabsichtigte Tokens/Stile. Ein Kind muss spätere Änderungen des Eltern-Themes weiter erben. Spacing ersetzt nicht automatisch jeden Panel-Abstand. Speichern Sie gültige Entwürfe; prüfen Sie anschließend, dass ungültiger Text beim Wechsel erhalten bleibt und gespeicherte Laufzeitwerte unverändert sind. Konflikte verlangen eine ausdrückliche Entscheidung. Ungültige Stile und doppelte Sprachzuordnung werden abgelehnt.

Verwenden Sie Lokalisierungsschlüssel und unterstützte Label-/Platzhalterbindungen. Ergänzen Sie EN/DE/ZH, Fallback-Sprache und passende Schriftdateien. Prüfen Sie lange Übersetzungen, Glyphen und Paketabhängigkeiten einschließlich rekursiver Fallbacks. CSV bewahrt Strings und Varianten; PO unterstützt gewöhnliche mehrzeilige Strings sowie Nova-Variantenmetadaten. Indizierte gettext-Plurale erfordern CSV. Geben Sie gemischten chinesischen/lateinischen Text per IME ein, ersetzen Sie eine Auswahl und navigieren Sie mit Tab. Enter während der Komposition darf keine Spielaktion auslösen. Editor-Schaltflächen dürfen keine Gameplay-Tasten weiterreichen.

## Clips, Kurven und Entwürfe

Wählen Sie ein Szenenobjekt und öffnen Sie Animation. Erstellen/wählen Sie einen Clip, ergänzen Sie Eigenschaftsspuren, Zielobjekte, Zeiten und Werte. Bearbeiten Sie Tangentenmodus, Interpolation und Easing am gewählten Schlüssel. Dope-/Kurvenansicht trennen Timing und Verlauf. Vergrößern Sie Asset-Struktur und Eigenschaften; Bereichsgrößen zurücksetzen stellt die Vorgaben wieder her. Sprite-Frames besitzen eigene Dauern. Befehle und Marker sind diskrete Seiteneffekte mit getrennten Ziel-/Payload-Feldern.

Änderungen im Entwurf aufzeichnen ergänzt Schlüssel ohne automatische Speicherung. Speichern Sie ausdrücklich. Nichtendliche oder ungültige Werte bleiben mit genauer Feldmeldung erhalten. Grenzen:100 Spuren und10.000 Schlüssel pro Spur; eine Ablehnung darf keinen halben neuen Datensatz hinterlassen. Clip, Controller, Maske, Rig, Skin und Timeline behalten ihre Entwürfe bei Asset-/Workspace-Wechsel und Save/Discard/Cancel beim Projektwechsel.

Speichern Sie vor Gespeichertes Asset abspielen. Die Vorschau besitzt eine eigene echte Spielsitzung. Pause und ausgewertete Laufzeit zeigen tatsächlich berechnete Posen. Springen löst keine übersprungenen Befehle aus. Vorschau stoppen und Szene wiederherstellen setzt Autorenwerte zurück; eine alte Vorschau darf eine später extern gestartete Sitzung nicht übernehmen. Laufzeitaufzeichnung überträgt die letzten Posen nach der Wiederherstellung in einen ungespeicherten Entwurf. Speichern und öffnen Sie ihn erneut.

## Controller und Rig

Prüfen Sie Parameter, Zustände, Bedingungen, Exit-Zeit, Überblenddauer, Zieloffset, Unterbrechung und Marker-/Normalzeit-Synchronisation. Testen Sie Grenzzeitpunkte und unterbrochene Übergänge. Masken, additive Ebenen,1D/2D-Blends und Synchronisation verwenden den Spiel-Evaluator. Gewicht null hält die Uhr nicht an, trägt aber keine Pose bei. Trigger dürfen keine unbeteiligte spätere Transition auslösen.

Prüfen Sie Knochenhierarchie, Ruhepose und Gewichte, danach IK, Constraints, Retargeting relativ zur Ruhepose und gespiegelte Bindungen. Ungültige Indizes/Zyklen und zu großer Aufwand benötigen Diagnosen. Root Motion Apply behält die absolute Abtastung der verfassten Root-Position und -Drehung bei. Ignore unterdrückt Position/Drehung der Wurzel, nicht ihre Skalierung. Akkumulierte Bewegung wird ausdrücklich über animationRootMotionDelta/applyAnimationRootMotion angewendet; vorhandene Szenen wechseln nicht stillschweigend zur Delta-Bewegung. Testen Sie Schleifen und Rückwärtssprünge. Kurvenschnitte können begrenzt linear gebacken werden: Stichprobentoleranz1e-6, keine symbolische Identitätsgarantie; zu aufwendige Daten werden abgelehnt.

## Gemeinsame Timeline für Ton und Untertitel

Binden Sie Spuren an die richtigen Objekte/Assets. Setzen Sie Anfang, Dauer, Quelloffset, Rate und Lautstärkehüllkurve. Prüfen Sie verwendete Sichtbarkeits-, Animations-, Audio-, verschachtelte Timeline-, Befehls- und Untertitelspuren. Verknüpfen Sie Skip über die sichtbare Referenzaktion mit dem richtigen Timeline-Ziel. Springen rekonstruiert Pose/Untertitel und überspringt Seiteneffekte. Überlappende Audioclips benötigen eigene Stimmen; verschachtelte Raten müssen auch Audio erreichen.

Wählen Sie im Audio-Bereich Clip und Vorhör-Bus. Prüfen Sie Ausgangsbus, Sends, Tief-/Hochpass, Kompressor, Delay und Reverb. Vorhören besitzt einen eigenen Spiel-Mixer; sein Stop darf fremde Stimmen nicht stoppen. Loop-/Trim-/Wellenformänderungen bleiben ausdrückliche Undo-Aktionen. Anzeigen sind RMS-/Sample-Spitzen-Schätzungen, keine BS.1770- oder True-Peak-Messung. Beobachten Sie Transportuhr, Sampleposition und Stimmen beim Pause/Sprung.

Die gemeinsame Medienuhr folgt ausgewerteten festen Simulationsschritten. Pause friert sie ein; Einzelschritt berechnet Pose/Sampleposition bei pausiertem Ton. Gepufferte Raten sind begrenzt. Streaming verwendet den Browsertransport und pausiert bei nicht unterstützten Raten mit Diagnose. Große Dateien benötigen Stream. Grenzen:64MiB residente PCM-Daten,32MiB pro Clip,16 parallele Decodes. Gerätelatenz und Streaming-Erholung benötigen echte Hardware.

## Exaktes Projekt prüfen und exportieren

Spielen Sie Menü und Sequenz vollständig: Musik, Untertitelgrenzen, Pause/Fortsetzen, Vor-/Rückwärtssprung, Schleife, Ende und Skip. Nach Stop und erneutem Start müssen Stimmen, Listener, Vorschau und native Texteingabe sauber freigegeben sein. Prüfen Sie schmale Bereiche, beide Themes, drei Sprachen und100/150/200% Skalierung; Touch-Abbruch, Tastatur und IME getrennt.

Speichern Sie, laden Sie die Anwendung neu und öffnen Sie die heruntergeladene Datei über Open. Wiederholen Sie dieselbe Folge. Exportieren Sie das vollständige Web-ZIP, stellen Sie es per HTTP bereit und prüfen Sie den Player. Native Prüfungen benötigen den tatsächlich qualifizierten Windows-Build. Sprache/Fonts/Audio, Untertitel, Fokus und Skip müssen erhalten bleiben. Behalten Sie Fehler und Artefakthashes. Determinismus-/Paketprüfungen ersetzen keine Beobachtung von Lautsprechern, Screenreadern, schwacher Hardware oder Langzeitbetrieb.


## Referenzaktionen binden und Speicherung prüfen

Wählen Sie einen Menü-Button und im Inspector Timeline-Aktion: Play, Pause, Skip oder Resume. Die ausdrücklichen Werte @timeline:play/pause/skip/resume verwenden den nächsten aktivierten TimelinePlayer am Button oder einem Elternobjekt. Ein gemeinsamer Player auf dem Canvas benötigt weder Script2D noch eine eingebettete Ziel-UUID. Custom callback stellt den vorherigen Skript-Callback wieder her. Die Referenz dauert30Sekunden, Arrival liegt bei20 und Introduction bei0. Pause hält die Position; Skip respektiert nicht überspringbare Clips; Resume startet am konfigurierten Marker.

Untertitel wie {caption.intro} verwenden zuerst die Clip-Sprache, dann die Canvas-Vorschausprache und danach die Projekt-Vorschausprache. Export enthält auch ausdrückliche Clip-Sprachen samt Fallbacks/Fonts. Mehr als64MiB Timeline-Quelltext werden mit Diagnose abgelehnt.

Der reale Menütest ändert den Deckkraftschlüssel von25 auf35, die Musiklautstärke von0,65 auf0,5 und den chinesischen Einführungstext, speichert, öffnet erneut und startet das heruntergeladene Web-ZIP. Die generierte Referenz bleibt der reproduzierbare Ausgangspunkt; der Evidenzdownload enthält die beobachteten Änderungen. Ein voller optionaler Browser-Wiederherstellungscache darf das externe Speichern nicht verhindern. Prüfen Sie bei Bedarf das Aufgabenprotokoll und behalten Sie die gespeicherte Projektdatei.
