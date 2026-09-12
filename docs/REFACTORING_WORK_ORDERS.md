# 🏗️ Metropolis-2400 巨型模組重構全期工單指南 (Master Refactoring Playbook)

> **目標**：將專案中的兩大巨型「上帝模組」（`src/renderer.ts` 3,400 行、`src/game.ts` 3,370 行）依職責進行 7 階段模組化拆分，將單檔規模壓縮至 **500 行以內的最佳維護與 AI Review 視窗**，並藉由全套 36 組整合測試確保 **100% 向下相容、零功能破壞**。

---

## 🗺️ 全期重構進度看板 (Master Roadmap)

| 階段 | 目標模組 | 抽離出之新模組 | 預計瘦身 | 專屬驗證腳本 | 狀態 | 工單檔案 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Phase 1** | `src/renderer.ts` | `src/beamRenderer.ts` (武器光束與攻擊特效) | **-371 行** | `verify-enemy-weapon-fx.ts` | **✅ 已完成 (03f335d)** | [`01-weapon-fx-renderer.json`](./work-orders/01-weapon-fx-renderer.json) |
| **Phase 2** | `src/game.ts` | `src/defeatCutscene.ts` (戰敗過場與禁閉室傳送) | **~450 行** | `verify-defeat-cinematic.ts` | **🟢 工單就緒** | [`02-defeat-cutscene-engine.json`](./work-orders/02-defeat-cutscene-engine.json) |
| **Phase 3** | `src/game.ts` | `src/terminalRunner.ts` (終端機指令直譯與權限) | **~300 行** | `verify-terminal-commands.ts` | **🟢 工單就緒** | [`03-terminal-command-runner.json`](./work-orders/03-terminal-command-runner.json) |
| **Phase 4** | `src/renderer.ts` | `src/atmosphereRenderer.ts` (酸雨/濃霧/毒瘴/火花) | **~500 行** | `verify-random-acid-rain.ts` | **🟢 工單就緒** | [`04-atmosphere-renderer.json`](./work-orders/04-atmosphere-renderer.json) |
| **Phase 5** | `src/game.ts` | `src/citadelHorde.ts` (佐格堡壘無盡蜂擁圍攻) | **~200 行** | `verify-citadel-intense-boss-horde.ts` | **🟢 工單就緒** | [`05-citadel-horde-controller.json`](./work-orders/05-citadel-horde-controller.json) |
| **Phase 6** | `src/renderer.ts` | `src/modalRenderer.ts` (UI彈窗與通關遮罩) | **~800 行** | `verify-inventory-modal.ts` | **🟢 工單就緒** | [`06-modal-overlay-renderer.json`](./work-orders/06-modal-overlay-renderer.json) |
| **Phase 7** | `src/game.ts` | `src/hazardSystem.ts` (傳送帶物理與電漿鋼瓶) | **~200 行** | `verify-conveyor-belts.ts` | **🟢 工單就緒** | [`07-conveyor-hazard-engine.json`](./work-orders/07-conveyor-hazard-engine.json) |

---

## 🚀 Codex 各階段執行指令速查表 (Quick Copy-Paste Commands)

使用者可按順序將各階段指令直接交給 Codex 執行：

### Phase 2：戰敗被捕與禁閉室轉場系統 (`src/defeatCutscene.ts`)
```bash
/home/orin/.local/bin/local-worker launch docs/work-orders/02-defeat-cutscene-engine.json
```
*驗收指令*：
```bash
npm run typecheck && npx tsx scripts/verify-defeat-cinematic.ts && npm test
```

### Phase 3：終端機指令直譯器 (`src/terminalRunner.ts`)
```bash
/home/orin/.local/bin/local-worker launch docs/work-orders/03-terminal-command-runner.json
```
*驗收指令*：
```bash
npm run typecheck && npx tsx scripts/verify-terminal-commands.ts && npm test
```

### Phase 4：環境天氣與氛圍著色器 (`src/atmosphereRenderer.ts`)
```bash
/home/orin/.local/bin/local-worker launch docs/work-orders/04-atmosphere-renderer.json
```
*驗收指令*：
```bash
npm run typecheck && npx tsx scripts/verify-random-acid-rain.ts && npm test
```

### Phase 5：佐格堡壘無盡增援控制器 (`src/citadelHorde.ts`)
```bash
/home/orin/.local/bin/local-worker launch docs/work-orders/05-citadel-horde-controller.json
```
*驗收指令*：
```bash
npm run typecheck && npx tsx scripts/verify-citadel-intense-boss-horde.ts && npm test
```

### Phase 6：UI 彈窗與全螢幕覆蓋層 (`src/modalRenderer.ts`)
```bash
/home/orin/.local/bin/local-worker launch docs/work-orders/06-modal-overlay-renderer.json
```
*驗收指令*：
```bash
npm run typecheck && npx tsx scripts/verify-inventory-modal.ts && npm test
```

### Phase 7：工業傳送帶物理與電漿危險物 (`src/hazardSystem.ts`)
```bash
/home/orin/.local/bin/local-worker launch docs/work-orders/07-conveyor-hazard-engine.json
```
*驗收指令*：
```bash
npm run typecheck && npx tsx scripts/verify-conveyor-belts.ts && npm test
```

---

## 🛡️ 重構安全四大鐵律 (Golden Directives)
1. **外觀模式 (Facade Pattern)**：`GameRenderer` 與 `GameEngine` 的公開函式簽名（Public API）必須 100% 保留，內部改為委派（Delegate）調用，不得破壞外部呼叫端。
2. **單步原子化 (Atomic Step)**：每個 Phase 完成後，必須同時通過單元測試、型別檢查與全局 `npm test`，確認無誤後獨立 Commit。
3. **無外部依賴 (Zero Dependency Leak)**：抽離出來的新模組僅使用既有 TypeScript 型別與 Canvas API，不引入第三方庫。
