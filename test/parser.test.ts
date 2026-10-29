import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseJUnit, summarise } from "../src/parser";

const fixture = (name: string) => readFileSync(join(__dirname, "fixtures", name), "utf8");

describe("pytest reports", () => {
  const results = parseJUnit(fixture("pytest.xml"));

  it("reads every test case", () => {
    expect(results).toHaveLength(5);
  });

  it("uses classname as the suite and keeps the file", () => {
    expect(results[0]).toMatchObject({
      id: "tests.test_auth::test_login_ok",
      file: "tests/test_auth.py",
      status: "passed",
      durationMs: 12,
    });
  });

  it("detects failures, errors and skips with messages", () => {
    expect(results[1]).toMatchObject({ status: "failed", message: "AssertionError: assert 500 == 401" });
    expect(results[2].status).toBe("skipped");
    expect(results[3]).toMatchObject({ status: "error", message: 'failed on setup with "ConnectionRefusedError"' });
  });

  it("keeps parametrised test names intact", () => {
    expect(results[4].id).toBe("tests.test_db::test_query[param-1]");
  });
});

describe("jest-junit reports", () => {
  const results = parseJUnit(fixture("jest.xml"));

  it("falls back to the testsuite name when classname repeats the title", () => {
    expect(results.map((r) => r.id)).toEqual([
      "Cart::Cart adds an item",
      "Cart::Cart applies discount",
      "Cart::Cart removes an item",
      "Api::Api GET /health returns 200",
    ]);
  });

  it("takes the first line of a failure body as the message", () => {
    expect(results[1]).toMatchObject({
      status: "failed",
      message: "Error: expect(received).toBe(expected) // Object.is equality",
    });
  });

  it("treats an empty <skipped/> as skipped", () => {
    expect(results[2].status).toBe("skipped");
  });
});

describe("go-junit-report reports", () => {
  const results = parseJUnit(fixture("go.xml"));

  it("handles subtests and properties", () => {
    expect(results).toHaveLength(3);
    expect(results[1]).toMatchObject({ id: "payments::TestRefund/partial", status: "failed" });
    expect(results[2].status).toBe("skipped");
  });

  it("uses the failure body when the message attribute is just 'Failed'", () => {
    expect(results[1].message).toBe("refund_test.go:42: timeout waiting for webhook after 500ms");
  });
});

describe("other shapes", () => {
  it("accepts a bare <testsuite> root", () => {
    const [r] = parseJUnit(fixture("single-suite.xml"));
    expect(r).toMatchObject({ id: "com.example.MathTest::addsNumbers", status: "passed" });
  });

  it("handles nested suites", () => {
    const results = parseJUnit(`
      <testsuites><testsuite name="outer">
        <testcase classname="outer" name="a"/>
        <testsuite name="inner"><testcase name="b"/></testsuite>
      </testsuite></testsuites>`);
    expect(results.map((r) => r.id)).toEqual(["outer::a", "inner::b"]);
  });

  it("rejects files that are not JUnit", () => {
    expect(() => parseJUnit("<coverage/>")).toThrow(/Not a JUnit report/);
  });
});

describe("summarise", () => {
  it("counts every status", () => {
    expect(summarise(parseJUnit(fixture("pytest.xml")))).toEqual({
      total: 5,
      passed: 2,
      failed: 1,
      error: 1,
      skipped: 1,
    });
  });
});
