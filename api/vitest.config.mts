import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['scripts/**/*.spec.ts', 'src/**/*.spec.ts'],
    exclude: ['**/node_modules/**'],
    setupFiles: [
      '../../../tools/vitest/forbid-network.ts',
    ],
    environment: 'node',
  },
});
