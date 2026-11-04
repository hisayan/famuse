import { defineConfig } from 'void/config';

export default defineConfig({
  worker: {
    compatibility_date: '2026-02-24',
  },
  auth: {
    providers: ['email'],
  },
  cloudflare: {
    name: 'famuse',
    account_id: '2700f41fbc8305c6c963e2aac1fffde8',
    // Traffic attachment published on the first deploy. Declared so later
    // deploys can verify nothing dashboard-managed changed (deploy refuses
    // to republish otherwise).
    workers_dev: true,
    preview_urls: false,
    routes: [],
  },
  head: {
    title: 'famuse — Private Family Hub',
    titleTemplate: '%s · famuse',
    htmlAttrs: { lang: 'en' },
    meta: [
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, viewport-fit=cover',
      },
    ],
  },
});
