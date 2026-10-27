# Kurze Tageslektion und KI-Merkszenen

## Verhalten der Testversion

- Die gewählte Tagesgrenze begrenzt unterschiedliche Lernziele. Fällige Wiederholungen zuerst, höchstens drei neue Karten. Bei einem großen Rückstand werden keine neuen ergänzt.
- Die Auswahl wird beim Start festgeschrieben. Neue Gespräche verlängern die laufende Tageslektion nicht. Die Auswahl und bereits erledigte Lernziele werden gespeichert.
- Neue Karten zuerst mit englischem Satz kennenlernen und nachsprechen. Anschließend nach anderen Aufgaben ohne englische Lösung und ohne Bild selbst abrufen.
- Maximal ein zusätzlicher Wiederholungsversuch pro schwierigem Lernziel, höchstens drei zusätzliche Versuche pro Runde. Fehler und aufgedeckte Antworten bleiben im langfristigen FSRS-Plan früher fällig.
- Ohne Antwort oder Aufdecken zählt bloßes Weiterklicken nicht als erledigtes Lernziel. Aufgedeckte Antworten zählen nicht als selbstständig gewusst.
- Sehr lange bestehende Gesprächsausschnitte bleiben erhalten, werden aber nicht in die kurze Tageslektion aufgenommen. Unter Frei üben bleiben alle Karten erreichbar.
- Neue Gesprächskarten werden auf eine kurze, wiederverwendbare Formulierung pro Karte fokussiert. Es werden 1 bis 6 ausgewählte Karten angefordert statt langer Textsammlungen. Das benötigt weiterhin eine Live-Qualitätsprüfung mit echten Gesprächen.
- Frei üben bleibt unabhängig und verändert keine regulären Lernabstände.

## Bilder

Vier einmalig mit dem integrierten Imagegen-Werkzeug erzeugte, visuell geprüfte Illustrationen werden lokal mit der App ausgeliefert. Es gibt in dieser Version keine automatische kostenpflichtige Bild-API-Anfrage pro Nutzer oder Karte. Die Auswahl erfolgt konservativ über passende Motive. Bei abstrakten oder nicht unterstützten Formulierungen wird kein beliebiges Bild eingesetzt.

Dateien im Projekt unter `public/learning-images/`: `workshop-v1.png`, `restaurant-v1.png`, `travel-v1.png`, `shopping-v1.png`.

Die Bilder erscheinen nur beim Kennenlernen oder Aufdecken, nicht beim unabhängigen Erinnern. Sie sind im Profil über „Bilder als Merkhilfe verwenden“ abschaltbar. Die Einstellung wird auch im Nutzerkonto synchronisiert.

## Verwendeter Prompt-Satz

Für jedes der vier Motive wurde genau eine integrierte Bildgenerierung ausgeführt, keine CLI/API-Ausweichlösung. Gemeinsame Spezifikation:

> Use case: scientific-educational. Asset type: reusable memory-aid illustration for adult language-learning flashcards in StoryCards Voice. Subject: [SUBJECT]. Style: calm friendly editorial illustration, simple legible shapes, soft warm cream background, muted emerald greens and natural warm accents, no childish mascot. Landscape 3:2 composition, central subject filling the frame, very few details, clear at small thumbnail size. No words, letters, captions, logos or watermark. Not an app screenshot. Create one finished illustration.

Die vier eingesetzten SUBJECT-Werte:

1. `a simple wooden workbench with a hand saw, hammer, a few wooden planks and a small handmade oak key rack, clearly recognizable woodworking workshop`
2. `a small restaurant table with a plate of pasta, a water glass and a waiter holding a plain unlettered menu, clearly recognizable ordering a meal`
3. `one suitcase beside an airplane window with an airplane visible at a distant airport, clearly recognizable air travel`
4. `a grocery shopping basket with bread, apples and milk, clearly recognizable buying groceries`

Die Merkszenen dienen als allgemeiner Kontext, nicht als exakte fotografische Wiedergabe jedes Satzes. Ob sie Lernenden helfen, muss in der Testphase geprüft werden. Ein wissenschaftlich garantierter Lernerfolg oder eine bestimmte Lerngeschwindigkeit wird nicht behauptet.
