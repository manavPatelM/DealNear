CREATE TABLE identity_service.saved_offers (
    id UUID PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES identity_service.users(id),
    offer_id UUID NOT NULL,
    saved_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT saved_offers_customer_offer_unique UNIQUE (customer_id, offer_id)
);

CREATE INDEX saved_offers_customer_saved_at_idx
    ON identity_service.saved_offers (customer_id, saved_at DESC, offer_id DESC);
