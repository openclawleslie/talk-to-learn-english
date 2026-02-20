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

## 認證端點

### POST /api/auth/admin/login

管理員登入端點。驗證憑證後建立 session cookie。

**請求格式：**

```json
{
  "username": "string (必填，最少 1 字元)",
  "password": "string (必填，最少 1 字元)"
}
```

**Zod Schema：**
```typescript
const adminLoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});
```

**成功回應（200）：**
```json
{
  "ok": true,
  "data": {
    "role": "admin"
  }
}
```

**錯誤回應：**

驗證失敗（400）：
```json
{
  "ok": false,
  "error": {
    "message": "Validation failed",
    "details": {
      "formErrors": [],
      "fieldErrors": {
        "username": ["Required"],
        "password": ["Required"]
      }
    }
  }
}
```

憑證錯誤（401）：
```json
{
  "ok": false,
  "error": {
    "message": "Invalid credentials"
  }
}
```

**範例請求：**
```bash
curl -X POST http://localhost:3000/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"mypassword"}' \
  -c cookies.txt
```

**注意事項：**
- 成功登入後會設定 `ttle_session` cookie（有效期 24 小時）
- 憑證從環境變數 `ADMIN_USERNAME` 和 `ADMIN_PASSWORD` 讀取
- 後續請求需攜帶此 cookie 以維持認證狀態

---

### POST /api/auth/admin/logout

管理員登出端點。清除 session cookie 並重新導向至首頁。

**請求格式：**

無需 request body。

**成功回應（303）：**

重新導向至 `/`

**範例請求：**
```bash
curl -X POST http://localhost:3000/api/auth/admin/logout \
  -b cookies.txt \
  -L
```

**注意事項：**
- 必須已登入（攜帶有效 session cookie）
- 登出後 session cookie 會被清除
- 自動重新導向至首頁（HTTP 303）

---

### POST /api/auth/teacher/login

老師登入端點。驗證憑證後建立 session cookie。

**請求格式：**

```json
{
  "email": "string (必填，email 格式)",
  "password": "string (必填，最少 1 字元)"
}
```

**Zod Schema：**
```typescript
const teacherLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
```

**成功回應（200）：**
```json
{
  "ok": true,
  "data": {
    "role": "teacher",
    "teacherId": "uuid"
  }
}
```

或（當老師同時是管理員時）：
```json
{
  "ok": true,
  "data": {
    "role": "admin",
    "teacherId": "uuid"
  }
}
```

**錯誤回應：**

驗證失敗（400）：
```json
{
  "ok": false,
  "error": {
    "message": "Validation failed",
    "details": {
      "formErrors": [],
      "fieldErrors": {
        "email": ["Invalid email"],
        "password": ["Required"]
      }
    }
  }
}
```

憑證錯誤或帳號停用（401）：
```json
{
  "ok": false,
  "error": {
    "message": "Invalid credentials"
  }
}
```

**範例請求：**
```bash
curl -X POST http://localhost:3000/api/auth/teacher/login \
  -H "Content-Type: application/json" \
  -d '{"email":"teacher@example.com","password":"mypassword"}' \
  -c cookies.txt
```

**注意事項：**
- 成功登入後會設定 `ttle_session` cookie（有效期 24 小時）
- 密碼使用 bcrypt 進行雜湊比對
- 帳號必須處於啟用狀態（`isActive = true`）
- 若老師同時是管理員（`isAdmin = true`），role 會是 "admin"
- `teacherId` 用於後續 API 請求的權限檢查

---

### POST /api/auth/teacher/logout

老師登出端點。清除 session cookie。

**請求格式：**

無需 request body。

**成功回應（200）：**
```json
{
  "ok": true,
  "data": {
    "success": true
  }
}
```

**範例請求：**
```bash
curl -X POST http://localhost:3000/api/auth/teacher/logout \
  -b cookies.txt
```

**注意事項：**
- 必須已登入（攜帶有效 session cookie）
- 登出後 session cookie 會被清除

