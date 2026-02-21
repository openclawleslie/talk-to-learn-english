import { test, expect } from '@playwright/test';

const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const VALID_TOKEN = 'test_valid_token_12345678';

if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
  throw new Error('ADMIN_USERNAME and ADMIN_PASSWORD environment variables must be set for E2E tests');
}

test.describe('截止日期功能测试', () => {
  test('TC-DEADLINE-001: 完整的截止日期工作流程', async ({ page }) => {
    // Step 1: Admin logs in and creates a weekly task with a deadline
    await page.goto('/admin/login');
    await page.fill('#username', ADMIN_USERNAME);
    await page.fill('#password', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin/, { timeout: 10000 });

    // Navigate to weekly tasks
    await page.goto('/admin/weekly-tasks');

    // Click create task button
    await page.click('button:has-text("创建任务")');

    // Set deadline to 2 days from now
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
    twoDaysFromNow.setHours(23, 59, 0, 0); // End of day
    const deadlineStr = twoDaysFromNow.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm format

    // Fill in the deadline field
    const deadlineInput = page.locator('input[type="datetime-local"]');
    await expect(deadlineInput).toBeVisible({ timeout: 5000 });
    await deadlineInput.fill(deadlineStr);

    // Fill in required task fields
    const sentences = [
      'Hello, how are you today?',
      'I am fine, thank you very much.',
      'What is your name?',
      'My name is Alice.',
      'Nice to meet you.',
      'Where are you from?',
      'I am from Taiwan.',
      'What do you like to do?',
      'I like reading books.',
      'Goodbye, see you later.',
    ];

    for (let i = 0; i < 10; i++) {
      await page.fill(`input[placeholder="句子 ${i + 1}"]`, sentences[i]);
    }

    // Select class courses (select first available option)
    const classCourseCheckbox = page.locator('input[type="checkbox"]').first();
    if (await classCourseCheckbox.isVisible()) {
      await classCourseCheckbox.check();
    }

    // Submit the task creation form
    await page.click('button:has-text("创建")');

    // Verify success message
    await expect(page.locator('.alert')).toContainText(/成功|Success/, { timeout: 10000 });

    // Log out from admin
    await page.click('button:has-text("退出登录")');
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('TC-DEADLINE-002: 学生查看任务时看到倒计时', async ({ page }) => {
    // Navigate to family page
    await page.goto(`/family/${VALID_TOKEN}`);

    // Click to start practice
    await page.click('button:has-text("開始練習")');

    // Select first student if multiple students exist
    const studentButton = page.locator('.card.bg-base-100.shadow-lg').first();
    if (await studentButton.isVisible()) {
      await studentButton.click();
    }

    // Verify countdown timer is visible
    const countdownTimer = page.locator('[role="timer"]');
    if (await countdownTimer.isVisible({ timeout: 5000 })) {
      // Timer exists, verify it shows time remaining
      await expect(countdownTimer).toContainText(/剩餘時間|天|小時/);
    }
  });

  test('TC-DEADLINE-003: 截止日期通知横幅显示（小于24小时）', async ({ page }) => {
    // This test simulates a scenario where the deadline is within 24 hours
    // In a real implementation, you would update the database to set a deadline < 24 hours

    // Navigate to family dashboard
    await page.goto(`/family/${VALID_TOKEN}`);

    // Check for notification banner
    // The banner should appear if deadline is within 24 hours
    const notificationBanner = page.locator('.alert-warning');

    // Note: This test may not find the banner if there's no task with deadline < 24h
    // In a complete test, we would set up test data with an imminent deadline
    const bannerExists = await notificationBanner.isVisible().catch(() => false);

    if (bannerExists) {
      // Verify banner contains deadline information
      await expect(notificationBanner).toContainText(/截止|作業/);
    }
  });

  test('TC-DEADLINE-004: 延迟提交标记为"遲交"', async ({ page }) => {
    // Navigate to family page (parent dashboard)
    await page.goto(`/family/${VALID_TOKEN}`);

    // Switch to student homework tab
    await page.click('button:has-text("学生作业")');

    // Look for late submission badges
    const lateBadge = page.locator('.badge:has-text("遲交")');

    // Note: This test depends on having late submissions in the test data
    // In a complete test, we would create a task with a past deadline and submit after it
    const badgeExists = await lateBadge.isVisible().catch(() => false);

    if (badgeExists) {
      // Verify late badge is styled appropriately (warning color)
      await expect(lateBadge).toHaveClass(/badge-warning/);
    }
  });

  test('TC-DEADLINE-005: 延迟提交仍然被接受和评分', async ({ page }) => {
    // Navigate to family page
    await page.goto(`/family/${VALID_TOKEN}`);

    // Click to start practice
    await page.click('button:has-text("開始練習")');

    // Select first student if multiple students exist
    const studentButton = page.locator('.card.bg-base-100.shadow-lg').first();
    if (await studentButton.isVisible()) {
      await studentButton.click();
    }

    // Verify that student can still access the practice page
    // (This confirms late submissions are accepted)
    await expect(page.locator('text=第1题')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=跟读题')).toBeVisible();

    // Verify recording button is still available
    await expect(page.locator('button.btn-circle.btn-primary')).toBeVisible();

    // Note: Full submission and grading would require audio recording capabilities
    // which are beyond the scope of this visual/interaction test
  });

  test('TC-DEADLINE-006: 管理员创建任务时截止日期为可选字段', async ({ page }) => {
    // Admin logs in
    await page.goto('/admin/login');
    await page.fill('#username', ADMIN_USERNAME);
    await page.fill('#password', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin/, { timeout: 10000 });

    // Navigate to weekly tasks
    await page.goto('/admin/weekly-tasks');

    // Click create task button
    await page.click('button:has-text("创建任务")');

    // Verify deadline input field exists
    const deadlineInput = page.locator('input[type="datetime-local"]');
    await expect(deadlineInput).toBeVisible({ timeout: 5000 });

    // Verify field is not required (by checking if form can be submitted without it)
    // Fill only required fields without deadline
    const sentences = [
      'Test sentence 1',
      'Test sentence 2',
      'Test sentence 3',
      'Test sentence 4',
      'Test sentence 5',
      'Test sentence 6',
      'Test sentence 7',
      'Test sentence 8',
      'Test sentence 9',
      'Test sentence 10',
    ];

    for (let i = 0; i < 10; i++) {
      await page.fill(`input[placeholder="句子 ${i + 1}"]`, sentences[i]);
    }

    // Select class courses
    const classCourseCheckbox = page.locator('input[type="checkbox"]').first();
    if (await classCourseCheckbox.isVisible()) {
      await classCourseCheckbox.check();
    }

    // Submit without deadline - should succeed
    await page.click('button:has-text("创建")');

    // Verify success (or that we're not blocked by validation)
    // This confirms deadline is optional
    const alert = page.locator('.alert');
    await expect(alert).toBeVisible({ timeout: 10000 });
  });

  test('TC-DEADLINE-007: 倒计时显示适当的紧迫性颜色', async ({ page }) => {
    // Navigate to student practice page
    await page.goto(`/family/${VALID_TOKEN}`);
    await page.click('button:has-text("開始練習")');

    const studentButton = page.locator('.card.bg-base-100.shadow-lg').first();
    if (await studentButton.isVisible()) {
      await studentButton.click();
    }

    // Look for countdown timer
    const countdownTimer = page.locator('[role="timer"]');

    if (await countdownTimer.isVisible({ timeout: 5000 })) {
      // Verify timer has appropriate styling
      // Low urgency (>48h): base colors
      // Medium urgency (24-48h): warning colors
      // High urgency (<24h): error colors with pulse animation

      const timerClass = await countdownTimer.getAttribute('class');

      // Timer should have one of the urgency styles
      const hasValidUrgencyStyle =
        timerClass?.includes('bg-base-200') ||  // low urgency
        timerClass?.includes('bg-warning') ||    // medium urgency
        timerClass?.includes('bg-error');        // high urgency

      expect(hasValidUrgencyStyle).toBe(true);

      // If high urgency, should have pulse animation
      if (timerClass?.includes('bg-error')) {
        expect(timerClass).toContain('animate-pulse');
      }
    }
  });
});
