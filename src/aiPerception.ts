// src/aiPerception.ts
// Standardized AI Perception Snapshot Generator for Metropolis 2400
// Provides structured JSON state telemetry with relative coordinates and strict FOV parity.

import type { GameEngine } from './game';
import { getTile, getTileProperties, isWalkable } from './map';
import { TileType, RobotType } from './types';
import { saveJournalEntry, loadJournalEntries } from './journalSystem';
import {
  getMentalMapSnapshot,
  planMentalMapRoute,
  detectFrontiers,
  type FrontierPoint,
  type MentalMapSnapshot,
  type RoutePlan,
} from './mentalMap';

export function checkPlayerMovementCollision(game: GameEngine, dx: number, dy: number): { canMove: boolean; reason: string } {
  const player = game.player;
  const px = player.x;
  const py = player.y;
  const tx = px + dx;
  const ty = py + dy;
  const map = game.map;

  // 1. Map Bounds
  if (tx < 0 || tx >= map.width || ty < 0 || ty >= map.height) {
    return { canMove: false, reason: 'out_of_bounds' };
  }

  const key = `${tx},${ty}`;
  const tile = getTile(map, { x: tx, y: ty });

  // 2. Walls & Forcefields
  if (tile === TileType.WALL || tile === TileType.FORCEFIELD) {
    return { canMove: false, reason: tile === TileType.FORCEFIELD ? 'blocked_by_forcefield' : 'blocked_by_wall' };
  }

  // 3. Closed Door
  if (tile === TileType.DOOR_CLOSED) {
    return { canMove: false, reason: 'blocked_by_door' };
  }

  // 4. Living Robots
  const robot = game.robots?.find((r) => r.isAlive !== false && r.x === tx && r.y === ty);
  if (robot) {
    return { canMove: false, reason: 'blocked_by_hostile' };
  }

  // 5. Living NPCs
  const npc = game.npcs?.find((n) => n.isAlive !== false && n.x === tx && n.y === ty);
  if (npc) {
    // If weapon is drawn or player is not disguised, NPC blocks movement
    if (player.isWeaponDrawn || !player.isDisguised) {
      return { canMove: false, reason: 'blocked_by_npc' };
    }
    // If disguised and weapon holstered, can move through
  }

  // 6. Pushable Blocks
  const block = game.pushableBlocks?.find((b) => b.x === tx && b.y === ty);
  if (block) {
    // Check if the block can be pushed
    const pushDx = dx;
    const pushDy = dy;
    const pushTx = tx + pushDx;
    const pushTy = ty + pushDy;
    
    // Check bounds for push target
    if (pushTx < 0 || pushTx >= map.width || pushTy < 0 || pushTy >= map.height) {
      return { canMove: false, reason: 'blocked_by_block' };
    }
    
    const pushKey = `${pushTx},${pushTy}`;
    const pushTile = getTile(map, { x: pushTx, y: pushTy });
    
    // Push target must be walkable
    if (!isWalkable(pushTile)) {
      return { canMove: false, reason: 'blocked_by_block' };
    }
    
    // Push target must not have a robot
    const pushRobot = game.robots?.find((r) => r.isAlive !== false && r.x === pushTx && r.y === pushTy);
    if (pushRobot) {
      return { canMove: false, reason: 'blocked_by_block' };
    }
    
    // Push target must not have an NPC
    const pushNpc = game.npcs?.find((n) => n.isAlive !== false && n.x === pushTx && n.y === pushTy);
    if (pushNpc) {
      return { canMove: false, reason: 'blocked_by_block' };
    }
    
    // Push target must not have another block
    const pushBlock = game.pushableBlocks?.find((b) => b.x === pushTx && b.y === pushTy);
    if (pushBlock) {
      return { canMove: false, reason: 'blocked_by_block' };
    }
    
    // Can push
    return { canMove: true, reason: 'can_push_block' };
  }

  // 7. Default: Walkable
  return { canMove: true, reason: 'walkable' };
}

export interface ActionSemantic {
  meaning: string;
}

export interface RelativeEntity {
  id: string;
  type: string;
  name: string;
  dx: number;
  dy: number;
  distance: number;
  manhattan: number;
  cardinal_direction: string;
  in_fov: boolean;
}

export interface RelativeHostile extends RelativeEntity {
  robot_type: string;
  state: string;
  hp?: number; // Only present if player has OPTIC_HUD augment
  max_hp?: number; // Only present if player has OPTIC_HUD augment
  attack_range?: number;
}

export interface RelativeNPC extends RelativeEntity {
  role: string;
  action_state?: string;
}

export interface RelativeInteractable {
  type: 'door' | 'terminal' | 'elevator' | 'crate' | 'conveyor' | 'vent' | 'cache';
  name: string;
  dx: number;
  dy: number;
  distance: number;
  cardinal_direction: string;
  in_fov: boolean;
  state?: any;
}

export interface RelativeItem extends RelativeEntity {
  category?: string;
}

export interface RelativeHazard {
  type: string;
  dx: number;
  dy: number;
  distance: number;
  cardinal_direction: string;
  in_fov: boolean;
}

export interface AdjacentTileInfo {
  direction: 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';
  dx: number;
  dy: number;
  tile_type: string;
  walkable: boolean;
  visible: boolean;
  explored: boolean;
  occupant: string | null;
  interactable: string | null;
}

export interface AIPerceptionSnapshot {
  turn: number;
  sector_id: string;
  sector_name: string;
  player: {
    hp: number;
    max_hp: number;
    energy: number;
    max_energy: number;
    credits: number;
    security_level: string;
    collar_timer: number;
    collar_alert: boolean;
    is_collar_disarmed: boolean;
    facing: string;
    is_weapon_drawn: boolean;
    active_weapon: {
      name: string;
      power: number;
      energy_cost: number;
      is_suppressed: boolean;
    } | null;
    disguise_active: boolean;
    consumables: {
      medkits: number;
      batteries: number;
      emp_grenades: number;
    };
    augments: string[];
    is_alive: boolean;
    inventory: any[];
    weapons: any[];
  };
  active_missions: Array<{
    id: string;
    title: string;
    titleZh?: string;
    description: string;
    descriptionZh?: string;
    completed: boolean;
    is_side_quest: boolean;
  }>;
  adjacent_neighborhood: AdjacentTileInfo[];
  visible_entities: {
    hostiles: RelativeHostile[]; // Strictly living robots within player FOV
    npcs: RelativeNPC[]; // NPCs in FOV or explored
    interactables: RelativeInteractable[];
    items: RelativeItem[];
    hazards: RelativeHazard[];
    wreckages: RelativeEntity[];
  };
  ascii_fov_radar: {
    radius: number;
    width: number;
    height: number;
    grid: string[];
    legend: Record<string, string>;
  };
  screen_modal: {
    active_modal: string | null;
    modal_details?: any;
  };
  recent_messages: Array<{ text: string; type: string }>;
  valid_actions: string[];
  action_semantics: Record<string, ActionSemantic>;
  mental_map_summary: {
    explored_percentage: number;
    explored_tiles_count: number;
    walked_tiles_count: number;
    frontiers_count: number;
    nearest_frontier: FrontierPoint | null;
    recalled_pois_count: number;
  };
}

