import { defineConfig } from 'vite';

// Relative asset paths, so the built site works from any sub-path
// (e.g. https://<user>.github.io/<repo>/) as well as from a domain root.
export default defineConfig({
  base: './',
});
