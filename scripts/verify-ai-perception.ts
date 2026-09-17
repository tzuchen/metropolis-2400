// scripts/verify-ai-perception.ts
// 驗證 AI 標準化知覺狀態快照系統 (AIPerceptionSnapshot)
// 包含相對座標系統、嚴格視野等價性 (Strict FOV Parity)、8方向鄰域、ASCII 雷達與行動掩碼

import { GameEngine } from '../src/game';
import { generateAIPerceptionSnapshot, AIPerceptionSnapshot, checkPlayerMovementCollision } from '../src/aiPerception';
import { createRobot } from '../src/entities';
import { RobotType, TileType } from '../src/types';

const mockCanvas = {
  width: 800,
  height: 600,
  getContext: () => ({
    save: () => {},
    restore: () => {},
    clearRect: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    fillText: () => {},
    beginPath: () => {},
    closePath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    arc: () => {},
    fill: () => {},
    stroke: () => {},
    roundRect: () => {},
  }),
} as unknown as HTMLCanvasElement;

console.log('=== 開始驗證 AI 標準化知覺狀態輸出系統 (AI Perception Snapshot) ===\n');

const game = new GameEngine(mockCanvas);

// 0. 關閉標題畫面與開局簡報，進入標準遊戲狀態
game.isTitleScreen = false;
game.isIntroBriefingOpen = false;
game.updateFOV();

// 1. 基本遙測資料驗證
console.log('1. 驗證特工基礎遙測資料 (Player Telemetry)...');
const snap1 = generateAIPerceptionSnapshot(game);

if (typeof snap1.turn !== 'number') throw new Error('Turn should be a number');
if (snap1.player.hp !== game.player.hp) throw new Error('HP mismatch');
if (snap1.player.energy !== game.player.energy) throw new Error('Energy mismatch');
if (snap1.player.credits !== game.player.credits) throw new Error('Credits mismatch');
if (snap1.player.collar_timer !== game.player.checkInTimer) throw new Error('Collar timer mismatch');
if (!Array.isArray(snap1.player.inventory)) throw new Error('Player inventory must be an Array');
if (!Array.isArray(snap1.player.weapons)) throw new Error('Player weapons must be an Array');
if (!Array.isArray(snap1.active_missions)) throw new Error('Active missions must be an Array');
if (snap1.screen_modal.active_modal !== null) throw new Error('Active modal should be null in normal gameplay');
if (!Array.isArray(snap1.valid_actions) || snap1.valid_actions.length === 0) throw new Error('Valid actions should not be empty');

console.log('✅ 特工基礎遙測資料驗證成功: HP ' + snap1.player.hp + ', EN ' + snap1.player.energy + ', Credits ' + snap1.player.credits);

// 2. 8-方向鄰近格子資訊 (Adjacent Neighborhood)
console.log('2. 驗證 8-方向鄰域資訊與通行判定 (Adjacent Neighborhood)...');
const adj = snap1.adjacent_neighborhood;
if (!Array.isArray(adj) || adj.length !== 8) throw new Error('Adjacent neighborhood must have exactly 8 directions');

const expectedDirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
for (let i = 0; i < 8; i++) {
  if (adj[i].direction !== expectedDirs[i]) throw new Error(`Direction mismatch at index ${i}: expected ${expectedDirs[i]}, got ${adj[i].direction}`);
  if (typeof adj[i].walkable !== 'boolean') throw new Error(`Walkable flag missing for direction ${expectedDirs[i]}`);
  if (typeof adj[i].visible !== 'boolean') throw new Error(`Visible flag missing for direction ${expectedDirs[i]}`);
  // 嚴格等價性驗證：adjacent_neighborhood[i].walkable 必須與 checkPlayerMovementCollision 一致
  const col = checkPlayerMovementCollision(game, adj[i].dx, adj[i].dy);
  if (adj[i].walkable !== col.canMove) {
    throw new Error(`Walkable parity mismatch at direction ${adj[i].direction}: adjacent_neighborhood=${adj[i].walkable}, collisionCheck=${col.canMove}`);
  }
}
console.log('✅ 8-方向鄰域 (N, NE, E, SE, S, SW, W, NW) 結構、相對偏移與碰撞判定嚴格等價性驗證完全正確！');

// 3. 嚴格視野等價性測試 (Strict FOV Parity)
console.log('3. 測試嚴格視野等價性：牆後與迷霧中的機器人絕不可出現在可見清單中 (Strict FOV Parity)...');

// 在特工可見範圍內放置一隻機器人
const visibleRobotPos = { x: game.player.x + 2, y: game.player.y };
const visibleKey = `${visibleRobotPos.x},${visibleRobotPos.y}`;
if (!game.visibleTiles.has(visibleKey)) {
  game.visibleTiles.add(visibleKey);
}
const visibleRobot = createRobot(RobotType.SCOUT_DRONE, visibleRobotPos, [visibleRobotPos]);
visibleRobot.id = 'visible-drone-1';
visibleRobot.name = 'Patrol Drone Alpha';

