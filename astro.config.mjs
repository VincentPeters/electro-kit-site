import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://vincentpeters.github.io',
  base: '/electro-kit-site',
  trailingSlash: 'always',
  build: { format: 'directory' },
});
