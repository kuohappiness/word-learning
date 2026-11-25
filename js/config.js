// 一般情況不用改這個檔案：API 金鑰是在 App 的「我的」頁面貼上，只存在那台裝置，不會進 GitHub。
// 金鑰可以是 Claude 的（sk-ant- 開頭）或 OpenAI 的，App 會自己判斷。
//
// model：貼 Claude 金鑰時用的模型；openaiModel：貼 OpenAI 金鑰時用的模型。
//
// workerUrl：日後推廣給更多人、架了 Cloudflare Worker 之後才填，例如
//   workerUrl: "https://word-learning.你的帳號.workers.dev"
// 填了之後 App 會改用 Worker（邀請碼模式），裝置上的 API 金鑰就不會再用到。
window.WL_CONFIG = {
  workerUrl: "",
  model: "claude-haiku-5-5",
  openaiModel: "gpt-6-luna"
};