export const ACTION_SEMANTICS: Record<string, ActionSemantic> = {
  // 戰鬥
  DRAW_WEAPON: { meaning: '拔出目前武器；拔槍後會提供朝可見敵人方向的 FIRE_* action' },
  HOLSTER_WEAPON: { meaning: '收回武器入鞘；收槍狀態下可與 NPC 進行對話互動並避免引起恐慌' },
  FIRE_FACING: { meaning: '朝角色當前朝向發射已裝備武器；消耗能量' },
  FIRE_N: { meaning: '朝北方發射武器射線／投射物；消耗能量' },
  FIRE_S: { meaning: '朝南方發射武器射線／投射物；消耗能量' },
  FIRE_E: { meaning: '朝東方發射武器射線／投射物；消耗能量' },
  FIRE_W: { meaning: '朝西方發射武器射線／投射物；消耗能量' },
  CYCLE_WEAPON: { meaning: '在背包內已擁有的武器之間輪換切換裝備' },
  TOGGLE_WEAPON_DRAW: { meaning: '切換武器拔出或收起狀態' },

  // 移動
  MOVE_N: { meaning: '朝北方移動 1 格；若前方為未鎖定的門則自動通過並開門' },
  MOVE_S: { meaning: '朝南方移動 1 格；若前方為未鎖定的門則自動通過並開門' },
  MOVE_E: { meaning: '朝東方移動 1 格；若前方為未鎖定的門則自動通過並開門' },
  MOVE_W: { meaning: '朝西方移動 1 格；若前方為未鎖定的門則自動通過並開門' },
  WAIT: { meaning: '原地停留等待 1 回合；世界回合與項圈計時推進' },
  TACTICAL_DASH: { meaning: '消耗 20 能量發動戰術衝刺，快速拉開或接近目標' },

  // 環境互動
  INTERACT: { meaning: '對相鄰實體或物件進行環境互動（操作氣密門開關或推動箱子）' },
  TALK: { meaning: '與相鄰 NPC 展開對話交流，獲取情報或推進任務' },
  PICKUP_ITEM: { meaning: '拾取特工當前腳下格子上的地表物品（武器、消耗品或數據板）' },
  ACCESS_TERMINAL: { meaning: '登入相鄰或腳下的電腦終端機，開啟終端機介面' },

  // 消耗品
  USE_MEDKIT: { meaning: '使用醫療包消耗品，立即恢復特工生命值 (HP)' },
  USE_BATTERY: { meaning: '使用備用電池消耗品，立即恢復特工能量值 (Energy)' },
  USE_EMP_GRENADE: { meaning: '投擲 EMP 電磁脈衝手榴彈，癱瘓波及範圍內的機器人單位' },

  // 視窗面板
  OPEN_INVENTORY: { meaning: '開啟物品欄 (Inventory) 視窗，檢視裝備、武器與消耗品' },
  CLOSE_INVENTORY: { meaning: '關閉物品欄視窗，返回地圖視角' },
  OPEN_JOURNAL: { meaning: '開啟特工日記 (Journal) 視窗，瀏覽歷史筆記與探索紀錄' },
  CLOSE_JOURNAL: { meaning: '關閉特工日記視窗，返回地圖視角' },
  OPEN_MAP: { meaning: '開啟全域大區域地圖 (Big Map) 導航視窗，檢視區域與航點' },
  OPEN_MISSION_LOG: { meaning: '開啟任務情報日誌 (Mission Log)，檢視主線與支線目標狀態' },
  OPEN_STORY_ARCHIVE: { meaning: '開啟情報數據板存檔檔案庫 (Story Archive)，檢視已解密文件' },
  OPEN_AUGMENT_SHOP: { meaning: '開啟義體黑市商店 (Augment Shop)，使用信用點購買義體或物資' },
  SAVE_GAME: { meaning: '快速儲存當前遊戲進度至存檔插槽' },
  LOAD_GAME: { meaning: '讀取上次儲存的遊戲進度' },
  CLOSE_MODAL: { meaning: '關閉當前開啟的資訊彈窗（地圖、任務日誌或故事檔案）' },

  // 終端機指令
  SUBMIT_COMMAND: { meaning: '送出終端機輸入緩衝區中累積的指令字串' },
  BACKSPACE: { meaning: '刪除終端機輸入緩衝區最後一個字元' },
  EXIT_TERMINAL: { meaning: '登出並關閉終端機連線，返回遊戲地圖' },
  CMD_CHECKIN: { meaning: '執行神經項圈簽到子程序；重置監控項圈倒數計時器' },
  CMD_STATUS: { meaning: '查詢終端機節點狀態、子系統運行情況與授權等級' },
  CMD_LOGS: { meaning: '讀取該節點儲存的解密情報日誌與歷史監控紀錄' },
  CMD_OVERRIDE: { meaning: '覆寫終端機安全協議，取得進階控制權' },
  CMD_DISARM: { meaning: '解除或關閉與該終端機連動的區域防衛雷射或警報系統' },
  CMD_CLEAR_ALARM: { meaning: '將當前區域安全警戒狀態重置為 CLEAR（安全）' },
  CMD_SCAN: { meaning: '掃描周遭安全防線、警衛佈防與外圍感測器狀態' },
  CMD_SIPHON: { meaning: '虹吸並抽取終端機備用電容能量，為特工恢復 30 點能量' },
  CMD_BREACH: { meaning: '啟動深層破解協議，進入駭入破解階段' },
  CMD_POETRY: { meaning: '朗讀終端機內隱藏的文學記錄與私人備註' },
  CMD_HELP: { meaning: '列出當前節點支援的所有可用終端機指令' },
  CMD_CLEAR: { meaning: '清除終端機螢幕歷史輸出' },
  CMD_EXIT: { meaning: '斷開終端機連線並退出' },

  // 特工日記
  WRITE_JOURNAL: { meaning: '撰寫特工日記筆記；支援格式 WRITE_JOURNAL:標題|內容 或 WRITE_JOURNAL:內容' },
  COMPOSE_NEW: { meaning: '在日記介面中開啟新條目撰寫模式' },
  SET_JOURNAL_TITLE: { meaning: '設定正在撰寫的日記標題緩衝區' },
  SET_JOURNAL_CONTENT: { meaning: '設定正在撰寫的日記內文緩衝區' },
  SUBMIT_ENTRY: { meaning: '確認並保存當前撰寫的日記條目至永久存檔' },
  CANCEL_COMPOSE: { meaning: '放棄當前撰寫中的內容，返回日記清單檢視模式' },
  SWITCH_FIELD: { meaning: '在標題輸入框與內文輸入框之間切換焦點' },
  SELECT_UP: { meaning: '在日記清單中向上移動選擇光標' },
  SELECT_DOWN: { meaning: '在日記清單中向下移動選擇光標' },
  DELETE_ENTRY: { meaning: '刪除當前光標選中的特工日記條目' },
  CLEAR_ALL: { meaning: '清空所有特工日記條目' },
  TYPE_CHAR: { meaning: '在當前焦點輸入框中輸入字元' },

  // 對話與簡報
  ADVANCE_DIALOGUE: { meaning: '推進當前 NPC 對話至下一句話' },
  CLOSE_DIALOGUE: { meaning: '結束並退出與當前 NPC 的對話' },
  DISMISS_BRIEFING: { meaning: '關閉任務簡報進入遊戲' },
  SCROLL_DOWN: { meaning: '向下滾動當前長文本內容' },
  SCROLL_UP: { meaning: '向上滾動當前長文本內容' },
  SKIP_CUTSCENE: { meaning: '跳過過場動畫並恢復行動' },
  ESCAPE: { meaning: '退出當前模式或會話' },

  // 選單
  MENU_UP: { meaning: '在主選單中向上移動選取項' },
  MENU_DOWN: { meaning: '在主選單中向下移動選取項' },
  SELECT: { meaning: '確認執行當前選單所選項目' },
  NEW_GAME: { meaning: '開始新的一局遊戲' },
  TOGGLE_LANG: { meaning: '切換遊戲語言（中／英）' },
  MANUAL: { meaning: '開啟特工操作手冊' },
  RESTART_GAME: { meaning: '重新開始遊戲' },

  // 商店
  BUY_DERMAL_ARMOR: { meaning: '購買皮下裝甲義體，增加物理傷害減免' },
  BUY_OPTIC_HUD: { meaning: '購買光學 HUD 義體，能在視野與雷達中透視敵人生命值 (HP)' },
  BUY_REFLEX_BOOSTER: { meaning: '購買反射神經加速器義體，提升戰術反應與行動速度' },
  BUY_POWER_CORE: { meaning: '購買高能動力核心義體，擴增特工最大能量上限' },
  BUY_MEDKIT: { meaning: '購買醫療包備用補給' },
  BUY_BATTERY: { meaning: '購買能量電池備用補給' },
  BUY_EMP_GRENADE: { meaning: '購買 EMP 電磁脈衝手榴彈備用補給' },
  BUY_OVERCLOCK: { meaning: '購買超頻組件，強化義體效能' },
  BRIBE_NETWORK: { meaning: '賄賂網絡中繼站以降低區域警戒等級' },
  CLOSE_SHOP: { meaning: '關閉義體商店，返回遊戲' },

  // 心智地圖
  GET_MENTAL_MAP: { meaning: '取得當前心智地圖摘要，包含探索比例、邊界點與已召回 POI 數量' },
  PLAN_ROUTE: { meaning: '規劃從當前位置到目標的心智地圖路徑；格式為 PLAN_ROUTE:目標 或 PLAN_ROUTE:目標X,目標Y' },
};

export const RADAR_LEGEND: Record<string, string> = {
  '@': 'Player',
  'R': 'Hostile Robot',
  'D': 'Scout Drone',
  'E': 'Shock Enforcer',
  'H': 'Hunter Killer',
  'X': 'Exterminator',
  'N': 'NPC',
  '*': 'Ground Item',
  'O': 'Pushable Crate / Block',
  '^': 'Hazard Mine / Danger',
  '%': 'Robot Wreckage',
  '#': 'Wall',
  '+': 'Closed Door',
  '/': 'Open Door',
  '|': 'Forcefield',
  'T': 'Terminal',
  'L': 'Sector Elevator',
  '>': 'Conveyor Belt',
  '~': 'Steam Vent',
  '$': 'Rebel Cache',
  'S': 'Server Rack',
  '.': 'Walkable Floor',
  ' ': 'Unseen / Void',
};

/**
 * Calculates 8-direction cardinal string from relative dx, dy.
 */
export function calculateCardinalDirection(dx: number, dy: number): string {
  if (dx === 0 && dy === 0) return 'HERE';
  // Math.atan2(y, x): 0 = East, 90 = South, -90 = North, 180/-180 = West
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  if (angle >= -22.5 && angle < 22.5) return 'E';
  if (angle >= 22.5 && angle < 67.5) return 'SE';
  if (angle >= 67.5 && angle < 112.5) return 'S';
  if (angle >= 112.5 && angle < 157.5) return 'SW';
  if (angle >= 157.5 || angle < -157.5) return 'W';
  if (angle >= -157.5 && angle < -112.5) return 'NW';
  if (angle >= -112.5 && angle < -67.5) return 'N';
  if (angle >= -67.5 && angle < -22.5) return 'NE';
  return 'HERE';
}

/**
 * Resolves the semantic meaning of a given action string.
 */
