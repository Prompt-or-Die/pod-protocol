import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global E2E test setup...');
  
  // Start any required services
  await setupTestEnvironment();
  
  // Authenticate once for all tests
  await setupAuthentication();
  
  console.log('✅ Global E2E setup completed');
}

async function setupTestEnvironment() {
  // Setup test database, mock services, etc.
  console.log('🔧 Setting up test environment...');
  
  // In a real implementation, you might:
  // 1. Start test database
  // 2. Seed test data
  // 3. Start mock services
  // 4. Configure test blockchain node
  
  // For now, just ensure the app is accessible
  try {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    await page.goto('http://localhost:3000', { timeout: 30000 });
    await page.waitForLoadState('networkidle');
    
    await browser.close();
    console.log('✅ Application is accessible');
  } catch (error) {
    console.error('❌ Failed to access application:', error);
    throw error;
  }
}

async function setupAuthentication() {
  console.log('🔐 Setting up test authentication...');
  
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Mock wallet setup
    await page.addInitScript(() => {
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
    
    await page.goto('http://localhost:3000');
    
    // Save authentication state
    await context.storageState({ path: 'e2e/auth-state.json' });
    
    console.log('✅ Test authentication configured');
  } catch (error) {
    console.error('❌ Failed to setup authentication:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;