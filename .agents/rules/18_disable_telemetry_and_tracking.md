# Disable Telemetry and Tracking Across All Contexts

All execution contexts, CLI runners, build scripts, dev servers, and configuration files in this repository must strictly disable telemetry, background analytics, and tracking:

1. **Environment Variables**:
   - `ASTRO_TELEMETRY_DISABLED=1`
   - `DO_NOT_TRACK=1`
   - `NEXT_TELEMETRY_DISABLED=1`
   - `VITE_TELEMETRY_DISABLED=1`
   - `CHECKPOINT_DISABLE=1`
   - `STORYBOOK_DISABLE_TELEMETRY=1`
   - `GATSBY_TELEMETRY_DISABLED=1`
   - `STRIPE_TELEMETRY_DISABLED=1`

2. **Package Scripts**:
   - All `package.json` scripts (`dev`, `build`, `preview`, `astro`, `sim`, `test`) must explicitly prepend `ASTRO_TELEMETRY_DISABLED=1 DO_NOT_TRACK=1`.

3. **Entrypoints & Configs**:
   - Top-level runtime files (`astro.config.mjs`, `src/cli/runner.ts`) must set `process.env.ASTRO_TELEMETRY_DISABLED = '1'` and `process.env.DO_NOT_TRACK = '1'`.
   - `.env` and `.env.production` files must maintain standard opt-out definitions.
   - `.npmrc` must disable package manager telemetry (`audit=false`, `fund=false`, `update-notifier=false`).
