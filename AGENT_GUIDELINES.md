# Agent Guidelines for lucid-hertz

This document contains strict rules and guidelines for any AI agents working on this codebase.

## 1. Strict Git Commits (Separation of Concerns)

**CRITICAL RULE:** No mixture of intent is ever allowed in a single git commit. 
You must commit each feature, each step, and each group of logical changes separately. 

- **Do NOT** lump unrelated features into a single "WIP" or "Update" commit.
- **Do NOT** commit refactoring along with new feature additions. 
- **Do NOT** commit bug fixes in the same commit as a new feature.

### Workflow Example:
If you are asked to add a new tax parameter AND fix a bug in the layout:
1. Make the layout fix. 
2. `git add src/styles/layout.css`
3. `git commit -m "fix: resolve layout alignment bug in results display"`
4. Add the new tax parameter.
5. `git add src/store/calculatorStore.js src/components/InputForm.jsx`
6. `git commit -m "feat: add child tax allowance parameter"`

Always prefer atomic, well-described commits.
