# 工單 WO-REFACTOR-05：存檔讀檔契約化與狀態重置解耦 (Save/Load Contract & Game State Reset Extraction)

- **工單編號**：`WO-REFACTOR-05`
- **狀態**：`COMPLETED` (已完成)
- **優先級**：`P1` (型別安全與大檔瘦身)
- **指派執行代理**：`local-coder`
- **架構審查員**：Antigravity (Cloud Architect)
- **關聯模組**：`src/saveLoad.ts`, `src/game.ts`, `scripts/verify-save-host.ts`

---

## 1. 背景與核心問題 (Background & Problem Statement)

1. **`src/saveLoad.ts` 核心 API 缺乏型別防護**：
   - `saveGameState(game: any)` 與 `loadGameState(game: any)` 全量接受 `any` 型別參數，編譯器無法驗證傳入物件是否具備所需屬性（如 `player`、`robots`、`map` 等）。
2. **`restartGame` 狀態重置邏輯臃腫**：
   - `src/game.ts` 的 `restartGame()` 包含了近 60 行手動重置 30 多個旗標與介面狀態的代碼，缺乏模組化封裝。

---

## 2. 需求與架構規格 (Architecture & Requirements Specification)

### 模組一：`src/saveLoad.ts` 定義 `SaveHost` 與 `resetGameSession`
- 定義契約介面 `SaveHost`：
  - `language: Language`
  - `player: Player`
  - `map?: SectorMap`
  - `robots?: Robot[]`
  - `hazards?: Hazard[]`
  - `npcs?: NPC[]`
  - `storyLogs?: StoryLog[]`
  - `groundItems?: GroundItem[]`
  - `missionObjectives?: MissionObjective[]`
  - `pushableBlocks?: PushableBlock[]`
  - `sectorGroundItems?: Record<string, GroundItem[]>`
  - `sectorPushableBlocks?: Record<string, PushableBlock[]>`
  - `isCollarDisarmed?: boolean`
  - `checkInAlertActive?: boolean`
  - `securityLevel?: SecurityLevel`
  - `switchSector?(sectorId: string): void`
- 替換 `saveGameState(host: SaveHost): boolean` 與 `loadGameState(host: SaveHost): boolean`。
- 新增 `resetGameSession(host: any): void`，集中處理各彈窗狀態重置、地圖/玩家重建、日誌載入與訊息推送。

### 模組二：`src/game.ts` 重構
- `saveGame()`、`loadGame()`、`restartGame()` 調用 `SaveHost` 契約方法與 `resetGameSession`。
- 保持外部 API 與測試行為 100% 向下相容。

### 模組三：驗證測試 (`scripts/verify-save-host.ts`)
- 測試獨立 `SaveHost` 契約實作下的存檔、讀檔、版本遷移與狀態重置。
- 確保全量 66 套回歸測試全部通過。

---

## 3. 驗收標準 (Acceptance Criteria)

1. `src/saveLoad.ts` 中的 `saveGameState` 與 `loadGameState` 採用 `SaveHost` 介面。
2. `src/game.ts` 順利委派並縮減約 50 行代碼。
3. 全量測試（含 `verify-save-host.ts` 達 66 套）在 15 秒內 100% 通過。
