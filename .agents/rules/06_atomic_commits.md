# Atomic Commits
Each commit must be strictly atomic.
- For each small feature, bug fix, or improvement, a different commit MUST be executed.
- No combination or batch commits are permitted.
- Commits MUST take lines in a single file into consideration.
- No combination of topics is allowed in a single commit.
- Most commits should not work at the file level, but at the line level.
- **Commit Order is Critical**: Commits must be made in a strictly logical progression (e.g., configuration/`.gitignore` files first, followed by dependencies, foundational core logic, and finally high-level features).