---

## 管理員端點

所有管理員端點都需要管理員認證（`requireAdmin()`）。請確保在請求時攜帶有效的 session cookie。

### GET /api/admin/classes

列出所有班級。

**認證要求：** Admin

**請求格式：**

無需 request body。

**成功回應（200）：**
```json
{
  "ok": true,
  "data": {
    "classes": [
      {
        "id": "uuid",
        "name": "一年級 A 班",
        "timezone": "Asia/Shanghai",
        "created_at": "2026-01-15T08:00:00.000Z"
      }
    ]
  }
}
```

**範例請求：**
```bash
curl -X GET http://localhost:3000/api/admin/classes \
  -b cookies.txt
```

**注意事項：**
- 回傳所有班級，依 `name` 欄位排序
- 班級用於組織學生和課程

---

### POST /api/admin/classes

建立新班級。

**認證要求：** Admin

**請求格式：**

```json
{
  "name": "string (必填，最少 1 字元)",
  "timezone": "string (選填，預設 'Asia/Shanghai')"
}
```

**Zod Schema：**
```typescript
const createClassSchema = z.object({
  name: z.string().min(1),
  timezone: z.string().min(1).default("Asia/Shanghai"),
});
```

**成功回應（201）：**
```json
{
  "ok": true,
  "data": {
    "id": "uuid",
    "name": "一年級 A 班",
    "timezone": "Asia/Taipei",
    "created_at": "2026-02-20T08:00:00.000Z"
  }
}
```

**錯誤回應：**

驗證失敗（400）：
```json
{
  "ok": false,
  "error": {
    "message": "Validation failed",
    "details": {
      "formErrors": [],
      "fieldErrors": {
        "name": ["Required"]
      }
    }
  }
}
```

**範例請求：**
```bash
curl -X POST http://localhost:3000/api/admin/classes \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"name":"二年級 B 班","timezone":"Asia/Taipei"}'
```

**注意事項：**
- `timezone` 影響該班級的日期顯示格式
- 常見時區：`Asia/Shanghai`, `Asia/Taipei`, `Asia/Hong_Kong`

---

### PUT /api/admin/classes/:id

更新指定班級資訊。

**認證要求：** Admin

**請求格式：**

```json
{
  "name": "string (必填，最少 1 字元)",
  "timezone": "string (選填，預設 'Asia/Shanghai')"
}
```

**Zod Schema：** `createClassSchema`（與 POST 相同）

**成功回應（200）：**
```json
{
  "ok": true,
  "data": {
    "id": "uuid",
    "name": "一年級 A 班（更新後）",
    "timezone": "Asia/Taipei",
    "created_at": "2026-01-15T08:00:00.000Z"
  }
}
```

**錯誤回應：**

班級不存在（404）：
```json
{
  "ok": false,
  "error": {
    "message": "Class not found"
  }
}
```

**範例請求：**
```bash
curl -X PUT http://localhost:3000/api/admin/classes/{id} \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"name":"一年級 A 班（更新）","timezone":"Asia/Shanghai"}'
```

---

### DELETE /api/admin/classes/:id

刪除指定班級。

**認證要求：** Admin

**請求格式：**

無需 request body。

**成功回應（200）：**
```json
{
  "ok": true,
  "data": {
    "message": "Class deleted successfully"
  }
}
```

**錯誤回應：**

班級不存在（404）：
```json
{
  "ok": false,
  "error": {
    "message": "Class not found"
  }
}
```

**範例請求：**
```bash
curl -X DELETE http://localhost:3000/api/admin/classes/{id} \
  -b cookies.txt
```

**注意事項：**
- 刪除班級會級聯刪除相關的 class-courses 和 families
- 請謹慎使用此操作

---

### GET /api/admin/courses

列出所有課程。

**認證要求：** Admin

**請求格式：**

無需 request body。

