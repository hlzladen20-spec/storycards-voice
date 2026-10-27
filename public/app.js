import { normaliseCards, prioritiseCards, rateCard } from "/cards.js";
import { setupCardManager } from "/card-manager.js";
import { createLearningStorage, getActiveCourse, showLanguageSettings } from "/learning-storage.js";
import { initCloudAccount } from "/cloud-account.js";
import { planDailyLesson, lessonQueue, retryAllowed, difficultCards } from "/lesson-planner.js";
import { appendLearningImage } from "/learning-images.js";
const bootNotice = document.createElement("p");
bootNotice.textContent = "Dein Lernstand wird geladen …";
bootNotice.setAttribute("role", "status");
document.querySelector(".app > header").after(bootNotice);
const account = await initCloudAccount(localStorage);
bootNotice.remove();
const appStorage = account.storage;
const activeCourse = getActiveCourse(appStorage);
const learningStorage = createLearningStorage(appStorage, activeCourse.target, activeCourse.source);

const $ = (id) => document.getElementById(id);
const startButton = $("startButton"), pauseButton = $("pauseButton"), finishButton = $("finishButton"), status = $("status"), messages = $("messages"), timer = $("timer");
timer.style.position = "relative";
let pc, dataChannel, stream, remoteAudio, interval, startedAt, transcript = [];
let timeExpired = false, responseActive = false, outputPlaying = false, finishingSession = false, finishAfterAudioTimer;
let cards = learningStorage.load("cards", []), queue = [];
let answerVisible = false;
let reviewHistory = [];
let freePractice = false;
let weakPractice = false;
let weakRoundTotal = 0;
let imageHintsEnabled = appStorage.getItem("storycards-image-hints") !== "off";
let repairingCards = false;
let repairFailed = false;
new MutationObserver(() => { if (queue[0] && queue[0].cueLanguage !== "de" && !repairingCards && !repairFailed) ensureGermanCards(); }).observe($("card"), { childList:true });
async function ensureGermanCards() {
  const pending = queue.filter((card) => card.cueLanguage !== "de");
  if (!pending.length || repairingCards) return;
  repairingCards = true;
  repairFailed = false;
  $("card").textContent = "Deutscher Übungssatz wird vorbereitet …";
  $("recordAnswerButton").disabled = true;
  $("revealButton").disabled = true;
  try {
    for (let offset = 0; offset < pending.length; offset += 15) {
      const batch = pending.slice(offset, offset + 15);
      const response = await fetch("/api/flashcards", { method:"POST", signal:AbortSignal.timeout(30000), headers:{"Content-Type":"application/json"}, body:JSON.stringify({ repairCards:batch.map((card) => ({ back:card.back })), transcript:[{ role:"learner", text:"Repair these cards by translating each English back into a complete German front." }] }) });
      const data = await response.json();
      if (!response.ok || !Array.isArray(data.cards) || data.cards.length !== batch.length || data.cards.some((card) => typeof card.front !== "string" || !card.front.trim())) throw new Error("Die deutschen Aufgaben konnten noch nicht erstellt werden. Bitte versuche es erneut.");
      batch.forEach((card, index) => { card.front = data.cards[index].front.trim(); card.cueLanguage = "de"; const stored = cards.find((item) => item.id === card.id); if (stored) { stored.front = card.front; stored.cueLanguage = "de"; } });
      saveCards();
    }
    queue = queue.map((item) => ({ ...item, ...(cards.find((card) => card.id === item.id) || {}) }));
    renderCard();
  } catch (error) {
    repairFailed = true;
    $("card").textContent = error.name === "TimeoutError" ? "Die Übersetzung dauert gerade zu lange. Bitte versuche es erneut." : "Der deutsche Satz konnte nicht geladen werden. Bitte versuche es erneut.";
    const retry = document.createElement("button"); retry.className = "secondary"; retry.textContent = "Erneut versuchen"; retry.addEventListener("click", ensureGermanCards); $("card").append(retry);
    $("recordAnswerButton").disabled = true;
  }
  finally { repairingCards = false; $("revealButton").disabled = repairFailed; }
}
const assessedCards = new Map();
const reviewNavigation = $("ratingButtons");
reviewNavigation.innerHTML = '<button id="previousCardButton" class="secondary">← Zurück</button><button id="nextCardButton" class="primary">Weiter →</button>';
function moveReviewCard(back = false) {
  if (reviewRecorder?.state === "recording" || $("recordAnswerButton").disabled) return;
  if(back) {
    if(!reviewHistory.length) return;
    const previous=reviewHistory.pop();
    if(queue[0]) queue.unshift(previous); else queue.push(previous);
  } else {
    const card=queue[0];if(!card) return;
    const result=assessedCards.get(card.id);
    const introduction=!freePractice && card.lessonStage==="introduce";
    if(!freePractice && !introduction && !result) {
      $("voiceFeedback").className="voice-feedback close";
      $("voiceFeedback").textContent="Versuche den Satz selbst zu sprechen oder decke die Antwort auf.";
      return;
    }
    queue.shift();reviewHistory.push(card);
    if(introduction) {
      const plan=dailyLesson();plan.introduced=[...new Set([...(plan.introduced||[]),card.id])];learningStorage.save("lesson",plan);
      assessedCards.delete(card.id);
      if(!(plan.completed||[]).includes(card.id) && !queue.some(item=>item.id===card.id && item.lessonStage==="recall")) queue.splice(Math.min(2,queue.length),0,{...card,lessonStage:"recall"});
    } else {
      if(!freePractice) {
        if(result==="assisted" && !card.retryPractice && !card.scheduleApplied) {card.scheduleApplied=true;cards=cards.map(c=>c.id===card.id?rateCard(c,"no"):c);saveCards();}
        if(!weakPractice) rememberDailyCard(card.id,result);
      }
      const plan=dailyLesson();
      if(!freePractice && !weakPractice && ["incorrect","assisted","close"].includes(result) && !card.retryPractice && retryAllowed(plan,card.id)) {
        plan.retryUsed=(plan.retryUsed||0)+1;plan.retriedIds=[...(plan.retriedIds||[]),card.id];learningStorage.save("lesson",plan);
        queue.splice(Math.min(2,queue.length),0,{...card,retryPractice:true,lessonStage:"recall"});
      }
    }
  }
  renderCard();
  if(!back && !queue.length) playLessonFanfare();
}
function playLessonFanfare() {
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    const context = new Audio();
    context.resume().then(() => {
      const start = context.currentTime + 0.03;
      [[523.25,0,.13],[659.25,.15,.13],[783.99,.3,.17],[1046.5,.5,.55]].forEach(([frequency,offset,duration]) => {
        const oscillator = context.createOscillator(), gain = context.createGain();
        oscillator.type = "triangle"; oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0,start + offset); gain.gain.linearRampToValueAtTime(.16,start + offset + .02); gain.gain.exponentialRampToValueAtTime(.001,start + offset + duration);
        oscillator.connect(gain); gain.connect(context.destination); oscillator.start(start + offset); oscillator.stop(start + offset + duration);
      });
      setTimeout(() => context.close().catch(() => {}), 1600);
    }).catch(() => context.close().catch(() => {}));
  } catch { /* Lesson completion must remain available when sound is unavailable. */ }
}
const finishLessonButton = document.createElement("button");
finishLessonButton.id = "finishLessonButton";
finishLessonButton.className = "primary hidden"; finishLessonButton.textContent = "Fertig";
reviewNavigation.after(finishLessonButton);
finishLessonButton.addEventListener("click", showHome);
new MutationObserver(() => {
  const complete = !queue.length;
  finishLessonButton.classList.toggle("hidden", !complete);
  reviewNavigation.style.setProperty("display", complete ? "none" : "grid", "important");
  reviewNavigation.style.setProperty("grid-template-columns", "minmax(0, 1fr) minmax(0, 1fr)");
  $("backToPractice").classList.toggle("hidden", complete);
}).observe($("card"), { childList:true });
$("previousCardButton").addEventListener("click", () => moveReviewCard(true));
$("nextCardButton").addEventListener("click", () => moveReviewCard());
new MutationObserver(() => {
  reviewNavigation.classList.remove("hidden");$("previousCardButton").disabled=!reviewHistory.length;$("nextCardButton").disabled=!queue[0];
  if(weakPractice) {
    lessonProgress.textContent=`Schwierige Karten · ${reviewHistory.length} von ${weakRoundTotal} Karten`;
    if(!queue.length && $("card").dataset.finished!=="weak") {
      $("card").dataset.finished="weak";
      const remaining=difficultCards(cards).length;
      $("card").innerHTML=`<strong>${weakRoundTotal?"🎉 Wiederholung geschafft!":"Keine schwierigen Karten offen"}</strong><small>${remaining?`${remaining} Karten sind noch unsicher. Du kannst später freiwillig weiterüben.`:"Die zuletzt geübten Karten sitzen. Wir erinnern dich zum nächsten Lerntermin wieder daran."}</small>`;
    }
    return;
  }
  if(freePractice) return;
  const plan=prepareDailyLesson();const total=plan.plannedIds.length;const count=(plan.completed||[]).filter(id=>plan.plannedIds.includes(id)).length;
  lessonProgress.textContent=`${count} von ${total} Lernzielen`;
  if(!queue[0] && !$("card").dataset.finished) {
    $("card").dataset.finished="yes";
    const correct=plan.plannedIds.filter(id=>plan.results?.[id]==="correct").length;
    $("card").innerHTML=`<strong>🎉 Für heute geschafft!</strong><small>${total?`${correct} Formulierungen selbstständig abgerufen. Schwierige Karten üben wir später wieder.`:"Heute gibt es keine weitere kurze Lernrunde. Deine gesamte Sammlung findest du unter Frei üben."}</small>`;
  } else if(queue[0]) delete $("card").dataset.finished;
}).observe($("card"),{childList:true});
let sessionWasEvaluated = false;
let isPaused = false, pausedAt = 0, pausedDuration = 0;
let emmaQuietTimer;
let emmaTalkTimer;
let emmaBlinkTimer;
let reviewRecorder, reviewStream, reviewChunks = [];
let answerHeld = false, answerStarting = false;
const answerButton = $("recordAnswerButton");
answerButton.style.touchAction = "none";
answerButton.style.userSelect = "none";
answerButton.addEventListener("click", (event) => { event.preventDefault(); event.stopImmediatePropagation(); }, true);
async function holdAnswer() { if (answerButton.disabled || answerStarting || reviewRecorder?.state === "recording") return; answerHeld = true; answerStarting = true; try { await recordAnswer(); } finally { answerStarting = false; } }
function releaseAnswer() { answerHeld = false; if (reviewRecorder?.state === "recording") reviewRecorder.stop(); }
answerButton.addEventListener("pointerdown", (event) => { if (event.button !== 0) return; event.preventDefault(); answerButton.setPointerCapture(event.pointerId); holdAnswer(); });
answerButton.addEventListener("pointerup", releaseAnswer);
answerButton.addEventListener("pointercancel", releaseAnswer);
answerButton.addEventListener("lostpointercapture", releaseAnswer);
answerButton.addEventListener("keydown", (event) => { if ([" ", "Enter"].includes(event.key)) { event.preventDefault(); if (!event.repeat) holdAnswer(); } });
answerButton.addEventListener("keyup", (event) => { if ([" ", "Enter"].includes(event.key)) { event.preventDefault(); releaseAnswer(); } });
window.addEventListener("blur", releaseAnswer);
new MutationObserver(() => { if (!answerButton.disabled && reviewRecorder?.state !== "recording" && !answerStarting && !answerButton.classList.contains("hidden") && answerButton.textContent !== "🎙 Zum Sprechen gedrückt halten") answerButton.textContent = "🎙 Zum Sprechen gedrückt halten"; }).observe(answerButton, { childList:true, attributes:true, attributeFilter:["class", "disabled"] });
let reviewAudioContext, reviewAnimation;
function stopReviewMeter() { cancelAnimationFrame(reviewAnimation); reviewAudioContext?.close().catch(() => {}); reviewAudioContext = null; $("recordAnswerButton").classList.remove("recording"); }
function startReviewMeter(inputStream) {
  const button = $("recordAnswerButton");
  button.classList.add("recording");
  button.innerHTML = '<span class="record-microphone" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/></svg></span><span class="record-wave" aria-hidden="true"></span><span>Loslassen zum Prüfen</span>';
  const wave = button.querySelector(".record-wave");
  for (let i = 0; i < 13; i++) wave.append(document.createElement("i"));
  try {
    reviewAudioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = reviewAudioContext.createAnalyser(); analyser.fftSize = 256;
    reviewAudioContext.createMediaStreamSource(inputStream).connect(analyser);
    const samples = new Uint8Array(analyser.frequencyBinCount);
    const bars = [...wave.children];
    function draw() { analyser.getByteFrequencyData(samples); bars.forEach((bar, i) => { const value = samples[2 + i * 3] / 255; bar.style.height = `${4 + value * 26}px`; }); reviewAnimation = requestAnimationFrame(draw); }
    reviewAudioContext.resume().catch(() => {}); draw();
  } catch { /* Recording remains available if audio visualisation is unsupported. */ }
}
let learningProfile = learningStorage.load("profile", {focus:[]});
let learningStats = learningStorage.load("stats", {conversations:0,minutes:0,practiceDays:[]});
let dailyCardLimit = Math.min(100, Math.max(1, Number(appStorage.getItem("storycards-daily-limit")) || 15));
let dailySpeakingMinutes = Math.min(60, Math.max(1, Number(appStorage.getItem("storycards-speaking-minutes")) || 10));
let sessionDurationSeconds = dailySpeakingMinutes * 60;
const speakingSettings = document.createElement("div");
speakingSettings.className = "profile-card";
speakingSettings.innerHTML = '<label for="dailySpeakingMinutes"><strong>Sprechminuten pro Tag</strong></label><p>Wie lange möchtest du täglich Englisch sprechen?</p><input id="dailySpeakingMinutes" type="number" min="1" max="60" step="1" style="width:100%;padding:10px;margin-top:8px;border:1px solid #d8e2dd;border-radius:10px;font:inherit"><p id="speakingMinutesSaved" role="status"></p>';
$("profile").insertBefore(speakingSettings, $("profile").querySelector(".profile-section-title"));
$("dailySpeakingMinutes").value = dailySpeakingMinutes;
function refreshSpeakingGoal() { document.querySelector(".home-card h2").textContent = `${dailySpeakingMinutes} Minuten`; if (!hasActiveConversation()) { sessionDurationSeconds = dailySpeakingMinutes * 60; $("timerText").textContent = `${String(dailySpeakingMinutes).padStart(2, "0")}:00`; } const total = `${String(sessionDurationSeconds / 60).padStart(2, "0")}:00`; timer.querySelector("small").textContent = `/ ${total}`; document.querySelector(".home-countdown small").textContent = `/ ${total}`; document.querySelector(".home-countdown strong").textContent = $("timerText").textContent; }
$("dailySpeakingMinutes").addEventListener("change", () => { dailySpeakingMinutes = Math.min(60, Math.max(1, Math.round(Number($("dailySpeakingMinutes").value) || 10))); $("dailySpeakingMinutes").value = dailySpeakingMinutes; appStorage.setItem("storycards-speaking-minutes", String(dailySpeakingMinutes)); refreshSpeakingGoal(); $("speakingMinutesSaved").textContent = hasActiveConversation() ? "Gespeichert – gilt ab dem nächsten Gespräch." : `Gespeichert: ${dailySpeakingMinutes} Minuten pro Tag.`; });
function localLearningDay() { const now = new Date(); return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`; }
function dailyLesson() { const saved=learningStorage.load("lesson",null);return saved?.day===localLearningDay()?saved:{day:localLearningDay(),completed:[]}; }
function prepareDailyLesson(persist=false) {
  const plan=planDailyLesson(cards,dailyLesson(),localLearningDay(),dailyCardLimit);
  if(persist && plan.plannedIds.length) learningStorage.save("lesson",plan);
  return plan;
}
function rememberDailyCard(id,result) {
  const lesson=dailyLesson();lesson.completed=[...new Set([...lesson.completed,id])];
  lesson.results={...(lesson.results||{}),[id]:result||"assisted"};
  learningStorage.save("lesson",lesson);
}
const dailySettings = document.createElement("div");
dailySettings.className = "profile-card";
dailySettings.innerHTML = '<label for="dailyCardLimit"><strong>Lernkarten pro Tag</strong></label><p>Deine tägliche Lektion</p><input id="dailyCardLimit" type="number" min="1" max="100" step="1" style="width:100%;padding:10px;margin-top:8px;border:1px solid #d8e2dd;border-radius:10px;font:inherit"><p id="dailyLimitSaved" role="status"></p>';
$("profile").insertBefore(dailySettings, $("profile").querySelector(".profile-section-title"));
$("dailyCardLimit").value = dailyCardLimit;
$("dailyCardLimit").addEventListener("change", () => { dailyCardLimit = Math.min(100, Math.max(1, Math.round(Number($("dailyCardLimit").value) || 15))); $("dailyCardLimit").value = dailyCardLimit; appStorage.setItem("storycards-daily-limit", String(dailyCardLimit)); $("dailyLimitSaved").textContent = `Gespeichert: ${dailyCardLimit} Karten pro Tag.`; });
const topicList = $("profile").querySelector(".topic-list");
if (topicList) { topicList.previousElementSibling?.remove(); topicList.remove(); }
$("profile").querySelector("h2").textContent = "Profil & Einstellungen";
const profileSaveArea = document.createElement("div");
profileSaveArea.style.marginTop = "20px";
profileSaveArea.innerHTML = '<button id="saveProfileButton" class="primary" type="button">Einstellungen speichern</button><p id="profileSavedStatus" role="status" style="color:#16806a;font-size:.85rem;text-align:center"></p>';
$("profile").insertBefore(profileSaveArea, $("profile").querySelector(".profile-nav"));
const imageSettings=document.createElement("div");imageSettings.className="profile-card";imageSettings.style.marginTop="12px";
imageSettings.innerHTML='<label class="image-hint-setting"><input id="imageHintSetting" type="checkbox"> Bilder als Merkhilfe verwenden</label><p style="font-size:.75rem;line-height:1.4">Passende KI-Merkszenen beim Kennenlernen und Aufdecken. Beim selbstständigen Erinnern bleiben sie verborgen. Keine automatische kostenpflichtige Bilderstellung.</p>';
$("profile").insertBefore(imageSettings,profileSaveArea);
$("imageHintSetting").checked=imageHintsEnabled;
$("imageHintSetting").addEventListener("change",()=>{imageHintsEnabled=$("imageHintSetting").checked;appStorage.setItem("storycards-image-hints",imageHintsEnabled?"on":"off");});

$("saveProfileButton").addEventListener("click", () => {
  if (!$("dailySpeakingMinutes").reportValidity() || !$("dailyCardLimit").reportValidity()) return;
  try {
    $("dailySpeakingMinutes").dispatchEvent(new Event("change"));
    $("dailyCardLimit").dispatchEvent(new Event("change"));
    $("profileSavedStatus").textContent = "✓ Deine Einstellungen sind gespeichert.";
  } catch { $("profileSavedStatus").textContent = "Speichern fehlgeschlagen. Bitte erneut versuchen."; }
});
const lessonProgress = document.createElement("p"); lessonProgress.className = "speak-prompt"; $("cards").insertBefore(lessonProgress, $("card"));
$("dailyPracticeButton").addEventListener("click", () => showReview());
$("weakPracticeButton").addEventListener("click", () => showReview("weak"));
function startFreePractice() { showReview("free");freePractice=true;reviewHistory=[];assessedCards.clear();queue=prioritiseCards(cards).map(card=>({...card,lessonStage:"recall"}));delete $("card").dataset.finished;renderCard(); }
$("freePracticeButton").addEventListener("click", startFreePractice);
const repeatPracticeButton = document.createElement("button"); repeatPracticeButton.id = "repeatPracticeButton"; repeatPracticeButton.className = "secondary hidden"; repeatPracticeButton.textContent = "↻ Karten noch einmal üben"; finishLessonButton.after(repeatPracticeButton); repeatPracticeButton.addEventListener("click", startFreePractice);
new MutationObserver(() => { repeatPracticeButton.classList.toggle("hidden", Boolean(queue.length) || !cards.length); if (freePractice) { lessonProgress.textContent = `Freies Üben · ${Math.min(reviewHistory.length + (queue.length ? 1 : 0), cards.length)} von ${cards.length} Karten`; if (!queue.length && $("card").dataset.finished !== "practice") { $("card").dataset.finished = "practice"; $("card").innerHTML = '<strong>🎉 Übungsrunde geschafft!</strong><small>Du kannst deine Karten jederzeit noch einmal üben.</small>'; } } }).observe($("card"), { childList:true });
let installPrompt;

if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
window.addEventListener("beforeinstallprompt", (event) => { event.preventDefault(); installPrompt = event; $("installButton").classList.remove("hidden"); });
$("installButton").addEventListener("click", async () => { if (!installPrompt) return; installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; $("installButton").classList.add("hidden"); });

function saveCards() { learningStorage.save("cards", cards); updateDue(); updateHomeProgress(); }
showLanguageSettings($("profile"), activeCourse);
setupCardManager(() => cards, updated => {
  cards = updated;
  const ids = new Set(cards.map(card => card.id));
  queue = queue.filter(card => ids.has(card.id));
  reviewHistory = reviewHistory.filter(card => ids.has(card.id));
  for (const id of assessedCards.keys()) if (!ids.has(id)) assessedCards.delete(id);
  saveCards();
});
function saveStats() { learningStorage.save("stats", learningStats); updateHomeProgress(); }
function updateHomeProgress() { $("homeStreak").textContent = `${learningStreak(learningStats.practiceDays)} Tage`; $("homeLearned").textContent = cards.filter((card) => Number(card.knownStreak || 0) > 0).length; $("homeMinutes").textContent = `${Number(learningStats.minutes || 0)} min`; }
function dayKey() { return new Date().toISOString().slice(0, 10); }
function learningStreak(days) { const unique = [...new Set(days || [])].sort().reverse(); let streak = 0, cursor = new Date(); cursor.setHours(0, 0, 0, 0); for (const day of unique) { const expected = cursor.toISOString().slice(0, 10); if (day !== expected) break; streak += 1; cursor.setDate(cursor.getDate() - 1); } return streak; }
function recordCompletedSession() { const minutes = Math.max(1, Math.round((Date.now() - startedAt - pausedDuration) / 60000)); learningStats.conversations = Number(learningStats.conversations || 0) + 1; learningStats.minutes = Number(learningStats.minutes || 0) + minutes; learningStats.practiceDays = [...new Set([...(learningStats.practiceDays || []), dayKey()])].slice(-90); saveStats(); }
function updateDue() { $("dueCount").textContent = cards.filter((card) => card.nextReviewAt <= Date.now()).length; }
function cleanFocus(focus) { return Array.isArray(focus) ? focus.filter((item) => item && typeof item.pattern === "string" && typeof item.practice === "string").map((item) => ({ pattern:item.pattern.trim().slice(0, 90), practice:item.practice.trim().slice(0, 140), example:typeof item.example === "string" ? item.example.trim().slice(0, 120) : "" })).filter((item) => item.pattern && item.practice) : []; }
function updateFocusHint() { const focus = cleanFocus(learningProfile.focus); const hint = $("focusHint"); if (!focus.length) { hint.classList.add("hidden"); return; } hint.textContent = `Dein nächster Fokus: ${focus[0].pattern} – ${focus[0].practice}`; hint.classList.remove("hidden"); }
function rememberFocus(newFocus) { const merged = [...cleanFocus(newFocus), ...cleanFocus(learningProfile.focus)]; const seen = new Set(); learningProfile = { focus:merged.filter((item) => !seen.has(item.pattern.toLowerCase()) && seen.add(item.pattern.toLowerCase())).slice(0, 3), updatedAt:Date.now() }; learningStorage.save("profile", learningProfile); updateFocusHint(); }
function coachInstructions() { const focus = cleanFocus(learningProfile.focus); const modes = { alltag:"a relaxed everyday conversation about Mark's day and interests", reisen:"a practical travel conversation, for example a hotel, airport, restaurant, or directions", beruf:"a friendly workplace conversation or a simple job-related role play", einkaufen:"a practical shopping conversation", rollenspiel:"a vivid but simple role play where you take a fitting role", ueberraschung:"a pleasant, everyday surprise topic", schwaechen:"a natural conversation that gives small chances to practise Mark's known learning focus" }; const modeText = ` Today's conversation mode is ${modes[$("conversationMode").value] || modes.alltag}.`; const weakCards = cards.filter(c => c.misses > 0).sort((a,b) => b.misses-a.misses).slice(0,3); const personalContext = weakCards.length ? ` Previously difficult sentences from actual conversations: ${weakCards.map(c => c.back).join("; ")}. Naturally revisit these meanings in new short questions, not rote repetition.` : ""; const focusText = focus.length ? ` Mark's current learning focus is: ${focus.map((item) => `${item.pattern} (${item.practice})`).join("; ")}. Naturally invite brief chances to practise this when it fits, but never announce a lesson or force it.` : ""; return "You are Mark's friendly English conversation coach for A1 to B1. The goal is confidence and understandable communication, not native-level English. Speak mainly English at a calm, clear, natural pace. Use short sentences and make a small pause between ideas so Mark can repeat them. Keep a natural chat going. Let Mark finish speaking. Do not correct every mistake and do not give grammar lessons. Correct only errors that prevent understanding, repeatedly block an important pattern, or create a phrase Mark is likely to reuse incorrectly. At most give one short correction in a turn; often give none. Prefer a gentle natural rephrasing at the end of your reply. Praise successful communication. Ask one concise question at a time. Near ten minutes, warmly conclude the practice." + modeText + focusText + personalContext; }
function setMicState(text, listening = false) { $("micStateText").textContent = text; $("micState").classList.toggle("listening", listening); }
function setPauseLabel(paused) { pauseButton.innerHTML = paused ? "<span>▶</span><small>Fortsetzen</small>" : "<span>Ⅱ</span><small>Pause</small>"; }
function setFinishLabel() { finishButton.classList.remove("creating-cards"); finishButton.removeAttribute("aria-busy"); finishButton.innerHTML = "<span>×</span><small>Gespräch beenden</small>"; }
function setFinishBusy(busy) {
  if (!busy) { setFinishLabel(); return; }
  finishButton.classList.add("creating-cards");
  finishButton.setAttribute("aria-busy", "true");
  finishButton.innerHTML = '<span class="cards-loading-spinner" aria-hidden="true"></span><small>Erstelle Karten</small>';
}
function showEmmaFrame(frame) { $("emmaAvatar").src = frame; document.querySelectorAll(".emma-mini").forEach((avatar) => avatar.src = frame); }
function setEmmaSpeaking(speaking) { clearTimeout(emmaQuietTimer); const stage = $("coachStage"); stage.classList.toggle("speaking", speaking); if (!speaking) { showEmmaFrame("/emma-coach.png"); return; } showEmmaFrame("/emma-coach-talking.png"); emmaQuietTimer = setTimeout(() => setEmmaSpeaking(false), 1250); }
function scheduleEmmaBlink() { clearTimeout(emmaBlinkTimer); emmaBlinkTimer = setTimeout(() => { if (!$("coachStage").classList.contains("speaking")) { showEmmaFrame("/emma-coach-blink.png"); setTimeout(() => showEmmaFrame("/emma-coach.png"), 150); } scheduleEmmaBlink(); }, 3200 + Math.floor(Math.random() * 2200)); }
function addMessage(role, text) { if (!text?.trim()) return; const el = document.createElement("p"); el.className = `message ${role}`; if (role === "coach") { const avatar = document.createElement("img"); avatar.className = "emma-mini"; avatar.src = $("emmaAvatar").src; avatar.alt = "Emma"; const bubble = document.createElement("span"); bubble.textContent = text; el.append(avatar, bubble); } else { el.textContent = text; } messages.append(el); messages.scrollTop = messages.scrollHeight; }
function updateTimer() { const elapsed = Date.now() - startedAt - pausedDuration - (isPaused ? Date.now() - pausedAt : 0); const remaining = Math.max(0, sessionDurationSeconds - Math.floor(elapsed / 1000)); $("timerText").textContent = `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`; timer.style.background = `conic-gradient(#1d8b71 ${(sessionDurationSeconds - remaining) / sessionDurationSeconds * 360}deg,#dcece7 0deg)`; if (!remaining) finishWhenEmmaIsDone(); }

async function startSession() {
  if (hasActiveConversation()) { if (isPaused) togglePause(); return; }
  timeExpired = false; responseActive = false; outputPlaying = false; finishingSession = false; clearTimeout(finishAfterAudioTimer);
  refreshSpeakingGoal();
  let phase = "Mikrofon";
  try {
    if (sessionWasEvaluated) { transcript = []; sessionWasEvaluated = false; }
    isPaused = false; pausedAt = 0; pausedDuration = 0; $("coachStage").classList.remove("paused");
    setFinishLabel();
    startButton.disabled = true; startButton.textContent = "🎙 Aufnahme wird vorbereitet …"; status.textContent = "Mikrofon wird verbunden …"; setMicState("Mikrofon wird vorbereitet …");
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new Error("Das Mikrofon ist in dieser App-Ansicht nicht verfügbar.");
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation:true, noiseSuppression:true, autoGainControl:false, channelCount:1 } });
    phase = "Sprachverbindung";
    status.textContent = "Sprachverbindung wird hergestellt …";
    pc = new RTCPeerConnection();
    pc.ontrack = (event) => { remoteAudio = new Audio(); remoteAudio.autoplay = true; remoteAudio.srcObject = event.streams[0]; remoteAudio.onplaying = () => setEmmaSpeaking(true); remoteAudio.onpause = () => setEmmaSpeaking(false); };
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    dataChannel = pc.createDataChannel("oai-events");
    dataChannel.addEventListener("open", () => {
      dataChannel.send(JSON.stringify({ type:"session.update", session:{ type:"realtime", audio:{ input:{ noise_reduction:{ type:"near_field" }, turn_detection:{ type:"server_vad", threshold:0.7, prefix_padding_ms:300, silence_duration_ms:1000, create_response:true, interrupt_response:false, idle_timeout_ms:null } } } } }));
    });
    dataChannel.onmessage = event => handleEvent(JSON.parse(event.data));
    dataChannel.onopen = () => dataChannel.send(JSON.stringify({ type:"session.update", session:{ type:"realtime", instructions:coachInstructions() + " Keep every spoken turn very brief: normally one short reaction and at most one simple question, about 10 to 25 words total. Then stop and let Mark speak. Never repeat his whole answer or add a summary. Avoid repeated praise and unsolicited examples. Give a longer explanation only if Mark explicitly asks for it. Example: 'That sounds nice! What did you make?'" } }));
    const offer = await pc.createOffer(); await pc.setLocalDescription(offer);
    const response = await fetch("/api/realtime/session", { method:"POST", headers:{"Content-Type":"application/sdp"}, body: offer.sdp });
    if (!response.ok) { const data = await response.json(); throw new Error(typeof data.error === "string" ? data.error : (data.error?.message || data.detail || "Verbindung fehlgeschlagen")); }
    await pc.setRemoteDescription({ type:"answer", sdp:await response.text() });
    startedAt = Date.now(); interval = setInterval(updateTimer, 1000); updateTimer();
    startButton.textContent = "🔴 Aufnahme läuft";
    status.textContent = "Du bist verbunden – sprich einfach Englisch."; setMicState("Ich höre zu …", true); pauseButton.disabled = false; setPauseLabel(false); finishButton.disabled = false;
  } catch (error) {
    const hint = error?.name === "NotAllowedError" ? "Windows hat den Mikrofonzugriff blockiert. Erlaube das Mikrofon für Desktop-Apps in den Windows-Einstellungen." : `${error?.name ? error.name + ": " : ""}${error?.message || "Unbekannter Fehler"}`;
    status.textContent = `${phase} fehlgeschlagen: ${hint}`;
    startButton.disabled = false; startButton.textContent = "🎙 Gespräch starten"; pauseButton.disabled = true; setMicState("Bereit für dein Gespräch"); stream?.getTracks().forEach((t) => t.stop());
  }
}

