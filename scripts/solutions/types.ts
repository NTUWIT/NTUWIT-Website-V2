/**
 * Python sources per problem, keyed by function name. `wrong` is only given
 * where the generated one would not work (true/false answers); everywhere else
 * the runner writes a solution that ignores the input.
 */
export type Solutions = Record<string, { partial: string; correct: string; wrong?: string }>;
