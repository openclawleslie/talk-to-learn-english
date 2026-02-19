# Talk To Learn English (MVP)

Next.js 16 App Router implementation for weekly spoken English homework.

## Tech Stack

- Next.js 16 + TypeScript
- Drizzle ORM + Postgres (Neon)
- Vercel Blob
- OpenAI-compatible APIs (ASR / TTS / Scoring)

## Quick Start

1. Install dependencies

```bash
npm install
```

2. Configure `.env` values

```env
DATABASE_URL=
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
SESSION_SECRET=dev-session-secret
DEFAULT_TZ=Asia/Shanghai
AI_BASE_URL=
AI_API_KEY=
AI_MODEL=gpt-5
AI_TRANSCRIBE_MODEL=gpt-4o-mini-transcribe
AI_TTS_MODEL=gpt-4o-mini-tts
BLOB_READ_WRITE_TOKEN=
```

3. Create database schema and seed

```bash
npm run db:push
npm run db:seed
```

4. Run the app

```bash
npm run dev
```

## Main Routes

- Admin: `/admin/login`, `/admin/classes`, `/admin/courses`, `/admin/teachers`, `/admin/weekly-tasks`, `/admin/scoring`
- Teacher: `/teacher/login`, `/teacher/dashboard`, `/teacher/families`, `/teacher/class/:id`
- Family: `/family/:token`, `/family/tasks`, `/family/report`

## Development Guidelines

### UI Language: Traditional Chinese (Taiwan)

All user-facing text must use **Traditional Chinese (Taiwan locale)**, following local expression habits rather than simple character conversion.

**Key conversion rules:**
| Simplified | Traditional (Taiwan) |
|------------|---------------------|
| 登录 | 登入 |
| 网络 | 網路 |
| 数据 | 資料 |
| 创建 | 建立 |
| 访问 | 存取 |
| 链接 | 連結 |
| 口语 | 口說 |
| 每周 | 每週 |
| 邮箱 | 電子郵件 |
| 保存 | 儲存 |
| 配置 | 設定 |
| 阈值 | 門檻 |
| 音频 | 音訊 |
| 生成 | 產生 |
| 复制 | 複製 |
| 剪贴板 | 剪貼簿 |
| 删除 | 刪除 |
| 添加 | 新增 |
| 暂无 | 尚無 |
| 状态 | 狀態 |

**Date formatting:** Use `zh-TW` locale for date formatting.
