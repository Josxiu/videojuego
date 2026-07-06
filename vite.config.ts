import { defineConfig } from 'vite';

export default defineConfig({
  // Ruta relativa para que funcione en GitHub Pages (subcarpeta /videojuego/)
  base: './',
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1600,
  },
});
