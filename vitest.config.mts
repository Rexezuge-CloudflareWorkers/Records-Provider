import { fileURLToPath } from 'node:url';
import { defineUnitVitestConfig } from '@rexezuge/tooling/vitest';

/**
 * The unit suite: resolver and coverage floors.
 *
 * The alias table, the `cloudflare:*` mocks and the inlining that keeps
 * `@rexezuge/*` inside Vite's pipeline all come from the kit factory, derived
 * from `scope` and this repo's package list. Two entries stay local:
 * `record-provider` is aliased by hand because the factory only knows
 * `apps/background` as an app it can reach by name, and the coverage floors are
 * this repo's own measurement.
 */
export default defineUnitVitestConfig({
  scope: '@record-provider',
  packages: ['record-core'],
  aliases: [{ find: '@record-provider/record-provider', replacement: fileURLToPath(new URL('apps/record-provider/src', import.meta.url)) }],
  root: new URL('.', import.meta.url).href,
  coverageInclude: ['apps/record-provider/src/**/*.ts', 'packages/**/src/**/*.ts'],
  /**
   * The measured actuals from `pnpm run test:coverage`, with the SDK adoption
   * raising them from the 76/65/80/77 floors this repo carried before it: every
   * refusal path, both 5xx causes, and the no-op scheduled path have a test, so
   * every statement, branch and function is exercised. The floor is the
   * measurement, not a discount on it — the response to a drop is a test, not a
   * lowered number.
   */
  thresholds: {
    statements: 100,
    branches: 100,
    functions: 100,
    lines: 100,
  },
});
