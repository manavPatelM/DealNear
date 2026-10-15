CREATE TABLE store_projection_outbox (
    id UUID PRIMARY KEY,
    store_id UUID NOT NULL,
    payload VARCHAR(10000) NOT NULL,
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
    published_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_store_projection_outbox_pending
    ON store_projection_outbox (published_at, occurred_at);
