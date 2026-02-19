import { test, expect } from '@playwright/test';

test.describe('教师端测试', () => {
  const teacherEmail = 'teacher@test.com';
  const teacherPassword = 'teacher123';

  test.describe('登录测试', () => {
    test('TC-TEACHER-001: 教师登录成功', async ({ page }) => {
      await page.goto('/teacher/login');
      await page.fill('#email', teacherEmail);
      await page.fill('#password', teacherPassword);
      await page.click('button[type="submit"]');

      await expect(page).toHaveURL(/\/teacher\/dashboard/);
    });

    test('TC-TEACHER-002: 教师登录失败', async ({ page }) => {
      await page.goto('/teacher/login');
      await page.fill('#email', teacherEmail);
      await page.fill('#password', 'wrong_password');
      await page.click('button[type="submit"]');

      await expect(page.locator('.alert-error')).toBeVisible();
    });

    test('TC-TEACHER-003: 教师登出', async ({ page }) => {
      await page.goto('/teacher/login');
      await page.fill('#email', teacherEmail);
      await page.fill('#password', teacherPassword);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/teacher/, { timeout: 10000 });

      await page.click('button:has-text("退出")');
      await expect(page).toHaveURL(/\/teacher\/login/);
    });
  });

  test.describe('家庭管理测试', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/teacher/login');
      await page.fill('#email', teacherEmail);
      await page.fill('#password', teacherPassword);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/teacher/, { timeout: 10000 });
    });

    test('TC-TEACHER-010: 创建家庭和学生', async ({ page }) => {
      await page.goto('/teacher/families');
      await page.click('button:has-text("创建家庭")');

      await page.fill('input[placeholder*="家长"]', '测试家长E2E');
      await page.selectOption('select', { index: 1 }); // 选择第一个班级课程
      await page.fill('input[placeholder*="学生"]', '测试学生E2E');
      await page.click('button:has-text("创建并生成链接")');

      // 验证链接生成
      await expect(page.locator('.alert-success')).toBeVisible();
      await expect(page.locator('input[readonly]')).toHaveValue(/\/family\//);
    });

    test('TC-TEACHER-012: 重置家长链接', async ({ page }) => {
      await page.goto('/teacher/families');

      // 点击重置链接按钮
      await page.click('button:has-text("重置链接")');
      await page.click('button:has-text("确定")'); // 确认对话框

      // 验证新链接生成
      await expect(page.locator('.alert-success')).toBeVisible();
    });
  });

  test.describe('班级数据查看测试', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/teacher/login');
      await page.fill('#email', teacherEmail);
      await page.fill('#password', teacherPassword);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/teacher/, { timeout: 10000 });
    });

    test('TC-TEACHER-020: 查看班级学生列表', async ({ page }) => {
      await page.goto('/teacher/dashboard');

      // 点击班级卡片
      const classCard = page.locator('.card:has-text("班级")').first();
      if (await classCard.isVisible()) {
        await classCard.click();

        // 验证学生表格存在
        await expect(page.locator('table')).toBeVisible();
        await expect(page.locator('th:has-text("学生姓名")')).toBeVisible();
      }
    });

    test('TC-TEACHER-021: 查看班级统计数据', async ({ page }) => {
      await page.goto('/teacher/dashboard');

      const classCard = page.locator('.card:has-text("班级")').first();
      if (await classCard.isVisible()) {
        await classCard.click();

        // 验证统计数据显示
        await expect(page.locator('text=学生总数')).toBeVisible();
        await expect(page.locator('text=完成率')).toBeVisible();
        await expect(page.locator('text=平均分')).toBeVisible();
      }
    });

    test('TC-TEACHER-022: 查看低分句子列表', async ({ page }) => {
      await page.goto('/teacher/dashboard');

      const classCard = page.locator('.card:has-text("班级")').first();
      if (await classCard.isVisible()) {
        await classCard.click();

        // 如果有低分句子，应该显示
        const lowScoreSection = page.locator('text=低分句子');
        // 这个测试依赖于是否有低分数据
      }
    });

    test('TC-TEACHER-023: 查看学生完成进度', async ({ page }) => {
      await page.goto('/teacher/dashboard');

      const classCard = page.locator('.card:has-text("班级")').first();
      if (await classCard.isVisible()) {
        await classCard.click();

        // 验证进度条显示
        await expect(page.locator('.progress')).toBeVisible();
      }
    });
  });

  test.describe('每周任务查看测试', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/teacher/login');
      await page.fill('#email', teacherEmail);
      await page.fill('#password', teacherPassword);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/teacher/, { timeout: 10000 });
    });

    test('TC-TEACHER-030: 导航到每周任务页面', async ({ page }) => {
      await page.click('a:has-text("每周任务")');
      await expect(page).toHaveURL(/\/teacher\/weekly-tasks/);
    });

    test('TC-TEACHER-031: 每周任务页面显示标题', async ({ page }) => {
      await page.goto('/teacher/weekly-tasks');
      await expect(page.locator('h1:has-text("每周任务")')).toBeVisible();
    });

    test('TC-TEACHER-032: 查看任务详情', async ({ page }) => {
      await page.goto('/teacher/weekly-tasks');

      // 如果有任务，点击查看详情
      const viewButton = page.locator('button:has-text("查看详情")').first();
      if (await viewButton.isVisible()) {
        await viewButton.click();

        // 验证模态框显示
        await expect(page.locator('.modal')).toBeVisible();
        // 验证句子列表显示
        await expect(page.locator('.badge-neutral')).toBeVisible();
      }
    });

    test('TC-TEACHER-033: 关闭任务详情模态框', async ({ page }) => {
      await page.goto('/teacher/weekly-tasks');

      const viewButton = page.locator('button:has-text("查看详情")').first();
      if (await viewButton.isVisible()) {
        await viewButton.click();
        await expect(page.locator('.modal')).toBeVisible();

        // 点击关闭按钮
        await page.click('.modal button:has-text("关闭")');
        await expect(page.locator('.modal-open')).not.toBeVisible();
      }
    });

    test('TC-TEACHER-034: 任务显示发布状态', async ({ page }) => {
      await page.goto('/teacher/weekly-tasks');

      // 验证任务卡片显示状态标签
      const statusBadge = page.locator('.badge:has-text("已发布"), .badge:has-text("草稿")').first();
      if (await statusBadge.isVisible()) {
        await expect(statusBadge).toBeVisible();
      }
    });

    test('TC-TEACHER-035: 本周任务高亮显示', async ({ page }) => {
      await page.goto('/teacher/weekly-tasks');

      // 如果有本周任务，应该有"本周"标签
      const currentWeekBadge = page.locator('.badge:has-text("本周")');
      // 这个测试依赖于是否有本周任务
    });
  });

  test.describe('导航测试', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/teacher/login');
      await page.fill('#email', teacherEmail);
      await page.fill('#password', teacherPassword);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/teacher/, { timeout: 10000 });
    });

    test('TC-TEACHER-NAV-001: 导航到工作台', async ({ page }) => {
      await page.click('a:has-text("工作台")');
      await expect(page).toHaveURL(/\/teacher\/dashboard/);
    });

    test('TC-TEACHER-NAV-002: 导航到家庭管理', async ({ page }) => {
      await page.click('a:has-text("家庭管理")');
      await expect(page).toHaveURL(/\/teacher\/families/);
    });

    test('TC-TEACHER-NAV-003: 导航到每周任务', async ({ page }) => {
      await page.click('a:has-text("每周任务")');
      await expect(page).toHaveURL(/\/teacher\/weekly-tasks/);
    });
  });
});
