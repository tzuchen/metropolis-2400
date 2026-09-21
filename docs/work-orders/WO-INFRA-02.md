# 工單 WO-INFRA-02：測試運行器並行化加速與進程開銷消除 (Parallel Test Runner)

- **工單編號**：`WO-INFRA-02`
- **狀態**：`COMPLETED` (已完成)
- **優先級**：`P0` (研發效能與本機工兵迴圈加速)
- **指派執行代理**：`local-coder`
- **架構審查員**：Antigravity (Cloud Architect)
- **關聯模組**：`scripts/run-all-tests.ts`, `package.json`

---

## 1. 背景與核心問題 (Background & Problem Statement)

1. **序列化三層行程嵌套導致極度緩慢**：
   - 目前 `scripts/run-all-tests.ts` 內使用：
     ```typescript
     spawnSync(process.execPath, ['-e', `require('child_process').execSync('npx tsx "${scriptPath}"', ...)]);
     ```
   - 每個測試腳本啟動時經歷 `node -> node -e -> shell execSync -> npx -> tsx` 多層行程包裝。
   - 63 套測試全部以單執行緒序列化依序執行，在 20 核心本機環境下需消耗長達 **92.9 秒**。
2. **本機工兵 (local-coder) 自我驗證週期過長**：
   - 本機工兵在修改代碼並自我修復時，若執行完整測試套件需等待 1.5 分鐘，嚴重拖慢迭代反饋。
3. **缺乏過濾參數**：
   - 開發者或代理人若只想驗證特定模組（如 `combat` 或 `perception`），目前運行器無法接收 pattern 過濾參數。

---

## 2. 需求與架構規格 (Architecture & Requirements Specification)

### 模組一：非同步並行執行器 (Async Concurrency Pool)
- 於 `scripts/run-all-tests.ts` 實作非同步並發池（Promise Pool / Worker Queue）：
  - 預設並行度：`Math.min(os.cpus().length, 8)`，預設 6~8 個工作者（可在 10~15 秒內完成 63 套測試，同時避免過載）。
  - 支援環境變數 `TEST_CONCURRENCY`（例如 `TEST_CONCURRENCY=1` 支援調試模式序列執行）。
- 消除三層嵌套：
  - 直接以 `spawn` 執行 `npx tsx "${scriptPath}"` 或直接尋找 `tsx` 二進位路徑，捕捉 `stdout`、`stderr` 與 `exitCode`。

### 模組二：過濾與友善終端輸出
- 支援命令列過濾參數，例如：
  - `npx tsx scripts/run-all-tests.ts combat` 只跑名稱包含 `combat` 的腳本。
  - 無參數時執行所有 `verify-*.ts`。
- 測試完成後：
  - 即時或完成後依自然排序輸出每一項測試狀態：`[  1] ✓ verify-action-executor.ts (0.85s)`。
  - 結尾印出總套數、成功數、失敗數與總時間（格式完全相容於既有 SUMMARY 區塊）。
  - 若有失敗，印出失敗腳本詳細之 `stderr` 與 `stdout`，以 exit code 1 結束；全過以 exit code 0 結束。

---

## 3. 驗收標準 (Acceptance Criteria)

1. `npm test`（63 套測試）總耗時從 90+ 秒下降至 **20 秒以內**（目標 10~15 秒）。
2. 全量 63 套測試 100% 通過（`Passed: 63, Failed: 0`）。
3. 支援過濾參數：`npx tsx scripts/run-all-tests.ts perception` 僅執行匹配之測試。
4. 退出碼（Exit Code）嚴格正確（全過為 0，有失敗為 1）。
