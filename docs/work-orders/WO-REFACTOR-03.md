# 工單 WO-REFACTOR-03：項圈計時與市民安檢系統解耦 (Collar & Security Check-In System Extraction)

- **工單編號**：`WO-REFACTOR-03`
- **狀態**：`COMPLETED` (已完成)
- **優先級**：`P1` (大檔瘦身與核心邏輯解耦)
- **指派執行代理**：`local-coder`
- **架構審查員**：Antigravity (Cloud Architect)
- **關聯模組**：`src/collarSystem.ts`, `src/game.ts`, `scripts/verify-collar-system.ts`

---

## 1. 背景與核心問題 (Background & Problem Statement)

1. **`src/game.ts` 依然過度龐大 (2,138 行)**：
   - 包含主迴圈、輸入、音效、地圖渲染與多種子系統。
2. **項圈計時與安檢邏輯緊密偶合**：
   - `performCheckIn`, `handlePlayerStep`, `disarmCollar` 等項圈生命週期邏輯直接散落在 `src/game.ts`。
   - 機器人巡邏模式轉換、警報層級升級（CLEAR -> ALERT）、浮動文字與提示訊息缺乏獨立封裝。
3. **缺乏可單獨測試的安檢狀態契約**：
   - 外部模組（如 AI 感知或終端機）若需查詢項圈精確狀態或判定逾期風險，需直接深入 `game` 實例。

---

## 2. 需求與架構規格 (Architecture & Requirements Specification)

### 模組一：`src/collarSystem.ts`
定義契約介面 `CollarHost` 與 `CollarSystem`：
- `CollarHost` 介面：
  - `player: Player`
  - `isCollarDisarmed: boolean`
  - `checkInAlertActive: boolean`
  - `securityLevel: SecurityLevel`
  - `robots: Robot[]`
  - `language: 'en' | 'zh'`
  - `pushMessage(text: string, type?: string): void`
  - `pushFloatingText(x: number, y: number, text: string, color: string): void`
  - `gainExp?(amount: number, reason?: string): void`
  - `render(): void`
- `CollarSystem` 提供方法：
  - `handlePlayerStep(host: CollarHost): void`：處理步數遞減、20步警告、10步危急警告、0步警報爆發及巡邏機器人追殺轉向。
  - `performCheckIn(host: CollarHost): void`：簽到重置計時器至 100（或持有憑證時之 `checkInMaxTimer`），清除警報與機器人仇恨。持有主金鑰時轉入永久解除。
  - `disarmCollar(host: CollarHost): void`：永久解除項圈，發送勝利音效、獲得經驗與全域日誌。
  - `getCollarStatus(host: CollarHost)`：獲取項圈即時結構化狀態。

### 模組二：`src/game.ts` 重構
- 將 `src/game.ts` 內的 `performCheckIn`, `handlePlayerStep`, `disarmCollar` 簡化為委派至 `CollarSystem`：
  ```typescript
  performCheckIn(): void {
    CollarSystem.performCheckIn(this);
  }
  handlePlayerStep(): void {
    CollarSystem.handlePlayerStep(this);
  }
  disarmCollar(): void {
    CollarSystem.disarmCollar(this);
  }
  ```
- 保持所有公開成員變數與行為向下相容，不破壞任何既有方法簽章。

### 模組三：驗證測試 (`scripts/verify-collar-system.ts`)
- 測試獨立 `CollarSystem` 介面之行爲（純 Mock Host 下的步數警告、簽到、金鑰解鎖）。
- 確保全量 63+ 套回歸測試（包括 `verify-checkin-collar.ts`）100% 通過。

---

## 3. 驗收標準 (Acceptance Criteria)

1. `src/collarSystem.ts` 建立並通過 TypeScript 編譯。
2. `src/game.ts` 順利委派，無任何型別錯誤。
3. 全量測試（含 `verify-collar-system.ts` 達 64 套）在 15 秒內 100% 通過。
