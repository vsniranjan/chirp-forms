import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

// Inspect the final output so copied assets and any separate WASM files are cached too.
export function offlinePlugin() {
  let output;
  return {
    name: 'chirp-offline',
    apply: 'build',
    configResolved(config) {
      output = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const files = [];
      function collect(directory, prefix = '') {
        for (const entry of readdirSync(directory, { withFileTypes: true })) {
          const name = prefix + entry.name;
          if (entry.isDirectory()) collect(join(directory, entry.name), `${name}/`);
          else if (name !== 'sw.js') files.push(name);
        }
      }
      collect(output);
      files.sort();
      const version = createHash('sha256').update('chirp-offline-v1');
      for (const name of files) version.update(name).update(readFileSync(join(output, name)));
      writeFileSync(join(output, 'sw.js'), `const CACHE = 'chirp-app-${version.digest('hex').slice(0, 16)}';
const ASSETS = ${JSON.stringify(['./', ...files.map((file) => `./${file}`)])};
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(ASSETS);
  })());
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith('chirp-app-') && key !== CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(event.request.mode === 'navigate' ? './' : event.request);
    return cached || fetch(event.request);
  })());
});
`);
    },
  };
}
