# Identity endpoint

`identity-service` listens on port `8084` by default and owns customer
credentials. Passwords are stored using BCrypt hashes and are never returned.

## `POST /api/auth/register`

Creates a customer account.

```json
{
  "email": "customer@example.com",
  "password": "strong-password"
}
```

Passwords must be 8-128 characters. Duplicate email addresses return `409`.
Successful registration returns `201 Created` with a customer ID, role, and
interim HMAC JWT access token.

## `POST /api/auth/login`

Authenticates a registered customer and returns the same access-token response.
Invalid credentials return `401` without revealing whether the email exists.

The service uses `JWT_SECRET`, which must be replaced outside local development.

## `GET /api/auth/me`

Returns the authenticated customer's ID, email, and role. The request requires
the `Authorization: Bearer <accessToken>` header. Missing or invalid tokens
return `401`.

## Saved offers

Identity-service owns customer saved-offer references. It stores customer and
offer IDs, while offer-service remains the owner of offer details.

### `POST /api/auth/saved-offers/{offerId}`

Saves an offer for the authenticated customer. Repeating the request is
idempotent and returns the existing saved reference.

### `DELETE /api/auth/saved-offers/{offerId}`

Removes an offer from the authenticated customer's saved list. Removing a
missing reference is idempotent and returns `204 No Content`.

### `GET /api/auth/saved-offers`

Returns the authenticated customer's saved references, newest first. All
saved-offer endpoints require a customer bearer token.
