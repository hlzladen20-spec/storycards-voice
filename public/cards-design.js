// Presentation only: progress always follows the actual lesson state.
const panel = document.getElementById('cards');
const card = document.getElementById('card');
const feedback = document.getElementById('voiceFeedback');
feedback.setAttribute('role', 'status');
feedback.setAttribute('aria-live', 'polite');
const progressText = panel.querySelector(':scope > .speak-prompt:not(#speakPrompt)');
const progress = document.createElement('div');
progress.className = 'cards-progress';
progress.innerHTML = '<div class="cards-progress-track" role="progressbar" aria-label="Lernfortschritt" aria-valuemin="0"><div class="cards-progress-fill"></div></div><span class="cards-progress-count"></span>';
panel.insertBefore(progress, card);
// Keep one stable outer box. Rendering a new sentence replaces #card's contents,
// but must never remove the feedback element or the recording event handlers.
const returnToConversation = document.getElementById('backToPractice');
returnToConversation.className = 'ghost card-return-button';
returnToConversation.textContent = '← Zurück zum Gespräch';
panel.insertBefore(returnToConversation, panel.querySelector('h2'));
const stage = document.createElement('div');
stage.className = 'cards-stage';
panel.insertBefore(stage, card);
stage.append(card, document.getElementById('speakPrompt'), feedback);
const controls = document.createElement('div');
controls.className = 'cards-controls';
controls.setAttribute('aria-label', 'Kartensteuerung');
panel.insertBefore(controls, panel.querySelector('.cards-nav'));
for (const id of ['revealButton', 'ratingButtons', 'finishLessonButton', 'repeatPracticeButton', 'recordAnswerButton']) {
  const control = document.getElementById(id);
  if (control) controls.append(control);
}
const nav = panel.querySelector('.cards-nav');
if (nav && window.ResizeObserver) new ResizeObserver(() => {
  const height = nav.getBoundingClientRect().height;
  if (height) document.documentElement.style.setProperty('--cards-nav-height', height + 'px');
}).observe(nav);
const daily = document.getElementById('dailyPracticeButton');
const free = document.getElementById('freePracticeButton');
function update() {
  const text = progressText?.textContent || '';
  const match = text.match(/(\d+) von (\d+)/);
  const current = match ? Number(match[1]) : 0;
  const total = match ? Number(match[2]) : 0;
  const practice = text.startsWith('Freies Üben');
  panel.querySelector('h2').textContent = text.startsWith('Schwierige Karten') ? 'Deine Wiederholung' : practice ? 'Freies Üben' : 'Deine Tageslektion';
  progress.querySelector('.cards-progress-count').textContent = `${current} / ${total}`;
  progress.querySelector('.cards-progress-fill').style.width = `${total ? Math.min(100,current / total * 100) : 0}%`;
  const track = progress.querySelector('[role=progressbar]');
  track.setAttribute('aria-valuemax', String(total));
  track.setAttribute('aria-valuenow', String(current));
}
if (progressText) new MutationObserver(update).observe(progressText, {childList:true,characterData:true,subtree:true});
update();
function separateFlag() {
  const cue = card.querySelector(':scope > span:not(.back)');
  if (!cue || cue.dataset.designed) return;
  const text = cue.textContent;
  if (!text.startsWith('🇩🇪')) return;
  cue.dataset.designed = 'yes';
  const flag = document.createElement('span');
  flag.className = 'card-language-flag';
  flag.textContent = '🇩🇪';
  flag.setAttribute('aria-hidden', 'true');
  cue.replaceChildren(flag, document.createTextNode(text.replace(/^🇩🇪\s*/, '')));
}
new MutationObserver(separateFlag).observe(card, {childList:true});
separateFlag();
