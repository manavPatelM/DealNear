-- Projections written before categories existed are classified as OTHER.
ALTER TABLE offer_projections
    ADD COLUMN category VARCHAR(32) NOT NULL DEFAULT 'OTHER';

CREATE INDEX idx_offer_projections_category
    ON offer_projections (category);
