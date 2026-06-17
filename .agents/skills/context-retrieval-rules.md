# Context Retrieval Rules

## Use For

Use as the primary skill for AI context-file work, unclear task ownership, or qualifying large cross-module investigations.

## Start Here

- `AGENTS.md`: repository-wide safety, route, performance, and validation rules.
- `.agents/codebase-index.md`: current route, endpoint, utility, and architecture navigation.
- `.agents/skills/*.md`: focused feature guides.
- `graphify-out/GRAPH_REPORT.md` and `graphify-out/manifest.json`: secondary architecture context for qualifying large work.

## Retrieval Workflow

1. Classify the task using `AGENTS.md`.
2. Choose one primary skill and at most one genuinely necessary supporting skill.
3. Inspect the route or API entry point, direct callers/imports, server helper, authorization helper, and RLS-sensitive query.
4. For large work, compare Graphify's source commit with `git rev-parse HEAD`; verify graph conclusions against current dirty-worktree source.
5. Keep searches targeted. Broad inventories are appropriate only when the task explicitly updates repository context or architecture documentation.

## Safe Change Rules

- Current source and runtime configuration override generated indexes, Graphify, and historical documents.
- Do not infer authorization, pagination, or hydration behavior from names alone.
- Do not manually edit generated Graphify files.
- Do not modify runtime code during context-only work.
- After `npm run index:codebase`, restore repository-specific architecture notes that the baseline generator does not emit.

## Validation

- Context-only: `npm run index:check` and targeted stale-reference searches.
- Application changes: `npm run lint`, `npx tsc --noEmit --pretty false`, and `npm run build`.

