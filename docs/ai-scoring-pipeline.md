# AI 評分管線架構文件

## 概述

本系統使用 AI 驅動的評分管線來評估學生的英文口說作業。學生錄製音訊後，系統會自動進行語音辨識 (ASR)、AI 評分，並根據設定的門檻值轉換為星級評等 (1-3 星)。

## 架構流程圖

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          學生提交音訊                                      │
│                     POST /api/family/submissions                        │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Phase 1: 快速驗證 (並行)                                                  │
│  • 驗證家長連結 token                                                     │
│  • 查詢任務項目 (taskItem)                                                │
│  • 讀取評分設定 (adminConfig)                                             │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Phase 2: 學生驗證                                                         │
│  • 驗證學生是否屬於該家庭                                                  │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Phase 3: 重型操作 (並行)                                                  │
│  ┌──────────────────────┐     ┌───────────────────────┐                │
│  │  上傳音訊至 Blob     │     │   AI 語音辨識 (ASR)    │                │
│  │  (Vercel Blob)       │     │   transcribeAudio()   │                │
│  │  uploadAudio()       │     │                       │                │
│  └──────────────────────┘     └───────────────────────┘                │
│           │                              │                              │
│           ▼                              ▼                              │
│    audioUrl: string              transcript: string                    │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Phase 4: AI 評分                                                          │
│  ┌───────────────────────────────────────────────┐                      │
│  │  scoreSpokenSentence()                        │                      │
│  │  輸入:                                         │                      │
│  │   - sentence: 標準句子                         │                      │
│  │   - transcript: 學生轉錄文字                   │                      │
│  │  輸出:                                         │                      │
│  │   - score: 0-100 分數                          │                      │
│  │   - feedback: AI 反饋文字                      │                      │
│  └───────────────────────────────────────────────┘                      │
│                          │                                               │
│                          ▼                                               │
│  ┌───────────────────────────────────────────────┐                      │
│  │  scoreToStars()                               │                      │
│  │  根據門檻值將分數轉為星級                        │                      │
│  │   - score < oneStarMax      → 1 星            │                      │
│  │   - score <= twoStarMax     → 2 星            │                      │
│  │   - score > twoStarMax      → 3 星            │                      │
│  └───────────────────────────────────────────────┘                      │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Phase 5: 儲存結果                                                         │
│  • INSERT INTO submissions                                              │
│    - studentId, taskItemId                                              │
│    - audioUrl, transcript                                               │
│    - score, stars, feedback                                             │
│  • ON CONFLICT UPDATE (學生可重新錄製)                                    │
└─────────────────────────────────────────────────────────────────────────┘
```

## 元件詳解

### 1. API 端點

#### `/api/family/submissions` (POST)
**用途**: 學生提交音訊作業的主要端點

**請求格式**: `multipart/form-data`
```typescript
{
  file: File,           // 音訊檔案
  token: string,        // 家長連結 token
  studentId: string,    // 學生 ID (UUID)
  taskItemId: string    // 任務項目 ID (UUID)
}
```

**回應格式**:
```typescript
{
  id: string,
  studentId: string,
  taskItemId: string,
  audioUrl: string,     // Vercel Blob URL
  transcript: string,   // ASR 轉錄文字
  score: number,        // 0-100 分數
  stars: number,        // 1-3 星級
  feedback: string,     // AI 反饋
  createdAt: Date
}
```

**效能優化**:
- Phase 1-2: 廉價的資料庫查詢並行執行，快速拒絕無效請求
- Phase 3: 上傳音訊和語音辨識並行執行
- Phase 4-5: AI 評分和寫入資料庫循序執行

---

#### `/api/ai/score` (POST)
**用途**: 獨立的評分 API，可直接傳遞轉錄文字或音訊檔案

**請求格式 1**: `application/json`
```typescript
{
  sentenceText: string,  // 標準句子
  transcript: string     // 已轉錄的文字
}
```

**請求格式 2**: `multipart/form-data`
```typescript
{
  sentenceText: string,  // 標準句子
  file: File            // 音訊檔案 (會自動轉錄)
}
```

**回應格式**:
```typescript
{
  transcript: string,    // 轉錄文字
  score: number,        // 0-100 分數
  feedback: string,     // AI 反饋
  stars: number         // 1-3 星級
}
```

---

### 2. AI 函數

#### `transcribeAudio(file: File): Promise<string>`
**位置**: `lib/ai.ts`

**功能**: 使用 OpenAI-compatible API 進行語音辨識

**實作細節**:
```typescript
const response = await client.audio.transcriptions.create({
  file,
  model: env.AI_TRANSCRIBE_MODEL,
});
return response.text;
```

**變體函數**: `transcribeAudioFromUrl(audioUrl: string)`
- 從 URL 下載音訊
- 自動偵測 MIME 類型 (從 Content-Type 或 URL 副檔名)
- 轉換為 File 物件後進行轉錄

---

#### `scoreSpokenSentence(input): Promise<{score: number, feedback: string}>`
**位置**: `lib/ai.ts`

**輸入**:
```typescript
{
  sentence: string,    // 標準句子
  transcript: string   // 學生轉錄文字
}
```

**輸出**:
```typescript
{
  score: number,       // 0-100 整數
  feedback: string     // 簡短反饋句子
}
```

**提示工程 (Prompt)**:
```
You are an English speaking evaluator for children.
Return strict JSON with keys: score (0-100 integer), feedback (short sentence).
Target sentence: {sentence}
Transcript: {transcript}
```

**重要實作細節**:
- 使用 `client.responses.create()` 而非 `chat.completions.create()`
- 解析 `response.output_text` 為 JSON
- 分數限制: `Math.min(100, Math.max(0, Math.round(parsed.score)))`
- AI 模型: `env.AI_SCORING_MODEL` (預設: `gpt-4o-mini`)

---

#### `scoreToStars(score: number, thresholds): number`
**位置**: `lib/scoring.ts`

**功能**: 將 0-100 分數轉換為 1-3 星級

**演算法**:
```typescript
if (score < thresholds.oneStarMax) return 1;
if (score <= thresholds.twoStarMax) return 2;
return 3;
```

**門檻值結構**:
```typescript
{
  oneStarMax: number,   // 預設: 70
  twoStarMax: number    // 預設: 84
}
```

**星級範圍 (預設門檻)**:
- 1 星: 0-69 分
- 2 星: 70-84 分
- 3 星: 85-100 分

---

### 3. 儲存層

#### `uploadAudio(path: string, file: File)`
**位置**: `lib/blob.ts`

**功能**: 上傳音訊至 Vercel Blob Storage

**設定**:
- `access: "public"` - 公開存取
- `addRandomSuffix: true` - 避免檔名衝突

**路徑格式**: `submissions/{timestamp}-recording.{extension}`

---

#### 資料庫 Schema

**submissions 表格**:
```typescript
{
  id: UUID (PK),
  studentId: UUID (FK → students.id),
  taskItemId: UUID (FK → taskItems.id),
  audioUrl: TEXT,        // Vercel Blob URL
  transcript: TEXT,      // ASR 轉錄文字
  score: INTEGER,        // 0-100 分數
  stars: INTEGER,        // 1-3 星級
  feedback: TEXT,        // AI 反饋
  createdAt: TIMESTAMP,

  UNIQUE(studentId, taskItemId)  // 每個學生每題只能有一筆提交
}
```

**衝突處理**:
- 使用 `onConflictDoUpdate` 允許學生重新錄製
- 更新所有欄位包括 `createdAt` (記錄最新提交時間)

---

## 設定

### 環境變數

必須設定以下環境變數才能啟用 AI 功能:

```env
# AI 服務設定 (OpenAI-compatible API)
AI_BASE_URL=https://api.openai.com/v1
AI_API_KEY=sk-xxx...

