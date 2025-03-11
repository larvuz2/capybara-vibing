import { defineConfig } from 'vite';
import topLevelAwait from 'vite-plugin-top-level-await';
import wasm from 'vite-plugin-wasm';

export default defineConfig({
  plugins: [
    wasm(),
    topLevelAwait({
      promiseExportName: '__tla',
      promiseImportName: i => `__tla_${i}`
    })
  ],
  assetsInclude: ['**/*.glb'],
  build: {
    target: 'esnext',
    // Ensure proper handling of WebAssembly
    rollupOptions: {
      output: {
        manualChunks: {
          rapier: ['@dimforge/rapier3d']
        }
      }
    }
  }
});