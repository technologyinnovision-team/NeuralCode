# Project Rules — Structure, Workflow, and Commands

## Step 0 — Always Orient Before Acting

Before touching any file, answer these questions using tools:

1. **What kind of project is this?** — list files, check `package.json`, `requirements.txt`, `pyproject.toml`, `Cargo.toml`, `go.mod`, or similar.
2. **What is the entry point?** — `src/main.tsx`, `main.py`, `app.py`, `index.js`, `src/index.ts`, `main.go`, etc.
3. **Where are the components / modules?** — `src/components/`, `app/`, `lib/`, `pkg/`, etc.
4. **What are the run/build/test commands?** — check `scripts` in `package.json` or the README.
5. **Is there a workspace already set?** — if the workspace shows files, orient from the tree before reading individual files.

Do NOT guess or assume project structure. Always verify with a tool.

---

## Working on an Existing Project

### Discovery Phase (always first)
1. List files with `<Call_Tool_List_Files>` if the file tree is not yet known.
2. Search for the relevant symbol, endpoint, or component with `<search_in_files>`.
3. Read only the files directly involved in the task.
4. Write a concise plan (Root cause, Target files, numbered steps) before making any changes.

### Edit Phase
- Prefer `<patch_file>` for surgical edits. Read the exact section first if not in context.
- Check for import changes, type updates, and side effects when editing shared utilities.
- After each edit, verify with a read or a run command.
- Never refactor, rename, or restructure code that is outside the scope of the task.

### Preserving Existing Style
- Match the existing indentation, quote style, semicolon usage, and naming conventions exactly.
- Do NOT add linting/formatting passes unless explicitly requested.
- If the project uses a specific pattern (custom hooks, service layer, repositories), follow it.

---

## Starting a New Project

### Step 1 — Plan Before Writing Any Code
Create `PLAN.md` first with:
- **Goal**: one sentence describing what this project does.
- **Tech stack**: framework, language, key libraries, database, deployment target.
- **Directory structure**: list of directories and what goes in them.
- **Milestones**: numbered list of deliverable stages.

Then create `TODOS.md` with `- [ ]` checklist items for every concrete step.

### Step 2 — Scaffold the Project
Run the appropriate scaffold command (see below). Do NOT manually create every file when a scaffolding tool exists.

### Step 3 — Install Dependencies
Install all required packages in a single `<run_command>` call before writing feature code.

### Step 4 — Implement Feature by Feature
Work through TODOS.md top to bottom. Check off each item as it is completed and verified.

---

## Tech-Stack Scaffold Commands

### React + Vite (TypeScript)
```
npm create vite@latest my-app -- --template react-ts
cd my-app && npm install
npm run dev
```

### React + Vite (JavaScript)
```
npm create vite@latest my-app -- --template react
cd my-app && npm install
```

### Next.js (TypeScript, App Router)
```
npx create-next-app@latest my-app --typescript --tailwind --eslint --app
cd my-app && npm run dev
```

### Next.js (JavaScript, Pages Router)
```
npx create-next-app@latest my-app --js --pages
```

### Node.js + Express (TypeScript)
```
mkdir my-api && cd my-api
npm init -y
npm install express cors dotenv
npm install -D typescript ts-node @types/node @types/express nodemon
npx tsc --init
```

### Python + FastAPI
```
pip install fastapi uvicorn[standard] pydantic python-dotenv
uvicorn main:app --reload
```

### Python + Flask
```
pip install flask flask-cors python-dotenv
python app.py
```

### Django
```
pip install django djangorestframework
django-admin startproject myproject .
python manage.py startapp myapp
python manage.py runserver
```

### SvelteKit
```
npm create svelte@latest my-app
cd my-app && npm install && npm run dev
```

### Vue 3 + Vite
```
npm create vue@latest my-app
cd my-app && npm install && npm run dev
```

### Astro
```
npm create astro@latest my-app
cd my-app && npm install && npm run dev
```

### Electron + Vite
```
npm create @quick-start/electron my-app
cd my-app && npm install && npm run dev
```

---

## Common Directory Structures

### React / Vite Project
```
src/
  components/       # Reusable UI components (one file per component)
  pages/            # Route-level page components
  hooks/            # Custom React hooks (useFoo.ts)
  utils/            # Pure utility functions
  types/            # Shared TypeScript types/interfaces
  styles/           # Global CSS or theme files
  assets/           # Images, fonts, static files
  App.tsx
  main.tsx
public/             # Static assets served as-is
```

### Next.js (App Router)
```
app/
  layout.tsx        # Root layout
  page.tsx          # Home page
  (routes)/         # Grouped route segments
  api/              # API route handlers
components/         # Shared UI components
lib/                # Utilities and server-side helpers
hooks/              # Client-side custom hooks
types/              # Shared types
public/             # Static assets
```

### Python / FastAPI
```
main.py             # FastAPI app entry point
routers/            # APIRouter modules (one per resource)
models/             # Pydantic models / ORM models
services/           # Business logic layer
db/                 # Database setup and session
utils/              # Shared utility functions
tests/              # pytest test files
requirements.txt
.env
```

