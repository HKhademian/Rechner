# Version Control

Git is the version control system for this project.

## Remote Branching & Fast-Forward Workflow
- **Always push active development to a remote `dev` branch** (`origin/dev`) rather than committing or pushing unverified work directly to `main`.
- **Rebase before finalizing**: Fetch `origin/main` and rebase `dev` cleanly onto `origin/main`, resolving any conflicts and re-verifying all quality checks and builds on the rebased history.
- **Fast-forward to remote `main`**: Push the verified, rebased `dev` branch to `origin/dev`, then fast-forward `main` (`git merge --ff-only dev`) and push to `origin/main` so `main` stays linear with zero merge commits.
