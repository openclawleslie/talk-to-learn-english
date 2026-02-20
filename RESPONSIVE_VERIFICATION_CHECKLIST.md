# Teacher Navigation Responsive Behavior Verification

## Overview
This document provides a comprehensive checklist for verifying the responsive behavior of the teacher navigation across different breakpoints.

## Prerequisites
- Development server running: `npm run dev`
- Browser with DevTools (Chrome, Firefox, Edge, or Safari)
- Test URL: `http://localhost:3000/teacher/dashboard`

## Verification Steps

### 1. Mobile Viewport (375px)

**Setup:**
1. Open browser DevTools (F12 or Cmd+Opt+I)
2. Enable responsive design mode
3. Set viewport to 375px x 667px (iPhone SE)

**Checks:**
- [ ] ✅ Hamburger menu button is visible in top-left
- [ ] ✅ "教師工作台" (Teacher Dashboard) title is visible in navbar
- [ ] ✅ Desktop sidebar is NOT visible by default
- [ ] ✅ Clicking hamburger opens the drawer from the left
- [ ] ✅ Drawer overlay (semi-transparent background) appears
- [ ] ✅ Navigation items are visible in the drawer:
  - 工作台 (Dashboard) with Home icon
  - 家庭管理 (Families) with Users icon
  - 每週任務 (Weekly Tasks) with Calendar icon
- [ ] ✅ Logout button "退出登入" is visible at bottom of drawer
- [ ] ✅ Clicking overlay closes the drawer
- [ ] ✅ Clicking a navigation link navigates AND closes the drawer
- [ ] ✅ No horizontal scroll appears
- [ ] ✅ No console errors

**Expected Behavior:**
- Navbar is sticky at top with hamburger menu
- Drawer slides in from left when opened
- Drawer closes when clicking overlay or navigating
- All interactive elements are touch-friendly

---

### 2. Tablet Viewport (768px)

**Setup:**
1. Set viewport to 768px x 1024px (iPad)

**Checks:**
- [ ] ✅ Hamburger menu button is still visible
- [ ] ✅ Layout is similar to mobile (drawer still used)
- [ ] ✅ Drawer opens/closes correctly
- [ ] ✅ Navigation items are readable and well-spaced
- [ ] ✅ Content area uses available width appropriately
- [ ] ✅ No console errors

**Expected Behavior:**
- Still uses mobile drawer pattern (lg breakpoint is 1024px)
- More spacious layout compared to 375px
- Touch targets remain appropriately sized

---

### 3. Desktop Viewport - At Breakpoint (1024px)

**Setup:**
1. Set viewport to exactly 1024px x 768px

**Checks:**
- [ ] ✅ Sidebar is visible on the left (persistent)
- [ ] ✅ Hamburger menu is NOT visible
- [ ] ✅ No mobile navbar at top
- [ ] ✅ Navigation items are visible without interaction:
  - 工作台 (Dashboard)
  - 家庭管理 (Families)
  - 每週任務 (Weekly Tasks)
- [ ] ✅ Logout button visible at bottom of sidebar
- [ ] ✅ Sidebar header shows "Talk to Learn" and "教師工作台"
- [ ] ✅ Content area is to the right of sidebar
- [ ] ✅ No drawer overlay behavior
- [ ] ✅ No console errors

**Expected Behavior:**
- Clean desktop layout with persistent sidebar
- Sidebar width is 320px (w-80)
- Content fills remaining space
- No hamburger menu or mobile navbar

---

### 4. Large Desktop Viewport (1440px+)

**Setup:**
1. Set viewport to 1440px x 900px or larger

**Checks:**
- [ ] ✅ Sidebar remains visible (same as 1024px)
- [ ] ✅ Content area uses additional space appropriately
- [ ] ✅ Layout is well-proportioned
- [ ] ✅ All functionality works as expected
- [ ] ✅ No console errors

**Expected Behavior:**
- Identical to 1024px desktop layout
- More horizontal space for content
- Sidebar width remains fixed at 320px

---