function finishWhenEmmaIsDone() {
  if (!timeExpired) {
    timeExpired = true;
    clearInterval(interval);
    stream?.getAudioTracks().forEach(track => track.enabled = false);
    pauseButton.disabled = true;
    finishButton.disabled = true;
    status.textContent = "Die Zeit ist um. Emma spricht noch zu Ende …";
    setMicState("Emma spricht noch zu Ende …");
  }
  clearTimeout(finishAfterAudioTimer);
  if (!responseActive && !outputPlaying) {
    // Allow the WebRTC playback tail and any final transcript event to arrive.
    finishAfterAudioTimer = setTimeout(() => {
      if (timeExpired && !responseActive && !outputPlaying) finishSession();
    }, 700);
  }
}
function handleEvent(event) {
  if (event.type === "response.created") { responseActive = true; clearTimeout(finishAfterAudioTimer); }
  if (event.type === "output_audio_buffer.started") { outputPlaying = true; clearTimeout(finishAfterAudioTimer); }
  if (event.type === "response.done") responseActive = false;
  if (event.type === "output_audio_buffer.stopped" || event.type === "output_audio_buffer.cleared") { outputPlaying = false; setEmmaSpeaking(false); }

  if (event.type === "response.output_audio.delta" || event.type === "response.output_audio_transcript.delta" || event.type === "response.created") { if (!isPaused) { setMicState("Ich antworte gerade …"); setEmmaSpeaking(true); } }
  if (event.type === "conversation.item.input_audio_transcription.completed") { transcript.push({ role:"learner", text:event.transcript }); addMessage("learner", event.transcript); setMicState("Ich höre dir zu.", true); }
  if (event.type === "response.output_audio_transcript.done") { transcript.push({ role:"coach", text:event.transcript }); addMessage("coach", event.transcript); setEmmaSpeaking(false); if (!isPaused) setMicState("Ich höre dir zu.", true); }
  if (event.type === "error") status.textContent = event.error?.message || "Ein Verbindungsfehler ist aufgetreten.";
  if (timeExpired) { setMicState("Emma spricht noch zu Ende …"); finishWhenEmmaIsDone(); }
}

