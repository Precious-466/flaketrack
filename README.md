# FlakeTrack

A GitHub Action that tracks your test results across CI runs and tells you which failures are **flaky** rather than real.

> **Status: early development.** Right now FlakeTrack reads JUnit reports and writes a summary of each run. History tracking and flaky test detection are next (see the roadmap).

## Why

A flaky test passes and fails on the same code. Flaky tests waste CI time, teach people to hit "re-run" without looking, and hide real bugs. The good tools for this are paid and built for large companies. FlakeTrack is free, works with any language that can produce a JUnit XML report, and needs no server or account.

## Usage

```yaml
- name: Run tests
  run: pytest --junitxml=reports/junit.xml

- name: FlakeTrack
  if: always() # run even when tests fail
  uses: Precious-466/flaketrack@v0
  with:
    report-paths: reports/*.xml
```

### Producing a JUnit report

| Framework              | How                                                                                                                        |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| pytest                 | `pytest --junitxml=reports/junit.xml`                                                                                      |
| Jest                   | add [`jest-junit`](https://github.com/jest-community/jest-junit) and run `jest --reporters=default --reporters=jest-junit` |
| Go                     | `go test -v ./... 2>&1 \| go-junit-report > reports/junit.xml`                                                             |
| JUnit / Gradle / Maven | written by default to `build/test-results/` or `target/surefire-reports/`                                                  |

### Inputs

| Name           | Default         | Description                                          |
| -------------- | --------------- | ---------------------------------------------------- |
| `report-paths` | `**/junit*.xml` | Glob pattern(s) for JUnit XML reports, one per line. |

### Outputs

| Name     | Description                             |
| -------- | --------------------------------------- |
| `total`  | Number of test cases found.             |
| `failed` | Number of failed or errored test cases. |

## How tests are identified

Every test gets an ID of the form `<suite>::<name>`, for example `tests.test_auth::test_login_ok`. That ID is how FlakeTrack recognises the same test across different runs. The parser normalises the differences between frameworks: Jest repeats the full title in `classname`, Go puts subtests in the name (`TestRefund/partial`), and some tools nest suites.

## Development

```bash
npm install
npm test          # parser tests against sample reports in test/fixtures
npm run typecheck
npm run build     # bundles to dist/ — commit dist/, GitHub runs it directly
```

To try the Action locally on the sample reports:

```bash
npm run build
env 'INPUT_REPORT-PATHS=test/fixtures/*.xml' node dist/index.js
```

## License

MIT
