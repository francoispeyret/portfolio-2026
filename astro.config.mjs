import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://francoispeyret.github.io',
  base: '/portfolio-2026',
  outDir: './docs',
  server: {
    port: 4321,
    host: true,
  },
});
