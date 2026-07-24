import { defineConfig } from 'vitest/config';

// Server-side unit tests only (no DOM). Tests live next to the code they cover.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts', 'src/**/*.test.ts'],
  },
});
