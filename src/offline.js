export function prepareOffline() {
  const notice = document.createElement('p');
  notice.className = 'stat offline-notice';
  notice.setAttribute('role', 'status');
  notice.setAttribute('aria-live', 'polite');
  document.querySelector('#app').after(notice);
  if (import.meta.env.DEV) {
    notice.hidden = true;
    return;
  }
  if (!('serviceWorker' in navigator)) {
    notice.textContent = 'Offline loading unavailable. Your cards are still saved.';
    return;
  }
  notice.textContent = 'Preparing offline access…';
  register().catch(() => {
    notice.textContent = 'Offline setup failed. Try reloading online.';
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
    notice.textContent = 'Available offline';
    if (registration.waiting) notice.textContent = 'Update ready. Close Chirp and reopen.';
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          notice.textContent = 'Update ready. Close Chirp and reopen.';
        }
      });
    });
  }
}
