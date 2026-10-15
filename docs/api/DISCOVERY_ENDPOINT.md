# Discovery API contract

Discovery is a future read-oriented capability. It must not read vendor or
offer tables directly. The initial implementation should use a purpose-built
read model populated from service-owned data.

The dedicated discovery-service owns this read model and runs on port `8083`.
Its local PostgreSQL dependency must provide PostGIS.

## `GET /api/discovery/offers`

Returns published, currently eligible offers near a customer-provided point.
The endpoint is public and does not require customer identity.

Required query parameters:

- `latitude`: decimal degrees from `-90` to `90`.
- `longitude`: decimal degrees from `-180` to `180`.
- `radiusKm`: positive distance in kilometers, maximum `50`.

Optional query parameters:

- `page`: zero-based page number, default `0`.
- `size`: page size from `1` to `50`, default `20`.
- `category`: exact category filter when categories are implemented.

The initial response shape is:

```json
{
  "offers": [
    {
      "id": "11111111-1111-1111-1111-111111111111",
      "storeId": "22222222-2222-2222-2222-222222222222",
      "storeName": "Corner Market",
      "storeCity": "New York",
      "title": "20% off",
      "description": "Weekend offer",
      "distanceKm": 1.42
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 1,
  "totalPages": 1
}
```

Results are ordered by `distanceKm ASC`, then offer creation time descending,
then offer ID descending. The response does not expose vendor identity, street
address, or exact store coordinates.

## Eligibility

Only projections representing published offers and within their effective
validity window are eligible. The projection contract carries `startAt` and
`endAt`; the query requires `start_at <= CURRENT_TIMESTAMP` and
`end_at > CURRENT_TIMESTAMP`.

## Errors

- `400 INVALID_LOCATION` for malformed or out-of-range coordinates.
- `400 INVALID_RADIUS` for a non-positive radius or a radius above `50`.
- `400 INVALID_PAGINATION` for invalid page or size.
- `503 DISCOVERY_UNAVAILABLE` when the read model or database is unavailable.

The endpoint must not fall back to an unfiltered global offer list when a
location query cannot be executed.
