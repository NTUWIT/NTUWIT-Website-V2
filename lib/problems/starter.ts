import type { Language } from "@/lib/languages";
import {
  camel,
  isDesign,
  nodeKind,
  typesIn,
  type Method,
  type NodeKind,
  type Param,
  type ParamType,
  type ReturnType,
  type Signature,
} from "./signature";

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
  char: "str",
  "int[]": "list[int]",
  "double[]": "list[float]",
  "bool[]": "list[bool]",
  "string[]": "list[str]",
  "char[]": "list[str]",
  "int[][]": "list[list[int]]",
  "string[][]": "list[list[str]]",
  "char[][]": "list[list[str]]",
  "map<string,int>": "dict[str, int]",
  ListNode: "Optional[ListNode]",
  TreeNode: "Optional[TreeNode]",
  NaryTree: "Optional[Node]",
  RandomList: "Optional[Node]",
  Graph: "Optional[Node]",
};

export const CPP: Record<ParamType, string> = {
  int: "long long",
  double: "double",
  bool: "bool",
  string: "std::string",
  char: "char",
  "int[]": "std::vector<long long>",
  "double[]": "std::vector<double>",
  "bool[]": "std::vector<bool>",
  "string[]": "std::vector<std::string>",
  "char[]": "std::vector<char>",
  "int[][]": "std::vector<std::vector<long long>>",
  "string[][]": "std::vector<std::vector<std::string>>",
  "char[][]": "std::vector<std::vector<char>>",
  "map<string,int>": "std::map<std::string, long long>",
  ListNode: "ListNode*",
  TreeNode: "TreeNode*",
  NaryTree: "Node*",
  RandomList: "Node*",
  Graph: "Node*",
};

export const JAVA: Record<ParamType, string> = {
  int: "long",
  double: "double",
  bool: "boolean",
  string: "String",
  char: "char",
  "int[]": "long[]",
  "double[]": "double[]",
  "bool[]": "boolean[]",
  "string[]": "String[]",
  "char[]": "char[]",
  "int[][]": "long[][]",
  "string[][]": "String[][]",
  "char[][]": "char[][]",
  "map<string,int>": "Map<String, Long>",
  ListNode: "ListNode",
  TreeNode: "TreeNode",
  NaryTree: "Node",
  RandomList: "Node",
  Graph: "Node",
};

const CPP_ZERO: Record<ParamType, string> = {
  int: "0",
  double: "0.0",
  bool: "false",
  string: '""',
  char: "' '",
  "int[]": "{}",
  "double[]": "{}",
  "bool[]": "{}",
  "string[]": "{}",
  "char[]": "{}",
  "int[][]": "{}",
  "string[][]": "{}",
  "char[][]": "{}",
  "map<string,int>": "{}",
  ListNode: "nullptr",
  TreeNode: "nullptr",
  NaryTree: "nullptr",
  RandomList: "nullptr",
  Graph: "nullptr",
};

const JAVA_ZERO: Record<ParamType, string> = {
  int: "0",
  double: "0.0",
  bool: "false",
  string: '""',
  char: "' '",
  "int[]": "new long[0]",
  "double[]": "new double[0]",
  "bool[]": "new boolean[0]",
  "string[]": "new String[0]",
  "char[]": "new char[0]",
  "int[][]": "new long[0][]",
  "string[][]": "new String[0][]",
  "char[][]": "new char[0][]",
  "map<string,int>": "new HashMap<>()",
  ListNode: "null",
  TreeNode: "null",
  NaryTree: "null",
  RandomList: "null",
  Graph: "null",
};

const pyReturn = (t: ReturnType) => (t === "void" ? "None" : PY_HINT[t]);
const cppReturn = (t: ReturnType) => (t === "void" ? "void" : CPP[t]);
const javaReturn = (t: ReturnType) => (t === "void" ? "void" : JAVA[t]);

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

/** LeetCode's Node, in each language, for the kind of Node this problem uses. */
const KIND_NOTE: Record<NodeKind, Record<Language, string>> = {
  NaryTree: {
    python: "class Node: val: int, children: list[Node]",
    javascript: "class Node { val; children }  // new Node(val, children)",
    cpp: "struct Node { int val; std::vector<Node*> children; };  // new Node(val)",
    java: "class Node { int val; List<Node> children; }  // new Node(val)",
  },
  RandomList: {
    python: "class Node: val: int, next: Optional[Node], random: Optional[Node]",
    javascript: "class Node { val; next; random }  // new Node(val, next, random)",
    cpp: "struct Node { int val; Node *next, *random; };  // new Node(val)",
    java: "class Node { int val; Node next, random; }  // new Node(val)",
  },
  Graph: {
    python: "class Node: val: int, neighbors: list[Node]",
    javascript: "class Node { val; neighbors }  // new Node(val, neighbors)",
    cpp: "struct Node { int val; std::vector<Node*> neighbors; };  // new Node(val)",
    java: "class Node { int val; List<Node> neighbors; }  // new Node(val)",
  },
};