**成功回應（200）：**
```json
{
  "ok": true,
  "data": {
    "courses": [
      {
        "id": "uuid",
        "name": "英語會話",
        "level": "Beginner",
        "created_at": "2026-01-15T08:00:00.000Z"
      }
    ]
  }
}
```

**範例請求：**
```bash
curl -X GET http://localhost:3000/api/admin/courses \
  -b cookies.txt
```

**注意事項：**
- 回傳所有課程，依 `name` 欄位排序
- 課程代表教學內容等級（如 Beginner, Intermediate, Advanced）

---

### POST /api/admin/courses

建立新課程。

**認證要求：** Admin

**請求格式：**

```json
{
  "name": "string (必填，最少 1 字元)",
  "level": "string (必填，最少 1 字元)"
}
```

**Zod Schema：**
```typescript
const createCourseSchema = z.object({
  name: z.string().min(1),
  level: z.string().min(1),
});
```

**成功回應（201）：**
```json
{
  "ok": true,
  "data": {
    "id": "uuid",
    "name": "英語會話",
    "level": "Intermediate",
    "created_at": "2026-02-20T08:00:00.000Z"
  }
}
```

**錯誤回應：**

驗證失敗（400）：
```json
{
  "ok": false,
  "error": {
    "message": "Validation failed",
    "details": {
      "formErrors": [],
      "fieldErrors": {
        "name": ["Required"],
        "level": ["Required"]
      }
    }
  }
}
```

**範例請求：**
```bash
curl -X POST http://localhost:3000/api/admin/courses \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"name":"進階英語","level":"Advanced"}'
```

---

### PUT /api/admin/courses/:id

更新指定課程資訊。

**認證要求：** Admin

**請求格式：**

```json
{
  "name": "string (必填，最少 1 字元)",
  "level": "string (必填，最少 1 字元)"
}
```

**Zod Schema：** `createCourseSchema`（與 POST 相同）

**成功回應（200）：**
```json
{
  "ok": true,
  "data": {
    "id": "uuid",
    "name": "進階英語會話",
    "level": "Advanced",
    "created_at": "2026-01-15T08:00:00.000Z"
  }
}
```

**錯誤回應：**

課程不存在（404）：
```json
{
  "ok": false,
  "error": {
    "message": "Course not found"
  }
}
```

**範例請求：**
```bash
curl -X PUT http://localhost:3000/api/admin/courses/{id} \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"name":"進階英語會話","level":"Advanced"}'
```

---

### DELETE /api/admin/courses/:id

刪除指定課程。

**認證要求：** Admin

**請求格式：**

無需 request body。

**成功回應（200）：**
```json
{
  "ok": true,
  "data": {
    "message": "Course deleted successfully"
  }
}
```

**錯誤回應：**

課程不存在（404）：
```json
{
  "ok": false,
  "error": {
    "message": "Course not found"
  }
}
```

**範例請求：**
```bash
curl -X DELETE http://localhost:3000/api/admin/courses/{id} \
  -b cookies.txt
```

**注意事項：**
- 刪除課程會級聯刪除相關的 class-courses
- 請謹慎使用此操作

---

### GET /api/admin/class-courses

列出所有班級-課程關聯。

**認證要求：** Admin

**請求格式：**

無需 request body。

**成功回應（200）：**
```json
{
  "ok": true,
  "data": {
    "classCourses": [
      {
        "id": "uuid",
        "class_id": "uuid",
        "course_id": "uuid",
        "class_name": "一年級 A 班",
        "course_name": "英語會話"
      }
    ]
  }
}
```

**範例請求：**
```bash
curl -X GET http://localhost:3000/api/admin/class-courses \
  -b cookies.txt
```

**注意事項：**
- 回傳所有班級-課程關聯，包含班級和課程名稱
- 透過 LEFT JOIN 取得可讀性較高的資料

---

### POST /api/admin/class-courses

建立班級-課程關聯。

**認證要求：** Admin

**請求格式：**

