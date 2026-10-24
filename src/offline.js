export function prepareOffline() {
  const notice = document.createElement('p');
  notice.className = 'stat offline-notice';
  notice.setAttribute('role', 'status');
  notice.setAttribute('aria-live', 'polite');
  document.querySelector('#app').after(notice);
  if (import.meta.env.DEV) {
    notice.textContent = 'Development mode · offline loading is available in the production build.';
    return;
  }
  if (!('serviceWorker' in navigator)) {
    notice.textContent = 'Offline loading is unavailable in this browser. Your saved cards remain on this phone.';
    return;
  }
  notice.textContent = 'Saving the app for offline use…';
  register().catch(() => {
    notice.textContent = 'Could not save the app for offline use. Reconnect and reload from a trusted HTTPS address.';
  });

  async function register() {
    const registration = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
    const installing = registration.installing;
    if (installing) {
      await new Promise((done, fail) => {
        const update = () => {
          if (installing.state === 'installed' || installing.state === 'activated') done();
          if (installing.state === 'redundant') fail(new Error('Offline download failed'));
        };
        installing.addEventListener('statechange', update);
        update();
      });
    }
    await navigator.serviceWorker.ready;
    notice.textContent = 'Saved for offline use · ready for airplane mode.';
    if (registration.waiting) notice.textContent = 'App update saved · close all Chirp tabs and reopen to use it.';
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          notice.textContent = 'App update saved · close all Chirp tabs and reopen to use it.';
        }
      });
    });
  }
}
