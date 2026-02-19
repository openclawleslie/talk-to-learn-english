# E2E 测试方案

## 测试框架选择

使用 **Playwright** 进行端到端测试，原因：
- 支持多浏览器（Chrome、Firefox、Safari）
- 内置移动端模拟
- 支持录音/音频测试
- 良好的 TypeScript 支持

## 安装依赖

```bash
pnpm add -D @playwright/test
npx playwright install
```

## 测试环境配置

### 环境变量 (.env.test)
```env
DATABASE_URL=postgresql://...  # 测试数据库
ADMIN_USERNAME=test_admin
ADMIN_PASSWORD=test_password
AI_BASE_URL=http://localhost:11434/v1  # 本地 Ollama 或 Mock
AI_API_KEY=test_key
```

### 测试数据库
- 使用独立的测试数据库
- 每次测试前清空并重新 seed

---

## 测试用例设计

### 1. 管理员端测试

#### 1.1 登录测试
```
TC-ADMIN-001: 管理员登录成功
TC-ADMIN-002: 管理员登录失败（错误密码）
TC-ADMIN-003: 管理员登出
```

#### 1.2 班级管理测试
```
TC-ADMIN-010: 创建班级
TC-ADMIN-011: 编辑班级
TC-ADMIN-012: 删除班级
```

#### 1.3 课程管理测试
```
TC-ADMIN-020: 创建课程
TC-ADMIN-021: 编辑课程
TC-ADMIN-022: 删除课程
```

#### 1.4 班级课程关联测试
```
TC-ADMIN-030: 创建班级课程关联
TC-ADMIN-031: 删除班级课程关联
TC-ADMIN-032: 重复关联应失败
```

#### 1.5 教师管理测试
```
TC-ADMIN-040: 创建教师账号
TC-ADMIN-041: 禁用教师账号
TC-ADMIN-042: 重置教师密码
TC-ADMIN-043: 分配班级课程给教师
```

#### 1.6 每周任务测试
```
TC-ADMIN-050: 创建每周任务（10句）
TC-ADMIN-051: 生成参考音频
TC-ADMIN-052: 发布任务
TC-ADMIN-053: 任务预览显示正确
```

#### 1.7 评分配置测试
```
TC-ADMIN-060: 修改星级阈值
TC-ADMIN-061: 阈值变更后星级正确计算
```

---

### 2. 教师端测试

#### 2.1 登录测试
```
TC-TEACHER-001: 教师登录成功
TC-TEACHER-002: 教师登录失败
TC-TEACHER-003: 被禁用教师无法登录
```

#### 2.2 家庭管理测试
```
TC-TEACHER-010: 创建家庭和学生
TC-TEACHER-011: 生成家长链接
TC-TEACHER-012: 重置家长链接（旧链接失效）
TC-TEACHER-013: 只能看到自己班级的家庭
```

#### 2.3 班级数据查看测试
```
TC-TEACHER-020: 查看班级学生列表
TC-TEACHER-021: 查看完成率和平均分
TC-TEACHER-022: 查看低分句子列表
TC-TEACHER-023: 播放学生录音
TC-TEACHER-024: 只能查看自己绑定的班级
```

---

### 3. 家长端测试

#### 3.1 链接访问测试
```
TC-PARENT-001: 有效链接可进入
TC-PARENT-002: 无效链接显示错误
TC-PARENT-003: 已重置的旧链接失效
```

#### 3.2 数据统计测试
```
TC-PARENT-010: 查看本周数据（平均分、完成进度）
TC-PARENT-011: 查看历史表现
TC-PARENT-012: 只能看到自己孩子的数据
```

#### 3.3 学生作业查看测试
```
TC-PARENT-020: 查看每个句子的完成状态
TC-PARENT-021: 查看分数和星级
TC-PARENT-022: 播放学生录音
TC-PARENT-023: 查看 AI 反馈
```

---

### 4. 学生端测试

#### 4.1 练习界面测试
```
TC-STUDENT-001: 显示当前题目
TC-STUDENT-002: 播放参考音频
TC-STUDENT-003: 进度条正确显示
TC-STUDENT-004: 题目导航正常
```

#### 4.2 录音提交测试
```
TC-STUDENT-010: 开始录音
TC-STUDENT-011: 停止录音
TC-STUDENT-012: 重新录制
TC-STUDENT-013: 提交录音成功
TC-STUDENT-014: 提交后显示星级和反馈
TC-STUDENT-015: 不显示分数（只显示星级）
```

#### 4.3 完成流程测试
```
TC-STUDENT-020: 完成所有10句后显示完成页面
TC-STUDENT-021: 可以重新录制已完成的句子
```

---

### 5. 评分流程测试

#### 5.1 AI 评分测试
```
TC-SCORE-001: 录音上传成功
TC-SCORE-002: ASR 转录正确调用
TC-SCORE-003: AI 评分返回分数和反馈
TC-SCORE-004: 星级根据阈值正确计算
TC-SCORE-005: 结果正确保存到数据库
```

---

### 6. 权限隔离测试

```
TC-PERM-001: 教师只能看到自己班级的学生
TC-PERM-002: 家长只能看到自己孩子的数据
TC-PERM-003: 学生端不显示分数
TC-PERM-004: 未登录无法访问管理员/教师页面
TC-PERM-005: 无效 token 无法访问家长/学生页面
```

---

## 测试数据准备

### Seed 数据
```typescript
// 测试数据
const testData = {
  admin: { username: 'test_admin', password: 'test_password' },
  teacher: { email: 'teacher@test.com', password: 'teacher123' },
  class: { name: '测试班级', timezone: 'Asia/Shanghai' },
  course: { name: '英语口语', level: 'beginner' },
  family: { parentName: '测试家长', students: [{ name: '小明' }] },
  task: {
    items: [
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
    ],
  },
};
```

---

## 运行测试

```bash
# 运行所有 E2E 测试
pnpm test:e2e

# 运行特定测试文件
pnpm test:e2e tests/e2e/admin.spec.ts

# 带 UI 运行
pnpm test:e2e --ui

# 生成测试报告
pnpm test:e2e --reporter=html
```

---

## CI/CD 集成

```yaml
# .github/workflows/e2e.yml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: npx playwright install --with-deps
      - run: pnpm test:e2e
```

---

## 验收标准检查清单

| 验收标准 | 对应测试用例 |
|---------|-------------|
| 老师能发链接给家长 | TC-TEACHER-011 |
| 学生完成10句录音并获得AI反馈 | TC-STUDENT-013, TC-SCORE-003 |
| 老师可看到完成度、平均分、低分句 | TC-TEACHER-020~023 |
| 家长可看到完成度、平均分、低分句 | TC-PARENT-010~023 |
| 可回放音频 | TC-TEACHER-023, TC-PARENT-022 |
| 家长链接可重置，旧链接失效 | TC-TEACHER-012, TC-PARENT-003 |
| 孩子端不显示分数 | TC-STUDENT-015 |
| 评分阈值调整后星级正确变化 | TC-ADMIN-061 |