export function getActionSemantic(action: string, game?: GameEngine): ActionSemantic {
  if (ACTION_SEMANTICS[action]) return ACTION_SEMANTICS[action];
  if (action.startsWith('CMD_')) {
    const rawCmd = action.substring(4);
    if (game?.activeTerminal && typeof (game.activeTerminal as any).getEffectiveCommands === 'function') {
      const cmds = (game.activeTerminal as any).getEffectiveCommands();
      const found = cmds.find((c: any) => c.cmd.toUpperCase() === rawCmd.toUpperCase());
      if (found && found.desc) return { meaning: found.desc };
    }
    return { meaning: `執行終端機指令: ${rawCmd}` };
  }
  if (action.startsWith('EXEC_COMMAND:')) {
    return { meaning: `執行終端機指令: ${action.substring(13)}` };
  }
  if (action.startsWith('WRITE_JOURNAL:') || action.startsWith('WRITE_JOURNAL_ENTRY:')) {
    return { meaning: '儲存特工日記條目；格式為 WRITE_JOURNAL:標題|內容 或 WRITE_JOURNAL:內容' };
  }
  if (action.startsWith('SET_JOURNAL_TITLE:')) return { meaning: '設定特工日記標題緩衝區文字' };
  if (action.startsWith('SET_JOURNAL_CONTENT:')) return { meaning: '設定特工日記內文緩衝區文字' };
  if (action.startsWith('FIRE_')) return { meaning: '發射武器' };
  if (action.startsWith('MOVE_')) return { meaning: '移動' };
  if (action.startsWith('PLAN_ROUTE')) return { meaning: '規劃從當前位置到目標的心智地圖路徑' };
  return { meaning: '未知動作' };
}

/**
 * Generates the standardized AI perception snapshot for the given GameEngine instance.
 * Strict FOV parity is enforced: living hostiles outside visibleTiles are never exposed.
 */
