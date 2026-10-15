CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE offer_projections (
    offer_id UUID PRIMARY KEY,
    store_id UUID NOT NULL,
    store_name VARCHAR(255) NOT NULL,
    store_city VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description VARCHAR(2000) NOT NULL,
    start_at TIMESTAMP WITH TIME ZONE NOT NULL,
    end_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    location geography(Point, 4326) NOT NULL
);

CREATE INDEX idx_offer_projections_location
    ON offer_projections USING GIST (location);
CREATE INDEX idx_offer_projections_active
    ON offer_projections (end_at, start_at);
