import type { Language } from "@/lib/languages";
import { camel, isDesign, typesIn, type ParamType, type Signature } from "@/lib/problems/signature";
import { CPP, JAVA } from "@/lib/problems/starter";
import { NODE_TYPES, nodeDefinitions, nodeInput } from "./nodes";
import { checkArguments } from "@/lib/problems/validate";

// Deliberately excludes the checker, provided code and hidden arguments.
export type VisualizationSignature = Pick<Signature, "name" | "params" | "returns" | "mutates" | "methods"> & {
  requiresJudge: boolean;
};
export type Visualization = { code: string; embedUrl: string; externalUrl: string };
const LANG: Record<Language, string> = { python: "311", javascript: "js", cpp: "cpp", java: "java" };
const NODES = NODE_TYPES;

export function visualizationUnavailable(sig: VisualizationSignature): string | null {
  if (sig.requiresJudge) return "This problem uses judge-provided helpers. Visualization is not available for it yet; use Run to test your code.";
  return null;
}

function pythonLiteral(value: unknown): string {
  if (value === null) return "None";
  if (typeof value === "boolean") return value ? "True" : "False";
  if (Array.isArray(value)) return `[${value.map(pythonLiteral).join(", ")}]`;
  if (typeof value === "object") return `{${Object.entries(value as object).map(([k, v]) => `${JSON.stringify(k)}: ${pythonLiteral(v)}`).join(", ")}}`;
  return JSON.stringify(value);
}

function literal(value: unknown, type: ParamType, language: Language): string {
  if (language === "python") return pythonLiteral(value);
  if (language === "javascript") return JSON.stringify(value);
  if (type.endsWith("[]")) {
    const inner = type.slice(0, -2) as ParamType;
    const values = (value as unknown[]).map((v) => literal(v, inner, language)).join(", ");
    return language === "java" ? `new ${JAVA[type]}{${values}}` : `{${values}}`;
  }
  if (type === "map<string,int>") {
    const entries = Object.entries(value as Record<string, number>);
    return language === "cpp"
      ? `{${entries.map(([k,v]) => `{${JSON.stringify(k)}, ${v}LL}`).join(", ")}}`
      : `new HashMap<String, Long>() {{ ${entries.map(([k,v]) => `put(${JSON.stringify(k)}, ${v}L);`).join(" ")} }}`;
  }
  if (type === "char") {
    const escaped = JSON.stringify(value).slice(1, -1).replace(/'/g, "\\'").replace(/\\"/g, '"');
    return `'${escaped}'`;
  }
  if (type === "int") return `${value}${language === "java" ? "L" : "LL"}`;
  return JSON.stringify(value);
}