// 在完全不可見的房間/地圖角落 (如 0, 0 或被牆阻擋處) 放置一隻巡邏機器人
const hiddenRobotPos = { x: 0, y: 0 };
const hiddenKey = `${hiddenRobotPos.x},${hiddenRobotPos.y}`;
// 確保不在 visibleTiles 內
game.visibleTiles.delete(hiddenKey);
const hiddenRobot = createRobot(RobotType.HUNTER_KILLER, hiddenRobotPos, [hiddenRobotPos]);
hiddenRobot.id = 'hidden-hunter-1';
hiddenRobot.name = 'Stealth Hunter Beta';

game.robots.push(visibleRobot, hiddenRobot);

const snapFOV = generateAIPerceptionSnapshot(game);
const visibleHostileIds = snapFOV.visible_entities.hostiles.map((h) => h.id);

if (!visibleHostileIds.includes('visible-drone-1')) {
  throw new Error('Visible drone inside FOV must be included in hostiles');
}
if (visibleHostileIds.includes('hidden-hunter-1')) {
  throw new Error('CRITICAL FOV LEAK: Hidden robot outside FOV was exposed to AI perception!');
}
console.log('✅ 嚴格視野防作弊驗證通過：牆後與未看見的機器人被完全隱藏！');

// 4. 光學 HUD 裝甲義體等價性測試 (Optic HUD Augment HP Revealing Parity)
console.log('4. 測試義體情報等價性：未安裝 OPTIC_HUD 時不洩漏機器人 HP，安裝後始顯示...');
// 未安裝 OPTIC_HUD
game.player.augments = { ...game.player.augments, OPTIC_HUD: false };
const snapNoHud = generateAIPerceptionSnapshot(game);
const droneNoHud = snapNoHud.visible_entities.hostiles.find((h) => h.id === 'visible-drone-1');
if (droneNoHud && (droneNoHud.hp !== undefined || droneNoHud.max_hp !== undefined)) {
  throw new Error('Hostile HP should NOT be revealed without OPTIC_HUD augment');
}
console.log('✅ 未安裝 OPTIC_HUD 時機器人 HP 為 undefined (符合人類玩家視覺體驗)');

// 安裝 OPTIC_HUD
game.player.augments.OPTIC_HUD = true;
const snapWithHud = generateAIPerceptionSnapshot(game);
const droneWithHud = snapWithHud.visible_entities.hostiles.find((h) => h.id === 'visible-drone-1');
if (!droneWithHud || droneWithHud.hp === undefined || droneWithHud.max_hp === undefined) {
  throw new Error('Hostile HP MUST be revealed when player has OPTIC_HUD augment');
}
console.log('✅ 安裝 OPTIC_HUD 時機器人 HP 正確呈現: ' + droneWithHud.hp + '/' + droneWithHud.max_hp);

// 5. 相對座標驗證 (Relative Coordinates)
console.log('5. 測試相對座標計算 (dx, dy, distance, cardinal_direction)...');
if (!droneWithHud) throw new Error('Drone not found');
if (droneWithHud.dx !== 2 || droneWithHud.dy !== 0) {
  throw new Error(`Relative coordinate mismatch: expected (2, 0), got (${droneWithHud.dx}, ${droneWithHud.dy})`);
}
if (droneWithHud.cardinal_direction !== 'E') {
  throw new Error(`Cardinal direction mismatch: expected E, got ${droneWithHud.cardinal_direction}`);
}
if (droneWithHud.distance !== 2) {
  throw new Error(`Distance mismatch: expected 2, got ${droneWithHud.distance}`);
}
console.log('✅ 相對座標計算驗證通過: dx=+2, dy=0, dist=2, dir=E');

// 6. 區域 ASCII FOV 雷達驗證 (ASCII Radar Grid)
console.log('6. 驗證局部 ASCII 視野雷達繪製 (ASCII FOV Radar)...');
const radar = snapWithHud.ascii_fov_radar;
if (radar.radius !== 9 || radar.width !== 19 || radar.height !== 19) {
  throw new Error(`Radar dimension mismatch: expected 19x19, got ${radar.width}x${radar.height}`);
}
if (radar.grid.length !== 19) {
  throw new Error(`Radar grid row count mismatch: expected 19, got ${radar.grid.length}`);
}

// 中心格子應為玩家 '@' (rx=0, ry=0, 即 index [9][9])
const centerChar = radar.grid[9][9];
if (centerChar !== '@') {
  throw new Error(`Center of radar must be player '@', got '${centerChar}'`);
}

// 相對 dx=+2, dy=0 處 (index [9][11]) 應為 Scout Drone 'D'
const droneChar = radar.grid[9][11];
if (droneChar !== 'D') {
  throw new Error(`Expected Scout Drone 'D' at radar (9, 11), got '${droneChar}'`);
}
console.log('✅ ASCII 視野雷達驗證成功：中心為特工 @，(2, 0) 處精確標記偵察無人機 D');

