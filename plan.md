# 每周口说作业系统 MVP 实施计划（Vercel + Postgres/Neon）

## 摘要
- 交付一个全 Web/H5 的口说作业 MVP：管理员/老师/家长/孩子三端统一访问。
- 管理员维护班级+课程、每周任务、老师账号；老师管理家长/孩子、生成唯一链接；家长/孩子仅凭链接进入练习并查看表现。
- AI 评分通过 OpenAI 兼容接口；本地用 Qwen，生产用 OpenAI GPT-5；评分产出星级+点评+分数（分数仅家长/老师可见）。
- 参考音频使用系统 TTS 生成（可回放），学生录音与 reference 音频均存储并支持回放。

## 目标与范围
**MVP 目标**
- 老师/家长可追踪孩子每周完成度、平均分、低分句并回放录音。
- 学生完成每周 10 句口说练习并获得星级与点评。

**明确不做（留作扩展）**
- AI 场景对话、正式登录系统、游戏化激励。
- PDF 解析/OCR、教材库、音素级纠音。
- 付费/订阅。

## 技术与部署（已确定）
- 前端/后端：Next.js 16 + App Router
- ORM：Drizzle + Zod
- 认证：BetterAuth（老师/管理员）
- 存储：Vercel Blob（reference + 学生录音）
- 数据库：Postgres（Neon，已配置）
- AI：OpenAI 兼容接口（本地 Qwen，生产 GPT-5）
- UI：DaisyUI

## 关键决策与默认值
- **界面语言：繁体中文（台湾）** - 所有用户界面文字使用台湾繁体中文，遵循当地表达习惯（如：登入、網路、資料、建立、存取、連結、口說、每週、電子郵件、儲存、設定、門檻、音訊、產生等），日期格式使用 zh-TW
- 本周周期：周一 00:00 至周日 23:59（以系统时区）
- 家长/孩子访问：仅唯一链接，长期有效，可手动重置
- 任务形态：固定 10 句 + reference 音频
- 音频存储：reference + 学生录音全部存储并可回放
- 评分：0–100 分 + 星级阈值可配置
- 星级阈值（最终标准）：<70 一星；70–84 两星；>=85 三星
- TTS 生成 reference：使用 OpenAI 兼容 TTS 接口

## 领域模型（数据库表）
> 仅列 MVP 必需字段

**用户与权限**
- teachers: id, name, username/email, password_hash, is_active, created_at
- admin_config: id, scoring_thresholds_json, created_at

**班级与课程**
- classes: id, name, timezone (默认系统时区)
- courses: id, name, level
- class_courses: id, class_id, course_id

**老师绑定**
- teacher_assignments: id, teacher_id, class_course_id

**家长/孩子**
- families: id, parent_name, note, class_course_id, created_by_teacher_id, created_at
- students: id, family_id, name, created_at
- family_links: id, family_id, token_hash, status(active/revoked), last_used_at, created_at

**每周任务**
- weekly_tasks: id, class_course_id, week_start, week_end, status(draft/published), created_by_admin
- task_items: id, weekly_task_id, order_index, sentence_text, reference_audio_url, reference_audio_status

**提交与评分**
- submissions: id, student_id, task_item_id, audio_url, transcript, score, stars, feedback, created_at

## 核心流程设计

### 1) 管理员
- 登录方式：环境变量 ADMIN_USERNAME / ADMIN_PASSWORD
- 功能：
  - 管理班级+课程
  - 管理老师账号（创建/禁用/重置密码）
  - 创建“本周任务”并发布到多个班级+课程
  - 配置星级阈值

### 2) 老师
- 账号密码由管理员分配
- 登录后可见已绑定的班级+课程
- 管理家长/孩子（创建家庭+孩子）
- 生成唯一链接（长期有效，可重置/作废）
- 查看班级孩子表现（完成度、平均分、低分句、回放）

### 3) 家长/孩子
- 无登录，凭唯一链接进入
- 家长/孩子共用入口
  - 孩子模式：做任务，看星级+点评（隐藏分数）
  - 家长模式：查看成绩细节（含分数、平均分、低分句）

## AI 评分流水线（MVP）
1. 学生提交录音 → 上传到 Vercel Blob
2. 评分 API：
   - 先调用 OpenAI 兼容 ASR（audio/transcriptions）取得 transcript
   - 再调用 LLM 评分接口（chat.completions / responses）
   - 输出：score(0-100) + feedback + stars
3. 评分结果写入 submissions
4. 评分阈值来自 admin_config（可调整）

**环境变量建议**
- AI_BASE_URL / AI_API_KEY
- AI_MODEL (生产：gpt-5)
- AI_TRANSCRIBE_MODEL
- AI_TTS_MODEL

## API 设计（Next.js Route Handlers）

**认证与会话**
- POST /api/auth/teacher/login
- POST /api/auth/teacher/logout
- POST /api/auth/admin/login

**管理员**
- POST /api/admin/classes
- POST /api/admin/courses
- POST /api/admin/teacher
- POST /api/admin/weekly-tasks
- PUT /api/admin/scoring-config

**老师**
- POST /api/teacher/families
- POST /api/teacher/families/:id/reset-link
- GET /api/teacher/classes/:id/summary

**家长/孩子**
- GET /api/family/link/:token
- GET /api/family/weekly-task
- POST /api/family/submissions
- GET /api/family/performance

**AI & 音频**
- POST /api/ai/score
- POST /api/audio/upload

## 页面与路由（UI）

**管理员**
- /admin/login
- /admin/classes
- /admin/teachers
- /admin/weekly-tasks
- /admin/scoring

**老师**
- /teacher/login
- /teacher/dashboard
- /teacher/class/:id
- /teacher/families

**家长/孩子**
- /family/:token
- /family/tasks
- /family/report

## 存储与安全
- Vercel Blob 私有存储
- 音频访问用 signed URL（短期有效）
- family link token 只存 hash
- API 严格按角色校验（老师不能访问非绑定班级数据）

## 测试与验收

**核心测试**
- 家长链接：可进入、可重置、旧链接失效
- 学生提交录音 → 成功评分 → 正确保存
- 老师端：班级内只看到自己班级学生
- 家长端：只看到自己孩子
- 孩子端：不显示分数
- 每周任务：发布后可见，任务总数固定 10
- 评分阈值调整后星级正确变化

**验收标准（MVP）**
- 老师能发链接给家长
- 学生完成 10 句录音并获得 AI 反馈
- 老师/家长可看到完成度、平均分、低分句并回放音频

## 后续扩展（已合并）
- AI 场景对话
- 正式登录系统（家长/学生独立账户）
- 游戏化激励（老带新邀请、积分兑换、连击奖励）
- PDF 解析/OCR、教材库、音素级纠音

## 明确假设
- 系统默认时区通过环境变量配置（如 DEFAULT_TZ），MVP 不做班级级别时区
- 本地 Qwen 若不支持 TTS，则管理员需手动上传 reference 音频
- 录音单句时长上限默认 20–30 秒（可后续配置）
