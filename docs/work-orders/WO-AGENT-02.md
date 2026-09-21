# 工單 WO-AGENT-02：特工任務目標驅動導航、交戰反擊反射串接與日記防死鎖強化

- **工單編號**：`WO-AGENT-02`
- **狀態**：`COMPLETED` (已交付驗收)
- **優先級**：`P0` (特工 Playtester 推進效率、自主生存率與目標達成度)
- **指派執行代理**：`local-coder`
- **架構審查員**：Antigravity (Cloud Architect)
- **關聯模組**：`src/types.ts`、`src/aiPerception.ts`、`scripts/verify-ai-perception.ts`、`/home/orin/.local/share/local-playtester/playtester-v2.mjs`

---

## 1. 背景與實測痛點 (Background & Problem Statement)

分析 Playtester 5,380 回合運行紀錄（`jobs/20260919120350-api`）與使用者實際觀察，特工在漫長遊玩中遭遇三大嚴重的「虛耗卡頓」問題：

1. **戰鬥建議未能串接 Auto-Draw**：
   - 儘管 `WO-COMBAT-01` 已完成引擎底層即時拔槍開火，但 `playtester-v2.mjs` 的 `combatAdvisory` 與 `system` 提示詞仍然指令特工：「敵人在附近追擊！請果斷執行 DRAW_WEAPON 拔槍，下回合即可開火迎擊！」。
   - 特工因此仍會消耗 1 回合手動拔槍，在拔槍當下承受敵方近身連續攻擊，錯失先發制人的生存機會。
2. **安全屋開局連續寫日記死循環**：
   - `playtester-v2.mjs` 的 `inheritanceReminder` 設定為 `decision <= 12` 期間無條件提醒「若沒有條目，請在首次獲得重要情報後留下第一篇」。
   - 特工在第 1 回合寫入日記後，隨後第 2 至 12 回合連續 11 次發送完全相同的 `WRITE_JOURNAL` 動作，在原地虛度數十秒並耗費大量 Token。
3. **任務知覺缺失發現狀態與導引**：
   - `AIPerceptionSnapshot.active_missions` 遺漏了 `discovered: boolean` 欄位，AI 無法辨別哪些是已解鎖線索、哪些是隱藏支線。
   - 使用者在實時訊號中多次提醒特工「請看 mission (按 M)」、「支線任務也可以進行」，但特工在無明確目標時缺乏以任務為中心的主動目標選定邏輯。

---

## 2. 需求與架構規格 (Architecture & Requirements Specification)

### 模組一：`src/types.ts` 與 `src/aiPerception.ts` 擴充任務發現契約
- 在 `AIPerceptionSnapshot.active_missions` 物件定義中，新增 `discovered: boolean`。
- 在 `generateAIPerceptionSnapshot` 中，將 `discovered: Boolean(m.discovered !== false)` 正確注入至每個任務回傳項目。
- 更新 `scripts/verify-ai-perception.ts`，驗證任務快照包含 `discovered` 欄位。

### 模組二：`playtester-v2.mjs` 串接即時開火戰術建議
- 更新 `combatAdvisory`：
  - 當可見敵對實體存在時，直接建議特工朝敵人方位（N/S/E/W）使用 `FIRE_*` 開火。
  - 清楚說明系統已支援 **Auto-Draw on Fire**，開火將自動拔槍，無需先浪費 1 回合手動拔槍。
- 同步更新 `system` prompt 內的交戰指引。

### 模組三：`playtester-v2.mjs` 消除日記連續重複循環 (Anti-Loop Debounce)
- 強化日記提醒觸發條件：
  - 若 `before.journal.length > 0`，不提示初期建檔。
  - 若最近 5 回合的動作紀錄（`recent`）中已包含 `WRITE_JOURNAL`，抑制日記提醒。
  - 確保一次性任務完成後不再連續觸發多個相同的日記條目。

### 模組四：`playtester-v2.mjs` 任務驅動目標選定 (Mission-Driven Strategy Guidance)
- 當特工無活躍戰略計畫（`activeStrategicPlan === null`）且身處 `rebel_safehouse` 時：
  - 自動設定 `safehouse_orientation_plan`，以 `4,6` (Kira) 與 `7,4` (Vance) 及 `4,4` (Terminal) 作為明確開局目標。

---

## 3. 驗收標準 (Acceptance Criteria)

1. `npm run typecheck` 通過。 (Pass)
2. `npx tsx scripts/verify-ai-perception.ts` 包含 `discovered` 屬性校驗通過。 (Pass)
3. `playtester-v2.mjs` 不再要求特工先拔槍，改為引導直接 `FIRE_*`。 (Pass)
4. `playtester-v2.mjs` 在開局前 12 回合不再重複寫入相同日記。 (Pass)
5. 全量整合回歸測試 100% 綠燈通過。 (Pass)