// 7. Omni-Vision 全知視野半徑擴展測試
console.log('7. 測試 Omni-Vision 擴展雷達視野 (半徑 15, 31x31)...');
game.isOmniVisionActive = true;
const snapOmni = generateAIPerceptionSnapshot(game);
if (snapOmni.ascii_fov_radar.radius !== 15 || snapOmni.ascii_fov_radar.width !== 31) {
  throw new Error(`Omni-Vision radar should have radius 15 and width 31, got ${snapOmni.ascii_fov_radar.width}`);
}
game.isOmniVisionActive = false;
console.log('✅ Omni-Vision 模式雷達半徑擴展至 15 (31x31) 驗證通過');

// 8. 視窗與彈窗狀態情境掩碼驗證 (Modal State & Action Masking)
console.log('8. 測試遊戲各彈窗狀態與行動掩碼 (Modal Context & Action Masking)...');

// 8a. 對話狀態
const mockNPC = game.npcs[0];
if (mockNPC) {
  game.activeDialogue = { npc: mockNPC, textIndex: 0 };
  const snapDialogue = generateAIPerceptionSnapshot(game);
  if (snapDialogue.screen_modal.active_modal !== 'DIALOGUE') {
    throw new Error('Active modal should be DIALOGUE');
  }
  if (!snapDialogue.valid_actions.includes('ADVANCE_DIALOGUE')) {
    throw new Error('valid_actions should include ADVANCE_DIALOGUE during dialogue');
  }
  game.activeDialogue = null;
}

// 8b. 日記狀態
game.isJournalOpen = true;
game.journalMode = 'view';
const snapJournal = generateAIPerceptionSnapshot(game);
if (snapJournal.screen_modal.active_modal !== 'JOURNAL') {
  throw new Error('Active modal should be JOURNAL');
}
if (!snapJournal.valid_actions.includes('COMPOSE_NEW')) {
  throw new Error('valid_actions should include COMPOSE_NEW during journal view');
}
game.isJournalOpen = false;

// 8c. 拔槍狀態開火行動掩碼
game.player.isWeaponDrawn = true;
const snapArmed = generateAIPerceptionSnapshot(game);
if (!snapArmed.valid_actions.includes('FIRE_FACING') || !snapArmed.valid_actions.includes('HOLSTER_WEAPON')) {
  throw new Error('valid_actions should include fire and holster actions when weapon is drawn');
}
game.player.isWeaponDrawn = false;

// 8d. MISSION_LOG 狀態
game.isMissionLogOpen = true;
const snapMissionLog = generateAIPerceptionSnapshot(game);
if (snapMissionLog.screen_modal.active_modal !== 'MISSION_LOG') {
  throw new Error('Active modal should be MISSION_LOG');
}
if (!snapMissionLog.valid_actions.includes('CLOSE_MODAL')) {
  throw new Error('valid_actions should include CLOSE_MODAL during mission log');
}
game.isMissionLogOpen = false;

// 8e. STORY_ARCHIVE 狀態
game.isStoryArchiveOpen = true;
const snapStoryArchiveModal = generateAIPerceptionSnapshot(game);
if (snapStoryArchiveModal.screen_modal.active_modal !== 'STORY_ARCHIVE') {
  throw new Error('Active modal should be STORY_ARCHIVE');
}
if (!snapStoryArchiveModal.valid_actions.includes('CLOSE_MODAL')) {
  throw new Error('valid_actions should include CLOSE_MODAL during story archive');
}
game.isStoryArchiveOpen = false;

// 8f. STORY_LOG 狀態
game.activeStoryLog = { id: 'test-log', title: 'Test Log' } as any;
const snapStoryLog = generateAIPerceptionSnapshot(game);
if (snapStoryLog.screen_modal.active_modal !== 'STORY_LOG') {
  throw new Error('Active modal should be STORY_LOG');
}
if (!snapStoryLog.valid_actions.includes('CLOSE_MODAL')) {
  throw new Error('valid_actions should include CLOSE_MODAL during story log');
}
game.activeStoryLog = null;

// 8g. BIG_MAP 狀態
game.isBigMapOpen = true;
const snapBigMap = generateAIPerceptionSnapshot(game);
if (snapBigMap.screen_modal.active_modal !== 'BIG_MAP') {
  throw new Error('Active modal should be BIG_MAP');
}
if (!snapBigMap.valid_actions.includes('CLOSE_MODAL')) {
  throw new Error('valid_actions should include CLOSE_MODAL during big map');
}
game.isBigMapOpen = false;

console.log('✅ 視窗彈窗狀態與行動掩碼切換驗證完全正確！');

// 9. 驗證 GameEngine 方法與 window 接口掛載
console.log('9. 驗證 GameEngine.getAIPerceptionSnapshot 方法...');
if (typeof (game as any).getAIPerceptionSnapshot !== 'function') {
  throw new Error('GameEngine must provide getAIPerceptionSnapshot() method');
}
const engineSnap = (game as any).getAIPerceptionSnapshot();
if (!engineSnap || !engineSnap.player || !engineSnap.ascii_fov_radar) {
  throw new Error('GameEngine.getAIPerceptionSnapshot() returned invalid snapshot');
}
console.log('✅ GameEngine.getAIPerceptionSnapshot() 調用成功！');

