# 工單 WO-INFRA-01：統一測試運行器建置、遺漏測試整合與型別防護補齊

- **工單編號**：`WO-INFRA-01`
- **狀態**：`READY` (可立即執行)
- **優先級**：`P0` (基礎架構與測試健全)
- **指派執行代理**：`local-coder`
- **架構審查員**：Antigravity (Cloud Architect)
- **關聯模組**：`package.json`、`scripts/`、`docs/work-orders/`

---

## 1. 背景與核心問題 (Background & Problem Statement)

1. **超長測試指令與低效 CI**：
   - 既有 `package.json` 中 `"test"` 指令由 57 個 `npx tsx scripts/verify-*.ts` 以 `&&` 串聯，指令長度超過 2,500 字元。
   - 每次執行衍生 57 次獨立 Node / tsx 行程啟動，耗時長達 35～45 秒，且任一測試失敗無法產出全局摘要。
2. **測試漂移與遺漏 (Test Drift)**：
   - `scripts/verify-sprites.ts`、`scripts/verify-entities.ts`、`scripts/verify-renderer.ts`、`scripts/verify-terminal.ts` 等 4 個腳本存在於倉庫中，卻未被收錄於 `package.json` 的測試清單中。
3. **缺少 Node 型別定義**：
   - `devDependencies` 缺少 `@types/node`，導致測試腳本使用 `fs`、`path`、`process` 時在嚴格型別檢查下缺乏型別支援。
4. **模擬測試欄位名稱筆誤**：
   - `scripts/test-novel-agent-simulation.ts` 誤用 `game.player.collarStepsRemaining`（實際為 `checkInTimer`），導致輸出欄位為 `undefined`。
5. **歷史工單狀態未閉環**：
   - `wo-ms-01.json` 與 `wo-ms-02.json` 程式碼與測試已完成，但狀態仍停留在 `DRAFT`。

---

## 2. 需求與架構規格 (Architecture & Requirements Specification)

### 模組一：統一測試運行腳本 (`scripts/run-all-tests.ts`)
- 實作自動掃描 `scripts/verify-*.ts` 之統一測試運行器。
- 支援動態統計：
  - 總測試套數 (Total Suites)
  - 通過數 (Passed)
  - 失敗數 (Failed)
  - 各套執行耗時 (Execution Time)
- 若有任一套測試失敗，印出紅字失敗腳本清單，並以 exit code 1 結束；全數通過則以 exit code 0 結束。

### 模組二：`package.json` 腳本重構
- 將 `"test"` 指令簡化為：
  ```json
  "test": "tsc --noEmit && npx tsx scripts/run-all-tests.ts"
  ```
- 安裝 `@types/node` 至 `devDependencies`。

### 模組三：測試腳本修正與工單狀態同步
- 修正 `scripts/test-novel-agent-simulation.ts`：讀取 `game.player.checkInTimer`。
- 將 `docs/work-orders/wo-ms-01.json` 與 `docs/work-orders/wo-ms-02.json` 的 `status` 欄位更新為 `COMPLETED`。

---

## 3. 驗收標準 (Acceptance Criteria)

1. `npm test` 執行時間大幅下降（目標 < 15 秒），且自動包含全量 61 套驗證測試。
2. 測試輸出具備清晰的表格或摘要清單，明確標示 `All 61/61 test suites passed successfully`。
3. `scripts/test-novel-agent-simulation.ts` 執行時項圈欄位正常顯示數字。
4. 工單文件狀態完全同步。
