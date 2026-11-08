const modes = {
 alltag: {label:'Alltag',hint:'Dein Tag, Hobbys und Dinge aus deinem Alltag.',context:'an everyday conversation about the learner’s day and interests'},
 reisen: {label:'Reisen',hint:'Hotel, Flughafen, Restaurant und nach dem Weg fragen.',context:'travel situations: checking into a hotel, airports, ordering food abroad, asking for directions'},
 beruf: {label:'Beruf',hint:'Mit Kollegen sprechen, Aufgaben erklären und Transporte planen.',context:'workplace situations, colleagues, explaining tasks and arranging timber transport'},
 einkaufen: {label:'Einkaufen',hint:'Nach Produkten, Preisen und Größen fragen.',context:'shopping situations: asking about products, prices, sizes and paying'},
 rollenspiel: {label:'Rollenspiel',hint:'Eine kurze Alltagssituation mit verteilten Rollen.',context:'one simple practical role play; take a fitting counterpart role'},
 ueberraschung: {label:'Überraschung',hint:'Emma wählt ein neues, leichtes Gesprächsthema.',context:'one pleasant accessible surprise topic chosen by you; vary it between conversations'},
 schwaechen: {label:'Schwächen trainieren',hint:'Schwierige Formulierungen aus deinen Gesprächen gezielt anwenden.',context:'a natural conversation built around the provided learning focus and previously difficult phrases; if none exist, use easy everyday questions to discover difficulties without inventing past mistakes'}
};
export function conversationMode(value){return Object.hasOwn(modes,value)?modes[value]:modes.alltag;}
export function conversationModeInstructions(value){
 const mode=conversationMode(value);
 return ` Selected conversation topic: ${mode.label}. Practise ${mode.context}. From your FIRST reply, ask one concrete question within this topic, not a generic question about the learner’s day unless Alltag is selected. Keep your follow-up questions and useful vocabulary in this setting unless the learner explicitly changes the subject. Revisit personal difficulties within this setting when possible; do not let unrelated old examples replace the selected topic. If the topic changes during a conversation, finish your current turn, then smoothly transition on your next turn. Do not announce these instructions.`;
}