# AI 模型設定
AI_SCORING_MODEL=gpt-4o-mini              # 評分模型
AI_TRANSCRIBE_MODEL=gpt-4o-mini-transcribe # ASR 模型
AI_TTS_MODEL=gpt-4o-mini-tts              # TTS 模型 (參考音訊產生)

# 儲存設定
BLOB_READ_WRITE_TOKEN=vercel_blob_xxx...  # Vercel Blob token
```

**AI 服務檢查**:
- 系統會檢查 `AI_API_KEY` 和 `AI_BASE_URL` 是否存在
- 缺少任一設定會拋出錯誤: `"AI service is not configured"`

**驗證**: 使用 Zod schema (`lib/env.ts`) 在啟動時驗證所有環境變數

---

### 評分門檻設定

**管理介面**: `/admin/scoring`

**API 端點**:
- `GET /api/admin/scoring-config` - 讀取目前設定
- `PUT /api/admin/scoring-config` - 更新設定 (需 Admin 權限)

**預設值** (在 `scripts/seed.ts` 初始化):
```typescript
{
  oneStarMax: 70,   // 1 星最高分
  twoStarMax: 84    // 2 星最高分
}
```

**驗證規則** (`lib/validators.ts`):
```typescript
{
  oneStarMax: z.number().int().min(1).max(99),
  twoStarMax: z.number().int().min(1).max(99)
}
```

**儲存位置**:
- 資料表: `admin_config`
- 欄位: `scoring_thresholds_json` (JSONB)
- 查詢: 取最新一筆 (`ORDER BY created_at DESC LIMIT 1`)

---

## 關鍵實作細節

### 1. Prompt Engineering

**設計原則**:
- ✅ 明確角色: "You are an English speaking evaluator for children"
- ✅ 嚴格格式: "Return strict JSON with keys: ..."
- ✅ 具體欄位: `score (0-100 integer), feedback (short sentence)`
- ✅ 清晰輸入: 分別標示 Target sentence 和 Transcript

**為何有效**:
- 角色設定確保評分標準適合兒童程度
- 強調 "strict JSON" 確保可解析的回應
- 明確指定資料型態 (integer, short sentence) 減少格式錯誤
- 分離輸入讓 AI 明確比對標準與實際

**範例輸出**:
```json
{
  "score": 85,
  "feedback": "Great pronunciation! Minor grammar issue."
}
```

---

### 2. JSON 格式要求

**API 使用方式**:
```typescript
const response = await client.responses.create({
  model: env.AI_SCORING_MODEL,
  input: prompt,
});