export function buildVisualization({ language, source, signature: sig, input }: {
  language: Language; source: string; signature: VisualizationSignature; input: string;
}): Visualization {
  const unavailable = visualizationUnavailable(sig);
  if (unavailable) throw new Error(unavailable);
  if (!source.trim()) throw new Error("Write some code before visualizing it.");
  if (source.length > 2000) throw new Error("Python Tutor works with short programs. Shorten your code to 2,000 characters or fewer.");
  if (input.length > 5600) throw new Error("This input is too large to visualize. Try a smaller custom input.");
  let values: unknown;
  try { values = JSON.parse(input); } catch { throw new Error("Enter valid JSON arguments in Custom input before visualizing."); }
  const invalid = checkArguments(sig, values);
  if (invalid) throw new Error(`Cannot visualize this input: ${invalid}`);
  const args = values as unknown[];
  const py = language === "python";
  const js = language === "javascript";
  const cpp = language === "cpp";
  const name = (n: string) => py ? n : camel(n);
  const end = py ? "" : ";";
  const lines: string[] = [];
  let count = 0;
  function argumentsFor(params: Signature["params"], inputs: unknown[]): string[] {
    return params.map((param, i) => {
      const variable = `wit_arg_${count++}`;
      if (NODES.has(param.type)) {
        lines.push(...nodeInput(inputs[i], param.type, variable, language));
        return variable;
      }
      const prefix = py ? "" : js ? "const " : `${cpp ? CPP[param.type] : JAVA[param.type]} `;
      lines.push(`${prefix}${variable} = ${literal(inputs[i], param.type, language)}${end}`);
      return variable;
    });
  }
  function invoke(call: string, returns: string, mutated?: string) {
    if (returns === "void") { lines.push(`${call}${end}`); if (!mutated) return; call = mutated; }
    const result = `wit_result_${count++}`;
    lines.push(`${py ? "" : js ? "const " : cpp ? "auto " : "Object "}${result} = ${call}${end}`);
    // Keeping the result in a named variable exposes every return type in the trace.
    if (py) lines.push(`print(${result})`);
    if (js) lines.push(`console.log(${result});`);
    if (!py && !js && !NODES.has(returns)) {
      if (cpp) {
        if (["int", "double", "bool", "string", "char"].includes(returns)) lines.push(`std::cout << ${result} << std::endl;`);
      } else lines.push(`System.out.println(Arrays.deepToString(new Object[]{${result}}));`);
    }
  }
  if (isDesign(sig)) {
    const operations = args[0] as string[];
    const inputs = args[1] as unknown[][];
    const ctorArgs = argumentsFor(sig.params, inputs[0]!);
    lines.push(py ? `wit_instance = ${sig.name}(${ctorArgs.join(", ")})` : js ? `const wit_instance = new ${sig.name}(${ctorArgs.join(", ")});` : cpp ? `${sig.name} wit_instance{${ctorArgs.join(", ")}};` : `${sig.name} wit_instance = new ${sig.name}(${ctorArgs.join(", ")});`);
    for (let i = 1; i < operations.length; i++) {
      const method = sig.methods!.find((m) => m.name === operations[i])!;
      const methodArgs = argumentsFor(method.params, inputs[i]!);
      invoke(`wit_instance.${name(method.name)}(${methodArgs.join(", ")})`, method.returns);
    }
  } else {
    const fnArgs = argumentsFor(sig.params, args);
    invoke(`${language === "java" ? "Solution." : ""}${name(sig.name)}(${fnArgs.join(", ")})`, sig.returns,
      sig.returns === "void" ? fnArgs[sig.params.findIndex((p) => p.name === sig.mutates)] : undefined);
  }
  const definitions = nodeDefinitions(typesIn(sig), language);
  const participant = `${definitions}\n${source}`;
  let code: string;
  if (py || js) code = `${py && definitions ? "from typing import Optional\n" : ""}${participant}\n\n${lines.join("\n")}\n`;
  else if (cpp) code = `#include <iostream>\n#include <vector>\n#include <string>\n#include <map>\n#include <algorithm>\nusing namespace std;\n\n${participant}\n\nint main() {\n${lines.map((l) => `    ${l}`).join("\n")}\n}\n`;
  else {
    const imports: string[] = [];
    const body = participant.replace(/^\s*import\s+[\w.*]+\s*;/gm, (line) => { imports.push(line.trim()); return ""; });
    code = `import java.util.*;\n${imports.join("\n")}\n${body}\n\npublic class Main {\n    public static void main(String[] args) throws Exception {\n${lines.map((l) => `        ${l}`).join("\n")}\n    }\n}\n`;
  }
  const fragment = `code=${encodeURIComponent(code)}&mode=display&py=${LANG[language]}&curInstr=0`;
  const externalUrl = `https://pythontutor.com/visualize.html?via=ai#${fragment}`;
  const embedUrl = `https://pythontutor.com/iframe-embed.html?via=ai#${fragment}&codeDivWidth=420&codeDivHeight=360`;
  if (code.length > 2000 || embedUrl.length > 5600) throw new Error("The code and input together are too large for Python Tutor. Use a smaller input or shorten the code.");
  return { code, embedUrl, externalUrl };
}
