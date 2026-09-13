# Metropolis-2400: AI Agent 協同開發與重構守則 (AI Agent Protocols)

本專案採用「**雲端架構師 (Cloud Architect, Antigravity) + 本地自主代理 (Local Worker, Codex / local-coder)**」的粗粒度高效協同模式。任何操作此專案的 AI 代理均必須嚴格遵守以下準則，以杜絕認知飄移與架構衰退。

---

## 1. 核心分工原則 (Division of Responsibility)

1. **雲端架構師 (Antigravity)**：
   - 負責架構審計、模組邊界劃分、工單 (Work Order) 制定與審查。
   - 負責最終 `git diff` 審查、全域回歸測試 (`npm test`) 與版本提交推送。
   - **禁止微觀逐行改檔**：嚴禁繞過本地代理直接進行瑣碎的行內編輯，應透過工單或 `local-coder` 委派。
2. **本地自主代理 (Codex / local-coder)**：
   - 負責具體程式碼抽離、模組編寫與單元修正。
   - 僅在工單授權的 `allowed_files` 白名單內進行修改，嚴禁觸碰 `forbidden_files`。
   - 修改完成後必須在本機跑通 `npm run typecheck` 與相關測試，並自我修復。

---

## 2. 專案架構鐵律 (Architectural Invariants)

1. **零破壞性保證 (Zero Regressions Guarantee)**：
   - 任何重構或功能擴充，必須維持全部 37 套整合與回歸測試 100% 綠燈通過。
   - 外部公開 API（如 `GameEngine.prototype.render`、`handleKeyDown`、`saveGameState`）維持向下相容。
2. **享元查表原則 (Flyweight & Table Lookup)**：
   - 嚴格維持地圖 `map.tiles` 為 `TileType[][]` (數字矩陣)，嚴禁將各網格包裝為獨立 JS 堆積物件以防記憶體與 GC 膨脹。
   - 網格物理與光學屬性統一透過 `getTileProperties(tile)` 查表取得。
3. **能力介面解耦 (Capability Interfaces)**：
   - 抽離出的獨立系統（如 `InteractionSystemHost`、`QuestHost`）一律定義最小必要能力介面，禁止反向直接 `import { GameEngine }`，杜絕 Circular Dependency。
4. **渲染純化原則 (Pure Rendering Pipeline)**：
   - `render()` 必須是無副作用的純繪製管線，嚴禁在繪製函式中夾帶粒子更新 (`fx.update`)、計時推進或音樂模式改寫。狀態推進一律在 `tick()` 或狀態事件中處理。

---

## 3. 工單生命週期 (Work Order Lifecycle)

任何跨檔案模組重構必須遵守以下步驟：
```
[1. 審批工單 (WO JSON)] ➔ [2. 本地代理白名單執行] ➔ [3. 本地自測] ➔ [4. 架構師 Diff 審查] ➔ [5. Commit & Push]
```
