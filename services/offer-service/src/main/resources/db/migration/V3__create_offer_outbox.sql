CREATE TABLE offer_outbox (
    id UUID PRIMARY KEY,
    offer_id UUID NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    payload VARCHAR(10000) NOT NULL,
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
    published_at TIMESTAMP WITH TIME ZONE,
    attempts INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_offer_outbox_pending
    ON offer_outbox (published_at, occurred_at);