// 10. AI 行動執行器驗證 (AI Action Executor)
console.log('10. 測試 AI 行動執行器：DRAW_WEAPON 與 HOLSTER_WEAPON...');
if (typeof (game as any).executeAIAction !== 'function') {
  throw new Error('GameEngine must provide executeAIAction() method');
}

// 初始狀態應為未拔槍
if (game.player.isWeaponDrawn !== false) {
  throw new Error('Player should start with weapon holstered');
}

// 執行 DRAW_WEAPON
const drawOutcome = (game as any).executeAIAction('DRAW_WEAPON');
if (game.player.isWeaponDrawn !== true) {
  throw new Error('executeAIAction(DRAW_WEAPON) should set player.isWeaponDrawn to true');
}
if (drawOutcome.accepted !== true || drawOutcome.reason !== 'weapon_drawn') {
  throw new Error(`DRAW_WEAPON outcome mismatch: expected { accepted: true, reason: 'weapon_drawn' }, got ${JSON.stringify(drawOutcome)}`);
}
console.log('✅ DRAW_WEAPON 行動執行成功：player.isWeaponDrawn = true, outcome accepted with reason weapon_drawn');

// 執行 HOLSTER_WEAPON
const holsterOutcome = (game as any).executeAIAction('HOLSTER_WEAPON');
if (game.player.isWeaponDrawn !== false) {
  throw new Error('executeAIAction(HOLSTER_WEAPON) should set player.isWeaponDrawn to false');
}
if (holsterOutcome.accepted !== true || holsterOutcome.reason !== 'weapon_holstered') {
  throw new Error(`HOLSTER_WEAPON outcome mismatch: expected { accepted: true, reason: 'weapon_holstered' }, got ${JSON.stringify(holsterOutcome)}`);
}
console.log('✅ HOLSTER_WEAPON 行動執行成功：player.isWeaponDrawn = false, outcome accepted with reason weapon_holstered');

// 測試 MOVE 行動：精確測試被阻擋（如牆壁阻擋）與通行
const snapForMove = generateAIPerceptionSnapshot(game);
// 優先找牆壁方向進行撞牆測試
const wallBlockedDir = snapForMove.adjacent_neighborhood.find((d: any) => d.tile_type === 'WALL' && d.walkable === false)
  || snapForMove.adjacent_neighborhood.find((d: any) => d.walkable === false);

if (!wallBlockedDir) {
  throw new Error('No blocked direction found in adjacent neighborhood for MOVE test');
}
const blockedAction = `MOVE_${wallBlockedDir.direction}`;
const moveBlockedOutcome = (game as any).executeAIAction(blockedAction);
if (moveBlockedOutcome.accepted !== true || moveBlockedOutcome.moved !== false) {
  throw new Error(`MOVE blocked outcome mismatch: expected moved: false, got ${JSON.stringify(moveBlockedOutcome)}`);
}
// 確認 outcome 的 reason 與 checkPlayerMovementCollision 一致
const expectedCollisionReason = checkPlayerMovementCollision(game, wallBlockedDir.dx, wallBlockedDir.dy).reason;
if (moveBlockedOutcome.reason !== expectedCollisionReason) {
  throw new Error(`MOVE blocked reason mismatch: expected ${expectedCollisionReason}, got ${moveBlockedOutcome.reason}`);
}
console.log(`✅ MOVE 行動阻擋判定成功（方向 ${wallBlockedDir.direction}）：outcome accepted with reason ${moveBlockedOutcome.reason}`);

// 測試 MOVE 行動：成功移動到可行走區域
const openDir = snapForMove.adjacent_neighborhood.find((d: any) => d.walkable === true && (d.direction === 'N' || d.direction === 'S' || d.direction === 'E' || d.direction === 'W'));
if (!openDir) {
  throw new Error('No open cardinal direction found in adjacent neighborhood for MOVE test');
}
const openAction = `MOVE_${openDir.direction}`;
const moveSuccessOutcome = (game as any).executeAIAction(openAction);
if (moveSuccessOutcome.accepted !== true || moveSuccessOutcome.moved !== true || moveSuccessOutcome.reason !== 'moved_successfully') {
  throw new Error(`MOVE success outcome mismatch: expected { accepted: true, moved: true, reason: 'moved_successfully' }, got ${JSON.stringify(moveSuccessOutcome)}`);
}
console.log(`✅ MOVE 行動執行成功（移動 ${openDir.direction}）：outcome accepted with reason moved_successfully`);

// 11. 測試 AIActionOutcome.interacted 與 no_interactable_in_range
console.log('11. 測試 INTERACT 無互動目標時的 outcome...');
// 將玩家置於無互動實體與門的空地，且清除 activeDialogue/terminal
game.activeDialogue = null;
game.activeTerminal = null;
const interactOutcome = (game as any).executeAIAction('INTERACT');
if (interactOutcome.accepted !== true || interactOutcome.interacted !== false || interactOutcome.reason !== 'no_interactable_in_range') {
  throw new Error(`INTERACT empty outcome mismatch: expected { accepted: true, interacted: false, reason: 'no_interactable_in_range' }, got ${JSON.stringify(interactOutcome)}`);
}
console.log('✅ INTERACT 無目標時正確回傳 { accepted: true, interacted: false, reason: "no_interactable_in_range" }！');

