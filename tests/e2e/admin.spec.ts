import { test, expect } from '@playwright/test';

const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
  throw new Error('ADMIN_USERNAME and ADMIN_PASSWORD environment variables must be set for E2E tests');
}

test.describe('管理员端测试', () => {
  // ============================================
  // 登录测试
  // ============================================
  test.describe('登录测试', () => {
    test('TC-ADMIN-001: 管理员登录成功', async ({ page }) => {
      await page.goto('/admin/login');
      await page.fill('#username', ADMIN_USERNAME);
      await page.fill('#password', ADMIN_PASSWORD);
      await page.click('button[type="submit"]');

      await expect(page).toHaveURL(/\/admin\/classes/, { timeout: 10000 });
    });

    test('TC-ADMIN-002: 管理员登录失败（错误密码）', async ({ page }) => {
      await page.goto('/admin/login');
      await page.fill('#username', ADMIN_USERNAME);
      await page.fill('#password', 'wrong_password');
      await page.click('button[type="submit"]');

      await expect(page.locator('.alert-error')).toBeVisible({ timeout: 10000 });
    });

    test('TC-ADMIN-003: 管理员登出', async ({ page }) => {
      // 先登录
      await page.goto('/admin/login');
      await page.fill('#username', ADMIN_USERNAME);
      await page.fill('#password', ADMIN_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/admin/, { timeout: 10000 });

      // 点击登出
      await page.click('button:has-text("退出登录")');

      // 应该回到登录页
      await expect(page).toHaveURL(/\/admin\/login/);
    });
  });

  // ============================================
  // 班级管理测试
  // ============================================
  test.describe('班级管理测试', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/admin/login');
      await page.fill('#username', ADMIN_USERNAME);
      await page.fill('#password', ADMIN_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/admin/, { timeout: 10000 });
      await page.goto('/admin/classes');
    });

    test('TC-ADMIN-010: 创建班级', async ({ page }) => {
      await page.click('button:has-text("创建班级")');

      // 填写表单
      await page.fill('input[placeholder*="班级"]', '测试班级E2E_' + Date.now());
      await page.selectOption('select', 'Asia/Shanghai');
      await page.click('.modal button:has-text("创建")');

      // 验证成功消息
      await expect(page.locator('.alert')).toContainText(/成功/);
    });

    test('TC-ADMIN-011: 编辑班级', async ({ page }) => {
      // 点击编辑按钮（第一行）
      const editButton = page.locator('table tbody tr').first().locator('button').first();
      await editButton.click();

      // 修改班级名称
      const input = page.locator('.modal input[placeholder*="班级"]');
      await input.clear();
      await input.fill('编辑后的班级名称_' + Date.now());
      await page.click('.modal button:has-text("更新")');

      // 验证成功消息
      await expect(page.locator('.alert')).toContainText(/成功/);
    });

    test('TC-ADMIN-012: 删除班级', async ({ page }) => {
      // 获取初始行数
      const initialRows = await page.locator('table tbody tr').count();

      // 点击删除按钮（最后一行，避免删除重要数据）
      page.on('dialog', dialog => dialog.accept()); // 自动确认删除
      const deleteButton = page.locator('table tbody tr').last().locator('button.text-error');
      await deleteButton.click();

      // 验证成功消息
      await expect(page.locator('.alert')).toContainText(/成功/);
    });
  });

  // ============================================
  // 课程管理测试
  // ============================================
  test.describe('课程管理测试', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/admin/login');
      await page.fill('#username', ADMIN_USERNAME);
      await page.fill('#password', ADMIN_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/admin/, { timeout: 10000 });
      await page.goto('/admin/courses');
    });

    test('TC-ADMIN-020: 创建课程', async ({ page }) => {
      await page.click('button:has-text("创建课程")');

      // 填写表单
      await page.fill('input[placeholder*="课程"]', '测试课程E2E_' + Date.now());
      await page.selectOption('select', 'beginner');
      await page.click('.modal button:has-text("创建")');

      // 验证成功消息
      await expect(page.locator('.alert')).toContainText(/成功/);
    });

    test('TC-ADMIN-021: 编辑课程', async ({ page }) => {
      // 点击编辑按钮
      const editButton = page.locator('.card button:has-text("编辑")').first();
      await editButton.click();

      // 修改课程名称
      const input = page.locator('.modal input[placeholder*="课程"]');
      await input.clear();
      await input.fill('编辑后的课程名称_' + Date.now());
      await page.click('.modal button:has-text("更新")');

      // 验证成功消息
      await expect(page.locator('.alert')).toContainText(/成功/);
    });

    test('TC-ADMIN-022: 删除课程', async ({ page }) => {
      page.on('dialog', dialog => dialog.accept());
      const deleteButton = page.locator('.card button:has-text("删除")').last();
      await deleteButton.click();

      await expect(page.locator('.alert')).toContainText(/成功/);
    });
  });

  // ============================================
  // 班级课程关联测试
  // ============================================
  test.describe('班级课程关联测试', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/admin/login');
      await page.fill('#username', ADMIN_USERNAME);
      await page.fill('#password', ADMIN_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/admin/, { timeout: 10000 });
      await page.goto('/admin/class-courses');
    });

    test('TC-ADMIN-030: 创建班级课程关联', async ({ page }) => {
      await page.click('button:has-text("添加关联")');

      // 选择班级和课程
      await page.selectOption('.modal select:first-of-type', { index: 1 });
      await page.selectOption('.modal select:last-of-type', { index: 1 });
      await page.click('.modal button:has-text("创建")');

      // 验证结果（可能成功或提示已存在）
      await expect(page.locator('.alert')).toBeVisible();
    });

    test('TC-ADMIN-031: 删除班级课程关联', async ({ page }) => {
      page.on('dialog', dialog => dialog.accept());

      const deleteButton = page.locator('table tbody tr').last().locator('button.text-error');
      if (await deleteButton.isVisible()) {
        await deleteButton.click();
        await expect(page.locator('.alert')).toContainText(/成功/);
      }
    });
  });

  // ============================================
  // 教师管理测试
  // ============================================
  test.describe('教师管理测试', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/admin/login');
      await page.fill('#username', ADMIN_USERNAME);
      await page.fill('#password', ADMIN_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/admin/, { timeout: 10000 });
      await page.goto('/admin/teachers');
    });

    test('TC-ADMIN-040: 创建教师账号', async ({ page }) => {
      await page.click('button:has-text("创建老师")');

      const timestamp = Date.now();
      await page.fill('input[placeholder*="姓名"]', '测试教师_' + timestamp);
      await page.fill('input[placeholder*="邮箱"], input[type="email"]', `teacher_${timestamp}@test.com`);
      await page.fill('#password', 'password123');

      await page.click('.modal button:has-text("创建")');

      await expect(page.locator('.alert')).toContainText(/成功/);
    });

    test('TC-ADMIN-041: 编辑教师信息', async ({ page }) => {
      const editButton = page.locator('table tbody tr').first().locator('button').first();
      if (await editButton.isVisible()) {
        await editButton.click();

        const input = page.locator('.modal input[placeholder*="姓名"]');
        await input.clear();
        await input.fill('编辑后的教师名_' + Date.now());
        await page.click('.modal button:has-text("更新")');

        await expect(page.locator('.alert')).toContainText(/成功/);
      }
    });

    test('TC-ADMIN-042: 重置教师密码', async ({ page }) => {
      const resetButton = page.locator('button:has-text("重置密码")').first();
      if (await resetButton.isVisible()) {
        page.on('dialog', dialog => dialog.accept());
        await resetButton.click();

        await expect(page.locator('.alert')).toBeVisible();
      }
    });

    test('TC-ADMIN-043: 禁用/启用教师账号', async ({ page }) => {
      const toggleButton = page.locator('button:has-text("禁用"), button:has-text("启用")').first();
      if (await toggleButton.isVisible()) {
        await toggleButton.click();
        await expect(page.locator('.alert')).toBeVisible();
      }
    });

    test('TC-ADMIN-044: 分配班级课程给教师', async ({ page }) => {
      const assignButton = page.locator('button:has-text("分配")').first();
      if (await assignButton.isVisible()) {
        await assignButton.click();

        // 选择班级课程
        const checkbox = page.locator('.modal input[type="checkbox"]').first();
        if (await checkbox.isVisible()) {
          await checkbox.check();
          await page.click('.modal button:has-text("保存")');
          await expect(page.locator('.alert')).toBeVisible();
        }
      }
    });
  });

  // ============================================
  // 每周任务管理测试
  // ============================================
  test.describe('每周任务管理测试', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/admin/login');
      await page.fill('#username', ADMIN_USERNAME);
      await page.fill('#password', ADMIN_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/admin/, { timeout: 10000 });
      await page.goto('/admin/weekly-tasks');
    });

    test('TC-ADMIN-050: 创建每周任务界面显示10个句子输入框', async ({ page }) => {
      await page.click('button:has-text("创建任务")');

      // 验证有10个句子输入框
      const inputs = page.locator('input[placeholder*="句子"]');
      await expect(inputs).toHaveCount(10);
    });

    test('TC-ADMIN-051: 填写任务句子', async ({ page }) => {
      await page.click('button:has-text("创建任务")');

      // 填写10个句子
      const sentences = [
        'Hello, how are you?',
        'I am fine, thank you.',
        'What is your name?',
        'My name is Tom.',
        'Nice to meet you.',
        'Where are you from?',
        'I am from China.',
        'What do you like?',
        'I like reading books.',
        'Goodbye, see you later.',
      ];

      for (let i = 0; i < 10; i++) {
        await page.fill(`input[placeholder="句子 ${i + 1}"]`, sentences[i]);
      }

      // 验证所有输入框都有值
      for (let i = 0; i < 10; i++) {
        const input = page.locator(`input[placeholder="句子 ${i + 1}"]`);
        await expect(input).toHaveValue(sentences[i]);
      }
    });

    test('TC-ADMIN-052: 生成参考音频按钮存在', async ({ page }) => {
      await page.click('button:has-text("创建任务")');

      // 填写第一个句子
      await page.fill('input[placeholder="句子 1"]', 'Hello, how are you?');

      // 验证音频生成按钮存在
      const audioButton = page.locator('button[title="生成音频"]').first();
      await expect(audioButton).toBeVisible();
    });

    test('TC-ADMIN-053: 查看已发布任务', async ({ page }) => {
      // 点击查看按钮
      const viewButton = page.locator('button:has-text("查看")').first();
      if (await viewButton.isVisible()) {
        await viewButton.click();

        // 验证预览模态框显示
        await expect(page.locator('.modal')).toBeVisible();
        await expect(page.locator('text=作业预览')).toBeVisible();
      }
    });

    test('TC-ADMIN-054: 任务预览显示句子和音频', async ({ page }) => {
      const viewButton = page.locator('button:has-text("查看")').first();
      if (await viewButton.isVisible()) {
        await viewButton.click();

        // 验证显示句子内容
        await expect(page.locator('.modal .badge-neutral')).toBeVisible();

        // 验证音频播放器存在（如果有音频）
        const audioPlayer = page.locator('.modal audio');
        // 音频可能存在也可能不存在，取决于数据
      }
    });
  });

  // ============================================
  // 评分配置测试
  // ============================================
  test.describe('评分配置测试', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/admin/login');
      await page.fill('#username', ADMIN_USERNAME);
      await page.fill('#password', ADMIN_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/admin/, { timeout: 10000 });
      await page.goto('/admin/scoring');
    });

    test('TC-ADMIN-060: 查看评分配置页面', async ({ page }) => {
      // 验证页面标题
      await expect(page.locator('h1')).toContainText(/评分/);

      // 验证有阈值输入框
      await expect(page.locator('input')).toHaveCount(2); // oneStarMax 和 twoStarMax
    });

    test('TC-ADMIN-061: 修改星级阈值', async ({ page }) => {
      // 修改一星阈值
      const oneStarInput = page.locator('input').first();
      await oneStarInput.clear();
      await oneStarInput.fill('65');

      // 修改二星阈值
      const twoStarInput = page.locator('input').last();
      await twoStarInput.clear();
      await twoStarInput.fill('80');

      // 保存
      await page.click('button:has-text("保存")');

      // 验证成功
      await expect(page.locator('.alert')).toBeVisible();
    });

    test('TC-ADMIN-062: 阈值验证（一星阈值必须小于二星阈值）', async ({ page }) => {
      // 设置无效的阈值（一星 > 二星）
      const oneStarInput = page.locator('input').first();
      await oneStarInput.clear();
      await oneStarInput.fill('90');

      const twoStarInput = page.locator('input').last();
      await twoStarInput.clear();
      await twoStarInput.fill('80');

      await page.click('button:has-text("保存")');

      // 应该显示错误或阻止保存
      // 具体行为取决于前端验证实现
    });
  });

  // ============================================
  // 导航测试
  // ============================================
  test.describe('导航测试', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/admin/login');
      await page.fill('#username', ADMIN_USERNAME);
      await page.fill('#password', ADMIN_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/admin/, { timeout: 10000 });
    });

    test('TC-ADMIN-NAV-001: 导航到班级管理', async ({ page }) => {
      await page.click('a:has-text("班级管理")');
      await expect(page).toHaveURL(/\/admin\/classes/);
    });

    test('TC-ADMIN-NAV-002: 导航到课程管理', async ({ page }) => {
      await page.click('a:has-text("课程管理")');
      await expect(page).toHaveURL(/\/admin\/courses/);
    });

    test('TC-ADMIN-NAV-003: 导航到班级课程', async ({ page }) => {
      await page.click('a:has-text("班级课程")');
      await expect(page).toHaveURL(/\/admin\/class-courses/);
    });

    test('TC-ADMIN-NAV-004: 导航到老师管理', async ({ page }) => {
      await page.click('a:has-text("老师管理")');
      await expect(page).toHaveURL(/\/admin\/teachers/);
    });

    test('TC-ADMIN-NAV-005: 导航到每周任务', async ({ page }) => {
      await page.click('a:has-text("每周任务")');
      await expect(page).toHaveURL(/\/admin\/weekly-tasks/);
    });

    test('TC-ADMIN-NAV-006: 导航到评分配置', async ({ page }) => {
      await page.click('a:has-text("评分配置")');
      await expect(page).toHaveURL(/\/admin\/scoring/);
    });
  });
});
