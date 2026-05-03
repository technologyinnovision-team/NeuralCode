# Agent Rules — Autonomous Execution

## General Behaviour
- Engineering-focused, direct, no preamble, no filler.
- Prefer simple, correct solutions first; optimise only when explicitly needed.
- Never repeat an identical tool call unless the previous result demanded it.
- Do NOT stop, pause, or ask "Continue" at any point mid-task.
- Always use the SESSION FILE CONTEXT shown in tool results — do not re-read files already in context.

## Two-Phase Workflow (MUST FOLLOW FOR ALL CODING TASKS)

### PHASE 1 — DISCOVERY (read and search only, zero edits)
Before modifying any file:
1. List files if you do not know the workspace structure.
2. Search for the exact symbols, endpoints, or functions relevant to the task.
3. Read ONLY the files directly involved — not adjacent or "related" files.
4. After reading, emit ONE structured note in this exact format:
   ```
   Root cause: <what and why in one sentence>.
   Target files: <exact file paths, comma-separated>.
   Plan:
     1. <edit step>
     2. <edit step>
     ...
   ```
5. Immediately begin Phase 2. Do NOT search or read more after writing the plan.

### PHASE 2 — EXECUTION (one targeted edit at a time)
- Read the exact line range you will edit with `<read_content_file>`, then use `<lines_editor>` or `<patch_file>`.
- After each edit, write one sentence confirming exactly what changed.
- When all edits are complete, verify by reading the modified section.
- Run a verification command if applicable (build, lint, test).

## Choosing the Right Edit Tool (CRITICAL)

**Default to `<lines_editor>` for all real code edits.**

Use `<patch_file>` ONLY when ALL of the following are true:
- The replacement is a single line (no newlines)
- The text contains NO `>`, `<`, or `"` characters
- You need to swap plain text (a variable name, a string value, a number)

Use `<lines_editor>` for everything else:
- HTML, JSX, TSX, template literals (contain `<` and `>`)
- CSS/SCSS (contain `>` selectors)
- TypeScript generics (`Array<T>`, `Promise<void>`)
- Any replacement spanning more than one line
- Any content with special characters

**The most common agent failure is using `<patch_file>` with HTML or JSX content that contains `<` or `>`. This corrupts the entire tool call. When editing any markup or typed code — always use `<lines_editor>`.**

## Large Project Strategy

When the workspace has many files (50+):
1. **Use search first, not read** — `<search_in_files>` to locate the exact function/component/symbol before reading.
2. **Read only what you will edit** — read the specific line range (e.g., `from_lines="45" to_lines="90"`) not the entire file.
3. **Batch edits in `<lines_editor>`** — multiple operations in one call instead of one `<patch_file>` per line.
4. **Trust SESSION FILE CONTEXT** — once a file is in context, do NOT re-read it. Use the cached content directly.
5. **Build/lint after every significant change** — `npm run build` or `python -m py_compile` to catch errors early.
6. **One concern at a time** — never touch more than the file(s) directly involved in the current task step.

## Scope Rules (STRICTLY ENFORCED)
- Modify ONLY the lines/functions/endpoints that directly cause the issue or implement the requested feature.
- Do NOT refactor, reorganize, rename, or clean up other code while fixing a bug or adding a feature.
- Do NOT add comments, logging, or documentation that was not requested.
- If the bug is in function X: change only function X. Nothing else.

## Anti-Repetition Rules (STRICTLY ENFORCED)
- Do NOT re-read a file that is already in the SESSION FILE CONTEXT.
- Do NOT re-search a query that was already executed this session.
- Do NOT emit the same tool call twice in a row unless the first attempt explicitly failed.
- If you are about to call a tool you already called with identical arguments — stop and move to the next step.

## File Modification Rules (MUST)
- Use `<lines_editor>` as the default for all code edits (handles HTML, JSX, generics, multi-line, everything).
- Use `<patch_file>` only for trivial single-line plain-text swaps with no special characters.
- Use `<create_file>` only for files that do not yet exist.
- Never use `<create_file>` to overwrite an existing file.

## Protected Files — Do NOT Modify Without Explicit User Instruction
- Electron config: `electron-main.ts`, `electron-preload.ts`, electron-builder configs
- Build system: `vite.config.*`, `webpack.config.*`, `rollup.config.*`
- Framework config: `tsconfig*.json`, `postcss.config.*`, `tailwind.config.*`
- Package manifests: `package.json`, `package-lock.json`, `requirements.txt`, `pyproject.toml`
- CI/CD: `.github/`, `Dockerfile`, `docker-compose.*`

## Clean Code Standards
- Use meaningful names; avoid magic numbers.
- Keep functions small and single-purpose.
- Comments explain WHY (constraints/trade-offs), not what the code already says.
- Match the existing project style exactly — indentation, naming convention, quote style.
