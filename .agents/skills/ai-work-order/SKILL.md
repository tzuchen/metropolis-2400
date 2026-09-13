---
name: ai-work-order
description: >-
  Use this skill when preparing, formulating, or auditing refactoring work orders (JSON / Markdown) for autonomous agents in metropolis-2400.
---

# AI Work Order Generation & Audit Runbook

本技能提供在 `metropolis-2400` 專案中生成嚴謹、具備白名單邊界防護的重構工單標準作業程序 (SOP)。

## 1. 工單標準 JSON 格式

```json
{
  "id": "WO-<Phase>-<Seq>",
  "phase": 1,
  "title": "簡短標題",
  "objective": "具體重構目標",
  "allowed_files": [
    "src/targetModule.ts"
  ],
  "forbidden_files": [
    "src/game.ts",
    "src/renderer.ts"
  ],
  "contracts": [
    "TargetInterface"
  ],
  "implementation_guidelines": [
    "1. 步驟一...",
    "2. 步驟二..."
  ],
  "verification_commands": [
    "npm run typecheck",
    "npm test"
  ],
  "acceptance_criteria": [
    "標準一",
    "標準二"
  ],
  "status": "APPROVED",
  "assigned_worker": "codex"
}
```

## 2. 審查檢查清單 (Audit Checklist)

- [ ] **白名單邊界無衝突**：`allowed_files` 與 `forbidden_files` 互斥。
- [ ] **循環依賴防護**：新抽離的模組是否使用 Host / Capability 介面？
- [ ] **向下相容性**：是否破壞現有公開函式簽名？
- [ ] **自動化驗收指令完整**：必須包含 `npm run typecheck` 與 `npm test`。
