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
  },
  head: {
    title: 'famuse — Private Family Hub',
    titleTemplate: '%s · famuse',
    htmlAttrs: { lang: 'en' },
  },
});
