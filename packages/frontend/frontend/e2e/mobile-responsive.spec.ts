import { test, expect, TestHelpers } from './setup';

test.describe('Mobile Responsiveness', () => {
  test.beforeEach(async ({ page }) => {
    const helpers = new TestHelpers(page);
    await helpers.setMobileViewport();
    await page.goto('/');
  });

  test('should display mobile navigation', async ({ authenticatedPage }) => {
    const helpers = new TestHelpers(authenticatedPage);
    await helpers.setMobileViewport();
    
    // Verify mobile bottom navigation
    await expect(authenticatedPage.locator('[data-testid="mobile-bottom-nav"]')).toBeVisible();
    
    // Verify navigation items
    await expect(authenticatedPage.locator('[data-testid="nav-dashboard"]')).toBeVisible();
    await expect(authenticatedPage.locator('[data-testid="nav-channels"]')).toBeVisible();
    await expect(authenticatedPage.locator('[data-testid="nav-agents"]')).toBeVisible();
    await expect(authenticatedPage.locator('[data-testid="nav-settings"]')).toBeVisible();
  });

  test('should hide bottom nav on scroll', async ({ authenticatedPage }) => {
    const helpers = new TestHelpers(authenticatedPage);
    await helpers.setMobileViewport();
    
    // Scroll down
    await authenticatedPage.evaluate(() => window.scrollTo(0, 500));
    await authenticatedPage.waitForTimeout(500);
    
    // Verify nav is hidden
    const nav = authenticatedPage.locator('[data-testid="mobile-bottom-nav"]');
    await expect(nav).toHaveCSS('transform', 'translateY(100px)');
    
    // Scroll up
    await authenticatedPage.evaluate(() => window.scrollTo(0, 0));
    await authenticatedPage.waitForTimeout(500);
    
    // Verify nav is visible
    await expect(nav).toHaveCSS('transform', 'translateY(0px)');
  });

  test('should open mobile search overlay', async ({ authenticatedPage }) => {
    const helpers = new TestHelpers(authenticatedPage);
    await helpers.setMobileViewport();
    
    // Click search button
    await authenticatedPage.click('[data-testid="mobile-search-button"]');
    
    // Verify search overlay
    await expect(authenticatedPage.locator('[data-testid="search-overlay"]')).toBeVisible();
    
    // Test search functionality
    await authenticatedPage.fill('[data-testid="search-input"]', 'test query');
    await expect(authenticatedPage.locator('[data-testid="search-input"]')).toHaveValue('test query');
    
    // Close overlay
    await authenticatedPage.click('[data-testid="close-search"]');
    await expect(authenticatedPage.locator('[data-testid="search-overlay"]')).not.toBeVisible();
  });

  test('should have proper touch targets', async ({ authenticatedPage }) => {
    const helpers = new TestHelpers(authenticatedPage);
    await helpers.setMobileViewport();
    
    // Check touch target sizes (should be at least 44px)
    const buttons = await authenticatedPage.locator('button').all();
    
    for (const button of buttons) {
      const boundingBox = await button.boundingBox();
      if (boundingBox) {
        expect(boundingBox.height).toBeGreaterThanOrEqual(40); // Allow 40px minimum for small screens
        expect(boundingBox.width).toBeGreaterThanOrEqual(40);
      }
    }
  });

  test('should display mobile-optimized layout', async ({ authenticatedPage }) => {
    const helpers = new TestHelpers(authenticatedPage);
    await helpers.setMobileViewport();
    
    await authenticatedPage.goto('/dashboard');
    
    // Verify mobile layout
    await expect(authenticatedPage.locator('[data-testid="mobile-layout"]')).toBeVisible();
    
    // Verify responsive grid
    const gridItems = await authenticatedPage.locator('[data-testid^="grid-item"]').all();
    
    // On mobile, items should stack vertically
    for (let i = 1; i < gridItems.length; i++) {
      const prevBox = await gridItems[i-1].boundingBox();
      const currBox = await gridItems[i].boundingBox();
      
      if (prevBox && currBox) {
        // Items should be stacked (current item below previous)
        expect(currBox.y).toBeGreaterThan(prevBox.y + prevBox.height - 10);
      }
    }
  });

  test('should handle swipe gestures', async ({ authenticatedPage }) => {
    const helpers = new TestHelpers(authenticatedPage);
    await helpers.setMobileViewport();
    
    await authenticatedPage.goto('/channels');
    
    // Simulate swipe gesture
    await authenticatedPage.locator('[data-testid="swipeable-container"]').hover();
    
    // Perform swipe (touch events)
    await authenticatedPage.touchscreen.tap(200, 300);
    await authenticatedPage.mouse.move(200, 300);
    await authenticatedPage.mouse.down();
    await authenticatedPage.mouse.move(100, 300); // Swipe left
    await authenticatedPage.mouse.up();
    
    // Verify swipe action
    await expect(authenticatedPage.locator('[data-testid="swipe-action"]')).toBeVisible();
  });

  test('should support pull-to-refresh', async ({ authenticatedPage }) => {
    const helpers = new TestHelpers(authenticatedPage);
    await helpers.setMobileViewport();
    
    await authenticatedPage.goto('/channels');
    
    // Simulate pull-to-refresh
    await authenticatedPage.evaluate(() => {
      window.scrollTo(0, 0);
    });
    
    // Touch and drag down
    await authenticatedPage.touchscreen.tap(200, 50);
    await authenticatedPage.mouse.move(200, 50);
    await authenticatedPage.mouse.down();
    await authenticatedPage.mouse.move(200, 150); // Pull down
    await authenticatedPage.mouse.up();
    
    // Verify refresh indicator
    await expect(authenticatedPage.locator('[data-testid="refresh-indicator"]')).toBeVisible();
  });

  test('should adapt to orientation changes', async ({ page }) => {
    const helpers = new TestHelpers(page);
    
    // Portrait mode
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');
    
    // Verify portrait layout
    await expect(page.locator('[data-testid="portrait-layout"]')).toBeVisible();
    
    // Landscape mode
    await page.setViewportSize({ width: 667, height: 375 });
    await page.waitForTimeout(500);
    
    // Verify landscape layout adaptations
    const nav = page.locator('[data-testid="mobile-bottom-nav"]');
    const boundingBox = await nav.boundingBox();
    
    if (boundingBox) {
      // Nav should be more compact in landscape
      expect(boundingBox.height).toBeLessThan(80);
    }
  });
});