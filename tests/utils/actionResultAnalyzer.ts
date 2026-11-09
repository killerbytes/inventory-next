import path from "path";
import ts from "typescript";

/**
 * Static guard for server-action results.
 *
 * `createProtectedAction` never throws: failures come back as
 * `{ success: false, error }`. A caller that discards the result, never reads
 * `.success`, or types it as `any` silently treats failures as successes.
 * Detection is type-based (callee declared in an actions file and returning
 * something with a `success` property), so new actions are covered without
 * maintaining a list.
 */

export type ActionResultRule = "R1" | "R2" | "R3";

export interface ActionResultViolation {
  rule: ActionResultRule;
  file: string;
  line: number;
  callee: string;
  message: string;
}

export const RULE_HELP: Record<ActionResultRule, string> = {
  R1: "Action result is discarded. Assign it and handle failure: `const res = await xAction(...); if (!res.success) { toast.error(res.error); return; }`.",
  R2: "Action result is used without checking `.success`. Check `res.success` before reading `res.data` or reporting success.",
  R3: "Action result is typed `any`, which hides its ActionResult shape. Remove the annotation and let TypeScript infer it.",
};

export function createProjectProgram(
  rootDir: string,
  fileFilter: (fileName: string) => boolean,
): ts.Program {
  const configPath = path.join(rootDir, "tsconfig.json");
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, rootDir);
  const rootNames = parsed.fileNames.filter((f) => fileFilter(path.normalize(f)));
  return ts.createProgram(rootNames, {
    ...parsed.options,
    noEmit: true,
    incremental: false,
  });
}

