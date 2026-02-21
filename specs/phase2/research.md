# Phase 0 Research: AI-Native IDE Hook System

Decision summary (resolved NEEDS_CLARIFICATION):

- Retention policy for `agent_trace.jsonl`: Default retention = 2 years, configurable via workspace setting `orchestration.traceRetentionDays`. Old entries beyond retention are archived (compressed) and moved to `.orchestration/archives/` with checksum manifest. Rationale: balances forensic needs and storage growth.
- Storage format: Primary is newline-delimited JSON (`agent_trace.jsonl`) + `active_intents.yaml` for human-editable state. Optional local SQLite index is allowed for performance but must be created only when enabled (`orchestration.useSqlite: true`) and must be migration-aware.
- Hashing algorithm: SHA-256 via Node `crypto.createHash('sha256')`, canonical serialization: trim trailing whitespace, normalize line endings to LF, and use the exact block text to compute content hash.

Research tasks (Phase 0 outputs):

1. Task: Research canonical serialization for spatial hashing
    - Outcome: Use LF-normalized, trimmed-content string; include small header with language/filepath when serializing ranges.
2. Task: Evaluate storage backends (file vs SQLite) for local performance
    - Outcome: File-first approach (YAML+JSONL). SQLite as optional index for large repos.
3. Task: Define trace retention & archival policy
    - Outcome: Default 2 years; config override; periodic archive job in CLI/debug tool.
4. Task: Threat model checklist for new tools
    - Outcome: Minimal checklist: input validation, authorization, secret exposure, supply-chain for tool payloads.

Research rationale and alternatives considered:

- Files (YAML + JSONL) chosen for transparency and easy inspection; databases add operational burden and migration complexity. Alternative SQLite considered for speed but marked optional.
- 2-year retention chosen to balance auditability and storage; alternative infinite retention rejected due to unbounded growth.

Next steps from research:

- Implement canonical serializer and unit tests.
- Implement a CLI command `orchestration archive-traces` for archival.
- Add workspace settings schema for `orchestration.*` options and document in `quickstart.md`.