// 12. 測試新局／重置時清除 story archive overlay 與 screen_modal 狀態一致性
console.log('12. 測試重置時清除 story archive overlay 與 screen_modal 狀態...');
game.isStoryArchiveOpen = true;
const snapStoryArchive = generateAIPerceptionSnapshot(game);
if (snapStoryArchive.screen_modal.active_modal !== 'STORY_ARCHIVE') {
  throw new Error(`Expected active_modal to be STORY_ARCHIVE, got ${snapStoryArchive.screen_modal.active_modal}`);
}

// 重新開始新局
game.restartGame();
if (game.isStoryArchiveOpen !== false) {
  throw new Error('restartGame() must reset game.isStoryArchiveOpen to false');
}
if (game.renderer && (game.renderer as any).isTitleStoryOpen !== false) {
  throw new Error('restartGame() must reset renderer.isTitleStoryOpen to false');
}

const snapPostRestart = generateAIPerceptionSnapshot(game);
if (snapPostRestart.screen_modal.active_modal === 'STORY_ARCHIVE') {
  throw new Error('screen_modal.active_modal must not be STORY_ARCHIVE after restart');
}
console.log('✅ 新局重置清除 story archive overlay 與 screen_modal 狀態完全一致！');

// 12b. 測試 CLOSE_INVENTORY 行動
console.log('12b. 測試 CLOSE_INVENTORY 行動...');
game.isInventoryOpen = true;
const snapInventory = generateAIPerceptionSnapshot(game);
if (snapInventory.screen_modal.active_modal !== 'INVENTORY') {
  throw new Error(`Expected active_modal to be INVENTORY, got ${snapInventory.screen_modal.active_modal}`);
}
if (!snapInventory.valid_actions.includes('CLOSE_INVENTORY')) {
  throw new Error('valid_actions should include CLOSE_INVENTORY when inventory is open');
}
const closeInventoryOutcome = (game as any).executeAIAction('CLOSE_INVENTORY');
if (game.isInventoryOpen !== false) {
  throw new Error('executeAIAction(CLOSE_INVENTORY) should set game.isInventoryOpen to false');
}
if (closeInventoryOutcome.accepted !== true) {
  throw new Error(`CLOSE_INVENTORY outcome mismatch: expected accepted: true, got ${JSON.stringify(closeInventoryOutcome)}`);
}
console.log('✅ CLOSE_INVENTORY 行動執行成功：成功關閉物品欄！');

// 12c. 測試 CLOSE_JOURNAL 行動
console.log('12c. 測試 CLOSE_JOURNAL 行動...');
game.isJournalOpen = true;
game.journalMode = 'view';
const snapJournalClose = generateAIPerceptionSnapshot(game);
if (snapJournalClose.screen_modal.active_modal !== 'JOURNAL') {
  throw new Error(`Expected active_modal to be JOURNAL, got ${snapJournalClose.screen_modal.active_modal}`);
}
if (!snapJournalClose.valid_actions.includes('CLOSE_JOURNAL')) {
  throw new Error('valid_actions should include CLOSE_JOURNAL when journal is open');
}
const closeJournalOutcome = (game as any).executeAIAction('CLOSE_JOURNAL');
if (game.isJournalOpen !== false) {
  throw new Error('executeAIAction(CLOSE_JOURNAL) should set game.isJournalOpen to false');
}
if (closeJournalOutcome.accepted !== true) {
  throw new Error(`CLOSE_JOURNAL outcome mismatch: expected accepted: true, got ${JSON.stringify(closeJournalOutcome)}`);
}
console.log('✅ CLOSE_JOURNAL 行動執行成功：成功關閉特工日記！');

// 13. 測試未知動作
console.log('13. 測試未知動作...');
const unknownOutcome = (game as any).executeAIAction('UNKNOWN_ACTION');
if (unknownOutcome.accepted !== false || unknownOutcome.reason !== 'unknown_action') {
  throw new Error(`UNKNOWN_ACTION outcome mismatch: expected { accepted: false, reason: 'unknown_action' }, got ${JSON.stringify(unknownOutcome)}`);
}
console.log('✅ UNKNOWN_ACTION 行動執行成功：outcome rejected with reason unknown_action');

// 14. 完整終端機 (Terminal) 知覺與互動測試
console.log('14. 測試完整終端機 (Terminal) 知覺與互動...');

// 1. 將玩家設定在 (5, 4) 緊鄰 (4, 4) 終端機
game.player.x = 5;
game.player.y = 4;
game.updateFOV();

