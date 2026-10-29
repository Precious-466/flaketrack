import * as core from "@actions/core";
import * as glob from "@actions/glob";
import { readFile } from "node:fs/promises";
import { parseJUnit, summarise } from "./parser";
import type { TestResult } from "./types";

async function run(): Promise<void> {
  const patterns = core.getInput("report-paths", { required: true });
  const globber = await glob.create(patterns, { followSymbolicLinks: false });
  const files = await globber.glob();

  if (files.length === 0) {
    core.warning(`No JUnit reports matched: ${patterns}`);
    return;
  }

  const results: TestResult[] = [];
  for (const file of files) {
    try {
      results.push(...parseJUnit(await readFile(file, "utf8")));
      core.info(`Parsed ${file}`);
    } catch (err) {
      core.warning(`Skipping ${file}: ${(err as Error).message}`);
    }
  }

  const s = summarise(results);
  core.setOutput("total", s.total);
  core.setOutput("failed", s.failed + s.error);

  // Week 2+ will save results to the data branch and compare against history here.

  const failures = results.filter((r) => r.status === "failed" || r.status === "error");
  await core.summary
    .addHeading("FlakeTrack", 2)
    .addTable([
      [
        { data: "Total", header: true },
        { data: "Passed", header: true },
        { data: "Failed", header: true },
        { data: "Errored", header: true },
        { data: "Skipped", header: true },
      ],
      [String(s.total), String(s.passed), String(s.failed), String(s.error), String(s.skipped)],
    ])
    .addList(
      failures
        .slice(0, 20)
        .map((f) => `<code>${escapeHtml(f.id)}</code>${f.message ? ` — ${escapeHtml(f.message)}` : ""}`),
    )
    .write();
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

run().catch((err) => core.setFailed((err as Error).message));
