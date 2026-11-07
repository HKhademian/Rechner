# Rechner Publication Investigation

**Date:** 2026-11-07  
**Status:** Investigation only; no deployment or remote push performed.

## Current fit

Rechner is an Astro 7 application whose pages can be statically generated. The current `astro.config.mjs` uses the default static output and does not configure a server adapter. The build command is `npm run build`; Astro writes the deployable site to `dist/`.

Calculator inputs and simulator state are persisted in browser `localStorage`. The repository search found no application API or network request path. A static deployment therefore fits the current architecture, and entered calculator state is kept in each visitor's browser rather than sent to a Rechner backend.

## Options

1. **Cloudflare Pages — recommended first deployment.** Connect the Git repository and configure production branch `main`, build command `npm run build`, output directory `dist`, and Node.js 22.12 or newer. This matches Astro's documented Pages setup and gives preview deployments for pull requests. A custom domain can be added after the first deployment.
2. **GitHub Pages — viable if keeping hosting within GitHub is preferred.** Astro supports publishing a prerendered site through GitHub Actions. Since this repository is named `calculator`, the default project URL is under `/calculator/`; Astro's `base` path and asset/route behavior need to be configured and checked before deployment. GitHub Pages sites are public, so verify repository contents and visibility first.
3. **Netlify or Vercel — also viable static hosts.** Both can deploy the generated `dist/` output. No host-specific adapter is needed unless Rechner later adds server-rendered routes or backend functions.

References: [Cloudflare Pages Astro guide](https://developers.cloudflare.com/pages/framework-guides/deploy-an-astro-site/), [Astro GitHub Pages guide](https://docs.astro.build/en/guides/deploy/github/), [GitHub Pages visibility and setup](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site).

## Recommended release sequence

1. Decide the public product name, URL/domain, whether the source repository should be public, and whether this is a public beta or a general release.
2. Review the exact commit intended for release and the repository's public contents. Git remote and tracking output changed during this investigation: the initial snapshot showed `main` 123 commits ahead of `origin/main`, while the latest snapshot had no upstream configured. Confirm the current GitHub repository and compare commits before any push. An unrelated untracked `test-random/` directory is present and must not be included accidentally.
3. Confirm a suitable root `LICENSE` if the source is intended to be open source. Website hosting does not require an open-source source repository.
4. Review the production-facing legal/model limitations and privacy wording. The README already states important calculation limits; make the user-facing notices easy to find before launch.
5. Build from a clean checkout using Node.js 22.12 or newer, deploy a preview, and check the catalog and calculator routes, client-side assets, browser persistence, exports, and mobile layout.
6. Promote the reviewed build to the production URL and add a custom domain if desired.

## Open decisions

- Hosting account and whether Cloudflare Pages is acceptable.
- Production URL/domain and product-facing name (“Rechner” versus another brand).
- Public website only, or public source code as well.
- Whether a source license and additional privacy/legal pages are desired for launch.

