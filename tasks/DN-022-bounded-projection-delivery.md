# DN-022: Bounded discovery projection delivery

Status: Complete

## Outcome

Offer-service now has an opt-in scheduled worker that delivers pending
transactional outbox events to discovery. It obtains location through the
protected vendor projection endpoint and sends an idempotent projection
upsert.

## Reliability behavior

- Delivery is disabled by default.
- Vendor and discovery calls use a 2-second default connect/read timeout.
- Failed events remain pending.
- Retry timing uses capped exponential backoff, defaulting from 5 seconds to a
  maximum of 300 seconds.
- Discovery's `ON CONFLICT (offer_id) DO UPDATE` keeps retries idempotent.
- Delivery logs event ID and attempt number without logging payloads or tokens.

## Configuration

- `PROJECTION_DISPATCHER_ENABLED`
- `PROJECTION_DISPATCHER_INTERVAL_MS`
- `PROJECTION_DISPATCHER_TIMEOUT_MS`
- `PROJECTION_DISPATCHER_RETRY_BASE_DELAY_SECONDS`
- `PROJECTION_DISPATCHER_RETRY_MAX_DELAY_SECONDS`
- `DISCOVERY_SERVICE_URL`
- `VENDOR_PROJECTION_TOKEN`
- `DISCOVERY_PROJECTION_TOKEN`

## Verification

- Offer-service Maven tests: passed.
- Publishing creates one versioned outbox event.
- Repeated publishing remains idempotent and does not create duplicate events.
- `git diff --check`: passed.

## Limitations

- Delivery metrics and stale-write/version protection are not yet implemented.
- A production deployment should use a secret manager for the projection token.