export function analyzeActionResultUsage(
  program: ts.Program,
  options: {
    /** Files whose call sites are checked. */
    isCallerFile: (fileName: string) => boolean;
    /** Files whose exports count as server actions. */
    isActionFile: (fileName: string) => boolean;
    rootDir: string;
  },
): ActionResultViolation[] {
  const checker = program.getTypeChecker();
  const violations: ActionResultViolation[] = [];

  const resolveSymbol = (node: ts.Node): ts.Symbol | undefined => {
    let symbol = checker.getSymbolAtLocation(node);
    if (symbol && symbol.flags & ts.SymbolFlags.Alias) {
      symbol = checker.getAliasedSymbol(symbol);
    }
    return symbol;
  };

  const isActionCall = (call: ts.CallExpression): boolean => {
    const callee = ts.isPropertyAccessExpression(call.expression)
      ? call.expression.name
      : call.expression;
    const symbol = resolveSymbol(callee);
    const decl = symbol?.declarations?.[0];
    if (!decl || !options.isActionFile(path.normalize(decl.getSourceFile().fileName))) {
      return false;
    }
    const returned = checker.getAwaitedType(checker.getTypeAtLocation(call));
    return !!returned && hasSuccessProperty(returned);
  };

  const hasSuccessProperty = (type: ts.Type): boolean => {
    const members = type.isUnion() ? type.types : [type];
    return members.some((t) => !!checker.getPropertyOfType(t, "success"));
  };

  const isAnyAnnotation = (t: ts.TypeNode | undefined) =>
    !!t && t.kind === ts.SyntaxKind.AnyKeyword;

  /** True when `.success` is read on `name`'s symbol somewhere inside `scope`. */
  const successIsChecked = (name: ts.Identifier, scope: ts.Node): boolean => {
    const target = checker.getSymbolAtLocation(name);
    let found = false;
    const visit = (n: ts.Node) => {
      if (found) return;
      if (
        ts.isPropertyAccessExpression(n) &&
        n.name.text === "success" &&
        ts.isIdentifier(n.expression) &&
        checker.getSymbolAtLocation(n.expression) === target
      ) {
        found = true;
        return;
      }
      ts.forEachChild(n, visit);
    };
    visit(scope);
    return found;
  };

  const bindingChecksSuccess = (binding: ts.BindingName, scope: ts.Node): boolean => {
    if (ts.isIdentifier(binding)) return successIsChecked(binding, scope);
    if (ts.isObjectBindingPattern(binding)) {
      return binding.elements.some(
        (el) => ((el.propertyName ?? el.name) as ts.Identifier).text === "success",
      );
    }
    return false;
  };

  const enclosingScope = (node: ts.Node): ts.Node => {
    let cur: ts.Node | undefined = node.parent;
    while (cur && !ts.isFunctionLike(cur) && !ts.isSourceFile(cur)) cur = cur.parent;
    return cur ?? node.getSourceFile();
  };

  const report = (
    rule: ActionResultRule,
    call: ts.CallExpression,
    sf: ts.SourceFile,
  ) => {
    const { line } = sf.getLineAndCharacterOfPosition(call.getStart(sf));
    violations.push({
      rule,
      file: path.relative(options.rootDir, sf.fileName).replace(/\\/g, "/"),
      line: line + 1,
      callee: call.expression.getText(sf),
      message: RULE_HELP[rule],
    });
  };

  const checkCall = (call: ts.CallExpression, sf: ts.SourceFile) => {
    // Walk up from the call to the node that actually consumes the result.
    let node: ts.Node = call;
    for (;;) {
      const parent = node.parent;
      if (ts.isParenthesizedExpression(parent) || ts.isAwaitExpression(parent)) {
        node = parent;
        continue;
      }
      if (
        ts.isConditionalExpression(parent) &&
        (parent.whenTrue === node || parent.whenFalse === node)
      ) {
        node = parent;
        continue;
      }
      if (
        ts.isPropertyAccessExpression(parent) &&
        parent.expression === node &&
        ts.isCallExpression(parent.parent) &&
        parent.parent.expression === parent
      ) {
        const method = parent.name.text;
        if (method === "then") {
          const cb = parent.parent.arguments[0];
          if (!cb || !(ts.isArrowFunction(cb) || ts.isFunctionExpression(cb))) {
            return report("R2", call, sf);
          }
          const param = cb.parameters[0];
          if (!param) return report("R1", call, sf);
          if (isAnyAnnotation(param.type)) return report("R3", call, sf);
          if (!bindingChecksSuccess(param.name, cb)) return report("R2", call, sf);
          return;
        }
        if (method === "catch" || method === "finally") {
          // These pass the result through; keep following the chain.
          node = parent.parent;
          continue;
        }
      }
      break;
    }

    const parent = node.parent;
    if (ts.isExpressionStatement(parent) || ts.isVoidExpression(parent)) {
      return report("R1", call, sf);
    }
    if (ts.isVariableDeclaration(parent) && parent.initializer === node) {
      if (isAnyAnnotation(parent.type)) return report("R3", call, sf);
      if (!bindingChecksSuccess(parent.name, enclosingScope(parent))) {
        return report("R2", call, sf);
      }
      return;
    }
    if (ts.isAsExpression(parent) && isAnyAnnotation(parent.type)) {
      return report("R3", call, sf);
    }
    if (ts.isPropertyAccessExpression(parent) && parent.expression === node) {
      if (parent.name.text !== "success") report("R2", call, sf);
      return;
    }
    // Returning the result hands responsibility to the caller, whose own type is
    // ActionResult and is checked there. Anything else is unrecognized: flag it
    // so a human decides instead of letting it slip through.
    if (ts.isReturnStatement(parent) || ts.isArrowFunction(parent)) return;
    report("R2", call, sf);
  };

  for (const sf of program.getSourceFiles()) {
    if (sf.isDeclarationFile) continue;
    if (!options.isCallerFile(path.normalize(sf.fileName))) continue;
    const visit = (n: ts.Node) => {
      if (ts.isCallExpression(n) && isActionCall(n)) checkCall(n, sf);
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }

  return violations;
}

/**
 * Every export of an actions file must be built with `createProtectedAction`, so
 * all actions share one failure contract (return, never throw).
 */
export function findUnprotectedActionExports(
  program: ts.Program,
  options: { isActionFile: (fileName: string) => boolean; allow: string[]; rootDir: string },
): { file: string; name: string }[] {
  const found: { file: string; name: string }[] = [];
  for (const sf of program.getSourceFiles()) {
    if (!options.isActionFile(path.normalize(sf.fileName))) continue;
    const file = path.relative(options.rootDir, sf.fileName).replace(/\\/g, "/");
    const isExported = (n: ts.Node) =>
      ts.canHaveModifiers(n) &&
      !!ts.getModifiers(n)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);

    for (const stmt of sf.statements) {
      if (!isExported(stmt)) continue;
      if (ts.isFunctionDeclaration(stmt) && stmt.name) {
        if (!options.allow.includes(stmt.name.text)) {
          found.push({ file, name: stmt.name.text });
        }
      } else if (ts.isVariableStatement(stmt)) {
        for (const decl of stmt.declarationList.declarations) {
          const name = decl.name.getText(sf);
          const init = decl.initializer;
          const protectedCall =
            !!init &&
            ts.isCallExpression(init) &&
            init.expression.getText(sf) === "createProtectedAction";
          if (!protectedCall && !options.allow.includes(name)) {
            found.push({ file, name });
          }
        }
      }
    }
  }
  return found;
}
