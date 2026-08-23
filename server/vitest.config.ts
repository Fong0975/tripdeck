import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
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
