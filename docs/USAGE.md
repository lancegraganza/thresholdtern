# How to Use ThresholdTern

## What You Need

- A browser with the Midnight Lace wallet extension, connected to Preprod.
- Spendable Preprod funds and DUST. Complete wallet sync after using the faucet.
- ThresholdTern running locally, or its eventual published demo URL.
- The local proof server running on your own machine. Ask the person helping with setup to run `npm run proof:up`. Private evidence goes to this local service, so use your own machine.
- A local privacy password with 16 or more characters, uppercase, lowercase and numbers. Keep it for future visits; it unlocks encrypted creator secrets in this browser.

## Step-by-Step Guide

### Create and share a gate

1. Select **Enter ThresholdTern**, then **Create gate**.
2. Choose **18+**, **21+**, or a custom numeric threshold.
3. Give the gate a public name. Choose an optional expiry.
4. Review what users prove, what you receive, and what stays private.
5. Connect your wallet on Preprod and choose **Publish gate on Midnight**. Approve the wallet request.
6. Wait for confirmed deployment. Open the gate details, select **Share gate**, and copy the participant link.
7. Return to gate details to refresh confirmed submission counts. **Close gate** permanently stops future submissions; it requires the original browser, wallet and password.

### Prove eligibility

1. Open the creator's participant link. Check the requirement and gate status.
2. Connect your Preprod wallet.
3. Enter your private age or value. The field conceals it; it is held only in memory.
4. Select **Generate private proof**. Your local proof server generates the proof, and the wallet authorizes the transaction.
5. Wait for Midnight confirmation. The page shows **Eligibility verified** or **Requirement not satisfied**, according to the chain receipt.
6. If eligible, select **Continue**. This is a proof receipt; a real protected-content service must separately authenticate and bind a receipt to its visitor.
7. **View technical details** shows the public receipt, transaction and confirmed block. It never shows your private value.

## What Gets Proved (and What Stays Private)

The circuit proves that a self-asserted number is above or below the immutable gate threshold. The exact number and birthdate are never published. A verifier learns the threshold, result, public receipt and transaction metadata.

This version does not certify a real birthdate or identity: users can choose their number. Issuer-signed credentials are required for real age assurance. Membership and residency are intentionally unavailable until an issuer design exists. Receipts count submissions, not unique people.

Proof computation happens on your local proof server, not entirely inside the browser. That server receives the witness. Keep it bound to your machine and never substitute a hosted third-party prover. No exact value is sent to ThresholdTern's website server, browser storage or analytics.

## Troubleshooting

| What happened | What to do |
| --- | --- |
| No wallet detected | Install/enable Lace, unlock it, refresh the tab and select Check for wallets again. |
| Wrong network | Switch Lace to Midnight Preprod, then reconnect. |
| Wallet request declined | Approve the next request when ready. |
| Funds or DUST unavailable | Fund the Preprod wallet, register NIGHT for DUST if needed, and let it sync. |
| Proof server unreachable | Start Docker and run `npm run proof:up`; keep it running. |
| Password cannot unlock storage | Use the original local privacy password. No password recovery service exists. |
| Gate expired or closed | Request a new active gate from its creator. |
| Submitted proof has no result yet | Use **Check result on Midnight**. Do not submit a second transaction while confirmation is uncertain. |
| Submitted deployment is uncertain | Look up its transaction in the Preprod explorer. Restore its confirmed contract address in Gates. Do not deploy again while it is pending. |
| Gates disappear after changing browsers | Use **Restore gate by address**. This restores public data; it does not recover creator secrets. |
| Page refreshed | Reconnect the wallet and unlock local storage. Drafts and public gates remain; private evidence must be entered again. |

If the explorer reports a definitive failed transaction, keep that receipt and ask the developer to reconcile it before starting a fresh attempt. Never infer confirmation from an animation or a local comparison.
