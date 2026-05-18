import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://www.francoispeyret.fr',
  server: {
    port: 4321,
    host: true,
  },
});