// 2. 驗證知覺狀態
const snap = generateAIPerceptionSnapshot(game);
const westAdj = snap.adjacent_neighborhood.find((d: any) => d.direction === 'W');
if (!westAdj || westAdj.interactable !== 'TERMINAL') {
  throw new Error('West adjacent neighborhood should have interactable TERMINAL');
}
if (snap.ascii_fov_radar.grid[9][8] !== 'T') {
  throw new Error('ASCII radar at (9, 8) should be T for terminal');
}
const terminalInteractable = snap.visible_entities.interactables.find((i: any) => i.type === 'terminal');
if (!terminalInteractable || terminalInteractable.dx !== -1 || terminalInteractable.dy !== 0 || terminalInteractable.cardinal_direction !== 'W') {
  throw new Error('Visible interactables should include terminal at dx=-1, dy=0, dir=W');
}
if (!snap.valid_actions.includes('ACCESS_TERMINAL')) {
  throw new Error('valid_actions should include ACCESS_TERMINAL when terminal is adjacent');
}
console.log('✅ 終端機知覺狀態驗證通過：鄰域、雷達、可見實體與行動掩碼均正確');

// 3. 測試開啟終端機
const accessOutcome = (game as any).executeAIAction('ACCESS_TERMINAL');
if (accessOutcome.accepted !== true || accessOutcome.interacted !== true || accessOutcome.reason !== 'opened_terminal' || accessOutcome.new_modal !== 'TERMINAL') {
  throw new Error(`ACCESS_TERMINAL outcome mismatch: expected { accepted: true, interacted: true, reason: 'opened_terminal', new_modal: 'TERMINAL' }, got ${JSON.stringify(accessOutcome)}`);
}
if (game.activeTerminal === null) {
  throw new Error('game.activeTerminal should not be null after opening terminal');
}
console.log('✅ 開啟終端機成功：outcome accepted with reason opened_terminal, activeTerminal set');

// 4. 測試終端機開啟時知覺
const termSnap = generateAIPerceptionSnapshot(game);
if (termSnap.screen_modal.active_modal !== 'TERMINAL') {
  throw new Error(`Active modal should be TERMINAL, got ${termSnap.screen_modal.active_modal}`);
}
if (!termSnap.screen_modal.modal_details?.available_commands || !Array.isArray(termSnap.screen_modal.modal_details.available_commands) || termSnap.screen_modal.modal_details.available_commands.length === 0) {
  throw new Error('Terminal modal details should have non-empty available_commands array');
}
const requiredTerminalActions = ['EXIT_TERMINAL', 'SUBMIT_COMMAND', 'BACKSPACE', 'CMD_STATUS', 'CMD_CHECKIN'];
for (const action of requiredTerminalActions) {
  if (!termSnap.valid_actions.includes(action)) {
    throw new Error(`valid_actions should include ${action} when terminal is open`);
  }
}
console.log('✅ 終端機開啟時知覺驗證通過：modal 狀態、可用指令與行動掩碼均正確');

// 5. 測試終端機指令
const statusOutcome = (game as any).executeAIAction('CMD_STATUS');
if (statusOutcome.accepted !== true || statusOutcome.interacted !== true || statusOutcome.reason !== 'terminal_command_executed') {
  throw new Error(`CMD_STATUS outcome mismatch: expected { accepted: true, interacted: true, reason: 'terminal_command_executed' }, got ${JSON.stringify(statusOutcome)}`);
}
if (!statusOutcome.message) {
  throw new Error('CMD_STATUS outcome should include a message');
}
game.player.checkInTimer = 20;
const checkinOutcome = (game as any).executeAIAction('CMD_CHECKIN');
if (checkinOutcome.accepted !== true || checkinOutcome.reason !== 'terminal_command_executed') {
  throw new Error(`CMD_CHECKIN outcome mismatch: expected { accepted: true, reason: 'terminal_command_executed' }, got ${JSON.stringify(checkinOutcome)}`);
}
if (game.player.checkInTimer !== 100) {
  throw new Error(`CMD_CHECKIN should reset checkInTimer to 100, got ${game.player.checkInTimer}`);
}
console.log('✅ 終端機指令執行驗證通過：CMD_STATUS 與 CMD_CHECKIN 均正確執行');

// 6. 測試關閉終端機
const exitOutcome = (game as any).executeAIAction('EXIT_TERMINAL');
if (exitOutcome.accepted !== true || exitOutcome.reason !== 'closed_terminal' || exitOutcome.new_modal !== null) {
  throw new Error(`EXIT_TERMINAL outcome mismatch: expected { accepted: true, reason: 'closed_terminal', new_modal: null }, got ${JSON.stringify(exitOutcome)}`);
}
if (game.activeTerminal !== null) {
  throw new Error('game.activeTerminal should be null after closing terminal');
}
console.log('✅ 關閉終端機成功：outcome accepted with reason closed_terminal, activeTerminal cleared');

// 7. 測試無開啟終端機時執行指令被拒絕
const rejectOutcome = (game as any).executeAIAction('CMD_STATUS');
if (rejectOutcome.accepted !== false || rejectOutcome.reason !== 'no_active_terminal') {
  throw new Error(`CMD_STATUS without active terminal outcome mismatch: expected { accepted: false, reason: 'no_active_terminal' }, got ${JSON.stringify(rejectOutcome)}`);
}
console.log('✅ 無開啟終端機時指令被正確拒絕：reason no_active_terminal');