export function generateAIPerceptionSnapshot(game: GameEngine): AIPerceptionSnapshot {
  const player = game.player;
  const px = player.x;
  const py = player.y;
  const map = game.map;
  const visibleTiles = game.visibleTiles || new Set<string>();
  const exploredTiles = game.exploredTiles || new Set<string>();
  const hasOpticHUD = !!player.augments?.OPTIC_HUD;

  // 1. Player Telemetry
  const equipped = player.equippedWeapon as any;
  const activeWeapon = equipped
    ? {
        name: equipped.name || 'Weapon',
        power: Number(equipped.power) || 0,
        energy_cost: Number(equipped.energyCost) || 0,
        is_suppressed: Boolean(equipped.isSuppressed),
      }
    : null;

  const playerTelemetry = {
    hp: player.hp,
    max_hp: player.maxHp,
    energy: player.energy,
    max_energy: player.maxEnergy,
    credits: player.credits,
    security_level: String(game.securityLevel),
    collar_timer: player.checkInTimer ?? 100,
    collar_alert: Boolean(game.checkInAlertActive),
    is_collar_disarmed: Boolean(game.isCollarDisarmed),
    facing: player.facing || 'down',
    is_weapon_drawn: Boolean(player.isWeaponDrawn),
    active_weapon: activeWeapon,
    disguise_active: Boolean(player.isDisguised),
    consumables: {
      medkits: player.consumables?.medkits ?? 0,
      batteries: player.consumables?.batteries ?? 0,
      emp_grenades: player.consumables?.empGrenades ?? 0,
    },
    augments: Object.entries(player.augments || {})
      .filter(([_, active]) => Boolean(active))
      .map(([name]) => name),
    is_alive: player.isAlive !== false,
    inventory: player.inventory || [],
    weapons: player.weapons || [],
  };

  // 2. 8-Adjacent Neighborhood
  const directions: Array<{ dir: AdjacentTileInfo['direction']; dx: number; dy: number }> = [
    { dir: 'N', dx: 0, dy: -1 },
    { dir: 'NE', dx: 1, dy: -1 },
    { dir: 'E', dx: 1, dy: 0 },
    { dir: 'SE', dx: 1, dy: 1 },
    { dir: 'S', dx: 0, dy: 1 },
    { dir: 'SW', dx: -1, dy: 1 },
    { dir: 'W', dx: -1, dy: 0 },
    { dir: 'NW', dx: -1, dy: -1 },
  ];

  const adjacentNeighborhood: AdjacentTileInfo[] = directions.map(({ dir, dx, dy }) => {
    const tx = px + dx;
    const ty = py + dy;
    const inBounds = tx >= 0 && tx < map.width && ty >= 0 && ty < map.height;
    const key = `${tx},${ty}`;
    const visible = visibleTiles.has(key);
    const explored = exploredTiles.has(key);

    if (!inBounds) {
      return {
        direction: dir,
        dx,
        dy,
        tile_type: 'OUT_OF_BOUNDS',
        walkable: false,
        visible: false,
        explored: false,
        occupant: null,
        interactable: null,
      };
    }

    const tile = getTile(map, { x: tx, y: ty });
    const props = getTileProperties(tile);

    // Occupants check
    let occupant: string | null = null;
    const robot = game.robots?.find((r) => r.isAlive !== false && r.x === tx && r.y === ty);
    if (robot) {
      // Only recognize robot if visible
      if (visible) occupant = 'HOSTILE';
    } else {
      const npc = game.npcs?.find((n) => n.isAlive !== false && n.x === tx && n.y === ty);
      if (npc && visible) occupant = 'NPC';
      else {
        const block = game.pushableBlocks?.find((b) => b.x === tx && b.y === ty);
        if (block && (visible || explored)) occupant = 'BLOCK';
      }
    }

    // Interactable check
    let interactable: string | null = null;
    if (tile === TileType.DOOR_CLOSED) interactable = 'DOOR_CLOSED';
    else if (tile === TileType.DOOR_OPEN) interactable = 'DOOR_OPEN';
    else if (tile === TileType.TERMINAL) interactable = 'TERMINAL';
    else if (tile === TileType.ELEVATOR) interactable = 'ELEVATOR';
    else if (tile === TileType.REBEL_CACHE) interactable = 'REBEL_CACHE';
    else if (occupant === 'NPC') interactable = 'NPC';
    else if (occupant === 'BLOCK') interactable = 'PUSHABLE_BLOCK';
    else {
      const gItem = game.groundItems?.find((i) => i.x === tx && i.y === ty);
      if (gItem && (visible || explored)) interactable = 'ITEM';
    }

    // Check map.terminals for terminal at this position (supports Array and Record formats)
    if (!interactable && map.terminals) {
      let terminalAtPos = false;
      if (Array.isArray(map.terminals)) {
        terminalAtPos = map.terminals.some((t: any) => {
          const tx2 = t.position?.x ?? t.x;
          const ty2 = t.position?.y ?? t.y;
          return tx2 === tx && ty2 === ty;
        });
      } else if (typeof map.terminals === 'object') {
        terminalAtPos = Object.values(map.terminals).some((t: any) => {
          const tx2 = t.position?.x ?? t.x;
          const ty2 = t.position?.y ?? t.y;
          return tx2 === tx && ty2 === ty;
        });
      }
      if (terminalAtPos && (visible || explored)) {
        interactable = 'TERMINAL';
      }
    }

    // Walkability: Use checkPlayerMovementCollision for strict parity
    const collisionCheck = checkPlayerMovementCollision(game, dx, dy);
    const isWalkableTile = collisionCheck.canMove;

    return {
      direction: dir,
      dx,
      dy,
      tile_type: props.name,
      walkable: isWalkableTile,
      visible,
      explored,
      occupant,
      interactable,
    };
  });

  // 3. Visible & Remembered Entities with Relative Coordinates
  const hostiles: RelativeHostile[] = [];
  const wreckages: RelativeEntity[] = [];

  if (Array.isArray(game.robots)) {
    for (const r of game.robots) {
      const key = `${r.x},${r.y}`;
      const dx = r.x - px;
      const dy = r.y - py;
      const distance = Math.round(Math.hypot(dx, dy) * 10) / 10;
      const manhattan = Math.abs(dx) + Math.abs(dy);
      const cardinal_direction = calculateCardinalDirection(dx, dy);

      if (r.isAlive === false) {
        // Wreckage: visible if seen or explored
        if (visibleTiles.has(key) || exploredTiles.has(key)) {
          wreckages.push({
            id: r.id,
            type: 'wreckage',
            name: `${r.name} (Wreckage)`,
            dx,
            dy,
            distance,
            manhattan,
            cardinal_direction,
            in_fov: visibleTiles.has(key),
          });
        }
      } else {
        // STRICT FOV PARITY: Living robots ONLY included if inside visibleTiles!
        if (visibleTiles.has(key)) {
          const entry: RelativeHostile = {
            id: r.id,
            type: 'robot',
            name: r.name,
            robot_type: r.robotType,
            dx,
            dy,
            distance,
            manhattan,
            cardinal_direction,
            in_fov: true,
            state: r.aiState,
            attack_range: r.attackRange,
          };
          if (hasOpticHUD) {
            entry.hp = r.hp;
            entry.max_hp = r.maxHp;
          }
          hostiles.push(entry);
        }
      }
    }
  }

  // Sort hostiles by distance (nearest first)
  hostiles.sort((a, b) => a.distance - b.distance);

  // NPCs
  const npcs: RelativeNPC[] = [];
  if (Array.isArray(game.npcs)) {
    for (const n of game.npcs) {
      if (n.isAlive === false) continue;
      const key = `${n.x},${n.y}`;
      if (visibleTiles.has(key) || exploredTiles.has(key)) {
        const dx = n.x - px;
        const dy = n.y - py;
        npcs.push({
          id: n.id,
          type: 'npc',
          name: n.name,
          role: n.role,
          action_state: n.actionState,
          dx,
          dy,
          distance: Math.round(Math.hypot(dx, dy) * 10) / 10,
          manhattan: Math.abs(dx) + Math.abs(dy),
          cardinal_direction: calculateCardinalDirection(dx, dy),
          in_fov: visibleTiles.has(key),
        });
      }
    }
  }
  npcs.sort((a, b) => a.distance - b.distance);

  // Ground Items
  const items: RelativeItem[] = [];
  if (Array.isArray(game.groundItems)) {
    for (const item of game.groundItems) {
      const key = `${item.x},${item.y}`;
      if (visibleTiles.has(key) || exploredTiles.has(key)) {
        const dx = item.x - px;
        const dy = item.y - py;
        items.push({
          id: item.id,
          type: 'item',
          name: item.name,
          category: (item as any).category || (item as any).itemType,
          dx,
          dy,
          distance: Math.round(Math.hypot(dx, dy) * 10) / 10,
          manhattan: Math.abs(dx) + Math.abs(dy),
          cardinal_direction: calculateCardinalDirection(dx, dy),
          in_fov: visibleTiles.has(key),
        });
      }
    }
  }

  // Hazards
  const hazards: RelativeHazard[] = [];
  if (Array.isArray(game.hazards)) {
    for (const h of game.hazards) {
      if (h.exploded) continue;
      const key = `${h.x},${h.y}`;
      if (visibleTiles.has(key) || exploredTiles.has(key)) {
        const dx = h.x - px;
        const dy = h.y - py;
        hazards.push({
          type: h.type || 'MINE',
          dx,
          dy,
          distance: Math.round(Math.hypot(dx, dy) * 10) / 10,
          cardinal_direction: calculateCardinalDirection(dx, dy),
          in_fov: visibleTiles.has(key),
        });
      }
    }
  }

  // Interactables (Doors, Terminals, Crates, Elevator)
  const interactables: RelativeInteractable[] = [];

  // Doors & Elevators from Map Tiles in FOV or Explored
  const scanRadius = game.hasOmniVision?.() ? 15 : 9;
  const minY = Math.max(0, py - scanRadius);
  const maxY = Math.min(map.height - 1, py + scanRadius);
  const minX = Math.max(0, px - scanRadius);
  const maxX = Math.min(map.width - 1, px + scanRadius);

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const key = `${x},${y}`;
      const inFov = visibleTiles.has(key);
      const isExplored = exploredTiles.has(key);
      if (!inFov && !isExplored) continue;

      const tile = getTile(map, { x, y });
      const dx = x - px;
      const dy = y - py;
      const distance = Math.round(Math.hypot(dx, dy) * 10) / 10;
      const cardinal_direction = calculateCardinalDirection(dx, dy);

      if (tile === TileType.DOOR_CLOSED) {
        interactables.push({
          type: 'door',
          name: 'Closed Door',
          dx,
          dy,
          distance,
          cardinal_direction,
          in_fov: inFov,
          state: { isOpen: false },
        });
      } else if (tile === TileType.DOOR_OPEN) {
        interactables.push({
          type: 'door',
          name: 'Open Door',
          dx,
          dy,
          distance,
          cardinal_direction,
          in_fov: inFov,
          state: { isOpen: true },
        });
      } else if (tile === TileType.ELEVATOR) {
        interactables.push({
          type: 'elevator',
          name: 'Sector Elevator',
          dx,
          dy,
          distance,
          cardinal_direction,
          in_fov: inFov,
        });
      } else if (tile === TileType.STEAM_VENT) {
        interactables.push({
          type: 'vent',
          name: 'Steam Vent',
          dx,
          dy,
          distance,
          cardinal_direction,
          in_fov: inFov,
        });
      } else if (tile === TileType.REBEL_CACHE) {
        interactables.push({
          type: 'cache',
          name: 'Rebel Cache',
          dx,
          dy,
          distance,
          cardinal_direction,
          in_fov: inFov,
        });
      }
    }
  }

  // Terminals from map.terminals (supports both Array and Record formats)
  if (map.terminals) {
    const terminalEntries: Array<{ id: string; term: any }> = [];
    if (Array.isArray(map.terminals)) {
      for (const term of map.terminals) {
        const id = term.id || term.name || 'terminal';
        terminalEntries.push({ id, term });
      }
    } else if (typeof map.terminals === 'object') {
      for (const [id, term] of Object.entries(map.terminals)) {
        terminalEntries.push({ id, term });
      }
    }

    for (const { id, term } of terminalEntries) {
      const tx = term.position?.x ?? term.x;
      const ty = term.position?.y ?? term.y;
      if (tx !== undefined && ty !== undefined) {
        const key = `${tx},${ty}`;
        const inFov = visibleTiles.has(key);
        const isExplored = exploredTiles.has(key);
        if (inFov || isExplored) {
          const dx = tx - px;
          const dy = ty - py;
          interactables.push({
            type: 'terminal',
            name: term.name || id,
            dx,
            dy,
            distance: Math.round(Math.hypot(dx, dy) * 10) / 10,
            cardinal_direction: calculateCardinalDirection(dx, dy),
            in_fov: inFov,
            state: { id, isHacked: term.isHacked, clearanceNeeded: term.clearanceNeeded },
          });
        }
      }
    }
  }

  // Pushable blocks
  if (Array.isArray(game.pushableBlocks)) {
    for (const block of game.pushableBlocks) {
      const key = `${block.x},${block.y}`;
      const inFov = visibleTiles.has(key);
      const isExplored = exploredTiles.has(key);
      if (inFov || isExplored) {
        const dx = block.x - px;
        const dy = block.y - py;
        interactables.push({
          type: 'crate',
          name: block.name || block.blockType || 'Pushable Crate',
          dx,
          dy,
          distance: Math.round(Math.hypot(dx, dy) * 10) / 10,
          cardinal_direction: calculateCardinalDirection(dx, dy),
          in_fov: inFov,
          state: { blockType: block.blockType, revealed: block.revealed },
        });
      }
    }
  }

  interactables.sort((a, b) => a.distance - b.distance);

  // 4. Local Relative ASCII FOV Radar
  const radarRadius = game.hasOmniVision?.() ? 15 : 9;
  const radarGrid: string[] = [];
  const width = radarRadius * 2 + 1;
  const height = radarRadius * 2 + 1;

  for (let ry = -radarRadius; ry <= radarRadius; ry++) {
    let rowChars = '';
    for (let rx = -radarRadius; rx <= radarRadius; rx++) {
      if (rx === 0 && ry === 0) {
        rowChars += '@';
        continue;
      }
      const wx = px + rx;
      const wy = py + ry;
      const inBounds = wx >= 0 && wx < map.width && wy >= 0 && wy < map.height;
      if (!inBounds) {
        rowChars += ' ';
        continue;
      }

      const key = `${wx},${wy}`;
      const isVisible = visibleTiles.has(key);
      const isExplored = exploredTiles.has(key);

      if (!isVisible) {
        // Outside FOV: only show static remembered terrain if explored, otherwise void
        if (isExplored) {
          const tile = getTile(map, { x: wx, y: wy });
          if (tile === TileType.WALL) rowChars += '#';
          else if (tile === TileType.DOOR_CLOSED) rowChars += '+';
          else if (tile === TileType.DOOR_OPEN) rowChars += '/';
          else if (tile === TileType.TERMINAL) rowChars += 'T';
          else if (tile === TileType.ELEVATOR) rowChars += 'L';
          else if (tile === TileType.FORCEFIELD) rowChars += '|';
          else {
            // Check map.terminals for terminal at this position
            let terminalAtPos = false;
            if (map.terminals) {
              if (Array.isArray(map.terminals)) {
                terminalAtPos = map.terminals.some((t: any) => {
                  const tx2 = t.position?.x ?? t.x;
                  const ty2 = t.position?.y ?? t.y;
                  return tx2 === wx && ty2 === wy;
                });
              } else if (typeof map.terminals === 'object') {
                terminalAtPos = Object.values(map.terminals).some((t: any) => {
                  const tx2 = t.position?.x ?? t.x;
                  const ty2 = t.position?.y ?? t.y;
                  return tx2 === wx && ty2 === wy;
                });
              }
            }
            if (terminalAtPos) rowChars += 'T';
            else rowChars += '.';
          }
        } else {
          rowChars += ' ';
        }
        continue;
      }

      // Fully Visible: check entities priority
      const liveRobot = game.robots?.find((r) => r.isAlive !== false && r.x === wx && r.y === wy);
      if (liveRobot) {
        if (liveRobot.robotType === RobotType.EXTERMINATOR) rowChars += 'X';
        else if (liveRobot.robotType === RobotType.HUNTER_KILLER) rowChars += 'H';
        else if (liveRobot.robotType === RobotType.SHOCK_ENFORCER) rowChars += 'E';
        else if (liveRobot.robotType === RobotType.SCOUT_DRONE) rowChars += 'D';
        else rowChars += 'R';
        continue;
      }

      const liveNpc = game.npcs?.find((n) => n.isAlive !== false && n.x === wx && n.y === wy);
      if (liveNpc) {
        rowChars += 'N';
        continue;
      }

      const hazard = game.hazards?.find((h) => !h.exploded && h.x === wx && h.y === wy);
      if (hazard) {
        rowChars += '^';
        continue;
      }

      const block = game.pushableBlocks?.find((b) => b.x === wx && b.y === wy);
      if (block) {
        rowChars += 'O';
        continue;
      }

      const item = game.groundItems?.find((i) => i.x === wx && i.y === wy);
      if (item) {
        rowChars += '*';
        continue;
      }

      const wreckage = game.robots?.find((r) => r.isAlive === false && r.x === wx && r.y === wy);
      if (wreckage) {
        rowChars += '%';
        continue;
      }

      // Terrain tile
      const tile = getTile(map, { x: wx, y: wy });
      if (tile === TileType.WALL) rowChars += '#';
      else if (tile === TileType.DOOR_CLOSED) rowChars += '+';
      else if (tile === TileType.DOOR_OPEN) rowChars += '/';
      else if (tile === TileType.FORCEFIELD) rowChars += '|';
      else if (tile === TileType.TERMINAL) rowChars += 'T';
      else if (tile === TileType.ELEVATOR) rowChars += 'L';
      else if (tile === TileType.CONVEYOR) rowChars += '>';
      else if (tile === TileType.STEAM_VENT) rowChars += '~';
      else if (tile === TileType.REBEL_CACHE) rowChars += '$';
      else if (tile === TileType.SERVER_RACK) rowChars += 'S';
      else {
        // Check map.terminals for terminal at this position
        let terminalAtPos = false;
        if (map.terminals) {
          if (Array.isArray(map.terminals)) {
            terminalAtPos = map.terminals.some((t: any) => {
              const tx2 = t.position?.x ?? t.x;
              const ty2 = t.position?.y ?? t.y;
              return tx2 === wx && ty2 === wy;
            });
          } else if (typeof map.terminals === 'object') {
            terminalAtPos = Object.values(map.terminals).some((t: any) => {
              const tx2 = t.position?.x ?? t.x;
              const ty2 = t.position?.y ?? t.y;
              return tx2 === wx && ty2 === wy;
            });
          }
        }
        if (terminalAtPos) rowChars += 'T';
        else rowChars += '.';
      }
    }
    radarGrid.push(rowChars);
  }

  // 5. Screen & Modal State
  let activeModal: string | null = null;
  let modalDetails: any = null;

  if (game.isTitleScreen) {
    if (game.isTitleStoryOpen) {
      activeModal = 'TITLE_STORY';
      modalDetails = {
        storyIndex: (game as any).titleStoryIndex,
        language: game.language,
      };
    } else {
      activeModal = 'TITLE_SCREEN';
      modalDetails = {
        menuIndex: (game as any).titleMenuIndex,
        language: game.language,
      };
    }
  } else if (game.isManualOpen) {
    activeModal = 'MANUAL';
    modalDetails = {
      pageIndex: (game as any).manualPageIndex,
    };
  } else if (game.isIntroBriefingOpen) {
    activeModal = 'INTRO_BRIEFING';
    modalDetails = { scrollOffset: game.introBriefingScrollOffset };
  } else if (game.defeatCutscene) {
    activeModal = 'DEFEAT_CUTSCENE';
    modalDetails = {
      stage: game.defeatCutscene.stage,
      isGearConfiscated: Boolean(game.isGearConfiscated),
    };
  } else if (game.activeBreachSession) {
    activeModal = 'BREACH_SESSION';
  } else if (game.activeTerminal) {
    activeModal = 'TERMINAL';
    const availableCommands = typeof game.activeTerminal.getEffectiveCommands === 'function'
      ? game.activeTerminal.getEffectiveCommands().map((c: any) => ({ command: c.cmd, description: c.desc }))
      : [];
    const terminalHistory = game.activeTerminal.history || game.activeTerminal.log || [];
    const recentOutput = Array.isArray(terminalHistory) ? terminalHistory.slice(-5) : [];
    modalDetails = {
      terminalId: game.activeTerminal.terminal?.id || 'terminal',
      name: game.activeTerminal.name || game.activeTerminal.terminal?.name || 'Terminal',
      logs: terminalHistory,
      inputBuffer: game.terminalInputBuffer || game.activeTerminal.input || '',
      available_commands: availableCommands,
      recent_output: recentOutput,
    };
  } else if (game.activeDialogue) {
    activeModal = 'DIALOGUE';
    const npc = game.activeDialogue.npc;
    const isZh = game.language === 'zh';
    const lines = isZh && npc.dialogueZh?.length ? npc.dialogueZh : npc.dialogue;
    const curIdx = game.activeDialogue.textIndex || 0;
    modalDetails = {
      npcId: npc.id,
      npcName: npc.name,
      role: isZh && npc.roleZh ? npc.roleZh : npc.role,
      currentLine: lines ? lines[curIdx] : '',
      index: curIdx,
      total: lines ? lines.length : 0,
    };
  } else if (game.isJournalOpen) {
    activeModal = 'JOURNAL';
    const entries = (game.journalEntries || []).map(e => ({
      id: e.id,
      title: e.title,
      content: e.content,
      formattedDate: e.formattedDate,
      sectorId: e.sectorId,
      playerPos: e.playerPos
    }));
    const selectedEntry = game.journalSelectedIndex > 0 && entries[game.journalSelectedIndex - 1] ? entries[game.journalSelectedIndex - 1] : null;
    modalDetails = {
      mode: game.journalMode,
      selectedIndex: game.journalSelectedIndex,
      entriesCount: game.journalEntries?.length || 0,
      field: game.journalComposeField,
      titleBuffer: game.journalTitleInputBuffer,
      contentBuffer: game.journalInputBuffer,
      entries,
      selectedEntry,
    };
  } else if (game.isAugmentShopOpen) {
    activeModal = 'AUGMENT_SHOP';
    modalDetails = { credits: player.credits };
  } else if (game.isInventoryOpen) {
    activeModal = 'INVENTORY';
    modalDetails = {
      inventory: player.inventory,
      weapons: player.weapons,
      consumables: player.consumables,
    };
  } else if (game.isMissionLogOpen) {
    activeModal = 'MISSION_LOG';
    modalDetails = { objectives: game.missionObjectives };
  } else if (game.isStoryArchiveOpen) {
    activeModal = 'STORY_ARCHIVE';
    modalDetails = {
      selectedIndex: game.storyArchiveSelectedIndex,
      storyCount: game.storyLogs?.length || 0,
    };
  } else if (game.activeStoryLog) {
    activeModal = 'STORY_LOG';
    modalDetails = {
      logId: game.activeStoryLog.id,
      title: game.activeStoryLog.title,
    };
  } else if (game.isBigMapOpen) {
    activeModal = 'BIG_MAP';
    modalDetails = {
      selectedSector: game.bigMapSelectedSector,
      activeWaypoint: game.activeWaypoint,
    };
  } else if (game.victory) {
    activeModal = 'VICTORY';
    modalDetails = { endgameChoice: game.endgameChoice };
  } else if (player.isAlive === false) {
    activeModal = 'GAME_OVER';
  }

  // 6. Recent Messages
  const recentMessages = (game.messages || [])
    .slice(-8)
    .map((m) => ({ text: m.text || (m as any).message || '', type: m.type || 'info' }));

  // 7. Active Missions
  const activeMissions = (game.missionObjectives || []).map((m: any) => ({
    id: m.id,
    title: m.title || m.name || '',
    titleZh: m.titleZh,
    description: m.description || '',
    descriptionZh: m.descriptionZh,
    completed: Boolean(m.completed),
    is_side_quest: Boolean(m.isSideQuest || m.sideQuest),
  }));

  // 7. Action Masking (valid_actions)
  const validActions: string[] = [];

  if (activeModal === 'TITLE_SCREEN') {
    validActions.push('MENU_UP', 'MENU_DOWN', 'SELECT', 'NEW_GAME', 'LOAD_GAME', 'TOGGLE_LANG', 'MANUAL');
  } else if (activeModal === 'INTRO_BRIEFING') {
    validActions.push('DISMISS_BRIEFING', 'SCROLL_DOWN', 'SCROLL_UP');
  } else if (activeModal === 'DEFEAT_CUTSCENE') {
    validActions.push('SKIP_CUTSCENE');
  } else if (activeModal === 'BREACH_SESSION') {
    validActions.push('ESCAPE');
  } else if (activeModal === 'TERMINAL') {
    validActions.push('SUBMIT_COMMAND', 'BACKSPACE', 'EXIT_TERMINAL');
    // Add all available terminal commands as valid actions
    if (modalDetails?.available_commands) {
      for (const cmd of modalDetails.available_commands) {
        validActions.push('CMD_' + cmd.command);
      }
    }
  } else if (activeModal === 'DIALOGUE') {
    validActions.push('ADVANCE_DIALOGUE', 'CLOSE_DIALOGUE');
  } else if (activeModal === 'JOURNAL') {
    if (game.journalMode === 'compose') {
      validActions.push('TYPE_CHAR', 'BACKSPACE', 'SWITCH_FIELD', 'SUBMIT_ENTRY', 'CANCEL_COMPOSE', 'WRITE_JOURNAL');
    } else {
      validActions.push('COMPOSE_NEW', 'SELECT_UP', 'SELECT_DOWN', 'DELETE_ENTRY', 'CLEAR_ALL', 'CLOSE_JOURNAL', 'WRITE_JOURNAL');
    }
  } else if (activeModal === 'AUGMENT_SHOP') {
    validActions.push(
      'BUY_DERMAL_ARMOR',
      'BUY_OPTIC_HUD',
      'BUY_REFLEX_BOOSTER',
      'BUY_POWER_CORE',
      'BUY_MEDKIT',
      'BUY_BATTERY',
      'BUY_EMP_GRENADE',
      'BUY_OVERCLOCK',
      'BRIBE_NETWORK',
      'CLOSE_SHOP'
    );
  } else if (activeModal === 'INVENTORY') {
    validActions.push(
      'USE_MEDKIT',
      'USE_BATTERY',
      'USE_EMP_GRENADE',
      'CYCLE_WEAPON',
      'TOGGLE_WEAPON_DRAW',
      'CLOSE_INVENTORY'
    );
  } else if (activeModal === 'MISSION_LOG' || activeModal === 'STORY_ARCHIVE' || activeModal === 'STORY_LOG' || activeModal === 'BIG_MAP') {
    validActions.push('CLOSE_MODAL');
  } else if (activeModal === 'VICTORY' || activeModal === 'GAME_OVER') {
    validActions.push('RESTART_GAME');
  } else {
    // Normal Gameplay
    validActions.push('MOVE_N', 'MOVE_S', 'MOVE_E', 'MOVE_W', 'WAIT');

    if (player.isWeaponDrawn) {
      validActions.push('HOLSTER_WEAPON', 'FIRE_FACING', 'FIRE_N', 'FIRE_S', 'FIRE_E', 'FIRE_W');
    } else {
      validActions.push('DRAW_WEAPON');
    }

    if (player.weapons && player.weapons.length > 1) {
      validActions.push('CYCLE_WEAPON');
    }

    validActions.push('TOGGLE_DISGUISE');

    // Interactable nearby?
    const hasNearbyInteractable = adjacentNeighborhood.some((t) => t.interactable !== null);
    if (hasNearbyInteractable) {
      validActions.push('INTERACT');
    }

    // NPC adjacent?
    const hasNearbyNPC = game.npcs?.some((n) => n.isAlive !== false && Math.abs(n.x - px) + Math.abs(n.y - py) <= 1);
    if (hasNearbyNPC) {
      validActions.push('TALK');
    }

    // Ground item at player position?
    const standingOnItem = game.groundItems?.some((i) => i.x === px && i.y === py);
    if (standingOnItem) {
      validActions.push('PICKUP_ITEM');
    }

    // Terminal nearby or at player position?
    let terminalNearby = false;
    if (map.terminals) {
      if (Array.isArray(map.terminals)) {
        terminalNearby = map.terminals.some((t: any) => {
          const tx = t.position?.x ?? t.x;
          const ty = t.position?.y ?? t.y;
          return Math.abs(tx - px) + Math.abs(ty - py) <= 1;
        });
      } else if (typeof map.terminals === 'object') {
        terminalNearby = Object.values(map.terminals).some((t: any) => {
          const tx = t.position?.x ?? t.x;
          const ty = t.position?.y ?? t.y;
          return Math.abs(tx - px) + Math.abs(ty - py) <= 1;
        });
      }
    }
    if (terminalNearby) {
      validActions.push('ACCESS_TERMINAL');
    }

    // Tactical Dash
    if (player.energy >= 20) {
      validActions.push('TACTICAL_DASH');
    }

    // Consumables
    if ((player.consumables?.medkits ?? 0) > 0) validActions.push('USE_MEDKIT');
    if ((player.consumables?.batteries ?? 0) > 0) validActions.push('USE_BATTERY');
    if ((player.consumables?.empGrenades ?? 0) > 0) validActions.push('USE_EMP_GRENADE');

    // Modals
    validActions.push(
      'OPEN_INVENTORY',
      'OPEN_JOURNAL',
      'OPEN_MAP',
      'OPEN_MISSION_LOG',
      'OPEN_STORY_ARCHIVE',
      'OPEN_AUGMENT_SHOP',
      'SAVE_GAME',
      'LOAD_GAME',
      'WRITE_JOURNAL',
      'GET_MENTAL_MAP'
    );
  }

  const actionSemantics: Record<string, ActionSemantic> = {};
  for (const act of validActions) {
    actionSemantics[act] = getActionSemantic(act, game);
  }

  // 8. Mental Map Summary
  const mentalMapSnapshot: MentalMapSnapshot = getMentalMapSnapshot(game);
  const frontiers: FrontierPoint[] = detectFrontiers(game);
  let nearestFrontier: FrontierPoint | null = null;
  if (frontiers.length > 0) {
    nearestFrontier = frontiers.reduce((closest, f) => {
      const distClosest = Math.abs(closest.x - px) + Math.abs(closest.y - py);
      const distF = Math.abs(f.x - px) + Math.abs(f.y - py);
      return distF < distClosest ? f : closest;
    });
  }

  const totalTiles = map.width * map.height;
  const exploredPercentage = totalTiles > 0 ? Math.round((exploredTiles.size / totalTiles) * 10000) / 100 : 0;

  const mentalMapSummary = {
    explored_percentage: exploredPercentage,
    explored_tiles_count: exploredTiles.size,
    walked_tiles_count: mentalMapSnapshot.stats.walked_tiles_count,
    frontiers_count: frontiers.length,
    nearest_frontier: nearestFrontier,
    recalled_pois_count: (
      mentalMapSnapshot.recalled_pois.terminals.length +
      mentalMapSnapshot.recalled_pois.npcs.length +
      mentalMapSnapshot.recalled_pois.doors.length +
      mentalMapSnapshot.recalled_pois.items.length +
      mentalMapSnapshot.recalled_pois.blocks.length
    ),
  };

  return {
    turn: (game as any).turnCounter ?? 0,
    sector_id: player.currentSectorId || map.id || 'sector-1',
    sector_name: map.name || 'Metropolis Sector',
    player: playerTelemetry,
    active_missions: activeMissions,
    adjacent_neighborhood: adjacentNeighborhood,
    visible_entities: {
      hostiles,
      npcs,
      interactables,
      items,
      hazards,
      wreckages,
    },
    ascii_fov_radar: {
      radius: radarRadius,
      width,
      height,
      grid: radarGrid,
      legend: RADAR_LEGEND,
    },
    screen_modal: {
      active_modal: activeModal,
      modal_details: modalDetails,
    },
    recent_messages: recentMessages,
    valid_actions: validActions,
    action_semantics: actionSemantics,
    mental_map_summary: mentalMapSummary,
  };
}