const parsed = JSON.parse(response.output_text);
```

**注意事項**:
- ⚠️ 使用 `responses.create()` 而非 `chat.completions.create()`
- ⚠️ 解析 `output_text` 而非 `choices[0].message.content`
- ⚠️ 確保 AI 回應是純 JSON (無 markdown 包裝)

**錯誤處理**:
```typescript
if (!response.output_text) {
  throw new Error("Scoring model returned empty response");
}
```

---

### 3. 音訊格式處理

**支援格式**: WebM, MP3, WAV, OGG, etc.

**MIME 類型正規化** (`lib/audio-format.ts`):
- 從 HTTP `Content-Type` header 讀取
- 從 URL 副檔名推測
- 預設: `audio/webm`

**副檔名對應**:
```typescript
extensionFromMimeType("audio/webm") → "webm"
extensionFromMimeType("audio/mpeg") → "mp3"
extensionFromMimeType("audio/wav")  → "wav"
```

---

### 4. 並行優化策略

**Phase 3 並行執行**:
```typescript
const [uploaded, transcript] = await Promise.all([
  uploadAudio(blobPath, file),    // 上傳到 Blob Storage
  transcribeAudio(file),           // AI 語音辨識
]);
```

**為何這樣設計**:
- ✅ 上傳和轉錄互不依賴，可同時執行
- ✅ 節省約 50% 的總處理時間 (假設兩者耗時相近)
- ✅ 轉錄完成後立即用於評分，不需等待上傳

**Phase 1 並行執行**:
```typescript
const [link, taskItem, config] = await Promise.all([
  resolveFamilyByToken(token),
  db.select()...taskItems...,
  db.select()...adminConfig...,
]);
```

**為何這樣設計**:
- ✅ 三個查詢互不依賴
- ✅ 快速驗證，儘早拒絕無效請求
- ✅ 避免執行昂貴的 AI 操作後才發現驗證失敗

---

## 使用範例

### 範例 1: 學生提交作業

**前端程式碼**:
```typescript
const formData = new FormData();
formData.append('file', audioBlob, 'recording.webm');
formData.append('token', familyToken);
formData.append('studentId', currentStudentId);
formData.append('taskItemId', taskItem.id);

