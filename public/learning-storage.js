// Keep progress isolated per language pair. Legacy data belongs to German → English.
export const LANGUAGE_COURSES = Object.freeze({
  en: Object.freeze({name:'Englisch',source:'de',target:'en',locale:'en-GB',enabled:true}),
  es: Object.freeze({name:'Spanisch',source:'de',target:'es',locale:'es-ES',enabled:false}),
  fr: Object.freeze({name:'Französisch',source:'de',target:'fr',locale:'fr-FR',enabled:false})
});
const LEGACY_KEYS = Object.freeze({
  cards:'storycards',
  profile:'storycards-learning-profile',
  stats:'storycards-learning-stats',
  lesson:'storycards-daily-lesson'
});

export function createLearningStorage(storage, target = 'en', source = 'de') {
  if (!/^[a-z]{2}$/.test(target) || !/^[a-z]{2}$/.test(source)) throw new Error('Invalid language pair');
  const prefix = `storycards:${source}:${target}:`;
  function key(name) {
    if (!Object.hasOwn(LEGACY_KEYS,name)) throw new Error('Unknown learning data');
    return prefix + name;
  }
  function load(name, fallback) {
    let raw = storage.getItem(key(name));
    if (raw === null && source === 'de' && target === 'en') {
      raw = storage.getItem(LEGACY_KEYS[name]);
      if (raw !== null) {
        // Validate before migration. Never remove or overwrite the original data.
        JSON.parse(raw);
        storage.setItem(key(name), raw);
      }
    }
    return raw === null ? structuredClone(fallback) : JSON.parse(raw);
  }
  function save(name, value) { storage.setItem(key(name),JSON.stringify(value)); }
  return Object.freeze({source,target,load,save});
}

export function getActiveCourse(storage) {
  const target = storage.getItem('storycards-active-language') || 'en';
  // A course must pass language-specific tests before it can be activated.
  return LANGUAGE_COURSES[target]?.enabled ? LANGUAGE_COURSES[target] : LANGUAGE_COURSES.en;
}

export function showLanguageSettings(profile, course) {
  const area = document.createElement('div'); area.className = 'profile-card language-settings';
  area.style.marginTop = '14px';
  const label = document.createElement('strong'); label.textContent = 'Deine Lernsprache';
  const current = document.createElement('p'); current.textContent = `Deutsch → ${course.name}`;
  const explanation = document.createElement('p');
  explanation.textContent = 'Weitere Lernsprachen sind in Vorbereitung. Karten und Lernfortschritt bleiben pro Sprache getrennt.';
  explanation.style.fontSize = '.75rem'; explanation.style.lineHeight = '1.5';
  area.append(label,current,explanation);
  profile.insertBefore(area,profile.querySelector('.profile-card'));
}
