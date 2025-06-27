import { test as base, expect } from '@playwright/test';
import { Page } from '@playwright/test';

// Extend Playwright test with custom fixtures
type TestFixtures = {
  walletPage: Page;
  authenticatedPage: Page;
};

// Custom test fixture for wallet-connected sessions
export const test = base.extend<TestFixtures>({
  // Wallet page fixture for testing wallet interactions
  walletPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Mock wallet connection for testing
    await page.addInitScript(() => {
      // Mock Solana wallet
      (window as any).solana = {
        isPhantom: true,
        isConnected: false,
        publicKey: null,
        connect: async () => {
          (window as any).solana.isConnected = true;
          (window as any).solana.publicKey = {
            toString: () => 'HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps'
          };
          return { publicKey: (window as any).solana.publicKey };
        },
        disconnect: async () => {
          (window as any).solana.isConnected = false;
          (window as any).solana.publicKey = null;
        },
        signTransaction: async (transaction: any) => transaction,
        signAllTransactions: async (transactions: any[]) => transactions,
      };
    });

    await use(page);
    await context.close();
  },

  // Authenticated page fixture with wallet already connected
  authenticatedPage: async ({ walletPage }, use) => {
    // Navigate to app and connect wallet
    await walletPage.goto('/');
    
    // Connect wallet
    await walletPage.click('[data-testid="connect-wallet-button"]');
    await walletPage.waitForTimeout(1000); // Wait for connection
    
    // Verify connection
    await expect(walletPage.locator('[data-testid="wallet-address"]')).toBeVisible();
    
    await use(walletPage);
  },
});

// Custom expect extensions
export { expect } from '@playwright/test';

// Helper functions for common test operations
export class TestHelpers {
  constructor(private page: Page) {}

  // Wait for wallet connection
  async waitForWalletConnection() {
    await this.page.waitForSelector('[data-testid="wallet-address"]', { timeout: 10000 });
  }

  // Wait for page load with performance monitoring
  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForLoadState('domcontentloaded');
  }

  // Screenshot helper for debugging
  async screenshotOnFailure(testName: string) {
    await this.page.screenshot({ 
      path: `e2e/screenshots/failure-${testName}-${Date.now()}.png`,
      fullPage: true 
    });
  }

  // Check for console errors
  async checkConsoleErrors(): Promise<string[]> {
    const errors: string[] = [];
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    return errors;
  }

  // Performance metrics
  async getPerformanceMetrics() {
    return await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      
      return {
        loadTime: navigation.loadEventEnd - navigation.loadEventStart,
        domInteractive: navigation.domInteractive - navigation.navigationStart,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
      };
    });
  }

  // Check accessibility
  async checkAccessibility() {
    // This would integrate with axe-core or similar
    const violations = await this.page.evaluate(() => {
      // Mock accessibility check - in real implementation use axe-core
      return [];
    });
    return violations;
  }

  // Mobile viewport helper
  async setMobileViewport() {
    await this.page.setViewportSize({ width: 375, height: 667 });
  }

  // Desktop viewport helper
  async setDesktopViewport() {
    await this.page.setViewportSize({ width: 1280, height: 720 });
  }
}

// Test data factory
export class TestDataFactory {
  static createAgent() {
    return {
      name: `TestAgent${Date.now()}`,
      description: 'Test agent for E2E testing',
      reputation: 100,
    };
  }

  static createChannel() {
    return {
      name: `TestChannel${Date.now()}`,
      description: 'Test channel for E2E testing',
      isPrivate: false,
    };
  }

  static createMessage() {
    return {
      content: `Test message ${Date.now()}`,
      type: 'text',
    };
  }
}

// Environment configuration
export const config = {
  baseURL: process.env.BASE_URL || 'http://localhost:3000',
  timeout: 30000,
  retries: 2,
};