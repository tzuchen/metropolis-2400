import type { GameEngine } from './game';
import { soundFX } from './audio';
import { getTile } from './map';
import { isBossRobot, applyBossDamage } from './boss';
import type { Robot, Hazard, PushableBlock, GroundItem, SecurityLevel } from './types';

export function fireEquippedWeapon(game: GameEngine, direction?: { dx: number; dy: number }): boolean {
  let dx = 0;
  let dy = 0;
  if (direction) {
    dx = direction.dx;
    dy = direction.dy;
  } else {
    const facing = (game.player as any).facing || 'right';
    if (facing === 'right') dx = 1;
    else if (facing === 'left') dx = -1;
    else if (facing === 'up') dy = -1;
    else if (facing === 'down') dy = 1;
  }

  const weapon = game.player.equippedWeapon;
  if (!weapon) return false;

  const energyCost = weapon.energyCost ?? 5;
  if (game.player.energy < energyCost) {
    soundFX.hit();
    (game as any).pushMessage('Energy depleted! Blaster power cells exhausted.', 'danger');
    game.render();
    return false;
  }

  game.player.energy -= energyCost;
  
  const weaponId = (weapon as any)?.weaponId;
  const isQuantum = weaponId === 'QUANTUM_ANNIHILATOR';
  
  let hitRobot: Robot | null = null;
  let hitCanister: Hazard | null = null;
  let hitBlock: PushableBlock | null = null;
  let hitWall = false;
  let hitX = game.player.x + dx;
  let hitY = game.player.y + dy;
  
  const maxRange = isQuantum ? 7 : (weapon.range ?? 5);
  
  for (let range = 1; range <= maxRange; range++) {
    const tx = game.player.x + dx * range;
    const ty = game.player.y + dy * range;
    const tTile = getTile(game.map, { x: tx, y: ty });
    const tName = String(tTile).toUpperCase();
    
    if (tName === 'WALL' || tTile === 2) {
      hitWall = true;
      hitX = tx;
      hitY = ty;
      break;
    }

    const foundBlock = game.pushableBlocks.find((b) => b.x === tx && b.y === ty);
    if (foundBlock) {
      hitBlock = foundBlock;
      hitX = tx;
      hitY = ty;
      break;
    }

    const found = game.robots.find((r) => r.isAlive && r.x === tx && r.y === ty);
    if (found) {
      hitRobot = found;
      hitX = tx;
      hitY = ty;
      break;
    }

    const foundCanister = game.hazards.find((h) => !h.exploded && h.x === tx && h.y === ty);
    if (foundCanister) {
      hitCanister = foundCanister;
      hitX = tx;
      hitY = ty;
      break;
    }
  }

  // Play sound
  if (weaponId === 'DART_GUN') {
    soundFX.dart();
  } else if (weaponId === 'SCATTER_SHOTGUN') {
    soundFX.shotgun();
  } else if (isQuantum) {
    soundFX.laser();
  } else {
    soundFX.laser();
  }

  // Visuals
  let beamColor = '#00f0ff';
  let beamType: 'LASER' | 'ELEC' | 'PLASMA' | 'NEEDLE' | 'QUANTUM' = 'LASER';
  let beamWidth = 3;
  let sparkColor = '#00f0ff';
  let sparkCount = 10;
  let shakeIntensity = 0;

  if (isQuantum) {
    beamType = 'QUANTUM';
    beamColor = '#b388ff';
    beamWidth = 6;
    sparkColor = '#b388ff';
    sparkCount = 25;
    shakeIntensity = 10;
  }

  const playerBeam = {
    from: { x: game.player.x, y: game.player.y },
    to: { x: hitX, y: hitY },
    color: beamColor,
    createdAt: Date.now(),
    duration: 200,
    beamType: beamType,
    width: beamWidth,
    targetRobot: hitRobot || undefined,
  };
  game.laserBeams.push(playerBeam);

  const hitTileSize = (game.renderer as any)?.tileSize || 48;
  (game.fx as any).spawnSparks(
    hitX * hitTileSize + hitTileSize / 2,
    hitY * hitTileSize + hitTileSize / 2,
    sparkColor,
    sparkCount
  );
  if (shakeIntensity > 0) {
    (game.fx as any).triggerShake(shakeIntensity);
  }

  // Damage Logic
  if (hitRobot) {
    // 戰術背刺與奇襲判定 (Ambush / Silent Backstab)
    const isBackstab =
      game.player.isDisguised ||
      hitRobot.aiState === 'patrol' ||
      (hitRobot.stunnedTurns ?? 0) > 0;

    const baseDamage = weapon.power ?? 35;
    let damage = isBackstab ? Math.round(baseDamage * 3) : baseDamage;
    
    if (isQuantum) {
      // Quantum Annihilator: 220 damage, pierces phase shield, stuns
      damage = 220;
      hitRobot.stunnedTurns = 2;
    }

    if (isBossRobot(hitRobot)) {
      applyBossDamage(hitRobot, damage, game);
    } else {
      hitRobot.hp -= damage;
      if (hitRobot.hp <= 0) {
        hitRobot.isAlive = false;
        soundFX.hit();
        (game as any).pushFloatingText(hitRobot.x, hitRobot.y, 'DESTROYED', '#ff3855');
        (game as any).pushMessage(hitRobot.name + ' destroyed!', 'success');
      }
    }

    if (isQuantum) {
      (game as any).pushFloatingText(hitRobot.x, hitRobot.y, 'QUANTUM ANNIHILATION!', '#b388ff');
      (game as any).pushMessage(`QUANTUM ANNIHILATOR: Dealt ${damage} damage to ${hitRobot.name}!`, 'success');
    } else if (isBackstab) {
      (game as any).pushFloatingText(hitRobot.x, hitRobot.y, `CRIT ${damage}!`, '#ffea00');
      (game as any).pushMessage(
        `AMBUSH CRITICAL OVERRIDE: Dealt ${damage} damage to ${hitRobot.name}!`,
        'success'
      );
    } else {
      (game as any).pushFloatingText(hitRobot.x, hitRobot.y, '-' + damage, '#ff3855');
      (game as any).pushMessage('Fired laser at ' + hitRobot.name + ' for ' + damage + ' dmg!', 'danger');
    }

    if (hitRobot.hp <= 0) {
      hitRobot.isAlive = false;
      soundFX.explosion();
      (game.fx as any).spawnExplosion(
        hitRobot.x * hitTileSize + hitTileSize / 2,
        hitRobot.y * hitTileSize + hitTileSize / 2,
        22
      );
      (game.fx as any).triggerShake(8);
      (game as any).gainExp(45);
      game.player.credits += 50;
      game.player.energy = Math.min(game.player.maxEnergy, game.player.energy + 20);

      // 隨機掉落殘骸補給物資 (Loot Drop from robot)
      const dropRoll = Math.random();
      if (dropRoll < 0.4) {
        game.groundItems.push({
          id: `drop-${Date.now()}`,
          name: 'Plasma Battery',
          itemType: 'BATTERY',
          x: hitRobot.x,
          y: hitRobot.y,
          description: 'Salvaged power capacitor from destroyed chassis.',
          amount: 1,
          iconColor: '#00f0ff',
        } as GroundItem);
      } else if (dropRoll < 0.7) {
        game.groundItems.push({
          id: `drop-${Date.now()}`,
          name: 'Credit Chip',
          itemType: 'CREDIT_CHIP',
          x: hitRobot.x,
          y: hitRobot.y,
          description: 'Tzorg encoded currency token.',
          amount: 45,
          iconColor: '#ffea00',
        } as GroundItem);
      }

      (game as any).pushFloatingText(hitRobot.x, hitRobot.y, '+50 CR', '#ffaa00');
      (game as any).pushMessage(hitRobot.name + ' destroyed! Salvaged scrap data & energy.', 'success');

      // 檢查附近是否已無追擊者，若是則解除警報
      const anyNearbyChasing = game.robots.some(
        (r) =>
          r.isAlive &&
          r !== hitRobot &&
          ((r as any).aiState === 'chase' || (r as any).aiState === 'attack' || ((r as any).pursuitTurns ?? 0) > 0) &&
          Math.hypot(r.x - game.player.x, r.y - game.player.y) <= 14
      );
      if (!anyNearbyChasing && game.securityLevel === 'ALERT' && !game.checkInAlertActive) {
        game.securityLevel = 'CLEAR' as SecurityLevel;
        (game as any).pushMessage('All nearby hostiles eliminated. Area secure.', 'info');
      }
    } else {
      soundFX.hit();
      hitRobot.aiState = 'chase';
      hitRobot.targetPos = { x: game.player.x, y: game.player.y };
      (hitRobot as any).pursuitTurns = 8;
    }

    // 槍響聲學偵測與警戒連鎖 (Gunfire Acoustics)
    const isSuppressed = (weapon as any)?.isSuppressed === true;
    if (isSuppressed) {
      (game as any).pushMessage('Suppressed shot fired! No acoustic signature detected.', 'info');
    } else if (!isBackstab) {
      game.securityLevel = 'ALERT' as SecurityLevel;
      soundFX.alarm();

      // 槍響震波：通知半徑 8 格內未發現主角的巡邏機器人前來調查
      for (const r of game.robots) {
        if (!r.isAlive || r === hitRobot) continue;
        const d = Math.abs(r.x - game.player.x) + Math.abs(r.y - game.player.y);
        if (d <= 8 && r.aiState === 'patrol') {
          r.aiState = 'chase';
          r.targetPos = { x: game.player.x, y: game.player.y };
          (r as any).pursuitTurns = 6;
        }
      }
    } else {
      (game as any).pushMessage('Silent takedown executed! Acoustic suppression maintained.', 'info');
    }
  } else if (hitCanister) {
    (game as any).detonateCanister(hitCanister);
  } else if (hitBlock) {
    (game as any).pushFloatingText(hitX, hitY, 'BLOCKED', '#ffea00');
    (game as any).pushMessage('Weapon impact blocked by cover.', 'info');
    
    // Acoustic alert even if no hit
    const isSuppressed = (weapon as any)?.isSuppressed === true;
    if (!isSuppressed) {
      game.securityLevel = 'ALERT' as SecurityLevel;
      soundFX.alarm();
      for (const r of game.robots) {
        if (!r.isAlive) continue;
        const d = Math.abs(r.x - game.player.x) + Math.abs(r.y - game.player.y);
        if (d <= 8 && r.aiState === 'patrol') {
          r.aiState = 'chase';
          r.targetPos = { x: game.player.x, y: game.player.y };
          (r as any).pursuitTurns = 6;
        }
      }
    }
  } else {
    // No target, just impact effect
    (game as any).pushFloatingText(hitX, hitY, 'IMPACT', '#00f0ff');
    (game as any).pushMessage('Fired weapon into the void.', 'info');
    
    // Acoustic alert even if no hit
    const isSuppressed = (weapon as any)?.isSuppressed === true;
    if (!isSuppressed) {
      game.securityLevel = 'ALERT' as SecurityLevel;
      soundFX.alarm();
      for (const r of game.robots) {
        if (!r.isAlive) continue;
        const d = Math.abs(r.x - game.player.x) + Math.abs(r.y - game.player.y);
        if (d <= 8 && r.aiState === 'patrol') {
          r.aiState = 'chase';
          r.targetPos = { x: game.player.x, y: game.player.y };
          (r as any).pursuitTurns = 6;
        }
      }
    }
  }

  game.tick();

  // Update beam and floating text coordinates if the hit robot moved during tick
  if (hitRobot && hitRobot.isAlive && (hitRobot.x !== hitX || hitRobot.y !== hitY)) {
    playerBeam.to = { x: hitRobot.x, y: hitRobot.y };
    // Update the most recent floating text that was created at the old hit position
    for (let i = game.floatingTexts.length - 1; i >= 0; i--) {
      const ft = game.floatingTexts[i];
      if (ft.x === hitX && ft.y === hitY) {
        ft.x = hitRobot.x;
        ft.y = hitRobot.y;
        break;
      }
    }
  }

  return true;
}
