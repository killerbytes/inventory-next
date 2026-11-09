import path from "path";
import {
  analyzeActionResultUsage,
  createProjectProgram,
  findUnprotectedActionExports,
} from "../utils/actionResultAnalyzer";

/**
 * Project-wide guard, run by the pre-commit hook via test:unit.
 *
 * Server actions never throw; they return `{ success: false, error }`. Callers
 * that discard the result or skip `.success` report failures as successes
 * (e.g. "Payment recorded" when nothing was saved). See CLAUDE.md
 * "Consuming action results".
 */

const rootDir = path.resolve(__dirname, "../..");
const srcDir = path.normalize(path.join(rootDir, "src"));
const actionsDir = path.normalize(path.join(srcDir, "server/actions"));
const isActionFile = (f: string) =>
  f.startsWith(actionsDir) && f.endsWith(".actions.ts");

/** Run before a session exists, so they can't use createProtectedAction. */
const UNPROTECTED_ALLOWED = ["loginAction", "logoutAction"];

const program = createProjectProgram(rootDir, (f) => f.startsWith(srcDir));

// Type-checking all of src takes ~3s alone and longer under the parallel suite.
const TYPECHECK_TIMEOUT_MS = 60_000;

describe("server action result guard", () => {
  it("every action caller handles the failure result instead of assuming success", () => {
    const violations = analyzeActionResultUsage(program, {
      rootDir,
      isActionFile,
      isCallerFile: (f) => f.startsWith(srcDir) && !f.startsWith(actionsDir),
    });

    const report = violations
      .map((v) => `${v.file}:${v.line} [${v.rule}] ${v.callee}\n    ${v.message}`)
      .join("\n");
    expect(violations, `\n${report}\n`).toEqual([]);
  }, TYPECHECK_TIMEOUT_MS);

  it("every action is built with createProtectedAction so failures are returned, never thrown", () => {
    const found = findUnprotectedActionExports(program, {
      rootDir,
      isActionFile,
      allow: UNPROTECTED_ALLOWED,
    });

    const report = found.map((f) => `${f.file}: ${f.name}`).join("\n");
    expect(found, `\n${report}\n`).toEqual([]);
  });
});
