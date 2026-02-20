import { test, expect } from '@playwright/test';

test.describe('HTML lang 属性验证', () => {
  test('TC-LANG-001: 首页应该有 lang="zh-TW" 属性', async ({ page }) => {
    await page.goto('/');

    // 获取 html 元素的 lang 属性
    const htmlLang = await page.locator('html').getAttribute('lang');

    // 验证 lang 属性为 zh-TW
    expect(htmlLang).toBe('zh-TW');
  });

  test('TC-LANG-002: 管理员登录页应该有 lang="zh-TW" 属性', async ({ page }) => {
    await page.goto('/admin/login');

    const htmlLang = await page.locator('html').getAttribute('lang');
    expect(htmlLang).toBe('zh-TW');
  });

  test('TC-LANG-003: 教师登录页应该有 lang="zh-TW" 属性', async ({ page }) => {
    await page.goto('/teacher/login');

    const htmlLang = await page.locator('html').getAttribute('lang');
    expect(htmlLang).toBe('zh-TW');
  });

  test('TC-LANG-004: 管理员班级管理页应该有 lang="zh-TW" 属性', async ({ page }) => {
    await page.goto('/admin/classes');

    const htmlLang = await page.locator('html').getAttribute('lang');
    expect(htmlLang).toBe('zh-TW');
  });

  test('TC-LANG-005: 教师工作台应该有 lang="zh-TW" 属性', async ({ page }) => {
    await page.goto('/teacher/dashboard');

    const htmlLang = await page.locator('html').getAttribute('lang');
    expect(htmlLang).toBe('zh-TW');
  });

  test('TC-LANG-006: 家长页面应该有 lang="zh-TW" 属性', async ({ page }) => {
    // 使用测试 token
    await page.goto('/family/test_valid_token_12345678');

    const htmlLang = await page.locator('html').getAttribute('lang');
    expect(htmlLang).toBe('zh-TW');
  });
});
