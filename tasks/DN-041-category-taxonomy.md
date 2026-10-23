# DN-041 — Admin-managed category taxonomy

Status: Done (Phase 1)

## Outcome
Categories are data in offer-service instead of a hard-coded enum. Admins add, edit,
reorder, nest, enable and disable them, and the website picks up changes without a rebuild.

## Design
- `categories` table (offer-service `V7`): `code` (stable, stored on offers and in
  discovery), `slug`, `name`, `description`, `icon`, `parent_id`, `sort_order`, `enabled`.
- Seeded with the 18 categories from the specification plus 6 subcategories. The earlier
  9 enum codes are kept, so **existing offers and discovery projections need no migration**.
- Two levels only (category → subcategory). Codes are immutable; categories are disabled,
  never deleted.
- Filtering by a parent includes its subcategories: offer-service expands server-side,
  and discovery accepts `category=A,B` (up to 20 codes).
- Vendors can only assign enabled categories whose parent is enabled.

## API (offer-service, via gateway `/api/categories`)
| Method | Path | Access |
| --- | --- | --- |
| GET | `/api/categories` | Public: enabled categories with `parentCode`, in order |
| GET | `/api/categories/admin` | ADMIN: all, including disabled |
| POST | `/api/categories` | ADMIN: `{code, slug, name, description?, icon?, parentCode?, sortOrder?}` |
| PATCH | `/api/categories/{id}` | ADMIN: any of slug, name, description, icon, parentCode (`""` = top level), sortOrder, enabled |

Errors: `400 VALIDATION_ERROR` (bad code/slug format), `400 INVALID_CATEGORY` (unknown,
disabled, or nesting deeper than two levels), `404 CATEGORY_NOT_FOUND`, `409 CONFLICT`
(duplicate code or slug). Offers with unknown categories now return `400 INVALID_CATEGORY`
(previously `INVALID_REQUEST`).

## Verification
- offer-service: 6 new tests (public list, parent filter expansion, admin create/edit/
  disable, disabled not assignable, duplicates and nesting, role checks). 45 tests in
  OfferControllerTest plus 1 metrics test, all passing.
- discovery-service: comma-list parsing test (6 total passing).
- api-gateway: category routing test (5 total passing).
- Playwright: admin creates and disables a category, and it appears on and disappears from `/categories`.