```json
{
  "classId": "string (必填，UUID)",
  "courseId": "string (必填，UUID)"
}
```

**Zod Schema：**
```typescript
const createClassCourseSchema = z.object({
  classId: z.string().uuid(),
  courseId: z.string().uuid(),
});
```

**成功回應（201）：**
```json
{
  "ok": true,
  "data": {
    "id": "uuid",
    "class_id": "uuid",
    "course_id": "uuid"
  }
}
```

**錯誤回應：**

驗證失敗（400）：
```json
{
  "ok": false,
  "error": {
    "message": "Validation failed",
    "details": {
      "formErrors": [],
      "fieldErrors": {
        "classId": ["Invalid uuid"],
        "courseId": ["Invalid uuid"]
      }
    }
  }
}
```

**範例請求：**
```bash
curl -X POST http://localhost:3000/api/admin/class-courses \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"classId":"...","courseId":"..."}'
```

**注意事項：**
- 建立班級和課程之間的關聯
- 一個班級可以有多個課程，一個課程可以分配給多個班級

---

### DELETE /api/admin/class-courses/:id

刪除指定班級-課程關聯。

**認證要求：** Admin

**請求格式：**

無需 request body。

**成功回應（200）：**
```json
{
  "ok": true,
  "data": {
    "message": "Class course deleted successfully"
  }
}
```

**範例請求：**
```bash
curl -X DELETE http://localhost:3000/api/admin/class-courses/{id} \
  -b cookies.txt
```

**注意事項：**
- 刪除關聯不會刪除班級或課程本身
- 會級聯刪除相關的 families 和 weekly_tasks

---

### GET /api/admin/teacher

列出所有老師及其班級分配。

**認證要求：** Admin

**請求格式：**

無需 request body。

**成功回應（200）：**
```json
{
  "ok": true,
  "data": {
    "teachers": [
      {
        "id": "uuid",
        "name": "張老師",
        "email": "zhang@example.com",
        "is_active": true,
        "created_at": "2026-01-15T08:00:00.000Z",
        "classCourseNames": ["一年級 A 班-英語會話", "二年級 B 班-進階英語"]
      }
    ]
  }
}
```

**範例請求：**
```bash
curl -X GET http://localhost:3000/api/admin/teacher \
  -b cookies.txt
```

**注意事項：**
- 回傳所有老師（不含密碼雜湊）
- `classCourseNames` 陣列顯示老師負責的班級-課程組合
- 依 `created_at` 排序

---

### POST /api/admin/teacher

建立新老師帳號。

**認證要求：** Admin

**請求格式：**

```json
{
  "name": "string (必填，最少 1 字元)",
  "email": "string (必填，email 格式)",
  "password": "string (必填，最少 6 字元)",
  "classCourseIds": "array of UUID (選填，預設 [])"
}
```

**Zod Schema：**
```typescript
const createTeacherSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  classCourseIds: z.array(z.string().uuid()).default([]),
});
```

**成功回應（201）：**
```json
{
  "ok": true,
  "data": {
    "id": "uuid",
    "name": "張老師",
    "email": "zhang@example.com",
    "password_hash": "...",
    "is_active": true,
    "is_admin": false,
    "created_at": "2026-02-20T08:00:00.000Z"
  }
}
```

**錯誤回應：**

驗證失敗（400）：
```json
{
  "ok": false,
  "error": {
    "message": "Validation failed",
    "details": {
      "formErrors": [],
      "fieldErrors": {
        "email": ["Invalid email"],
        "password": ["String must contain at least 6 character(s)"]
      }
    }
  }
}
```

**範例請求：**
```bash
curl -X POST http://localhost:3000/api/admin/teacher \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"name":"李老師","email":"li@example.com","password":"pass123","classCourseIds":["..."]}'
```

**注意事項：**
- 密碼使用 bcrypt（salt rounds = 10）進行雜湊
- 新建老師預設為啟用狀態（`isActive = true`）
- 新建老師預設非管理員（`isAdmin = false`）
- 如提供 `classCourseIds`，會自動建立 teacher_assignments

