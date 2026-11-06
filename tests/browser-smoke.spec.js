const { test, expect } = require('@playwright/test');

async function waitForCatalog(page) {
  const status = page.locator('#catalogStatus');
  await expect(status).toContainText(/cards loaded/i, { timeout: 25000 });
  await expect(page.locator('#cardGrid .card-tile').first()).toBeAttached();
}

async function revealLockedVaultForSmoke(page) {
  const wasLocked = await page.locator('body').evaluate(body => body.classList.contains('vault-locked'));
  await page.addStyleTag({ content: `
    #vaultLockScreen { display:none !important; pointer-events:none !important; }
    body.vault-locked { overflow:auto !important; }
    body.vault-locked .app-shell,
    body.vault-locked > dialog { visibility:visible !important; }
    *, *::before, *::after { animation-duration:0s !important; transition-duration:0s !important; }
  ` });
  await page.evaluate(() => {
    document.body.classList.remove('vault-locked');
    const lock = document.getElementById('vaultLockScreen');
    if (lock) lock.hidden = true;
    window.dispatchEvent(new CustomEvent('riftbound-motion-change', { detail:{enabled:false} }));
  });
  await expect(page.locator('#cardGrid .card-tile').first()).toBeVisible();
  return wasLocked;
}

async function isMobileLayout(page) {
  const viewport = page.viewportSize();
  return !!viewport && viewport.width <= 700;
}

async function openTab(page, tab) {
  if (await isMobileLayout(page)) {
    const button = page.locator(`#mobileNav [data-mobile-tab="${tab}"]`);
    await expect(button).toBeVisible();
    await button.click({ force:true });
  } else {
    const button = page.locator(`.tab[data-tab="${tab}"]`);
    await expect(button).toBeVisible();
    await button.click({ force:true });
  }
  await expect(page.locator(`#${tab}View`)).toHaveClass(/active/);
}

async function expectNoHorizontalOverflow(locator) {
  await expect(locator).toBeVisible();
  const dimensions = await locator.evaluate(el => ({
    clientWidth: el.clientWidth,
    scrollWidth: el.scrollWidth
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
}

test('full responsive vault smoke test', async ({ page }) => {
  const pageErrors = [];
  const consoleErrors = [];
  const badLocalResponses = [];

  await page.route('**/*', route => {
    const request = route.request();
    const url = new URL(request.url());
    if (
      url.origin !== 'http://127.0.0.1:4173' &&
      ['image', 'media', 'font'].includes(request.resourceType())
    ) {
      return route.abort();
    }
    return route.continue();
  });

  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => {
    if (message.type() !== 'error') return;
    const value = message.text();
    if (/^Failed to load resource:/i.test(value)) return;
    consoleErrors.push(value);
  });
  page.on('response', response => {
    const url = new URL(response.url());
    if (url.origin === 'http://127.0.0.1:4173' && response.status() >= 400) {
      badLocalResponses.push(`${response.status()} ${url.pathname}`);
    }
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await waitForCatalog(page);
  const wasLocked = await revealLockedVaultForSmoke(page);

  expect(wasLocked).toBe(true);
  await expect(page.locator('body')).toHaveAttribute('data-vault-theme', 'cosmic');
  await expect(page.locator('#cardGrid .card-tile')).not.toHaveCount(0);

  for (const tab of ['storage', 'decks', 'loans', 'cards']) {
    await openTab(page, tab);
  }

  if (await isMobileLayout(page)) {
    await expect(page.locator('#mobileNav')).toBeVisible();

    const tools = page.locator('#mobileToolsCenterBtn');
    await expect(tools).toBeVisible();
    await tools.click({ force:true });
    const toolsSheet = page.locator('#mobileToolsSheet');
    await expect(toolsSheet).toBeVisible();
    await toolsSheet.locator('[data-mobile-sheet-close="mobileToolsSheet"]').last().click({ force:true });
    await expect(toolsSheet).toBeHidden();

    const filterButton = page.locator('#mobileFilterBtn');
    await expect(filterButton).toBeVisible();
    await filterButton.click({ force:true });
    const filterSheet = page.locator('#mobileFilterSheet');
    await expect(filterSheet).toBeVisible();
    await expect(page.locator('body')).toHaveClass(/mobile-sheet-open/);
    await filterSheet.locator('[data-mobile-sheet-close="mobileFilterSheet"]').last().click({ force:true });
    await expect(filterSheet).toBeHidden();
    await expect(page.locator('body')).not.toHaveClass(/mobile-sheet-open/);
  } else {
    await expect(page.locator('#mobileNav')).toBeHidden();
    await openTab(page, 'tools');
    await openTab(page, 'cards');
  }

  const settingsButton = page.locator('#uxSettingsBtn');
  await expect(settingsButton).toBeVisible();
  await settingsButton.click({ force:true });
  const panel = page.locator('#uxSettings');
  await expect(panel).toBeVisible();
  await expect(panel).not.toContainText(/neon/i);
  await expect(page.locator('#intensitySelect')).toHaveCount(0);
  await expect(page.locator('#themeAudioToggle')).toHaveCount(1);
  await expect(page.locator('#animationsToggle')).toHaveCount(1);
  await page.locator('.settings-close').click({ force:true });
  await expect(panel).toBeHidden();

  await openTab(page, 'cards');
  const search = page.locator('#cardSearch');
  await search.fill('Ahri');
  await expect(page.locator('#cardGrid .card-tile').first()).toBeVisible();
  await page.locator('#cardGrid .card-tile').first().click({ force:true });
  if (await isMobileLayout(page)) {
    const cardSheet = page.locator('#mobileCardSheet');
    await expect(cardSheet).toBeVisible();
    await expectNoHorizontalOverflow(cardSheet.locator('.mobile-sheet'));
    await cardSheet.locator('[data-mobile-sheet-close="mobileCardSheet"]').last().click({ force:true });
    await expect(cardSheet).toBeHidden();
  } else {
    const cardDialog = page.locator('#cardDialog');
    await expectNoHorizontalOverflow(cardDialog);
    await cardDialog.locator('[data-close="cardDialog"]').click({ force:true });
    await expect(cardDialog).toBeHidden();
  }
  await search.fill('');
  await expect(page.locator('#cardGrid .card-tile').first()).toBeVisible();

  await openTab(page, 'loans');
  await expect(page.locator('#newLoanBtn')).toBeVisible();
  await page.waitForFunction(() => typeof window.RiftboundLoans?.open === 'function');
  await page.evaluate(() => window.RiftboundLoans.open());
  const loanDialog = page.locator('#loanDialog');
  await expect(loanDialog.locator('.loan-group-editor')).toBeVisible();
  await expectNoHorizontalOverflow(loanDialog);
  await expectNoHorizontalOverflow(loanDialog.locator('.loan-group-editor'));
  await loanDialog.locator('[data-loan-manager-close]').click({ force:true });
  await expect(loanDialog).toBeHidden();

  const pageDimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));
  expect(pageDimensions.scrollWidth).toBeLessThanOrEqual(pageDimensions.clientWidth + 1);

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
  expect(badLocalResponses).toEqual([]);
});
