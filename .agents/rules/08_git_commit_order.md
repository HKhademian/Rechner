# Logical Git Commit Ordering

When executing multiple atomic commits to establish a project or push a large feature set, you MUST order your commits in a strict logical progression from the foundation upwards:

1. **Configurations & Ignore Files**: Always commit `.gitignore` and environment configs first to ensure unwanted files are never accidentally tracked.
2. **Dependencies & Workspaces**: Commit `Cargo.toml`, `package.json`, or similar manifest files next.
3. **Documentation**: Commit foundational rules or high-level architecture documents.
4. **Core Logic**: Commit the base systems and foundational code.
5. **High-Level Features**: Commit the UI, implementations, or specific game/app logic last.
