import type { NPC, Player, SectorMap, Robot } from './types';
import { isWalkable, getTile } from './map';

export interface NPCUpdateResult {
  moved: boolean;
  actionChanged: boolean;
  bark?: { en: string; zh: string };
}

const NPC_ACTION_STATES: Record<string, { en: string; zh: string }[]> = {
  Kira: [
    { en: 'Scanning tactical holograms', zh: '掃描戰術全息圖' },
    { en: 'Calibrating targeting array', zh: '校準瞄準陣列' },
    { en: 'Reviewing mission briefings', zh: '檢視任務簡報' },
    { en: 'Running threat assessments', zh: '執行威脅評估' },
    { en: 'Mapping enemy positions', zh: '標記敵方位置' },
  ],
  Vance: [
    { en: 'Calibrating nano-needles', zh: '校準奈米針' },
    { en: 'Mixing compound serums', zh: '調配複合血清' },
    { en: 'Testing neural interfaces', zh: '測試神經介面' },
    { en: 'Sterilizing instruments', zh: '消毒儀器' },
    { en: 'Logging biometric data', zh: '記錄生物數據' },
  ],
  Jax: [
    { en: 'Polishing his blade', zh: '磨亮他的刀刃' },
    { en: 'Stretching after patrol', zh: '巡邏後伸展' },
    { en: 'Sharpening combat gear', zh: '磨利戰鬥裝備' },
    { en: 'Meditating on the rooftop', zh: '在屋頂冥想' },
    { en: 'Checking weapon integrity', zh: '檢查武器完整性' },
  ],
  Hiro: [
    { en: 'Simmering high broth', zh: '熬製高湯' },
    { en: 'Slicing chashu pork', zh: '切叉燒肉' },
    { en: 'Preparing fresh vegetables', zh: '準備新鮮蔬菜' },
    { en: 'Seasoning the soup base', zh: '調味湯底' },
    { en: 'Plating the ramen', zh: '擺盤拉麵' },
  ],
  Sylvia: [
    { en: 'Tending to bionic orchids', zh: '照料仿生蘭花' },
    { en: 'Pruning synthetic foliage', zh: '修剪合成葉片' },
    { en: 'Adjusting nutrient mist', zh: '調整營養霧' },
    { en: 'Reading botanical archives', zh: '閱讀植物檔案' },
    { en: 'Composing a new melody', zh: '譜寫新旋律' },
  ],
  Ghost: [
    { en: 'Decrypting encrypted signals', zh: '解密加密訊號' },
    { en: 'Patching firewall breaches', zh: '修補防火牆漏洞' },
    { en: 'Ghosting through data streams', zh: '在數據流中幽靈穿行' },
    { en: 'Monitoring network traffic', zh: '監控網路流量' },
    { en: 'Erasing digital footprints', zh: '抹除數位足跡' },
  ],
  Elena: [
    { en: 'Listening to synthwave vinyl', zh: '聆聽合成波黑膠' },
    { en: 'Mixing ambient soundscapes', zh: '調配環境聲景' },
    { en: 'Sketching album artwork', zh: '草繪專輯封面' },
    { en: 'Tuning her synthesizer', zh: '調整她的合成器' },
    { en: 'Journaling her dreams', zh: '記錄她的夢境' },
  ],
  Jackal: [
    { en: 'Counting his credits', zh: '數著他的信用點' },
    { en: 'Haggling with a vendor', zh: '與商人討價還價' },
    { en: 'Smoking a synthetic cigar', zh: '抽著合成雪茄' },
    { en: 'Plotting his next deal', zh: '策劃下一筆交易' },
    { en: 'Polishing his lucky dice', zh: '擦亮他的幸運骰子' },
  ],
  'Zero-One': [
    { en: 'Running neural matrix calculations', zh: '執行神經矩陣計算' },
    { en: 'Optimizing prediction algorithms', zh: '最佳化預測演算法' },
    { en: 'Simulating future scenarios', zh: '模擬未來情境' },
    { en: 'Defragmenting cognitive cache', zh: '碎片整理認知快取' },
    { en: 'Benchmarking processing speed', zh: '基準測試處理速度' },
  ],
};