/**
 * Maps AI action names to keyboard events and forwards them to the game engine.
 * @param game The GameEngine instance.
 * @param action The action string (e.g., 'MOVE_N', 'WAIT').
 * @returns true if the action was successfully mapped and dispatched.
 */
export interface AIActionOutcome {
  accepted: boolean;
  action: string;
  moved: boolean;
  fired?: boolean;
  interacted?: boolean;
  reason: string;
  turn_advanced: boolean;
  player_pos: { x: number; y: number };
  message?: string;
  new_modal: string | null;
  mental_map?: MentalMapSnapshot;
  route_plan?: RoutePlan;
}

export function executeAIAction(game: GameEngine, action: string): AIActionOutcome {
  // Special handling for Journal commands
  if (action.startsWith('WRITE_JOURNAL:') || action.startsWith('WRITE_JOURNAL_ENTRY:')) {
    const prefix = action.startsWith('WRITE_JOURNAL_ENTRY:') ? 'WRITE_JOURNAL_ENTRY:' : 'WRITE_JOURNAL:';
    const payload = action.substring(prefix.length);
    let title: string | undefined;
    let content: string;
    
    if (payload.includes('|')) {
      const parts = payload.split('|');
      title = parts[0];
      content = parts.slice(1).join('|');
    } else {
      content = payload;
    }

    if (!content.trim()) {
      return {
        accepted: false,
        action,
        moved: false,
        fired: false,
        interacted: false,
        reason: 'empty_journal_content',
        turn_advanced: false,
        player_pos: { x: game.player.x, y: game.player.y },
        new_modal: game.isJournalOpen ? 'JOURNAL' : null,
      };
    }

    saveJournalEntry(content.trim(), game.map?.id || 'sector-1', { x: game.player.x, y: game.player.y }, title?.trim());
    game.journalEntries = loadJournalEntries();

    if (game.isJournalOpen) {
      game.journalMode = 'view';
      game.journalSelectedIndex = 1;
      game.journalInputBuffer = '';
      game.journalTitleInputBuffer = '';
    }

    const msg = game.language === 'zh' ? '【日記】條目已儲存。' : '[JOURNAL] Entry saved.';
    game.pushMessage(msg, 'success');

    return {
      accepted: true,
      action,
      moved: false,
      fired: false,
      interacted: true,
      reason: 'journal_entry_saved',
      turn_advanced: false,
      player_pos: { x: game.player.x, y: game.player.y },
      message: msg,
      new_modal: game.isJournalOpen ? 'JOURNAL' : null,
    };
  }

  if (action.startsWith('SET_JOURNAL_TITLE:')) {
    const text = action.substring('SET_JOURNAL_TITLE:'.length);
    game.journalTitleInputBuffer = text;
    return {
      accepted: true,
      action,
      moved: false,
      fired: false,
      interacted: true,
      reason: 'journal_title_set',
      turn_advanced: false,
      player_pos: { x: game.player.x, y: game.player.y },
      new_modal: 'JOURNAL',
    };
  }

  if (action.startsWith('SET_JOURNAL_CONTENT:')) {
    const text = action.substring('SET_JOURNAL_CONTENT:'.length);
    game.journalInputBuffer = text;
    return {
      accepted: true,
      action,
      moved: false,
      fired: false,
      interacted: true,
      reason: 'journal_content_set',
      turn_advanced: false,
      player_pos: { x: game.player.x, y: game.player.y },
      new_modal: 'JOURNAL',
    };
  }

  if (action === 'SUBMIT_ENTRY') {
    if (game.isJournalOpen && game.journalMode === 'compose') {
      if (!game.journalInputBuffer.trim()) {
        return {
          accepted: true,
          action,
          moved: false,
          fired: false,
          interacted: false,
          reason: 'empty_journal_content',
          turn_advanced: false,
          player_pos: { x: game.player.x, y: game.player.y },
          new_modal: 'JOURNAL',
        };
      } else {
        game.submitJournalEntry();
        const msg = game.language === 'zh' ? '【日記】條目已儲存。' : '[JOURNAL] Entry saved.';
        return {
          accepted: true,
          action,
          moved: false,
          fired: false,
          interacted: true,
          reason: 'journal_entry_saved',
          turn_advanced: false,
          player_pos: { x: game.player.x, y: game.player.y },
          message: msg,
          new_modal: 'JOURNAL',
        };
      }
    }
  }

  if (action === 'DELETE_ENTRY' && game.isJournalOpen) {
    game.deleteSelectedJournalEntry();
    return {
      accepted: true,
      action,
      moved: false,
      fired: false,
      interacted: true,
      reason: 'journal_entry_deleted',
      turn_advanced: false,
      player_pos: { x: game.player.x, y: game.player.y },
      message: '【日記】條目已刪除。',
      new_modal: 'JOURNAL',
    };
  }

  if (action === 'CLEAR_ALL' && game.isJournalOpen) {
    game.clearAllJournalEntries();
    return {
      accepted: true,
      action,
      moved: false,
      fired: false,
      interacted: true,
      reason: 'journal_entries_cleared',
      turn_advanced: false,
      player_pos: { x: game.player.x, y: game.player.y },
      message: '【日記】已清空所有特工筆記。',
      new_modal: 'JOURNAL',
    };
  }

  // Special handling for Mental Map actions
  if (action === 'GET_MENTAL_MAP') {
    const snapshot: MentalMapSnapshot = getMentalMapSnapshot(game);
    const frontiers: FrontierPoint[] = detectFrontiers(game);
    let nearestFrontier: FrontierPoint | null = null;
    if (frontiers.length > 0) {
      nearestFrontier = frontiers.reduce((closest, f) => {
        const distClosest = Math.abs(closest.x - game.player.x) + Math.abs(closest.y - game.player.y);
        const distF = Math.abs(f.x - game.player.x) + Math.abs(f.y - game.player.y);
        return distF < distClosest ? f : closest;
      });
    }
    const totalTiles = game.map.width * game.map.height;
    const exploredTiles = game.exploredTiles || new Set<string>();
    const exploredPercentage = totalTiles > 0 ? Math.round((exploredTiles.size / totalTiles) * 10000) / 100 : 0;
    const recalledPoisCount = (
      snapshot.recalled_pois.terminals.length +
      snapshot.recalled_pois.npcs.length +
      snapshot.recalled_pois.doors.length +
      snapshot.recalled_pois.items.length +
      snapshot.recalled_pois.blocks.length
    );

    const msg = game.language === 'zh'
      ? `【心智地圖】探索 ${exploredPercentage}%，邊界點 ${frontiers.length} 個，已召回 POI ${recalledPoisCount} 個。`
      : `[MENTAL_MAP] Explored ${exploredPercentage}%, ${frontiers.length} frontiers, ${recalledPoisCount} recalled POIs.`;
    game.pushMessage(msg, 'info');

    return {
      accepted: true,
      action,
      moved: false,
      fired: false,
      interacted: true,
      reason: 'mental_map_retrieved',
      turn_advanced: false,
      player_pos: { x: game.player.x, y: game.player.y },
      message: msg,
      new_modal: null,
      mental_map: snapshot,
    };
  }

  if (action.startsWith('PLAN_ROUTE')) {
    const targetStr = action.substring('PLAN_ROUTE'.length).replace(/^[:\s]+/, '');
    let target: { x: number; y: number } | string;

    if (targetStr) {
      const parts = targetStr.split(',').map((s) => s.trim());
      if (parts.length === 2) {
        const x = parseInt(parts[0], 10);
        const y = parseInt(parts[1], 10);
        if (!isNaN(x) && !isNaN(y)) {
          target = { x, y };
        } else {
          target = targetStr;
        }
      } else {
        target = targetStr;
      }
    } else {
      target = '';
    }

    if (typeof target === 'string' && target === '') {
      const msg = game.language === 'zh'
        ? '【路徑規劃】無法解析目標座標。'
        : '[ROUTE] Could not resolve target coordinates.';
      game.pushMessage(msg, 'warning');
      return {
        accepted: false,
        action,
        moved: false,
        fired: false,
        interacted: false,
        reason: 'invalid_route_target',
        turn_advanced: false,
        player_pos: { x: game.player.x, y: game.player.y },
        message: msg,
        new_modal: null,
      };
    }

    const routePlan: RoutePlan = planMentalMapRoute(game, target);
    
    let targetDesc = '';
    if (typeof target === 'object') {
      targetDesc = `(${target.x}, ${target.y})`;
    } else {
      targetDesc = target;
    }

    const msg = game.language === 'zh'
      ? `【路徑規劃】目標 ${targetDesc}，找到路徑 ${routePlan.found ? '是' : '否'}，總步數 ${routePlan.total_steps}。`
      : `[ROUTE] Target ${targetDesc}, found ${routePlan.found ? 'yes' : 'no'}, total steps ${routePlan.total_steps}.`;
    game.pushMessage(msg, 'info');

    return {
      accepted: true,
      action,
      moved: false,
      fired: false,
      interacted: true,
      reason: 'route_planned',
      turn_advanced: false,
      player_pos: { x: game.player.x, y: game.player.y },
      message: msg,
      new_modal: null,
      route_plan: routePlan,
    };
  }

  // Special handling for terminal commands
  if (action.startsWith('CMD_') || action.startsWith('EXEC_COMMAND:')) {
    if (!game.activeTerminal) {
      return {
        accepted: false,
        action,
        moved: false,
        fired: false,
        interacted: false,
        reason: 'no_active_terminal',
        turn_advanced: false,
        player_pos: { x: game.player.x, y: game.player.y },
        new_modal: null,
      };
    }

    const cmdText = action.startsWith('CMD_') ? action.substring(4) : action.substring(13);
    
    if (game.activeTerminal.input !== undefined) {
      game.activeTerminal.input = cmdText;
    }
    if (game.terminalInputBuffer !== undefined) {
      game.terminalInputBuffer = cmdText;
    }

    if (typeof game.handleKeyDown === 'function') {
      game.handleKeyDown('Enter');
    } else if (typeof window !== 'undefined') {
      const event = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        bubbles: true,
        cancelable: true,
      });
      window.dispatchEvent(event);
    }

    const termHistory = game.activeTerminal?.history || game.activeTerminal?.log || [];
    const terminalMessage = Array.isArray(termHistory) && termHistory.length > 0 ? termHistory[termHistory.length - 1] : undefined;

    return {
      accepted: true,
      action,
      moved: false,
      fired: false,
      interacted: true,
      reason: 'terminal_command_executed',
      turn_advanced: false,
      player_pos: { x: game.player.x, y: game.player.y },
      message: terminalMessage,
      new_modal: game.activeTerminal ? 'TERMINAL' : game.activeBreachSession ? 'BREACH_SESSION' : null,
    };
  }

  const actionToKey: Record<string, string> = {
    // Movement
    MOVE_N: 'ArrowUp',
    MOVE_S: 'ArrowDown',
    MOVE_E: 'ArrowRight',
    MOVE_W: 'ArrowLeft',
    WAIT: ' ',

    // Combat
    DRAW_WEAPON: 'f',
    HOLSTER_WEAPON: 'f',
    FIRE_FACING: ' ',
    FIRE_N: 'ArrowUp',
    FIRE_S: 'ArrowDown',
    FIRE_E: 'ArrowRight',
    FIRE_W: 'ArrowLeft',
    CYCLE_WEAPON: 'q',

    // Interaction
    INTERACT: 'e',
    TALK: 't',
    PICKUP_ITEM: 'e',
    ACCESS_TERMINAL: 't',
    TACTICAL_DASH: 'Shift',

    // Consumables
    USE_MEDKIT: '1',
    USE_BATTERY: '2',
    USE_EMP_GRENADE: '3',

    // UI / Modals
    ADVANCE_DIALOGUE: 'Enter',
    CLOSE_DIALOGUE: 'Escape',
    DISMISS_BRIEFING: 'Enter',
    RESTART_GAME: 'Enter',
    CLOSE_MODAL: 'Escape',
    OPEN_INVENTORY: 'i',
    CLOSE_INVENTORY: 'Escape',
    OPEN_JOURNAL: 'p',
    OPEN_MAP: 'Tab',
    OPEN_MISSION_LOG: 'm',
    OPEN_STORY_ARCHIVE: 'l',
    OPEN_AUGMENT_SHOP: 'u',
    SAVE_GAME: '8',
    LOAD_GAME: '9',

    // Menu / Title
    MENU_UP: 'ArrowUp',
    MENU_DOWN: 'ArrowDown',
    SELECT: 'Enter',
    NEW_GAME: 'Enter',
    TOGGLE_LANG: 'z',
    MANUAL: 'h',

    // Terminal
    SUBMIT_COMMAND: 'Enter',
    BACKSPACE: 'Backspace',
    EXIT_TERMINAL: 'Escape',

    // Journal
    TYPE_CHAR: 'a', // Generic placeholder, usually handled by specific char
    SWITCH_FIELD: 'Tab',
    SUBMIT_ENTRY: 'Enter',
    CANCEL_COMPOSE: 'Escape',
    COMPOSE_NEW: 'n',
    SELECT_UP: 'ArrowUp',
    SELECT_DOWN: 'ArrowDown',
    DELETE_ENTRY: 'Delete',
    CLEAR_ALL: 'c',
    CLOSE_JOURNAL: 'Escape',

    // Shop
    BUY_DERMAL_ARMOR: '1',
    BUY_OPTIC_HUD: '2',
    BUY_REFLEX_BOOSTER: '3',
    BUY_POWER_CORE: '4',
    BUY_MEDKIT: '5',
    BUY_BATTERY: '6',
    BUY_EMP_GRENADE: '7',
    BUY_OVERCLOCK: '8',
    BRIBE_NETWORK: '9',
    CLOSE_SHOP: 'Escape',

    // Briefing
    SCROLL_DOWN: 'ArrowDown',
    SCROLL_UP: 'ArrowUp',

    // Cutscene
    SKIP_CUTSCENE: 'Enter',

    // Breach
    ESCAPE: 'Escape',
  };

  const key = actionToKey[action];
  if (!key) {
    return {
      accepted: false,
      action,
      moved: false,
      reason: 'unknown_action',
      turn_advanced: false,
      player_pos: { x: game.player.x, y: game.player.y },
      new_modal: null,
    };
  }

  // Record pre-action state
  const preX = game.player.x;
  const preY = game.player.y;
  const preTurn = (game as any).turnCounter ?? 0;
  const preEnergy = game.player.energy;
  const preWeaponDrawn = game.player.isWeaponDrawn;
  const preModal = game.activeTerminal ? 'TERMINAL' : game.activeDialogue ? 'DIALOGUE' : null;
  const preGroundItemsCount = game.groundItems?.length ?? 0;

  // Call handleKeyDown directly if available, otherwise dispatch to window
  if (typeof game.handleKeyDown === 'function') {
    game.handleKeyDown(key);
  } else if (typeof window !== 'undefined') {
    const event = new KeyboardEvent('keydown', {
      key: key,
      code: key === ' ' ? 'Space' : key,
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(event);
  } else {
    return {
      accepted: false,
      action,
      moved: false,
      reason: 'unknown_action',
      turn_advanced: false,
      player_pos: { x: preX, y: preY },
      new_modal: null,
    };
  }

  // Determine outcome
  const postX = game.player.x;
  const postY = game.player.y;
  const postTurn = (game as any).turnCounter ?? 0;
  const postEnergy = game.player.energy;
  const postWeaponDrawn = game.player.isWeaponDrawn;
  const postGroundItemsCount = game.groundItems?.length ?? 0;
  
  let reason = 'unknown_action';
  let moved = false;
  let fired = false;
  let interacted = false;

  // Special handling for terminal actions
  if (action === 'ACCESS_TERMINAL') {
    if (game.activeTerminal) {
      interacted = true;
      reason = 'opened_terminal';
    } else {
      interacted = false;
      reason = 'no_terminal_in_range';
    }
  } else if (action === 'EXIT_TERMINAL') {
    if (preModal === 'TERMINAL' && !game.activeTerminal) {
      reason = 'closed_terminal';
    } else {
      reason = 'closed_terminal';
    }
  } else if (action.startsWith('CMD_') || action.startsWith('EXEC_COMMAND:')) {
    // Extract command text
    let cmdText = '';
    if (action.startsWith('CMD_')) {
      cmdText = action.substring(4);
    } else if (action.startsWith('EXEC_COMMAND:')) {
      cmdText = action.substring(13);
    }
    
    // Set the command in the terminal input buffer
    if (game.activeTerminal) {
      if (game.activeTerminal.input !== undefined) {
        game.activeTerminal.input = cmdText;
      }
      if (game.terminalInputBuffer !== undefined) {
        game.terminalInputBuffer = cmdText;
      }
      
      // Execute the command by pressing Enter
      if (typeof game.handleKeyDown === 'function') {
        game.handleKeyDown('Enter');
      } else if (typeof window !== 'undefined') {
        const event = new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          bubbles: true,
          cancelable: true,
        });
        window.dispatchEvent(event);
      }
      
      interacted = true;
      reason = 'terminal_command_executed';
    } else {
      reason = 'no_active_terminal';
    }
  }

  // Determine new modal state
  let newModal: string | null = null;
  if (game.activeTerminal) newModal = 'TERMINAL';
  else if (game.activeDialogue) newModal = 'DIALOGUE';
  else if (game.isJournalOpen) newModal = 'JOURNAL';
  else if (game.isInventoryOpen) newModal = 'INVENTORY';
  else if (game.isMissionLogOpen) newModal = 'MISSION_LOG';
  else if (game.isStoryArchiveOpen) newModal = 'STORY_ARCHIVE';
  else if (game.activeStoryLog) newModal = 'STORY_LOG';
  else if (game.isBigMapOpen) newModal = 'BIG_MAP';
  else if (game.isAugmentShopOpen) newModal = 'AUGMENT_SHOP';
  else if (game.isTitleScreen) {
    if (game.isTitleStoryOpen) newModal = 'TITLE_STORY';
    else newModal = 'TITLE_SCREEN';
  }
  else if (game.isManualOpen) newModal = 'MANUAL';
  else if (game.isIntroBriefingOpen) newModal = 'INTRO_BRIEFING';
  else if (game.defeatCutscene) newModal = 'DEFEAT_CUTSCENE';
  else if (game.activeBreachSession) newModal = 'BREACH_SESSION';
  else if (game.victory) newModal = 'VICTORY';
  else if (game.player.isAlive === false) newModal = 'GAME_OVER';

  // Logic to determine specific reason
  if (action === 'ACCESS_TERMINAL' || action === 'EXIT_TERMINAL' || action.startsWith('CMD_') || action.startsWith('EXEC_COMMAND:')) {
    // Already handled above
  } else if (action.startsWith('MOVE_') || action === 'WAIT') {
    if (preX === postX && preY === postY) {
      // Determine direction from action
      let targetX = preX;
      let targetY = preY;
      let dx = 0;
      let dy = 0;
      if (action === 'MOVE_N') { targetY = preY - 1; dy = -1; }
      else if (action === 'MOVE_S') { targetY = preY + 1; dy = 1; }
      else if (action === 'MOVE_E') { targetX = preX + 1; dx = 1; }
      else if (action === 'MOVE_W') { targetX = preX - 1; dx = -1; }

      if (action !== 'WAIT') {
        // Use collision check for consistent reason
        const collision = checkPlayerMovementCollision(game, dx, dy);
        reason = collision.reason;
        
        // Special case: Door interaction
        if (collision.reason === 'blocked_by_door') {
          // Check if door actually opened
          const targetKey = `${targetX},${targetY}`;
          const map = game.map;
          const inBounds = targetX >= 0 && targetX < map.width && targetY >= 0 && targetY < map.height;
          if (inBounds) {
            const tile = getTile(map, { x: targetX, y: targetY });
            if (tile === TileType.DOOR_OPEN) {
              reason = 'opened_door';
              interacted = true;
            }
          }
        }
      } else {
        reason = 'waited';
        moved = false;
      }
    } else {
      // Position changed
      moved = true;
      reason = 'moved_successfully';
    }
  } else if (action === 'DRAW_WEAPON' || action === 'HOLSTER_WEAPON') {
    if (preWeaponDrawn !== postWeaponDrawn) {
      reason = postWeaponDrawn ? 'weapon_drawn' : 'weapon_holstered';
    } else {
      reason = 'weapon_drawn'; // Fallback
    }
  } else if (action.startsWith('FIRE_')) {
    if (preEnergy > postEnergy) {
      fired = true;
      reason = 'weapon_fired';
    } else {
      reason = 'insufficient_energy';
    }
  } else if (action === 'INTERACT' || action === 'TALK' || action === 'PICKUP_ITEM') {
    // Check for specific interactions
    if (newModal === 'DIALOGUE') {
      interacted = true;
      reason = 'opened_dialogue';
    } else if (newModal === 'TERMINAL') {
      interacted = true;
      reason = 'opened_terminal';
    } else if (postGroundItemsCount < preGroundItemsCount) {
      interacted = true;
      reason = 'picked_up_item';
    } else {
      // Check last message for door interaction feedback
      const lastMsg = game.messages?.length ? game.messages[game.messages.length - 1].text : '';
      if (lastMsg.includes('氣密隔離門已開啟') || lastMsg.includes('cycled open')) {
        interacted = true;
        reason = 'opened_door';
      } else if (lastMsg.includes('氣密隔離門已關閉') || lastMsg.includes('cycled closed')) {
        interacted = true;
        reason = 'closed_door';
      } else if (lastMsg.includes('隔離門已被鎖定') || lastMsg.includes('locked')) {
        interacted = false;
        reason = 'door_locked';
      } else {
        interacted = false;
        reason = 'no_interactable_in_range';
      }
    }
  } else {
    reason = 'action_executed';
  }

  const lastMessage = game.messages?.length ? game.messages[game.messages.length - 1].text : undefined;

  // For terminal command execution, get the latest terminal output
  let terminalMessage: string | undefined;
  if (action.startsWith('CMD_') || action.startsWith('EXEC_COMMAND:')) {
    const termHistory = game.activeTerminal?.history || game.activeTerminal?.log || [];
    if (Array.isArray(termHistory) && termHistory.length > 0) {
      terminalMessage = termHistory[termHistory.length - 1];
    }
  }

  return {
    accepted: true,
    action,
    moved,
    fired,
    interacted,
    reason,
    turn_advanced: postTurn !== preTurn,
    player_pos: { x: postX, y: postY },
    message: terminalMessage || lastMessage,
    new_modal: newModal,
  };
}
