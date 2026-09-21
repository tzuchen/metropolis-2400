# 工單 WO-REFACTOR-04：分區切換與跨區狀態水合解耦 (Sector Transition & State Hydration Decoupling)

- **工單編號**：`WO-REFACTOR-04`
- **狀態**：`COMPLETED` (已完成)
- **優先級**：`P1` (大檔瘦身與地圖跨區管理解耦)
- **指派執行代理**：`local-coder`
- **架構審查員**：Antigravity (Cloud Architect)
- **關聯模組**：`src/sectorManager.ts`, `src/game.ts`, `scripts/verify-sector-manager.ts`

---

## 1. 背景與核心問題 (Background & Problem Statement)

1. **`src/game.ts` 內仍承載過多地圖切換與實體水合細節**：
   - `switchSector` 函式處理了 `sector-1`、`sector-2`、`sub-sector-0`、`sector-citadel` 四個區域的轉換。
   - 包含特定分區之間的玩家傳送座標計算、實體建置（Robots、Hazards、NPCs）、地面道具保存與水合（`sectorGroundItems`）、推動方塊與暗門狀態還原（`sectorPushableBlocks`、`applyRevealedPushableBlocks`）、以及音樂強度與轉場提示。
2. **缺乏單獨的跨區狀態測試契約**：
   - 跨分區轉換邏輯若有更動，容易牽一髮而動全身，需要可獨立測試的 `SectorManager` 模組。

---

## 2. 需求與架構規格 (Architecture & Requirements Specification)

### 模組一：`src/sectorManager.ts`
定義契約介面 `SectorHost` 與 `SectorManager`：
- `SectorHost` 介面：
  - `map: GameMap`
  - `player: Player`
  - `securityLevel: SecurityLevel`
  - `checkInAlertActive: boolean`
  - `laserBeams: LaserBeam[]`
  - `citadelAirdrops: any[]`
  - `isCitadelHordeActive: boolean`
  - `sectorGroundItems: Record<string, GroundItem[]>`
  - `sectorPushableBlocks: Record<string, PushableBlock[]>`
  - `groundItems: GroundItem[]`
  - `pushableBlocks: PushableBlock[]`
  - `robots: Robot[]`
  - `hazards: Hazard[]`
  - `npcs: NPC[]`
  - `visibleTiles: Set<string>`
  - `exploredTiles: Set<string>`
  - `updateFOV(): void`
  - `updateMusicIntensity(): void`
  - `pushFloatingText(x: number, y: number, text: string, color?: string): void`
  - `pushMessage(text: string, type: GameMessage['type']): void`
- `SectorManager` 靜態方法：
  - `switchSector(host: SectorHost, targetSectorId: string): void`
  - `applyRevealedPushableBlocks(map: GameMap, pushableBlocks: PushableBlock[]): void`
  - 提供輔助建置分區物件之靜態函式。

### 模組二：`src/game.ts` 重構
- 將 `switchSector` 與 `applyRevealedPushableBlocks` 簡化為委派至 `SectorManager`：
  ```typescript
  switchSector(targetSectorId: string): void {
    SectorManager.switchSector(this, targetSectorId);
  }
  ```
- 保持 `game.switchSector` 的既有公開 API 與行為完全相容。

### 模組三：驗證測試 (`scripts/verify-sector-manager.ts`)
- 測試獨立 `SectorManager` 在各分區（Sector 1 -> Sub-Sector 0 -> Sector 2 -> Citadel）的切換與狀態保存水合。
- 確保全量 65 套回歸測試在 15 秒內 100% 通過。

---

## 3. 驗收標準 (Acceptance Criteria)

1. `src/sectorManager.ts` 建立並通過 TypeScript 編譯。
2. `src/game.ts` 成功委派，縮減約 100~130 行代碼。
3. 全量測試（含 `verify-sector-manager.ts` 達 65 套）100% 通過。
