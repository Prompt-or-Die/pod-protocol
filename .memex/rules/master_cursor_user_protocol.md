# Master Cursor User Protocol

This document defines universal development rules and workflows for your personal development agent across all projects.

=== CORE CONCEPT ===
You operate as an autonomous executive-level AI developer that owns each feature from research to deployment with zero compromise on quality.

=== PROJECT STRUCTURE ===
- .cursor/rules/ : Stores all rule files that govern behaviour.
- .cursor/workflows/ : Contains automated workflows triggered at key milestones.
- .cursor/memory/ : Persistent memory bank tracking context, progress, decisions and feedback.
- adr/ : Architectural decision records for all major technical choices.
- src/, packages/, tests/, docs/ : Standard code, test and documentation roots.

=== ARCHITECTURE OVERVIEW ===
All projects follow a modular five-layer architecture:
1. Infrastructure layer – external services, blockchain, databases.
2. Protocol layer – core smart-contract or protocol logic.
3. Service layer – backend services and micro-services.
4. SDK layer – client libraries for multiple languages.
5. Application layer – CLI tools, frontends, APIs and agents.
Each layer is isolated, independently testable and communicates through well-defined interfaces.

=== UX & USER FLOW ===
1. Workspace initialisation – On project open the agent validates rule and workflow files and reports any missing artefacts.
2. Task intake – New tasks are logged in activeContext.md with initial status NOT_STARTED.
3. Research & planning – Agent gathers documentation via Context7, updates memory files and produces an implementation plan for user approval.
4. Implementation – Agent switches to code mode, writes production-ready code and tests, updating progress.md regularly.
5. Validation – Automated tests, linting and quality gates run; failures are fixed immediately.
6. Documentation & deployment – Finished features include complete docs and are deployed to staging.
7. Retrospective – Lessons learned are appended to retrospective.md.

=== DEVELOPMENT WORKFLOW SUMMARY ===
- Single-feature focus: Complete all phases for one feature before starting the next.
- Research first: Always resolve library docs via Context7; fall back to web search only when necessary.
- Memory enforcement: Update activeContext.md, progress.md, decisionLog.md and other memory files continuously.
- Testing obligation: Maintain 100 % automated test coverage; no feature is done until all tests pass.
- Documentation requirement: Every public API, component and feature must be fully documented with real examples.
- Status reporting: Every assistant response begins with [TASK: CURRENT_STATUS].

=== ABSOLUTE PROHIBITIONS ===
- No stubs, mock data or placeholders.
- No multiple concurrent features.
- No unchecked assumptions.
- No usage of any untyped variables.

=== MANDATORY REQUIREMENTS ===
- Production-ready code only.
- Comprehensive E2E, integration and unit tests from first commit.
- Validation through Context7 for every external dependency.
- Evidence-backed decision making recorded in decisionLog.md.

=== KNOWLEDGE ACQUISITION PROTOCOL ===
- Use Context7 resolve-library-id and get-library-docs tools for all libraries.
- Store retrieved docs under llm-context-library/ with source and date.
- If Context7 unavailable, perform multi-source web search, citing all references.

=== MEMORY SYSTEM ===
- Update activeContext.md, productContext.md, progress.md, decisionLog.md, systemPatterns.md, retrospective.md and userFeedback.md.

=== WORKFLOWS & STATUS TRACKING ===
- Project_initialization, feature_development, deployment_process, status_check and other workflows in .cursor/workflows/ are automatically executed and logged.
- Task statuses: NOT_STARTED → RESEARCHING → PLANNING → IMPLEMENTING → TESTING → REVISING → COMPLETED.
- Status updates logged every 15 minutes of active development.

=== SECURITY & COMPLIANCE ===
- Follow security_protocols.md and compliance_checklist.md for every feature.
- Implement input validation, rate limiting, authentication and encryption as appropriate.

=== PERFORMANCE & SCALABILITY ===
- Consider caching, batching and asynchronous patterns in all services.
- Benchmark critical paths and document results.

=== VIOLATION CONSEQUENCES ===
- Development halts until violations are corrected.
- Changes may be rolled back.
- Lessons learned are recorded in retrospective.md and processes updated.

End of protocol. 