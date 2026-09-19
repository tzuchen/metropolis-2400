# 工單 WO-AGENT-01：特工任務驅動決策與區域感知架構升級 (Agent Mission-Driven Decision & Spatial Zone Awareness Overhaul)

- **工單編號**：`WO-AGENT-01`
- **狀態**：`APPROVED` (可指派執行)
- **指派執行代理**：`local-coder`
- **架構審查員**：Antigravity (Cloud Architect)
- **關聯系統**：`aiPerception`、`zoneRegistry`、`defeatCutscene`、`interactionSystem`、`local-playtester`

---

## 1. 背景與核心問題 (Background & Problem Statement)

在之前的長跑實境測試中，特工（Autonomous Agent）展現出空間失明與機械死腦筋行為：
1. **空間失明 (Spatial Blindness)**：
   - 既有 [`src/aiPerception.ts`](file:///home/orin/metropolis-2400/src/aiPerception.ts) 僅能回報頂層扇區 ID（如 `sector_id: "sector-1"`），整張 40×30 地圖共用同一名稱。特工被捕入獄後，無法從知覺 API 得知自己身在「佐格禁閉室」，而誤以為仍在寬廣主街，導致導航向西盲目衝撞死牆 20+ 回合。
2. **缺乏結構化任務目標驅動 (Lack of Structured Mission Focus)**：
   - 特工過度依賴 600+ 行小說散文檢索與純座標探索。被捕後未將「越獄與找回裝備」確立為最高優先級任務狀態機，缺乏目標焦點。
3. **迷霧探索 vs. 經驗記憶的失衡**：
   - 使用者明確要求：任務應當提供「目標與線索（What & Clues）」，保留迷霧探索，不應直接灌入全圖作弊 GPS 座標；但經歷過一次被捕脫逃後，特工的心智地圖必須學會並記住通風口暗道、警衛終端機與證物箱的 POI，第二次被捕時應能熟練脫逃，展現出學習曲線。
4. **特工心智反射瑕疵與死鎖 (Agent Mental Reflex Issues)**：
   - 戰略審查若 LLM 輸出未包含結構化 JSON，會引發 `Strategic review requires strategic_plan` 死循環。
   - 面前門扉已處於 `DOOR_OPEN` 狀態時，特工反覆按 [E] 開關門，無法果斷邁步穿過。
   - 指揮頻道發出過期消耗品使用指令時，因背包數量為 0 原地卡死 8 回合。

---

## 2. 需求共識與架構規格 (Architecture & Requirements Specification)

### 模組一：地圖區域感知註冊系統 (`src/zoneRegistry.ts`)
新增獨立、純資料驅動之區域查表模組，嚴格遵守能力介面與享元原則，禁止反向依賴 `GameEngine`。

#### 核心定義：
```typescript
export interface ZoneLocationInfo {
  zone_id: string;
  name_zh: string;
  name_en: string;
  description: string;
  description_zh: string;
  is_restricted: boolean; // 是否為執法/拘禁高危險禁區
}
```

#### 區域 Bounding Box 登錄清單：
- **Sector 1 (市中心商業與安全區)**：
  - `rebel_safehouse` `(2..10, 2..8)`：反抗軍秘密安全屋（安全避難所）
  - `downtown_main_street` `(11..25, 8..13)`：市中心主幹道（巡邏機器人密集）
  - `cyber_park` `(18..22, 10..14)`：生化綠能公園
  - `checkpoint_outpost` `(24..28, 4..8)`：01 號檢查哨哨所
  - `checkpoint_relay_annex` `(28..31, 4..9)`：檢查哨中繼附屬區
  - `detention_cell` `(33..37, 3..7)`：佐格禁閉牢房（高危險拘押區，`is_restricted: true`）
  - `detention_guard_post` `(31..33, 1..8)`：禁閉所警衛室與證物庫（`is_restricted: true`）
  - `transit_elevator` `(34..38, 23..27)`：通往製造複合體升降梯
- **Sub-Sector 0 (地下排水與維護線)**：
  - `sludge_pump_station`：污泥抽水主站與中繼終端
  - `sunken_freighter`：失事貨艇殘骸處
  - `drainage_maintenance_tunnel`：地下排水廊道
- **Sector 2 (工業製造複合體)**：
  - `factory_assembly_floor`：工業流水線大廳
  - `synchronizer_chamber`：主腦同步器核心機房
  - `smuggler_black_market`：黑市藏匿點
- **Citadel (佐格頂層核心)**：
  - `citadel_gate`：堡壘前庭通道
  - `overmind_core`：佐格超腦中樞

提供查詢函式：
```typescript
export function resolveZoneLocation(sectorId: string, x: number, y: number): ZoneLocationInfo;
```

---

### 模組二：AI 感知快照擴充 (`src/aiPerception.ts` & `src/types.ts`)
在 `AIPerceptionSnapshot` 中新增 `current_location` 欄位：
```typescript
export interface AIPerceptionSnapshot {
  // ...既有欄位
  current_location: ZoneLocationInfo;
}
```
- 特工每一回合收到快照時，可直接取得當前微觀環境語意。
- 任務清單 `mission_objectives` 支援 priority，緊急/未完成任務置頂。

---

### 模組三：動態禁閉脫逃任務生命週期 (`src/defeatCutscene.ts` & `src/interactionSystem.ts`)

1. **被拘禁事件觸發 (`executeDetentionRelocation`)**：
   - 特工被捕甦醒後，動態在 `game.missionObjectives` 最前列插入緊急任務：
     ```typescript
     {
       id: 'obj-detention-escape',
       title: 'Detention Breakout & Gear Recovery',
       titleZh: '【緊急】禁閉室死線脫逃與裝備奪還',
       description: 'Inspect cell perimeter for structural weaknesses or ventilation grates. Infiltrate guard room to recover confiscated locker.',
       descriptionZh: '牢房防爆門已被鎖死；搜查牢房周圍尋找通風管或鬆動暗道，繞行至警衛室取回被沒收的個人裝備。',
       completed: false,
       priority: 'CRITICAL',
       discovered: true
     }
     ```
   - **項圈計時器保證**：確認 `p.checkInTimer = p.checkInMaxTimer || 100;` 確實重置至最大值；若玩家已取得偽造憑證，其上限值 125 步應完整被保留。
   - **保留探索性**：日誌與提示提供環境觀察線索（如「注意牢房角落鬆動的金屬格柵」），不提供作弊級 GPS 絕對座標，迷霧如實遮蔽。

2. **任務完成事件觸發 (`interactionSystem.ts` / `game.ts`)**：
   - 特工搜刮 `item-confiscated-locker` 取回全套武裝時：
     - 標記 `obj-detention-escape.completed = true;`
     - 彈出任務完成通知；
     - 特工焦點自動回歸次一個未完成的主線目標。

---

### 模組四：特工心智反射與 POI 學習記憶 (`playtester-v2.mjs`)

1. **戰略審查死鎖根除 (Strategic Review Deadlock Fix)**：
   - 若 LLM 回應未提供符合格式的 `strategic_plan`，降級處理並自動重置 `activeStrategicReview = null`，絕不卡死後續回合。
2. **門扉互動防呆反射 (Door Interaction Reflex)**：
   - 若面前相鄰的門扉狀態已為 `DOOR_OPEN`，禁止輸出 `INTERACT` 動作（避免反覆開關門），強制輸出 `MOVE` 動作穿過門框。
3. **無效消耗品指令跳過**：
   - 若指揮訊號要求使用某種消耗品，但特工背包存量為 0，立即標記無法執行並跳過，杜絕原地踱步。
4. **心智地圖經驗學習 (Mental Map POI Learning)**：
   - 首次成功脫逃後，特工心智地圖將以下座標登錄為長期記憶 POI：
     - `POI: LOOSE_VENT` `(36, 4)`
     - `POI: GUARD_TERMINAL` `(32, 4)`
     - `POI: EVIDENCE_LOCKER` `(32, 6)`
   - 當第二次不幸被捕時，特工感知到身處 `detention_cell`，直接利用心智記憶 POI 最短路徑 `planMentalMapRoute(32, 6)`，順暢完成暗道破除與裝備回收。

---

## 3. 檔案變更權限劃分 (File Boundaries)

### 允許變更 (Allowed Files)
- `src/types.ts`
- `src/zoneRegistry.ts` (新建)
- `src/aiPerception.ts`
- `src/defeatCutscene.ts`
- `src/interactionSystem.ts`
- `src/game.ts`
- `scripts/verify-mission-zone-awareness.ts` (新建)
- `docs/work-orders/wo-agent-mission-zone.json`
- `/home/orin/.local/share/local-playtester/playtester-v2.mjs`

### 嚴格禁止變更 (Forbidden Files)
- `src/renderer.ts` (維持純繪製管線無副作用)
- `src/audio.ts` & `src/music.ts` (音效管線保持獨立)

---

## 4. 驗證步驟與驗收指標 (Verification & Acceptance Criteria)

### 驗證命令：
```bash
npm run typecheck
npx tsx scripts/verify-mission-zone-awareness.ts
npm test
```

### 驗收標準：
1. **型別無誤**：`npm run typecheck` 零錯誤通過。
2. **定位精確**：`resolveZoneLocation` 對 Sector 1 禁閉室、安全屋、主街等子區域定位精準無誤。
3. **任務生命週期**：特工進入禁閉室時 `obj-detention-escape` 自動被加入且置頂；搜刮證物箱後即刻標記為已完成。
4. **零回歸保證**：既有 37 套回歸與整合測試 100% 綠燈通過。
5. **代理防死鎖**：`playtester-v2.mjs` 在戰略審查失敗或門扉開啟時均能順利自癒推進。
