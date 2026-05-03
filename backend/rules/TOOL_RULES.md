# Tool Rules — Tag Protocol

## One Tool Per Response — HARD RULE
- Emit **exactly ONE tool tag** per response. The loop executes one tool, feeds you the result, then lets you continue.
- **Self-correction rule**: Before closing your response, scan for a second `<` tool-opening. If you find one, delete everything from that second opening tag onward and stop.
- Writing two or more tool tags in one response is a silent failure — the second tool is cancelled and logged as "Skipped". Never rely on stacking.
- Never output any text AFTER the closing tool tag. The tool tag must be the very last thing in your response.

## Tool Selection Priority
1. **`<lines_editor>`** — the safest, most powerful edit tool. Use for ALL multi-line edits, any content with HTML/JSX/`>` characters, and multi-location changes.
2. **`<patch_file>`** — only for short, single-line, plain-text replacements that contain NO special characters. When in doubt, use `<lines_editor>`.
3. **`<create_file>`** — brand-new files only. Never use on an existing file.
4. **`<read_content_file>`** — read before editing. Skip if the file is already in SESSION FILE CONTEXT.
5. **`<search_in_files>`** — locate symbols, imports, patterns, or usages across the workspace.
6. **`<Call_Tool_List_Files>`** — only when you do not yet know the workspace structure.
7. **`<run_command>`** — install, build, test, lint, or verify output.

## Tool Tag Reference

### List workspace files
```
<Call_Tool_List_Files></Call_Tool_List_Files>
```
- Use once at the start of a task if you have not seen the file tree. Do NOT repeat.

### Read file content
```
<read_content_file path="relative/path.ext" from_lines="1" to_lines="80"></read_content_file>
```
- `from_lines` / `to_lines` are optional (omit to read the whole file).
- Do NOT read a file that is already in SESSION FILE CONTEXT.
- Read only the lines you need for the next edit — not the whole file if you only need a small section.

### Search across all files
```
<search_in_files query="exact text or symbol name" max_results="30"></search_in_files>
```
- Use plain-text queries, not regex, unless pattern matching is explicitly required.
- Keep queries short and specific — one symbol or phrase at a time.
- Do NOT repeat a query that was already searched this session.

### Patch an existing file — ONLY for short plain-text replacements
```
<patch_file path="relative/path.ext" search="exact unique text to find" replace="new replacement text"></patch_file>
```

**HARD RULES — violating these will corrupt or silently skip the tool call:**

1. ❌ **No `>` anywhere in `search` or `replace`** — this includes `>` in HTML tags (`</div>`), JSX (`<Component>`), comparisons (`x > 0`), CSS selectors (`.a > .b`), TypeScript generics (`Array<T>`), template literals, or anywhere else. The `>` character terminates the tag parser.

2. ❌ **No `<` anywhere in `search` or `replace`** — same reason. Any opening tag character breaks parsing.

3. ❌ **No newlines in `search` or `replace`** — attributes are single-line only. If you need to replace a block of code, use `<lines_editor>`.

4. ❌ **No quotes (`"`) in attribute values** — the `"` character terminates the attribute.

**→ If your replacement contains ANY of the above: use `<lines_editor>` instead. This covers ~80% of real edits.**

`<patch_file>` is ONLY appropriate for trivial one-liner text swaps like renaming a variable, changing a string value, or updating a number — where the content is plain ASCII with no brackets, quotes, or tags.

### Edit specific lines — USE THIS for all real code edits
```
<lines_editor path="relative/path.ext">
[
  {"op": "replace", "start_line": 12, "end_line": 14, "content": "new line 1\nnew line 2\n"},
  {"op": "insert", "after_line": 20, "content": "inserted line\n"},
  {"op": "delete", "start_line": 30, "end_line": 32}
]
</lines_editor>
```
- **Always read the exact lines first** with `<read_content_file>` to get accurate line numbers.
- The `content` field in JSON uses `\n` for newlines — safe for any character including `>`, `<`, `"`, HTML, JSX, etc.
- Use this for ALL of the following:
  - Any replacement involving HTML, JSX, CSS, TypeScript generics, or template literals
  - Any multi-line replacement or block of code
  - Any content containing `>`, `<`, or `"`
  - Multiple edits in the same file (batch them in one call)

### Move or rename a file
```
<rename_file path="old/relative/path.ext" new_path="new/relative/path.ext"></rename_file>
```
- Creates missing parent directories automatically. Never overwrites an existing destination.

### Create a brand-new file
```
<create_file path="relative/new_file.ext">
COMPLETE FILE CONTENT — NO PLACEHOLDERS, NO ELLIPSIS
</create_file>
```
- Only for files that do NOT yet exist. Using this on an existing file is an error.
- Body must be the complete, final, production-ready content.
- For large files with lots of HTML/JSX/code, this is the correct tool since the body is free-form.

### Run a shell command
```
<run_command command="npm run build" timeout="60"></run_command>
```
- Use for installs, builds, tests, linting, and verification steps.
- Set `timeout` appropriately: default 30 s, installs 180 s, builds 120 s.
- Always inspect `return_code` and `stderr` in the result.

## Decision Tree — Which Edit Tool?

```
Does the replacement contain >, <, ", or newlines?
  YES → use <lines_editor>
  NO  → Is it a simple one-liner plain-text swap?
          YES → <patch_file> is fine
          NO  → use <lines_editor>
```

## Forbidden Patterns — NEVER DO THESE
- ❌ Two or more tool tags in one response.
- ❌ Text after the closing tool tag.
- ❌ Re-reading a file already in SESSION FILE CONTEXT.
- ❌ Re-searching a query already executed this session.
- ❌ A tool call identical to the previous one (duplicate blocker will cancel it).
- ❌ `<create_file>` on an existing file.
- ❌ `...`, `# TODO`, `<!-- TODO -->`, or any placeholder in file content.
- ❌ `>` or `<` inside a `patch_file` attribute value — corrupts the tag parser. Use `<lines_editor>`.
- ❌ Newlines inside a `patch_file` attribute value — use `<lines_editor>` for multi-line edits.
- ❌ Native function-calling format — only XML-like tags are supported.
