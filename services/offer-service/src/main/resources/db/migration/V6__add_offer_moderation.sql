ALTER TABLE offers
    ADD COLUMN moderation_note VARCHAR(500);

CREATE TABLE offer_reports (
    id UUID PRIMARY KEY,
    offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
    reporter_id VARCHAR(255) NOT NULL,
    reason VARCHAR(32) NOT NULL,
    details VARCHAR(500),
    status VARCHAR(16) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by VARCHAR(255),
    resolution_note VARCHAR(500),
    -- One report per customer per offer keeps repeated clicks from inflating the queue.
    CONSTRAINT offer_reports_offer_reporter_unique UNIQUE (offer_id, reporter_id)
);

CREATE INDEX idx_offer_reports_status_created ON offer_reports (status, created_at);
