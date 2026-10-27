const motifs=[
  ['workshop',/\b(workshop|woodworking|workbench|hammer|handsaw|key rack)\b|\b(werkstatt|werkbank|schlüsselbrett|holzarbeiten)\b/i,'Merkszene: Holzwerkstatt'],
  ['restaurant',/\b(restaurant|waiter|pasta|menu)\b|\b(speisekarte|kellner|bestellen)\b/i,'Merkszene: Im Restaurant'],
  ['travel',/\b(airport|airplane|suitcase|luggage)\b|\b(flughafen|flugzeug|koffer|gepäck)\b/i,'Merkszene: Am Flughafen'],
  ['shopping',/\b(groceries|supermarket|shopping basket)\b|\b(supermarkt|einkaufskorb|lebensmittel)\b/i,'Merkszene: Lebensmittel einkaufen']
];
export function learningImage(card) {
  const text=`${card.front} ${card.back}`;
  const match=motifs.find(([,pattern])=>pattern.test(text));
  return match ? {src:`/learning-images/${match[0]}-v1.png`,alt:match[2]} : null;
}
export function appendLearningImage(container,card) {
  const image=learningImage(card);if(!image) return;
  const element=document.createElement('img');element.className='learning-memory-image';element.src=image.src;element.alt=image.alt;element.decoding='async';
  element.onerror=()=>element.remove();container.append(element);
}
