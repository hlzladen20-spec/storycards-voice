import { normaliseCards, prioritiseCards, rateCard } from "/cards.js";

const $ = (id) => document.getElementById(id);
const startButton = $("startButton"), pauseButton = $("pauseButton"), finishButton = $("finishButton"), status = $("status"), messages = $("messages"), timer = $("timer");
timer.style.position = "relative";
let pc, dataChannel, stream, remoteAudio, interval, startedAt, transcript = [];
let cards = JSON.parse(localStorage.getItem("storycards") || "[]"), queue = [];
let answerVisible = false;
let reviewHistory = [];
let repairingCards = false;
new MutationObserver(() => { if (queue[0] && queue[0].cueLanguage !== "de" && !repairingCards) { $("card").textContent = "Deutscher Übungssatz wird vorbereitet …"; ensureGermanCards(); } }).observe($("card"), { childList:true });
async function ensureGermanCards() {
  const pending = cards.filter((card) => card.cueLanguage !== "de");
  if (!pending.length || repairingCards) return;
  repairingCards = true;
  $("recordAnswerButton").disabled = true;
  try {
    for (let offset = 0; offset < pending.length; offset += 15) {
      const batch = pending.slice(offset, offset + 15);
      const response = await fetch("/api/flashcards", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ repairCards:batch.map((card) => ({ back:card.back })), transcript:[{ role:"learner", text:"Repair these cards by translating each English back into a complete German front." }] }) });
      const data = await response.json();
      if (!response.ok || !Array.isArray(data.cards) || data.cards.length !== batch.length || data.cards.some((card) => typeof card.front !== "string" || !card.front.trim())) throw new Error("Die deutschen Aufgaben konnten noch nicht erstellt werden. Bitte versuche es erneut.");
      batch.forEach((card, index) => { card.front = data.cards[index].front.trim(); card.cueLanguage = "de"; });
      saveCards();
    }
    queue = queue.map((item) => cards.find((card) => card.id === item.id) || item);
    renderCard();
  } catch (error) { $("card").textContent = error.message; $("recordAnswerButton").disabled = true; }
  finally { repairingCards = false; }
}
const assessedCards = new Map();
const reviewNavigation = $("ratingButtons");
reviewNavigation.innerHTML = '<button id="previousCardButton" class="secondary">← Zurück</button><button id="nextCardButton" class="primary">Weiter →</button>';
function moveReviewCard(back = false) {
  if (reviewRecorder?.state === "recording" || $("recordAnswerButton").disabled) return;
  if (back) { if (!reviewHistory.length) return; if (queue[0]) queue.unshift(reviewHistory.pop()); else queue.push(reviewHistory.pop()); }
  else { if (!queue[0]) return; rememberDailyCard(queue[0].id); reviewHistory.push(queue.shift()); }
  renderCard();
}
$("previousCardButton").addEventListener("click", () => moveReviewCard(true));
$("nextCardButton").addEventListener("click", () => moveReviewCard());
new MutationObserver(() => { reviewNavigation.classList.remove("hidden"); $("previousCardButton").disabled = !reviewHistory.length; $("nextCardButton").disabled = !queue[0]; const count = dailyLesson().completed.length; lessonProgress.textContent = `${Math.min(count, dailyCardLimit)} von ${dailyCardLimit} Karten heute`; if (!queue[0] && !$("card").dataset.finished) { $("card").dataset.finished = "yes"; $("card").innerHTML = `<strong>${count >= dailyCardLimit ? "🎉 Lektion geschafft!" : "Für heute alles geschafft!"}</strong><small>${count >= dailyCardLimit ? "Deine nächste Lektion wartet morgen auf dich." : "Sobald weitere Karten fällig sind, findest du sie hier."}</small>`; } else if (queue[0]) delete $("card").dataset.finished; }).observe($("card"), { childList:true });
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
let learningProfile = JSON.parse(localStorage.getItem("storycards-learning-profile") || "{\"focus\":[]}");
let learningStats = JSON.parse(localStorage.getItem("storycards-learning-stats") || "{\"conversations\":0,\"minutes\":0,\"practiceDays\":[]}");
let dailyCardLimit = Math.min(100, Math.max(1, Number(localStorage.getItem("storycards-daily-limit")) || 15));
let dailySpeakingMinutes = Math.min(60, Math.max(1, Number(localStorage.getItem("storycards-speaking-minutes")) || 10));
let sessionDurationSeconds = dailySpeakingMinutes * 60;
const speakingSettings = document.createElement("div");
speakingSettings.className = "profile-card";
speakingSettings.innerHTML = '<label for="dailySpeakingMinutes"><strong>Sprechminuten pro Tag</strong></label><p>Wie lange möchtest du täglich Englisch sprechen?</p><input id="dailySpeakingMinutes" type="number" min="1" max="60" step="1" style="width:100%;padding:10px;margin-top:8px;border:1px solid #d8e2dd;border-radius:10px;font:inherit"><p id="speakingMinutesSaved" role="status"></p>';
$("profile").insertBefore(speakingSettings, $("profile").querySelector(".profile-section-title"));
$("dailySpeakingMinutes").value = dailySpeakingMinutes;
function refreshSpeakingGoal() { document.querySelector(".home-card h2").textContent = `${dailySpeakingMinutes} Minuten`; if (!hasActiveConversation()) { sessionDurationSeconds = dailySpeakingMinutes * 60; $("timerText").textContent = `${String(dailySpeakingMinutes).padStart(2, "0")}:00`; } const total = `${String(sessionDurationSeconds / 60).padStart(2, "0")}:00`; timer.querySelector("small").textContent = `/ ${total}`; document.querySelector(".home-countdown small").textContent = `/ ${total}`; document.querySelector(".home-countdown strong").textContent = $("timerText").textContent; }
$("dailySpeakingMinutes").addEventListener("change", () => { dailySpeakingMinutes = Math.min(60, Math.max(1, Math.round(Number($("dailySpeakingMinutes").value) || 10))); $("dailySpeakingMinutes").value = dailySpeakingMinutes; localStorage.setItem("storycards-speaking-minutes", String(dailySpeakingMinutes)); refreshSpeakingGoal(); $("speakingMinutesSaved").textContent = hasActiveConversation() ? "Gespeichert – gilt ab dem nächsten Gespräch." : `Gespeichert: ${dailySpeakingMinutes} Minuten pro Tag.`; });
function localLearningDay() { const now = new Date(); return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`; }
function dailyLesson() { const saved = JSON.parse(localStorage.getItem("storycards-daily-lesson") || "null"); return saved?.day === localLearningDay() ? saved : { day:localLearningDay(), completed:[] }; }
function rememberDailyCard(id) { const lesson = dailyLesson(); lesson.completed = [...new Set([...lesson.completed, id])]; localStorage.setItem("storycards-daily-lesson", JSON.stringify(lesson)); }
const dailySettings = document.createElement("div");
dailySettings.className = "profile-card";
dailySettings.innerHTML = '<label for="dailyCardLimit"><strong>Lernkarten pro Tag</strong></label><p>Deine tägliche Lektion</p><input id="dailyCardLimit" type="number" min="1" max="100" step="1" style="width:100%;padding:10px;margin-top:8px;border:1px solid #d8e2dd;border-radius:10px;font:inherit"><p id="dailyLimitSaved" role="status"></p>';
$("profile").insertBefore(dailySettings, $("profile").querySelector(".profile-section-title"));
$("dailyCardLimit").value = dailyCardLimit;
$("dailyCardLimit").addEventListener("change", () => { dailyCardLimit = Math.min(100, Math.max(1, Math.round(Number($("dailyCardLimit").value) || 15))); $("dailyCardLimit").value = dailyCardLimit; localStorage.setItem("storycards-daily-limit", String(dailyCardLimit)); $("dailyLimitSaved").textContent = `Gespeichert: ${dailyCardLimit} Karten pro Tag.`; });
const topicList = $("profile").querySelector(".topic-list");
if (topicList) { topicList.previousElementSibling?.remove(); topicList.remove(); }
$("profile").querySelector("h2").textContent = "Profil & Einstellungen";
const profileSaveArea = document.createElement("div");
profileSaveArea.style.marginTop = "20px";
profileSaveArea.innerHTML = '<button id="saveProfileButton" class="primary" type="button">Einstellungen speichern</button><p id="profileSavedStatus" role="status" style="color:#16806a;font-size:.85rem;text-align:center"></p>';
$("profile").insertBefore(profileSaveArea, $("profile").querySelector(".profile-nav"));
$("saveProfileButton").addEventListener("click", () => {
  if (!$("dailySpeakingMinutes").reportValidity() || !$("dailyCardLimit").reportValidity()) return;
  try {
    $("dailySpeakingMinutes").dispatchEvent(new Event("change"));
    $("dailyCardLimit").dispatchEvent(new Event("change"));
    $("profileSavedStatus").textContent = "✓ Deine Einstellungen sind gespeichert.";
  } catch { $("profileSavedStatus").textContent = "Speichern fehlgeschlagen. Bitte erneut versuchen."; }
});
const lessonProgress = document.createElement("p"); lessonProgress.className = "speak-prompt"; $("cards").insertBefore(lessonProgress, $("card"));
let installPrompt;

if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
window.addEventListener("beforeinstallprompt", (event) => { event.preventDefault(); installPrompt = event; $("installButton").classList.remove("hidden"); });
$("installButton").addEventListener("click", async () => { if (!installPrompt) return; installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; $("installButton").classList.add("hidden"); });

function saveCards() { localStorage.setItem("storycards", JSON.stringify(cards)); updateDue(); updateHomeProgress(); }
function saveStats() { localStorage.setItem("storycards-learning-stats", JSON.stringify(learningStats)); updateHomeProgress(); }
function updateHomeProgress() { $("homeStreak").textContent = `${learningStreak(learningStats.practiceDays)} Tage`; $("homeLearned").textContent = cards.filter((card) => Number(card.knownStreak || 0) > 0).length; $("homeMinutes").textContent = `${Number(learningStats.minutes || 0)} min`; }
function dayKey() { return new Date().toISOString().slice(0, 10); }
function learningStreak(days) { const unique = [...new Set(days || [])].sort().reverse(); let streak = 0, cursor = new Date(); cursor.setHours(0, 0, 0, 0); for (const day of unique) { const expected = cursor.toISOString().slice(0, 10); if (day !== expected) break; streak += 1; cursor.setDate(cursor.getDate() - 1); } return streak; }
function recordCompletedSession() { const minutes = Math.max(1, Math.round((Date.now() - startedAt - pausedDuration) / 60000)); learningStats.conversations = Number(learningStats.conversations || 0) + 1; learningStats.minutes = Number(learningStats.minutes || 0) + minutes; learningStats.practiceDays = [...new Set([...(learningStats.practiceDays || []), dayKey()])].slice(-90); saveStats(); }
function updateDue() { $("dueCount").textContent = cards.filter((card) => card.nextReviewAt <= Date.now()).length; }
function cleanFocus(focus) { return Array.isArray(focus) ? focus.filter((item) => item && typeof item.pattern === "string" && typeof item.practice === "string").map((item) => ({ pattern:item.pattern.trim().slice(0, 90), practice:item.practice.trim().slice(0, 140), example:typeof item.example === "string" ? item.example.trim().slice(0, 120) : "" })).filter((item) => item.pattern && item.practice) : []; }
function updateFocusHint() { const focus = cleanFocus(learningProfile.focus); const hint = $("focusHint"); if (!focus.length) { hint.classList.add("hidden"); return; } hint.textContent = `Dein nächster Fokus: ${focus[0].pattern} – ${focus[0].practice}`; hint.classList.remove("hidden"); }
function rememberFocus(newFocus) { const merged = [...cleanFocus(newFocus), ...cleanFocus(learningProfile.focus)]; const seen = new Set(); learningProfile = { focus:merged.filter((item) => !seen.has(item.pattern.toLowerCase()) && seen.add(item.pattern.toLowerCase())).slice(0, 3), updatedAt:Date.now() }; localStorage.setItem("storycards-learning-profile", JSON.stringify(learningProfile)); updateFocusHint(); }
function coachInstructions() { const focus = cleanFocus(learningProfile.focus); const modes = { alltag:"a relaxed everyday conversation about Mark's day and interests", reisen:"a practical travel conversation, for example a hotel, airport, restaurant, or directions", beruf:"a friendly workplace conversation or a simple job-related role play", einkaufen:"a practical shopping conversation", rollenspiel:"a vivid but simple role play where you take a fitting role", ueberraschung:"a pleasant, everyday surprise topic", schwaechen:"a natural conversation that gives small chances to practise Mark's known learning focus" }; const modeText = ` Today's conversation mode is ${modes[$("conversationMode").value] || modes.alltag}.`; const focusText = focus.length ? ` Mark's current learning focus is: ${focus.map((item) => `${item.pattern} (${item.practice})`).join("; ")}. Naturally invite brief chances to practise this when it fits, but never announce a lesson or force it.` : ""; return "You are Mark's friendly English conversation coach for A1 to B1. The goal is confidence and understandable communication, not native-level English. Speak mainly English at a calm, clear, natural pace. Use short sentences and make a small pause between ideas so Mark can repeat them. Keep a natural chat going. Let Mark finish speaking. Do not correct every mistake and do not give grammar lessons. Correct only errors that prevent understanding, repeatedly block an important pattern, or create a phrase Mark is likely to reuse incorrectly. At most give one short correction in a turn; often give none. Prefer a gentle natural rephrasing at the end of your reply. Praise successful communication. Ask one concise question at a time. Near ten minutes, warmly conclude the practice." + modeText + focusText; }
function setMicState(text, listening = false) { $("micStateText").textContent = text; $("micState").classList.toggle("listening", listening); }
function setPauseLabel(paused) { pauseButton.innerHTML = paused ? "<span>▶</span><small>Fortsetzen</small>" : "<span>Ⅱ</span><small>Pause</small>"; }
function setFinishLabel() { finishButton.innerHTML = "<span>×</span><small>Gespräch beenden</small>"; }
function showEmmaFrame(frame) { $("emmaAvatar").src = frame; document.querySelectorAll(".emma-mini").forEach((avatar) => avatar.src = frame); }
function setEmmaSpeaking(speaking) { clearTimeout(emmaQuietTimer); const stage = $("coachStage"); stage.classList.toggle("speaking", speaking); if (!speaking) { showEmmaFrame("/emma-coach.png"); return; } showEmmaFrame("/emma-coach-talking.png"); emmaQuietTimer = setTimeout(() => setEmmaSpeaking(false), 1250); }
function scheduleEmmaBlink() { clearTimeout(emmaBlinkTimer); emmaBlinkTimer = setTimeout(() => { if (!$("coachStage").classList.contains("speaking")) { showEmmaFrame("/emma-coach-blink.png"); setTimeout(() => showEmmaFrame("/emma-coach.png"), 150); } scheduleEmmaBlink(); }, 3200 + Math.floor(Math.random() * 2200)); }
function addMessage(role, text) { if (!text?.trim()) return; const el = document.createElement("p"); el.className = `message ${role}`; if (role === "coach") { const avatar = document.createElement("img"); avatar.className = "emma-mini"; avatar.src = $("emmaAvatar").src; avatar.alt = "Emma"; const bubble = document.createElement("span"); bubble.textContent = text; el.append(avatar, bubble); } else { el.textContent = text; } messages.append(el); messages.scrollTop = messages.scrollHeight; }
function updateTimer() { const elapsed = Date.now() - startedAt - pausedDuration - (isPaused ? Date.now() - pausedAt : 0); const remaining = Math.max(0, sessionDurationSeconds - Math.floor(elapsed / 1000)); $("timerText").textContent = `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`; timer.style.background = `conic-gradient(#1d8b71 ${(sessionDurationSeconds - remaining) / sessionDurationSeconds * 360}deg,#dcece7 0deg)`; if (!remaining) finishSession(); }

async function startSession() {
  if (hasActiveConversation()) { if (isPaused) togglePause(); return; }
  refreshSpeakingGoal();
  let phase = "Mikrofon";
  try {
    if (sessionWasEvaluated) { transcript = []; sessionWasEvaluated = false; }
    isPaused = false; pausedAt = 0; pausedDuration = 0; $("coachStage").classList.remove("paused");
    setFinishLabel();
    startButton.disabled = true; startButton.textContent = "🎙 Aufnahme wird vorbereitet …"; status.textContent = "Mikrofon wird verbunden …"; setMicState("Mikrofon wird vorbereitet …");
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new Error("Das Mikrofon ist in dieser App-Ansicht nicht verfügbar.");
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    phase = "Sprachverbindung";
    status.textContent = "Sprachverbindung wird hergestellt …";
    pc = new RTCPeerConnection();
    pc.ontrack = (event) => { remoteAudio = new Audio(); remoteAudio.autoplay = true; remoteAudio.srcObject = event.streams[0]; remoteAudio.onplaying = () => setEmmaSpeaking(true); remoteAudio.onpause = () => setEmmaSpeaking(false); };
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    dataChannel = pc.createDataChannel("oai-events");
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

function handleEvent(event) {
  if (event.type === "response.output_audio.delta" || event.type === "response.output_audio_transcript.delta" || event.type === "response.created") { if (!isPaused) { setMicState("Ich antworte gerade …"); setEmmaSpeaking(true); } }
  if (event.type === "conversation.item.input_audio_transcription.completed") { transcript.push({ role:"learner", text:event.transcript }); addMessage("learner", event.transcript); setMicState("Ich höre dir zu.", true); }
  if (event.type === "response.output_audio_transcript.done") { transcript.push({ role:"coach", text:event.transcript }); addMessage("coach", event.transcript); setEmmaSpeaking(false); if (!isPaused) setMicState("Ich höre dir zu.", true); }
  if (event.type === "error") status.textContent = event.error?.message || "Ein Verbindungsfehler ist aufgetreten.";
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
  clearInterval(interval); isPaused = false; setEmmaSpeaking(false); $("coachStage").classList.remove("paused"); pauseButton.disabled = true; finishButton.disabled = true; finishButton.textContent = "Karten werden erstellt …"; startButton.textContent = "Gespräch beendet"; setMicState("Gespräch wird ausgewertet …"); stream?.getTracks().forEach((t) => t.stop()); pc?.close();
  if (!transcript.length) { status.textContent = "Noch kein Gespräch zum Auswerten. Versuch es noch einmal."; startButton.disabled = false; startButton.textContent = "🎙 Gespräch starten"; finishButton.textContent = "Gespräch beenden & Karten erstellen"; return; }
  status.textContent = "Ich erstelle deine persönlichen Karten …";
  try { const response = await fetch("/api/flashcards", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ transcript }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); const newCards = normaliseCards(data.cards); if (!newCards.length) throw new Error("Aus diesem Gespräch konnte ich noch keine passenden Karten ableiten."); cards = [...cards, ...newCards]; rememberFocus(data.focus); saveCards(); recordCompletedSession(); sessionWasEvaluated = true; status.textContent = `${newCards.length} neue Karten sind bereit.`; startButton.disabled = false; startButton.textContent = "🎙 Weiter sprechen"; setMicState("Du kannst weiter sprechen oder deine Karten üben."); showSummary(newCards.length, cleanFocus(data.focus).length); } catch(error) { status.textContent = error.message; startButton.disabled = false; startButton.textContent = "🎙 Weiter sprechen"; setMicState("Du kannst das Gespräch fortsetzen."); }
}

function showSummary(cardCount, focusCount) { $("practice").classList.add("hidden"); $("summary").classList.remove("hidden"); const minutes = Math.max(1, Math.round((Date.now() - startedAt - pausedDuration) / 60000)); const focus = cleanFocus(learningProfile.focus); $("summaryText").textContent = `Du hast ${minutes} Minuten Englisch gesprochen.`; $("summaryMinutes").textContent = minutes; $("summaryCards").textContent = cardCount; $("summaryFocus").textContent = focusCount; const topics = $("summaryTopics"); topics.replaceChildren(); (focus.length ? focus : [{ pattern:"Freies Sprechen" }]).forEach((item) => { const chip = document.createElement("span"); chip.className = "summary-topic"; chip.textContent = item.pattern; topics.append(chip); }); const focusCard = $("summaryFocusCard"), first = focus[0]; $("summaryFocusText").textContent = first ? `Dein nächster Fokus: ${first.pattern}. ${first.practice}` : "Heute ging es vor allem darum, frei und verständlich zu sprechen."; focusCard.classList.remove("hidden"); }
function showHome() { document.body.classList.remove("in-conversation"); $("practice").classList.add("hidden"); $("summary").classList.add("hidden"); $("cards").classList.add("hidden"); $("statistics").classList.add("hidden"); $("profile").classList.add("hidden"); $("home").classList.remove("hidden"); }
function showPractice() { document.body.classList.add("in-conversation"); $("home").classList.add("hidden"); $("summary").classList.add("hidden"); $("cards").classList.add("hidden"); $("statistics").classList.add("hidden"); $("profile").classList.add("hidden"); $("practice").classList.remove("hidden"); }
function showReview(includeAll = false) { reviewHistory = []; assessedCards.clear(); document.body.classList.remove("in-conversation"); $("home").classList.add("hidden"); $("practice").classList.add("hidden"); $("summary").classList.add("hidden"); $("statistics").classList.add("hidden"); $("profile").classList.add("hidden"); $("cards").classList.remove("hidden"); const lesson = dailyLesson(); queue = prioritiseCards(cards.filter(c => c.nextReviewAt <= Date.now() && !lesson.completed.includes(c.id))).slice(0, Math.max(0, dailyCardLimit - lesson.completed.length)); renderCard(); }
function fillInsightList(id, items, kind) { const list = $(id); list.replaceChildren(); items.forEach((item) => { const row = document.createElement("li"); row.textContent = item; row.className = kind; list.append(row); }); }
function showStatistics() { document.body.classList.remove("in-conversation"); $("home").classList.add("hidden"); $("practice").classList.add("hidden"); $("summary").classList.add("hidden"); $("cards").classList.add("hidden"); $("profile").classList.add("hidden"); $("statistics").classList.remove("hidden"); const known = cards.filter((card) => Number(card.knownStreak || 0) > 0).length; const focus = cleanFocus(learningProfile.focus); $("statConversations").textContent = Number(learningStats.conversations || 0); $("statMinutes").textContent = Number(learningStats.minutes || 0); $("statCards").textContent = known; $("statStreak").textContent = `${learningStreak(learningStats.practiceDays)} Tage`; const strengths = []; if (Number(learningStats.conversations || 0)) strengths.push("Regelmäßig sprechen"); if (known) strengths.push("Karten wiederholen"); if (cards.length) strengths.push("Eigene Sätze lernen"); fillInsightList("strengthList", strengths.length ? strengths : ["Dein erster Schritt ist gemacht"], "strength"); fillInsightList("workList", focus.length ? focus.map((item) => item.pattern) : ["Freies Sprechen", "Neue Wörter festigen"], "work"); }
function showProfile() { document.body.classList.remove("in-conversation"); $("home").classList.add("hidden"); $("practice").classList.add("hidden"); $("summary").classList.add("hidden"); $("cards").classList.add("hidden"); $("statistics").classList.add("hidden"); $("profile").classList.remove("hidden"); }
function renderCard() { const card = queue[0]; answerVisible = false; $("revealButton").classList.add("hidden"); $("listenButton").classList.add("hidden"); $("ratingButtons").classList.add("hidden"); $("speakPrompt").classList.add("hidden"); $("recordAnswerButton").classList.add("hidden"); $("voiceFeedback").className = "voice-feedback hidden"; if (!card) { $("card").innerHTML = "<strong>Alles geschafft.</strong><small>Deine nächste Wiederholung erscheint hier automatisch.</small>"; return; } $("card").innerHTML = `<span>🇩🇪 ${escapeHtml(card.front)}</span>`; $("speakPrompt").classList.remove("hidden"); $("recordAnswerButton").classList.remove("hidden"); $("recordAnswerButton").disabled = false; $("recordAnswerButton").textContent = "🎙 Antwort sprechen"; $("revealButton").classList.remove("hidden"); }
function revealAnswer() { const card = queue[0]; if (!card || answerVisible) return; answerVisible = true; $("card").innerHTML = `<span>🇩🇪 ${escapeHtml(card.front)}</span><span class="back">🇬🇧 ${escapeHtml(card.back)}</span><small>${escapeHtml(card.note || "")}</small>`; $("revealButton").classList.add("hidden"); $("recordAnswerButton").classList.add("hidden"); $("listenButton").classList.remove("hidden"); $("ratingButtons").classList.remove("hidden"); }
function speakAnswer() { const card = queue[0]; if (!card || !window.speechSynthesis) return; speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(card.back); utterance.lang = "en-GB"; utterance.rate = 0.85; speechSynthesis.speak(utterance); }
function audioBase64(blob) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(",")[1]); reader.onerror = reject; reader.readAsDataURL(blob); }); }
async function reviewRecordedAnswer(blob) { const card = queue[0]; if (!card) return; const button = $("recordAnswerButton"); button.textContent = "Antwort wird geprüft …"; button.disabled = true; try { const audio = await audioBase64(blob); const response = await fetch("/api/card-answer", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ audio, mime:blob.type || "audio/webm", expected:card.back, front:card.front }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Die Aufnahme konnte nicht geprüft werden."); const rating = { correct:"yes", close:"hard", incorrect:"no" }[data.result]; if (!rating) throw new Error("Die Bewertung war nicht eindeutig. Bitte sprich die Antwort noch einmal."); if (!assessedCards.has(card.id)) { const updated = rateCard(card, rating); cards = cards.map((item) => item.id === card.id ? updated : item); assessedCards.set(card.id, data.result); saveCards(); } const feedback = $("voiceFeedback"); feedback.className = `voice-feedback ${data.result}`; feedback.textContent = `Du hast gesagt: “${data.transcript}”\n${data.feedback}\nDie Wiederholung ist automatisch geplant.`; revealAnswer(); } catch (error) { $("voiceFeedback").className = "voice-feedback incorrect"; $("voiceFeedback").textContent = error.message || "Die Aufnahme konnte nicht geprüft werden."; button.textContent = "🎙 Noch einmal sprechen"; } finally { button.disabled = false; } }
async function recordAnswer() { try { if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error("Die Mikrofonaufnahme wird auf diesem Gerät nicht unterstützt."); reviewStream = await navigator.mediaDevices.getUserMedia({ audio:true }); if (!answerHeld) { reviewStream.getTracks().forEach((track) => track.stop()); return; } reviewChunks = []; reviewRecorder = new MediaRecorder(reviewStream); reviewRecorder.ondataavailable = (event) => { if (event.data.size) reviewChunks.push(event.data); }; reviewRecorder.onstop = () => { stopReviewMeter(); reviewStream?.getTracks().forEach((track) => track.stop()); reviewRecordedAnswer(new Blob(reviewChunks, { type:reviewRecorder.mimeType || "audio/webm" })); }; reviewRecorder.start(); startReviewMeter(reviewStream); } catch (error) { stopReviewMeter(); reviewStream?.getTracks().forEach((track) => track.stop()); $("voiceFeedback").className = "voice-feedback incorrect"; $("voiceFeedback").textContent = error.message || "Das Mikrofon konnte nicht gestartet werden."; } }
function escapeHtml(text) { const el=document.createElement("span"); el.textContent=text; return el.innerHTML; }
document.querySelectorAll("[data-rating]").forEach((button) => button.addEventListener("click", () => { if (!queue[0]) return; const updated=rateCard(queue[0], button.dataset.rating); cards=cards.map(c=>c.id===updated.id?updated:c); queue.shift(); saveCards(); renderCard(); }));
document.querySelectorAll("[data-home-mode]").forEach((button) => button.addEventListener("click", () => { $("conversationMode").value = button.dataset.homeMode; document.querySelectorAll("[data-home-mode]").forEach((tile) => tile.classList.toggle("active", tile === button)); }));
$("homeStartButton").addEventListener("click", () => { showPractice(); if (!hasActiveConversation()) startSession(); });
$("homeSettingsButton").addEventListener("click", showProfile);
$("homeDetailsButton").addEventListener("click", showStatistics);
updateHomeProgress();
refreshSpeakingGoal();
$("conversationCardsButton").addEventListener("click", () => { if (stream?.getAudioTracks().some((track) => track.readyState === "live") && !isPaused) togglePause(); showReview(true); });
$("subtitleButton").addEventListener("click", () => { const visible = $("subtitleButton").getAttribute("aria-pressed") !== "true"; $("subtitleButton").setAttribute("aria-pressed", String(visible)); $("practice").classList.toggle("subtitles-off", !visible); messages.setAttribute("aria-hidden", String(!visible)); });
startButton.addEventListener("click", startSession); pauseButton.addEventListener("click", togglePause); finishButton.addEventListener("click", finishSession); $("conversationBackButton").addEventListener("click", () => { if (stream && !isPaused) togglePause(); showHome(); }); $("conversationSettingsButton").addEventListener("click", () => $("modePicker").classList.toggle("hidden")); $("keyboardButton").addEventListener("click", () => { status.textContent = "Sprich einfach weiter – die Tastatur kommt als Nächstes."; }); $("summaryBackButton").addEventListener("click", showHome); $("summaryCloseButton").addEventListener("click", showHome); $("statisticsBackButton").addEventListener("click", showHome); $("profileBackButton").addEventListener("click", showHome); $("continueButton").addEventListener("click", () => { showPractice(); startSession(); }); $("homeNavButton").addEventListener("click", showHome); $("cardsNavButton").addEventListener("click", () => showReview(true)); $("progressNavButton").addEventListener("click", showStatistics); $("profileNavButton").addEventListener("click", showProfile); $("statisticsHomeButton").addEventListener("click", showHome); $("statisticsCardsButton").addEventListener("click", () => showReview(true)); $("statisticsProfileButton").addEventListener("click", showProfile); $("cardsHomeButton").addEventListener("click", showHome); $("cardsProgressButton").addEventListener("click", showStatistics); $("cardsProfileButton").addEventListener("click", showProfile); $("profileHomeButton").addEventListener("click", showHome); $("profileCardsButton").addEventListener("click", () => showReview(true)); $("profileProgressButton").addEventListener("click", showStatistics); $("toCardsButton").addEventListener("click", () => showReview(true)); $("recordAnswerButton").addEventListener("click", recordAnswer); $("revealButton").addEventListener("click", revealAnswer); $("listenButton").addEventListener("click", speakAnswer); $("backToPractice").addEventListener("click", showPractice); updateDue(); updateFocusHint(); scheduleEmmaBlink();
