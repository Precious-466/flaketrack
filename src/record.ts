import type { TestResult, TestStatus } from "./types";

/** The compact form of one test stored in history: just enough to compare runs. */
export interface RecordedTest {
  id: string;
  status: TestStatus;
  durationMs: number;
}

/**
 * One CI run. The same shape is written to the data branch and sent to the
 * dashboard API, so both storage options hold identical data.
 */
export interface RunRecord {
  /** "owner/name". */
  repo: string;
  commitSha: string;
  /** GitHub's run ID; stays the same when a run is re-run. */
  runId: number;
  /** 1 for the first try, 2+ for re-runs of the same run ID. */
  attempt: number;
  branch: string;
  workflow: string;
  /** ISO 8601 time the record was created. */
  timestamp: string;
  tests: RecordedTest[];
}

/** Everything about a run that does not come from the test reports. */
export type RunMeta = Omit<RunRecord, "tests">;

export function toRunRecord(meta: RunMeta, results: TestResult[]): RunRecord {
  return {
    ...meta,
    tests: results.map(({ id, status, durationMs }) => ({ id, status, durationMs })),
  };
}

/** Splits a record back into its metadata and tests. Copies, so callers cannot change the record. */
export function fromRunRecord(record: RunRecord): { meta: RunMeta; tests: RecordedTest[] } {
  const { tests, ...meta } = record;
  return { meta, tests: tests.map((t) => ({ ...t })) };
}
