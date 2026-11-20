// Keep every visible app screen awake; release when the app is backgrounded.
let screenLock = null;
let requesting = false;
function needsScreenAwake() {
  return document.visibilityState === 'visible';
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
document.addEventListener('visibilitychange', keepScreenAwake);
window.addEventListener('pageshow', keepScreenAwake);
window.addEventListener('pagehide', releaseScreenLock);
document.addEventListener('pointerdown', keepScreenAwake, { passive:true });
document.addEventListener('keydown', keepScreenAwake);
keepScreenAwake();
