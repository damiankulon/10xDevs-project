import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should display homepage', async ({ page }) => {
    // Navigate to the homepage
    await page.goto('/');

    // Check if the page loaded successfully
    await expect(page).toHaveTitle(/Kipio/i);
  });

  test('should have navigation links', async ({ page }) => {
    await page.goto('/');

    // Example: Check for common navigation elements
    // Adjust based on your actual homepage structure
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();
  });
});
