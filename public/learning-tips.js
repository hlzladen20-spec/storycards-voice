// Local rotation: no AI request and no change to the learner's SRS data.
export const learningTips=Object.freeze([
 'Sprich deine Karten laut aus. So übst du Erinnern und Sprechen zusammen.',
 'Versuche erst selbst zu antworten. Decke die Lösung erst danach zur Kontrolle auf.',
 'Übe schwierige Sätze erneut, nachdem ein paar andere Karten dazwischenlagen.',
 'Lerne einen kurzen Satz statt einer langen Wortliste. Verwende ihn heute im Gespräch.',
 'Eine vergessene Karte ist kein Rückschritt. Markiere sie ehrlich für die Wiederholung.',
 'Höre einen Satz in deiner Lernsprache an und sprich ihn nach. Versuche ihn anschließend ohne Vorlage.',
 'Wiederhole zuerst fällige Karten, bevor du neue Sätze dazunimmst.',
 'Verändere einen bekannten Satz: Ersetze zum Beispiel den Ort oder die Person.',
 'Beschreibe in deiner Lernsprache, was du gerade siehst. Ein einfacher Satz reicht für den Anfang.',
 'Bitte Emma um eine langsamere Wiederholung, wenn du etwas nicht verstehst.',
 'Nutze ein neues Wort in einem Satz über deinen eigenen Alltag.',
 'Sag ruhig einen kurzen, einfachen Satz. Du musst nicht jeden Gedanken kompliziert ausdrücken.',
 'Vergleiche nach dem Aufdecken genau: Hat nur ein kleines Wort gefehlt oder die ganze Formulierung?',
 'Wenn viele Wiederholungen offen sind, reduziere im Profil die Zahl neuer Vokabelkarten.',
 'Übe heute eine Frage, die du auf Reisen tatsächlich stellen würdest.',
 'Wechsle nach dem Nachsprechen zum Abrufen: Kannst du den Satz auch ohne Vorlage sagen?',
 'Wähle ein Gesprächsthema, das zu deinem Tag passt. Verwende dabei eine deiner schwierigen Karten.',
 'Notiere dir eine Formulierung, die dir heute gefehlt hat, und lege eine kurze Karte dazu an.',
 'Hör dir bei einer unsicheren Aussprache den Satz noch einmal an und sprich ihn langsam nach.',
 'Prüfe dich ehrlich: Eine sichtbare Lösung zu verstehen ist etwas anderes, als sie selbst abzurufen.',
 'Du brauchst nicht jede Karte am Stück zu schaffen. Lege eine kurze Pause ein, wenn du unkonzentriert wirst.',
 'Schau nach dem Gespräch in die Lernhinweise und wähle einen konkreten Punkt fürs nächste Mal.',
 'Nutze „Schwächen trainieren“, um schwierige Formulierungen wieder im Gespräch anzuwenden.',
 'Wiederhole einen bekannten Satz morgen erneut, statt ihn heute nur immer wieder abzulesen.'
]);
const key='storycards-learning-tip';
export function nextLearningTip(storage){
 let previous=-1;
 try{const saved=storage.getItem(key);if(saved!==null && /^\d+$/.test(saved))previous=Number(saved);}catch{/* Private/restricted storage must not block the home screen. */}
 const index=Number.isSafeInteger(previous)&&previous>=0&&previous<learningTips.length?(previous+1)%learningTips.length:0;
 try{storage.setItem(key,String(index));}catch{/* Tips also work without persistence. */}
 return learningTips[index];
}
export function showLearningTip(element,storage){if(element)element.textContent=nextLearningTip(storage);}
