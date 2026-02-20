# API 參考文件

## 概述

本文件記錄每週口說作業系統的所有 API 端點。系統提供三種使用者角色的 API：

- **管理員 API** - 管理班級、課程、老師帳號、每週任務和評分設定
- **老師 API** - 管理家長/孩子、查看班級表現
- **家長/孩子 API** - 存取每週任務、提交錄音、查看表現

**基礎 URL**

開發環境：`http://localhost:3000`
正式環境：依據您的 Vercel 部署網域

**技術堆疊**

- 框架：Next.js 16 (App Router)
- 資料驗證：Zod
- ORM：Drizzle
- 認證：BetterAuth（老師/管理員）+ 自訂 Session（HMAC 簽章）
- 檔案儲存：Vercel Blob

---

## 認證

### Session Cookie 認證（管理員/老師）

管理員和老師端點使用基於 session cookie 的認證：

**Cookie 名稱：** `ttle_session`

**Session 結構：**
```typescript
{
  role: "admin" | "teacher",
  teacherId?: string,  // 僅 teacher 角色
  exp: number          // UNIX 時間戳記
}
```

**Session 特性：**
- 簽章方式：HMAC-SHA256（使用 `SESSION_SECRET` 環境變數）
- 有效期限：24 小時
- 儲存格式：`base64url(payload).signature`
- Cookie 屬性：`httpOnly`, `sameSite=lax`, `secure`（僅正式環境）

**認證檢查：**

1. **`requireAdmin()`** - 要求 `role === "admin"`
   - 回傳：Session payload
   - 失敗：`401 Unauthorized`

2. **`requireTeacher()`** - 要求 `role === "teacher" || role === "admin"` 且有 `teacherId`
   - 回傳：Session payload with `teacherId`
   - 失敗：`401 Unauthorized`

**登入流程：**
```
1. POST /api/auth/admin/login 或 /api/auth/teacher/login
2. 伺服器驗證憑證
3. 成功後設定 session cookie
4. 後續請求自動攜帶 cookie
```

**登出流程：**
```
1. POST /api/auth/admin/logout 或 /api/auth/teacher/logout
2. 伺服器刪除 session cookie
```

### 權杖認證（家長/孩子）

家長和孩子透過唯一連結存取系統，無需登入：

**連結格式：** `/family/{token}`

**權杖特性：**
- 長度：32 字元隨機字串
- 儲存方式：資料庫僅存 HMAC-SHA256 雜湊值（使用 `FAMILY_LINK_SECRET`）
- 狀態：`active` 或 `revoked`
- 有效期限：長期有效（除非老師重置或作廢）

**使用方式：**
```
1. GET /api/family/link/{token} - 驗證權杖並取得家庭資訊
2. 在後續請求中以 query parameter 傳遞：?token={token}
```

---

## 回應格式

所有 API 端點使用統一的 JSON 回應格式。

### 成功回應

使用 `ok()` 輔助函式：

```typescript
function ok<T>(data: T, init?: ResponseInit): Response
```

**格式：**
```json
{
  "ok": true,
  "data": { /* 實際資料 */ }
}
```

**範例：**
```json
{
  "ok": true,
  "data": {
    "id": "123",
    "name": "一年級 A 班",
    "timezone": "Asia/Taipei"
  }
}
```

### 錯誤回應

使用 `fail()` 輔助函式：

```typescript
function fail(message: string, status = 400, details?: unknown): Response
```

**格式：**
```json
{
  "ok": false,
  "error": {
    "message": "錯誤訊息",
    "details": { /* 選填：額外資訊 */ }
  }
}
```

**範例：**
```json
{
  "ok": false,
  "error": {
    "message": "Validation failed",
    "details": {
      "formErrors": [],
      "fieldErrors": {
        "name": ["Required"],
        "email": ["Invalid email"]
      }
    }
  }
}
```

---

## 錯誤處理

### HTTP 狀態碼

| 狀態碼 | 說明 | 使用時機 |
|--------|------|----------|
| 200 | OK | 請求成功 |
| 400 | Bad Request | 輸入驗證失敗 |
| 401 | Unauthorized | 認證失敗或未登入 |
| 403 | Forbidden | 無權限存取資源 |
| 404 | Not Found | 資源不存在 |
| 500 | Internal Server Error | 伺服器內部錯誤 |

