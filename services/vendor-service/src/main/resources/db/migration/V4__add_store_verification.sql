-- Stores created before admin review existed were already publicly visible, so they are
-- grandfathered as VERIFIED. New stores start as PENDING (set by the application).
ALTER TABLE stores
    ADD COLUMN verification_status VARCHAR(16) NOT NULL DEFAULT 'VERIFIED',
    ADD COLUMN verification_note VARCHAR(500),
    ADD COLUMN reviewed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE stores ALTER COLUMN verification_status DROP DEFAULT;

CREATE INDEX idx_stores_verification_status
    ON stores (verification_status, created_at);
