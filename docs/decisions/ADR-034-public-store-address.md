# ADR-034: Publish address and map location of verified stores

- Status: Accepted (amends ADR-014)
- Date: 2026-10-22
- Decision owners: DealNear project (approved by the project owner)

## Context
ADR-014 kept store addresses and coordinates private. The website specification needs
store pages with an address, a map pin, directions, and distance, which customers need
in order to visit a shop.

## Decision
For stores with `verificationStatus = VERIFIED`, the public store profile may expose the
business address, city, postal code, and coordinates. The following stay private:
vendor/owner identity, unverified or rejected stores, verification notes and documents,
and any contact detail the vendor does not choose to publish.

## Consequences
- Implemented with the store profile model (DN-045); until then public summaries remain name and city.
- Vendors must be told during onboarding that a verified store's address is public.
- Home-based businesses that do not want a public address need an "area only" option
  (recorded as a follow-up for DN-045).
