// Keep progress isolated per language pair. Legacy data belongs to German → English.
import {LANGUAGE_COURSES} from './language-courses.js';
export {LANGUAGE_COURSES} from './language-courses.js';
const LEGACY_KEYS = Object.freeze({
  cards:'storycards',
  profile:'storycards-learning-profile',
  stats:'storycards-learning-stats',
  lesson:'storycards-daily-lesson',
  vocabulary:null
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
    if (raw === null && source === 'de' && target === 'en' && LEGACY_KEYS[name]) {
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
  return Object.hasOwn(LANGUAGE_COURSES,target) && LANGUAGE_COURSES[target].enabled ? LANGUAGE_COURSES[target] : LANGUAGE_COURSES.en;
}

export function showLanguageSettings(profile, course, {storage,isBusy=()=>false,onSwitch=()=>location.reload(),notice=async()=>{}}={}) {
  const area = document.createElement('div'); area.className = 'profile-card language-settings';
  area.style.marginTop = '14px';
  const label = document.createElement('strong'); label.textContent = 'Deine Lernsprache';
  const current = document.createElement('p'); current.textContent = `Deutsch → ${course.name}`;
  const explanation = document.createElement('p');
  explanation.textContent = 'Karten, Wiederholungen, Sprechzeit und Niveau bleiben pro Sprache getrennt. Spanisch und Französisch sind Beta-Versionen. Die Bedienung bleibt auf Deutsch.';
  explanation.style.fontSize = '.75rem'; explanation.style.lineHeight = '1.5';
  area.append(label,current,explanation);
  const choices=document.createElement('div');choices.className='language-course-choices';
  let switching=false;
  for(const item of Object.values(LANGUAGE_COURSES)){
    const button=document.createElement('button');button.type='button';button.className='secondary language-course-choice';
    button.textContent=`${item.flag} ${item.name}${item.beta?' · Beta':''}${item.target===course.target?' ✓':''}`;
    button.setAttribute('aria-pressed',String(item.target===course.target));
    button.onclick=async()=>{
      if(switching || item.target===course.target)return;
      if(isBusy()){await notice({title:'Zuerst abschließen',message:'Bitte beende das Gespräch, die Aufnahme oder die Auswertung, bevor du die Sprache wechselst. Offene Gespräche bitte zuerst auswerten.'});return;}
      switching=true;
      try{storage.setItem('storycards-active-language',item.target);window.speechSynthesis?.cancel();await onSwitch(item);}
      catch{switching=false;await notice({title:'Sprache nicht gewechselt',message:'Deine Auswahl konnte nicht gespeichert werden. Bitte versuche es erneut.'});}
    };
    choices.append(button);
  }
  area.append(choices);
  profile.insertBefore(area,profile.querySelector('.profile-card'));
}