---

### PUT /api/admin/teacher/:id

更新指定老師資訊。

**認證要求：** Admin

**請求格式：**

```json
{
  "name": "string (選填，最少 1 字元)",
  "email": "string (選填，email 格式)",
  "password": "string (選填，最少 6 字元)",
  "classCourseIds": "array of UUID (選填)"
}
```

**Zod Schema：**
```typescript
const updateTeacherSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  classCourseIds: z.array(z.string().uuid()).optional(),
});
```

**成功回應（200）：**
```json
{
  "ok": true,
  "data": {
    "id": "uuid",
    "name": "張老師（更新）",
    "email": "zhang.new@example.com",
    "password_hash": "...",
    "is_active": true,
    "is_admin": false,
    "created_at": "2026-01-15T08:00:00.000Z"
  }
}
```

**範例請求：**
```bash
curl -X PUT http://localhost:3000/api/admin/teacher/{id} \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"name":"張老師（更新）","classCourseIds":["..."]}'
```

**注意事項：**
- 所有欄位皆為選填，僅更新提供的欄位
- 若提供 `classCourseIds`，會先刪除現有分配再建立新分配
- 若提供 `password`，會重新進行 bcrypt 雜湊

---

### PATCH /api/admin/teacher/:id

部分更新指定老師資訊（無驗證）。

**認證要求：** Admin

**請求格式：**

接受任意 JSON payload（不進行 schema 驗證）。

**成功回應（200）：**
```json
{
  "ok": true,
  "data": {
    "message": "Teacher updated successfully"
  }
}
```

**範例請求：**
```bash
curl -X PATCH http://localhost:3000/api/admin/teacher/{id} \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"is_active":false}'
```

**注意事項：**
- 此端點不進行輸入驗證，請謹慎使用
- 常用於快速更新單一欄位（如 `is_active`, `is_admin`）

---

### DELETE /api/admin/teacher/:id

刪除指定老師。

**認證要求：** Admin

**請求格式：**

無需 request body。

**成功回應（200）：**
```json
{
  "ok": true,
  "data": {
    "message": "Teacher deleted successfully"
  }
}
```

**範例請求：**
```bash
curl -X DELETE http://localhost:3000/api/admin/teacher/{id} \
  -b cookies.txt
```

**注意事項：**
- 刪除老師會級聯刪除相關的 teacher_assignments
- 請謹慎使用此操作

---

### POST /api/admin/teacher/:id/reset-password

重置指定老師的密碼。

**認證要求：** Admin

**請求格式：**

```json
{
  "password": "string (必填，最少 6 字元)"
}
```

**Zod Schema：**
```typescript
const resetPasswordSchema = z.object({
  password: z.string().min(6, "密码至少6位"),
});
```

**成功回應（200）：**
```json
{
  "ok": true,
  "data": {
    "message": "Password reset successfully"
  }
}
```

**錯誤回應：**

驗證失敗（400）：
```json
{
  "ok": false,
  "error": {
    "message": "Validation failed",
    "details": {
      "formErrors": [],
      "fieldErrors": {
        "password": ["密码至少6位"]
      }
    }
  }
}
```

**範例請求：**
```bash
curl -X POST http://localhost:3000/api/admin/teacher/{id}/reset-password \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"password":"newpass123"}'
```

**注意事項：**
- 密碼使用 bcrypt（salt rounds = 10）進行雜湊
- 用於管理員協助老師重置密碼

---

### GET /api/admin/teacher/:id/assignments

取得指定老師的班級分配。

**認證要求：** Admin

**請求格式：**

無需 request body。

**成功回應（200）：**
```json
{
  "ok": true,
  "data": {
    "assignments": [
      {
        "id": "uuid",
        "teacher_id": "uuid",
        "class_course_id": "uuid"
      }
    ]
  }
}
```

