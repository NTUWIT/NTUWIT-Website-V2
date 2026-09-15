import type { Language } from "@/lib/languages";
import type { ParamType } from "@/lib/problems/signature";

export const NODE_TYPES = new Set(["ListNode", "TreeNode", "NaryTree", "RandomList", "Graph"]);
const fieldsFor = (type: string): string[] => type === "ListNode" ? ["next"] : type === "TreeNode" ? ["left", "right"] : type === "RandomList" ? ["next", "random"] : [type === "Graph" ? "neighbors" : "children"];
const classFor = (type: string) => type === "ListNode" || type === "TreeNode" ? type : "Node";

export function nodeDefinitions(types: string[], language: Language): string {
  return [...new Set(types.filter((t) => NODE_TYPES.has(t)))].map((type) => {
    const name = classFor(type), fields = fieldsFor(type);
    const many = type === "Graph" || type === "NaryTree";
    if (language === "python") return `class ${name}:\n    def __init__(self, val=0${fields.map((f) => `, ${f}=None`).join("")}):\n        self.val = val\n${fields.map((f) => `        self.${f} = ${many ? `${f} if ${f} is not None else []` : f}`).join("\n")}\n`;
    if (language === "javascript") return `class ${name} {\n  constructor(val=0${fields.map((f) => `, ${f}=${many ? "[]" : "null"}`).join("")}) {\n    this.val=val;\n${fields.map((f) => `    this.${f}=${f};`).join("\n")}\n  }\n}\n`;
    if (language === "cpp") return `struct ${name} {\n  int val;\n${fields.map((f) => `  ${many ? `std::vector<${name}*>` : `${name}*`} ${f};`).join("\n")}\n  ${name}(int v=0${fields.map((f) => `, ${many ? `std::vector<${name}*>` : `${name}*`} ${f}_=${many ? "{}" : "nullptr"}`).join("")}): val(v)${fields.map((f) => `, ${f}(${f}_)`).join("")} {}\n};\n`;
    return `class ${name} {\n  int val;\n${fields.map((f) => `  ${many ? `List<${name}>` : name} ${f}${many ? " = new ArrayList<>()" : ""};`).join("\n")}\n  ${name}() {}\n  ${name}(int v) { val=v; }\n  ${name}(int v, ${fields.map((f) => `${many ? `List<${name}>` : name} ${f}_`).join(", ")}) { val=v; ${fields.map((f) => `${f}=${f}_;`).join(" ")} }\n}\n`;
  }).join("\n");
}

// Build sample objects directly, preserving identity, cycles and null children.
// No parsing runtime or filesystem scaffolding consumes the trace's step budget.
export function nodeInput(value: unknown, type: ParamType, variable: string, language: Language): string[] {
  const records: { val: number; edges: Record<string, number | number[] | null> }[] = [];
  if (type === "ListNode") {
    const spec = Array.isArray(value) ? { values: value as number[], cycleAt: -1 } : value as { values: number[]; cycleAt: number };
    spec.values.forEach((val, i) => records.push({ val, edges: { next: i+1 < spec.values.length ? i+1 : spec.cycleAt >= 0 ? spec.cycleAt : null } }));
  } else if (type === "TreeNode") {
    const values = value as (number | null)[];
    const slots = values.map((v) => v === null ? null : { val: v, edges: { left: null, right: null } as Record<string, number | null> });
    const indices = new Map<object, number>();
    for (const slot of slots) if (slot) { indices.set(slot, records.length); records.push(slot); }
    let next = 1;
    for (const slot of slots) {
      if (!slot || next >= slots.length) continue;
      for (const field of ["left", "right"]) { const child = slots[next++]; slot.edges[field] = child ? indices.get(child)! : null; }
    }
  } else if (type === "RandomList") {
    const pairs = value as [number, number | null][];
    pairs.forEach(([val, random], i) => records.push({ val, edges: { next: i+1 < pairs.length ? i+1 : null, random } }));
  } else if (type === "Graph") {
    (value as number[][]).forEach((row, i) => records.push({ val: i+1, edges: { neighbors: row.map((n) => n-1) } }));
  } else {
    const values = value as (number | null)[];
    if (values.length) records.push({ val: values[0]!, edges: { children: [] } });
    let next = 2;
    for (let parent=0; parent < records.length && next < values.length; parent++) {
      const children = records[parent]!.edges.children as number[];
      while (next < values.length && values[next] !== null) { children.push(records.length); records.push({val: values[next++]!, edges: { children: [] }}); }
      next++;
    }
  }
  const py = language === "python", js = language === "javascript", cpp = language === "cpp";
  const name = classFor(type), end = py ? "" : ";", nil = py ? "None" : cpp ? "nullptr" : "null";
  const ref = (index: number | null) => index === null ? nil : `${variable}_node_${index}`;
  const lines = records.map((record, i) => `${py ? "" : js ? "const " : `${name}${cpp ? "*" : ""} `}${ref(i)} = ${py ? "" : "new "}${name}(${record.val})${end}`);
  records.forEach((record,i) => {
    for (const [field, edge] of Object.entries(record.edges)) {
      if (edge === null) continue;
      const target = `${ref(i)}${cpp ? "->" : "."}${field}`;
      const expr = Array.isArray(edge) ? (cpp ? `{${edge.map(ref).join(", ")}}` : language === "java" ? `new ArrayList<>(Arrays.asList(${edge.map(ref).join(", ")}))` : `[${edge.map(ref).join(", ")}]`) : ref(edge);
      lines.push(`${target} = ${expr}${end}`);
    }
  });
  lines.push(`${py ? "" : js ? "const " : `${name}${cpp ? "*" : ""} `}${variable} = ${records.length ? ref(0) : nil}${end}`);
  return lines;
}
