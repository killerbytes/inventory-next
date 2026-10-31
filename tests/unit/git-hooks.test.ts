import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Git Hooks Configuration', () => {
  const rootDir = process.cwd();
  const packageJsonPath = path.join(rootDir, 'package.json');
  const preCommitHookPath = path.join(rootDir, '.husky', 'pre-commit');
  const prePushHookPath = path.join(rootDir, '.husky', 'pre-push');

  it('should have husky prepare script in package.json', () => {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    expect(packageJson.scripts).toBeDefined();
    expect(packageJson.scripts.prepare).toBe('husky');
  });

  it('should have .husky/pre-commit configured with type-check and test:unit', () => {
    expect(fs.existsSync(preCommitHookPath)).toBe(true);
    const content = fs.readFileSync(preCommitHookPath, 'utf8');
    expect(content).toContain('npm run type-check');
    expect(content).toContain('npm run test:unit');
  });

  it('should have .husky/pre-push configured with full npm test', () => {
    expect(fs.existsSync(prePushHookPath)).toBe(true);
    const content = fs.readFileSync(prePushHookPath, 'utf8');
    expect(content).toContain('npm test');
  });
});

