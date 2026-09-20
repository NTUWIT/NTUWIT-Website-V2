// The languages the event supports. Kept in one place: the zod enum, the seed
// files' starter code, and the Piston runtime map all key off this list.
export const LANGUAGES = ["python", "javascript", "cpp", "java"] as const;

export type Language = (typeof LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<Language, string> = {
  python: "Python",
  javascript: "JavaScript",
  cpp: "C++",
  java: "Java",
};