### 錯誤類型

#### 1. ZodError（輸入驗證錯誤）

當請求資料不符合 Zod schema 時觸發。

**觸發條件：**
```typescript
const payload = loginSchema.parse(await request.json());
// 如果驗證失敗 → ZodError
```

**錯誤回應：**
```json
{
  "ok": false,
  "error": {
    "message": "Validation failed",
    "details": {
      "formErrors": [],
      "fieldErrors": {
        "username": ["Required"],
        "password": ["String must contain at least 6 character(s)"]
      }
    }
  }
}
```

**HTTP 狀態碼：** `400`

#### 2. HttpError（業務邏輯錯誤）

自訂錯誤類別，用於明確的業務邏輯錯誤。

**定義：**
```typescript
class HttpError extends Error {
  constructor(message: string, public status: number)
}
```

**使用範例：**
```typescript
if (!user) {
  throw new HttpError("User not found", 404);
}

if (session.role !== "admin") {
  throw new HttpError("Unauthorized", 401);
}
```

**錯誤回應：**
```json
{
  "ok": false,
  "error": {
    "message": "Unauthorized"
  }
}
```

**HTTP 狀態碼：** 根據建構時指定的 `status` 參數

#### 3. 未預期錯誤

任何未被捕獲的錯誤會被轉換為一般性錯誤回應。

**錯誤回應：**
```json
{
  "ok": false,
  "error": {
    "message": "Internal server error"
  }
}
```

**HTTP 狀態碼：** `500`

**注意：** 原始錯誤會記錄在伺服器 console，但不會暴露給客戶端。

### 錯誤處理流程

所有 API route handlers 使用統一的錯誤處理模式：

```typescript
export async function POST(request: NextRequest) {
  try {
    // 業務邏輯
    const payload = schema.parse(await request.json());
    // ...
    return ok(result);
  } catch (error) {
    return fromError(error);  // 統一錯誤處理
  }
}
```

**`fromError()` 輔助函式：**
```typescript
function fromError(error: unknown): Response {
  if (error instanceof ZodError) {
    return fail("Validation failed", 400, error.flatten());
  }
  if (error instanceof HttpError) {
    return fail(error.message, error.status);
  }
  console.error("Unhandled error:", error);
  return fail("Internal server error", 500);
}
```

---

## 常見模式

### 請求內容類型

大多數端點接受 `application/json`：

```bash
curl -X POST https://example.com/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"secret"}'
```

部分端點支援 **雙重內容類型**（JSON 或 multipart/form-data）：

- `POST /api/ai/score` - AI 評分（可選檔案上傳）
- `POST /api/family/submissions` - 提交錄音

詳見各端點說明。

### 分頁

目前 API 不實作分頁。未來可能加入 `limit` 和 `offset` 參數。

### 日期格式

- **儲存格式：** ISO 8601（UTC）
- **顯示格式：** 依據 `zh-TW` locale
- **時區：** 班級可設定 `timezone`（預設 `Asia/Taipei`）

### 檔案上傳

音訊檔案上傳至 **Vercel Blob**：

1. 客戶端上傳音訊至 API
2. API 呼叫 `put()` 儲存至 Blob
3. 回傳 `url`（公開或簽章）

**支援格式：**
- WebM（Opus 編碼，瀏覽器錄音預設）
- WAV（PCM 16-bit）
- MP3

**存取控制：**
- Reference 音訊：公開 URL
- 學生錄音：私有 URL（需簽章存取）

---

## 資料驗證

所有輸入資料使用 **Zod schemas** 驗證，定義於 `lib/validators.ts`。

### 常見 Schemas

**管理員登入：**
```typescript
const adminLoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(6),
});
```

**老師登入：**
```typescript
const teacherLoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(6),
});
```

**建立班級：**
```typescript
const createClassSchema = z.object({
  name: z.string().min(1),
  timezone: z.string().default("Asia/Taipei"),
});
```

**建立家庭：**
```typescript
const createFamilySchema = z.object({
  parentName: z.string().min(1),
  note: z.string().optional(),
  classCourseId: z.string().uuid(),
  studentNames: z.array(z.string().min(1)).min(1),
});
```

詳細 schemas 請參考各端點說明。

---

## API 端點概覽

### 認證端點

