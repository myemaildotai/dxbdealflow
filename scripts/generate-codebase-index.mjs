import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = path.join(rootDir, ".agents", "codebase-index.md");
const ignoredNames = new Set([
  ".git",
  ".next",
  "build",
  "coverage",
  "dist",
  "graphify-out",
  "node_modules",
  ".temp",
]);
const sharedFolders = [
  ["src/components", "Reusable public, broker, admin, dashboard, and form UI."],
  ["src/lib", "Business rules, server data access, Supabase helpers, caching, email, and utilities."],
  ["src/hooks", "Reusable client hooks, including responsive, pagination, and Realtime behavior."],
  ["src/auth", "Authentication operations, hydration, provider, and session synchronization."],
  ["src/types", "Shared TypeScript contracts and database-facing types."],
];

const importantFolders = [
  ["src/app", "Next.js App Router pages, layouts, loading states, and route handlers."],
  ...sharedFolders,
  ["src/theme", "Brand tokens, MUI theme, and theme provider."],
  ["public/assets", "Static application and email assets."],
  ["supabase/migrations", "Ordered Supabase schema, RLS, RPC, trigger, and index migrations."],
  ["supabase/templates", "Supabase-managed email templates."],
  [".agents/skills", "Repository-specific guidance for AI coding tools."],
  ["graphify-out", "Generated dependency graph; inspect only for qualifying large tasks and do not index here."],
];

const pageAreaDefinitions = [
  [
    "Public discovery",
    ["src/app/page.tsx", "src/app/listings", "src/app/requirements"],
    "Public landing, listing discovery, and buyer-board routes.",
  ],
  [
    "Broker workspace",
    [
      "src/app/dashboard",
      "src/app/my-requirements",
      "src/app/post-listing",
      "src/app/post-requirement",
    ],
    "Approved-broker dashboard and create/manage flows.",
  ],
  ["Admin", ["src/app/admin"], "Admin moderation and operations routes."],
  [
    "Auth and onboarding",
    [
      "src/app/apply",
      "src/app/login",
      "src/app/pending",
      "src/app/register",
      "src/app/signin",
      "src/app/signup",
      "src/app/update-password",
    ],
    "Authentication, applications, and account-state routes.",
  ],
  [
    "Site modes",
    ["src/app/coming-soon", "src/app/maintenance"],
    "Coming-soon and maintenance experiences.",
  ],
];

const apiAreaDefinitions = [
  ["Admin", ["src/app/api/admin"], "Admin-only moderation and operations handlers."],
  [
    "Auth and broker verification",
    ["src/app/api/auth", "src/app/api/brokers"],
    "Session, password-reset, and broker-verification handlers.",
  ],
  ["Chat", ["src/app/api/chat"], "Participant-authorized conversation and message handlers."],
  ["Dashboard", ["src/app/api/dashboard"], "Approved-broker dashboard handlers."],
  [
    "Listings and leads",
    ["src/app/api/export", "src/app/api/leads", "src/app/api/listings"],
    "Listing mutations, enquiries, leads, and exports.",
  ],
  [
    "Requirements and matches",
    ["src/app/api/requirement-matches", "src/app/api/requirements"],
    "Requirement and listing-match handlers.",
  ],
  [
    "Public and site modes",
    [
      "src/app/api/coming-soon",
      "src/app/api/early-access-leads",
      "src/app/api/public",
    ],
    "Public metadata, registrations, and site-mode handlers.",
  ],
  ["Cron", ["src/app/api/cron"], "Authorized scheduled notification handlers."],
];

const skillRows = [
  ["`listings-module.md`", "Listing behavior, visibility, moderation, uploads, enquiries, and credits."],
  ["`requirements-module.md`", "Requirement behavior, matching, and moderation."],
  ["`chat-system.md`", "Private broker chat, Realtime, messages, cursors, and read state."],
  ["`email-templates-notifications.md`", "Email templates, delivery, eligibility, logging, and cron email."],
  ["`supabase-auth-rbac.md`", "Auth, roles, statuses, RLS, and storage authorization."],
  ["`responsive-ui.md`", "Visual-only responsive, presentation, and accessibility work."],
  ["`dashboard-performance.md`", "Shared dashboard loading, caching, hydration, and performance."],
  ["`nextjs-app-router.md`", "Routing, middleware, server/client boundaries, and shared API contracts."],
  ["`legal-public-pages.md`", "Legal, policy, public content, and legal navigation."],
  ["`context-retrieval-rules.md`", "Context-workflow changes, unclear task ownership, and qualifying large tasks."],
];

