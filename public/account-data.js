export function isLearningKey(key) {
  return /^(storycards:(?:[a-z]{2}):(?:[a-z]{2}):(?:cards|profile|stats|lesson)|storycards-(?:daily-limit|speaking-minutes|active-language))$/.test(key);
}
export function validateSnapshot(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Ungültige Sicherung.');
  if (JSON.stringify(data).length > 4000000) throw new Error('Die Sicherung ist zu groß. Bitte kontaktiere den Support.');
  for (const [key,value] of Object.entries(data)) {
    if (!isLearningKey(key) || typeof value !== 'string') throw new Error('Ungültige Lerndaten in der Sicherung.');
    if (key.endsWith(':cards')) {
      const cards=JSON.parse(value);
      if (!Array.isArray(cards) || cards.some(c=>!c || typeof c.id!=='string' || typeof c.front!=='string' || typeof c.back!=='string')) throw new Error('Ungültige Karten in der Sicherung.');
    } else if (/:(profile|stats|lesson)$/.test(key)) {
      const parsed=JSON.parse(value);
      if (!parsed || typeof parsed!=='object' || Array.isArray(parsed)) throw new Error('Ungültiger Lernstand.');
    } else if (key==='storycards-active-language' && !/^[a-z]{2}$/.test(value)) throw new Error('Ungültige Sprache.');
    else if (/storycards-(daily-limit|speaking-minutes)$/.test(key) && (!Number.isFinite(Number(value)) || Number(value)<1 || Number(value)>100)) throw new Error('Ungültiges Lernziel.');
  }
  return data;
}
export function createAccountStorage(raw, userId, changed=()=>{}) {
  if (userId && !/^[0-9a-f-]{36}$/i.test(userId)) throw new Error('Ungültiges Konto.');
  const prefix=userId ? `storycards-user:${userId}:` : '';
  const name=key=>prefix+key;
  function snapshot() {
    const data={};
    for(let i=0;i<raw.length;i++) {
      const key=raw.key(i);
      if (!key?.startsWith(prefix)) continue;
      const original=key.slice(prefix.length);
      if (isLearningKey(original) && raw.getItem(key)!=='') data[original]=raw.getItem(key);
    }
    return validateSnapshot(data);
  }
  function replace(data) {
    validateSnapshot(data);
    const previous=snapshot();
    // Snapshot is validated before any local data changes. Empty strings also
    // persist deletions through the Windows bridge, which observes setItem.
    for(const key of Object.keys(previous)) if (!(key in data)) raw.setItem(name(key),'');
    for(const [key,value] of Object.entries(data)) raw.setItem(name(key),value);
  }
  return {
    getItem:key=>raw.getItem(name(key)) || null,
    setItem(key,value) { raw.setItem(name(key),value); if(isLearningKey(key)) changed(); },
    snapshot,replace
  };
}
export function guestSnapshot(raw) {
  const store=createAccountStorage(raw,null);
  const data=store.snapshot();
  for(const [old,name] of [['storycards','cards'],['storycards-learning-profile','profile'],['storycards-learning-stats','stats'],['storycards-daily-lesson','lesson']]) {
    const key=`storycards:de:en:${name}`;
    if (!(key in data) && raw.getItem(old)) data[key]=raw.getItem(old);
  }
  return validateSnapshot(data);
}
