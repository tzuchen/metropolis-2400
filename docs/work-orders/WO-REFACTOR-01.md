# 工單 WO-REFACTOR-01：戰鬥系統能力介面 (CombatHost) 解耦與消除 as any

- **工單編號**：`WO-REFACTOR-01`
- **狀態**：`COMPLETED` (已交付驗收)
- **優先級**：`P1` (型別安全與架構邊界硬化)
- **指派執行代理**：`local-coder`
- **架構審查員**：Antigravity (Cloud Architect)
- **關聯模組**：`src/types.ts`、`src/combat.ts`、`src/game.ts`

---

## 1. 背景與核心問題 (Background & Problem Statement)

在先前進行的模組化拆分中，`src/combat.ts` 從核心引擎獨立出來，但由於直接依賴完整的 `GameEngine` 類別型別，產生了循環依賴與型別不全問題。
為繞過型別錯誤，`src/combat.ts` 內部大量採用了 `(game as any)` 與 `(game.fx as any)`，累計多達 **55 處 `as any`**：
- `(game as any).pushMessage(...)`
- `(game as any).pushFloatingText(...)`
- `(game as any).gainExp(...)`
- `(game.fx as any).triggerShake(...)`
- `(game.fx as any).spawnExplosion(...)`

這嚴重破壞了 TypeScript 的靜態分析能力，一旦 `game.ts` 修改函式名稱或參數，編譯器將無法提前報警。

---

## 2. 需求與架構規格 (Architecture & Requirements Specification)

比照專案現有的 `InteractionHost`（用於互動系統）與 `QuestHost`（用於任務系統）模式，採用 **能力介面（Capability Interface）** 解耦。

### 模組一：`src/types.ts` 宣告 `CombatHost`
```typescript
export interface CombatHost {
  player: Player;
  robots: Robot[];
  hazards: Hazard[];
  pushableBlocks: PushableBlock[];
  map: SectorMap;
  groundItems: GroundItem[];
  beams: any[];
  securityLevel: SecurityLevel;
  checkInAlertActive?: boolean;
  language: Language;
  pushMessage(text: string, type?: MessageType): void;
  pushFloatingText(x: number, y: number, text: string, color?: string): void;
  gainExp(amount: number, reason?: string): void;
  render(): void;
  fx: {
    spawnExplosion(x: number, y: number, radius?: number): void;
    triggerShake(intensity: number): void;
    spawnSparks(x: number, y: number, color?: string, count?: number): void;
  };
  renderer?: {
    tileSize: number;
  };
}
```

### 模組二：重構 `src/combat.ts`
- 函式簽名由 `(game: GameEngine, ...)` 改為 `(game: CombatHost, ...)`。
- 全面移除所有的 `as any`，改為型別安全的直接方法調用：
  - `game.pushMessage(...)`
  - `game.pushFloatingText(...)`
  - `game.gainExp(...)`
  - `game.fx.triggerShake(...)`
  - `game.fx.spawnExplosion(...)`

---

## 3. 驗收標準 (Acceptance Criteria)

1. `src/combat.ts` 內部的 `as any` 計數歸零。
2. `npm run typecheck` 零錯誤通過。
3. `scripts/verify-weapons.ts` 與 `scripts/verify-combat-fx-dash-gps.ts` 綠燈通過。
4. 全套回歸測試 100% 通過，戰鬥數值、打擊感與掉落行為完全相容。
