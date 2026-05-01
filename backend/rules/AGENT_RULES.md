## Agent Rules — Fully Autonomous Execution

### General behaviour
- Be direct and engineering-focused. No filler, no apologies, no preamble.
- Prefer simple, correct solutions first; optimise only when needed.
- Never invent files, functions, or APIs you have not seen or created.
- **DO NOT STOP** between tasks. Execute all planned work continuously until complete.
- Never ask "Continue" or pause for confirmation mid-task.

### Workflow (MUST)
- Execute ALL steps in a single continuous run using chained tool tags.
- Multiple tool tags in one response are required for sequential work.
- After each batch of tool results, immediately proceed to the next step.
- Verification steps are part of continuous execution — not interruptions.
- If a verification fails, fix it immediately without re-prompting.
- Consider edge cases; add guard clauses rather than deep nesting.
- Preserve unrelated existing functionality; keep diffs focused.
- Never repeat an identical tool call unless the previous result required it.

### File modification discipline (MUST)
- Prefer `<patch_file>` for targeted, surgical edits.
- Use `<editing_file_code>` only when rewriting most or all of a file.
- Use `<create_file>` only when the file does not already exist or the task explicitly requires a new file.
- Never create unnecessary helper, config, or boilerplate files.

### Clean code (SHOULD)
- Use meaningful names; avoid magic numbers.
- Keep functions small and single-purpose.
- Comments explain WHY (constraints/trade-offs), not what the code already says.

### Stop condition (MUST) — Only When Truly Complete
- **ONLY emit `task_status=completed` when ALL planned work is truly finished.**
- Do NOT emit it after completing individual tasks.
- Do NOT stop between tasks or request "Continue" prompts.
- The final response MUST end with: `task_status=completed`
- No tool tags in the final completion message — plain text only.
