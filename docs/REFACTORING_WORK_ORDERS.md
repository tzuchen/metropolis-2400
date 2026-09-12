# 🏗️ Metropolis-2400 巨型模組重構工單與執行指南 (Refactoring Playbook)

> **目標**：將專案中的兩大巨型「上帝模組」（`src/renderer.ts` 3,400 行、`src/game.ts` 3,370 行）依職責進行模組化拆分，將單檔規模壓縮至 **500 行以內的最佳維護與 AI Review 視窗**，並藉由全套 36 組整合測試確保 **100% 向下相容、零功能破壞**。

---

## 🗺️ 重構整體分期規劃 (Phased Roadmap)

| 階段 | 目標模組 | 抽離出之新模組 | 預計瘦身 | 驗證測試腳本 | 狀態 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Phase 1** | `src/renderer.ts` | `src/beamRenderer.ts` (武器光束與攻擊特效) | ~400 行 | `scripts/verify-enemy-weapon-fx.ts` | 🟢 工單就緒 |
| **Phase 2** | `src/game.ts` | `src/defeatCutscene.ts` (戰敗過場與禁閉室傳送) | ~450 行 | `scripts/verify-defeat-cinematic.ts` | 🟢 工單就緒 |
| **Phase 3** | `src/game.ts` | `src/terminalRunner.ts` (終端機指令直譯與權限) | ~300 行 | `scripts/verify-terminal-commands.ts` | 🟢 工單就緒 |
| **Phase 4** | `src/renderer.ts` | `src/atmosphereRenderer.ts` (酸雨/濃霧/毒瘴/火花) | ~500 行 | `scripts/verify-random-acid-rain.ts` | 🟡 規劃中 |
| **Phase 5** | `src/game.ts` | `src/citadelHorde.ts` (堡壘無盡蜂擁圍攻控制) | ~200 行 | `scripts/verify-citadel-intense-boss-horde.ts` | 🟡 規劃中 |
| **Phase 6** | `src/renderer.ts` | `src/hudRenderer.ts` (HUD狀態列與小地圖雷達) | ~400 行 | `scripts/verify-hud-layout.ts` | 🟡 規劃中 |

---

## 🚀 Codex 執行方式 (How to Execute via Codex)

使用者可依序將以下指令複製交付給 Codex：

### 執行 Phase 1：抽離武器光束渲染器 (`src/beamRenderer.ts`)
```bash
/home/orin/.local/bin/local-worker launch docs/work-orders/01-weapon-fx-renderer.json
```
*驗收指令*：
```bash
npm run typecheck && npx tsx scripts/verify-enemy-weapon-fx.ts && npm test
```

### 執行 Phase 2：抽離戰敗過場系統 (`src/defeatCutscene.ts`)
```bash
/home/orin/.local/bin/local-worker launch docs/work-orders/02-defeat-cutscene-engine.json
```
*驗收指令*：
```bash
npm run typecheck && npx tsx scripts/verify-defeat-cinematic.ts && npm test
```

### 執行 Phase 3：抽離終端機指令直譯器 (`src/terminalRunner.ts`)
```bash
/home/orin/.local/bin/local-worker launch docs/work-orders/03-terminal-command-runner.json
```
*驗收指令*：
```bash
npm run typecheck && npx tsx scripts/verify-terminal-commands.ts && npm test
```

---

## 🛡️ 重構安全四大鐵律 (Golden Rules)
1. **外觀模式 (Facade Pattern)**：`GameRenderer` 與 `GameEngine` 的公開函式簽名（Public API）必須 100% 保留，內部改為委派（Delegate）調用，不得破壞外部呼叫端。
2. **單步原子化 (Atomic Step)**：每個 Phase 完成後，必須同時通過單元測試、型別檢查與全局 `npm test`，確認無誤後獨立 Commit。
3. **無外部依賴 (Zero Dependency Leak)**：抽離出來的新模組僅使用既有 TypeScript 型別與 Canvas API，不引入第三方庫。
