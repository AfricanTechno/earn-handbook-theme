const { test, expect } = require('@playwright/test');

test('preview renders across responsive shells without overflow or script errors', async ({ page }) => {
  const issues = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      issues.push('console: ' + message.text());
    }
  });

  page.on('pageerror', (error) => {
    issues.push('pageerror: ' + error.message);
  });

  await page.goto('/preview/index.html');

  await expect(page.locator('.eh-header')).toBeVisible();
  await expect(page.locator('[data-doc-title]')).toHaveText('Operational Resilience Review');
  await expect(page.locator('[data-toc-list] li')).toHaveCount(7);

  const width = (page.viewportSize() || { width: 1440 }).width;
  const overflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth - document.documentElement.clientWidth;
  });

  expect(overflow).toBeLessThanOrEqual(1);

  if (width < 1024) {
    await expect(page.locator('[data-mobile-nav]')).toBeVisible();
    await page.locator('[data-mobile-menu-toggle]').click();
    await expect(page.locator('body')).toHaveClass(/eh-sidebar-open/);
    await page.locator('[data-sidebar-overlay]').click({
      position: {
        x: Math.max(width - 24, 24),
        y: 24
      }
    });
    await expect(page.locator('body')).not.toHaveClass(/eh-sidebar-open/);
  } else {
    await expect(page.locator('[data-mobile-nav]')).toBeHidden();
    await expect(page.locator('[data-sidebar]')).toBeVisible();
  }

  await expect(page.locator('[data-recents-list]').first().locator('a').first()).toHaveText('Operational Resilience Review');

  await page.screenshot({
    path: test.info().outputPath(test.info().project.name + '.png'),
    fullPage: true
  });

  expect(issues, issues.join('\n')).toEqual([]);
});