const configCandidates = [
  "AGENTS.md",
  "package.json",
  "package-lock.json",
  "middleware.ts",
  "next.config.js",
  "tsconfig.json",
  "tailwind.config.ts",
  "postcss.config.js",
  ".eslintrc.json",
  ".env.example",
  "vercel.json",
];

function toPosix(relativePath) {
  return relativePath.split(path.sep).join("/");
}

function isIgnored(relativePath) {
  return toPosix(relativePath)
    .split("/")
    .some((segment) => ignoredNames.has(segment));
}

async function exists(relativePath) {
  try {
    await access(path.join(rootDir, relativePath));
    return true;
  } catch {
    return false;
  }
}

async function walkFiles(relativeDir) {
  if (!(await exists(relativeDir)) || isIgnored(relativeDir)) {
    return [];
  }

  const files = [];
  const entries = await readdir(path.join(rootDir, relativeDir), {
    withFileTypes: true,
  });

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const relativePath = path.join(relativeDir, entry.name);
    if (isIgnored(relativePath)) {
      continue;
    }
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(relativePath)));
    } else if (entry.isFile()) {
      files.push(toPosix(relativePath));
    }
  }

  return files;
}

function packageVersion(packageJson, dependency) {
  return packageJson.dependencies?.[dependency] ?? packageJson.devDependencies?.[dependency] ?? "not listed";
}

function formatList(items, emptyText = "None found.") {
  return items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : `- ${emptyText}`;
}

function isWithinPath(file, candidatePath) {
  return file === candidatePath || file.startsWith(`${candidatePath}/`);
}

function summarizeRouteAreas(routeFiles, definitions, fallback) {
  const assigned = new Set();
  const rows = definitions.map(([area, paths, purpose]) => {
    const matches = routeFiles.filter((file) => paths.some((candidate) => isWithinPath(file, candidate)));
    matches.forEach((file) => assigned.add(file));
    return `| ${area} | ${matches.length} | ${paths.map((candidate) => `\`${candidate}\``).join(", ")} | ${purpose} |`;
  });
  const unassignedCount = routeFiles.filter((file) => !assigned.has(file)).length;
  if (unassignedCount > 0) {
    rows.push(`| ${fallback[0]} | ${unassignedCount} | \`${fallback[1]}\` | ${fallback[2]} |`);
  }
  return rows;
}

