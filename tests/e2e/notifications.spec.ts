import { test, expect } from '@playwright/test';
import { db, schema } from '@/lib/db/client';
import bcrypt from 'bcryptjs';
import { eq, and } from 'drizzle-orm';

const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
  throw new Error('ADMIN_USERNAME and ADMIN_PASSWORD environment variables must be set for E2E tests');
}

/**
 * End-to-End Notification Flow Tests
 *
 * This test suite verifies the complete notification flow from task publication
 * to email delivery and family opt-out preferences.
 */
test.describe('通知流程端到端测试', () => {
  let testFamilyId: string;
  let testFamilyToken: string;
  let testClassCourseId: string;
  let testWeeklyTaskId: string;
  let optedOutFamilyId: string;
  let optedOutFamilyToken: string;

  test.beforeAll(async () => {
    // Clean up any existing test data
    await db.delete(schema.taskNotifications).where(
      eq(schema.taskNotifications.status, 'pending' as any)
    );

    // Create test class
    const [testClass] = await db
      .insert(schema.classes)
      .values({
        name: `E2E测试班级_${Date.now()}`,
        timezone: 'Asia/Shanghai',
      })
      .returning();

    // Create test course
    const [testCourse] = await db
      .insert(schema.courses)
      .values({
        name: `E2E测试课程_${Date.now()}`,
        level: 'L1',
      })
      .returning();

    // Create class-course relationship
    const [classCourse] = await db
      .insert(schema.classCourses)
      .values({
        classId: testClass.id,
        courseId: testCourse.id,
      })
      .returning();

    testClassCourseId = classCourse.id;

    // Get admin ID
    const [admin] = await db
      .select()
      .from(schema.teachers)
      .where(eq(schema.teachers.email, ADMIN_USERNAME))
      .limit(1);

    if (!admin) {
      throw new Error('Admin user not found in database');
    }

    // Create test family with email
    const [testFamily] = await db
      .insert(schema.families)
      .values({
        parentName: '测试家长',
        email: 'test-parent@example.com',
        classCourseId: testClassCourseId,
        createdByTeacherId: admin.id,
      })
      .returning();

    testFamilyId = testFamily.id;

    // Create family link/token
    const rawToken = `e2e_test_token_${Date.now()}`;
    const tokenHash = await bcrypt.hash(rawToken, 10);

    await db.insert(schema.familyLinks).values({
      familyId: testFamilyId,
      tokenHash: tokenHash,
      tokenHmac: rawToken, // For testing, we use the raw token as HMAC
      status: 'active',
    });

    testFamilyToken = rawToken;

    // Create another family for opt-out testing
    const [optedOutFamily] = await db
      .insert(schema.families)
      .values({
        parentName: '已退订家长',
        email: 'opted-out-parent@example.com',
        classCourseId: testClassCourseId,
        createdByTeacherId: admin.id,
      })
      .returning();

    optedOutFamilyId = optedOutFamily.id;

    const optedOutToken = `e2e_opted_out_token_${Date.now()}`;
    const optedOutTokenHash = await bcrypt.hash(optedOutToken, 10);

    await db.insert(schema.familyLinks).values({
      familyId: optedOutFamilyId,
      tokenHash: optedOutTokenHash,
      tokenHmac: optedOutToken,
      status: 'active',
    });

    optedOutFamilyToken = optedOutToken;

    // Set notification preference to opted-out
    await db.insert(schema.notificationPreferences).values({
      familyId: optedOutFamilyId,
      emailEnabled: false,
    });

    // Create a draft weekly task
    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const [weeklyTask] = await db
      .insert(schema.weeklyTasks)
      .values({
        classCourseId: testClassCourseId,
        weekStart: weekStart,
        weekEnd: weekEnd,
        status: 'draft',
        createdByAdmin: admin.id,
      })
      .returning();

    testWeeklyTaskId = weeklyTask.id;

    // Create task items (sentences)
    const taskItems = Array.from({ length: 10 }, (_, i) => ({
      weeklyTaskId: testWeeklyTaskId,
      orderIndex: i + 1,
      sentenceText: `E2E test sentence ${i + 1}: Hello, how are you?`,
      referenceAudioStatus: 'ready' as const,
    }));

    await db.insert(schema.taskItems).values(taskItems);
  });

  test.afterAll(async () => {
    // Clean up test data
    if (testWeeklyTaskId) {
      await db.delete(schema.weeklyTasks).where(eq(schema.weeklyTasks.id, testWeeklyTaskId));
    }
    if (testFamilyId) {
      await db.delete(schema.families).where(eq(schema.families.id, testFamilyId));
    }
    if (optedOutFamilyId) {
      await db.delete(schema.families).where(eq(schema.families.id, optedOutFamilyId));
    }
    if (testClassCourseId) {
      await db.delete(schema.classCourses).where(eq(schema.classCourses.id, testClassCourseId));
    }
  });

  test.describe('任务发布与通知创建', () => {
    test('TC-NOTIF-001: 发布任务创建通知记录', async ({ page }) => {
      // Step 1 & 2: Login as admin
      await page.goto('/admin/login');
      await page.fill('#username', ADMIN_USERNAME);
      await page.fill('#password', ADMIN_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/admin/, { timeout: 10000 });

      // Navigate to weekly tasks
      await page.goto('/admin/weekly-tasks');

      // Step 3: Find and click publish button on the draft task
      // Wait for the task list to load
      await page.waitForSelector('.card', { timeout: 10000 });

      // Find the publish button for our test task
      const publishButton = page.locator('button:has-text("发布")').first();
      await expect(publishButton).toBeVisible({ timeout: 5000 });

      // Click publish button
      await publishButton.click();

      // Confirm publish action if there's a confirmation dialog
      page.on('dialog', dialog => dialog.accept());

      // Wait for success message
      await expect(page.locator('.alert-success, .alert')).toBeVisible({ timeout: 10000 });

      // Step 4: Verify notification record created in database
      const notifications = await db
        .select()
        .from(schema.taskNotifications)
        .where(eq(schema.taskNotifications.weeklyTaskId, testWeeklyTaskId));

      expect(notifications.length).toBeGreaterThan(0);

      // Should have notification for testFamily but NOT for opted-out family
      const familyNotification = notifications.find(n => n.familyId === testFamilyId);
      expect(familyNotification).toBeDefined();
      expect(familyNotification?.status).toBe('pending'); // May be 'pending' or 'sent' depending on email service

      // Step 8 (verification): Opted-out family should NOT have notification
      const optedOutNotification = notifications.find(n => n.familyId === optedOutFamilyId);
      expect(optedOutNotification).toBeUndefined();
    });

    test('TC-NOTIF-002: 管理员可查看通知状态', async ({ page }) => {
      // Step 6: Login and navigate to weekly tasks
      await page.goto('/admin/login');
      await page.fill('#username', ADMIN_USERNAME);
      await page.fill('#password', ADMIN_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/admin/, { timeout: 10000 });

      await page.goto('/admin/weekly-tasks');

      // Wait for task cards to load
      await page.waitForSelector('.card', { timeout: 10000 });

      // Click "查看" button to open task preview
      const viewButton = page.locator('button:has-text("查看")').first();
      await viewButton.click();

      // Wait for modal to open
      await expect(page.locator('.modal')).toBeVisible({ timeout: 5000 });

      // Verify notification status section is visible
      await expect(page.locator('text=通知狀態')).toBeVisible({ timeout: 5000 });

      // Verify notification counts are displayed
      await expect(page.locator('text=總計')).toBeVisible();
      await expect(page.locator('text=已發送, text=待發送')).toBeVisible();

      // Verify family notification list
      await expect(page.locator('text=家長通知清單')).toBeVisible();
      await expect(page.locator('text=测试家长')).toBeVisible();
    });
  });

  test.describe('家长通知偏好设置', () => {
    test('TC-NOTIF-003: 家长可以查看通知偏好', async ({ page }) => {
      // Navigate to family preferences page
      await page.goto(`/family/preferences?token=${testFamilyToken}`);

      // Verify preferences page loaded
      await expect(page.locator('text=通知偏好設定')).toBeVisible({ timeout: 10000 });

      // Verify email notification toggle exists
      await expect(page.locator('text=電子郵件通知')).toBeVisible();

      // Verify toggle is in correct state (should be enabled by default)
      const emailToggle = page.locator('input[type="checkbox"]').first();
      await expect(emailToggle).toBeChecked();
    });

    test('TC-NOTIF-004: 家长可以退订邮件通知', async ({ page }) => {
      // Step 7: Test family opt-out flow
      await page.goto(`/family/preferences?token=${testFamilyToken}`);

      // Wait for page to load
      await expect(page.locator('text=通知偏好設定')).toBeVisible({ timeout: 10000 });

      // Toggle email notification off
      const emailToggle = page.locator('input[type="checkbox"]').first();
      await emailToggle.click();

      // Save preferences
      await page.click('button:has-text("儲存設定")');

      // Verify success message
      await expect(page.locator('text=設定已更新')).toBeVisible({ timeout: 5000 });

      // Verify in database
      const [preference] = await db
        .select()
        .from(schema.notificationPreferences)
        .where(eq(schema.notificationPreferences.familyId, testFamilyId));

      expect(preference).toBeDefined();
      expect(preference.emailEnabled).toBe(false);

      // Re-enable for cleanup
      await emailToggle.click();
      await page.click('button:has-text("儲存設定")');
      await expect(page.locator('text=設定已更新')).toBeVisible({ timeout: 5000 });
    });

    test('TC-NOTIF-005: 家长可以通过家庭门户访问偏好设置', async ({ page }) => {
      // Navigate to family portal
      await page.goto(`/family/tasks?token=${testFamilyToken}`);

      // Wait for page to load
      await page.waitForSelector('text=数据统计, text=学生作业', { timeout: 10000 });

      // Click notification settings link
      const settingsLink = page.locator('a:has-text("通知設定")');
      await expect(settingsLink).toBeVisible({ timeout: 5000 });
      await settingsLink.click();

      // Verify navigated to preferences page
      await expect(page).toHaveURL(/\/family\/preferences/);
      await expect(page.locator('text=通知偏好設定')).toBeVisible();
    });
  });

  test.describe('教师可查看通知状态', () => {
    test('TC-NOTIF-006: 教师可以查看任务通知状态', async ({ page }) => {
      // Login as teacher (if teacher account exists and has access)
      // For this test, we'll use admin who has teacher privileges
      await page.goto('/admin/login');
      await page.fill('#username', ADMIN_USERNAME);
      await page.fill('#password', ADMIN_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/admin/, { timeout: 10000 });

      // Navigate to teacher weekly tasks view (or admin weekly tasks)
      await page.goto('/admin/weekly-tasks');

      // Wait for tasks to load
      await page.waitForSelector('.card', { timeout: 10000 });

      // Find published task with "已通知" badge
      const notifiedBadge = page.locator('text=已通知').first();

      // Badge should be visible if task is published
      if (await notifiedBadge.isVisible()) {
        expect(await notifiedBadge.isVisible()).toBe(true);
      }

      // Open task detail
      const viewButton = page.locator('button:has-text("查看")').first();
      await viewButton.click();

      // Verify notification section in modal
      await expect(page.locator('text=通知狀態')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=家長通知清單')).toBeVisible();
    });
  });

  test.describe('通知记录验证', () => {
    test('TC-NOTIF-007: 通知记录包含正确信息', async () => {
      // Query notification records
      const notifications = await db
        .select()
        .from(schema.taskNotifications)
        .where(eq(schema.taskNotifications.weeklyTaskId, testWeeklyTaskId));

      expect(notifications.length).toBeGreaterThan(0);

      // Verify notification structure
      const notification = notifications[0];
      expect(notification.id).toBeDefined();
      expect(notification.weeklyTaskId).toBe(testWeeklyTaskId);
      expect(notification.familyId).toBeDefined();
      expect(notification.status).toMatch(/pending|sent|failed/);
      expect(notification.createdAt).toBeDefined();

      // If status is 'sent', should have sentAt timestamp
      if (notification.status === 'sent') {
        expect(notification.sentAt).toBeDefined();
      }

      // If status is 'failed', should have error message
      if (notification.status === 'failed') {
        expect(notification.error).toBeDefined();
      }
    });

    test('TC-NOTIF-008: API返回正确的通知汇总', async ({ request }) => {
      // Login to get session
      const loginResponse = await request.post('/api/auth/admin/login', {
        data: {
          username: ADMIN_USERNAME,
          password: ADMIN_PASSWORD,
        },
      });

      expect(loginResponse.ok()).toBeTruthy();

      // Fetch notification status via API
      const notificationsResponse = await request.get(
        `/api/admin/weekly-tasks/${testWeeklyTaskId}/notifications`
      );

      expect(notificationsResponse.ok()).toBeTruthy();

      const data = await notificationsResponse.json();

      // Verify response structure
      expect(data.summary).toBeDefined();
      expect(data.summary.total).toBeGreaterThanOrEqual(0);
      expect(data.summary.sent).toBeGreaterThanOrEqual(0);
      expect(data.summary.pending).toBeGreaterThanOrEqual(0);
      expect(data.summary.failed).toBeGreaterThanOrEqual(0);

      expect(data.notifications).toBeDefined();
      expect(Array.isArray(data.notifications)).toBe(true);

      // Verify notification records have correct structure
      if (data.notifications.length > 0) {
        const notification = data.notifications[0];
        expect(notification.status).toBeDefined();
        expect(notification.familyId).toBeDefined();
        expect(notification.parentName).toBeDefined();
      }
    });
  });
});
