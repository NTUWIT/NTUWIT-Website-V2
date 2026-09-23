import assert from "node:assert/strict";
import { buildVisualization, visualizationUnavailable, type VisualizationSignature } from "@/lib/visualization/python-tutor";
import { LANGUAGES } from "@/lib/languages";

const signature: VisualizationSignature = { name: "sum_numbers", params: [{ name: "nums", type: "int[]" }], returns: "int", requiresJudge: false };
const sources = {
  python: "def sum_numbers(nums):\n    return sum(nums)",
  javascript: "function sumNumbers(nums) { return nums.reduce((a, b) => a + b, 0); }",
  cpp: "long long sumNumbers(std::vector<long long> nums) { long long total=0; for(auto n:nums) total+=n; return total; }",
  java: "class Solution { static long sumNumbers(long[] nums) { long total=0; for(long n:nums) total+=n; return total; } }",
};
for (const language of LANGUAGES) {
  const result = buildVisualization({ language, source: sources[language], signature, input: "[[1,2,3,4]]" });
  const fragment = new URLSearchParams(new URL(result.externalUrl).hash.slice(1));
  assert.equal(fragment.get("code"), result.code);
  assert.equal(fragment.get("mode"), "display");
  assert.ok(result.code.includes(sources[language]));
  assert.ok(result.embedUrl.length <= 5600);
}
const base = { language: "python" as const, source: sources.python, signature, input: "[[1,2]]" };
for (const input of ["oops", "{}", "[]", '[["wrong"]]']) assert.throws(() => buildVisualization({ ...base, input }));
assert.throws(() => buildVisualization({ ...base, source: " " }));
assert.throws(() => buildVisualization({ ...base, source: "x".repeat(2001) }));
assert.throws(() => buildVisualization({ ...base, input: " ".repeat(5601) }));
assert.ok(visualizationUnavailable({ ...signature, requiresJudge: true }));
assert.equal(visualizationUnavailable({ ...signature, params: [{ name: "root", type: "TreeNode" }] }), null);
const special = buildVisualization({ ...base, signature: { ...signature, params: [{ name: "text", type: "string" }], returns: "string" }, input: JSON.stringify(['+ & # " \\ \n 😊']) });
assert.equal(new URLSearchParams(new URL(special.externalUrl).hash.slice(1)).get("code"), special.code);
const mutation = buildVisualization({ ...base, signature: { ...signature, returns: "void", mutates: "nums" } });
assert.match(mutation.code, /sum_numbers\(wit_arg_0\)\nwit_result_1 = wit_arg_0/);
const design = buildVisualization({ ...base, source: "class Counter:\n    pass", signature: { name: "Counter", params: [], returns: "void", methods: [{ name: "get_value", params: [], returns: "int" }], requiresJudge: false }, input: '[["Counter","get_value"],[[],[]]]' });
assert.match(design.code, /wit_instance = Counter\(\)/);
assert.match(design.code, /wit_instance.get_value\(\)/);

for (const language of LANGUAGES) {
  const linked = buildVisualization({ ...base, language, signature: { ...signature, params: [{ name: "head", type: "ListNode" }] }, input: '[{"values":[1,2],"cycleAt":0}]' });
  assert.match(linked.code, /wit_arg_0_node_1(?:->|\.)next = wit_arg_0_node_0/);
  const tree = buildVisualization({ ...base, language, signature: { ...signature, params: [{ name: "root", type: "TreeNode" }] }, input: '[[1,null,2,3]]' });
  assert.match(tree.code, /wit_arg_0_node_0(?:->|\.)right = wit_arg_0_node_1/);
  assert.match(tree.code, /wit_arg_0_node_1(?:->|\.)left = wit_arg_0_node_2/);
}

console.log("check-visualization: wrappers, encoding, validation, limits, mutation, design, cyclic lists and sparse trees passed");
