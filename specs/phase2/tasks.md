---
description: "Implementation tasks for AI-Native IDE Hook System (phase2)"
---

# Tasks: AI-Native IDE Hook System

**Input**: Design docs in `specs/phase2/` (spec.md, plan.md, research.md, data-model.md)

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 Create feature scaffolding in `specs/phase2/` (spec.md, plan.md, research.md)
- [ ] T002 Initialize workspace sidecar directory `.orchestration/` and add sample `active_intents.yaml` (create file at `.orchestration/active_intents.yaml`)
- [ ] T003 Add sample workspace settings to `.vscode/settings.json` enabling orchestration (`orchestration.enabled`, `orchestration.traceRetentionDays`)

---

## Phase 2: Foundational (Blocking Prerequisites)

- [ ] T004 [P] Implement Hook Engine scaffold in `src/hooks/engine.ts`
- [ ] T005 [P] Add/Update tool signatures in `src/shared/tools.ts` to include `select_active_intent` and mutated `write_file` payloads
- [ ] T006 [P] Create Pre-Hook and Post-Hook interfaces and adapters in `src/hooks/preHook.ts` and `src/hooks/postHook.ts`
- [ ] T007 [P] Implement canonical content hashing utility in `src/shared/hash.ts` (SHA-256, LF normalization)
- [ ] T008 Configure CI security gates (SAST/SCA) for changes in `src/hooks/` via `.github/workflows/security.yml`
- [ ] T009 Create test scaffolding for hooks in `src/hooks/__tests__/` and add initial vitest config updates at `vitest.config.ts`

**Checkpoint**: Foundational components complete — user stories may proceed.

---

## Phase 3: User Story 1 - Handshake / Intent Selection (Priority: P1)

Goal: Require explicit intent selection before any mutating tool executes.

- [ ] T010 [P] [US1] Implement `select_active_intent` tool implementation in `src/hooks/tools/selectActiveIntent.ts`
- [ ] T011 [US1] Update `src/core/prompts/system.ts` to inject Handshake protocol language and enforce initial intent selection
- [ ] T012 [P] [US1] Implement `src/hooks/intentStore.ts` to read/write ` .orchestration/active_intents.yaml` and expose a validated API
- [ ] T013 [P] [US1] Add unit tests for `select_active_intent` in `src/hooks/__tests__/select_active_intent.test.ts`

---

## Phase 3: User Story 2 - Scoped Mutations & Tracing (Priority: P1)

Goal: Enforce scope checks and append atomic trace entries for successful writes.

- [ ] T014 [US2] Update write/mutation tool to require `intent_id`, `mutation_class`, `original_hash`, and `new_content` in `src/core/tools/writeFile.ts` and `src/shared/tools.ts`
- [ ] T015 [P] [US2] Implement Pre-Hook scope enforcement in `src/hooks/preHooks/scopeEnforcer.ts` (uses `intentStore` owned_scope globs)
- [ ] T016 [P] [US2] Implement Post-Hook trace appender at `src/hooks/postHooks/traceAppender.ts` that writes atomic JSONL entries to `.orchestration/agent_trace.jsonl`
- [ ] T017 [US2] Add integration tests for scope enforcement and trace appends in `src/hooks/__tests__/write_scope.test.ts`

---

## Phase 3: User Story 3 - Parallel Orchestration & Optimistic Locking (Priority: P2)

Goal: Prevent lost updates via optimistic locking and surface lessons when verification fails.

- [ ] T018 [P] [US3] Implement optimistic locking pre-check in `src/hooks/preHooks/optimisticLock.ts` (compare agent-read hash to on-disk hash)
- [ ] T019 [P] [US3] Implement lessons recorder utility in `src/hooks/utils/lessonRecorder.ts` and append to `AGENT.md` or `CLAUDE.md` on verification failures
- [ ] T020 [US3] Add concurrency tests simulating parallel writes in `src/hooks/__tests__/concurrency.test.ts`

---

## Phase N: Polish & Cross-Cutting Concerns

- [ ] T021 [P] Update `docs/ARCHITECTURE_NOTES.md` with implementation details and diagrams reflecting Hook Engine design
- [ ] T022 [P] Add CLI helper `scripts/orchestration-show-trace.ts` to pretty-print `.orchestration/agent_trace.jsonl`
- [ ] T023 [P] Add workspace settings documentation in `specs/phase2/quickstart.md` and `README.md`
- [ ] T024 Create release checklist and PR template updates to require threat model for hook changes (`.github/PULL_REQUEST_TEMPLATE.md`)

---

## Dependencies & Execution Order

- Setup (Phase 1) must complete before Foundational (Phase 2).
- Foundational tasks marked `[P]` can run in parallel.
- User Story tasks depend on Foundational completion.
- Within each user story: tests → core implementation → integration.

## Parallel execution examples

- While T004, T005, T006, and T007 are in-progress, different engineers can implement `hash.ts`, `tools.ts` signature changes, and HookEngine wiring in parallel (they are marked `[P]`).

## Implementation Strategy

- MVP (minimum): Complete Phase 1 + Phase 2 + User Story 1 + minimal User Story 2 trace appender (T016). Stop and validate with demo.
