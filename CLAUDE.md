# ogsm-strategy-planner — OGSM 策略規劃表

把年度策略寫成一頁 OGSM：填寫 → 一頁總表 → 邏輯健檢 → 往下展開到部門 → 每月追蹤。2026-11-24 用 `小工具/tool-scaffold`（`--ai byok`）建立；規格由 Claude 提計畫、使用者核可。和 `where-what-how-strategy-studio`（產策略論述）分工不同、不要混改。

- 純靜態：`index.html`（CSS）＋`data.js`（規則引擎 `window.OSP`，node 可 require）＋`app.js`（畫面）＋`ai.js`（BYOK 7 家，`window.TOOL_AI`，不改）＋`watermark.js`＋`manual.html`＋PWA。
- 本機預覽 port **8908**（`.claude/launch.json` 的 `ogsm-strategy-planner`；程式牆 `LOCAL_APPS`，`MARKETING_SUB` 行銷・商業策略）。visitor-badge `m255525.ogsmstrategyplanner`（手冊 `.manual`）。
- **2026-11-24 已上線** <https://m255525.github.io/ogsm-strategy-planner/>（`publish.mjs`：建 repo＋push → 開 Pages → 補 master 部署規則 → workflow_dispatch）。程式牆 `REPO_META`、github-dashboard、AI 工具導航已登記。改版後升 `service-worker.js` 的 `CACHE_NAME` 再 push。

## 規則（`data.js`，全部是自訂經驗法則；改了跑 `node tools/test_engine.mjs`）
- **缺口 `coverage`**：缺口＝目標與起點的差（依方向），各策略 `links[目標id]` 的預估貢獻加總。<80% `short` 紅、<100% `near` 黃、>150% `over` 黃、有人沒估且還不夠 `unest` 黃、沒人支援 `none` 紅；起點空白或缺口 ≤0 為 `na`。
- **健檢 `check`**：約 50 種代碼（O 口號／數字／太長、G 缺數值期限／像行動／方向相反、S 空泛／沒取捨／沒支援、M 只有落後／照抄目標／缺負責人、行動日期、預算、一人超過 8 項、上下層）。`hasTargetNumber` 會先拿掉年份、期限、「第 1」、B2B 這類再判斷。紅燈 −8、黃燈 −3，同一代碼最多扣兩次。
- **進度 `progress`**：`acc:'level'` 水準值＝當月數字，從起點到目標走直線；`acc:'sum'` 累計值＝逐月加總，應達從 **0** 到目標（起點只用來算缺口）。比值＝完成比例÷時間比例：≥1.05 超前、≥.9 正常、≥.7 稍落後。當月沒填就看最近一個有資料的月份（用那個月的時間比例）。累計＋越低越好＝額度制（≤應達正常、≤110% 稍落後）。
- **展開 `cascade`**：S→下層 O、每個 M→下層 G，`goal.src={k:上層指標id, snap}`；`cascadeIssues` 回 `dropped`／`srcChanged`／`srcGone`／`parentGone`／`childLate`；`syncFromParent` 更新改過的、補上沒人接的（別的下層已接就不重複補）。
- `sanitize`／`sanitizePlan` 是唯一入口（讀存檔、備份、分享、AI 都要過）：id 樣式檢查、日期、數字上限、互為上下層會拆開；整理兩次結果必須相同（測試有驗）。

- **範例 `EXAMPLES`** 17 份，`cat` 對應 `EX_CATS` 五組；除了 `drill`（`bad` 有問題的初稿、`bd2` 補不滿缺口）其餘健檢必須零燈號（測試有驗），`unit` 要寫「虛構」。`cof`、`hrd` 有每月紀錄，`cof`、`slp` 有下一層。

## 架構
- localStorage 前綴 `osp.`：`state`（`{plans, cur}`，最多 40 份）、`tab`、`fold`（⚙）、`fsize`、`warnSeen`、`marquee`、`ai`。
- 欄位用 `data-p="種類|id|欄位"`（種類 p/g/s/k/a）統一處理；輸入只存＋`light()` 局部更新，增刪移動與勾選才 `render()`。每月填入用 `data-val`，只換那一列 `.c-d` 的格子。
- 復原：增刪移動前 `keep()`；打字在 focusin 記一份、change 時真的有改才留下，最多 20 步。
- AI 一律走 `aiFlow()`（有金鑰直接問、沒金鑰複製提示詞再貼回）；AI 草稿存成新的一份，數字 `guess:true`，改數字或按「確認數字」才清掉。
- 列印：`body[data-print]` 決定印哪個分頁（填寫頁印的是一頁總表），`#pageStyle` 切 A4 橫式／直式。
- 分享 `#s=z.`（deflate-raw＋base64url）或 `j.`；解壓上限 600KB；只能看，另存才有新 id。
- 另一個分頁改資料會用 storage 事件跟著更新。測試掛鉤 `window._tool`（`S`、`V`、`cur()`、`issues()`）。
- 畫風：**航海海圖**（海圖紙、深海藍、黃銅、海圖慣用的洋紅航線；船＝S、浮標＝G、星＝O、錨＝現在）。數字字型堆疊要含 Noto Sans TC，否則單位會變細明體點陣字。手機（≤600px）總表、追蹤表改成卡片，策略預設只展開第一條。
- 圖示 `tools/make_icons.py`（羅盤玫瑰，程式自繪）。

## 標準配備
跑馬燈（工作區公告 GAS，滑鼠移入暫停，不可關）、⚙ 常用設定（收合式：資料／🤖 AI 設定／顯示／關於本工具）、首訪警語＋頁面入口、`manual.html#creator` 完整版（改 `tools/manual_body.html` 後跑 `python tools/build_manual.py`）、PWA、訪客計數器、列印浮水印，無序號。

## 測試
- `node tools/test_engine.mjs`：每條健檢規則、缺口、進度手算、跨年、展開斷鏈、整理複製、範例、CSV 公式注入、AI 回覆整理、2000 組亂數，共 2231 項。
- `python tools/e2e_osp.py [截圖資料夾]`（Playwright，port 8918，擋計數器）：標準配備＋五分頁、復原、健檢跳轉、追蹤、展開同步、分享（含 HTML 注入）、AI（只用模擬回應）、備份、列印 PDF 方向與浮水印、390px，共 124 項。2026-11-24 全過；7 家 AI 未實際連線測試。
