import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const recordProviderSrcPath = fileURLToPath(new URL('apps/record-provider/src', import.meta.url));
const recordCoreSrcPath = fileURLToPath(new URL('packages/record-core/src', import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
      include: ['apps/record-provider/src/**/*.ts', 'packages/**/src/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.d.ts', '**/index.ts', '**/types.d.ts'],
      thresholds: {
        statements: 76,
        branches: 65,
        functions: 80,
        lines: 77,
      },
    },
  },
  resolve: {
    alias: [
      { find: '@record-provider/record-provider', replacement: recordProviderSrcPath },
      { find: '@record-provider/record-core', replacement: recordCoreSrcPath },
      { find: /^@\//, replacement: `${recordProviderSrcPath}/` },
    ],
  },
});