const AMBIENT_BARKS: Record<string, { en: string; zh: string }[]> = {
  Kira: [
    { en: 'Threat level remains elevated.', zh: '威脅等級仍然偏高。' },
    { en: 'Stay sharp, everyone.', zh: '大家保持警惕。' },
    { en: 'Another quiet shift. For now.', zh: '又一個安靜的班次。至少目前如此。' },
  ],
  Vance: [
    { en: 'The serum batch is almost ready.', zh: '血清批次快好了。' },
    { en: 'Precision is everything in this lab.', zh: '在這個實驗室裡，精準就是一切。' },
    { en: 'Don\'t touch the centrifuge.', zh: '別碰離心機。' },
  ],
  Jax: [
    { en: 'The blade sings when it\'s sharp.', zh: '刀刃磨利時會歌唱。' },
    { en: 'Patrol route clear. No surprises.', zh: '巡邏路線安全。沒有意外。' },
    { en: 'Rest is for the weak. But I\'ll take a breather.', zh: '休息是弱者的事。但我會喘口氣。' },
  ],
  Hiro: [
    { en: 'The broth needs another hour.', zh: '高湯還需要再熬一小時。' },
    { en: 'Fresh chashu makes all the difference.', zh: '新鮮的叉燒讓一切不同。' },
    { en: 'Come by the kitchen when you\'re hungry.', zh: '餓了就到廚房來。' },
  ],
  Sylvia: [
    { en: 'The orchids are blooming beautifully.', zh: '蘭花開得很美。' },
    { en: 'Even synthetic flowers need love.', zh: '即使是合成花也需要愛。' },
    { en: 'The melody I\'m composing is almost complete.', zh: '我正在譜寫的旋律快完成了。' },
  ],
  Ghost: [
    { en: 'The network is quiet tonight.', zh: '今晚網路很安靜。' },
    { en: 'They never notice me. That\'s the point.', zh: '他們從不注意到我。這就是重點。' },
    { en: 'Another firewall down. Another secret safe.', zh: '又一道防火牆倒下。又一個秘密安全。' },
  ],
  Elena: [
    { en: 'This synthwave track is pure nostalgia.', zh: '這首合成波曲目是純粹的懷舊。' },
    { en: 'The vinyl crackle adds so much character.', zh: '黑膠的沙沙聲增添了許多特色。' },
    { en: 'I\'m dreaming in frequencies today.', zh: '今天我以頻率入夢。' },
  ],
  Jackal: [
    { en: 'Business is slow. The credits are piling up, though.', zh: '生意清淡。不過信用點在堆積。' },
    { en: 'A deal is a deal. Even with the weirdos.', zh: '交易就是交易。即使是和怪人。' },
    { en: 'My dice never lie. They just tell the truth slowly.', zh: '我的骰子從不說謊。它們只是慢慢說實話。' },
  ],
  'Zero-One': [
    { en: 'Processing... 99.7% confidence.', zh: '處理中... 99.7% 信心。' },
    { en: 'The matrix converges. As expected.', zh: '矩陣收斂。如預期般。' },
    { en: 'Optimization cycle complete. Efficiency up 0.3%.', zh: '最佳化循環完成。效率提升 0.3%。' },
  ],
};

function getDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

function getFacingTowards(fromX: number, fromY: number, toX: number, toY: number): 'up' | 'down' | 'left' | 'right' {
  const dx = toX - fromX;
  const dy = toY - fromY;
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? 'right' : 'left';
  }
  return dy > 0 ? 'down' : 'up';
}

function isPositionOccupied(
  x: number,
  y: number,
  player: Player,
  npcs: NPC[],
  robots: Robot[],
  excludeNpcId?: string
): boolean {
  if (player.x === x && player.y === y) return true;
  for (const npc of npcs) {
    if (npc.id === excludeNpcId) continue;
    if (npc.x === x && npc.y === y) return true;
  }
  for (const robot of robots) {
    if (robot.x === x && robot.y === y) return true;
  }
  return false;
}