const response = await fetch('/api/family/submissions', {
  method: 'POST',
  body: formData,
});

const result = await response.json();
console.log(`分數: ${result.score}, 星級: ${result.stars}`);
console.log(`反饋: ${result.feedback}`);
```

**流程**:
1. 錄製音訊 → Blob
2. 包裝為 FormData
3. 提交至 API
4. 系統自動: ASR → AI 評分 → 儲存
5. 回傳: 分數、星級、反饋

---

### 範例 2: 獨立評分測試

**用途**: 管理員或教師測試評分系統

```typescript
// 方式 1: 直接提供轉錄文字
const response = await fetch('/api/ai/score', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sentenceText: 'The cat is on the table.',
    transcript: 'The cat is on the table.'
  })
});

// 方式 2: 上傳音訊檔案
const formData = new FormData();
formData.append('file', audioFile);
formData.append('sentenceText', 'The cat is on the table.');

const response = await fetch('/api/ai/score', {
  method: 'POST',
  body: formData
});
```

---

### 範例 3: 更新評分門檻

**管理員操作**:
```typescript
// 更新門檻值
await fetch('/api/admin/scoring-config', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    oneStarMax: 60,   // 降低 1 星門檻
    twoStarMax: 80    // 降低 2 星門檻
  })
});

// 新星級範圍:
// 1 星: 0-59 分
// 2 星: 60-80 分
// 3 星: 81-100 分
```

**影響**:
- ✅ 立即生效 (下一次提交即使用新門檻)
- ⚠️ 不影響已提交的作業 (stars 欄位已儲存)

---

## 故障排除

### 1. AI 服務無法連接

**錯誤訊息**:
```
Error: AI service is not configured (missing AI_API_KEY or AI_BASE_URL)
```

**解決方案**:
1. 檢查 `.env` 檔案是否包含:
   ```env
   AI_BASE_URL=https://api.openai.com/v1
   AI_API_KEY=sk-xxx...
   ```
2. 重啟開發伺服器: `npm run dev`
3. 驗證環境變數是否正確載入:
   ```bash
   node -e "console.log(process.env.AI_BASE_URL)"
   ```

---

### 2. JSON 解析失敗

**錯誤訊息**:
```
SyntaxError: Unexpected token in JSON at position 0
```

**可能原因**:
- AI 回應包含 markdown 格式 (如 ` ```json ... ``` `)
- AI 回應格式不正確
- `output_text` 為空

**除錯步驟**:
1. 印出原始回應:
   ```typescript
   console.log('Raw response:', response.output_text);
   ```
2. 檢查 AI_SCORING_MODEL 是否支援 JSON 輸出
3. 調整 prompt 強調 "strict JSON" 或使用 "response_format": "json"

**臨時解法**:
```typescript
// 移除可能的 markdown 包裝
let text = response.output_text.trim();
if (text.startsWith('```json')) {
  text = text.replace(/^```json\n/, '').replace(/\n```$/, '');
}
const parsed = JSON.parse(text);
```

---

### 3. 分數超出範圍

**問題**: AI 回傳分數 > 100 或 < 0

**保護機制** (已實作):
```typescript
score: Math.min(100, Math.max(0, Math.round(parsed.score)))
```

**檢查**:
- ✅ 分數會自動限制在 0-100 範圍
- ✅ 自動四捨五入為整數
- ⚠️ 若經常發生，檢查 prompt 是否明確要求 "0-100 integer"

---

### 4. 轉錄文字為空

**可能原因**:
- 音訊檔案損壞
- 音訊檔案格式不支援
- 音訊無聲或音量太小
- AI_TRANSCRIBE_MODEL 不支援該語言

**除錯步驟**:
1. 檢查音訊檔案是否可播放:
   ```typescript
   console.log('File size:', file.size);
   console.log('MIME type:', file.type);
   ```
2. 驗證音訊 URL 是否可存取
3. 測試用已知良好的音訊檔案
4. 檢查 OpenAI API 回應是否有錯誤訊息

---

### 5. 評分結果不合理

**症狀**: 完美發音只得低分，或錯誤發音得高分

**可能原因**:
- AI 模型能力不足
- Prompt 設計不當
- 轉錄文字錯誤 (ASR 問題)

**調整策略**:
1. **升級模型**: 改用更強大的模型
   ```env
   AI_SCORING_MODEL=gpt-4o  # 而非 gpt-4o-mini
   ```
2. **改進 Prompt**: 增加評分標準說明
   ```typescript
   const prompt = [
     "You are an English speaking evaluator for children.",
     "Evaluate based on: pronunciation, grammar, and completeness.",
     "Return strict JSON with keys: score (0-100 integer), feedback (short sentence).",
     `Target sentence: ${input.sentence}`,
     `Transcript: ${input.transcript}`,
   ].join("\n");
   ```
3. **檢查轉錄**: 先驗證 ASR 準確度
   ```typescript
   console.log('Transcript:', transcript);
   console.log('Expected:', sentenceText);
   ```

---

### 6. 上傳失敗

**錯誤訊息**:
```
Error: Failed to upload to Blob Storage
```

**檢查清單**:
- [ ] `BLOB_READ_WRITE_TOKEN` 環境變數已設定
- [ ] Token 權限正確 (需要 write 權限)
- [ ] 檔案大小未超過限制 (Vercel Blob 預設 4.5MB)
- [ ] 網路連線正常

**測試**:
```bash
curl -X POST https://blob.vercel-storage.com/... \
  -H "Authorization: Bearer $BLOB_READ_WRITE_TOKEN" \
  -F "file=@test.mp3"
