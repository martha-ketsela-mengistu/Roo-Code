# Quickstart: AI-Native Hook Engine (developer preview)

Prerequisites

- Node.js 20.x (project uses Node 20.19.2)
- pnpm installed
- VS Code (for extension host)

Steps

1. Install dependencies and bootstrap the monorepo

```powershell
pnpm install
pnpm build
```

2. Enable Hook Engine (developer flow)

- Create a workspace setting (in `.vscode/settings.json` or user settings):

```json
{
	"orchestration.enabled": true,
	"orchestration.traceRetentionDays": 730,
	"orchestration.useSqlite": false
}
```

3. Prepare `.orchestration/` sidecars for demo

Create `.orchestration/active_intents.yaml` with a sample intent:

```yaml
active_intents:
    - id: "INT-001"
      name: "Build Weather API"
      status: "IN_PROGRESS"
      owned_scope:
          - "src/weather/**"
      acceptance_criteria:
          - "unit tests pass"
```

4. Developer run: launch extension in VS Code extension host and open two chat panels to simulate parallel agents (Architect + Builder). The Hook Engine will intercept `select_active_intent` and `write_file` calls.

5. Inspect traces: `.orchestration/agent_trace.jsonl` will be appended after successful writes. Use the demo CLI (to be implemented) `pnpm orchestration:show-trace` to visualize entries.

Notes

- For production, implement SAST and threat-model checks in CI for PRs that modify `src/hooks/` or `src/shared/tools.ts`.
- Review `specs/phase2/contracts/*.schema.json` for expected tool payloads and validation requirements.