function togglePause() {
  if (!hasActiveConversation()) return;
  isPaused = !isPaused;
  if (isPaused) {
    pausedAt = Date.now(); clearInterval(interval); stream.getAudioTracks().forEach((track) => track.enabled = false); remoteAudio?.pause();
    if (dataChannel?.readyState === "open") dataChannel.send(JSON.stringify({ type:"session.input_audio.mute" }));
    setPauseLabel(true); status.textContent = "Pausiert – das Mikrofon hört gerade nicht zu."; setMicState("Gespräch pausiert"); setEmmaSpeaking(false); $("coachStage").classList.add("paused");
  } else {
    pausedDuration += Date.now() - pausedAt; stream.getAudioTracks().forEach((track) => track.enabled = true); remoteAudio?.play().catch(() => {});
    if (dataChannel?.readyState === "open") dataChannel.send(JSON.stringify({ type:"session.input_audio.unmute" }));
    interval = setInterval(updateTimer, 1000); updateTimer(); setPauseLabel(false); status.textContent = "Weiter geht's – sprich einfach Englisch."; setMicState("Ich höre zu …", true); $("coachStage").classList.remove("paused");
  }
}

function hasActiveConversation() { return Boolean(stream?.getAudioTracks().some((track) => track.readyState === "live") && pc && pc.connectionState !== "closed" && !finishButton.disabled); }
function syncConversationClocks() { const homeClock = document.querySelector(".home-countdown strong"); if (homeClock) homeClock.textContent = $("timerText").textContent; const button = $("homeStartButton"); if (hasActiveConversation()) button.innerHTML = '🎙 Gespräch fortsetzen <span>›</span>'; else button.innerHTML = '🎙 Gespräch starten <span>›</span>'; }
new MutationObserver(syncConversationClocks).observe($("timerText"), { childList:true });
new MutationObserver(() => {
  if (!hasActiveConversation()) return;
  const away = $("practice").classList.contains("hidden");
  if (away && !isPaused) togglePause();
  else if (!away && isPaused) togglePause();
  syncConversationClocks();
}).observe($("practice"), { attributes:true, attributeFilter:["class"] });

