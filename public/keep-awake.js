// Keep the screen awake only while StoryCards is visible.
let screenLock = null;
let requesting = false;
async function keepScreenAwake() {
  if (!('wakeLock' in navigator) || document.visibilityState !== 'visible' || screenLock || requesting) return;
  requesting = true;
  try {
    screenLock = await navigator.wakeLock.request('screen');
    screenLock.addEventListener('release', () => { screenLock = null; });
    if (document.visibilityState !== 'visible') await screenLock.release();
  } catch { /* Battery-saving policies can prevent a screen wake lock. */ }
  finally { requesting = false; }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') keepScreenAwake();
  else if (screenLock) screenLock.release().catch(() => {});
});
window.addEventListener('pageshow', keepScreenAwake);
document.addEventListener('pointerdown', keepScreenAwake, { passive:true });
document.addEventListener('keydown', keepScreenAwake);
keepScreenAwake();
