-- Offers from stores that are not admin-verified stay in the read model but are hidden,
-- so re-verifying a store makes its offers discoverable again without a replay.
ALTER TABLE offer_projections
    ADD COLUMN store_active BOOLEAN NOT NULL DEFAULT TRUE;
