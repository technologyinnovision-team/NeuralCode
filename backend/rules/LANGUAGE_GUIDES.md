# Language-Specific Guides

Follow these guides exactly when writing or editing code in each language.
Always match the existing project style (indentation, quote style, naming) if it differs from the defaults below.

---

## Python

### Style
- Indentation: 4 spaces (never tabs).
- Quotes: double quotes for strings unless the string contains a double quote.
- Line length: max 100 characters.
- Naming: `snake_case` for variables and functions, `PascalCase` for classes, `UPPER_SNAKE_CASE` for constants.
- Use type hints on all function signatures: `def parse(text: str) -> list[str]:`.

### Imports
- Standard library first, third-party second, local modules third.
- One blank line between each group.
- Never use wildcard imports (`from x import *`).

### Error Handling
- Use specific exception types, never bare `except:`.
- Always log or re-raise exceptions — never silently swallow them.
- Use `raise ValueError("...")` for invalid input, not `assert`.

### Functions and Classes
- Functions do one thing. If a function does more than one thing, split it.
- Docstrings on public functions: one-line summary, then parameters and returns if non-obvious.
- Prefer `dataclasses` over plain dicts for structured data.
- Use `pathlib.Path` instead of `os.path` for file operations.

### Async
- Use `async def` and `await` consistently throughout a module.
- Never mix sync and async file I/O in the same call path.
- Use `asyncio.gather` for parallel async tasks.

---

## JavaScript / TypeScript

### Style
- Indentation: 2 spaces.
- Quotes: single quotes for JS, double quotes for JSX attributes.
- Semicolons: match existing project style.
- Line length: max 100 characters.
- Naming: `camelCase` for variables and functions, `PascalCase` for classes and components, `UPPER_SNAKE_CASE` for constants.

### TypeScript Specifics
- Always use explicit types on function parameters and return values.
- Prefer `interface` over `type` for object shapes.
- Use `unknown` instead of `any`. Narrow types before use.
- Enable strict mode in `tsconfig.json`.
- Use `as const` for literal arrays and objects that should not be widened.
- Use optional chaining (`?.`) and nullish coalescing (`??`) instead of `||` for nullable values.

### Modules
- Use ES module syntax (`import`/`export`), never `require()` in TypeScript.
- Named exports are preferred over default exports for non-component utilities.
- Group imports: external libraries first, internal modules second, types last.

### Error Handling
- Use `try/catch` with typed error checks (`if (err instanceof Error)`).
- Never swallow errors silently. Always log or rethrow.
- Use `Promise.all` for parallel async operations.

### Node.js Specifics
- Use `fs/promises` (async) instead of sync `fs` methods.
- Use `path.join` and `path.resolve` for file paths — never string concatenation.
- Validate all environment variables at startup with a clear error message.

---

## React / JSX / TSX

### Components
- One component per file. File name matches component name exactly.
- Use functional components with hooks — no class components.
- Props interface must be defined and named `<ComponentName>Props`.
- Destructure props at the function signature level.

### Hooks
- Never call hooks conditionally or inside loops.
- `useEffect` cleanup: always return a cleanup function if the effect sets up a subscription, timer, or event listener.
- Extract complex logic into custom hooks (`useFoo`).
- Use `useCallback` for functions passed as props to child components.
- Use `useMemo` only when the computation is measurably expensive.

### State
- Keep state as local as possible (lift only when necessary).
- Use `useReducer` instead of multiple related `useState` calls.
- Never mutate state directly — always use the setter or return a new object.

### Rendering
- Always provide `key` props on list elements — use stable unique IDs, never array indexes if the list can reorder.
- Avoid inline function definitions in JSX when they cause unnecessary re-renders.
- Use conditional rendering patterns: `condition && <Component />` or ternary — never `if/else` inside JSX.

### Styling
- Match the existing styling approach (CSS modules, Tailwind, styled-components, etc.).
- Never mix styling approaches in the same component.

---

## CSS / Tailwind CSS

### Plain CSS
- Use BEM naming: `.block__element--modifier`.
- Variables: `--color-primary`, `--spacing-md` (kebab-case with prefix).
- Mobile-first media queries.
- Avoid `!important` — restructure specificity instead.

### Tailwind CSS
- Apply utility classes directly in JSX — no custom CSS unless Tailwind cannot cover it.
- Group classes logically: layout → spacing → typography → color → state → responsive.
- Extract repeated patterns into components, not `@apply`.
- Use `cn()` or `clsx()` for conditional class merging.
- Never use arbitrary values (`w-[123px]`) for values that have a Tailwind equivalent.

---

## HTML
- Use semantic elements: `<header>`, `<main>`, `<nav>`, `<section>`, `<article>`, `<aside>`, `<footer>`.
- All images must have `alt` attributes.
- Form inputs must have associated `<label>` elements.
- Use `data-*` attributes for JavaScript hooks, not `class` or `id`.
- Self-close void elements: `<input />`, `<img />`, `<br />`.

---

## Shell / Bash
- Use `#!/usr/bin/env bash` shebang.
- Set safety flags at the top: `set -euo pipefail`.
- Quote all variable expansions: `"$VAR"`, `"$@"`.
- Use `[[ ]]` instead of `[ ]` for conditionals.
- Use `local` for function-local variables.
- Prefer `$(command)` over backticks.
- Check exit codes explicitly when `set -e` is not appropriate.

---

## JSON / YAML
- JSON: 2-space indentation, double quotes, no trailing commas.
- YAML: 2-space indentation, prefer quoted strings for values that could be misread as booleans or numbers.
- Never add comments to JSON files.
- Keep keys sorted alphabetically in config files unless order matters (e.g., scripts in package.json).

---

## SQL
- Keywords in UPPERCASE: `SELECT`, `FROM`, `WHERE`, `JOIN`, `GROUP BY`.
- One clause per line for queries longer than 60 characters.
- Always use parameterised queries — never string-interpolate user input into SQL.
- Name indexes: `idx_<table>_<column>`.
- Use `COALESCE` instead of `IFNULL`/`NVL` for portability.
