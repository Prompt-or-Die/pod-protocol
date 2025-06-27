import { test, expect, TestHelpers, TestDataFactory } from './setup';

test.describe('Messaging System', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/channels');
    const helpers = new TestHelpers(authenticatedPage);
    await helpers.waitForPageLoad();
  });

  test('should display channels dashboard', async ({ authenticatedPage }) => {
    await expect(authenticatedPage.locator('[data-testid="channels-dashboard"]')).toBeVisible();
    await expect(authenticatedPage.locator('[data-testid="create-channel-button"]')).toBeVisible();
  });

  test('should create new channel successfully', async ({ authenticatedPage }) => {
    const helpers = new TestHelpers(authenticatedPage);
    const channelData = TestDataFactory.createChannel();
    
    // Click create channel button
    await authenticatedPage.click('[data-testid="create-channel-button"]');
    
    // Fill channel form
    await authenticatedPage.fill('[data-testid="channel-name-input"]', channelData.name);
    await authenticatedPage.fill('[data-testid="channel-description-input"]', channelData.description);
    
    // Set privacy setting
    if (channelData.isPrivate) {
      await authenticatedPage.check('[data-testid="private-channel-checkbox"]');
    }
    
    // Submit form
    await authenticatedPage.click('[data-testid="submit-channel-form"]');
    
    // Wait for success
    await expect(authenticatedPage.locator('[data-testid="success-message"]')).toBeVisible();
    
    // Verify channel appears in list
    await expect(authenticatedPage.locator(`[data-testid="channel-${channelData.name}"]`)).toBeVisible();
  });

  test('should send and receive messages', async ({ authenticatedPage }) => {
    const helpers = new TestHelpers(authenticatedPage);
    const messageData = TestDataFactory.createMessage();
    
    // Enter a channel
    await authenticatedPage.click('[data-testid="enter-channel-button"]');
    
    // Wait for chat interface
    await expect(authenticatedPage.locator('[data-testid="chat-interface"]')).toBeVisible();
    
    // Type message
    await authenticatedPage.fill('[data-testid="message-input"]', messageData.content);
    
    // Send message
    await authenticatedPage.click('[data-testid="send-message-button"]');
    
    // Verify message appears in chat
    await expect(authenticatedPage.locator(`[data-testid="message-${messageData.content}"]`)).toBeVisible();
  });

  test('should handle message validation', async ({ authenticatedPage }) => {
    // Enter a channel
    await authenticatedPage.click('[data-testid="enter-channel-button"]');
    
    // Try to send empty message
    await authenticatedPage.click('[data-testid="send-message-button"]');
    
    // Verify validation
    await expect(authenticatedPage.locator('[data-testid="message-error"]')).toBeVisible();
  });

  test('should display message history', async ({ authenticatedPage }) => {
    // Enter a channel
    await authenticatedPage.click('[data-testid="enter-channel-button"]');
    
    // Wait for message history to load
    await expect(authenticatedPage.locator('[data-testid="message-history"]')).toBeVisible();
    
    // Verify messages are displayed
    const messageCount = await authenticatedPage.locator('[data-testid^="message-"]').count();
    expect(messageCount).toBeGreaterThanOrEqual(0);
  });

  test('should handle real-time message updates', async ({ authenticatedPage }) => {
    const helpers = new TestHelpers(authenticatedPage);
    
    // Enter a channel
    await authenticatedPage.click('[data-testid="enter-channel-button"]');
    
    // Mock incoming message via WebSocket
    await authenticatedPage.evaluate(() => {
      // Simulate WebSocket message
      window.dispatchEvent(new CustomEvent('newMessage', {
        detail: {
          id: 'test-message-id',
          content: 'Real-time test message',
          sender: 'TestAgent',
          timestamp: Date.now()
        }
      }));
    });
    
    // Verify message appears
    await expect(authenticatedPage.locator('[data-testid="message-Real-time test message"]')).toBeVisible();
  });

  test('should search messages', async ({ authenticatedPage }) => {
    const helpers = new TestHelpers(authenticatedPage);
    
    // Enter a channel
    await authenticatedPage.click('[data-testid="enter-channel-button"]');
    
    // Use search
    await authenticatedPage.fill('[data-testid="message-search"]', 'test');
    
    // Wait for search results
    await helpers.waitForPageLoad();
    
    // Verify search results
    await expect(authenticatedPage.locator('[data-testid="search-results"]')).toBeVisible();
  });

  test('should handle channel permissions', async ({ authenticatedPage }) => {
    // Try to enter a private channel without permission
    await authenticatedPage.click('[data-testid="private-channel-link"]');
    
    // Verify access denied message
    await expect(authenticatedPage.locator('[data-testid="access-denied"]')).toBeVisible();
  });
});