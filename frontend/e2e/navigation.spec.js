import { expect, test } from '@playwright/test';

test('homepage shows the hero, categories from the API, and the vendor section', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Discover the best deals around you.' })).toBeVisible();
  // Category tiles come from GET /api/categories, not a hard-coded list.
  await expect(page.locator('#category-tile-food-cafes')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Reach customers in your neighbourhood.' })).toBeVisible();
});

test('main routes render and unknown routes show the 404 page', async ({ page }) => {
  for (const [path, heading] of [
    ['/explore', 'Explore all offers'],
    ['/categories', 'Browse by category'],
    ['/business/register', 'Reach customers in your neighbourhood.'],
    ['/auth/login', 'Welcome back'],
  ]) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
  }
  await page.goto('/no-such-page');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
});

test('portal pages redirect signed-out visitors to sign in', async ({ page }) => {
  await page.goto('/business/offers');
  await expect(page).toHaveURL(/\/auth\/login\?next=%2Fbusiness%2Foffers/);
  await page.goto('/admin/categories');
  await expect(page).toHaveURL(/\/auth\/login\?next=%2Fadmin%2Fcategories/);
});

test('location can be chosen manually without device permission', async ({ page }) => {
  await page.goto('/nearby');
  await expect(page.getByRole('heading', { name: 'Where should we look?' })).toBeVisible();
  await page.locator('#location-btn').click();
  await page.locator('#radius-10').click();
  await page.locator('#city-select').selectOption('ahmedabad');
  await page.locator('#apply-city').click();
  await expect(page.locator('#location-btn')).toContainText('Ahmedabad · 10 km');
  await expect(page.getByText('Within 10 km of Ahmedabad')).toBeVisible();
});

test('category pages resolve by slug and list subcategories', async ({ page }) => {
  await page.goto('/categories');
  await page.getByRole('link', { name: /Food & Cafés/ }).first().click();
  await expect(page).toHaveURL(/\/categories\/food-cafes$/);
  await expect(page.getByRole('link', { name: /Cafés/ }).last()).toBeVisible();
  await page.goto('/categories/does-not-exist');
  await expect(page.getByRole('heading', { name: 'Category not found' })).toBeVisible();
});
