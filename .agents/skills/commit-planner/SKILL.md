---
name: commit-planner
description: Protocol for generating specific, atomic, and conventional Git commit messages. Enforces splitting session work into granular, single-purpose commits to prevent generic, monolithic commits. MANDATORY TRIGGER: Activate when staging changes, writing commit messages, finalizing session work, or committing files to git history.
---

# Atomic Commit & Message Skill (`commit-planner`)

This skill defines standard Git committing practices for Antigravity AI agents across all projects. It prioritizes **atomic, granular, and well-scoped commits** over single, monolithic commits when multiple changes occur in a session.

---

## 1. Core Objectives & Anti-Patterns

### ❌ Anti-Pattern: The Monolithic Generic Commit
Combining multiple unrelated changes (e.g., UI layout fixes, API client updates, package installations, and documentation edits) into a single commit:
- `git commit -m "updated code and fixed bugs"`
- `git commit -m "wip"`
- `git commit -m "minor edits"`

### ✅ Golden Rule: One Logical Change per Commit
Every commit **MUST** represent a single, self-contained logical unit of work. If a task modifies 10 files across 3 distinct functional areas, those changes must be split into multiple focused commits.

---

## 2. Conventional Commit Syntax

All commit messages **MUST** follow the Conventional Commits specification:

```
<type>(<scope>): <short imperative description>

[optional body explaining WHY the change was made]
```

### Commit Types & Generic Examples

| Type | Use Case | Generic Example |
|---|---|---|
| `feat` | New user-facing feature or functionality | `feat(api): add pagination support to search endpoint` |
| `fix` | Bug fix or error resolution | `fix(auth): handle expired session token gracefully` |
| `docs` | Documentation updates | `docs(readme): update deployment instructions` |
| `style` | Formatting, whitespace, or pure styling tweaks | `style(ui): adjust button padding and font alignment` |
| `refactor` | Code restructuring without behavior changes | `refactor(db): extract query helper logic into utility module` |
| `perf` | Performance optimizations | `perf(render): memoize list item components` |
| `test` | Adding or updating unit/integration tests | `test(user): add unit test for validation logic` |
| `chore` | Dependency updates, build scripts, or config edits | `chore(deps): bump library dependency to latest version` |

---

## 3. Step-by-Step Multi-Commit Workflow

When a session makes multiple changes across the codebase, agents **MUST** execute the following staging and committing routine:

### Step 1: Inventory All Changed Files
Run `git status` to view all modified, created, and deleted files.

### Step 2: Group Changes into Logical Buckets
Categorize files by functional scope. For example:
- **Bucket 1 (Core/Backend)**: Data access, API handlers, schema definitions
- **Bucket 2 (UI/Frontend)**: Views, components, styling stylesheets
- **Bucket 3 (Docs/Config)**: Project documentation, skill instructions, configuration files

### Step 3: Granular Staging & Individual Commits
Stage each bucket separately and commit individually. **Never use `git add .` or `git add -A` when multiple unrelated buckets exist.**

```bash
# Commit Bucket 1: Core/Backend logic
git add src/services/api.ts src/types/index.ts
git commit -m "refactor(api): extract request handler into dedicated client service"

# Commit Bucket 2: UI/Frontend components
git add src/components/Dashboard.tsx src/styles/theme.css
git commit -m "feat(ui): add loading indicator state for dashboard components"

# Commit Bucket 3: Documentation & configuration
git add README.md docs/setup.md
git commit -m "docs(setup): update setup prerequisites and installation steps"
```

### Step 4: History Verification
Run `git log -n 5 --oneline` to verify that the Git commit history is clean, atomic, and readable.

---

## 4. Writing Quality Commit Summaries

- **Use Imperative Mood**: Write in the present imperative ("add", "fix", "change", not "added", "fixing", "changed").
- **Keep Title Short**: Limit the first line (`<type>(<scope>): ...`) to 72 characters or fewer.
- **Explain Context in Body (If Needed)**: If the change addresses a non-obvious root cause, add a 1-2 sentence body detailing *why* the change was necessary.
