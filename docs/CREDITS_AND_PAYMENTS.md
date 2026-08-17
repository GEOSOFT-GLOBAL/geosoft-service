# Credits and payments

Credits are a prepaid balance spent on metered features. They are held by a
**workspace** when the caller names one they belong to, and by the **user**
otherwise — the single-user modes never send a workspace id, so they always
spend their own.

## What you must set before payments work

Without `PAYSTACK_SECRET_KEY` the app still runs: balances, spending, grants
and history all work, `GET /credits/catalog` reports `paymentsEnabled: false`,
and the billing page disables its buy buttons and says so. Checkout is the only
thing that needs keys.

```
PAYSTACK_SECRET_KEY=sk_test_xxx      # required for checkout; also signs webhooks
PAYSTACK_PUBLIC_KEY=pk_test_xxx      # returned in the catalog, for inline flows
PAYSTACK_CURRENCY=NGN                # must be enabled on your Paystack account
PAYSTACK_PRICE_MULTIPLIER=1          # see "Currency" below
PAYSTACK_BASE_URL=https://api.paystack.co
FRONTEND_URL=http://localhost:5173   # buyers return to $FRONTEND_URL/app/billing/callback
```

Point a Paystack webhook at `POST /api/v1/credits/webhook`. It is
unauthenticated by necessity — Paystack holds no token of ours — so the HMAC
SHA512 signature over the **raw** request body is the entire trust boundary.
That is why `express.json` is mounted with a `verify` hook in `src/index.ts`:
re-serialising the parsed body produces a different digest and would reject
every genuine delivery.

### Currency

Catalog prices in `src/config/credits.ts` are quoted in USD to match the
pricing page. `PAYSTACK_PRICE_MULTIPLIER` converts them to whatever
`PAYSTACK_CURRENCY` is:

- charging in USD (needs USD enabled on the account): leave it at `1`
- charging in NGN: set it to your naira rate, e.g. `1600`

## Endpoints

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/credits/catalog` | public | packs, prices, feature costs, plan allowances |
| GET | `/credits/balance` | user | current balance for the owner in scope |
| GET | `/credits/transactions` | user | the ledger, newest first |
| POST | `/credits/spend` | user | charge for one use of a metered feature |
| POST | `/credits/void` | user | reverse one recent charge that did not deliver |
| POST | `/credits/checkout` | user | reserve credits and open Paystack |
| GET | `/credits/verify/:reference` | user | confirm a payment on return |
| POST | `/credits/webhook` | signature | Paystack settlement |

Pass `?workspaceId=` (or `workspaceId` in the body) to act on a workspace pool.
Membership is verified on every call; only an **admin** may buy for a
workspace.

## How a purchase settles

1. `POST /credits/checkout` writes a ledger row with `status: pending` under
   the payment reference, then opens the Paystack transaction. The row exists
   before the buyer ever reaches Paystack.
2. Whichever arrives first — the webhook, or the buyer returning to
   `/app/billing/callback` and triggering `verify` — claims that row with a
   conditional update and moves the balance.
3. The other one finds the row already applied and does nothing.

That is where idempotency comes from: the unique index on `reference` plus the
conditional claim. A duplicate webhook delivery, or a buyer who refreshes the
callback page, cannot credit twice. A crash between reserving and applying
leaves a pending row the next attempt finishes, rather than a payment with no
credits behind it.

Amounts are checked against the reservation before anything is credited, so a
charge for a small pack cannot be pointed at a reservation for a large one.

## Costs and allowances

Both live in `src/config/credits.ts` and are served to the client rather than
duplicated in it — a price the client could choose is not a price.

- AI-assisted scheduling: 5 credits
- PDF export: 1 credit
- Welcome grant on first use: 25 credits

Plans carry credits too (`PLAN_CREDITS`), delivered by the same purchase path.

## Spending from the client

AI scheduling and PDF export run in the browser, so the charge is taken by
`POST /credits/spend` **before** the work starts — otherwise the client would
be deciding whether to pay. If the work then fails, the frontend calls
`POST /credits/void` with the returned `transactionId`. Voids are deliberately
narrow: one identified spend, belonging to the caller's own account, once, and
only within 15 minutes. A general "add credits" endpoint reachable by a client
would be a way to mint them.
