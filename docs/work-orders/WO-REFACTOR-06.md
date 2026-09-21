# 工單 WO-REFACTOR-06：玩家輸入路由與移動控制解耦 (Input Router & Player Movement Decoupling)

- **工單編號**：`WO-REFACTOR-06`
- **狀態**：`COMPLETED` (已完成)
- **優先級**：`P1` (大檔瘦身與輸入/移動分離)
- **指派執行代理**：`local-coder`
- **架構審查員**：Antigravity (Cloud Architect)
- **關聯模組**：`src/playerMovement.ts`, `src/inputRouter.ts`, `src/game.ts`, `scripts/verify-player-movement.ts`

---

## 1. 背景與核心問題 (Background & Problem Statement)

1. **`src/inputRouter.ts` 過度龐大 (1,249 行)**：
   - 目前 `inputRouter.ts` 同時承擔「按鍵事件分發」與「玩家實體移動/推方塊/對話/開火碰撞判定」兩大繁重職責。
2. **移動邏輯高達 300 多行混在 Router 內**：
   - `handleMovement` 方法實作了推箱子、通風口金屬柵板特殊推動、與 NPC 借過換位、拔槍開火朝向判定、地面道具拾取觸發與視野更新，與單純的按鍵鍵位分發職責嚴重違背。
3. **缺乏獨立的移動/推塊測試契約**：
   - 難以在不實例化完整輸入迴圈的情況下單獨測試玩家移動、障礙阻擋與推動方塊演算法。

---

## 2. 需求與架構規格 (Architecture & Requirements Specification)

### 模組一：`src/playerMovement.ts`
定義契約介面 `MovementHost` 與 `PlayerMovementController`：
- `MovementHost` 介面：
  - `player: Player`
  - `map: SectorMap`
  - `robots: Robot[]`
  - `npcs: NPC[]`
  - `hazards: Hazard[]`
  - `pushableBlocks: PushableBlock[]`
  - `activeDialogue: DialogueSession | null`
  - `language: Language`
  - `lastDialogueNpcId: string | null`
  - `fireEquippedWeapon(direction: { dx: number; dy: number }): void`
  - `updateNPCDialogues(): void`
  - `checkSideQuestDiscovery(npcId: string): void`
  - `handlePlayerStep(): void`
  - `checkItemPickup(): void`
  - `tick(): void`
  - `render(): void`
  - `pushFloatingText(x: number, y: number, text: string, color?: string): void`
  - `pushMessage(text: string, type: GameMessage['type']): void`
- `PlayerMovementController` 靜態方法：
  - `handleMovement(host: MovementHost, dx: number, dy: number): void`
  - 封裝與 NPC 對話或交換位置（借過）
  - 封裝拔槍朝障礙/敵軍開火
  - 封裝推動方塊（含通風口特殊推移與暗門揭露）
  - 封裝正常步行移動與步數扣減

### 模組二：`src/inputRouter.ts` 重構
- 將 `src/inputRouter.ts` 內的 `private handleMovement` 轉為委派至 `PlayerMovementController.handleMovement(this.buildMovementHost(), dx, dy)`。
- 大幅瘦身 `src/inputRouter.ts` 300+ 行代碼。
- 保持外部 `handleKeyDown` 的行為與鍵位定義 100% 相容。

### 模組三：驗證測試 (`scripts/verify-player-movement.ts`)
- 測試獨立 `PlayerMovementController` 下的普通移動、推塊、障礙物開火轉向與 NPC 借過換位。
- 確保全量 67 套回歸測試 100% 綠燈通過。

---

## 3. 驗收標準 (Acceptance Criteria)

1. `src/playerMovement.ts` 建立並通過 TypeScript 編譯。
2. `src/inputRouter.ts` 成功委派並縮減約 300 行代碼。
3. 全量測試（含 `verify-player-movement.ts` 達 67 套）在 15 秒內 100% 通過。
