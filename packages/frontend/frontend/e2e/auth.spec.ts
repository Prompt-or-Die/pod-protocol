import { test, expect, TestHelpers, TestDataFactory } from './setup';

test.describe('Authentication & Wallet Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display connect wallet button on landing page', async ({ page }) => {
    const helpers = new TestHelpers(page);
    await helpers.waitForPageLoad();
    
    await expect(page.locator('[data-testid="connect-wallet-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="connect-wallet-button"]')).toContainText('Connect Wallet');
  });

  test('should connect wallet successfully', async ({ walletPage }) => {
    const helpers = new TestHelpers(walletPage);
    
    // Click connect wallet
    await walletPage.click('[data-testid="connect-wallet-button"]');
    
    // Wait for wallet connection
    await helpers.waitForWalletConnection();
    
    // Verify wallet address is displayed
    const walletAddress = await walletPage.locator('[data-testid="wallet-address"]').textContent();
    expect(walletAddress).toContain('HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps');
    
    // Verify connect button is replaced with wallet info
    await expect(walletPage.locator('[data-testid="connect-wallet-button"]')).not.toBeVisible();
  });

  test('should disconnect wallet successfully', async ({ authenticatedPage }) => {
    const helpers = new TestHelpers(authenticatedPage);
    
    // Click wallet dropdown
    await authenticatedPage.click('[data-testid="wallet-dropdown"]');
    
    // Click disconnect
    await authenticatedPage.click('[data-testid="disconnect-wallet"]');
    
    // Verify wallet is disconnected
    await expect(authenticatedPage.locator('[data-testid="connect-wallet-button"]')).toBeVisible();
    await expect(authenticatedPage.locator('[data-testid="wallet-address"]')).not.toBeVisible();
  });

  test('should persist wallet connection on page refresh', async ({ authenticatedPage }) => {
    const helpers = new TestHelpers(authenticatedPage);
    
    // Refresh page
    await authenticatedPage.reload();
    await helpers.waitForPageLoad();
    
    // Verify wallet is still connected
    await expect(authenticatedPage.locator('[data-testid="wallet-address"]')).toBeVisible();
  });

  test('should handle wallet connection errors gracefully', async ({ page }) => {
    // Mock wallet connection failure
    await page.addInitScript(() => {
      (window as any).solana = {
        connect: async () => {
          throw new Error('User rejected connection');
        }
      };
    });

    await page.click('[data-testid="connect-wallet-button"]');
    
    // Verify error handling
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="connect-wallet-button"]')).toBeVisible();
  });
});