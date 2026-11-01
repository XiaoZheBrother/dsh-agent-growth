# dsh-agent-growth

[中文安装与使用说明](README.md) · [Releases](https://github.com/XiaoZheBrother/dsh-agent-growth/releases)

Evidence-backed learning, content ideas, post-publication reflection and versioned memory for DeepSeek Harness. The configured model writes the actual observations; this plugin supplies sources, schedules work and checks persistence.

**0.1.0 is an experimental local package.** Requires Node >=22.19 and DSH **0.2.1-rc.5**. Do not infer compatibility with other DSH releases. Automatic model calls are off by default. The plugin does not publish videos, send comments, install software, or alter persona files.

## Install and remove

Install the locally built archive through the official DSH CLI:

```sh
dsh plugin --profile web add /absolute/path/dsh-agent-growth-0.1.0.tgz
```

Restart DSH. The main conversation gains `agent_growth_status` and `agent_growth_recall`, both read-only. No browser interface is included in this version.

Configure the `agent-growth` entry using a patch like `examples/plugin.patch.yml`. Use a new inbox directory containing only files intended for model processing. Set `autoRun: true` when ready to allow paid model calls. Native background Agents follow the host's selected provider/model; no second API key or hardcoded model endpoint is required. Set `persona` explicitly; no personal persona or memories are bundled.

Remove with `dsh plugin --profile web remove dsh-agent-growth`, then restart. Local data is retained under `$DSH_HOME/agent-growth`; removal never deletes memories or an external inbox. `dataDir` can override this with an absolute path. Do not share one data directory between unrelated users/personas.

## Inputs and adapters

Core input is a versioned JSON task, demonstrated in `examples/learning.json`. Each source has an immutable ID, timestamp and text; optional `partial: true` identifies an excerpt. `kind` is `learn`, `review` or `memory`. `due` is Unix milliseconds. Updated input must use a new task/source revision ID.

Place events in the configured `inboxDir`, or use the installed CLI:

```sh
dsh-growth import /absolute/data-directory /absolute/event.json
dsh-growth status /absolute/data-directory
dsh-growth recall /absolute/data-directory
```

The inbox processes at most 100 changed files per check, tracks hashes and surfaces import failures. Correct a failed file to retry it. The directory is capped at 1000 JSON files; archive processed files when the explicit limit error appears. Filenames use ASCII letters, digits, dots, underscores and hyphens. Symlink files are rejected. Ingested sources are intentionally sent to the configured model when a task runs; do not place credential files in the inbox.

The separate **Bilibili snapshot adapter** accepts:

```json
{
  "version": 1,
  "type": "bilibili-snapshot",
  "bvid": "BV0000000001",
  "publishedAt": "2026-01-01T10:00:00Z",
  "capturedAt": "2026-01-02T11:00:00Z",
  "statistics": { "view": 100, "like": 5 },
  "observations": ["Synthetic example, not real account data."]
}
```

It queues an initial baseline and eligible 24/72-hour review windows, including available earlier snapshots for comparison. It **does not log in or fetch Bilibili data**: a collector must export fresh snapshots. Missing snapshots do not become zeros or invented historical measurements. This adapter boundary lets an existing Bilibili plugin retain account access without modifying its source. Credentials, account identifiers and its implementation are not bundled.

## Scheduling, memory and evidence

- When enabled, each polling round runs at most one job. Default polling interval: 30 minutes; default cap: 5 attempted jobs per local calendar day; default timeout: 5 minutes. Failures consume budget and are not automatically retried. The next UTC seven-day bucket can queue a memory review of recent completed artifacts when `memoryReview` is enabled; this is an interval bucket, not a specified weekday.
- The host must be running. This package does not install Windows startup tasks or promise execution during sleep/offline periods.
- Background work uses native DSH Agent scopes, a tool visibility restriction and a dispatch guard. Only `growth_input`, `growth_source`, `growth_save`, and `growth_readback` can execute. Sources are paged; citations preserve pages actually delivered and whether the source was complete.
- Job ownership, expiry, daily budget and source revisions live in SQLite. Concurrent processes cannot claim the same job. Save requires an actually read source; completion requires a readback. Readback is a body excerpt plus hash for longer results, not a full editorial review.
- Completed artifacts remain immutable. A memory task can mark an older result superseded only after reading its actual artifact source in full. Old results stay readable. The package neither rewrites Soul's core/persona files nor assumes access to them.
- Provenance proves which bytes were supplied, not that an external claim is true or a model understood it correctly. Other installed plugins remain trusted code in the host; the scope limits model tools, not malicious host plugins.

## Development

```sh
npm install --ignore-scripts
npm test
npm run check
npm pack
```

The archive uses an explicit file allowlist. Tests and private runtime data are excluded. Verify installation, tools, model execution and removal in a separate DSH home before integrating with a live account. Only Windows has been exercised locally so far; portable Node code is not a claim of macOS/Linux runtime acceptance.

Local validation on Windows with Node 22.23.1 and DSH 0.2.1-rc.5: 10 tests and syntax checks passed; official CLI installation and removal succeeded in an isolated DSH home. A real model completed the synthetic learning task through a native Agent, saved a sourced result and verified readback. Removal retained that result. Real Bilibili collection, long-running production operation, and other operating systems were not validated. The host installer emitted a peer-dependency warning; successful startup and this task establish only the stated version combination.

Inspired by the material/event workflows of dsh-bili-workbench, the topic-memory approach of dsh-soul-md, and auditable memory revisions in DSH-Ling. This package is an independent implementation atop DSH APIs and does not bundle those plugins or their private data.
