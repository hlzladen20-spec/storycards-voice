// Only a visible, running conversation may keep the screen awake.
const practice = document.getElementById('practice');
let screenLock = null;
let requesting = false;
function needsScreenAwake() {
  return document.visibilityState === 'visible' && practice?.dataset.keepAwake === 'true' && !practice.classList.contains('hidden');
}
async function releaseScreenLock() {
  const previous = screenLock;
  screenLock = null;
  if (previous) await previous.release().catch(() => {});
}
async function keepScreenAwake() {
  if (!needsScreenAwake()) { await releaseScreenLock(); return; }
  if (!('wakeLock' in navigator) || screenLock || requesting) return;
  requesting = true;
  try {
    const acquired = await navigator.wakeLock.request('screen');
    screenLock = acquired;
    acquired.addEventListener('release', () => { if (screenLock === acquired) screenLock = null; });
    if (!needsScreenAwake()) await releaseScreenLock();
  } catch { /* Battery-saving policies can prevent a screen wake lock. */ }
  finally { requesting = false; }
}
if (practice) new MutationObserver(keepScreenAwake).observe(practice, {attributes:true,attributeFilter:['class','data-keep-awake']});
document.addEventListener('visibilitychange', keepScreenAwake);
window.addEventListener('pageshow', keepScreenAwake);
window.addEventListener('pagehide', releaseScreenLock);
document.addEventListener('pointerdown', keepScreenAwake, { passive:true });
document.addEventListener('keydown', keepScreenAwake);
keepScreenAwake();
