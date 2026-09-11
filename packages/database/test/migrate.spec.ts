import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveMigrationsFolder } from '../src/migrate';

/**
 * `resolveMigrationsFolder` is called with the directory of the *running* module
 * (`src/` under tsx, `dist/` in production) and must always land on the package's
 * `migrations/` folder.
 */
describe('migration folder resolution', () => {
  const packageRoot = path.resolve(__dirname, '..');

  it('resolves migrations/ from the source layout', () => {
    expect(resolveMigrationsFolder(path.join(packageRoot, 'src'))).toBe(
      path.join(packageRoot, 'migrations'),
    );
  });

  it('resolves the same folder from the compiled layout', () => {
    expect(resolveMigrationsFolder(path.join(packageRoot, 'dist'))).toBe(
      path.join(packageRoot, 'migrations'),
    );
  });

  it('fails loudly when migrations have not been generated', () => {
    expect(() => resolveMigrationsFolder('/tmp/definitely-not-a-package/src')).toThrow(
      /Migrations folder not found/,
    );
  });
});
