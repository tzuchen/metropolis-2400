# 工單 WO-COMBAT-01：特工戰術即時拔槍開火 (Auto-Draw) 與交戰反射強化

- **工單編號**：`WO-COMBAT-01`
- **狀態**：`COMPLETED` (已交付驗收)
- **優先級**：`P0` (AI Agent 戰鬥致命缺陷修復與 Playtester 推進)
- **指派執行代理**：`local-coder`
- **架構審查員**：Antigravity (Cloud Architect)
- **關聯模組**：`src/actionExecutor.ts`、`src/aiPerception.ts`、`scripts/verify-combat-reflexes.ts`

---

## 1. 背景與核心問題 (Background & Problem Statement)

根據使用者回報與系統運行日誌 (`/home/orin/.local/share/local-playtester/jobs/20260919120350-api/`)，Playtester 在 5,380 回合中死掉 8 次，且武器攻擊僅僅發生了 16 次（全場佔比僅 0.29%）。

經深入代碼溯源，發現兩大致命的狀態機缺陷：
1. **未拔槍時 `FIRE_*` 不在合法動作內**：
   在 [`src/aiPerception.ts`](file:///home/orin/metropolis-2400/src/aiPerception.ts) 中，若 `player.isWeaponDrawn === false`，`valid_actions` 僅提供 `DRAW_WEAPON`，嚴禁任何開火動作。LLM 必須先預判花費一回合拔槍，但敵軍已貼身圍毆，導致 LLM 選擇逃跑或等待。
2. **未拔槍時執行 `FIRE_*` 誤判為走進敵人**：
   若 Agent 試圖發送 `FIRE_E` 或 `FIRE_N`，[`src/actionExecutor.ts`](file:///home/orin/metropolis-2400/src/actionExecutor.ts) 直接模擬 `ArrowRight` / `ArrowUp` 鍵。由於特工處於收槍狀態，引擎將方向鍵判定為「向東/向北移動」，特工直接朝機器人迎面走去，觸發碰撞或近戰受創 (`moved_instead_of_fired`)，完全無法開火！

---

## 2. 需求與架構規格 (Architecture & Requirements Specification)

### 模組一：`src/actionExecutor.ts` 支援戰術即時拔槍 (Auto-Draw on Fire)
- 當 `action.startsWith('FIRE_')` 且 `!game.player.isWeaponDrawn` 時：
  - 自動將 `game.player.isWeaponDrawn = true`。
  - 直接調用 `game.fireEquippedWeapon(direction)` 觸發對應方向開火邏輯，絕不模擬方向鍵。
  - 徹底杜絕收槍或無目標時引發的誤走進敵軍 (`moved_instead_of_fired`)。
- 完善擊殺回能與消耗判定：
  - 若敵軍被消滅或能量扣除，確保 `outcome.fired = true` 且 `outcome.reason = 'weapon_fired'`。
  - 能量耗盡回傳 `reason = 'insufficient_energy'`，無武器回傳 `reason = 'no_weapon_equipped'`。

### 模組二：`src/aiPerception.ts` 開放常駐開火選項
- 在 `validActions` 判定中：
  - 只要特工有裝備武器且能量足夠（`energy >= weapon.energyCost`），無論是否已手動按 F 拔槍，一律將 `FIRE_FACING`、`FIRE_N`、`FIRE_S`、`FIRE_E`、`FIRE_W` 納入 `valid_actions`。

### 模組三：驗證腳本 (`scripts/verify-combat-reflexes.ts`)
- 在特工未拔槍（`isWeaponDrawn = false`）情況下，執行 `executeAIAction('FIRE_E')`。
- 驗證特工成功自動拔槍、消耗能量、發射雷射、擊毀東方的機器人，且 `outcome.fired === true`、`outcome.reason === 'weapon_fired'`。
- 驗證 `valid_actions` 在收槍狀態下依然包含所有 `FIRE_*` 選項。

---

## 3. 驗收標準 (Acceptance Criteria)

1. 特工在未拔槍狀態下執行 `FIRE_*` 能自動拔槍並開火命中，徹底消除誤走向敵人的行為。 (Pass)
2. `scripts/verify-combat-reflexes.ts` 綠燈通過。 (Pass)
3. 全量測試 100% 通過（總測試數達 63 套）。 (Pass)
