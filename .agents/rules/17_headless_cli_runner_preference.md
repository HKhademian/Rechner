# Headless CLI Runner Preference

Simulation verification, combinatorial testing, and multi-scenario runs are not bound to web browser rendering.

1. **Use Headless Runner**: Run simulations and verify output using the headless Node.js runner (`npm run sim -- [options]`) rather than triggering browser UI captures whenever possible.
2. **Minimize Browser Captures**: Avoid web browser captures or recordings during agent verification unless explicitly required for visual styling or CSS layout validation.
3. **Deterministic Output**: The CLI runner (`src/cli/runner.ts`) outputs the full KPI scorecard, Action Milestone Rows, and 60-month tabular ledgers with identical statutory calculations to the web application.
