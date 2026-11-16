/// <reference types="vitest/config" />
import { readFileSync } from 'fs';
import path from 'path';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8')) as {
  version: string;
};

const NODE_TEST_FILES = [
  'src/api/**/*.test.ts',
  'src/constants/**/*.test.ts',
  'src/utils/{date,duration,connectionAdjacency,uploadLimits}.test.ts',
  'src/utils/weatherApi/**/*.test.ts',
  'src/utils/mapsApi/**/*.test.ts',
  'src/utils/googleMaps/mapPoints.test.ts',
  'src/utils/exportToDocx/dayMapImage/{mapProjection,labelLayout}.test.ts',
  'src/utils/exportToDocx/{attractionTable,constants,dayNotesSection,headerSection,index,markdownToDocx,transportTable}.test.ts',
];

const ENV_DIR = path.resolve(__dirname, '..');
const DEFAULT_API_PORT = '3001';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ENV_DIR, '');
  const apiTarget = `http://localhost:${env.VITE_API_PORT || DEFAULT_API_PORT}`;

  return {
    plugins: [react(), tailwindcss()],
    envDir: ENV_DIR,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@tripdeck/shared': path.resolve(__dirname, '../shared/src/index.ts'),
      },
    },
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    server: {
      proxy: {
        '/api': apiTarget,
        '/uploads': apiTarget,
      },
    },
    test: {
      globals: true,
      css: false,
      pool: 'threads',
      clearMocks: true,
      // Pure-logic suites skip jsdom and the DOM setup file; everything that
      // renders or touches browser globals stays on jsdom.
      projects: [
        {
          extends: true,
          test: {
            name: 'unit',
            environment: 'node',
            include: NODE_TEST_FILES,
          },
        },
        {
          extends: true,
          test: {
            name: 'dom',
            environment: 'jsdom',
            // Building a jsdom environment per file dominated the run time, so
            // files share one per worker. mockReset restores every mock's
            // original implementation between tests so a mockResolvedValue /
            // mockRejectedValue cannot leak into the next test or file.
            isolate: false,
            mockReset: true,
            setupFiles: ['./src/setupTests.ts'],
            include: ['src/**/*.test.{ts,tsx}'],
            exclude: NODE_TEST_FILES,
          },
        },
      ],
      reporters: process.env.CI ? ['default', 'json'] : ['default'],
      outputFile: process.env.CI ? { json: './test-results.json' } : undefined,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html', 'json-summary', 'json'],
        reportsDirectory: './coverage',
        include: ['src/**/*.{ts,tsx}'],
        exclude: [
          'src/**/*.test.{ts,tsx}',
          'src/setupTests.ts',
          'src/test-utils/**',
          'src/**/__mocks__/**',
          'src/main.tsx',
          'src/vite-env.d.ts',
          'src/**/types.ts',
          'src/**/*.d.ts',
          'src/App.tsx',
          'src/types/index.ts',
          'src/components/ui/formStyles.ts',
          'src/utils/storage.ts',
        ],
        thresholds: {
          statements: 80,
          branches: 80,
          functions: 80,
          lines: 80,
        },
      },
    },
  };
});
