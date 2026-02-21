import { test, expect } from '@playwright/test';

// 测试用的有效 token（需要在测试数据库中预先创建）
const VALID_TOKEN = 'test_valid_token_12345678';

test.describe('发音反馈测试', () => {
  test.describe('详细反馈显示测试', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/family/${VALID_TOKEN}`);
      // 进入学生练习模式
      await page.click('button:has-text("開始練習")');
      // 如果有多个学生，选择第一个
      const studentButton = page.locator('.card.bg-base-100.shadow-lg').first();
      if (await studentButton.isVisible()) {
        await studentButton.click();
      }
    });

    test('TC-FEEDBACK-001: 完成提交后显示详细反馈', async ({ page }) => {
      // 等待进入练习页面
      await expect(page.locator('text=跟讀練習')).toBeVisible();

      // 如果已有提交记录，应该能看到反馈组件
      // 检查是否存在"發音分析"标题（详细反馈的一部分）
      const feedbackSection = page.locator('text=發音分析');

      // 如果有已完成的提交，验证反馈可见
      const hasStars = await page.locator('.fill-warning').count() > 0;
      if (hasStars) {
        await expect(feedbackSection).toBeVisible();
      }
    });

    test('TC-FEEDBACK-002: 显示参考句子', async ({ page }) => {
      // 等待进入练习页面
      await expect(page.locator('text=跟讀練習')).toBeVisible();

      // 如果有详细反馈，应该显示"參考句子"
      const referenceSentenceHeader = page.locator('text=參考句子');
      const hasFeedback = await page.locator('text=發音分析').isVisible();

      if (hasFeedback) {
        await expect(referenceSentenceHeader).toBeVisible();
      }
    });

    test('TC-FEEDBACK-003: 逐词反馈使用颜色高亮', async ({ page }) => {
      // 等待进入练习页面
      await expect(page.locator('text=跟讀練習')).toBeVisible();

      // 查找发音分析部分
      const feedbackSection = page.locator('text=發音分析');
      const hasFeedback = await feedbackSection.isVisible();

      if (hasFeedback) {
        // 检查是否有带颜色的单词标记
        // 正确的单词应该有绿色背景
        const correctWords = page.locator('.bg-green-100.text-green-800');
        // 错误的单词应该有红色背景
        const incorrectWords = page.locator('.bg-red-100.text-red-800');

        // 至少应该有一种颜色的单词标记
        const hasColoredWords =
          (await correctWords.count() > 0) ||
          (await incorrectWords.count() > 0);

        expect(hasColoredWords).toBeTruthy();
      }
    });

    test('TC-FEEDBACK-004: 显示改进建议', async ({ page }) => {
      // 等待进入练习页面
      await expect(page.locator('text=跟讀練習')).toBeVisible();

      // 如果有详细反馈，可能会有改进建议
      const tipsHeader = page.locator('text=改進建議');
      const hasFeedback = await page.locator('text=發音分析').isVisible();

      if (hasFeedback) {
        // 改进建议是可选的，如果存在则验证
        const hasTips = await tipsHeader.isVisible();
        if (hasTips) {
          // 建议应该显示在蓝色背景框中
          await expect(page.locator('.bg-blue-50')).toBeVisible();
        }
      }
    });

    test('TC-FEEDBACK-005: 改进建议包含示例', async ({ page }) => {
      // 等待进入练习页面
      await expect(page.locator('text=跟讀練習')).toBeVisible();

      // 检查改进建议是否存在
      const tipsHeader = page.locator('text=改進建議');
      const hasTips = await tipsHeader.isVisible();

      if (hasTips) {
        // 检查是否有"例如:"标记的示例
        const exampleText = page.locator('text=例如:');
        // 示例应该以等宽字体显示
        const exampleCode = page.locator('.font-mono');

        // 如果有示例，验证格式正确
        const hasExample = await exampleText.isVisible();
        if (hasExample) {
          await expect(exampleCode).toBeVisible();
        }
      }
    });
  });

  test.describe('学生端反馈查看测试', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/family/${VALID_TOKEN}`);
      await page.click('button:has-text("開始練習")');
      const studentButton = page.locator('.card.bg-base-100.shadow-lg').first();
      if (await studentButton.isVisible()) {
        await studentButton.click();
      }
    });

    test('TC-FEEDBACK-010: 学生端显示星级评分', async ({ page }) => {
      // 等待进入练习页面
      await expect(page.locator('text=跟讀練習')).toBeVisible();

      // 如果有完成的提交，应该显示星级
      const stars = page.locator('.fill-warning');
      const hasSubmission = await stars.count() > 0;

      if (hasSubmission) {
        // 星级应该是1-3个
        const starCount = await stars.count();
        expect(starCount).toBeGreaterThanOrEqual(1);
        expect(starCount).toBeLessThanOrEqual(3);
      }
    });

    test('TC-FEEDBACK-011: 学生端完成后显示分数', async ({ page }) => {
      // 等待进入练习页面
      await expect(page.locator('text=跟讀練習')).toBeVisible();

      // 如果有刚完成的提交（不是之前的），应该显示分数
      const scoreText = page.locator('text=/\\d+ 分/');

      // 分数显示是针对刚完成的提交，不是所有已完成的
      // 这个测试会检查分数格式是否正确
      const hasScore = await scoreText.isVisible();
      if (hasScore) {
        // 验证分数格式正确
        expect(await scoreText.textContent()).toMatch(/\d+ 分/);
      }
    });

    test('TC-FEEDBACK-012: 完成题目后显示详细反馈', async ({ page }) => {
      // 等待进入练习页面
      await expect(page.locator('text=跟讀練習')).toBeVisible();

      // 检查是否有已完成的提交
      const hasStars = await page.locator('.fill-warning').count() > 0;

      if (hasStars) {
        // 应该显示发音分析
        await expect(page.locator('text=發音分析')).toBeVisible();

        // 应该有重新录制按钮
        await expect(page.locator('button:has-text("重新錄製")')).toBeVisible();

        // 如果不是最后一题，应该有下一题按钮
        const nextButton = page.locator('button:has-text("下一題")').first();
        // 下一题按钮可能存在也可能不存在（取决于是否是最后一题）
      }
    });
  });

  test.describe('反馈持久性测试', () => {
    test('TC-FEEDBACK-020: 切换题目后反馈消失', async ({ page }) => {
      await page.goto(`/family/${VALID_TOKEN}`);
      await page.click('button:has-text("開始練習")');
      const studentButton = page.locator('.card.bg-base-100.shadow-lg').first();
      if (await studentButton.isVisible()) {
        await studentButton.click();
      }

      // 等待进入练习页面
      await expect(page.locator('text=跟讀練習')).toBeVisible();

      // 如果当前题有反馈
      const hasFeedbackBefore = await page.locator('text=發音分析').isVisible();

      if (hasFeedbackBefore) {
        // 点击下一题
        const nextButton = page.locator('button:has-text("下一題")').last();
        if (await nextButton.isEnabled()) {
          await nextButton.click();

          // 等待页面更新
          await page.waitForTimeout(500);

          // 检查新题目是否显示
          // 如果新题目没有提交，反馈应该不可见
          const hasNewSubmission = await page.locator('.fill-warning').count() > 0;
          if (!hasNewSubmission) {
            await expect(page.locator('text=發音分析')).not.toBeVisible();
          }
        }
      }
    });

    test('TC-FEEDBACK-021: 返回已完成题目显示反馈', async ({ page }) => {
      await page.goto(`/family/${VALID_TOKEN}`);
      await page.click('button:has-text("開始練習")');
      const studentButton = page.locator('.card.bg-base-100.shadow-lg').first();
      if (await studentButton.isVisible()) {
        await studentButton.click();
      }

      // 等待进入练习页面
      await expect(page.locator('text=跟讀練習')).toBeVisible();

      // 记录第一题是否有反馈
      const hasFeedbackOnFirst = await page.locator('text=發音分析').isVisible();

      if (hasFeedbackOnFirst) {
        // 移动到下一题
        const nextButton = page.locator('button:has-text("下一題")').last();
        if (await nextButton.isEnabled()) {
          await nextButton.click();
          await page.waitForTimeout(500);

          // 返回上一题
          const prevButton = page.locator('button:has-text("上一題")').first();
          await prevButton.click();
          await page.waitForTimeout(500);

          // 反馈应该重新出现
          await expect(page.locator('text=發音分析')).toBeVisible();
        }
      }
    });

    test('TC-FEEDBACK-022: 重新录制后反馈消失', async ({ page }) => {
      await page.goto(`/family/${VALID_TOKEN}`);
      await page.click('button:has-text("開始練習")');
      const studentButton = page.locator('.card.bg-base-100.shadow-lg').first();
      if (await studentButton.isVisible()) {
        await studentButton.click();
      }

      // 等待进入练习页面
      await expect(page.locator('text=跟讀練習')).toBeVisible();

      // 如果有完成的提交
      const retryButton = page.locator('button:has-text("重新錄製")');
      const hasRetryButton = await retryButton.isVisible();

      if (hasRetryButton) {
        // 点击重新录制
        await retryButton.click();
        await page.waitForTimeout(500);

        // 反馈应该消失
        await expect(page.locator('text=發音分析')).not.toBeVisible();

        // 应该显示录音按钮
        await expect(page.locator('button.btn-circle.btn-primary')).toBeVisible();
      }
    });
  });

  test.describe('反馈组件布局测试', () => {
    test('TC-FEEDBACK-030: 反馈组件有边框和背景', async ({ page }) => {
      await page.goto(`/family/${VALID_TOKEN}`);
      await page.click('button:has-text("開始練習")');
      const studentButton = page.locator('.card.bg-base-100.shadow-lg').first();
      if (await studentButton.isVisible()) {
        await studentButton.click();
      }

      // 等待进入练习页面
      await expect(page.locator('text=跟讀練習')).toBeVisible();

      // 检查反馈是否存在
      const hasFeedback = await page.locator('text=發音分析').isVisible();

      if (hasFeedback) {
        // 反馈组件应该有圆角边框和白色背景
        const feedbackContainer = page.locator('.rounded-lg.border.border-zinc-200.bg-white');
        await expect(feedbackContainer).toBeVisible();
      }
    });

    test('TC-FEEDBACK-031: 单词标记显示为标签样式', async ({ page }) => {
      await page.goto(`/family/${VALID_TOKEN}`);
      await page.click('button:has-text("開始練習")');
      const studentButton = page.locator('.card.bg-base-100.shadow-lg').first();
      if (await studentButton.isVisible()) {
        await studentButton.click();
      }

      // 等待进入练习页面
      await expect(page.locator('text=跟讀練習')).toBeVisible();

      // 检查反馈是否存在
      const hasFeedback = await page.locator('text=發音分析').isVisible();

      if (hasFeedback) {
        // 单词应该显示为圆角标签，有边框和内边距
        const wordTags = page.locator('.rounded.border.px-2.py-1');
        const hasWordTags = await wordTags.count() > 0;
        expect(hasWordTags).toBeTruthy();
      }
    });
  });
});
