# ogsm-strategy-planner — OGSM 策略規劃表

用一頁 OGSM 把目的、目標、策略、衡量接起來：填寫精靈、邏輯健檢、一頁總表列印、往下展開到部門、每月追蹤進度（2026-11-24 由 tool-scaffold 建立骨架）

- 純靜態：`index.html`（CSS）＋`data.js`（計算引擎 `window.OSP`，node 可 require）＋`app.js`（畫面）＋`watermark.js`（`TOOL_WATERMARK` 馬克老師浮水印，列印用）＋`manual.html`＋PWA。
- 本機預覽 port **8908**（`.claude/launch.json` 的 `ogsm-strategy-planner`）。visitor-badge `m255525.ogsmstrategyplanner`（手冊 `.manual`）。
- 尚未上線。上線後在這裡記網址與日期；改版要升 `service-worker.js` 的 `CACHE_NAME` 再 push。

## 規則
- （待補）計算規則、資料來源與查證日期、自訂門檻。改了 `data.js` 跑 `node tools/test_engine.mjs`。

## 架構
- localStorage 前綴 `osp.`：`state`、`tab`、`fold`、`fsize`、`warnSeen`、`marquee`。
- 輸入只呼叫 `refresh()`，不重繪表單（焦點才不會跑掉）；欄位 change 時**只有數值真的被修正才重繪**，否則會吃掉使用者的下一次點擊。
- 備份 JSON `app:'ogsm-strategy-planner'`。測試掛鉤 `window._tool`。
- 畫風：（待設計）範本配色 `navy` 只是起點；姊妹作的畫面要明顯不同。圖示由 `tools/make_icons.py` 產生。

## AI（BYOK）
- `ai.js`：7 家 `callLLM`＋`geminiModelFix` 複製自 `政府補助認證產生器/shop-opening-checklist/ai.js`（正本改了這裡也要改）。金鑰存 `osp.ai`，只在這台瀏覽器。⚙「🤖 AI 設定」。
- 原則：AI 只做解說與文字，數字與判斷一律由 `data.js` 規則決定；每個 AI 功能都要有「📋 複製提示詞」（沒金鑰也能用）。

## 標準配備
跑馬燈（工作區公告 GAS，滑鼠移入暫停，不可關）、⚙ 常用設定（收合式：資料／顯示／關於本工具）、首訪警語＋頁面入口、`manual.html#creator` 完整版（改 `tools/manual_body.html` 後跑 `python tools/build_manual.py`，創作者區塊從賞鳥地圖範本複製）、PWA、訪客計數器、列印浮水印。

## 測試
- `node tools/test_engine.mjs`：（待補手算案例）＋亂數。
- `python tools/e2e_osp.py [截圖資料夾]`（Playwright，自己在 port 8918 起伺服器）：標準配備（警語、跑馬燈、收合設定、關於本工具、大字、備份還原、SW、manifest、手冊創作者、列印浮水印、390px）＋主功能。