function nodeNote(language: Language, sig: Signature): string {
  const used = new Set(typesIn(sig));
  const note = NODE_NOTE[language];
  const kind = nodeKind(sig);
  const lines = [
    used.has("ListNode") ? note.list : null,
    used.has("TreeNode") ? note.tree : null,
    kind ? KIND_NOTE[kind][language] : null,
  ].filter(Boolean);
  if (lines.length === 0) return "";
  return `${note.comment} Provided for you, do not redefine:\n${lines.map((l) => `${note.comment}   ${l}`).join("\n")}\n\n`;
}

/**
 * Tells the participant how their code is run, which is the whole contract:
 * the judge owns the entry point and calls the named function or class, so
 * helpers are welcome and reading input or printing the answer is not needed.
 */
function contractNote(language: Language, sig: Signature): string {
  const c = NODE_NOTE[language].comment;
  const fn = language === "python" ? sig.name : camel(sig.name);
  const what = isDesign(sig)
    ? `The judge creates ${sig.name} and calls its methods for you.`
    : sig.returns === "void"
      ? `The judge calls ${fn} for you, then checks ${language === "python" ? sig.mutates : camel(sig.mutates ?? "")} after it returns.`
      : `The judge calls ${fn} for you and checks what it returns.`;
  const provided = sig.provided?.functions.length
    ? `${c} The judge provides ${sig.provided.functions
        .map((f) => `${language === "python" ? f.name : camel(f.name)}(${f.params.map((p) => (language === "python" ? p.name : camel(p.name))).join(", ")})`)
        .join(", ")} for you to call; do not define ${sig.provided.functions.length === 1 ? "it" : "them"}.\n`
    : "";
  return `${c} ${what}\n${provided}${c} Add any helper functions you like; you do not need to read input or print the answer.\n\n`;
}

const pyParams = (params: Param[]) => params.map((p) => `${p.name}: ${PY_HINT[p.type]}`).join(", ");
const cppParams = (params: Param[], mutated?: string) =>
  params.map((p) => `${CPP[p.type]}${p.name === mutated ? "&" : ""} ${camel(p.name)}`).join(", ");
const javaParams = (params: Param[]) => params.map((p) => `${JAVA[p.type]} ${camel(p.name)}`).join(", ");

function functionStarter(language: Language, sig: Signature): string {
  const name = language === "python" ? sig.name : camel(sig.name);
  switch (language) {
    case "python":
      return `def ${name}(${pyParams(sig.params)}) -> ${pyReturn(sig.returns)}:
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
      return `${cppReturn(sig.returns)} ${name}(${cppParams(sig.params, sig.mutates)}) {
    // your code here${sig.returns === "void" ? "" : `\n    return ${CPP_ZERO[sig.returns]};`}
}
`;
    case "java":
      // Solution extends Provided so the judge's functions can be called by name.
      return `class Solution${sig.provided ? " extends Provided" : ""} {
    static ${javaReturn(sig.returns)} ${name}(${javaParams(sig.params)}) {
        // your code here${sig.returns === "void" ? "" : `\n        return ${JAVA_ZERO[sig.returns]};`}
    }
}
`;
  }
}

function designStarter(language: Language, sig: Signature): string {
  const methods = sig.methods as Method[];
  switch (language) {
    case "python":
      return `class ${sig.name}:
    def __init__(self${sig.params.length ? `, ${pyParams(sig.params)}` : ""}):
        pass
${methods
  .map(
    (m) => `
    def ${m.name}(self${m.params.length ? `, ${pyParams(m.params)}` : ""}) -> ${pyReturn(m.returns)}:
        pass
`,
  )
  .join("")}`;
    case "javascript":
      return `class ${sig.name} {
  constructor(${sig.params.map((p) => camel(p.name)).join(", ")}) {
  }
${methods
  .map(
    (m) => `
  ${camel(m.name)}(${m.params.map((p) => camel(p.name)).join(", ")}) {
  }
`,
  )
  .join("")}}
`;
    case "cpp":
      return `class ${sig.name} {
public:
    ${sig.name}(${cppParams(sig.params)}) {
    }
${methods
  .map(
    (m) => `
    ${cppReturn(m.returns)} ${camel(m.name)}(${cppParams(m.params)}) {${m.returns === "void" ? "" : `\n        return ${CPP_ZERO[m.returns]};`}
    }
`,
  )
  .join("")}};
`;
    case "java":
      return `class ${sig.name} {
    ${sig.name}(${javaParams(sig.params)}) {
    }
${methods
  .map(
    (m) => `
    ${javaReturn(m.returns)} ${camel(m.name)}(${javaParams(m.params)}) {${m.returns === "void" ? "" : `\n        return ${JAVA_ZERO[m.returns]};`}
    }
`,
  )
  .join("")}}
`;
  }
}

export function starterFor(language: Language, sig: Signature): string {
  const body = isDesign(sig) ? designStarter(language, sig) : functionStarter(language, sig);
  return `${nodeNote(language, sig)}${contractNote(language, sig)}${body}`;
}

export const starterCodeFor = (sig: Signature) => ({
  python: starterFor("python", sig),
  javascript: starterFor("javascript", sig),
  cpp: starterFor("cpp", sig),
  java: starterFor("java", sig),
});