```

---

### 7. 效能問題

**症狀**: 提交作業需要 10+ 秒

**診斷**:
1. 檢查各階段耗時:
   ```typescript
   console.time('upload');
   await uploadAudio(...);
   console.timeEnd('upload');

   console.time('transcribe');
   await transcribeAudio(...);
   console.timeEnd('transcribe');
   ```
2. 常見瓶頸:
   - **ASR**: 音訊檔案太大 (建議 < 1MB)
   - **評分**: AI 模型回應慢 (考慮用更快的模型)
   - **上傳**: Blob Storage 速度慢 (檢查網路)

**優化建議**:
- 前端壓縮音訊 (降低位元率)
- 使用更快的 AI 模型
- 確認 Phase 3 並行執行 (檢查程式碼)

---

## 測試

**單元測試**: `tests/scoring.test.ts`
```typescript
describe('scoreToStars', () => {
  const thresholds = { oneStarMax: 70, twoStarMax: 84 };

  test('分數 69 → 1 星', () => {
    expect(scoreToStars(69, thresholds)).toBe(1);
  });

  test('分數 70 → 2 星', () => {
    expect(scoreToStars(70, thresholds)).toBe(2);
  });

  test('分數 85 → 3 星', () => {
    expect(scoreToStars(85, thresholds)).toBe(3);
  });
});
```

**E2E 測試**: `tests/e2e/scoring.spec.ts`
- 測試完整提交流程
- 測試門檻值調整
- 測試重新錄製覆蓋舊提交

---

## 安全性考量

### 1. 權限驗證
- ✅ 學生端: 必須提供有效的 `token` (family link)
- ✅ 管理端: 評分設定 API 需要 `requireAdmin()` 驗證
- ✅ 家庭隔離: 驗證 studentId 屬於該 token 的 familyId

### 2. 檔案上傳限制
- ⚠️ 建議加入檔案大小限制 (目前依賴 Vercel Blob 預設值)
- ⚠️ 建議驗證 MIME 類型 (防止非音訊檔案上傳)

### 3. 資料隱私
- ✅ Blob Storage 使用 public access (家長可播放錄音)
- ⚠️ 音訊 URL 包含隨機 suffix (難以猜測)
- ⚠️ 考慮加入存取控制或簽名 URL (未來改進)

---

## 延伸閱讀

- **資料庫 Schema**: `lib/db/schema.ts`
- **環境變數驗證**: `lib/env.ts`
- **音訊格式處理**: `lib/audio-format.ts`
- **家庭連結驗證**: `lib/family-link.ts`
- **E2E 測試方案**: `tests/e2e/README.md`