async function finishSession() {
  if (finishingSession) return;
  finishingSession = true; timeExpired = false; clearTimeout(finishAfterAudioTimer);
  clearInterval(interval); isPaused = false; setEmmaSpeaking(false); $("coachStage").classList.remove("paused"); pauseButton.disabled = true; finishButton.disabled = true; setFinishBusy(true); startButton.textContent = "Gespräch beendet"; setMicState("Gespräch wird ausgewertet …"); stream?.getTracks().forEach((t) => t.stop()); pc?.close();
  if (!transcript.length) { status.textContent = "Noch kein Gespräch zum Auswerten. Versuch es noch einmal."; startButton.disabled = false; startButton.textContent = "🎙 Gespräch starten"; setFinishBusy(false); return; }
  status.textContent = "Ich erstelle deine persönlichen Karten …";
  try { const response = await fetch("/api/flashcards", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ transcript }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); const newCards = normaliseCards(data.cards); if (!newCards.length) throw new Error("Aus diesem Gespräch konnte ich noch keine passenden Karten ableiten."); cards = [...cards, ...newCards]; rememberFocus(data.focus); saveCards(); recordCompletedSession(); sessionWasEvaluated = true; status.textContent = `${newCards.length} neue Karten sind bereit.`; startButton.disabled = false; startButton.textContent = "🎙 Weiter sprechen"; setMicState("Du kannst weiter sprechen oder deine Karten üben."); showSummary(newCards.length, cleanFocus(data.focus).length); } catch(error) { status.textContent = error.message; startButton.disabled = false; startButton.textContent = "🎙 Weiter sprechen"; setMicState("Du kannst das Gespräch fortsetzen."); } finally { setFinishBusy(false); }
}

