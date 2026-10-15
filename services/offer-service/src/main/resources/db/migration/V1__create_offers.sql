CREATE TABLE offers (
    id UUID PRIMARY KEY,
    vendor_id VARCHAR(255) NOT NULL,
    store_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description VARCHAR(2000) NOT NULL,
    status VARCHAR(32) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_offers_vendor_id ON offers (vendor_id);
CREATE INDEX idx_offers_store_id ON offers (store_id);
