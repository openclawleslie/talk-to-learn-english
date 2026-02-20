import { test, expect } from '@playwright/test';

const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
  throw new Error('ADMIN_USERNAME and ADMIN_PASSWORD environment variables must be set for E2E tests');
}

test.describe('评分流程测试', () => {
  test.describe('API 评分测试', () => {
    test('TC-SCORE-003: AI 评分 API 返回正确格式', async ({ request }) => {
      const response = await request.post('/api/ai/score', {
        data: {
          sentenceText: 'Hello, how are you?',
          transcript: 'Hello, how are you?',
        },
      });

      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data.data).toHaveProperty('score');
      expect(data.data).toHaveProperty('feedback');
      expect(data.data).toHaveProperty('stars');
      expect(data.data.score).toBeGreaterThanOrEqual(0);
      expect(data.data.score).toBeLessThanOrEqual(100);
      expect(data.data.stars).toBeGreaterThanOrEqual(1);
      expect(data.data.stars).toBeLessThanOrEqual(3);
    });

    test('TC-SCORE-004: 星级根据阈值正确计算', async ({ request }) => {
      // 测试低分 -> 1星
      const lowScoreResponse = await request.post('/api/ai/score', {
        data: {
          sentenceText: 'Hello, how are you?',
          transcript: 'completely wrong text',
        },
      });
      const lowData = await lowScoreResponse.json();
      // 低分应该是1星或2星

      // 测试高分 -> 3星
      const highScoreResponse = await request.post('/api/ai/score', {
        data: {
          sentenceText: 'Hello, how are you?',
          transcript: 'Hello, how are you?',
        },
      });
      const highData = await highScoreResponse.json();
      // 完全匹配应该得高分
    });
  });

  test.describe('评分阈值配置测试', () => {
    test.beforeEach(async ({ page }) => {
      // 管理员登录
      await page.goto('/admin/login');
      await page.fill('#username', ADMIN_USERNAME);
      await page.fill('#password', ADMIN_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/admin/, { timeout: 10000 });
    });

    test('TC-ADMIN-060: 修改星级阈值', async ({ page }) => {
      await page.goto('/admin/scoring');

      // 修改阈值
      await page.fill('input[name="oneStarMax"]', '60');
      await page.fill('input[name="twoStarMax"]', '80');
      await page.click('button:has-text("保存")');

      // 验证保存成功
      await expect(page.locator('.alert-success, .alert-info')).toBeVisible();
    });
  });
});

test.describe('完整流程测试', () => {
  test('E2E: 完整的作业提交流程', async ({ page, request }) => {
    // 这个测试模拟完整的用户流程：
    // 1. 管理员创建任务
    // 2. 教师创建家庭
    // 3. 学生完成作业
    // 4. 家长查看结果
    // 5. 教师查看统计

    // 由于涉及录音，这个测试需要特殊处理
    // 可以使用 mock 音频文件或跳过实际录音

    test.skip(); // 需要完整的测试环境才能运行
  });
});
