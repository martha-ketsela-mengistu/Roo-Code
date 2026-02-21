# Roo-Code Constitution

## Core Principles

### Architecture: Modular, Observable, Minimal

1. Principle: The system MUST be modular: components expose well-documented, versioned contracts and MUST be independently deployable and testable.

    - Rationale: Modular boundaries enable safer evolution, independent testing, and clear ownership.
    - Tests: Verify each component has a published contract, CI runs component tests in isolation, and deployments can be rolled back per-component.

2. Principle: Observability is required: all production services and libraries MUST emit structured logs, metrics, and traces for critical flows.

    - Rationale: Traceability of intent-to-code and runtime behavior requires consistent telemetry.
    - Tests: CI must validate presence of structured logging and at least one metric and one trace for each critical path.

3. Principle: Simplicity first: design defaults MUST favor simplicity and explicitness; complexity requires a documented justification and explicit review.
    - Rationale: Simpler systems are more maintainable and secure.
    - Tests: Architectural proposals MUST include a complexity justification section and receive approval from the architecture reviewers.

### Governance: Clear, Auditable, and Incremental

1. Principle: The constitution is authoritative for engineering practices; all exceptions MUST be documented and approved via the amendment process below.

2. Principle: Changes to architecture or cross-cutting policies that affect consumers MUST follow semantic versioning for the contract and provide a migration plan.

    - Rationale: Consumers must be able to adapt to breaking changes with clear timelines.
    - Tests: PRs that change public contracts MUST include a version bump, migration notes, and a compatibility test matrix.

3. Principle: Decision transparency: architectural decisions that alter enforceable policies (security, data retention, telemetry) MUST be recorded in an ADR and linked to the constitution amendment when applicable.

### Data Integrity & Privacy

1. Principle: Data correctness first: systems MUST validate inputs, enforce schema contracts, and persist only validated records.

    - Rationale: Preventing corrupt or partial state reduces downstream failures and simplifies reasoning about intent-to-code traceability.
    - Tests: Automated contract tests and schema validation suites must run in CI; data migration tasks require pre/post checksums and verification steps.

2. Principle: Explicit data lifecycle: every persistent data artifact MUST have an owner, an approved retention policy, and a documented deletion procedure.

    - Rationale: Clear ownership and life-cycle rules reduce risk and enable regulatory compliance.
    - Tests: Specs and tasks must include `owner` metadata and a retention field; periodic audits verify policies are enforced.

3. Principle: Least privilege for data access: services and people MUST have the minimal privileges required; secrets and PII MUST be stored encrypted at rest and in transit.
    - Rationale: Reduces blast radius and supports regulatory/compliance obligations.
    - Tests: Access control reviews, automated secret-scan checks in CI, and encryption verification tests.

### Security Requirements

1. Principle: Security-first: threat modeling is required for new public interfaces; critical findings MUST be addressed before production rollout.

    - Rationale: Early threat modeling prevents systemic vulnerabilities and aligns security with architecture.
    - Tests: PRs for public APIs include a threat model summary and a mitigation checklist.

2. Principle: Continuous verification: all code entering main branches MUST pass static analysis, dependency vulnerability scans, and automated security tests.

    - Rationale: Automated controls reduce human error and drift.
    - Tests: CI gates enforce SAST, dependency checks, and SCA policies.

3. Principle: Incident readiness: teams MUST maintain runbooks for security incidents, perform regular tabletop exercises, and ensure logs required for forensic analysis are retained per retention policy.
    - Rationale: Preparedness reduces time-to-recovery and improves forensics.
    - Tests: Annual tabletop exercises and periodic runbook validation.

## Additional Constraints

- Technology choices SHOULD be aligned with the `packages/` and `apps/` maintained in the monorepo unless a compelling case is made and approved.
- Performance targets MUST be documented in associated plan/spec documents; missing targets constitute a blocker for production readiness.

## Development Workflow & Quality Gates

- Pull requests that change public APIs, data schemas, or security posture MUST include: tests, migration steps, an ADR (if deprecated/removal), and a versioning/migration plan.
- All PRs MUST pass CI checks including unit, integration, linting, and the constitution compliance checks defined in project tooling.

## Governance

1. Amendment Procedure:

    - Minor edits (clarifications, typos) MAY be applied with a patch version bump (PATCH) after a two-person review.
    - Additive changes (new principle or materially expanded guidance) REQUIRE a minor version bump (MINOR) and approval by the Architecture Council (or appointed reviewers).
    - Breaking changes (removal or redefining of non-negotiable principles) REQUIRE a major version bump (MAJOR), a documented migration plan, and a formal ratification vote recorded in project governance records.

2. Versioning Policy:

    - Versioning follows MAJOR.MINOR.PATCH semantics. The constitution `Version` field MUST match the file header and the Sync Impact Report.

3. Compliance & Review:
    - Every release affecting runtime behavior or data MUST include a compliance checklist entry linking to relevant constitution principles.
    - Quarterly reviews: The Architecture Council or its delegates MUST review constitution compliance and produce a short remediation plan for any violations.

**Version**: 1.0.0 | **Ratified**: 2026-02-21 | **Last Amended**: 2026-02-21
