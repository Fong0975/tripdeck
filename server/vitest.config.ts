import path from 'path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      // Resolve the shared package from source so tests don't depend on a
      // prior `npm run build -w shared`; tsc and tsx still use its dist.
      '@tripdeck/shared': path.resolve(__dirname, '../shared/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    pool: 'threads',
    clearMocks: true,
    include: ['src/**/*.test.ts'],
    reporters: process.env.CI ? ['default', 'json'] : ['default'],
    outputFile: process.env.CI ? { json: './test-results.json' } : undefined,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary', 'json'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/index.ts',
        'src/test-utils/**',
        'src/**/__mocks__/**',
        'src/index.ts',
        'src/routes/**',
        'src/config/database.ts',
        'src/db/schema/**',
        'src/types/**',
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});