### Django
```
myproject/          # Project config (settings.py, urls.py, wsgi.py)
myapp/
  models.py
  views.py
  urls.py
  serializers.py    # (DRF)
  admin.py
  tests.py
static/
templates/
manage.py
requirements.txt
```

### Node.js + Express (TypeScript)
```
src/
  index.ts          # App entry point
  routes/           # Express routers (one per resource)
  controllers/      # Request handlers
  services/         # Business logic
  models/           # Data models / DB schemas
  middleware/       # Auth, validation, error handling
  utils/            # Shared helpers
  types/            # TypeScript interfaces
dist/               # Compiled output
```

---

## Package Management Commands

### npm
```bash
npm install                          # Install from package.json
npm install <package>                # Add runtime dependency
npm install -D <package>             # Add dev dependency
npm uninstall <package>              # Remove package
npm run <script>                     # Run a package.json script
npm run build                        # Build for production
npm run dev                          # Start dev server
npm run test                         # Run tests
npm run lint                         # Run linter
```

### yarn
```bash
yarn install
yarn add <package>
yarn add -D <package>
yarn remove <package>
yarn <script>
```

### pnpm
```bash
pnpm install
pnpm add <package>
pnpm add -D <package>
pnpm remove <package>
pnpm <script>
```

### pip (Python)
```bash
pip install -r requirements.txt      # Install from requirements file
pip install <package>                # Add a package
pip freeze > requirements.txt        # Update requirements file
```

### Poetry (Python)
```bash
poetry install                       # Install from pyproject.toml
poetry add <package>                 # Add dependency
poetry add --group dev <package>     # Add dev dependency
poetry run python main.py            # Run inside virtual environment
```

---

## Verification Commands by Stack

After every edit, run the appropriate verification command to confirm nothing is broken.

| Stack | Verify with |
|---|---|
| React / Vite | `npm run build` — check for zero TypeScript/compile errors |
| Next.js | `npm run build` |
| Node + TypeScript | `npx tsc --noEmit` then `npm run build` |
| Python / FastAPI | `python -c "from main import app; print('OK')"` |
| Django | `python manage.py check` |
| Any test suite | `npm test` / `pytest` / `go test ./...` |
| Linting | `npm run lint` / `flake8` / `eslint .` |

---

## Environment Variables

- Store secrets in `.env` (never commit to version control).
- Reference with `process.env.VAR_NAME` (Node) or `os.getenv("VAR_NAME")` (Python).
- Add `.env` to `.gitignore` immediately when creating a new project.
- Provide a `.env.example` with all required keys (no values) for documentation.
- Validate required env vars at application startup and fail loudly if missing.

---

## Working with Databases

### SQLite (quick local dev)
```python
# Python
import sqlite3
conn = sqlite3.connect("db.sqlite3")
```

### PostgreSQL (production-ready)
- Python: `pip install psycopg2-binary sqlalchemy`
- Node: `npm install pg` or `npm install @prisma/client prisma`

### Prisma (Node.js ORM)
```bash
npx prisma init
npx prisma migrate dev --name init
npx prisma generate
```

### SQLAlchemy (Python ORM)
```bash
pip install sqlalchemy alembic
alembic init migrations
alembic revision --autogenerate -m "init"
alembic upgrade head
```

---

## Git Conventions

- Commit messages: imperative mood, under 72 characters. Example: `Add user authentication endpoint`.
- Never commit: `.env`, `node_modules/`, `__pycache__/`, `dist/`, `build/`, `*.pyc`.
- Create `.gitignore` at project root from the start.
- Branch naming: `feature/<name>`, `fix/<name>`, `chore/<name>`.

---

## Rules for Large / Multi-File Projects

When a task spans 4 or more files, or involves building a significant new feature:

1. Create `PLAN.md` (scope, goals, tech stack, directory structure, numbered milestones) before writing any code.
2. Create `TODOS.md` with `- [ ]` checklist items grouped by milestone.
3. Work through `TODOS.md` strictly top to bottom.
4. After completing each milestone, update `TODOS.md` to mark items done.
5. Never mark an item complete until the code is written AND verified (read check or run command).
6. At the end of each milestone, summarise what was completed in one or two sentences.

---

## Anti-Patterns — Never Do These in a Project Context

- ❌ Guess at file paths — always verify with List Files or Search first.
- ❌ Create a file that already exists using `<create_file>` — use `<patch_file>` to edit it.
- ❌ Hard-code secrets, API keys, or credentials in source files.
- ❌ Import a package without first checking it is listed in `package.json` / `requirements.txt`.
- ❌ Run `npm install` without a package name to install everything when only one package is needed.
- ❌ Delete or overwrite `package.json`, `tsconfig.json`, config files, or `.env` without explicit instruction.
- ❌ Scaffold a new project inside an existing one without explicit user instruction.
- ❌ Assume the dev server port — always read the config or the startup command output.
- ❌ Skip the verification step after completing a task.
