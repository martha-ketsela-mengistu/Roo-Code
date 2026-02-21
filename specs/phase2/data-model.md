# Phase 1: Data Model

This file describes the canonical data model for the Hook Engine and the `.orchestration/` sidecars.

Entities

1. ActiveIntent (stored in `.orchestration/active_intents.yaml`)

- id: string (e.g., "INT-001")
- name: string
- status: enum("OPEN","IN_PROGRESS","COMPLETE","ARCHIVED")
- owner: string (team or person)
- owned_scope: string[] (glob patterns, e.g., `src/auth/**`)
- constraints: string[]
- acceptance_criteria: string[]
- created_at: ISO8601 timestamp
- updated_at: ISO8601 timestamp

Example YAML record:

```yaml
active_intents:
    - id: "INT-001"
      name: "JWT Authentication Migration"
      status: "IN_PROGRESS"
      owner: "security-team"
      owned_scope:
          - "src/auth/**"
          - "src/middleware/jwt.ts"
      constraints:
          - "Must not use external auth providers"
      acceptance_criteria:
          - "Unit tests in tests/auth/ pass"
      created_at: "2026-02-20T12:00:00Z"
      updated_at: "2026-02-21T10:00:00Z"
```

2. AgentTraceEntry (append-only, newline-delimited JSON at `.orchestration/agent_trace.jsonl`)

- id: uuid-v4
- timestamp: ISO8601
- vcs: { revision_id: string }
- intent_id: string (optional but preferred)
- contributor: { entity_type: "AI" | "Human", model_identifier?: string, agent_id?: string }
- files: [
  { relative_path: string,
  conversations: [ { url?: string, ranges: [ { start_line: number, end_line: number, content_hash: string } ], related?: any[] } ]
  }
  ]

Example JSON line:

```json
{
	"id": "...",
	"timestamp": "2026-02-21T12:34:56Z",
	"vcs": { "revision_id": "abcd1234" },
	"intent_id": "INT-001",
	"contributor": { "entity_type": "AI", "model_identifier": "gpt-x" },
	"files": [
		{
			"relative_path": "src/auth/middleware.ts",
			"conversations": [
				{
					"ranges": [{ "start_line": 15, "end_line": 45, "content_hash": "sha256:..." }],
					"related": [{ "type": "specification", "value": "REQ-001" }]
				}
			]
		}
	]
}
```

Validation rules

- Content hashes MUST be computed using canonical serialization (LF line endings, no trailing whitespaces) and SHA-256.
- AgentTraceEntry records MUST be appended atomically; partial writes are invalid and must be rolled back or archived.

Indexes and performance

- For small repos, the JSONL file is sufficient. Optionally support an indexed SQLite store (`.orchestration/index.db`) built from the JSONL for faster queries. Creation of the index is opt-in and must be recorded in the trace ledger.
