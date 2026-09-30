# ThresholdTern redesign

## Audit and direction

The old experience repeats the same three-card composition across marketing, gate management and verification. Decorative headings compete with task labels, desktop navigation gives creation the same weight as every page, and the connection dialog couples wallet authorization to local storage encryption. Creator and participant screens look too similar. The supplied logo has not been used.

Direction: **a quiet passage**. Ink navy, pearl white and restrained iris drawn from the supplied bird/portal logo. A geometric display face, readable body typography, fine rules, square-ended threshold motifs and precise status indicators. The logo remains the original PNG. No fake analytics, wallpaper gradients, generic blockchain imagery or invented activity.

## References researched before implementation

- [Ramp](https://ramp.com/spend-management): task-oriented hierarchy and compact operational information.
- [Proton visual identity](https://proton.me/blog/new-visual-universe): portals and coherent privacy branding across products.
- [Privy wallet UX](https://blog.privy.io/blog/multi-wallet-ux): connection, authorization and wallet state are distinct concerns.
- [Linear](https://linear.app/): disciplined typography, restrained product framing and navigation.
- [Awwwards single-page design collection](https://www.awwwards.com/websites/single-page-1/): editorial spacing and deliberate composition, used as design research rather than copied assets.
- [GSAP React](https://gsap.com/resources/React/) and [matchMedia](https://gsap.com/docs/v3/GSAP/gsap.matchMedia/): scoped cleanup and reduced-motion support.

## Restructuring plan

1. Shared identity, iconography, inputs, buttons, dialog, status and motion primitives.
2. Landing: asymmetric product statement, a threshold passage illustration, interactive eligibility explanation, short privacy contrast and a final invitation. Examples are labeled illustrative.
3. Workspace: compact horizontal navigation with meaningful labels, a persistent wallet control, route context, and focused creation actions. Mobile gets its own bottom navigation layout.
4. Overview: task-oriented welcome, quiet real counts, gate list and useful first-run guidance.
5. Gates: search/filterable list; restoring by address is a secondary action. No invented records.
6. Creation: left step rail, focused central form, live public-policy summary; preserve draft, review and real publishing behavior.
7. Details: policy header, operational facts, sharing and separated irreversible creator action.
8. Participant: dedicated centered passage, requirement summary, one focused verification panel, actual stage feedback and receipt result.
9. Activity: readable receipt ledger. Settings: sectioned connection, proof-server and local privacy controls.
10. Regression checks: tests, typecheck, production build, real local proofs, browser review of desktop/mobile, dialogs, wizard, missing wallet and invalid gate paths. Live chain success remains dependent on an actual authorized Preprod wallet.

## Functional boundaries

Wallet connection must be independent of local storage unlock. Existing encrypted creator state and its database must remain usable. Any required creator-storage unlock happens only for the operation that needs it, never before wallet connection. Private evidence remains in client memory and is cleared; no API, telemetry or storage receives it. Contract circuits, public state, pending transaction reconciliation and generated keys remain unchanged.

Motion is limited to entrances, route content, wizard changes, dialogs, and actual status changes. Scroll reveals run once; no scroll hijacking, decorative infinite GSAP loops or delayed access to controls. Reduced-motion users receive the final state immediately. Native dialog focus handling is retained.
