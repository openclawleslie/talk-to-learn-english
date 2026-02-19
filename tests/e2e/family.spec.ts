import { test, expect } from '@playwright/test';

// 测试用的有效 token（需要在测试数据库中预先创建）
const VALID_TOKEN = 'test_valid_token_12345678';
const INVALID_TOKEN = 'invalid_token_xyz';

test.describe('家长/学生端测试', () => {
  test.describe('链接访问测试', () => {
    test('TC-PARENT-001: 有效链接可进入', async ({ page }) => {
      await page.goto(`/family/${VALID_TOKEN}`);

      // 默认进入家长看板，底部有"開始練習"按钮
      await expect(page.locator('button:has-text("開始練習")')).toBeVisible();
    });

    test('TC-PARENT-002: 无效链接显示错误', async ({ page }) => {
      await page.goto(`/family/${INVALID_TOKEN}`);

      // 应该显示错误信息
      await expect(page.locator('.alert-error')).toBeVisible();
    });
  });

  test.describe('家长端数据统计测试', () => {
    test.beforeEach(async ({ page }) => {
      // 默认进入即为家长看板，无需额外点击
      await page.goto(`/family/${VALID_TOKEN}`);
    });

    test('TC-PARENT-010: 查看本周数据', async ({ page }) => {
      // 应该显示数据统计标签页
      await expect(page.locator('text=数据统计')).toBeVisible();

      // 应该显示平均分和完成进度
      await expect(page.locator('text=平均分')).toBeVisible();
      await expect(page.locator('text=完成进度')).toBeVisible();
    });

    test('TC-PARENT-011: 查看历史表现', async ({ page }) => {
      // 应该显示历史表现数据
      await expect(page.locator('text=历史表现')).toBeVisible();
      await expect(page.locator('text=总平均分')).toBeVisible();
      await expect(page.locator('text=总提交数')).toBeVisible();
    });

    test('TC-PARENT-012: 查看低分句列表', async ({ page }) => {
      // 如果有低分句，应该显示"需要加强的句子"
      const lowScoreSection = page.locator('text=需要加强的句子');
      // 这个测试依赖于是否有低分数据
    });

    test('TC-PARENT-020: 查看学生作业', async ({ page }) => {
      // 切换到学生作业标签
      await page.click('button:has-text("学生作业")');

      // 应该显示学生列表
      await expect(page.locator('.card')).toBeVisible();
    });

    test('TC-PARENT-021: 查看分数和星级', async ({ page }) => {
      await page.click('button:has-text("学生作业")');

      // 展开句子详情
      const sentenceItem = page.locator('.rounded-lg.border').first();
      if (await sentenceItem.isVisible()) {
        await sentenceItem.click();

        // 家长端应该能看到分数
        // 注意：这取决于是否有已完成的提交
      }
    });
  });

  test.describe('学生端练习测试', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/family/${VALID_TOKEN}`);
      // 点击"開始練習"进入学生选择/练习
      await page.click('button:has-text("開始練習")');
      // 如果有多个学生，选择第一个
      const studentButton = page.locator('.card.bg-base-100.shadow-lg').first();
      if (await studentButton.isVisible()) {
        await studentButton.click();
      }
    });

    test('TC-STUDENT-001: 显示当前题目', async ({ page }) => {
      // 应该显示题目信息
      await expect(page.locator('text=第1题')).toBeVisible();
      await expect(page.locator('text=跟读题')).toBeVisible();
    });

    test('TC-STUDENT-002: 播放参考音频按钮存在', async ({ page }) => {
      // 应该有听原音按钮
      await expect(page.locator('button:has-text("听原音")')).toBeVisible();
    });

    test('TC-STUDENT-003: 进度条正确显示', async ({ page }) => {
      // 应该显示进度
      await expect(page.locator('text=进度')).toBeVisible();
    });

    test('TC-STUDENT-015: 不显示分数（只显示星级）', async ({ page }) => {
      // 学生端不应该显示"分"字样的分数
      // 但应该显示星级
      const scoreText = page.locator('text=/\\d+分/');
      await expect(scoreText).not.toBeVisible();
    });
  });

  test.describe('录音提交测试', () => {
    test('TC-STUDENT-010: 录音按钮存在', async ({ page }) => {
      await page.goto(`/family/${VALID_TOKEN}`);
      // 点击"開始練習"进入学生选择/练习
      await page.click('button:has-text("開始練習")');
      const studentButton = page.locator('.card.bg-base-100.shadow-lg').first();
      if (await studentButton.isVisible()) {
        await studentButton.click();
      }

      // 应该有录音按钮
      await expect(page.locator('button.btn-circle.btn-primary')).toBeVisible();
    });
  });
});

test.describe('权限隔离测试', () => {
  test('TC-PERM-004: 未登录无法访问管理员页面', async ({ page }) => {
    await page.goto('/admin/classes');

    // 应该重定向到登录页
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('TC-PERM-004: 未登录无法访问教师页面', async ({ page }) => {
    await page.goto('/teacher/dashboard');

    // 应该重定向到登录页
    await expect(page).toHaveURL(/\/teacher\/login/);
  });

  test('TC-PERM-005: 无效 token 无法访问家长/学生页面', async ({ page }) => {
    await page.goto('/family/invalid_token_123');

    // 应该显示错误
    await expect(page.locator('.alert-error')).toBeVisible();
  });
});