**範例請求：**
```bash
curl -X GET http://localhost:3000/api/admin/teacher/{id}/assignments \
  -b cookies.txt
```

**注意事項：**
- 回傳老師負責的所有 class-course 關聯
- 建議搭配 GET /api/admin/class-courses 取得完整資訊

---

### GET /api/admin/weekly-tasks

列出所有每週任務。

**認證要求：** Admin

**請求格式：**

無需 request body。

**成功回應（200）：**
```json
{
  "ok": true,
  "data": {
    "tasks": [
      {
        "id": "uuid",
        "class_course_id": "uuid",
        "class_name": "一年級 A 班",
        "course_name": "英語會話",
        "week_start": "2026-02-17T00:00:00.000Z",
        "week_end": "2026-02-23T23:59:59.000Z",
        "status": "published",
        "created_at": "2026-02-17T00:00:00.000Z"
      }
    ]
  }
}
```

**範例請求：**
```bash
curl -X GET http://localhost:3000/api/admin/weekly-tasks \
  -b cookies.txt
```

**注意事項：**
- 回傳所有每週任務，包含班級和課程名稱
- 依 `week_start` 排序
- `status` 可能為 "draft" 或 "published"

---

### POST /api/admin/weekly-tasks

建立每週任務。

**認證要求：** Admin

**請求格式：**

```json
{
  "classCourseIds": "array of UUID (必填，最少 1 個)",
  "weekStart": "string (必填，ISO 8601 datetime)",
  "weekEnd": "string (必填，ISO 8601 datetime)",
  "status": "string (選填，'draft' 或 'published'，預設 'published')",
  "items": [
    {
      "orderIndex": "number (必填，1-10)",
      "sentenceText": "string (必填，最少 1 字元)",
      "referenceAudioUrl": "string (選填，URL)"
    }
  ]
}
```

**Zod Schema：**
```typescript
const weeklyTaskSchema = z.object({
  classCourseIds: z.array(z.string().uuid()).min(1),
  weekStart: z.string().datetime(),
  weekEnd: z.string().datetime(),
  status: z.enum(["draft", "published"]).default("published"),
  items: z.array(
    z.object({
      orderIndex: z.number().int().min(1).max(10),
      sentenceText: z.string().min(1),
      referenceAudioUrl: z.string().url().optional(),
    })
  ).length(10),
});
```

**成功回應（201）：**
```json
{
  "ok": true,
  "data": [
    {
      "id": "uuid",
      "class_course_id": "uuid",
      "week_start": "2026-02-17T00:00:00.000Z",
      "week_end": "2026-02-23T23:59:59.000Z",
      "status": "published",
      "created_by_admin": "uuid"
    }
  ]
}
```

**錯誤回應：**

驗證失敗（400）：
```json
{
  "ok": false,
  "error": {
    "message": "Validation failed",
    "details": {
      "formErrors": [],
      "fieldErrors": {
        "items": ["Array must contain exactly 10 element(s)"]
      }
    }
  }
}
```

班級課程不存在（400）：
```json
{
  "ok": false,
  "error": {
    "message": "Class course not found",
    "details": {
      "classCourseId": "uuid"
    }
  }
}
```

任務已存在（409）：
```json
{
  "ok": false,
  "error": {
    "message": "Weekly task already exists",
    "details": {
      "classCourseId": "uuid",
      "weekStart": "2026-02-17T00:00:00.000Z"
    }
  }
}
```

**範例請求：**
```bash
curl -X POST http://localhost:3000/api/admin/weekly-tasks \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "classCourseIds": ["..."],
    "weekStart": "2026-02-17T00:00:00.000Z",
    "weekEnd": "2026-02-23T23:59:59.000Z",
    "status": "published",
    "items": [
      {"orderIndex": 1, "sentenceText": "Hello, how are you?"},
      {"orderIndex": 2, "sentenceText": "I am fine, thank you."},
      ...
    ]
  }'
```

