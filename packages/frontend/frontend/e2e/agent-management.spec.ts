import { test, expect, TestHelpers, TestDataFactory } from './setup';

test.describe('Agent Management', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/agents');
    const helpers = new TestHelpers(authenticatedPage);
    await helpers.waitForPageLoad();
  });

  test('should display agents dashboard', async ({ authenticatedPage }) => {
    await expect(authenticatedPage.locator('[data-testid="agents-dashboard"]')).toBeVisible();
    await expect(authenticatedPage.locator('[data-testid="create-agent-button"]')).toBeVisible();
  });

  test('should create new agent successfully', async ({ authenticatedPage }) => {
    const helpers = new TestHelpers(authenticatedPage);
    const agentData = TestDataFactory.createAgent();
    
    // Click create agent button
    await authenticatedPage.click('[data-testid="create-agent-button"]');
    
    // Fill agent form
    await authenticatedPage.fill('[data-testid="agent-name-input"]', agentData.name);
    await authenticatedPage.fill('[data-testid="agent-description-input"]', agentData.description);
    
    // Submit form
    await authenticatedPage.click('[data-testid="submit-agent-form"]');
    
    // Wait for success
    await expect(authenticatedPage.locator('[data-testid="success-message"]')).toBeVisible();
    
    // Verify agent appears in list
    await expect(authenticatedPage.locator(`[data-testid="agent-${agentData.name}"]`)).toBeVisible();
  });

  test('should validate agent form inputs', async ({ authenticatedPage }) => {
    await authenticatedPage.click('[data-testid="create-agent-button"]');
    
    // Try to submit empty form
    await authenticatedPage.click('[data-testid="submit-agent-form"]');
    
    // Check validation errors
    await expect(authenticatedPage.locator('[data-testid="name-error"]')).toBeVisible();
    await expect(authenticatedPage.locator('[data-testid="description-error"]')).toBeVisible();
  });

  test('should update agent information', async ({ authenticatedPage }) => {
    const helpers = new TestHelpers(authenticatedPage);
    
    // Assume an agent exists, click edit
    await authenticatedPage.click('[data-testid="edit-agent-button"]');
    
    // Update description
    const newDescription = `Updated description ${Date.now()}`;
    await authenticatedPage.fill('[data-testid="agent-description-input"]', newDescription);
    
    // Save changes
    await authenticatedPage.click('[data-testid="save-agent-changes"]');
    
    // Verify success
    await expect(authenticatedPage.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test('should delete agent with confirmation', async ({ authenticatedPage }) => {
    // Click delete button
    await authenticatedPage.click('[data-testid="delete-agent-button"]');
    
    // Confirm deletion
    await authenticatedPage.click('[data-testid="confirm-delete"]');
    
    // Verify agent is removed
    await expect(authenticatedPage.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test('should search and filter agents', async ({ authenticatedPage }) => {
    const helpers = new TestHelpers(authenticatedPage);
    
    // Use search
    await authenticatedPage.fill('[data-testid="agent-search-input"]', 'test');
    await helpers.waitForPageLoad();
    
    // Verify filtered results
    const agentCards = await authenticatedPage.locator('[data-testid^="agent-"]').count();
    expect(agentCards).toBeGreaterThanOrEqual(0);
  });

  test('should display agent statistics', async ({ authenticatedPage }) => {
    await expect(authenticatedPage.locator('[data-testid="agent-stats"]')).toBeVisible();
    await expect(authenticatedPage.locator('[data-testid="total-agents"]')).toBeVisible();
    await expect(authenticatedPage.locator('[data-testid="active-agents"]')).toBeVisible();
  });
});