import type { Language } from "@/lib/languages";
import { camel, type ParamType, type Signature } from "./signature";

/**
 * Starter code is generated from the signature rather than written per problem
 * per language: four hand-written stubs per problem is where typos live.
 *
 * The C++ and Java tables are also the harness's declared types, so a starter
 * and the program that calls it cannot disagree.
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
  "string[][]": "list[list[str]]",
  "map<string,int>": "dict[str, int]",
  ListNode: "Optional[ListNode]",
  TreeNode: "Optional[TreeNode]",
};

export const CPP: Record<ParamType, string> = {
  int: "long long",
  double: "double",
  bool: "bool",
  string: "std::string",
  "int[]": "std::vector<long long>",
  "double[]": "std::vector<double>",
  "bool[]": "std::vector<bool>",
  "string[]": "std::vector<std::string>",
  "int[][]": "std::vector<std::vector<long long>>",
  "string[][]": "std::vector<std::vector<std::string>>",
  "map<string,int>": "std::map<std::string, long long>",
  ListNode: "ListNode*",
  TreeNode: "TreeNode*",
};

export const JAVA: Record<ParamType, string> = {
  int: "long",
  double: "double",
  bool: "boolean",
  string: "String",
  "int[]": "long[]",
  "double[]": "double[]",
  "bool[]": "boolean[]",
  "string[]": "String[]",
  "int[][]": "long[][]",
  "string[][]": "String[][]",
  "map<string,int>": "Map<String, Long>",
  ListNode: "ListNode",
  TreeNode: "TreeNode",
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
  "string[][]": "{}",
  "map<string,int>": "{}",
  ListNode: "nullptr",
  TreeNode: "nullptr",
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
  "string[][]": "new String[0][]",
  "map<string,int>": "new HashMap<>()",
  ListNode: "null",
  TreeNode: "null",
};

/**
 * The node classes are provided by the harness. Saying so in the starter, the
 * way LeetCode does, stops a participant pasting their own definition, which
 * is a duplicate-type compile error in C++ and Java.
 */
const NODE_NOTE: Record<Language, { list: string; tree: string; comment: string }> = {
  python: {
    comment: "#",
    list: "class ListNode: val: int, next: Optional[ListNode]",
    tree: "class TreeNode: val: int, left: Optional[TreeNode], right: Optional[TreeNode]",
  },
  javascript: {
    comment: "//",
    list: "class ListNode { val; next }  // new ListNode(val, next)",
    tree: "class TreeNode { val; left; right }  // new TreeNode(val, left, right)",
  },
  cpp: {
    comment: "//",
    list: "struct ListNode { int val; ListNode *next; };  // new ListNode(val, next)",
    tree: "struct TreeNode { int val; TreeNode *left, *right; };  // new TreeNode(val, left, right)",
  },
  java: {
    comment: "//",
    list: "class ListNode { int val; ListNode next; }  // new ListNode(val, next)",
    tree: "class TreeNode { int val; TreeNode left, right; }  // new TreeNode(val, left, right)",
  },
};

function nodeNote(language: Language, sig: Signature): string {
  const used = new Set([sig.returns, ...sig.params.map((p) => p.type)]);
  const note = NODE_NOTE[language];
  const lines = [
    used.has("ListNode") ? note.list : null,
    used.has("TreeNode") ? note.tree : null,
  ].filter(Boolean);
  if (lines.length === 0) return "";
  return `${note.comment} Provided for you, do not redefine:\n${lines.map((l) => `${note.comment}   ${l}`).join("\n")}\n\n`;
}

export function starterFor(language: Language, sig: Signature): string {
  const name = language === "python" ? sig.name : camel(sig.name);
  const note = nodeNote(language, sig);

  switch (language) {
    case "python":
      return `${note}def ${name}(${sig.params.map((p) => `${p.name}: ${PY_HINT[p.type]}`).join(", ")}) -> ${PY_HINT[sig.returns]}:
    # your code here
    pass
`;
    case "javascript":
      return `${note}/**
${sig.params.map((p) => ` * @param {${p.type}} ${camel(p.name)}`).join("\n")}
 * @returns {${sig.returns}}
 */
function ${name}(${sig.params.map((p) => camel(p.name)).join(", ")}) {
  // your code here
}
`;
    case "cpp":
      return `${note}${CPP[sig.returns]} ${name}(${sig.params.map((p) => `${CPP[p.type]} ${camel(p.name)}`).join(", ")}) {
    // your code here
    return ${CPP_ZERO[sig.returns]};
}
`;
    case "java":
      return `${note}class Solution {
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