// 15. 特工日記 (Journal) 知覺與撰寫測試
console.log('15. 測試特工日記 (Journal) 知覺與撰寫流程...');

// 1. 清空日記以保持測試隔離
(game as any).clearAllJournalEntries?.();

// 2. 測試開啟日記 (OPEN_JOURNAL)
const openRes = (game as any).executeAIAction('OPEN_JOURNAL');
if (openRes.accepted !== true || openRes.new_modal !== 'JOURNAL') {
  throw new Error(`OPEN_JOURNAL outcome mismatch: expected { accepted: true, new_modal: 'JOURNAL' }, got ${JSON.stringify(openRes)}`);
}
const snapJournalOpen = generateAIPerceptionSnapshot(game);
if (snapJournalOpen.screen_modal.active_modal !== 'JOURNAL') {
  throw new Error(`Active modal should be JOURNAL after OPEN_JOURNAL, got ${snapJournalOpen.screen_modal.active_modal}`);
}
if (snapJournalOpen.screen_modal.modal_details?.mode !== 'view') {
  throw new Error(`Journal modal mode should be 'view', got ${snapJournalOpen.screen_modal.modal_details?.mode}`);
}
const requiredJournalActions = ['WRITE_JOURNAL', 'COMPOSE_NEW', 'CLOSE_JOURNAL', 'CLEAR_ALL'];
for (const action of requiredJournalActions) {
  if (!snapJournalOpen.valid_actions.includes(action)) {
    throw new Error(`valid_actions should include ${action} when journal is open`);
  }
}
console.log('✅ 開啟日記驗證通過：modal 狀態、模式與行動掩碼均正確');

// 3. 測試逐步撰寫流程 (COMPOSE_NEW -> SET_TITLE -> SET_CONTENT -> SUBMIT_ENTRY)
(game as any).executeAIAction('COMPOSE_NEW');
(game as any).executeAIAction('SET_JOURNAL_TITLE:秘密通道調查');
(game as any).executeAIAction('SET_JOURNAL_CONTENT:在西側牆壁發現通往檢查哨的暗門。');
const snapCompose = generateAIPerceptionSnapshot(game);
if (snapCompose.screen_modal.modal_details?.titleBuffer !== '秘密通道調查') {
  throw new Error(`Journal titleBuffer mismatch: expected '秘密通道調查', got ${snapCompose.screen_modal.modal_details?.titleBuffer}`);
}
if (snapCompose.screen_modal.modal_details?.contentBuffer !== '在西側牆壁發現通往檢查哨的暗門。') {
  throw new Error(`Journal contentBuffer mismatch: expected '在西側牆壁發現通往檢查哨的暗門。', got ${snapCompose.screen_modal.modal_details?.contentBuffer}`);
}
const submitRes = (game as any).executeAIAction('SUBMIT_ENTRY');
if (submitRes.accepted !== true || submitRes.reason !== 'journal_entry_saved') {
  throw new Error(`SUBMIT_ENTRY outcome mismatch: expected { accepted: true, reason: 'journal_entry_saved' }, got ${JSON.stringify(submitRes)}`);
}
const snapAfterSubmit = generateAIPerceptionSnapshot(game);
if (!snapAfterSubmit.screen_modal.modal_details?.entries || snapAfterSubmit.screen_modal.modal_details.entries.length < 1) {
  throw new Error('Journal entries should have at least 1 entry after submit');
}
if (snapAfterSubmit.screen_modal.modal_details.entries[0].title !== '秘密通道調查') {
  throw new Error(`First journal entry title mismatch: expected '秘密通道調查', got ${snapAfterSubmit.screen_modal.modal_details.entries[0].title}`);
}
if (snapAfterSubmit.screen_modal.modal_details?.selectedEntry?.title !== '秘密通道調查') {
  throw new Error(`Selected journal entry title mismatch: expected '秘密通道調查', got ${snapAfterSubmit.screen_modal.modal_details?.selectedEntry?.title}`);
}
console.log('✅ 逐步撰寫流程驗證通過：COMPOSE_NEW -> SET_TITLE -> SET_CONTENT -> SUBMIT_ENTRY 全數正確');

// 4. 測試快速直接寫入 (WRITE_JOURNAL:title|content)
const writeRes = (game as any).executeAIAction('WRITE_JOURNAL:無人機巡邏紀錄|巡邏路線為順時針方向。');
if (writeRes.accepted !== true || writeRes.reason !== 'journal_entry_saved') {
  throw new Error(`WRITE_JOURNAL outcome mismatch: expected { accepted: true, reason: 'journal_entry_saved' }, got ${JSON.stringify(writeRes)}`);
}
const journalEntries = (game as any).journalEntries;
if (!journalEntries || !journalEntries.some((e: any) => e.title === '無人機巡邏紀錄')) {
  throw new Error('Journal entries should contain entry with title "無人機巡邏紀錄"');
}
console.log('✅ 快速直接寫入驗證通過：WRITE_JOURNAL 成功保存條目');

