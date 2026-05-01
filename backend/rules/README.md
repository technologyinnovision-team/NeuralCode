## NeuralCode Rules System

This folder defines **runtime-editable rules** that are injected into the agent's system prompt on every `/chat/agent` request.

### Files

- `SYSTEM_INSTRUCTIONS.md`
  - Highest-level product/system policy for your agent.
  - Use for global constraints (safety contract, output format, quality bar, verification expectations).

- `AGENT_RULES.md`
  - How the assistant should behave while solving tasks (workflow, planning, testing, stopping condition).

- `TOOL_RULES.md`
  - Tool protocol rules (how to call tools, when to call tools, what to avoid, output formatting around tools).

### How it works

`backend/server.py` reads these files and appends them to the built-in base prompt. If a file is missing, it is skipped.

### Recommended edit style

- Keep rules **short and unambiguous**.
- Prefer **MUST / MUST NOT / SHOULD** language.
- If you change rules, the server reloads with `--reload`.