function showSummary(cardCount, focusCount) { $("cardChoice").classList.add("hidden"); $("practice").classList.add("hidden"); $("summary").classList.remove("hidden"); const minutes = Math.max(1, Math.round((Date.now() - startedAt - pausedDuration) / 60000)); const focus = cleanFocus(learningProfile.focus); $("summaryText").textContent = `Du hast ${minutes} Minuten Englisch gesprochen.`; $("summaryMinutes").textContent = minutes; $("summaryCards").textContent = cardCount; $("summaryFocus").textContent = focusCount; const topics = $("summaryTopics"); topics.replaceChildren(); (focus.length ? focus : [{ pattern:"Freies Sprechen" }]).forEach((item) => { const chip = document.createElement("span"); chip.className = "summary-topic"; chip.textContent = item.pattern; topics.append(chip); }); const focusCard = $("summaryFocusCard"), first = focus[0]; $("summaryFocusText").textContent = first ? `Dein nächster Fokus: ${first.pattern}. ${first.practice}` : "Heute ging es vor allem darum, frei und verständlich zu sprechen."; focusCard.classList.remove("hidden"); }
function showCardChoice() {
  document.body.classList.remove("in-conversation");
  for (const id of ["home","practice","summary","cards","statistics","profile"]) $(id).classList.add("hidden");
  $("cardChoice").classList.remove("hidden");
  const plan=prepareDailyLesson();
  const remaining=plan.plannedIds.filter(id=>!plan.completed.includes(id)).length;
  $("dailyChoiceHint").textContent=remaining?`${remaining} Lernziele · höchstens 3 neue, Wiederholungen zuerst`:"Für heute ist deine Lernrunde geschafft. Weiterüben ist freiwillig.";
  const weakCount=difficultCards(cards).length;
  $("weakChoiceHint").textContent=weakCount?`${weakCount} unsichere Karten · auch heute wiederholen, Lernabstände verbessern`:"Keine schwierigen Karten offen – gut gemacht!";
  $("weakPracticeButton").disabled=!weakCount;
}
$("choiceHomeButton").addEventListener("click", showHome);
$("choiceCardsButton").addEventListener("click", showCardChoice);
$("choiceProgressButton").addEventListener("click", showStatistics);
$("choiceProfileButton").addEventListener("click", showProfile);
$("cards").querySelector(".cards-nav button.active").addEventListener("click", showCardChoice);

