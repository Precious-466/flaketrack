export type TestStatus = "passed" | "failed" | "error" | "skipped";

/** One test case, normalised so every test framework looks the same. */
export interface TestResult {
  /** Stable identity used to compare the same test across runs: "<suite>::<name>". */
  id: string;
  suite: string;
  name: string;
  file?: string;
  status: TestStatus;
  durationMs: number;
  /** Short failure message, if the test failed or errored. */
  message?: string;
}

export interface TestRunSummary {
  total: number;
  passed: number;
  failed: number;
  error: number;
  skipped: number;
}
