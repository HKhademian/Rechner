# Automated Quality Verification and Diagnostics

All agents, developers, and CI pipelines must utilize standard npm verification commands to audit code quality, compiler errors, linter warnings, style violations, test coverage, and build integrity before committing changes.

## 1. Quality Check Command Matrix

The repository exposes standardized npm scripts for granular and holistic quality checks:

| Command | Purpose | Failure Condition |
| :--- | :--- | :--- |
| `npm run check` / `npm run verify` | Master holistic check running formatting, types, tests, and static analysis | Any error, warning, or test failure |
| `npm run check:types` | TypeScript compiler type checking (`tsc --noEmit`) | Any compiler error |
| `npm run check:format` | Prettier code style formatting verification | Any unformatted file |
| `npm run check:test` | Node.js native test suite runner (`node --test`) | Any failing test |
| `npm run check:build` | Static site bundle generation (`astro build`) | Build failures |
| `npm run check:audit` | Advanced AST static analysis & rule compliance scanner | Violations of repo rules (e.g. single quotes, unhandled errors) |
| `npm run fix` / `npm run apply` | Auto-remedies formatting and fixable style issues | — |

## 2. Telemetry and Sandbox Safety
- All automated check scripts MUST include `ASTRO_TELEMETRY_DISABLED=1 DO_NOT_TRACK=1` per Rule 18.
- Scripts must output clear warning/error counts with actionable file links and line references.
