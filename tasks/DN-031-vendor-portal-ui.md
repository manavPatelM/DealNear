# DN-031 — Vendor portal UI and vendor registration

## Goal
Add a full vendor portal to the React frontend so vendors can register, sign in,
manage stores, and manage their offers (create, edit, publish, unpublish, delete).

## Acceptance criteria
- A vendor can register via `POST /api/auth/register/vendor`.
- A vendor can sign in via `POST /api/auth/login` and receive a VENDOR-role JWT.
- The frontend shows two portals: **Customer** and **Vendor**, selectable via tabs.
- Authenticated vendors see a dashboard with Stores and Offers sub-tabs.
- **Stores tab**: list stores, create a new store (modal form), edit an existing store.
- **Offers tab**: list offers with status badges, create a new offer (modal form with store selector, validity window), edit an offer, publish/unpublish, delete.
- Unauthenticated vendor visitors see a vendor sign-in/register form.
- All interactive elements have stable, unique IDs.

## Changes made
### identity-service
- `AuthRequests.java`: Added `VendorRegister` record (same fields as `Register`).
- `AuthController.java`: Added `POST /api/auth/register/vendor` that saves a `VENDOR`-role user.
- `SecurityConfig.java`: Permit `/api/auth/register/vendor` publicly; allow `GET /api/auth/me` for both CUSTOMER and VENDOR roles.

### frontend
- `index.html`: Added proper SEO meta description and Inter font from Google Fonts.
- `styles.css`: Full dark-mode design system with CSS custom properties, glassmorphism navbar, animated cards, modal overlay, badge variants, spinner, and all vendor/customer-specific components.
- `main.jsx`: Rewritten as a multi-portal SPA:
  - Root `App`: portal switcher (Customer/Vendor) in a sticky navbar; role-aware auto-navigation.
  - `CustomerPortal`: discovery search, offer cards with save/unsave, saved offers panel, customer auth form.
  - `VendorPortal`: vendor auth form (register/login), vendor dashboard with Stores and Offers tabs.
  - `StoresTab`: fetch/create/edit stores via modal form.
  - `OffersTab`: fetch/create/edit/publish/unpublish/delete offers via modal form.

## Commands to verify
Run the full Compose stack:
```
docker compose up --build
```
Then visit http://localhost:5173.

Vendor registration:
```
curl -s -X POST http://localhost:3000/api/auth/register/vendor \
  -H 'content-type: application/json' \
  -d '{"email":"vendor@example.com","password":"password123"}' | jq .
```

## Risks
- The `MessageDigest` unused import warning remains in `AuthController` (pre-existing).
- Offer creation requires a store — if the vendor has no stores, the UI shows an error notice.
- There is no expiry on JWTs; this is a known pre-existing limitation.
