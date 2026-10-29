import { describe, expect, it } from "vitest";
import { fromRunRecord, toRunRecord } from "../src/record";
import type { RunMeta } from "../src/record";
import type { TestResult } from "../src/types";

const meta: RunMeta = {
  repo: "Precious-466/flaketrack",
  commitSha: "abc123",
  runId: 42,
  attempt: 2,
  branch: "main",
  workflow: "CI",
  timestamp: "2026-10-29T12:00:00.000Z",
};

const results: TestResult[] = [
  { id: "a::passes", suite: "a", name: "passes", status: "passed", durationMs: 12, file: "a.test.ts" },
  { id: "a::fails", suite: "a", name: "fails", status: "failed", durationMs: 30, message: "boom" },
];

describe("toRunRecord", () => {
  it("keeps only id, status and duration for each test", () => {
    const record = toRunRecord(meta, results);
    expect(record.tests).toEqual([
      { id: "a::passes", status: "passed", durationMs: 12 },
      { id: "a::fails", status: "failed", durationMs: 30 },
    ]);
  });

  it("copies the run metadata, including the attempt number", () => {
    expect(toRunRecord(meta, results)).toMatchObject(meta);
  });

  it("handles a run with no tests", () => {
    expect(toRunRecord(meta, []).tests).toEqual([]);
  });
});

describe("fromRunRecord", () => {
  it("round-trips through JSON, as it does on the data branch", () => {
    const record = toRunRecord(meta, results);
    const parsed = JSON.parse(JSON.stringify(record));
    const back = fromRunRecord(parsed);
    expect(back.meta).toEqual(meta);
    expect(back.tests).toEqual(record.tests);
  });

  it("returns copies so the record is not modified", () => {
    const record = toRunRecord(meta, results);
    fromRunRecord(record).tests[0].status = "failed";
    expect(record.tests[0].status).toBe("passed");
  });
});
