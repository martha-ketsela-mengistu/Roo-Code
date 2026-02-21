# Feature Specification: AI-Native IDE Hook System

**Feature Branch**: `phase2`  
**Created**: 2026-02-21  
**Status**: Draft  
**Input**: "upgrade to ai native ide using hook system with intent code traceability"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Architect selects active intent (Priority: P1)

As an Architect-agent or human reviewer, I must select or create an active intent before any mutating agent action occurs so that all downstream code changes are traceable to a formalized intent.

**Why this priority**: Enforces the two-stage state machine and prevents unconstrained code generation; required for governance.

**Independent Test**: In a fresh workspace, calling the agent without selecting an intent results in a blocked write with the message: "You must cite a valid active Intent ID." Selecting an intent returns the intent context block.

**Acceptance Scenarios**:

1. Given no active intent, When agent attempts a destructive command, Then Pre-Hook blocks the call and returns a standardized JSON error.
2. Given `active_intents.yaml` contains `INT-001`, When agent calls `select_active_intent("INT-001")`, Then Hook returns an `<intent_context>` containing `owned_scope`, `constraints`, and `acceptance_criteria`.

---

### User Story 2 - Builder writes code under intent scope (Priority: P1)

As a Builder-agent, I must be able to make permitted changes only inside the `owned_scope` of the active intent; successful writes append a trace entry linking intent→code hash.

**Independent Test**: Attempt to write a file inside scope and outside scope; inside succeeds and produces agent_trace.jsonl entry, outside is blocked with "Scope Violation".

**Acceptance Scenarios**:

1. Given INT-001 owns `src/auth/**`, When agent writes `src/auth/middleware.ts`, Then Post-Hook appends an entry with content hash and ranges to `agent_trace.jsonl`.
2. Given INT-001 does not own `src/payments/**`, When agent writes `src/payments/charge.ts`, Then Pre-Hook blocks with a scope violation error.

---

### User Story 3 - Master Thinker parallel orchestration (Priority: P2)

As the Master Thinker, multiple agents run in parallel; the system prevents lost updates using optimistic concurrency and records Lessons Learned on verification failures.

**Independent Test**: Two agents attempt to modify the same file concurrently; the second agent receives a "Stale File" error and must re-read. When a verification (lint/test) fails, an entry is appended to `CLAUDE.md`.

**Acceptance Scenarios**:

1. Given Agent A reads file hash H1, Agent B updates the file producing H2, When Agent A writes using stale H1, Then write is blocked and returns "Stale File".

---

### Edge Cases

- Partial writes / interrupted sessions: Post-Hook must not append incomplete trace entries—Post-Hook should be atomic.
- Migration of intents: If an intent is removed, existing trace entries must remain immutable and flagged as `INTENT_ARCHIVED`.
- Large refactors: Spatial hashing must still identify moved code ranges; fallback: record full-file content hash when range detection fails.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The extension MUST expose a `select_active_intent(intent_id: string)` tool that returns the formalized intent context.
- **FR-002**: The Hook Engine MUST provide Pre-Hook and Post-Hook interception points for all tool executions (read vs write classification).
- **FR-003**: Mutating tools (e.g., `write_file`) MUST require `intent_id` and `mutation_class` in their call payloads; missing `intent_id` MUST cause Pre-Hook to block execution.
- **FR-004**: The system MUST enforce scope checks using `active_intents.yaml` `owned_scope` rules and block out-of-scope writes with a `Scope Violation` error.
- **FR-005**: Post-Hook MUST append an `Agent Trace` record to `.orchestration/agent_trace.jsonl` after successful mutating operations, including content hashes for modified ranges.
- **FR-006**: The system MUST compute SHA-256 content hashes for ranges and support full-file fallback when ranges are not resolvable.
- **FR-007**: Concurrency control: writes MUST be rejected if the on-disk hash differs from the agent-read hash; a `Stale File` error MUST be returned.
- **FR-008**: Hooks affecting UI (authorization prompts) MUST surface HITL approval using standard IDE dialogs and provide a standardized JSON error to the agent on rejection to enable recovery.
- **FR-009**: All changes to `active_intents.yaml`, `.orchestration/agent_trace.jsonl`, and `intent_map.md` MUST be machine-managed and append-only where applicable.
- **FR-010**: Security: Any PR touching mutating hooks or trace pipelines MUST include a threat model summary and pass automated SAST/SCA checks.

### Key Entities

- **ActiveIntent**: id, name, status, owned_scope[], constraints[], acceptance_criteria[]
- **AgentTraceEntry**: id(uuid), timestamp, vcs.revision_id, files[{relative_path, conversations[{url, contributor, ranges[{start_line,end_line,content_hash}], related[]}]}]
- **IntentMap**: Human-readable mapping from intent id to files/AST nodes
- **HookEngine**: Pre-Hook/Post-Hook middleware with classification rules and enforcement logic
- **MutationPayload**: { intent_id, mutation_class, file_path, original_hash, new_content }

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of successful `write_file` events are recorded in `.orchestration/agent_trace.jsonl` with at least one content hash per modified range.
- **SC-002**: Pre-Hook blocks 100% of mutating attempts missing a valid `intent_id` (tested on a sample of 100 simulated attempts).
- **SC-003**: Concurrency control prevents silent overwrites: when simulated concurrent writes occur, at least 95% of stale-write attempts are rejected and reported.
- **SC-004**: In a demo run, two parallel agent sessions complete the workflow (Architect + Builder) and produce a trace showing correct intent→hash mapping.
- **SC-005**: All PRs that change hooks or trace code include threat model and pass security checks before merge.

## Assumptions

- The extension environment supports adding interception/ middleware points in the execution loop.
- Developers accept adding `.orchestration/` as a workspace-managed sidecar directory.
- Content hashing is deterministic across environments (canonical serialization of ranges is available).

## [NEEDS CLARIFICATION: 1]

- Scope of retention for `agent_trace.jsonl`: Should trace entries be retained indefinitely, or follow a retention policy (e.g., 2 years)?

## Implementation Notes

- Place new code under `src/hooks/` in the forked extension.
- `.orchestration/` files are authored by hooks; manual edits are allowed but should be recorded in trace logs.
- Provide a small CLI/debug tool to visualize `agent_trace.jsonl` entries for demo and testing purposes.