**注意事項：**
- 必須提供正好 10 個 items（`orderIndex` 1-10）
- 可為多個 `classCourseIds` 批次建立相同任務
- 如未提供 `referenceAudioUrl`，會自動呼叫 AI TTS 生成參考音訊
- 不可為同一 `classCourseId` 和 `weekStart` 建立重複任務
- `createdByAdmin` 會自動填入當前登入的管理員 ID

---

### GET /api/admin/weekly-tasks/:id

取得指定每週任務詳細資訊。

**認證要求：** Admin

**請求格式：**

無需 request body。

**成功回應（200）：**
```json
{
  "ok": true,
  "data": {
    "task": {
      "id": "uuid",
      "class_course_id": "uuid",
      "week_start": "2026-02-17T00:00:00.000Z",
      "week_end": "2026-02-23T23:59:59.000Z",
      "status": "published",
      "created_by_admin": "uuid"
    },
    "items": [
      {
        "id": "uuid",
        "order_index": 1,
        "sentence_text": "Hello, how are you?",
        "reference_audio_url": "https://...",
        "reference_audio_status": "ready"
      }
    ]
  }
}
```

**錯誤回應：**

任務不存在（404）：
```json
{
  "ok": false,
  "error": {
    "message": "Weekly task not found",
    "details": {
      "id": "uuid"
    }
  }
}
```

**範例請求：**
```bash
curl -X GET http://localhost:3000/api/admin/weekly-tasks/{id} \
  -b cookies.txt
```

**注意事項：**
- 回傳任務基本資訊和所有 task items
- `items` 依 `order_index` 排序
- `reference_audio_status` 可能為 "ready", "pending", 或 "failed"

---

### GET /api/admin/scoring-config

取得評分設定。

**認證要求：** Admin

**請求格式：**

無需 request body。

**成功回應（200）：**
```json
{
  "ok": true,
  "data": {
    "config": {
      "oneStarMax": 70,
      "twoStarMax": 84
    }
  }
}
```

**範例請求：**
```bash
curl -X GET http://localhost:3000/api/admin/scoring-config \
  -b cookies.txt
```

**注意事項：**
- 如資料庫無設定，回傳預設值：`{ oneStarMax: 70, twoStarMax: 84 }`
- 評分邏輯：
  - 分數 ≤ oneStarMax → 1 星
  - oneStarMax < 分數 ≤ twoStarMax → 2 星
  - 分數 > twoStarMax → 3 星

---

### PUT /api/admin/scoring-config

更新評分設定。

**認證要求：** Admin

**請求格式：**

```json
{
  "oneStarMax": "number (必填，1-99)",
  "twoStarMax": "number (必填，1-99)"
}
```

**Zod Schema：**
```typescript
const scoringConfigSchema = z.object({
  oneStarMax: z.number().int().min(1).max(99),
  twoStarMax: z.number().int().min(1).max(99),
});
```

**成功回應（200）：**
```json
{
  "ok": true,
  "data": {
    "id": "uuid",
    "scoring_thresholds": {
      "oneStarMax": 75,
      "twoStarMax": 88
    },
    "created_at": "2026-02-20T08:00:00.000Z"
  }
}
```

**錯誤回應：**

驗證失敗（400）：
```json
{
  "ok": false,
  "error": {
    "message": "Validation failed",
    "details": {
      "formErrors": [],
      "fieldErrors": {
        "oneStarMax": ["Number must be less than or equal to 99"],
        "twoStarMax": ["Number must be greater than or equal to 1"]
      }
    }
  }
}
```

**範例請求：**
```bash
curl -X PUT http://localhost:3000/api/admin/scoring-config \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"oneStarMax":75,"twoStarMax":88}'
```

**注意事項：**
- 如資料庫已有設定，會更新現有記錄
- 如資料庫無設定，會建立新記錄
- 建議 `oneStarMax < twoStarMax` 以確保邏輯正確

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
