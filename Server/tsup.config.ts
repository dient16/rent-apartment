import { defineConfig } from 'tsup';

export default defineConfig({
  // Only TypeScript sources: src/data/** (JSON + README) is read at runtime from disk, not bundled.
  entry: ['src/**/*.ts'],
  splitting: false,
  sourcemap: true,
  clean: true,
});
