import { expect, test } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_PASSWORD, PASSWORD, removeOffer, seedPublishedOffer, unique } from './helpers.js';

test('customer registers, finds an offer by category, saves it and sees it in Saved', async ({ page, request }) => {
  const seeded = await seedPublishedOffer(request, { category: 'GROCERY' });
  try {
    await page.goto('/auth/register');
    await page.locator('#register-email').fill(`${unique('customer')}@example.com`);
    await page.locator('#register-pass').fill(PASSWORD);
    await page.locator('#register-submit').click();
    await expect(page).toHaveURL(/\/account\/saved$/);

    await page.goto('/explore?category=GROCERY');
    const card = page.locator('.offer-card', { hasText: seeded.title });
    await expect(card).toBeVisible();
    await card.getByRole('button', { name: 'Save offer' }).click();
    await expect(card.getByRole('button', { name: 'Unsave offer' })).toBeVisible();

    await card.getByRole('link', { name: seeded.title }).click();
    await expect(page).toHaveURL(new RegExp(`/offers/${seeded.offerId}$`));
    await expect(page.getByRole('heading', { level: 1, name: seeded.title })).toBeVisible();
    await page.locator('#view-store-btn').click();
    await expect(page.getByRole('heading', { level: 1, name: seeded.storeName })).toBeVisible();

    await page.locator('#saved-shortcut').click();
    await expect(page.getByRole('link', { name: seeded.title })).toBeVisible();
  } finally {
    await removeOffer(request, seeded.adminToken, seeded.offerId);
  }
});

test('vendor registers, submits a store, and sees it pending review', async ({ page }) => {
  await page.goto('/business/register');
  await page.locator('#vendor-email').fill(`${unique('vendor')}@example.com`);
  await page.locator('#vendor-pass').fill(PASSWORD);
  await page.locator('#vendor-submit').click();
  await expect(page).toHaveURL(/\/business\/offers$/);

  await page.locator('#tab-stores').click();
  await page.locator('#create-store-btn').click();
  const name = unique('Browser Store');
  await page.locator('#s-name').fill(name);
  await page.locator('#s-address').fill('2 Market Street');
  await page.locator('#s-city').fill('Ahmedabad');
  await page.locator('#s-lat').fill('23.03');
  await page.locator('#s-lng').fill('72.58');
  await page.locator('#save-store-btn').click();
  const row = page.locator('.list-item', { hasText: name });
  await expect(row).toBeVisible();
  await expect(row.getByText('Pending review')).toBeVisible();
});

test('admin manages categories and the new category appears publicly', async ({ page }) => {
  await page.goto('/auth/login');
  await page.locator('#login-email').fill(ADMIN_EMAIL);
  await page.locator('#login-pass').fill(ADMIN_PASSWORD);
  await page.locator('#login-submit').click();
  await expect(page).toHaveURL(/\/admin\/vendors$/);

  await page.locator('#tab-admin-categories').click();
  await page.locator('#create-category-btn').click();
  const suffix = Date.now().toString(36).replace(/[0-9]/g, 'x').toUpperCase();
  const name = `E2E Category ${suffix}`;
  await page.locator('#cat-name').fill(name);
  await page.locator('#cat-code').fill(`ETE_${suffix}`);
  await page.locator('#cat-icon').fill('🧪');
  await page.locator('#save-category-btn').click();
  await expect(page.locator(`#category-row-ETE_${suffix}`)).toBeVisible();

  await page.goto('/categories');
  await expect(page.getByRole('heading', { name })).toBeVisible();

  // Disabling hides it from public navigation again.
  await page.goto('/admin/categories');
  await page.locator(`#toggle-category-ETE_${suffix}`).click();
  await expect(page.locator(`#category-row-ETE_${suffix}`).getByText('Disabled')).toBeVisible();
  await page.goto('/categories');
  await expect(page.getByRole('heading', { name })).toHaveCount(0);
});
