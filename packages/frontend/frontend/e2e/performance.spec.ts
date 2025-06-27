import { test, expect, TestHelpers } from './setup';

test.describe('Performance Testing', () => {
  test('should meet Core Web Vitals thresholds', async ({ page }) => {
    const helpers = new TestHelpers(page);
    
    await page.goto('/');
    await helpers.waitForPageLoad();
    
    const metrics = await helpers.getPerformanceMetrics();
    
    // Core Web Vitals thresholds
    expect(metrics.loadTime).toBeLessThan(2500); // LCP < 2.5s
    expect(metrics.domInteractive).toBeLessThan(3000); // TTI < 3s
    expect(metrics.firstContentfulPaint).toBeLessThan(1800); // FCP < 1.8s
  });

  test('should load pages within performance budget', async ({ page }) => {
    const helpers = new TestHelpers(page);
    const pages = ['/dashboard', '/channels', '/agents', '/settings'];
    
    for (const pagePath of pages) {
      const startTime = Date.now();
      
      await page.goto(pagePath);
      await helpers.waitForPageLoad();
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000); // 3 second budget
      
      console.log(`${pagePath} loaded in ${loadTime}ms`);
    }
  });

  test('should have efficient bundle sizes', async ({ page }) => {
    await page.goto('/');
    
    const resources = await page.evaluate(() => {
      return performance.getEntriesByType('resource')
        .filter((entry: any) => entry.name.includes('.js') || entry.name.includes('.css'))
        .map((entry: any) => ({
          name: entry.name,
          size: entry.transferSize,
          duration: entry.duration
        }));
    });
    
    // Check main bundle size
    const mainBundle = resources.find(r => r.name.includes('main') || r.name.includes('index'));
    if (mainBundle) {
      expect(mainBundle.size).toBeLessThan(500000); // 500KB limit for main bundle
    }
    
    // Check total JS size
    const totalJSSize = resources
      .filter(r => r.name.includes('.js'))
      .reduce((total, resource) => total + resource.size, 0);
    
    expect(totalJSSize).toBeLessThan(1500000); // 1.5MB total JS limit
  });

  test('should load images efficiently', async ({ page }) => {
    await page.goto('/dashboard');
    
    const images = await page.evaluate(() => {
      return Array.from(document.images).map(img => ({
        src: img.src,
        width: img.naturalWidth,
        height: img.naturalHeight,
        loading: img.loading,
        loaded: img.complete
      }));
    });
    
    // Check image optimization
    for (const img of images) {
      // Images should use lazy loading (except above fold)
      if (!img.src.includes('priority')) {
        expect(img.loading).toBe('lazy');
      }
      
      // Images should be loaded
      expect(img.loaded).toBe(true);
    }
  });

  test('should handle memory efficiently', async ({ page }) => {
    const helpers = new TestHelpers(page);
    
    // Navigate through multiple pages
    const pages = ['/dashboard', '/channels', '/agents', '/settings'];
    
    for (const pagePath of pages) {
      await page.goto(pagePath);
      await helpers.waitForPageLoad();
      
      // Check memory usage
      const memoryInfo = await page.evaluate(() => {
        return (performance as any).memory ? {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
          jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
        } : null;
      });
      
      if (memoryInfo) {
        // Memory should not exceed 50MB
        expect(memoryInfo.usedJSHeapSize).toBeLessThan(50 * 1024 * 1024);
        
        // Memory usage should be reasonable percentage of limit
        const memoryUsagePercentage = memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit;
        expect(memoryUsagePercentage).toBeLessThan(0.8); // Less than 80%
      }
    }
  });

  test('should have efficient network usage', async ({ page }) => {
    await page.goto('/');
    
    const networkEntries = await page.evaluate(() => {
      return performance.getEntriesByType('resource').map((entry: any) => ({
        name: entry.name,
        transferSize: entry.transferSize,
        encodedBodySize: entry.encodedBodySize,
        duration: entry.duration,
        responseStart: entry.responseStart,
        responseEnd: entry.responseEnd
      }));
    });
    
    // Check for compression
    for (const entry of networkEntries) {
      if (entry.transferSize > 0 && entry.encodedBodySize > 0) {
        const compressionRatio = entry.transferSize / entry.encodedBodySize;
        
        // Text resources should be compressed (ratio < 0.9)
        if (entry.name.includes('.js') || entry.name.includes('.css') || entry.name.includes('.html')) {
          expect(compressionRatio).toBeLessThan(0.9);
        }
      }
    }
    
    // Check for reasonable request counts
    const requestCount = networkEntries.length;
    expect(requestCount).toBeLessThan(50); // Reasonable number of requests
  });

  test('should handle concurrent users simulation', async ({ browser }) => {
    const concurrentUsers = 5;
    const promises = [];
    
    for (let i = 0; i < concurrentUsers; i++) {
      const promise = (async () => {
        const context = await browser.newContext();
        const page = await context.newPage();
        const helpers = new TestHelpers(page);
        
        const startTime = Date.now();
        
        // Simulate user journey
        await page.goto('/');
        await helpers.waitForPageLoad();
        
        await page.goto('/dashboard');
        await helpers.waitForPageLoad();
        
        await page.goto('/channels');
        await helpers.waitForPageLoad();
        
        const totalTime = Date.now() - startTime;
        
        await context.close();
        
        return { userId: i, totalTime };
      })();
      
      promises.push(promise);
    }
    
    const results = await Promise.all(promises);
    
    // All users should complete journey within reasonable time
    for (const result of results) {
      expect(result.totalTime).toBeLessThan(15000); // 15 seconds max
      console.log(`User ${result.userId} completed in ${result.totalTime}ms`);
    }
  });

  test('should maintain performance on slow networks', async ({ page }) => {
    // Simulate slow 3G
    const client = await page.context().newCDPSession(page);
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: 500 * 1024 / 8, // 500 Kbps
      uploadThroughput: 500 * 1024 / 8,
      latency: 400 // 400ms latency
    });
    
    const helpers = new TestHelpers(page);
    const startTime = Date.now();
    
    await page.goto('/');
    await helpers.waitForPageLoad();
    
    const loadTime = Date.now() - startTime;
    
    // Should still be usable on slow networks (under 10s)
    expect(loadTime).toBeLessThan(10000);
    
    // Reset network conditions
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: -1,
      uploadThroughput: -1,
      latency: 0
    });
  });
});