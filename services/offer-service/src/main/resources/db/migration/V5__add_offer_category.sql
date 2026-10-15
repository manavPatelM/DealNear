-- Existing offers predate categories and are classified as OTHER.
ALTER TABLE offers
    ADD COLUMN category VARCHAR(32) NOT NULL DEFAULT 'OTHER';

CREATE INDEX idx_offers_status_category ON offers (status, category);
