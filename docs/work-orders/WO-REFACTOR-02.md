# 工單 WO-REFACTOR-02：地標系統抽取與 AI 感官/動作模組化解耦

- **工單編號**：`WO-REFACTOR-02`
- **狀態**：`COMPLETED` (已交付驗收)
- **優先級**：`P2` (代碼規模模組化與單一職責)
- **指派執行代理**：`local-coder`
- **架構審查員**：Antigravity (Cloud Architect)
- **關聯模組**：`src/game.ts`、`src/landmarkSystem.ts`、`src/aiPerception.ts`、`src/actionExecutor.ts`

---

## 1. 背景與核心問題 (Background & Problem Statement)

目前代碼庫中有兩個檔案體積龐大且職責混合：
1. **`src/game.ts` (2,278 行)**：
   - 包含多段地標檢測（Landmark Detection）與相鄰通道探測邏輯，大量硬編碼 `px >= 24 && px <= 28 ...`，膨脹了核心引擎體積。
2. **`src/aiPerception.ts` (2,071 行)**：
   - 同時承載了兩大完全不同的領域：
     - **知覺生成 (Perception Snapshot)**：純觀察環境，計算雷達、視野、附近實體、地圖前沿、任務狀態。
     - **動作執行 (Action Executor)**：接收文字動作字串（`MOVE_N`, `FIRE_S`, `DRAW_WEAPON`, `CMD_CHECKIN`），觸發鍵盤事件、模擬碰撞、開火扣能並計算 action outcome。
   - 單檔超過 2,000 行對本機 LLM 單次 Patch 產生較大的注意力和 Token 負擔。

---

## 2. 需求與架構規格 (Architecture & Requirements Specification)

### 模組一：地標與通道感知系統 (`src/landmarkSystem.ts`)
- 抽取純函式：
  ```typescript
  export function checkLandmarks(
    sectorId: string,
    px: number,
    py: number,
    isZh: boolean,
    lastLandmarkKey: string
  ): { key: string; message: string | null };

  export function checkAdjacentPassages(
    map: SectorMap,
    px: number,
    py: number,
    isZh: boolean,
    lastAdjacentKey: string
  ): { key: string; message: string | null };
  ```
- 使 `game.ts` 的移動回呼只需調用上述函式並推送訊息，縮減 `game.ts` 200+ 行代碼。

### 模組二：動作執行器 (`src/actionExecutor.ts`)
- 將 `executeAIAction` 及其內部輔助映射（`actionToKey`、方向換算等）完整抽取至 `src/actionExecutor.ts`。
- 在 `src/aiPerception.ts` 中保持 re-export：
  ```typescript
  export { executeAIAction } from './actionExecutor';
  ```
- 確保所有測試、`window.executeAIAction` 以及無頭測試工具完全相容。

---

## 3. 驗收標準 (Acceptance Criteria)

1. `src/game.ts` 移除長篇地標座標判斷。
2. `src/aiPerception.ts` 行數降低至 1,500 行以內，職責純化為感官生成。
3. `scripts/verify-ai-perception.ts` 與 `scripts/verify-game.ts` 綠燈通過。
4. 全套測試 100% 通過。
