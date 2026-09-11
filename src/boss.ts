import type { Robot, Position, GroundItem } from './types';
import { createRobot } from './entities';
import { soundFX } from './audio';
import { TileType, RobotType } from './types';

export const BOSS_CONFIG = {
  HP: 250,
  ATTACK_POWER: 22,
  PHASE2_THRESHOLD: 125,
  PHASE2_DAMAGE_REDUCTION: 0.35,
  CREDIT_REWARD: 200,
  XP_REWARD: 250,
  MAX_STUN_TURNS: 3,
} as const;

export function createBossExterminator(pos: Position = { x: 32, y: 18 }): Robot {
  return {
    id: 'boss-exterminator-prime',
    name: 'EXTERMINATOR-PRIME',
    x: pos.x,
    y: pos.y,
    hp: BOSS_CONFIG.HP,
    maxHp: BOSS_CONFIG.HP,
    isAlive: true,
    robotType: RobotType.EXTERMINATOR,
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
    attackPower: BOSS_CONFIG.ATTACK_POWER,
    attackRange: 5,
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
  // 死亡保護與致死傷害保護
  if (!boss.isAlive || rawDamage <= 0) {
    return 0;
  }

  let finalDamage = rawDamage;

  const isQuantum = (game?.player?.equippedWeapon as any)?.weaponId === 'QUANTUM_ANNIHILATOR';

  // 二階段護盾減傷 35%
  if (boss.phase2Overclock) {
    if (isQuantum) {
      finalDamage = rawDamage;
      game?.pushFloatingText?.(boss.x, boss.y, 'SHIELD BYPASS!', '#b388ff');
      const bypassMsg = game?.language === 'zh'
        ? '⚡ 量子殲滅重砲穿透二階段過載護盾！'
        : '⚡ QUANTUM_ANNIHILATOR bypassed Phase 2 Overclocked Shield!';
      game?.pushMessage?.(bypassMsg, 'info');
    } else {
      finalDamage = Math.max(1, Math.round(rawDamage * (1 - BOSS_CONFIG.PHASE2_DAMAGE_REDUCTION)));
    }
  }

  // 量子殲滅重砲電磁震盪癱瘓
  if (isQuantum) {
    boss.stunnedTurns = Math.min(BOSS_CONFIG.MAX_STUN_TURNS, Math.max(boss.stunnedTurns ?? 0, 1));
  }

  const remainingHp = boss.hp - finalDamage;

  // 檢查是否觸發二階段狂暴 (< 50% HP)
  if (remainingHp > 0 && remainingHp <= BOSS_CONFIG.PHASE2_THRESHOLD && !boss.phase2Overclock) {
    boss.phase2Overclock = true;
    soundFX.alarm();

    // 空投兩架支援無人機
    try {
      const drone1 = createRobot(RobotType.SERVICE_BOT, { x: boss.x - 1, y: boss.y }, [{ x: boss.x - 1, y: boss.y }, { x: boss.x, y: boss.y }]);
      const drone2 = createRobot(RobotType.SCOUT_DRONE, { x: boss.x + 1, y: boss.y }, [{ x: boss.x + 1, y: boss.y }, { x: boss.x, y: boss.y }]);
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
    itemType: 'WEAPON',
    weaponId: 'VIBRO_KATANA',
    power: 48,
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
    (game.player as any).credits += BOSS_CONFIG.CREDIT_REWARD;
  }

  // 給予 250 點經驗值獎勵
  game?.gainExp?.(BOSS_CONFIG.XP_REWARD);

  // 若當前地圖為 sector-citadel，關閉通往中央主腦核心的力場
  const currentSector = game?.map?.id || (game?.player as any)?.currentSectorId || game?.mapId;
  const tiles = game?.map?.tiles || game?.grid;
  if (currentSector === 'sector-citadel' && Array.isArray(tiles)) {
    for (let y = 14; y <= 16; y++) {
      if (tiles[y] && y < tiles.length) {
        if (tiles[y][31] !== undefined) {
          tiles[y][31] = TileType.FLOOR;
        }
        if (tiles[y][33] !== undefined) {
          tiles[y][33] = TileType.FLOOR;
        }
      }
    }
    game?.pushFloatingText?.(31, 15, 'FORCEFIELD OFFLINE', '#00ff88');
    const forcefieldMsg = isZh
      ? '⚡ 力場已關閉，通往中央主腦核心終端機的通道已開啟！'
      : '⚡ Forcefield offline. Path to the Central Overmind Core terminal is now open!';
    game?.pushMessage?.(forcefieldMsg, 'info');

    // 觸發緊急蜂擁圍攻機制
    soundFX.alarm();
    if (typeof game.triggerCitadelHorde === 'function') {
      game.triggerCitadelHorde();
    } else {
      game.isCitadelHordeActive = true;
    }

    const hordeMsg1 = isZh
      ? '🚨【緊急警報】佐格中央主腦啟動自毀淨化圍剿！無盡禁衛軍正從四面八方湧入！'
      : '🚨 EMERGENCY ALERT: Central Overmind initiated self-destruct purge! Endless guards are swarming from all directions!';
    const hordeMsg2 = isZh
      ? '⚠️ 敵軍數量無限且無法全數消滅！特工雷文，立刻衝向東側核心終端機執行主腦指令！'
      : '⚠️ Enemy forces are infinite and cannot be fully eliminated! Agent Raven, rush to the Eastern Core Terminal immediately!';
    game?.pushMessage?.(hordeMsg1, 'danger');
    game?.pushMessage?.(hordeMsg2, 'danger');

    if (game.player) {
      game?.pushFloatingText?.(game.player.x, game.player.y, 'EMERGENCY HORDE!', '#ff0033');
    }
  }

  const victoryMsg = isZh
    ? '🎉 首領擊破！佐格滅絕者原型機已被殲滅，傳奇戰利品【主腦根密鑰】已掉落！(+200 CR, +250 XP)'
    : '🎉 BOSS ELIMINATED! EXTERMINATOR-PRIME destroyed. Master Root Cipher dropped! (+200 CR, +250 XP)';
  game?.pushFloatingText?.(boss.x, boss.y, 'BOSS ELIMINATED!', '#00ff88');
  game?.pushMessage?.(victoryMsg, 'success');
}