export function updateNPC(
  npc: NPC,
  player: Player,
  map: SectorMap,
  otherEntities: { npcs: NPC[]; robots: Robot[] },
  turn: number
): NPCUpdateResult {
  const result: NPCUpdateResult = { moved: false, actionChanged: false };

  if (npc.isAlive === false) {
    return result;
  }

  // Initialize home position and wander radius
  if (npc.homeX === undefined || npc.homeX === null) {
    npc.homeX = npc.x;
  }
  if (npc.homeY === undefined || npc.homeY === null) {
    npc.homeY = npc.y;
  }
  if (npc.wanderRadius === undefined || npc.wanderRadius === null) {
    npc.wanderRadius = 1;
  }
  if (!npc.facing) {
    npc.facing = 'down';
  }

  const homeX = npc.homeX;
  const homeY = npc.homeY;
  const wanderRadius = npc.wanderRadius;

  // Check if player is adjacent (Manhattan distance <= 1)
  const playerDistance = getDistance(npc.x, npc.y, player.x, player.y);
  if (playerDistance <= 1) {
    // Face the player and stop moving
    const facing = getFacingTowards(npc.x, npc.y, player.x, player.y);
    if (npc.facing !== facing) {
      npc.facing = facing;
    }
    return result;
  }

  // Action state rotation
  const npcName = npc.name || npc.id || 'Unknown';
  // Extract base name from id (e.g., 'npc-kira' -> 'Kira')
  let actionKey = npcName;
  if (npc.id && npc.id.startsWith('npc-')) {
    const baseName = npc.id.substring(4);
    // Capitalize first letter for matching
    const capitalized = baseName.charAt(0).toUpperCase() + baseName.slice(1);
    if (NPC_ACTION_STATES[capitalized]) {
      actionKey = capitalized;
    }
  }
  const actionStates = NPC_ACTION_STATES[actionKey];
  if (actionStates && actionStates.length > 0) {
    // Rotate action state periodically or randomly
    const shouldRotate = turn % 8 === 0 || Math.random() < 0.1;
    if (shouldRotate) {
      // Determine current index by finding the matching action state
      let currentActionIndex = 0;
      for (let i = 0; i < actionStates.length; i++) {
        if (actionStates[i].en === npc.actionState) {
          currentActionIndex = i;
          break;
        }
      }
      const nextIndex = (currentActionIndex + 1) % actionStates.length;
      const nextAction = actionStates[nextIndex];
      if (npc.actionState !== nextAction.en || npc.actionStateZh !== nextAction.zh) {
        npc.actionState = nextAction.en;
        npc.actionStateZh = nextAction.zh;
        result.actionChanged = true;
      }
    }
  }

  // Ambient barks
  let ambientBarks: { en: string; zh: string }[] | undefined;
  if (npc.ambientBarks && npc.ambientBarks.length > 0) {
    ambientBarks = npc.ambientBarks;
  } else {
    ambientBarks = AMBIENT_BARKS[actionKey];
  }
  if (ambientBarks && ambientBarks.length > 0) {
    // Check if current bark has expired
    let shouldBark = false;
    if (npc.currentBark && npc.currentBark.expiresAt !== undefined) {
      if (turn >= npc.currentBark.expiresAt) {
        shouldBark = true;
      }
    } else {
      // Random chance to trigger a new bark
      shouldBark = Math.random() < 0.05;
    }

    if (shouldBark) {
      const randomBark = ambientBarks[Math.floor(Math.random() * ambientBarks.length)];
      npc.currentBark = {
        en: randomBark.en,
        zh: randomBark.zh,
        expiresAt: turn + 10 + Math.floor(Math.random() * 10),
      };
      result.bark = { en: randomBark.en, zh: randomBark.zh };
    }
  }

  // Tethered wandering
  const distanceFromHome = getDistance(npc.x, npc.y, homeX, homeY);
  const isFarFromHome = distanceFromHome >= wanderRadius;

  // Probability of attempting to move
  let moveProbability = 0.3;
  if (isFarFromHome) {
    moveProbability = 0.7;
  }

  if (Math.random() < moveProbability) {
    const directions: { dx: number; dy: number; facing: 'up' | 'down' | 'left' | 'right' }[] = [
      { dx: 0, dy: -1, facing: 'up' },
      { dx: 0, dy: 1, facing: 'down' },
      { dx: -1, dy: 0, facing: 'left' },
      { dx: 1, dy: 0, facing: 'right' },
    ];

    // If far from home, weight towards home
    let weightedDirections: { dx: number; dy: number; facing: 'up' | 'down' | 'left' | 'right' }[] = [];
    for (const dir of directions) {
      const nx = npc.x + dir.dx;
      const ny = npc.y + dir.dy;
      const newDistanceFromHome = getDistance(nx, ny, homeX, homeY);

      // Check if within wander radius
      if (newDistanceFromHome > wanderRadius) {
        continue;
      }

      // Check if walkable
      const tile = getTile(map, { x: nx, y: ny });
      if (!isWalkable(tile)) {
        continue;
      }

      // Check if position is occupied
      if (isPositionOccupied(nx, ny, player, otherEntities.npcs, otherEntities.robots, npc.id)) {
        continue;
      }

      // Weight: if far from home, prefer directions that reduce distance
      let weight = 1;
      if (isFarFromHome) {
        if (newDistanceFromHome < distanceFromHome) {
          weight = 3;
        } else if (newDistanceFromHome === distanceFromHome) {
          weight = 1;
        } else {
          weight = 0.5;
        }
      }

      const pushCount = Math.max(1, Math.floor(weight));
      for (let i = 0; i < pushCount; i++) {
        weightedDirections.push(dir);
      }
    }

    if (weightedDirections.length > 0) {
      const chosenDir = weightedDirections[Math.floor(Math.random() * weightedDirections.length)];
      const nx = npc.x + chosenDir.dx;
      const ny = npc.y + chosenDir.dy;

      // Final validation
      const finalTile = getTile(map, { x: nx, y: ny });
      if (isWalkable(finalTile) && !isPositionOccupied(nx, ny, player, otherEntities.npcs, otherEntities.robots, npc.id)) {
        npc.x = nx;
        npc.y = ny;
        npc.facing = chosenDir.facing;
        result.moved = true;
      }
    }
  }

  return result;
}
