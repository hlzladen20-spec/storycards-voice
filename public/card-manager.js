export function createManualCard(front, back, existing, now = Date.now()) {
  front = front.trim(); back = back.trim();
  if (!front || !back) throw new Error('Bitte den deutschen Satz und die englische Übersetzung ausfüllen.');
  if (front.length > 1000 || back.length > 1000) throw new Error('Bitte höchstens 1.000 Zeichen pro Seite verwenden.');
  if (existing.some(card => card.front.trim().toLocaleLowerCase() === front.toLocaleLowerCase() && card.back.trim().toLocaleLowerCase() === back.toLocaleLowerCase())) throw new Error('Diese Karte ist bereits vorhanden.');
  return {id:crypto.randomUUID(),front,back,note:'',cueLanguage:'de',source:'manual',attempts:0,misses:0,knownStreak:0,nextReviewAt:now};
}

export function setupCardManager(getCards, setCards) {
  const section = document.createElement('details');
  section.className = 'card-manager profile-card';
  section.innerHTML = `<summary>Lernkarten verwalten <span class="manager-count"></span></summary>
    <p>Eigene Karten erstellen oder vorhandene Karten entfernen. Änderungen werden sofort gespeichert.</p>
    <form class="manager-form"><label>Deutscher Satz<textarea name="front" required maxlength="1000" rows="2" placeholder="Wie läuft dein Tag?"></textarea></label>
    <label>Englische Übersetzung<textarea name="back" required maxlength="1000" rows="2" placeholder="How is your day going?"></textarea></label>
    <button type="submit" class="primary">＋ Karte erstellen</button></form>
    <p class="manager-status" role="status" aria-live="polite"></p>
    <button type="button" class="secondary manager-undo hidden">Löschen rückgängig machen</button>
    <label class="manager-search-label">Karten suchen<input class="manager-search" type="search" placeholder="Deutschen oder englischen Satz suchen"></label>
    <div class="manager-list"></div>`;
  const profile = document.getElementById('profile');
  profile.insertBefore(section, document.getElementById('saveProfileButton')?.parentElement || profile.querySelector('nav'));
  const status = section.querySelector('.manager-status');
  const form = section.querySelector('form');
  const list = section.querySelector('.manager-list');
  const search = section.querySelector('.manager-search');
  const undo = section.querySelector('.manager-undo');
  let removed;
  function render() {
    const cards = getCards();
    section.querySelector('.manager-count').textContent = `(${cards.length})`;
    list.replaceChildren();
    const query = search.value.trim().toLocaleLowerCase();
    const matches = cards.filter(card => `${card.front} ${card.back}`.toLocaleLowerCase().includes(query));
    if (!matches.length) { const empty = document.createElement('p'); empty.textContent = cards.length ? 'Keine passenden Karten gefunden.' : 'Noch keine Karten vorhanden. Erstelle deine erste Karte oben.'; list.append(empty); }
    for (const card of matches) {
      const row = document.createElement('article'); row.className = 'manager-card';
      const german = document.createElement('strong'); german.textContent = `🇩🇪 ${card.front}`;
      const english = document.createElement('p'); english.textContent = `🇬🇧 ${card.back}`;
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'manager-delete'; remove.textContent = 'Karte entfernen';
      remove.setAttribute('aria-label', `Karte entfernen: ${card.front}`);
      remove.onclick = () => {
        remove.disabled = true;
        const confirmation = document.createElement('div'); confirmation.className = 'manager-confirm';
        const prompt = document.createElement('span'); prompt.textContent = 'Diese Karte wirklich entfernen?';
        const yes = document.createElement('button'); yes.type = 'button'; yes.textContent = 'Ja, entfernen'; yes.className = 'manager-delete';
        const no = document.createElement('button'); no.type = 'button'; no.textContent = 'Abbrechen'; no.className = 'secondary';
        no.onclick = () => { confirmation.remove(); remove.disabled = false; remove.focus(); };
        yes.onclick = () => {
          const current = getCards(); removed = {card, index:current.findIndex(item => item.id === card.id)};
          setCards(current.filter(item => item.id !== card.id)); render(); undo.classList.remove('hidden'); status.textContent = 'Karte entfernt. Du kannst das Löschen rückgängig machen.'; undo.focus();
        };
        confirmation.append(prompt,yes,no); row.append(confirmation); yes.focus();
      };
      row.append(german,english,remove); list.append(row);
    }
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    try {
      const card = createManualCard(form.elements.front.value, form.elements.back.value, getCards());
      setCards([...getCards(),card]); form.reset(); search.value = ''; render(); status.textContent = 'Karte gespeichert. Sie ist ab sofort in deiner Tageslektion und beim freien Üben verfügbar.';
    } catch(error) { status.textContent = error.message; }
  });
  undo.onclick = () => {
    if (!removed) return;
    const cards = [...getCards()];
    if (!cards.some(card => card.id === removed.card.id)) { cards.splice(Math.max(0,removed.index),0,removed.card); setCards(cards); }
    removed = null; undo.classList.add('hidden'); render(); status.textContent = 'Karte samt Lernstand wiederhergestellt.';
  };
  search.addEventListener('input',render);
  section.addEventListener('toggle', () => { if(section.open) render(); });
  new MutationObserver(() => { if (!profile.classList.contains('hidden')) render(); }).observe(profile,{attributes:true,attributeFilter:['class']});
  render();
}
