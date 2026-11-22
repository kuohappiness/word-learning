# 生詞造句

給 10–16 歲孩子的中文字詞學習 App（PWA，可加入手機和 iPad 主畫面）。
查生字、生詞、成語 → 聽朗讀、看白話解釋和記憶畫面 → 兩題小測驗 → 錯題複習。

- 設計與規格：[SPEC.md](SPEC.md)
- 設計稿：https://claude.ai/artifact/EBKrAfnb2PJapZg1rR1fys

---

## 兩種模式

| 模式 | 條件 | 可以查什麼 |
|---|---|---|
| 試用模式 | `js/config.js` 的 `workerUrl` 留空（目前就是這樣） | 只能查內建範例「迫不及待」和「辨」，用來看畫面、走流程 |
| 正式模式 | 填好 Worker 網址 | 任何字、詞、成語，內容由 AI 依說明書規則產生 |

---

## 上線步驟

### 1. 開啟 GitHub Pages

1. 打開這個 repo 的 **Settings → Pages**。
2. **Source** 選 **Deploy from a branch**，**Branch** 選 `main`、資料夾選 `/ (root)`，按 **Save**。
3. 等幾分鐘，網址會是 `https://kuohappiness.github.io/word-learning/`。

做到這一步就能用試用模式打開 App。

### 2. 申請 Claude API 金鑰

1. 到 https://console.anthropic.com 註冊、登入。
2. 在 **API Keys** 建立一組金鑰，複製下來（只會顯示一次）。
3. 在 **Billing** 儲值少量額度，例如 5 美元。

金鑰**只會放在下一步的 Cloudflare**，不要貼進這個 repo 的任何檔案。

### 3. 建立 Cloudflare Worker（用網頁後台，不需要安裝任何東西）

> Cloudflare 後台的選單名稱偶爾會調整，找名稱相近的項目即可。

1. 註冊、登入 Cloudflare（免費方案就夠用）。
2. **建立 KV**：Storage & Databases → KV → Create，名稱填 `word-learning-cache`。
3. **建立 Worker**：Workers & Pages → Create → 選 Hello World 範本，名稱填 `word-learning` → Deploy。
4. **貼上程式**：進入這個 Worker → Edit code，把 [`worker/worker.js`](worker/worker.js) 的內容全部貼上、取代原本的程式 → Deploy。
5. **綁定 KV**：Worker 的 Settings → Bindings → Add → KV namespace。
   Variable name 填 `CACHE`（一定要是這個名稱），選剛剛建立的 `word-learning-cache`。
6. **設定變數**：Settings → Variables and Secrets → Add：

   | 名稱 | 類型 | 內容 |
   |---|---|---|
   | `ANTHROPIC_API_KEY` | Secret | 第 2 步的金鑰 |
   | `INVITE_CODE` | Secret | 自己訂的邀請碼，給家人朋友用 |
   | `ALLOWED_ORIGIN` | Text | `https://kuohappiness.github.io` |
   | `DAILY_LIMIT` | Text | 選填，每台裝置每天最多產生幾次新內容，預設 `100` |

7. 記下 Worker 的網址，長得像 `https://word-learning.你的子網域.workers.dev`。

### 4. 把 Worker 網址填進 App

編輯 [`js/config.js`](js/config.js)，把網址填進 `workerUrl`，Commit。

```js
window.WL_CONFIG = {
  workerUrl: "https://word-learning.你的子網域.workers.dev"
};
```

重新整理網頁後，App 會請孩子選年紀並輸入邀請碼。

### 5. 加入主畫面

- iPhone、iPad：用 Safari 打開網址 → 分享 → **加入主畫面**。
- Android：用 Chrome 打開網址 → **安裝應用程式**。

---

## 費用與安全

- AI 使用 Claude Haiku 5.5。估算一個孩子每週查 60 個詞約 US$0.10（詳見 SPEC.md 第 4 節）。
- 查過的字詞存在 Worker 的快取裡，同一個字詞、同一個年齡段第二次查不再花錢；孩子的裝置也會存一份，可以離線看。
- 沒有邀請碼不能使用 AI；每台裝置每天有次數上限，網址外流也不會被大量使用。
- 孩子的學習紀錄只存在自己的裝置上，不需要帳號，不收集個資。

## 注音來源

- 注音**只來自教育部辭典**，不讓 AI 產生；辭典查不到的字詞就不顯示注音。
- 目前透過萌典 API（moedict.tw）取得資料，內容是教育部《重編國語辭典修訂本》。
- 說明書希望優先使用《國語辭典簡編本》：取得簡編本資料後，匯入一個 KV 並以 `CONCISED` 綁定到 Worker（每個字詞一筆：`{"readings":[{"bopomofo":"ㄅㄧㄢˋ","defs":["……"]}]}`），Worker 就會先查簡編本。

## 檔案

```
index.html              App 外框
css/style.css           樣式（原版橘＋藍配色；寬度 ≥ 700px 時是 iPad 版：置中、字級 ×1.125）
js/config.js            Worker 網址
js/app.js               路由、點擊、朗讀
js/views.js             各個畫面
js/store.js             本機紀錄、錯題排程、等級、貼紙
js/api.js               呼叫 Worker
js/demo.js              試用模式的範例字詞
js/art.js               糰糰、貼紙、圖示
sw.js                   離線快取
manifest.webmanifest    安裝到主畫面的設定
worker/worker.js        Cloudflare Worker（AI 代理、邀請碼、次數上限、快取、辭典）
worker/wrangler.toml    用 Wrangler 指令部署時才需要
```

## 還沒做的

- 匯入《國語辭典簡編本》資料（見上方「注音來源」）
- 貼紙目前 3 張，說明書暫定 30 張
- 每個字詞專屬的記憶插圖（目前用糰糰代替）
- App 正式名稱