async function buildIndex() {
  const packageJson = JSON.parse(await readFile(path.join(rootDir, "package.json"), "utf8"));
  const appFiles = await walkFiles("src/app");
  const pageRoutes = appFiles.filter((file) => /^page\.(js|jsx|ts|tsx)$/.test(path.posix.basename(file)));
  const apiRoutes = appFiles.filter(
    (file) =>
      file.startsWith("src/app/api/") &&
      /^route\.(js|jsx|ts|tsx)$/.test(path.posix.basename(file)),
  );
  const pageAreaRows = summarizeRouteAreas(pageRoutes, pageAreaDefinitions, [
    "Other public/legal pages",
    "src/app/*/page.tsx",
    "Public content routes; use the legal/public skill and targeted search to locate the exact page.",
  ]);
  const apiAreaRows = summarizeRouteAreas(apiRoutes, apiAreaDefinitions, [
    "Other API handlers",
    "src/app/api/",
    "Handlers outside the main areas; locate with targeted search.",
  ]);

  const folderRows = [];
  for (const [folder, purpose] of importantFolders) {
    const present = await exists(folder);
    folderRows.push(`| \`${folder}/\` | ${present ? purpose : `${purpose} Currently absent.`} |`);
  }

  const sharedRows = [];
  for (const [folder, purpose] of sharedFolders) {
    const files = await walkFiles(folder);
    sharedRows.push(`| \`${folder}/\` | ${files.length} | ${purpose} |`);
  }

  const migrationFiles = (await walkFiles("supabase/migrations")).filter((file) => file.endsWith(".sql"));
  const templateFiles = await walkFiles("supabase/templates");
  const configFiles = [];
  for (const file of configCandidates) {
    if (await exists(file)) {
      configFiles.push(`\`${file}\``);
    }
  }

  const markdown = `# DXB Deal Flow Codebase Index

> Generated by \`npm run index:codebase\`. This is concise navigation metadata, not a source of truth. Verify stale or conflicting entries against current source.

## Project Overview

DXB Deal Flow is a private Dubai real-estate deal exchange with public discovery, approved-broker workspaces, and admin moderation. It uses the Next.js App Router and Supabase for authentication, PostgreSQL, Storage, Realtime, and RPC-backed workflows.

## Main Tech Stack

- Next.js: \`${packageVersion(packageJson, "next")}\`
- React: \`${packageVersion(packageJson, "react")}\`
- TypeScript: \`${packageVersion(packageJson, "typescript")}\` with strict mode
- Supabase JS: \`${packageVersion(packageJson, "@supabase/supabase-js")}\`
- UI: MUI \`${packageVersion(packageJson, "@mui/material")}\`, Tailwind CSS \`${packageVersion(packageJson, "tailwindcss")}\`, Framer Motion \`${packageVersion(packageJson, "framer-motion")}\`
- Forms and validation: React Hook Form and Yup
- Email: Nodemailer-backed server notifications

## Important Folders

| Folder | Purpose |
| --- | --- |
${folderRows.join("\n")}

## Task Start

- Classify the task using the small, medium, and large rules in \`AGENTS.md\`.
- Choose one primary skill from the map below. Add one supporting skill only when a medium task genuinely changes a second domain.
- Inspect only the scope allowed by that task size: direct task files for small tasks, or related module entry points and direct dependencies for medium tasks.
- Do not scan the whole project.
- Do not use Graphify for small or medium localized work.

## Primary Skill Map

| Skill | Use as primary for |
| --- | --- |
${skillRows.map(([skill, use]) => `| ${skill} | ${use} |`).join("\n")}

## Page Route Areas

Exact route inventories are intentionally omitted. Use the relevant skill and targeted search to locate the affected route.

| Area | Pages | Starting paths | Purpose |
| --- | ---: | --- | --- |
${pageAreaRows.join("\n")}

## API Route Areas

| Area | Handlers | Starting paths | Purpose |
| --- | ---: | --- | --- |
${apiAreaRows.join("\n")}

## Key Shared Folders

| Folder | Files | Purpose |
| --- | ---: | --- |
${sharedRows.join("\n")}

## Supabase Summary

- Migrations: ${migrationFiles.length} ordered SQL files${migrationFiles.length > 0 ? `, from \`${migrationFiles[0]}\` through \`${migrationFiles.at(-1)}\`` : ""}.
- Templates: ${templateFiles.length > 0 ? templateFiles.map((file) => `\`${file}\``).join(", ") : "none found"}.
- Preserve RLS assumptions. Never modify schema or create migrations unless explicitly requested.

## Important Config Files

${formatList(configFiles)}

## Codex Usage Notes

- Read \`AGENTS.md\`, this index, and one primary \`.agents/skills/*.md\` guide before making changes.
- Graphify is restricted to qualifying large cross-module, unclear-impact, architecture, shared-contract, or broad performance investigations.
- Trace the affected route, API handler, shared utility, Supabase dependency, and public/broker/admin role impact before editing.
- Do not treat this index, Graphify output, or historical documents as authorization or behavior proof. Inspect the current route handler, server helper, and RLS-sensitive query.
- Reuse existing utilities, keep filtering and pagination server-side, and avoid duplicate API calls.
- Regenerate this file with \`npm run index:codebase\` after significant source-structure changes. Never treat stale entries as authoritative.
- Run \`npm run index:check\` to verify this file exists and is not empty.

## Index Scope

The generator reads \`package.json\` plus file names under \`src/app\`, the listed shared folders, \`supabase/migrations\`, and \`supabase/templates\`. It emits summaries only, ignores \`node_modules\`, \`.next\`, \`dist\`, \`build\`, \`coverage\`, \`graphify-out\`, \`supabase/.temp\`, and \`.git\`, and never reads or dumps application contents, CSS, assets, or generated output.
`;

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, markdown, "utf8");
  console.log(`Generated ${toPosix(path.relative(rootDir, outputPath))}`);
}

await buildIndex();