| 方法 | 路徑 | 說明 | 認證 |
|------|------|------|------|
| POST | `/api/auth/admin/login` | 管理員登入 | 無 |
| POST | `/api/auth/admin/logout` | 管理員登出 | Session |
| POST | `/api/auth/teacher/login` | 老師登入 | 無 |
| POST | `/api/auth/teacher/logout` | 老師登出 | Session |

### 管理員端點

| 方法 | 路徑 | 說明 | 認證 |
|------|------|------|------|
| GET | `/api/admin/classes` | 列出所有班級 | Admin |
| POST | `/api/admin/classes` | 建立班級 | Admin |
| PUT | `/api/admin/classes/:id` | 更新班級 | Admin |
| DELETE | `/api/admin/classes/:id` | 刪除班級 | Admin |
| GET | `/api/admin/courses` | 列出所有課程 | Admin |
| POST | `/api/admin/courses` | 建立課程 | Admin |
| PUT | `/api/admin/courses/:id` | 更新課程 | Admin |
| DELETE | `/api/admin/courses/:id` | 刪除課程 | Admin |
| GET | `/api/admin/class-courses` | 列出班級-課程關聯 | Admin |
| POST | `/api/admin/class-courses` | 建立班級-課程關聯 | Admin |
| DELETE | `/api/admin/class-courses/:id` | 刪除班級-課程關聯 | Admin |
| GET | `/api/admin/teacher` | 列出所有老師 | Admin |
| POST | `/api/admin/teacher` | 建立老師帳號 | Admin |
| PUT | `/api/admin/teacher/:id` | 更新老師資訊 | Admin |
| POST | `/api/admin/teacher/:id/reset-password` | 重置老師密碼 | Admin |
| GET | `/api/admin/teacher/:id/assignments` | 取得老師班級分配 | Admin |
| POST | `/api/admin/teacher/:id/assignments` | 分配老師至班級 | Admin |
| GET | `/api/admin/weekly-tasks` | 列出每週任務 | Admin |
| POST | `/api/admin/weekly-tasks` | 建立每週任務 | Admin |
| PUT | `/api/admin/weekly-tasks/:id` | 更新每週任務 | Admin |
| DELETE | `/api/admin/weekly-tasks/:id` | 刪除每週任務 | Admin |
| GET | `/api/admin/scoring-config` | 取得評分設定 | Admin |
| PUT | `/api/admin/scoring-config` | 更新評分設定 | Admin |

### 老師端點

| 方法 | 路徑 | 說明 | 認證 |
|------|------|------|------|
| GET | `/api/teacher/class-courses` | 列出已分配班級 | Teacher |
| GET | `/api/teacher/families` | 列出家庭 | Teacher |
| POST | `/api/teacher/families` | 建立家庭+孩子 | Teacher |
| GET | `/api/teacher/families/:id` | 取得家庭詳細資訊 | Teacher |
| POST | `/api/teacher/families/:id/reset-link` | 重置家庭連結 | Teacher |
| GET | `/api/teacher/classes/:id/summary` | 取得班級表現摘要 | Teacher |
| GET | `/api/teacher/weekly-tasks` | 列出每週任務 | Teacher |

### 家長/孩子端點

| 方法 | 路徑 | 說明 | 認證 |
|------|------|------|------|
| GET | `/api/family/link/:token` | 驗證權杖並取得家庭資訊 | Token |
| GET | `/api/family/weekly-task` | 取得本週任務 | Token |
| POST | `/api/family/submissions` | 提交錄音 | Token |
| GET | `/api/family/performance` | 取得學生表現 | Token |

### AI 與音訊端點

| 方法 | 路徑 | 說明 | 認證 |
|------|------|------|------|
| POST | `/api/ai/score` | AI 評分（ASR + LLM） | Admin/Teacher |
| POST | `/api/audio/upload` | 上傳音訊檔案 | Admin/Teacher |
| POST | `/api/audio/generate-tts` | 產生 TTS 音訊 | Admin |

---

## 下一步

詳細端點說明請參考後續章節：

- [認證端點](./authentication.md)（待補充）
- [管理員端點](./admin.md)（待補充）
- [老師端點](./teacher.md)（待補充）
- [家長/孩子端點](./family.md)（待補充）
- [AI 與音訊端點](./ai-audio.md)（待補充）

---

**最後更新：** 2026-02-20
**版本：** 1.0.0
