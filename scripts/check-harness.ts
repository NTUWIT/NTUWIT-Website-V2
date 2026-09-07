// Structural checks on generated code, no network, no judge. Run: yarn test
import assert from "node:assert/strict";

import { wrapSource } from "@/lib/judge/harness";
import { starterFor } from "@/lib/problems/starter";
import { camel, type Signature } from "@/lib/problems/signature";

assert.equal(camel("sum_of_numbers"), "sumOfNumbers");
assert.equal(camel("solve"), "solve");

const sig: Signature = {
  name: "two_things",
  params: [
    { name: "nums", type: "int[]" },
    { name: "label", type: "string" },
  ],
  returns: "string",
};

const src = "USER_CODE_MARKER";

// Every language must call the function under its own naming convention, keep
// the participant's code intact, and read every parameter.
const py = wrapSource({ language: "python", source: src, signature: sig });
assert.ok(py.includes(src), "python keeps user source");
assert.ok(py.includes("two_things(*__args)"), "python calls the snake_case name");

const js = wrapSource({ language: "javascript", source: src, signature: sig });
assert.ok(js.includes("twoThings(...__args)"), "javascript calls the camelCase name");

const cpp = wrapSource({ language: "cpp", source: src, signature: sig });
assert.ok(cpp.includes("twoThings(__a0, __a1)"), "c++ passes both arguments");
assert.ok(cpp.indexOf(src) < cpp.indexOf("int main()"), "user code precedes main");
assert.equal((cpp.match(/__eat\(','\)/g) ?? []).length, 1, "one separator for two params");

const java = wrapSource({ language: "java", source: src, signature: sig });
assert.ok(java.includes("Solution.twoThings(a0, a1)"), "java calls through Solution");
assert.ok(java.includes("public class Main"), "java entry point is Main");

// Starters must be a stub of the right shape, not a working answer.
assert.ok(starterFor("python", sig).includes("def two_things(nums: list[int], label: str) -> str:"));
assert.ok(starterFor("java", sig).includes("static String twoThings(long[] nums, String label)"));
assert.ok(starterFor("cpp", sig).includes("std::string twoThings(std::vector<long long> nums, std::string label)"));
assert.ok(starterFor("javascript", sig).includes("function twoThings(nums, label)"));

// A single-parameter signature must not emit a separator.
const one = wrapSource({
  language: "cpp",
  source: src,
  signature: { name: "f", params: [{ name: "n", type: "int" }], returns: "int" },
});
assert.ok(!one.includes("__eat(',')"), "no separator for a single parameter");

console.log("check-harness: all assertions passed");
