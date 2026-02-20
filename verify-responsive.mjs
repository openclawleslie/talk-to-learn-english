/**
 * Responsive Behavior Verification Script
 * Tests teacher navigation at different breakpoints
 */

import { chromium } from 'playwright';

const BREAKPOINTS = {
  mobile: { width: 375, height: 667, name: 'Mobile (375px)' },
  tablet: { width: 768, height: 1024, name: 'Tablet (768px)' },
  desktop: { width: 1024, height: 768, name: 'Desktop (1024px)' },
  large: { width: 1440, height: 900, name: 'Large Desktop (1440px)' }
};

async function verifyResponsiveBehavior() {
  console.log('🔍 Starting responsive behavior verification...\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  const results = {
    passed: [],
    failed: [],
    warnings: []
  };

  try {
    // Navigate to teacher dashboard
    console.log('📱 Navigating to teacher dashboard...');
    await page.goto('http://localhost:3000/teacher/dashboard');
    await page.waitForLoadState('networkidle');

    // Test each breakpoint
    for (const [key, bp] of Object.entries(BREAKPOINTS)) {
      console.log(`\n📐 Testing ${bp.name}...`);
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.waitForTimeout(500); // Let animations settle

      const isMobile = bp.width < 1024;
      const testResults = [];

      // Test 1: Hamburger menu visibility
      const hamburgerVisible = await page.isVisible('.navbar.lg\\:hidden label[for="teacher-drawer"]');
      const hamburgerCheck = isMobile ? hamburgerVisible : !hamburgerVisible;

      if (hamburgerCheck) {
        testResults.push(`✅ Hamburger menu ${isMobile ? 'visible' : 'hidden'} (correct)`);
        results.passed.push(`${bp.name}: Hamburger visibility`);
      } else {
        testResults.push(`❌ Hamburger menu ${isMobile ? 'should be visible' : 'should be hidden'}`);
        results.failed.push(`${bp.name}: Hamburger visibility`);
      }

      // Test 2: Sidebar visibility (on desktop, drawer should be open by default)
      const sidebarVisible = await page.isVisible('.drawer-side .menu');

      if (isMobile) {
        // On mobile, sidebar should be hidden initially
        const drawerChecked = await page.isChecked('#teacher-drawer');
        if (!drawerChecked) {
          testResults.push('✅ Sidebar hidden on mobile (correct)');
          results.passed.push(`${bp.name}: Sidebar initially hidden`);
        } else {
          testResults.push('⚠️  Sidebar visible on mobile initially');
          results.warnings.push(`${bp.name}: Sidebar initially visible`);
        }
      } else {
        // On desktop, sidebar should be visible
        if (sidebarVisible) {
          testResults.push('✅ Sidebar visible on desktop (correct)');
          results.passed.push(`${bp.name}: Sidebar visible`);
        } else {
          testResults.push('❌ Sidebar should be visible on desktop');
          results.failed.push(`${bp.name}: Sidebar visibility`);
        }
      }

      // Test 3: Mobile drawer interaction
      if (isMobile) {
        console.log('  🖱️  Testing mobile drawer interaction...');

        // Click hamburger to open drawer
        await page.click('.navbar label[for="teacher-drawer"]');
        await page.waitForTimeout(300); // Wait for animation

        const drawerOpen = await page.isChecked('#teacher-drawer');
        if (drawerOpen) {
          testResults.push('✅ Drawer opens when hamburger clicked');
          results.passed.push(`${bp.name}: Drawer opens`);
        } else {
          testResults.push('❌ Drawer should open when hamburger clicked');
          results.failed.push(`${bp.name}: Drawer opens`);
        }

        // Click overlay to close drawer
        const overlayVisible = await page.isVisible('.drawer-overlay');
        if (overlayVisible) {
          await page.click('.drawer-overlay');
          await page.waitForTimeout(300);

          const drawerClosed = !(await page.isChecked('#teacher-drawer'));
          if (drawerClosed) {
            testResults.push('✅ Drawer closes when overlay clicked');
            results.passed.push(`${bp.name}: Drawer closes`);
          } else {
            testResults.push('❌ Drawer should close when overlay clicked');
            results.failed.push(`${bp.name}: Drawer closes`);
          }
        }
      }

      // Test 4: Navigation items are clickable
      const navLinks = await page.locator('.drawer-side .menu a[href^="/teacher"]').count();
      if (navLinks >= 3) {
        testResults.push(`✅ All navigation items present (${navLinks} items)`);
        results.passed.push(`${bp.name}: Navigation items present`);
      } else {
        testResults.push(`❌ Missing navigation items (found ${navLinks}, expected 3+)`);
        results.failed.push(`${bp.name}: Navigation items present`);
      }

      // Test 5: No console errors
      const errors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      // Print results for this breakpoint
      testResults.forEach(r => console.log(`  ${r}`));
    }

    // Print final summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 VERIFICATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${results.passed.length}`);
    console.log(`❌ Failed: ${results.failed.length}`);
    console.log(`⚠️  Warnings: ${results.warnings.length}`);

    if (results.failed.length > 0) {
      console.log('\n❌ Failed checks:');
      results.failed.forEach(f => console.log(`  - ${f}`));
    }

    if (results.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      results.warnings.forEach(w => console.log(`  - ${w}`));
    }

    console.log('\n' + '='.repeat(60));

    const success = results.failed.length === 0;
    console.log(success ? '✅ ALL TESTS PASSED!' : '❌ SOME TESTS FAILED');
    console.log('='.repeat(60) + '\n');

    // Keep browser open for manual inspection
    console.log('Browser will remain open for manual inspection...');
    console.log('Press Ctrl+C to close and exit.');

    // Wait indefinitely
    await new Promise(() => {});

  } catch (error) {
    console.error('❌ Error during verification:', error);
    await browser.close();
    process.exit(1);
  }
}

// Run verification
verifyResponsiveBehavior().catch(console.error);
