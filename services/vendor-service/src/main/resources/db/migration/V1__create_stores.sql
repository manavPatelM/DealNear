CREATE TABLE stores (
    id UUID PRIMARY KEY,
    vendor_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    address VARCHAR(500) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL CHECK (latitude >= -90 AND latitude <= 90),
    longitude DOUBLE PRECISION NOT NULL CHECK (longitude >= -180 AND longitude <= 180),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_stores_vendor_id ON stores (vendor_id);
