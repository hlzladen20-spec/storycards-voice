const messages = document.getElementById('messages');
const cache = new Map();
function prepare(message) {
  if (message.dataset.wordsReady) return;
  message.dataset.wordsReady = 'true';
  let bubble = message.classList.contains('coach') ? message.querySelector(':scope > span') : message;
  if (!bubble) return;
  if (bubble === message) { bubble = document.createElement('span'); bubble.textContent = message.textContent; message.replaceChildren(bubble); }
  const sentence = bubble.textContent;
  message.dataset.sentence = sentence;
  const fragment = document.createDocumentFragment();
  for (const part of sentence.split(/([\p{L}]+(?:['’][\p{L}]+)*)/u)) {
    if (/^\p{L}/u.test(part)) { const word = document.createElement('button'); word.type = 'button'; word.className = 'chat-word'; word.textContent = part; word.setAttribute('aria-label', `${part} übersetzen`); fragment.append(word); }
    else fragment.append(document.createTextNode(part));
  }
  bubble.replaceChildren(fragment);
}
messages.querySelectorAll('.message').forEach(prepare);
new MutationObserver(() => messages.querySelectorAll('.message').forEach(prepare)).observe(messages,{childList:true});
messages.addEventListener('click', async (event) => {
  const word = event.target.closest('.chat-word'); if (!word) return;
  const message = word.closest('.message');
  let translation = message.querySelector('.word-translation');
  if (!translation) { translation = document.createElement('span'); translation.className = 'word-translation'; translation.setAttribute('role','status'); message.append(translation); }
  const selected = word.textContent, key = `${message.dataset.sentence}|${selected}`;
  translation.dataset.selected = key;
  translation.textContent = `${selected} → wird übersetzt …`;
  try {
    let meaning = cache.get(key);
    if (!meaning) { const response = await fetch('/api/translate-word',{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(20000),body:JSON.stringify({word:selected,sentence:message.dataset.sentence})}); const data = await response.json(); if (!response.ok || typeof data.translation !== 'string' || !data.translation.trim()) throw new Error(); meaning = data.translation; cache.set(key,meaning); }
    if (translation.dataset.selected === key) translation.textContent = `${selected} → ${meaning}`;
  } catch { if (translation.dataset.selected === key) translation.textContent = 'Übersetzung gerade nicht verfügbar. Tippe das Wort erneut an.'; }
});
