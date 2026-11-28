# 辭典資料

`revised/*.json` 是從教育部《重編國語辭典修訂本》資料整理出來的查詢檔，App 用它取得**注音**，並把**辭典釋義**交給 AI 當改寫依據（AI 的白話解釋不能偏離它）。

- 來源：中華民國教育部《重編國語辭典修訂本》，經 [g0v/moedict-data](https://github.com/g0v/moedict-data) 整理、npm 套件 `@leonsilicon/moedict-data`（0.202603.0）打包。
- 授權：教育部辭典內容採「創用CC 姓名標示-禁止改作 臺灣3.0」（CC BY-ND 3.0 TW）。檔案裡的讀音與釋義文字保留原文，沒有修改；只挑出每個讀音的前四條釋義與近義詞、反義詞，其餘欄位（引文、例句等）沒有收錄。
- 格式：`{ "字詞": [ { "b": "注音", "d": ["釋義", …], "s": ["近義詞"], "a": ["反義詞"] } ] }`，依第一個字的 Unicode 碼位除以 256 的餘數分成 256 個檔案（`00.json`～`ff.json`），查詢時只下載需要的那一份。
- 重新產生：`python3 tools/build-dict.py <dict-revised.json> data/revised`

說明書希望優先使用《國語辭典簡編本》（國中小適用），取得資料後可以用同樣格式另放一份，查詢時先查簡編本。


## 多音字

`polyphones.json` 是常考多音字的讀音分組、白話義項、例詞與練習題，注音一樣只取自上面的《重編本》資料。整理方式與格式見 [`polyphones/README.md`](polyphones/README.md)。