function showHome() { $("cardChoice").classList.add("hidden"); document.body.classList.remove("in-conversation"); $("practice").classList.add("hidden"); $("summary").classList.add("hidden"); $("cards").classList.add("hidden"); $("statistics").classList.add("hidden"); $("profile").classList.add("hidden"); $("home").classList.remove("hidden"); }
function showPractice() { $("cardChoice").classList.add("hidden"); document.body.classList.add("in-conversation"); $("home").classList.add("hidden"); $("summary").classList.add("hidden"); $("cards").classList.add("hidden"); $("statistics").classList.add("hidden"); $("profile").classList.add("hidden"); $("practice").classList.remove("hidden"); }
function showReview(includeAll = false) {
  $("cardChoice").classList.add("hidden");freePractice=false;weakPractice=includeAll==="weak";reviewHistory=[];assessedCards.clear();
  document.body.classList.remove("in-conversation");
  for(const id of ["home","practice","summary","statistics","profile"]) $(id).classList.add("hidden");
  $("cards").classList.remove("hidden");
  if(weakPractice) {queue=difficultCards(cards).slice(0,dailyCardLimit).map(card=>({...card,lessonStage:"recall"}));weakRoundTotal=queue.length;}
  else if(includeAll === "free") queue=[]; else { const plan=prepareDailyLesson(true);queue=lessonQueue(cards,plan); }
  repairFailed=false;delete $("card").dataset.finished;renderCard();
}
function fillInsightList(id, items, kind) { const list = $(id); list.replaceChildren(); items.forEach((item) => { const row = document.createElement("li"); row.textContent = item; row.className = kind; list.append(row); }); }
function showStatistics() { $("cardChoice").classList.add("hidden"); document.body.classList.remove("in-conversation"); $("home").classList.add("hidden"); $("practice").classList.add("hidden"); $("summary").classList.add("hidden"); $("cards").classList.add("hidden"); $("profile").classList.add("hidden"); $("statistics").classList.remove("hidden"); const known = cards.filter((card) => Number(card.knownStreak || 0) > 0).length; const focus = cleanFocus(learningProfile.focus); $("statConversations").textContent = Number(learningStats.conversations || 0); $("statMinutes").textContent = Number(learningStats.minutes || 0); $("statCards").textContent = known; $("statStreak").textContent = `${learningStreak(learningStats.practiceDays)} Tage`; const strengths = []; if (Number(learningStats.conversations || 0)) strengths.push("Regelmäßig sprechen"); if (known) strengths.push("Karten wiederholen"); if (cards.length) strengths.push("Eigene Sätze lernen"); fillInsightList("strengthList", strengths.length ? strengths : ["Dein erster Schritt ist gemacht"], "strength"); fillInsightList("workList", focus.length ? focus.map((item) => item.pattern) : ["Freies Sprechen", "Neue Wörter festigen"], "work"); }
function showProfile() { $("cardChoice").classList.add("hidden"); document.body.classList.remove("in-conversation"); $("home").classList.add("hidden"); $("practice").classList.add("hidden"); $("summary").classList.add("hidden"); $("cards").classList.add("hidden"); $("statistics").classList.add("hidden"); $("profile").classList.remove("hidden"); }
function renderCard() {
  const card=queue[0];answerVisible=false;
  $("revealButton").classList.add("hidden");$("listenButton").classList.add("hidden");$("ratingButtons").classList.add("hidden");
  $("speakPrompt").classList.add("hidden");$("recordAnswerButton").classList.add("hidden");$("voiceFeedback").className="voice-feedback hidden";
  if(!card) {$("card").innerHTML="<strong>Für heute geschafft!</strong>";return;}
  const introduction=!freePractice && card.lessonStage==="introduce";
    if(card.retryPractice || introduction) assessedCards.delete(card.id);
  const phase=introduction?"Kennenlernen":card.retryPractice?"Noch einmal ohne Hilfe":"Selbst erinnern";
  $("card").innerHTML=`<small class="lesson-phase">${phase}</small><span>🇩🇪 ${escapeHtml(card.front)}</span>${introduction?`<span class="back">🇬🇧 ${escapeHtml(card.back)}</span>`:""}`;
  if(introduction) {answerVisible=true;if(imageHintsEnabled) appendLearningImage($("card"),card);}
  $("speakPrompt").textContent=introduction?"Höre den englischen Satz an und sprich ihn nach. Gleich versuchst du ihn ohne Hilfe.":"Sprich die englische Übersetzung aus dem Gedächtnis.";
  $("speakPrompt").classList.remove("hidden");$("recordAnswerButton").classList.remove("hidden");$("recordAnswerButton").disabled=false;$("recordAnswerButton").textContent="🎙 Zum Sprechen gedrückt halten";
  if(!introduction) $("revealButton").classList.remove("hidden");
}
function revealAnswer() {
  const card=queue[0];if(!card||answerVisible) return;
  if(!assessedCards.has(card.id)) assessedCards.set(card.id,"assisted");
  answerVisible=true;$("card").innerHTML=`<span>🇩🇪 ${escapeHtml(card.front)}</span><span class="back">🇬🇧 ${escapeHtml(card.back)}</span>`;
  if(imageHintsEnabled) appendLearningImage($("card"),card);
  $("revealButton").classList.add("hidden");$("recordAnswerButton").classList.remove("hidden");$("speakPrompt").classList.add("hidden");$("listenButton").classList.remove("hidden");$("ratingButtons").classList.remove("hidden");
}
function speakAnswer() { const card = queue[0]; if (!card || !window.speechSynthesis) return; speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(card.back); utterance.lang = "en-GB"; utterance.rate = 0.85; speechSynthesis.speak(utterance); }
function readCardSentence(element) {
  if (!window.speechSynthesis || !queue[0] || reviewRecorder?.state === "recording") return;
  const english = element.classList.contains("back");
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(english ? queue[0].back : queue[0].front);
  utterance.lang = english ? "en-GB" : "de-DE"; utterance.rate = 0.85;
  const voice = speechSynthesis.getVoices().find((item) => item.lang.toLowerCase().startsWith(english ? "en" : "de"));
  if (voice) utterance.voice = voice;
  speechSynthesis.speak(utterance);
}
new MutationObserver(() => { $("card").querySelectorAll(":scope > span").forEach((sentence) => { sentence.tabIndex = 0; sentence.setAttribute("role", "button"); sentence.title = "Antippen zum Vorlesen"; sentence.setAttribute("aria-label", `${sentence.classList.contains("back") ? "Englischen" : "Deutschen"} Satz vorlesen`); }); }).observe($("card"), { childList:true });
$("card").addEventListener("click", (event) => { const sentence = event.target.closest("#card > span"); if (sentence) readCardSentence(sentence); });
$("card").addEventListener("keydown", (event) => { if (["Enter", " "].includes(event.key) && event.target.matches("#card > span")) { event.preventDefault(); readCardSentence(event.target); } });
function audioBase64(blob) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(",")[1]); reader.onerror = reject; reader.readAsDataURL(blob); }); }
async function reviewRecordedAnswer(blob) { const card = queue[0]; if (!card) return; const button = $("recordAnswerButton"); button.textContent = "Antwort wird geprüft …"; button.disabled = true; try { const audio = await audioBase64(blob); const response = await fetch("/api/card-answer", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ audio, mime:blob.type || "audio/webm", expected:card.back, front:card.front }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Die Aufnahme konnte nicht geprüft werden."); if (!String(data.transcript || "").trim()) throw new Error("Keine klare Sprache erkannt. Bitte versuche es noch einmal; die Karte wird nicht schlechter bewertet."); const rating = { correct:"yes", close:"hard", incorrect:"no" }[data.result]; if (!rating) throw new Error("Die Bewertung war nicht eindeutig. Bitte sprich die Antwort noch einmal."); if (queue[0]?.id !== card.id) return; if (!assessedCards.has(card.id) || card.retryPractice) { const updated = freePractice || card.retryPractice || card.lessonStage === "introduce" ? (cards.find(c => c.id === card.id) || card) : rateCard(cards.find(c => c.id === card.id) || card, rating); cards = cards.map((item) => item.id === card.id ? updated : item); assessedCards.set(card.id, data.result); if(!freePractice && !card.retryPractice && card.lessonStage !== "introduce") card.scheduleApplied=true; saveCards(); } const feedback = $("voiceFeedback"); feedback.className = `voice-feedback ${data.result}`; feedback.textContent = data.feedback; revealAnswer(); const correction = document.createElement("button"); correction.className = "secondary"; correction.textContent = "Bewertung stimmt nicht – erneut versuchen"; correction.onclick = () => { cards = cards.map(item => item.id === card.id ? card : item); assessedCards.delete(card.id); card.scheduleApplied=false; saveCards(); renderCard(); }; feedback.append(document.createElement("br"), correction); } catch (error) { $("voiceFeedback").className = "voice-feedback incorrect"; $("voiceFeedback").textContent = error.message || "Die Aufnahme konnte nicht geprüft werden."; button.textContent = "🎙 Noch einmal sprechen"; } finally { button.disabled = false; } }
async function recordAnswer() { try { if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error("Die Mikrofonaufnahme wird auf diesem Gerät nicht unterstützt."); reviewStream = await navigator.mediaDevices.getUserMedia({ audio:true }); if (!answerHeld) { reviewStream.getTracks().forEach((track) => track.stop()); return; } reviewChunks = []; reviewRecorder = new MediaRecorder(reviewStream); reviewRecorder.ondataavailable = (event) => { if (event.data.size) reviewChunks.push(event.data); }; reviewRecorder.onstop = () => { stopReviewMeter(); reviewStream?.getTracks().forEach((track) => track.stop()); reviewRecordedAnswer(new Blob(reviewChunks, { type:reviewRecorder.mimeType || "audio/webm" })); }; reviewRecorder.start(); startReviewMeter(reviewStream); } catch (error) { stopReviewMeter(); reviewStream?.getTracks().forEach((track) => track.stop()); $("voiceFeedback").className = "voice-feedback incorrect"; $("voiceFeedback").textContent = error.message || "Das Mikrofon konnte nicht gestartet werden."; } }
function escapeHtml(text) { const el=document.createElement("span"); el.textContent=text; return el.innerHTML; }
document.querySelectorAll("[data-rating]").forEach((button) => button.addEventListener("click", () => { if (!queue[0]) return; const updated=rateCard(queue[0], button.dataset.rating); cards=cards.map(c=>c.id===updated.id?updated:c); queue.shift(); saveCards(); renderCard(); }));
document.querySelectorAll("[data-home-mode]").forEach((button) => button.addEventListener("click", () => { $("conversationMode").value = button.dataset.homeMode; document.querySelectorAll("[data-home-mode]").forEach((tile) => tile.classList.toggle("active", tile === button)); }));
$("homeStartButton").addEventListener("click", () => { showPractice(); if (!hasActiveConversation()) startSession(); });
$("homeDetailsButton").addEventListener("click", showStatistics);
updateHomeProgress();
refreshSpeakingGoal();
$("conversationCardsButton").addEventListener("click", () => { if (stream?.getAudioTracks().some((track) => track.readyState === "live") && !isPaused) togglePause(); showCardChoice(); });
$("subtitleButton").addEventListener("click", () => { const visible = $("subtitleButton").getAttribute("aria-pressed") !== "true"; $("subtitleButton").setAttribute("aria-pressed", String(visible)); $("practice").classList.toggle("subtitles-off", !visible); messages.setAttribute("aria-hidden", String(!visible)); });
startButton.addEventListener("click", startSession); pauseButton.addEventListener("click", togglePause); finishButton.addEventListener("click", finishSession); $("conversationBackButton").addEventListener("click", () => { if (stream && !isPaused) togglePause(); showHome(); }); $("conversationSettingsButton").addEventListener("click", () => $("modePicker").classList.toggle("hidden")); $("keyboardButton").addEventListener("click", () => { status.textContent = "Sprich einfach weiter – die Tastatur kommt als Nächstes."; }); $("summaryBackButton").addEventListener("click", showHome); $("summaryCloseButton").addEventListener("click", showHome); $("statisticsBackButton").addEventListener("click", showHome); $("profileBackButton").addEventListener("click", showHome); $("continueButton").addEventListener("click", () => { showPractice(); startSession(); }); $("homeNavButton").addEventListener("click", showHome); $("cardsNavButton").addEventListener("click", () => showCardChoice()); $("progressNavButton").addEventListener("click", showStatistics); $("profileNavButton").addEventListener("click", showProfile); $("statisticsHomeButton").addEventListener("click", showHome); $("statisticsCardsButton").addEventListener("click", () => showCardChoice()); $("statisticsProfileButton").addEventListener("click", showProfile); $("cardsHomeButton").addEventListener("click", showHome); $("cardsProgressButton").addEventListener("click", showStatistics); $("cardsProfileButton").addEventListener("click", showProfile); $("profileHomeButton").addEventListener("click", showHome); $("profileCardsButton").addEventListener("click", () => showCardChoice()); $("profileProgressButton").addEventListener("click", showStatistics); $("toCardsButton").addEventListener("click", () => showCardChoice()); $("recordAnswerButton").addEventListener("click", recordAnswer); $("revealButton").addEventListener("click", revealAnswer); $("listenButton").addEventListener("click", speakAnswer); $("backToPractice").addEventListener("click", showPractice); updateDue(); updateFocusHint(); scheduleEmmaBlink();
account.mount($("profile"), () => hasActiveConversation() || reviewRecorder?.state === "recording" || answerStarting || $("recordAnswerButton").disabled);
await import("/cards-design.js");
