import type { GameEngine } from './game';
import { soundFX } from './audio';
import { bgm } from './music';
import { buildSector1Map, getTile, isWalkable } from './map';
import type { GroundItem, Robot, SecurityLevel } from './types';

export function executeDetentionRelocation(game: GameEngine, showMessages = true): void {
  const p = game.player;
  game.confiscatedGear = { weapons: Array.isArray(p.weapons) ? [...p.weapons] : [], equippedWeapon: p.equippedWeapon ? { ...p.equippedWeapon } : null, inventory: Array.isArray(p.inventory) ? [...p.inventory] : [], consumables: p.consumables ? { ...p.consumables } : null, augments: p.augments ? { ...p.augments } : null, equippedShield: p.equippedShield ? { ...p.equippedShield } : null };
  game.isGearConfiscated = true;
  p.weapons = []; p.equippedWeapon = null; p.inventory = []; p.consumables = { medkits: 0, batteries: 0, empGrenades: 0 }; p.augments = {}; p.equippedShield = null;
  p.hp = Math.round(p.maxHp * 0.4); p.isAlive = true;
  game.securityLevel = 'CLEAR' as SecurityLevel; game.checkInAlertActive = false;
  for (const robot of game.robots) { if (robot.isAlive) { robot.aiState = 'patrol'; robot.targetPos = null; robot.pursuitTurns = 0; } }
  game.switchSector('sector-1');
  if (game.map?.id !== 'sector-1') game.map = buildSector1Map();
  p.currentSectorId = 'sector-1'; game.resetDetentionCell(); p.x = 35; p.y = 5; game.updateFOV();
  bgm.setIntensity('exploration'); if (!bgm.enabled) bgm.start();
  const locker: GroundItem = { id: 'item-confiscated-locker', name: 'Tzorg Evidence Locker', itemType: 'KEYCARD', x: 32, y: 6, description: '佐格證物保管箱：內含被扣押的個人裝備與武器。', amount: 1, iconColor: '#ff2a4b' };
  const replaceLocker = (items: GroundItem[]) => { const index = items.findIndex((item) => item.id === locker.id); if (index === -1) items.push(locker); else items[index] = locker; };
  replaceLocker(game.groundItems);
  if (game.sectorGroundItems['sector-1']) replaceLocker(game.sectorGroundItems['sector-1']);
  if (showMessages) {
    game.pushFloatingText(p.x, p.y, 'DETENTION CELL', '#ff2a4b');
    game.pushMessage(game.language === 'zh' ? '【禁閉室】你被佐格安保單位扣押。所有裝備已被移送至守衛室 (32, 6) 證物保管箱。' : '[DETENTION CELL] You have been detained by Tzorg security. All gear has been moved to the Evidence Locker at Guard Room (32, 6).', 'danger');
    game.pushMessage(game.language === 'zh' ? '【脫逃提示】右上角 (36, 4) 為【鬆動的通風金屬柵板】！可按 [E] 拆開或推動它以顯現通風暗門！' : '[ESCAPE HINT] Top-right (36, 4) is a [Loose Ventilation Metal Grate]! Press [E] to pry it open or push it to reveal the ventilation secret door!', 'info');
    game.pushFloatingText(36, 4, 'LOOSE VENT [E]', '#00ff88');
  }
  game.render();
}

export function startDefeatCutscene(game: GameEngine): void {
  game.player.isAlive = false; game.player.isWeaponDrawn = false; game.laserBeams = []; soundFX.powerDown();
  const swarmRobots: Robot[] = [];
  const sortedRobots = game.robots.filter((robot) => robot.isAlive).sort((a, b) => Math.abs(a.x - game.player.x) + Math.abs(a.y - game.player.y) - Math.abs(b.x - game.player.x) - Math.abs(b.y - game.player.y));
  const px = game.player.x; const py = game.player.y;
  const positions = [{ x: px + 1, y: py }, { x: px - 1, y: py }, { x: px, y: py + 1 }, { x: px, y: py - 1 }, { x: px + 1, y: py + 1 }, { x: px - 1, y: py - 1 }, { x: px + 1, y: py - 1 }, { x: px - 1, y: py + 1 }];
  let positionIndex = 0;
  for (const robot of sortedRobots.slice(0, 4)) {
    if (Math.abs(robot.x - px) + Math.abs(robot.y - py) <= 10) {
      while (positionIndex < positions.length) {
        const candidate = positions[positionIndex++]; const tile = getTile(game.map, candidate);
        if (tile !== undefined && isWalkable(tile) && !game.robots.some((other) => other.isAlive && other !== robot && other.x === candidate.x && other.y === candidate.y)) { robot.x = candidate.x; robot.y = candidate.y; break; }
      }
    }
    robot.aiState = 'chase'; robot.targetPos = { x: px, y: py }; swarmRobots.push(robot);
  }
  const now = Date.now();
  game.defeatCutscene = { stage: 'swarm', startTime: now, stageStartTime: now, duration: 2200, playerDownPos: { x: px, y: py }, swarmRobots };
  game.pushMessage(game.language === 'zh' ? '【被擊倒】佐格安保單位正在壓制你……' : '[DOWNED] Tzorg security units are subduing you...', 'danger'); game.render();
}

export function updateDefeatCutscene(game: GameEngine, now: number): void {
  const cutscene = game.defeatCutscene; if (!cutscene) return;
  const elapsed = now - cutscene.stageStartTime;
  if (cutscene.stage === 'swarm' && elapsed >= cutscene.duration) { cutscene.stage = 'blur_out'; cutscene.stageStartTime = now; cutscene.duration = 1600; return; }
  if (cutscene.stage === 'blur_out' && elapsed >= cutscene.duration) { cutscene.stage = 'wake_up'; cutscene.stageStartTime = now; cutscene.duration = 1400; executeDetentionRelocation(game, false); return; }
  if (cutscene.stage === 'wake_up' && elapsed >= cutscene.duration) {
    game.defeatCutscene = null; bgm.setIntensity('exploration');
    game.pushMessage(game.language === 'zh' ? '【脫逃提示】右上角 (36, 4) 為【鬆動的通風金屬柵板】！可按 [E] 拆開或推動它以顯現通風暗門！' : '[ESCAPE HINT] Top-right (36, 4) is a [Loose Ventilation Metal Grate]! Press [E] to pry it open or push it to reveal the ventilation secret door!', 'info');
    game.pushFloatingText(36, 4, 'LOOSE VENT [E]', '#00ff88'); game.render();
  }
}
