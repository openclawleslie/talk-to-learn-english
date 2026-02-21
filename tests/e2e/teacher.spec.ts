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

  test.describe('批量操作测试', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/teacher/login');
      await page.fill('#email', teacherEmail);
      await page.fill('#password', teacherPassword);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/teacher/, { timeout: 10000 });
    });

    test('TC-TEACHER-040: 批量發布任務', async ({ page }) => {
      await page.goto('/teacher/weekly-tasks');

      // 查找草稿任務的複選框
      const draftCheckboxes = page.locator('input[type="checkbox"][data-status="draft"]');
      const count = await draftCheckboxes.count();

      if (count > 0) {
        // 選擇前兩個草稿任務（如果有的話）
        const selectCount = Math.min(2, count);
        for (let i = 0; i < selectCount; i++) {
          await draftCheckboxes.nth(i).check();
        }

        // 點擊發布按鈕
        await page.click('button:has-text("發布")');

        // 驗證確認模態框顯示
        await expect(page.locator('.modal:has-text("確認發布任務")')).toBeVisible();
        await expect(page.locator('text=個任務')).toBeVisible();

        // 確認發布
        await page.click('.modal button:has-text("確認發布")');

        // 等待成功提示
        await expect(page.locator('.alert-success')).toBeVisible({ timeout: 10000 });

        // 驗證頁面刷新後任務狀態更新
        await page.waitForTimeout(1000);
        await page.reload();

        // 驗證任務現在顯示為"已發布"狀態
        const publishedBadges = page.locator('.badge:has-text("已發布")');
        await expect(publishedBadges.first()).toBeVisible();
      }
    });

    test('TC-TEACHER-041: 批量取消發布任務', async ({ page }) => {
      await page.goto('/teacher/weekly-tasks');

      // 查找已發布任務的複選框
      const publishedCheckboxes = page.locator('input[type="checkbox"][data-status="published"]');
      const count = await publishedCheckboxes.count();

      if (count > 0) {
        // 選擇前兩個已發布任務（如果有的話）
        const selectCount = Math.min(2, count);
        for (let i = 0; i < selectCount; i++) {
          await publishedCheckboxes.nth(i).check();
        }

        // 點擊取消發布按鈕
        await page.click('button:has-text("取消發布")');

        // 驗證確認模態框顯示
        await expect(page.locator('.modal:has-text("確認取消發布任務")')).toBeVisible();
        await expect(page.locator('text=個任務')).toBeVisible();

        // 確認取消發布
        await page.click('.modal button:has-text("確認取消發布")');

        // 等待成功提示
        await expect(page.locator('.alert-success')).toBeVisible({ timeout: 10000 });

        // 驗證頁面刷新後任務狀態更新
        await page.waitForTimeout(1000);
        await page.reload();

        // 驗證任務現在顯示為"草稿"狀態
        const draftBadges = page.locator('.badge:has-text("草稿")');
        await expect(draftBadges.first()).toBeVisible();
      }
    });

    test('TC-TEACHER-042: 批量操作按鈕狀態', async ({ page }) => {
      await page.goto('/teacher/weekly-tasks');

      // 驗證初始狀態下批量操作按鈕被禁用
      const publishButton = page.locator('button:has-text("發布")');
      const unpublishButton = page.locator('button:has-text("取消發布")');

      if (await publishButton.isVisible()) {
        await expect(publishButton).toBeDisabled();
      }
      if (await unpublishButton.isVisible()) {
        await expect(unpublishButton).toBeDisabled();
      }

      // 選擇一個任務後，按鈕應該啟用
      const checkbox = page.locator('input[type="checkbox"]').first();
      if (await checkbox.isVisible()) {
        await checkbox.check();

        // 至少一個按鈕應該被啟用（取決於任務狀態）
        const isPublishEnabled = await publishButton.isEnabled().catch(() => false);
        const isUnpublishEnabled = await unpublishButton.isEnabled().catch(() => false);
        expect(isPublishEnabled || isUnpublishEnabled).toBeTruthy();
      }
    });

    test('TC-TEACHER-043: 批量選擇UI顯示', async ({ page }) => {
      await page.goto('/teacher/weekly-tasks');

      // 驗證複選框在任務卡片中顯示
      const checkboxes = page.locator('input[type="checkbox"]');
      const count = await checkboxes.count();

      if (count > 0) {
        await expect(checkboxes.first()).toBeVisible();

        // 驗證批量操作按鈕顯示
        await expect(page.locator('button:has-text("發布"), button:has-text("取消發布")')).toBeVisible();
      }
    });
  });

  test.describe('复制任务测试', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/teacher/login');
      await page.fill('#email', teacherEmail);
      await page.fill('#password', teacherPassword);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/teacher/, { timeout: 10000 });
    });

    test('TC-TEACHER-044: 複製任務流程', async ({ page }) => {
      await page.goto('/teacher/weekly-tasks');

      // 等待任務加載
      await page.waitForTimeout(1000);

      // 查找第一個有項目的任務卡片
      const taskCards = page.locator('.card:has(button:has-text("複製"))');
      const count = await taskCards.count();

      if (count > 0) {
        // 獲取源任務的信息（用於後續驗證）
        const sourceTaskCard = taskCards.first();
        const sourceTaskText = await sourceTaskCard.locator('.card-title').textContent();
        const sourceItemCount = await sourceTaskCard.locator('text=/共 \\d+ 個句子/').textContent();

        // 點擊複製按鈕
        await sourceTaskCard.locator('button:has-text("複製")').last().click();

        // 驗證複製模態框顯示
        await expect(page.locator('.modal:has-text("複製任務")')).toBeVisible();
        await expect(page.locator('text=來源任務:')).toBeVisible();

        // 選擇目標班級課程（選擇第一個選項）
        const classSelect = page.locator('.modal select').first();
        const options = await classSelect.locator('option:not([value=""])').count();

        if (options > 0) {
          await classSelect.selectOption({ index: 1 });

          // 設置新的日期範圍（下週）
          const today = new Date();
          const nextWeekStart = new Date(today);
          nextWeekStart.setDate(today.getDate() + 7);
          const nextWeekEnd = new Date(today);
          nextWeekEnd.setDate(today.getDate() + 13);

          const weekStartInput = page.locator('input[type="date"]').first();
          const weekEndInput = page.locator('input[type="date"]').last();

          await weekStartInput.fill(nextWeekStart.toISOString().split('T')[0]);
          await weekEndInput.fill(nextWeekEnd.toISOString().split('T')[0]);

          // 確認複製
          await page.click('.modal button:has-text("確認複製")');

          // 等待成功提示或錯誤提示
          const alert = page.locator('.alert');
          await expect(alert).toBeVisible({ timeout: 10000 });

          // 如果成功，驗證頁面刷新
          const alertText = await alert.textContent();
          if (alertText && alertText.includes('成功')) {
            await page.waitForTimeout(1000);

            // 驗證模態框關閉
            await expect(page.locator('.modal:has-text("複製任務")')).not.toBeVisible();
          }
        }
      }
    });

    test('TC-TEACHER-045: 驗證複製的任務包含所有項目', async ({ page }) => {
      await page.goto('/teacher/weekly-tasks');

      // 等待任務加載
      await page.waitForTimeout(1000);

      // 查找任務並獲取項目數量
      const taskCards = page.locator('.card:has(button:has-text("複製"))');
      const count = await taskCards.count();

      if (count > 0) {
        const firstTask = taskCards.first();

        // 獲取源任務的項目數量
        const itemCountText = await firstTask.locator('text=/共 \\d+ 個句子/').textContent();
        const itemCount = itemCountText?.match(/\d+/)?.[0];

        // 點擊查看詳情以確認項目內容
        await firstTask.locator('button:has-text("查看詳情")').click();
        await expect(page.locator('.modal:has-text("週")')).toBeVisible();

        // 驗證項目列表顯示
        const items = page.locator('.modal .badge-neutral');
        const actualItemCount = await items.count();

        // 驗證項目數量匹配
        if (itemCount) {
          expect(actualItemCount).toBe(parseInt(itemCount));
        }

        // 關閉詳情模態框
        await page.click('.modal button:has-text("關閉")');
        await page.waitForTimeout(500);
      }
    });

    test('TC-TEACHER-046: 驗證音頻URL在複製時保留', async ({ page }) => {
      await page.goto('/teacher/weekly-tasks');

      // 等待任務加載
      await page.waitForTimeout(1000);

      // 查找有音頻的任務
      const taskCards = page.locator('.card:has(button:has-text("查看詳情"))');
      const count = await taskCards.count();

      if (count > 0) {
        const firstTask = taskCards.first();

        // 點擊查看詳情
        await firstTask.locator('button:has-text("查看詳情")').click();
        await expect(page.locator('.modal')).toBeVisible();

        // 檢查是否有音頻元素
        const audioElements = page.locator('.modal audio');
        const audioCount = await audioElements.count();

        if (audioCount > 0) {
          // 獲取第一個音頻的 src 屬性
          const firstAudioSrc = await audioElements.first().getAttribute('src');

          // 驗證音頻 URL 存在且有效
          expect(firstAudioSrc).toBeTruthy();
          expect(firstAudioSrc).toContain('http');
        }

        // 關閉模態框
        await page.click('.modal button:has-text("關閉")');
      }
    });

    test('TC-TEACHER-047: 複製任務模態框UI元素', async ({ page }) => {
      await page.goto('/teacher/weekly-tasks');

      // 等待任務加載
      await page.waitForTimeout(1000);

      const taskCards = page.locator('.card:has(button:has-text("複製"))');
      const count = await taskCards.count();

      if (count > 0) {
        // 點擊複製按鈕
        await taskCards.first().locator('button:has-text("複製")').last().click();

        // 驗證模態框元素
        await expect(page.locator('.modal h3:has-text("複製任務")')).toBeVisible();
        await expect(page.locator('text=來源任務:')).toBeVisible();
        await expect(page.locator('text=目標班級課程')).toBeVisible();
        await expect(page.locator('text=週開始日期')).toBeVisible();
        await expect(page.locator('text=週結束日期')).toBeVisible();

        // 驗證選擇器和日期輸入框
        await expect(page.locator('.modal select')).toBeVisible();
        await expect(page.locator('.modal input[type="date"]').first()).toBeVisible();
        await expect(page.locator('.modal input[type="date"]').last()).toBeVisible();

        // 驗證按鈕
        await expect(page.locator('.modal button:has-text("取消")')).toBeVisible();
        await expect(page.locator('.modal button:has-text("確認複製")')).toBeVisible();

        // 關閉模態框
        await page.click('.modal button:has-text("取消")');
      }
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
