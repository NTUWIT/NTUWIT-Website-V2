/**
 * Reference and deliberately-broken solutions for the seeded problems, in all
 * four languages. `scripts/check-e2e.ts` runs these against a real judge so a
 * malformed hidden test is caught before an event rather than during one.
 */
import type { Language } from "@/lib/languages";

export type SolutionSet = Record<Language, string>;

type Kinds = {
  /** Must produce `accepted` on the full test set. */
  correct: SolutionSet;
  /** Must produce `wrong_answer`; passes nothing. */
  wrong: SolutionSet;
};

export const SOLUTIONS: Record<string, Kinds> = {
  "sum-of-numbers": {
    correct: {
      python: `def sum_of_numbers(nums: list[int]) -> int:\n    return sum(nums)\n`,
      javascript: `function sumOfNumbers(nums) {\n  return nums.reduce((a, b) => a + b, 0);\n}\n`,
      cpp: `long long sumOfNumbers(std::vector<long long> nums) {\n    long long total = 0;\n    for (long long n : nums) total += n;\n    return total;\n}\n`,
      java: `class Solution {\n    static long sumOfNumbers(long[] nums) {\n        long total = 0;\n        for (long n : nums) total += n;\n        return total;\n    }\n}\n`,
    },
    wrong: {
      python: `def sum_of_numbers(nums: list[int]) -> int:\n    return sum(nums) + 1\n`,
      javascript: `function sumOfNumbers(nums) {\n  return nums.reduce((a, b) => a + b, 0) + 1;\n}\n`,
      cpp: `long long sumOfNumbers(std::vector<long long> nums) {\n    long long total = 1;\n    for (long long n : nums) total += n;\n    return total;\n}\n`,
      java: `class Solution {\n    static long sumOfNumbers(long[] nums) {\n        long total = 1;\n        for (long n : nums) total += n;\n        return total;\n    }\n}\n`,
    },
  },

  "reverse-words": {
    correct: {
      python: `def reverse_words(sentence: str) -> str:\n    return " ".join(sentence.split()[::-1])\n`,
      javascript: `function reverseWords(sentence) {\n  return sentence.split(/\\s+/).filter(Boolean).reverse().join(" ");\n}\n`,
      cpp: `std::string reverseWords(std::string sentence) {\n    std::vector<std::string> words;\n    std::string word;\n    std::istringstream in(sentence);\n    while (in >> word) words.push_back(word);\n    std::string out;\n    for (int i = (int)words.size() - 1; i >= 0; i--) {\n        if (!out.empty()) out += " ";\n        out += words[i];\n    }\n    return out;\n}\n`,
      java: `class Solution {\n    static String reverseWords(String sentence) {\n        String[] words = sentence.trim().split("\\\\s+");\n        StringBuilder out = new StringBuilder();\n        for (int i = words.length - 1; i >= 0; i--) {\n            if (words[i].isEmpty()) continue;\n            if (out.length() > 0) out.append(" ");\n            out.append(words[i]);\n        }\n        return out.toString();\n    }\n}\n`,
    },
    wrong: {
      python: `def reverse_words(sentence: str) -> str:\n    return sentence\n`,
      javascript: `function reverseWords(sentence) {\n  return sentence;\n}\n`,
      cpp: `std::string reverseWords(std::string sentence) {\n    return sentence;\n}\n`,
      java: `class Solution {\n    static String reverseWords(String sentence) {\n        return sentence;\n    }\n}\n`,
    },
  },

  "count-vowels": {
    correct: {
      python: `def count_vowels(text: str) -> int:\n    return sum(1 for c in text.lower() if c in "aeiou")\n`,
      javascript: `function countVowels(text) {\n  return (text.toLowerCase().match(/[aeiou]/g) || []).length;\n}\n`,
      cpp: `long long countVowels(std::string text) {\n    long long count = 0;\n    for (char c : text) {\n        char lower = (char)std::tolower((unsigned char)c);\n        if (lower=='a'||lower=='e'||lower=='i'||lower=='o'||lower=='u') count++;\n    }\n    return count;\n}\n`,
      java: `class Solution {\n    static long countVowels(String text) {\n        long count = 0;\n        for (char c : text.toLowerCase().toCharArray()) {\n            if ("aeiou".indexOf(c) >= 0) count++;\n        }\n        return count;\n    }\n}\n`,
    },
    wrong: {
      python: `def count_vowels(text: str) -> int:\n    return len(text)\n`,
      javascript: `function countVowels(text) {\n  return text.length;\n}\n`,
      cpp: `long long countVowels(std::string text) {\n    return (long long)text.size();\n}\n`,
      java: `class Solution {\n    static long countVowels(String text) {\n        return text.length();\n    }\n}\n`,
    },
  },
};

