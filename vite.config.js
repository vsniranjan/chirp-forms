import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { offlinePlugin } from './scripts/offline-plugin.js';

// HTTPS is required for getUserMedia (mic) on phones over LAN; accept the self-signed cert once per phone.
export default defineConfig({
  base: './',
  plugins: [basicSsl(), offlinePlugin()],
  server: { host: true, port: 5173 },
  preview: { host: true, port: 5174 },
});
