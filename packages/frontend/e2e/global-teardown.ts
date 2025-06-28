import { FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global E2E test teardown...');
  
  // Cleanup test environment
  await cleanupTestEnvironment();
  
  // Generate test report summary
  await generateTestSummary();
  
  console.log('✅ Global E2E teardown completed');
}

async function cleanupTestEnvironment() {
  console.log('🗑️ Cleaning up test environment...');
  
  try {
    // Clean up auth state
    const authStatePath = 'e2e/auth-state.json';
    if (fs.existsSync(authStatePath)) {
      fs.unlinkSync(authStatePath);
    }
    
    // Clean up any test data
    // In a real implementation, you might:
    // 1. Clean test database
    // 2. Stop mock services
    // 3. Clean up test files
    // 4. Reset blockchain state
    
    console.log('✅ Test environment cleaned up');
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

async function generateTestSummary() {
  console.log('📊 Generating test summary...');
  
  try {
    // Read test results if available
    const resultsPath = 'e2e-results.json';
    if (fs.existsSync(resultsPath)) {
      const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
      
      const summary = {
        timestamp: new Date().toISOString(),
        totalTests: results.stats?.total || 0,
        passed: results.stats?.passed || 0,
        failed: results.stats?.failed || 0,
        skipped: results.stats?.skipped || 0,
        duration: results.stats?.duration || 0,
        suites: results.suites?.map((suite: any) => ({
          title: suite.title,
          tests: suite.tests?.length || 0,
          passed: suite.tests?.filter((t: any) => t.outcome === 'passed').length || 0,
          failed: suite.tests?.filter((t: any) => t.outcome === 'failed').length || 0,
        })) || []
      };
      
      // Write summary
      fs.writeFileSync('e2e-summary.json', JSON.stringify(summary, null, 2));
      
      // Log summary
      console.log(`
📊 Test Summary:
   Total: ${summary.totalTests}
   Passed: ${summary.passed}
   Failed: ${summary.failed}
   Skipped: ${summary.skipped}
   Duration: ${Math.round(summary.duration / 1000)}s
      `);
      
      // Check if we should fail the build
      if (summary.failed > 0) {
        console.error(`❌ ${summary.failed} tests failed`);
      } else {
        console.log('✅ All tests passed');
      }
    }
  } catch (error) {
    console.error('❌ Error generating test summary:', error);
  }
}

export default globalTeardown;