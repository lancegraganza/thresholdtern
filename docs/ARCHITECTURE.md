# ThresholdTern architecture

Next.js App Router serves public pages. A client-only application owns wallet authorization, witnesses, proving and contract submission. There are no API routes, Server Actions, analytics or remote evidence stores.

Each gate is a separately deployed Compact contract. Its immutable public policy includes the minimum, requirement kind, title and optional expiry. The chain enforces expiry. Only a hash of the creator's random administration secret is public. Closing a gate requires knowledge of that secret.

The participant's numeric value exists only in an in-memory witness. A locally operated proof server receives that witness; it must run on the participant's own machine. The verifier receives a boolean and random receipt ID, never the input. Final results come from confirmed ledger receipts, not local comparisons. Browser storage contains public gates and public receipts, with an administration secret encrypted separately for creator recovery. It never contains age or birthdate.

The initial scope is age and custom numeric thresholds. Values are self-asserted: this is a real ZK threshold proof, not an issuer-authenticated age credential. Membership and residency need an issuer protocol before they can make reliable claims. Receipt IDs prevent replay of one receipt but do not establish unique humans or prevent multiple new submissions. Counts describe submissions.

UI: landing → creator dashboard → four-step gate wizard → deploy → share. A separate participant route explains policy, connects a wallet, takes the private input and shows proof/transaction stages. Activity and settings provide receipts and connection recovery. A restrained forest, lime, paper and ink palette anchors reusable controls.

Acceptance evidence is tracked in REQUIREMENTS.md. Network deployment, live wallet approval, remote CI and proposal approval require actual receipts and remain pending until observed. Level 4–6 organizer prompts describe later milestones and are not claimed as completed.
