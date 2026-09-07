import type { Robot, Position, GroundItem } from './types';
import { createRobot } from './entities';
import { soundFX } from './audio';

export function createBossExterminator(pos: Position = { x: 32, y: 18 }): Robot {
  return {
    id: 'boss-exterminator-prime',
    name: 'EXTERMINATOR-PRIME',
    x: pos.x,
    y: pos.y,
    hp: 250,
    maxHp: 250,
    isAlive: true,
    robotType: 'EXTERMINATOR',
    aiState: 'patrol',
    patrolPath: [
      { x: 30, y: 18 },
      { x: 35, y: 18 },
      { x: 35, y: 22 },
      { x: 30, y: 22 },
    ],
    currentPatrolIndex: 0,
    targetPos: null,
    alertCooldown: 0,
    attackPower: 22,
    scanRange: 9,
    stunnedTurns: 0,
  };
}

export function isBossRobot(robot: Robot): boolean {
  return robot?.id === 'boss-exterminator-prime' || robot?.robotType === 'EXTERMINATOR';
}

/**
 * Handle damage calculation and Phase 2 overdrive trigger for the Boss
 */
export function applyBossDamage(boss: Robot, rawDamage: number, game: any): number {
  const b = boss as any;
  let finalDamage = rawDamage;

  // 二階段護盾減傷 35%
  if (b.phase2Overclock) {
    finalDamage = Math.max(1, Math.round(rawDamage * 0.65));
  }

  const remainingHp = boss.hp - finalDamage;

  // 檢查是否觸發二階段狂暴 (< 50% HP)
  if (remainingHp <= 125 && !b.phase2Overclock) {
    b.phase2Overclock = true;
    soundFX.alarm();

    // 空投兩架支援無人機
    try {
      const drone1 = createRobot('SERVICE_BOT' as any, { x: boss.x - 1, y: boss.y }, [{ x: boss.x - 1, y: boss.y }, { x: boss.x, y: boss.y }]);
      const drone2 = createRobot('SCOUT_DRONE' as any, { x: boss.x + 1, y: boss.y }, [{ x: boss.x + 1, y: boss.y }, { x: boss.x, y: boss.y }]);
      if (Array.isArray(game.robots)) {
        game.robots.push(drone1, drone2);
      }
    } catch {}

    const warnMsg = game.language === 'zh'
      ? '⚠️ 警告：滅絕者原型機啟動【二階段過載護盾】，修復機已空投！'
      : '⚠️ ALERT: EXTERMINATOR-PRIME initiated Phase 2 Overclocked Shield, Support Drones deployed!';
    game.pushFloatingText(boss.x, boss.y, 'PHASE 2 OVERDRIVE!', '#ff0055');
    game.pushMessage(warnMsg, 'danger');
  }

  boss.hp = Math.max(0, remainingHp);

  // 首領死亡時掉落傳奇戰利品
  if (boss.hp <= 0 && boss.isAlive) {
    boss.isAlive = false;
    handleBossDeath(boss, game);
  }

  return finalDamage;
}

/**
 * Drops legendary rewards when the boss is eliminated
 */
export function handleBossDeath(boss: Robot, game: any): void {
  soundFX.victory();
  const isZh = game.language === 'zh';

  // 1. 佐格主腦根憑證 (Master Root Cipher)
  const masterCipher: GroundItem = {
    id: 'item-master-cipher',
    name: isZh ? '佐格主腦根權限密鑰' : 'Master Root Cipher Chip',
    itemType: 'KEYCARD',
    x: boss.x,
    y: boss.y,
    description: isZh
      ? '量子級核心密鑰，具備對佐格中央主腦的最高覆寫權限，可觸發【全民大覺醒】。'
      : 'Quantum root override key. Unlocks the Central Overmind Core with absolute clearance.',
    iconColor: '#ff00ff',
  };

  // 2. 傳奇高頻震盪刀 (Vibro-Katana)
  const vibroBlade: GroundItem = {
    id: 'item-vibro-katana',
    name: isZh ? '分子震盪高頻刀' : 'Vibro-Katana',
    itemType: 'KEYCARD', // Available for pickup and inventory
    x: boss.x + 1,
    y: boss.y,
    description: isZh
      ? '極致鋒利的軍規單分子武士刀，近戰 48 點傷害，且 100% 觸發伏擊爆擊。'
      : 'Legendary molecular monoblade. Deals 48 DMG and guarantees Ambush Criticals.',
    iconColor: '#00ffff',
  };

  if (Array.isArray(game.groundItems)) {
    game.groundItems.push(masterCipher, vibroBlade);
  }

  // 標記玩家獲得擊殺首領徽記
  if (game.player) {
    (game.player as any).hasDefeatedBoss = true;
    (game.player as any).credits += 200;
  }

  const victoryMsg = isZh
    ? '🎉 首領擊破！佐格滅絕者原型機已被殲滅，傳奇戰利品【主腦根密鑰】已掉落！(+200 CR)'
    : '🎉 BOSS ELIMINATED! EXTERMINATOR-PRIME destroyed. Master Root Cipher dropped! (+200 CR)';
  game.pushFloatingText(boss.x, boss.y, 'BOSS ELIMINATED!', '#00ff88');
  game.pushMessage(victoryMsg, 'success');
}