/** Never terminates: must be killed by the run timeout. */
export const TIMEOUT_SOLUTION: Record<string, SolutionSet> = {
  "sum-of-numbers": {
    python: `def sum_of_numbers(nums):\n    while True:\n        pass\n`,
    javascript: `function sumOfNumbers(nums) {\n  while (true) {}\n}\n`,
    cpp: `long long sumOfNumbers(std::vector<long long> nums) {\n    volatile long long x = 0;\n    while (true) x++;\n    return x;\n}\n`,
    java: `class Solution {\n    static long sumOfNumbers(long[] nums) {\n        long x = 0;\n        while (true) { x++; }\n    }\n}\n`,
  },
};

/** Does not build (C++/Java) or throws on entry (Python/JS). */
export const BROKEN_SOLUTION: SolutionSet = {
  python: `def sum_of_numbers(nums):\n    raise ValueError("boom")\n`,
  javascript: `function sumOfNumbers(nums) {\n  throw new Error("boom");\n}\n`,
  cpp: `long long sumOfNumbers(std::vector<long long> nums) {\n    this is not c++;\n}\n`,
  java: `class Solution {\n    static long sumOfNumbers(long[] nums) {\n        this is not java;\n    }\n}\n`,
};

/** Legitimate debugging output from inside the function (finding #5). */
export const DEBUG_PRINT_SOLUTION: SolutionSet = {
  python: `def sum_of_numbers(nums):\n    print("debugging:", nums)\n    return sum(nums)\n`,
  javascript: `function sumOfNumbers(nums) {\n  console.log("debugging:", nums);\n  return nums.reduce((a, b) => a + b, 0);\n}\n`,
  cpp: `long long sumOfNumbers(std::vector<long long> nums) {\n    std::cout << "debugging: " << nums.size() << std::endl;\n    long long t = 0;\n    for (long long n : nums) t += n;\n    return t;\n}\n`,
  java: `class Solution {\n    static long sumOfNumbers(long[] nums) {\n        System.out.println("debugging: " + nums.length);\n        long t = 0;\n        for (long n : nums) t += n;\n        return t;\n    }\n}\n`,
};

/**
 * Writes straight to file descriptor 1, past the language-level stdout swap the
 * harness installs (finding #5). Probe only: this pins behaviour, it does not
 * assert that the behaviour is correct.
 */
export const FD_BYPASS_SOLUTION: Partial<SolutionSet> = {
  python: `import os\n\ndef sum_of_numbers(nums):\n    os.write(1, b"LEAKED\\n")\n    return sum(nums)\n`,
  cpp: `long long sumOfNumbers(std::vector<long long> nums) {\n    printf("LEAKED\\n");\n    fflush(stdout);\n    long long t = 0;\n    for (long long n : nums) t += n;\n    return t;\n}\n`,
  java: `class Solution {\n    static long sumOfNumbers(long[] nums) {\n        try {\n            java.io.FileOutputStream raw = new java.io.FileOutputStream(java.io.FileDescriptor.out);\n            raw.write("LEAKED\\n".getBytes());\n            raw.flush();\n        } catch (Exception e) {}\n        long t = 0;\n        for (long n : nums) t += n;\n        return t;\n    }\n}\n`,
};
