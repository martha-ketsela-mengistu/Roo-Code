# Implementation Plan: AI-Native IDE Hook System

**Branch**: `phase2` | **Date**: 2026-02-21 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/phase2/spec.md`

## Summary

Enable the Roo Code VS Code extension to operate as an AI-Native IDE by adding a Hook Engine that enforces a two-stage intent handshake (select_active_intent), performs Pre-Hook scope/authorization checks, and records Post-Hook `agent_trace.jsonl` entries with SHA-256 spatial content hashes. Implementation will be TypeScript-based, integrated into the existing extension host tool dispatch pipeline, and rely on workspace-sidecar files in `.orchestration/`.

## Technical Context

**Language/Version**: TypeScript (Node.js 20.19.2)  
**Primary Dependencies**: `pnpm`, `turbo`, `typescript`, VS Code extension APIs, `vitest` for tests  
**Storage**: Workspace sidecar files under `.orchestration/` (YAML + JSONL) with optional local SQLite for faster queries (NEEDS CLARIFICATION)  
**Testing**: `vitest` + existing monorepo test runners; add contract tests for hooks and schema validation  
**Target Platform**: VS Code Extension Host (Windows/macOS/Linux)  
**Project Type**: Monorepo VS Code extension (existing repo layout)  
**Performance Goals**: Pre-Hook checks should be low-latency; aim for <200ms p95 for common read-only and scope checks (NEEDS CLARIFICATION)  
**Constraints**: Must comply with constitution: threat model for mutating hooks, SAST/SCA gates, and observability requirements.  
**Scale/Scope**: Designed for single-developer and multi-agent local orchestration; target correctness over throughput.

## Constitution Check

Gates derived from `Roo-Code Constitution` (version 1.0.0):

- Security-first: New public interfaces (the `select_active_intent` tool and mutated `write_file` schema) require a threat model and SAST checks before merge.
- Data integrity: All `agent_trace.jsonl` writes must be append-only and validated; migrations must include checksums.
- Observability: Hooks must emit structured telemetry for Pre/Post events.

Gate status: PASS (preliminary) — plan documents required threat-model steps and CI gates. Outstanding clarifications: retention policy for `agent_trace.jsonl` and storage choice (file vs SQLite). These are documented in `research.md` and must be resolved before production rollout.

## Project Structure

Documentation (this feature)

```text
specs/phase2/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (tool schemas)
└── tasks.md             # Phase 2 output (not created here)
```

Source changes (repository root)

```text
src/
├── hooks/               # New: HookEngine, pre/post hooks, adapters
├── core/                # Integrations: prompt builder, task loop wiring
└── shared/              # Tool schemas & small utilities (hashing, serialization)
```

**Structure Decision**: Add `src/hooks/` and `src/hooks/engine.ts` to register middleware with existing tool dispatch points in `src/core/task/Task.ts` and update `src/shared/tools.ts` to include `select_active_intent` and mutated `write_file` signature.

## Complexity Tracking

No constitution violations detected that cannot be justified. Any choice to persist trace data in a database instead of files must include migration checks and be approved by the Architecture Council.
