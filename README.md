# 生詞造句

給 10–16 歲孩子的中文字詞學習 App（PWA，可加入手機和 iPad 主畫面）。
查生字、生詞、成語 → 聽朗讀、看白話解釋和記憶畫面 → 兩題小測驗 → 錯題複習。

- 設計與規格：[SPEC.md](SPEC.md)
- 設計稿：https://claude.ai/artifact/EBKrAfnb2PJapZg1rR1fys

---

## 三種模式

| 模式 | 條件 | 適合 |
|---|---|---|
| 試用模式 | 裝置上沒有 API 金鑰 | 先看畫面、走流程；只能查「迫不及待」和「辨」 |
| **直接模式** | 家長在「我的」貼上 API 金鑰 | **一兩個孩子自己用（目前採用）**，不需要任何伺服器 |
| Worker 模式 | `js/config.js` 填了 `workerUrl` | 日後推廣給更多人，見文末 |

---

## 上線步驟（直接模式）

### 1. 開啟 GitHub Pages

1. 打開這個 repo 的 **Settings → Pages**。
2. **Source** 選 **Deploy from a branch**，**Branch** 選 `main`、資料夾選 `/ (root)`，按 **Save**。
3. 等幾分鐘，網址會是 `https://kuohappiness.github.io/word-learning/`。

### 2. 準備一組 API 金鑰（Claude 或 OpenAI 都可以）

App 會看金鑰的開頭自動判斷是哪一家：`sk-ant-` 開頭是 Claude，其他是 OpenAI。兩家擇一即可。

**Claude**

1. 到 https://console.anthropic.com 註冊、登入。
2. 在 **API Keys** 建立一組金鑰，複製下來（只會顯示一次）。
3. 在 **Billing** 儲值少量額度，例如 5 美元。

**OpenAI**

1. 到 https://platform.openai.com 登入。
2. 建立一組 API 金鑰，複製下來。
3. 確認 API 帳戶有餘額。API 的費用和 ChatGPT 的訂閱是分開算的。

**已經有金鑰、帳戶裡也有餘額**：建議還是替這個 App 另建一組金鑰，並替它設每月花費上限（Claude 用 workspace 的 spend limit，OpenAI 用 project 的 spend limit）。同一個帳戶的金鑰共用餘額，設了上限，金鑰外流時損失才有限。

### 3. 每台裝置設定一次

1. 用 Safari（iPhone、iPad）或 Chrome（Android）打開網址。
2. 選孩子的年紀，在「API 金鑰」欄貼上第 2 步的金鑰，按「開始」。
   - 金鑰很長不好打：可以先用 LINE、AirDrop 或備忘錄傳到孩子的裝置，再複製貼上。
   - 之後要換金鑰，到 App 的「我的」頁面修改。
3. 加入主畫面：Safari → 分享 → **加入主畫面**；Android Chrome → **安裝應用程式**。

每台裝置都貼**同一組**金鑰即可，費用都從同一個帳戶扣。

### 4. 確認注音有出現

查一個詞，看字下面有沒有注音。注音來自 App 內建的教育部辭典資料（`data/revised/`），不需要另外連到其他網站；辭典沒收錄的字詞就不顯示注音。

---

## 金鑰安全

- 金鑰**只存在孩子的裝置上**，不會出現在這個 repo。**絕對不要**把金鑰寫進任何檔案或 commit。
- 這個 repo 是公開的，所以有三道防線擋住金鑰：
  1. `.gitignore` 排除 `.env`、`.dev.vars`、`*.key` 等常放金鑰的檔案。
  2. commit 前檢查：clone 之後執行一次 `git config core.hooksPath .githooks`，之後每次 commit 都會先跑 `scripts/check-secrets.sh --staged`，發現像金鑰的內容就擋下來。
  3. GitHub 自動檢查：每次 push 和 PR 都會跑 `scripts/check-secrets.sh` 和 gitleaks（掃描全部 commit 歷史），見 `.github/workflows/checks.yml`。
