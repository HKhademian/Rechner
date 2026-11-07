// @ts-check
// Universal Telemetry & Analytics Opt-Out
process.env.ASTRO_TELEMETRY_DISABLED = '1';
process.env.DO_NOT_TRACK = '1';
process.env.NEXT_TELEMETRY_DISABLED = '1';
process.env.VITE_TELEMETRY_DISABLED = '1';
process.env.CHECKPOINT_DISABLE = '1';

import { execFileSync } from 'node:child_process';
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';

// Use the Actions-provided revision in deployments and the checked-out revision locally.
process.env.PUBLIC_SOURCE_COMMIT ??= process.env.GITHUB_SHA ?? execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();

// https://astro.build/config
export default defineConfig({
  site: "https://hkhademian.github.io",
  base: process.env.GITHUB_PAGES === "true" ? "/Rechner" : "/",
  integrations: [preact()]
});
