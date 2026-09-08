const { test, expect } = require('@playwright/test');

async function waitForCatalog(page) {
  const status = page.locator('#catalogStatus');
  await expect(status).toContainText(/cards loaded/i, { timeout: 25000 });
  await expect(page.locator('#cardGrid .card-tile').first()).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  const pageErrors = [];
  const badLocalResponses = [];

  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('response', response => {
    const url = new URL(response.url());
    if (url.origin === 'http://127.0.0.1:4173' && response.status() >= 400) {
      badLocalResponses.push(`${response.status()} ${url.pathname}`);
    }
  });

  page.__rvErrors = pageErrors;
  page.__rvBadLocalResponses = badLocalResponses;

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await waitForCatalog(page);
});

test.afterEach(async ({ page }) => {
  expect(page.__rvErrors || []).toEqual([]);
  expect(page.__rvBadLocalResponses || []).toEqual([]);
});

test('core catalog and navigation work', async ({ page }) => {
  await expect(page.locator('body')).toHaveAttribute('data-vault-theme', 'cosmic');
  await expect(page.locator('#cardGrid .card-tile')).not.toHaveCount(0);

  for (const tab of ['storage', 'decks', 'loans', 'tools', 'cards']) {
    const button = page.locator(`.tab[data-tab="${tab}"]`);
    await expect(button).toBeVisible();
    await button.click();
    await expect(page.locator(`#${tab}View`)).toHaveClass(/active/);
  }
});

test('settings are Cosmic-only and remain usable', async ({ page }) => {
  const settingsButton = page.locator('#uxSettingsBtn');
  await expect(settingsButton).toBeVisible();
  await settingsButton.click();

  const panel = page.locator('#uxSettings');
  await expect(panel).toBeVisible();
  await expect(panel).not.toContainText(/neon/i);
  await expect(page.locator('#intensitySelect')).toHaveCount(0);
  await expect(page.locator('#themeAudioToggle')).toHaveCount(1);

  await page.locator('.settings-close').click();
  await expect(panel).toBeHidden();
});

test('responsive controls do not leave scroll locks behind', async ({ page }) => {
  const viewport = page.viewportSize();
  if (!viewport || viewport.width > 700) {
    await expect(page.locator('#mobileNav')).toBeHidden();
    return;
  }

  await expect(page.locator('#mobileNav')).toBeVisible();
  const filterButton = page.locator('#mobileFilterBtn');
  await expect(filterButton).toBeVisible();
  await filterButton.click();

  const sheet = page.locator('#mobileFilterSheet');
  await expect(sheet).toBeVisible();
  await expect(page.locator('body')).toHaveClass(/mobile-sheet-open/);

  await sheet.locator('[data-mobile-sheet-close="mobileFilterSheet"]').last().click();
  await expect(sheet).toBeHidden();
  await expect(page.locator('body')).not.toHaveClass(/mobile-sheet-open/);
});

test('search and card dialog interactions remain responsive', async ({ page }) => {
  const search = page.locator('#cardSearch');
  await search.fill('Ahri');
  await expect(page.locator('#cardGrid .card-tile').first()).toBeVisible();

  await page.locator('#cardGrid .card-tile').first().click();
  const dialog = page.locator('#cardDialog');
  await expect(dialog).toBeVisible();
  await dialog.locator('[data-close="cardDialog"]').click();
  await expect(dialog).toBeHidden();

  await search.fill('');
  await expect(page.locator('#cardGrid .card-tile').first()).toBeVisible();
});
