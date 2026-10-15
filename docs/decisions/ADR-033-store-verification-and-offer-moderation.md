# ADR-033: Store verification gate, offer lifecycle, and moderation ownership

- Status: Accepted
- Date: 2026-10-15
- Decision owners: DealNear project

## Context
The Admin MVP requires reviewing vendor/store submissions and moderating
reported or invalid offers. The Vendor MVP requires publish, pause, and expire.
Previously any store's offers could go live immediately, and offers only had
`DRAFT`/`PUBLISHED`.

## Decision
1. **Admins** are a third identity role (`ADMIN`). There is no admin
   self-registration; identity-service creates the first admin from
   `ADMIN_BOOTSTRAP_EMAIL`/`ADMIN_BOOTSTRAP_PASSWORD` when both are set.
2. **Vendor verification is store verification.** vendor-service owns
   `verification_status` (`PENDING`, `VERIFIED`, `REJECTED`) on each store. New
   stores start `PENDING`; stores that existed before this change are
   grandfathered as `VERIFIED` because they were already public. Editing a
   rejected store resubmits it (`PENDING`). Admins may revoke a verified store
   by rejecting it.
3. **Enforcement points:**
   - offer-service refuses publish/resume unless the owning store is
     `VERIFIED` (synchronous check through the existing owned-store call).
     Drafts can be prepared while a store is pending.
   - vendor-service public store summaries only return verified stores, so
     offer-service public reads hide offers from unverified stores.
   - discovery keeps projections but filters on a `store_active` flag carried
     by both offer and store projection events, so revoking and re-verifying
     a store takes effect without replaying offer events.
4. **Offer lifecycle:** `DRAFT → PUBLISHED ⇄ PAUSED`, vendor `expire` ends an
   offer immediately (`EXPIRED`, terminal), admin takedown sets `REMOVED`
   (terminal for the vendor, note shown to them). Invalid transitions return
   `409 INVALID_OFFER_TRANSITION`. Query-time expiry by `endAt` still applies.
5. **Reports and moderation live in offer-service**, which owns the offers
   being moderated. Customers can report live offers once each; admins dismiss
   reports or remove the offer, which closes all open reports as `ACTIONED`.

## Alternatives considered
1. Separate moderation service: cleaner boundary later, but adds a deployable
   and cross-service lookups for no MVP benefit.
2. Verify vendor accounts in identity-service: a vendor may own several
   locations of different legitimacy; store-level review matches what
   customers see.
3. Deleting discovery projections on revocation: simpler SQL, but
   re-verification would require replaying every offer event.

## Consequences
- Public listing totals can count offers whose store was revoked after
  publishing (they are filtered from the page body). Revocation is rare.
- Verified stores keep their status when edited; a vendor could change a
  verified store's details without re-review. Revisit if abused.
- There is no "restore" for removed offers or reopen for resolved reports.

## Security, reliability, and cost impact
- Admin endpoints are protected at both URL and method level.
- Reporter identity is never returned to customers.
- Bootstrap admin credentials must come from a secret store outside local
  development; the password must be at least 12 characters.
- No new infrastructure or cloud cost.