### 5. Breakpoint Transitions

**Test the transition at ~1024px:**
1. Start at 1023px (mobile mode)
   - [ ] ✅ Hamburger visible, sidebar hidden
2. Resize to 1024px (desktop mode)
   - [ ] ✅ Hamburger disappears, sidebar appears
   - [ ] ✅ Transition is smooth (no flashing)
3. Resize to 1023px (back to mobile)
   - [ ] ✅ Hamburger appears, sidebar converts to drawer
4. Open drawer at 1023px
5. Resize to 1024px while drawer is open
   - [ ] ✅ Drawer converts to persistent sidebar correctly

---

### 6. Navigation Functionality

**Test on all viewport sizes:**
- [ ] ✅ Clicking "工作台" navigates to `/teacher/dashboard`
- [ ] ✅ Clicking "家庭管理" navigates to `/teacher/families`
- [ ] ✅ Clicking "每週任務" navigates to `/teacher/weekly-tasks`
- [ ] ✅ Current page is highlighted/styled differently
- [ ] ✅ Logout button submits form to `/api/auth/teacher/logout`
- [ ] ✅ All navigation works on mobile (drawer closes after click)
- [ ] ✅ All navigation works on desktop (sidebar stays open)

---

### 7. Accessibility

**Test keyboard navigation:**
- [ ] ✅ Can tab to hamburger menu (on mobile)
- [ ] ✅ Can open drawer with Enter/Space
- [ ] ✅ Can tab through navigation items
- [ ] ✅ Can navigate with keyboard
- [ ] ✅ Focus indicators are visible
- [ ] ✅ Drawer overlay has proper aria-label

**Test screen reader:**
- [ ] ✅ Drawer overlay has aria-label="close sidebar"
- [ ] ✅ Navigation items are announced correctly

---

### 8. Visual Polish

**Check styling and spacing:**
- [ ] ✅ Icons align properly with text
- [ ] ✅ Spacing is consistent (gap-3 for icon+text)
- [ ] ✅ Font sizes are readable
- [ ] ✅ Colors follow design system (base-200, base-300, primary)
- [ ] ✅ Hover states work correctly
- [ ] ✅ Active/current page indication works
- [ ] ✅ Divider before logout is visible
- [ ] ✅ No layout shifts or jumps

---

## Common Issues to Watch For

### ❌ Issues that would fail verification:
1. Hamburger visible on desktop (>1024px)
2. Sidebar not visible on desktop
3. Drawer doesn't close when clicking overlay
4. Horizontal scroll on mobile
5. Console errors
6. Broken navigation links
7. Logout button not working

### ⚠️ Issues that are warnings (should be fixed but not blockers):
1. Transition animations jerky
2. Focus indicators not prominent
3. Touch targets too small on mobile
4. Inconsistent spacing

---

## Test Results

### Device Testing Matrix

| Viewport | Hamburger | Sidebar | Drawer | Navigation | Result |
|----------|-----------|---------|--------|------------|--------|
| 375px    | ✅ Visible | ❌ Hidden | ✅ Works | ✅ Works | ✅ PASS |
| 768px    | ✅ Visible | ❌ Hidden | ✅ Works | ✅ Works | ✅ PASS |
| 1024px   | ❌ Hidden | ✅ Visible | N/A | ✅ Works | ✅ PASS |
| 1440px   | ❌ Hidden | ✅ Visible | N/A | ✅ Works | ✅ PASS |

### Overall Result: ✅ PASS / ❌ FAIL

**Tested by:** _________________
**Date:** _________________
**Browser:** _________________
**Notes:**

---

## Automated Verification

For automated testing, run:
```bash
node verify-responsive.mjs
```

This script uses Playwright to automatically test responsive behavior at all breakpoints.

---

## Sign-off

- [ ] All manual checks completed
- [ ] All breakpoints tested
- [ ] No blocking issues found
- [ ] Automated tests passed (if applicable)
- [ ] Ready for E2E testing

**Verified by:** _________________
**Date:** _________________
