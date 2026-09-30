# Redesign review — 30 September 2026

Reviewed the actual localhost application in the Codex in-app browser, on desktop and at a 390 × 844 viewport. No injected wallet, gate, receipt or network-success fixtures were substituted into the application.

## Observed UI behavior

- Landing: supplied logo, asymmetric introduction, illustrative receipt label, responsive typography, one-time section reveals and 18+/21+ threshold interaction. Selecting 21+ updates the public example and pressed state.
- Workspace: compact horizontal desktop navigation and fixed mobile navigation; honest zero counts, real empty states, visible wallet control and route context.
- Creator wizard: required-name validation, age requirements, custom minimum 42, configuration, privacy review, back/next transitions and draft restoration. Publishing while disconnected opens wallet selection.
- Wallet dialog: no password field or password prerequisite. Missing-wallet guidance appears, dialog stays centered, Escape closes it and focus returns to its trigger. Actual extension authorization is unavailable in this browser.
- Gate list: search/filter controls, restore dialog and invalid-address validation before a network request. Dialog fits the mobile viewport.
- Participant and gate details: invalid share links show actionable errors; malformed addresses are rejected before loading the blockchain SDK. Mobile gate details have no horizontal overflow (content and viewport both 390 px).
- Activity: settled empty receipt state and route navigation. Settings: connection, prover and local privacy sections remain readable on mobile. Unknown routes display the branded 404 screen.
- Private witness validation/clearing, pending transaction recovery, receipt lookup, expiry, creator-close confirmation and public sharing remain wired to the existing controllers. Confirmed success screens require real chain state.

## Execution evidence

- 31 tests cover generated circuit execution, original gate validation, password-free wallet adapter authorization, opaque API 4.x provider discovery, and the actual SDK's lazy encrypted storage/password/contract scoping.
- TypeScript and production build results are recorded in `redesign-validation.txt`.
- The local proof server produced actual eligible and ineligible verify proofs (2940 bytes each) and a creator-close proof (4508 bytes). See `local-proofs.json`. These verify local proving, not network settlement.
- Contract source and generated circuits/keys were not changed by the redesign.

## Verification limits

No compatible injected wallet or deployed Preprod address was available. Live deployment, wallet approval, creator closure, sharing a confirmed gate and participant transaction settlement remain unverified. Adapter tests and local proofs are separate evidence and do not establish those outcomes.

Wallet connection is password-free. SDK operations still protect local creator/maintenance keys with the original encrypted database and a separately requested session unlock. Exact participant evidence is never stored there.
