import { XMLParser } from "fast-xml-parser";
import type { TestResult, TestRunSummary, TestStatus } from "./types";

/**
 * Parses JUnit XML into a flat list of TestResult.
 *
 * Handles the common dialects:
 *  - pytest (--junitxml):   <testsuites><testsuite><testcase classname="tests.test_x" file="...">
 *  - jest-junit:            classname often repeats the full test title
 *  - go-junit-report:       <testsuite name="module/pkg"><testcase classname="pkg">
 *  - plain <testsuite> roots and nested <testsuite> elements
 */

const xml = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  textNodeName: "#text",
  // Always give arrays for repeating elements, even when there is only one.
  isArray: (name) => ["testsuite", "testcase", "failure", "error"].includes(name),
  parseAttributeValue: false,
});

type Node = Record<string, any>;

const GENERIC_MESSAGES = new Set(["failed", "failure", "error"]);

export function parseJUnit(content: string): TestResult[] {
  const doc = xml.parse(content) as Node;
  const results: TestResult[] = [];

  const roots: Node[] = [];
  if (doc.testsuites) roots.push(doc.testsuites);
  if (doc.testsuite) roots.push({ testsuite: doc.testsuite });
  if (roots.length === 0) {
    throw new Error("Not a JUnit report: no <testsuites> or <testsuite> root element.");
  }

  for (const root of roots) {
    for (const suite of asArray(root.testsuite)) walkSuite(suite, results);
  }
  return results;
}

function walkSuite(suite: Node, out: TestResult[]): void {
  const suiteName = str(suite.name);

  for (const tc of asArray(suite.testcase)) out.push(toResult(tc, suiteName, str(suite.file)));

  // Some tools nest suites inside suites.
  for (const child of asArray(suite.testsuite)) walkSuite(child, out);
}

function toResult(tc: Node, suiteName: string, suiteFile: string): TestResult {
  const name = str(tc.name);
  const classname = str(tc.classname);

  // jest-junit sets classname to the full test title by default, which is not a useful suite.
  const suite = classname && classname !== name ? classname : suiteName || classname || "unknown";

  const { status, message } = statusOf(tc);
  const file = str(tc.file) || suiteFile || undefined;

  return {
    id: `${suite}::${name}`,
    suite,
    name,
    ...(file ? { file } : {}),
    status,
    durationMs: Math.round(parseFloat(str(tc.time) || "0") * 1000),
    ...(message ? { message } : {}),
  };
}

function statusOf(tc: Node): { status: TestStatus; message?: string } {
  if (tc.failure !== undefined) return { status: "failed", message: messageOf(tc.failure) };
  if (tc.error !== undefined) return { status: "error", message: messageOf(tc.error) };
  // <skipped/> parses to "" so check for the key, not truthiness.
  if ("skipped" in tc) return { status: "skipped" };
  return { status: "passed" };
}

function messageOf(nodes: unknown): string | undefined {
  const first = asArray(nodes)[0];
  if (first === undefined || first === null) return undefined;
  if (typeof first === "string") return firstLine(first);
  const node = first as Node;
  const attr = str(node.message);
  const body = str(node["#text"]);
  // go-junit-report always writes message="Failed"; the real reason is in the body.
  if (GENERIC_MESSAGES.has(attr.toLowerCase()) && body) return firstLine(body);
  return firstLine(attr || body);
}

export function summarise(results: TestResult[]): TestRunSummary {
  const s: TestRunSummary = { total: results.length, passed: 0, failed: 0, error: 0, skipped: 0 };
  for (const r of results) s[r.status]++;
  return s;
}

function asArray<T>(v: T | T[] | undefined): T[] {
  if (v === undefined || v === null || v === "") return [];
  return Array.isArray(v) ? v : [v];
}

function str(v: unknown): string {
  return v === undefined || v === null ? "" : String(v).trim();
}

function firstLine(s: string): string | undefined {
  const line = s.split("\n").map((l) => l.trim()).find(Boolean);
  if (!line) return undefined;
  return line.length > 200 ? line.slice(0, 197) + "..." : line;
}
