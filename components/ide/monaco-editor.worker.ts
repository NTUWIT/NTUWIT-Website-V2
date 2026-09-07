// Worker entry so the bundler can resolve Monaco's base editor worker from a
// relative path; `new URL()` cannot take a bare package specifier.
//
// The specifier omits `esm/vs/`: monaco-editor's export map already rewrites
// "./*" to "./esm/vs/*", so including it resolves to a path that does not
// exist. Turbopack tolerated the longer form, the production build did not.
import "monaco-editor/editor/editor.worker.js";
