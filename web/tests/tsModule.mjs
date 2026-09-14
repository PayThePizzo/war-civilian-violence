import { readFileSync } from "node:fs";
import ts from "typescript";

// Use the installed TypeScript compiler to exercise the same source modules in
// Node, replacing only Vite's base URL and module-resolution conventions.
const modules = new Map();

/** Transpile a local .ts file (and its local dependencies, recursively) to an importable data: URL. */
export function moduleUrl(file, base = "./") {
  const key = `${file.href}:${base}`;
  if (modules.has(key)) return modules.get(key);
  let code = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
  }).outputText;
  code = code.replaceAll("import.meta.env.BASE_URL", JSON.stringify(base));
  code = code.replace(/from "([^"]+)"/g, (_, specifier) => {
    const dependency = specifier.startsWith(".")
      ? moduleUrl(new URL(`${specifier}.ts`, file), base)
      : import.meta.resolve(specifier);
    return `from ${JSON.stringify(dependency)}`;
  });
  const url = `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
  modules.set(key, url);
  return url;
}
