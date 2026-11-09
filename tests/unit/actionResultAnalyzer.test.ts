import fs from "fs";
import path from "path";
import {
  analyzeActionResultUsage,
  createProjectProgram,
  findUnprotectedActionExports,
} from "../utils/actionResultAnalyzer";

const rootDir = path.resolve(__dirname, "../..");
const fixtureDir = path.normalize(path.join(rootDir, "tests/fixtures/actionGuard"));
const callerFile = path.join(fixtureDir, "caller.tsx");
const actionsFile = path.join(fixtureDir, "fake.actions.ts");

const program = createProjectProgram(rootDir, (f) => f.startsWith(fixtureDir));

function expectedMarkers(): { line: number; rule: string }[] {
  return fs
    .readFileSync(callerFile, "utf8")
    .split(/\r?\n/)
    .flatMap((text, i) => {
      const m = text.match(/\/\/ expect (R\d)\s*$/);
      return m ? [{ line: i + 1, rule: m[1] }] : [];
    });
}

describe("actionResultAnalyzer", () => {
  it("flags exactly the discarded, unchecked, and any-typed action results", () => {
    const violations = analyzeActionResultUsage(program, {
      rootDir,
      isCallerFile: (f) => f === callerFile,
      isActionFile: (f) => f === actionsFile,
    });

    const actual = violations
      .map((v) => ({ line: v.line, rule: v.rule }))
      .sort((a, b) => a.line - b.line);

    expect(expectedMarkers().length).toBeGreaterThan(0);
    expect(actual).toEqual(expectedMarkers());
  });

  it("flags action exports not built with createProtectedAction, except allowed ones", () => {
    const found = findUnprotectedActionExports(program, {
      rootDir,
      isActionFile: (f) => f === actionsFile,
      // The declared functions are type-only stand-ins for the call-site fixture.
      allow: [
        "allowedFn",
        "createProtectedAction",
        "saveThingAction",
        "listThingsAction",
        "plainHelper",
      ],
    });

    expect(found.map((f) => f.name).sort()).toEqual([
      "unprotected",
      "unprotectedFn",
    ]);
  });
});
