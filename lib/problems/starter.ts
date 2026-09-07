import type { Language } from "@/lib/languages";
import { camel, type ParamType, type Signature } from "./signature";

/**
 * Starter code is generated from the signature rather than written per problem
 * per language: four hand-written stubs per problem is where typos live.
 */

const PY_HINT: Record<ParamType, string> = {
  int: "int",
  double: "float",
  bool: "bool",
  string: "str",
  "int[]": "list[int]",
  "double[]": "list[float]",
  "bool[]": "list[bool]",
  "string[]": "list[str]",
  "int[][]": "list[list[int]]",
};

const CPP: Record<ParamType, string> = {
  int: "long long",
  double: "double",
  bool: "bool",
  string: "std::string",
  "int[]": "std::vector<long long>",
  "double[]": "std::vector<double>",
  "bool[]": "std::vector<bool>",
  "string[]": "std::vector<std::string>",
  "int[][]": "std::vector<std::vector<long long>>",
};

const JAVA: Record<ParamType, string> = {
  int: "long",
  double: "double",
  bool: "boolean",
  string: "String",
  "int[]": "long[]",
  "double[]": "double[]",
  "bool[]": "boolean[]",
  "string[]": "String[]",
  "int[][]": "long[][]",
};

const CPP_ZERO: Record<ParamType, string> = {
  int: "0",
  double: "0.0",
  bool: "false",
  string: '""',
  "int[]": "{}",
  "double[]": "{}",
  "bool[]": "{}",
  "string[]": "{}",
  "int[][]": "{}",
};

const JAVA_ZERO: Record<ParamType, string> = {
  int: "0",
  double: "0.0",
  bool: "false",
  string: '""',
  "int[]": "new long[0]",
  "double[]": "new double[0]",
  "bool[]": "new boolean[0]",
  "string[]": "new String[0]",
  "int[][]": "new long[0][]",
};

export function starterFor(language: Language, sig: Signature): string {
  const name = language === "python" ? sig.name : camel(sig.name);

  switch (language) {
    case "python":
      return `def ${name}(${sig.params.map((p) => `${p.name}: ${PY_HINT[p.type]}`).join(", ")}) -> ${PY_HINT[sig.returns]}:
    # your code here
    pass
`;
    case "javascript":
      return `/**
${sig.params.map((p) => ` * @param {${p.type}} ${camel(p.name)}`).join("\n")}
 * @returns {${sig.returns}}
 */
function ${name}(${sig.params.map((p) => camel(p.name)).join(", ")}) {
  // your code here
}
`;
    case "cpp":
      return `${CPP[sig.returns]} ${name}(${sig.params.map((p) => `${CPP[p.type]} ${camel(p.name)}`).join(", ")}) {
    // your code here
    return ${CPP_ZERO[sig.returns]};
}
`;
    case "java":
      return `class Solution {
    static ${JAVA[sig.returns]} ${name}(${sig.params.map((p) => `${JAVA[p.type]} ${camel(p.name)}`).join(", ")}) {
        // your code here
        return ${JAVA_ZERO[sig.returns]};
    }
}
`;
  }
}

export const starterCodeFor = (sig: Signature) => ({
  python: starterFor("python", sig),
  javascript: starterFor("javascript", sig),
  cpp: starterFor("cpp", sig),
  java: starterFor("java", sig),
});
