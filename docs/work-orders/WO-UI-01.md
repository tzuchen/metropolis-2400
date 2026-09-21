# 工單 WO-UI-01：控制面板快捷鍵補全與操作指引對齊

- **工單編號**：`WO-UI-01`
- **狀態**：`COMPLETED` (已交付驗收)
- **優先級**：`P0` (使用者體驗與按鍵提示完整性)
- **指派執行代理**：`local-coder`
- **架構審查員**：Antigravity (Cloud Architect)
- **關聯模組**：`index.html`、`src/style.css`、`scripts/verify-control-panel-bindings.ts`

---

## 1. 背景與核心問題 (Background & Problem Statement)

在 [`index.html`](file:///home/orin/metropolis-2400/index.html#L22-L65) 底部 `.control-panel` 中，列出了許多遊戲操作提示（`W A S D` 移動、`F` 拔槍、`C` 迷彩、`Q` 換槍等），但唯獨遺漏了三大核心功能按鍵：
1. **`[P]` 戰術日記 (Operative Journal)**：特工在整個遊戲冒險中留下跨存檔筆記的核心機制。
2. **`[Z]` 雙語切換 (Bilingual Toggle)**：遊戲全文本繁體中文／英文即時切換鍵。
3. **`[H]` 特工手冊 (Tactical Manual)**：內含各階機甲弱點與操作圖鑑。

缺少這三項提示使得新玩家或觀戰者難以直觀獲取這些強大功能。

---

## 2. 需求與架構規格 (Architecture & Requirements Specification)

### 模組一：`index.html` 控制欄位擴展
在 `<div class="control-panel">` 中依序加入：
```html
<div class="key-group">
  <span class="key">P</span> <span>JOURNAL</span>
</div>
<div class="key-group">
  <span class="key">Z</span> <span>LANG (ZH/EN)</span>
</div>
<div class="key-group">
  <span class="key">H</span> <span>MANUAL</span>
</div>
```

### 模組二：`src/style.css` 排版微調
- 確保 `.control-panel` 採用 flex 彈性佈局與合理 gap，在各種視窗寬度下不產生破版或超出 CRT 螢幕邊框。

### 模組三：驗證腳本 (`scripts/verify-control-panel-bindings.ts`)
- 讀取 `index.html`，以正規表示法校驗 `P`、`Z`、`H` 等所有關鍵鍵位群組均已宣告於面板中。

---

## 3. 驗收標準 (Acceptance Criteria)

1. 前端頁面底部控制欄完整展示 `[P]`、`[Z]`、`[H]`。
2. `npx tsx scripts/verify-control-panel-bindings.ts` 驗證通過。
3. 頁面排版整潔，無 CSS 跑版或截斷問題。