- 也建議在 repo 的 **Settings → Code security** 確認 **Secret Protection／Push protection** 是開啟的，GitHub 會在推送時直接擋下已知格式的金鑰。
- 拿到裝置的人可以從瀏覽器裡看到金鑰。家裡自己用風險不高；萬一裝置遺失或金鑰外流，到 Claude Console 或 OpenAI 後台刪掉這組，再建一組新的貼回其他裝置。
- 費用上限是帳戶的餘額，或你替這組金鑰所在的 workspace／project 設的每月上限。

## 費用

- 貼 Claude 金鑰時使用 Claude Haiku 5.5，貼 OpenAI 金鑰時使用 GPT-6 Luna；兩者定價相同（每百萬 token：讀入 $0.10、產出 $0.50）。估算一個孩子每週查 60 個詞約 US$0.10（詳見 SPEC.md 第 4 節）。GPT-6 Luna 回答前會先思考，思考也算產出，實際費用可能略高。
- 模型可以在 `js/config.js` 的 `model`、`openaiModel` 更換。
- 字義、例句和測驗題的編寫規則兩家共用；換一家之後，建議先查幾個詞確認內容品質。
- 查過的字詞會存在裝置上，同一台裝置再查同一個詞不花錢，也可以離線看。

## 注音來源

- 注音**只來自教育部辭典**，不讓 AI 產生；辭典查不到的字詞就不顯示注音。AI 就算回傳注音，程式也會丟掉。
- 資料是教育部《重編國語辭典修訂本》，整理成 `data/revised/` 放在 App 裡（約 16 萬筆，分成 256 份，查詢時只下載需要的那一份）。說明見 [data/README.md](data/README.md)。
- 辭典的釋義、近義詞、反義詞會一起交給 AI，讓白話解釋不偏離辭典，「比一比」也優先從辭典列的近反義詞挑。
- 本機資料下載失敗時（例如第一次使用就離線），才改向萌典 API 查詢。
- 說明書希望優先使用《國語辭典簡編本》，需要另外取得資料再放進 App。

## 檔案

```
index.html              App 外框
css/style.css           樣式（原版橘＋藍配色；寬度 ≥ 700px 時是 iPad 版：置中、字級 ×1.125）
js/config.js            模式設定（一般不用改）
js/app.js               路由、點擊、朗讀
js/views.js             各個畫面
js/store.js             本機紀錄、錯題排程、等級、貼紙、API 金鑰
js/api.js               依模式取得字詞內容
js/engine.js            查辭典、請 AI（Claude 或 OpenAI）編寫、整理內容（直接模式與 Worker 共用）
js/demo.js              試用模式的範例字詞
data/revised/           教育部辭典資料（注音、釋義），由 tools/build-dict.py 產生
data/confusables.json   容易搞混的字詞清單（可以直接增加），比一比和記憶錨點優先用它
scripts/check-secrets.sh  金鑰檢查（commit 前和 GitHub 上都會跑）
tests/                  程式測試：node --test tests/*.test.mjs
js/art.js               糰糰、貼紙、圖示
sw.js                   離線快取
manifest.webmanifest    安裝到主畫面的設定
worker/                 日後推廣用的 Cloudflare Worker
```

## 日後推廣：Worker 模式

孩子變多時，改用 Cloudflare Worker 保管金鑰，並加上邀請碼和每日查詢上限：

1. 在 Cloudflare 建立一個 KV namespace，把 id 填進 `worker/wrangler.toml`。
2. 在 `worker` 資料夾執行：
   ```
   npx wrangler deploy
   npx wrangler secret put ANTHROPIC_API_KEY
   npx wrangler secret put INVITE_CODE
   ```
   （`wrangler deploy` 會自動把 `js/engine.js` 一起打包。）
3. 把 Worker 網址填進 `js/config.js` 的 `workerUrl`。之後 App 會改成請孩子輸入邀請碼，不再使用裝置上的金鑰。

Worker 目前只接 Claude 金鑰。

## 維護

- 每次改程式都要把 `sw.js` 的 `VERSION` 加一（目前 `wl-v5`），裝置才會拿到新版。
- 改完執行 `node --test tests/*.test.mjs` 確認測試通過。

## 還沒做的

- 放入《國語辭典簡編本》資料（目前用《重編國語辭典修訂本》）
- 貼紙目前 3 張，說明書暫定 30 張
- 每個字詞專屬的記憶插圖（目前用糰糰代替）
- App 正式名稱