// 5. 測試空白內容拒絕
const emptyRes = (game as any).executeAIAction('WRITE_JOURNAL:   ');
if (emptyRes.accepted !== false || emptyRes.reason !== 'empty_journal_content') {
  throw new Error(`Empty journal content outcome mismatch: expected { accepted: false, reason: 'empty_journal_content' }, got ${JSON.stringify(emptyRes)}`);
}
console.log('✅ 空白內容拒絕驗證通過：reason empty_journal_content');

// 6. 測試正常遊戲中直接記筆記（日記關閉狀態下）
(game as any).executeAIAction('CLOSE_JOURNAL');
const fieldNoteRes = (game as any).executeAIAction('WRITE_JOURNAL:戰術標記|座標已同步至神經網絡');
if (fieldNoteRes.accepted !== true || fieldNoteRes.reason !== 'journal_entry_saved' || fieldNoteRes.new_modal !== null) {
  throw new Error(`Field note outcome mismatch: expected { accepted: true, reason: 'journal_entry_saved', new_modal: null }, got ${JSON.stringify(fieldNoteRes)}`);
}
if (!(game as any).journalEntries.some((e: any) => e.title === '戰術標記')) {
  throw new Error('Journal entries should contain entry with title "戰術標記"');
}
console.log('✅ 正常遊戲中直接記筆記驗證通過：日記關閉狀態下成功保存條目且未開啟 modal');

// 16. 操作語意 (Action Semantics) 驗證
console.log('16. 驗證操作語意 (Action Semantics) 結構與動態解析...');

// 1. 驗證快照中的 action_semantics 結構
const snapSem = generateAIPerceptionSnapshot(game);
if (!snapSem.action_semantics || typeof snapSem.action_semantics !== 'object') {
  throw new Error('snap.action_semantics must exist and be an object');
}
for (const action of snapSem.valid_actions) {
  if (!snapSem.action_semantics[action]) {
    throw new Error(`action_semantics[${action}] must exist for valid action ${action}`);
  }
  if (typeof snapSem.action_semantics[action].meaning !== 'string' || snapSem.action_semantics[action].meaning.length === 0) {
    throw new Error(`action_semantics[${action}].meaning must be a non-empty string`);
  }
}
console.log('✅ action_semantics 結構驗證通過：所有 valid_actions 均有非空 meaning');

// 2. 驗證特定關鍵動作語意
if (snapSem.action_semantics['DRAW_WEAPON'].meaning !== '拔出目前武器；拔槍後會提供朝可見敵人方向的 FIRE_* action') {
  throw new Error(`DRAW_WEAPON meaning mismatch: expected '拔出目前武器；拔槍後會提供朝可見敵人方向的 FIRE_* action', got ${snapSem.action_semantics['DRAW_WEAPON'].meaning}`);
}
if (!snapSem.action_semantics['MOVE_N'] || !snapSem.action_semantics['MOVE_N'].meaning.includes('移動')) {
  throw new Error(`MOVE_N meaning must contain '移動', got ${snapSem.action_semantics['MOVE_N']?.meaning}`);
}
if (!snapSem.action_semantics['WRITE_JOURNAL'] || !snapSem.action_semantics['WRITE_JOURNAL'].meaning.includes('日記')) {
  throw new Error(`WRITE_JOURNAL meaning must contain '日記', got ${snapSem.action_semantics['WRITE_JOURNAL']?.meaning}`);
}
console.log('✅ 特定關鍵動作語意驗證通過：DRAW_WEAPON, MOVE_N, WRITE_JOURNAL');

// 3. 驗證 GameEngine.getActionSemantic 方法與動態解析
if (typeof (game as any).getActionSemantic !== 'function') {
  throw new Error('GameEngine must provide getActionSemantic() method');
}
const drawSem = (game as any).getActionSemantic('DRAW_WEAPON');
if (drawSem.meaning !== '拔出目前武器；拔槍後會提供朝可見敵人方向的 FIRE_* action') {
  throw new Error(`getActionSemantic(DRAW_WEAPON) meaning mismatch: expected '拔出目前武器；拔槍後會提供朝可見敵人方向的 FIRE_* action', got ${drawSem.meaning}`);
}
const fireSem = (game as any).getActionSemantic('FIRE_E');
if (!fireSem.meaning || (!fireSem.meaning.includes('武器') && !fireSem.meaning.includes('發射'))) {
  throw new Error(`getActionSemantic(FIRE_E) meaning must contain '武器' or '發射', got ${fireSem.meaning}`);
}
const cmdSem = (game as any).getActionSemantic('CMD_STATUS');
if (!cmdSem.meaning || (!cmdSem.meaning.includes('STATUS') && !cmdSem.meaning.includes('狀態'))) {
  throw new Error(`getActionSemantic(CMD_STATUS) meaning must contain 'STATUS' or '狀態', got ${cmdSem.meaning}`);
}
console.log('✅ GameEngine.getActionSemantic 動態解析驗證通過：DRAW_WEAPON, FIRE_E, CMD_STATUS');

console.log('\n🎉 所有 AI 標準化知覺狀態快照 (AIPerceptionSnapshot) 測試全數通過！');
