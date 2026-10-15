ALTER TABLE offer_outbox
    ADD COLUMN next_attempt_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX idx_offer_outbox_due
    ON offer_outbox (published_at, next_attempt_at, occurred_at);
