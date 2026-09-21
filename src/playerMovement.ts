/**
 * Metropolis 2400 - Player Movement & Physical Interaction Controller
 *
 * Handles directional stepping, NPC bumping/dialogue/swapping, weapon auto-aiming,
 * pushable blocks/crates, elevator transit, and wall/forcefield collisions.
 */

import {
  Player,
  SectorMap,
  Robot,
  NPC,
  Hazard,
  PushableBlock,
  GroundItem,
  DialogueSession,
  Language,
  GameMessage,
} from './types';
import { getTile, isWalkable, toggleDoor } from './map';
import { getNextSectorId } from './sewerMap';
import { soundFX } from './audio';

export interface MovementContext {
  lastDialogueNpcId: string | null;
}

export interface MovementHost {
  player: Player;
  map: SectorMap;
  robots: Robot[];
  npcs: NPC[];
  hazards: Hazard[];
  pushableBlocks: PushableBlock[];
  groundItems: GroundItem[];
  activeDialogue: DialogueSession | null;
  language: Language;
  renderer?: any;
  fx?: any;
  lastAdjacentPassageKey?: string;
  fireEquippedWeapon(direction: { dx: number; dy: number }): void;
  updateNPCDialogues(): void;
  checkSideQuestDiscovery(npcId: string): void;
  handlePlayerStep(): void;
  checkItemPickup(): void;
  tick(): void;
  render(): void;
  switchSector(sectorId: string): void;
  gainExp(amount: number, reason?: string): void;
  pushFloatingText(x: number, y: number, text: string, color?: string): void;
  pushMessage(text: string, type: GameMessage['type']): void;
}

export class PlayerMovementController {
  /**
   * Processes player movement in the given direction (dx, dy).
   */
  static handleMovement(
    g: MovementHost,
    dx: number,
    dy: number,
    ctx: MovementContext = { lastDialogueNpcId: null }
  ): void {
    const nx = g.player.x + dx;
    const ny = g.player.y + dy;

    // 1. Check if walking toward NPC for dialogue or position swapping
    const targetNPC = g.npcs.find((n) => n.isAlive !== false && n.x === nx && n.y === ny);
    if (targetNPC) {
      if (!g.player.isWeaponDrawn) {
        if (ctx.lastDialogueNpcId === targetNPC.id || g.activeDialogue?.npc?.id === targetNPC.id) {
          ctx.lastDialogueNpcId = null;
          g.activeDialogue = null;
          const px = g.player.x;
          const py = g.player.y;
          g.player.x = targetNPC.x;
          g.player.y = targetNPC.y;
          targetNPC.x = px;
          targetNPC.y = py;
          targetNPC.facing = g.player.facing;
          soundFX.step();
          const isZh = g.language === 'zh';
          g.pushFloatingText(g.player.x, g.player.y, isZh ? '借過' : 'EXCUSE ME', '#00ff88');
          g.pushMessage(
            isZh ? '【借過】特工與 NPC 交換了位置。' : '[EXCUSE ME] Operative and NPC swapped positions.',
            'info'
          );
          g.handlePlayerStep();
          g.checkItemPickup();
          g.tick();
          g.render();
          return;
        } else {
          ctx.lastDialogueNpcId = targetNPC.id;
          soundFX.terminal();
          g.updateNPCDialogues();
          const diffX = g.player.x - targetNPC.x;
          const diffY = g.player.y - targetNPC.y;
          if (Math.abs(diffX) > Math.abs(diffY)) {
            targetNPC.facing = diffX > 0 ? 'right' : 'left';
          } else {
            targetNPC.facing = diffY > 0 ? 'down' : 'up';
          }
          g.activeDialogue = { npc: targetNPC, textIndex: 0 };
          g.checkSideQuestDiscovery(targetNPC.id);
          g.render();
          return;
        }
      } else {
        const isZh = g.language === 'zh';
        g.pushMessage(
          isZh
            ? `請先按 [F] 收槍再與 ${targetNPC.nameZh || targetNPC.name} 交談。`
            : 'Holster weapon [F] to speak with ' + targetNPC.name + '.',
          'warning'
        );
        g.render();
        return;
      }
    }

    // 2. Check if weapon is drawn and firing toward targets
    if (g.player.isWeaponDrawn) {
      let hitRobot: Robot | null = null;
      let hitCanister: Hazard | null = null;
      let hitBlock: PushableBlock | null = null;
      const maxRange = g.player.equippedWeapon?.range ?? 5;
      for (let range = 1; range <= maxRange; range++) {
        const tx = g.player.x + dx * range;
        const ty = g.player.y + dy * range;
        const tTile = getTile(g.map, { x: tx, y: ty });
        const tName = String(tTile).toUpperCase();
        if (tName === 'WALL' || tTile === 2) break;

        const foundBlock = g.pushableBlocks.find((b) => b.x === tx && b.y === ty);
        if (foundBlock) {
          hitBlock = foundBlock;
          break;
        }

        const found = g.robots.find((r) => r.isAlive && r.x === tx && r.y === ty);
        if (found) {
          hitRobot = found;
          break;
        }

        const foundCanister = g.hazards.find((h) => !h.exploded && h.x === tx && h.y === ty);
        if (foundCanister) {
          hitCanister = foundCanister;
          break;
        }
      }

      if (hitRobot || hitCanister || hitBlock) {
        g.fireEquippedWeapon({ dx, dy });
        return;
      }

      const tile = getTile(g.map, { x: nx, y: ny });
      if (tile && !isWalkable(tile)) {
        g.fireEquippedWeapon({ dx, dy });
        return;
      }
    }

    // 3. Check for pushable blocks
    const pushableBlock = g.pushableBlocks.find((b) => b.x === nx && b.y === ny);
    if (pushableBlock) {
      const bx = nx + dx;
      const by = ny + dy;
      const mapWidth = Number(g.map.width) || 0;
      const mapHeight = Number(g.map.height) || 0;
      const inBounds = bx >= 0 && bx < mapWidth && by >= 0 && by < mapHeight;
      const targetTile = inBounds ? getTile(g.map, { x: bx, y: by }) : undefined;
      const targetWalkable = targetTile !== undefined && isWalkable(targetTile);
      const blockingRobot = g.robots.find((r) => r.isAlive && r.x === bx && r.y === by);
      const blockingNPC = g.npcs.find((n) => n.isAlive !== false && n.x === bx && n.y === by);
      const blockingHazard = g.hazards.find((h) => !h.exploded && h.x === bx && h.y === by);
      const blockingBlock = g.pushableBlocks.find((b) => b !== pushableBlock && b.x === bx && b.y === by);

      let finalBx = bx;
      let finalBy = by;
      let allowPush = inBounds && targetWalkable && !blockingRobot && !blockingNPC && !blockingHazard && !blockingBlock;

      if (pushableBlock.id === 'crate-detention-grate' && dx === 0 && dy === -1 && !allowPush) {
        const altX = pushableBlock.x + 1;
        const altY = pushableBlock.y;
        const altInBounds = altX >= 0 && altX < mapWidth && altY >= 0 && altY < mapHeight;
        const altTile = altInBounds ? getTile(g.map, { x: altX, y: altY }) : undefined;
        const altWalkable = altTile !== undefined && isWalkable(altTile);
        const altBlockingRobot = g.robots.find((r) => r.isAlive && r.x === altX && r.y === altY);
        const altBlockingNPC = g.npcs.find((n) => n.isAlive !== false && n.x === altX && n.y === altY);
        const altBlockingBlock = g.pushableBlocks.find((b) => b !== pushableBlock && b.x === altX && b.y === altY);

        if (altInBounds && altWalkable && !altBlockingRobot && !altBlockingNPC && !altBlockingBlock) {
          finalBx = altX;
          finalBy = altY;
          allowPush = true;
        }
      }

      if (allowPush) {
        const oldX = pushableBlock.x;
        const oldY = pushableBlock.y;
        pushableBlock.x = finalBx;
        pushableBlock.y = finalBy;
        g.player.x = nx;
        g.player.y = ny;
        soundFX.door();
        g.pushFloatingText(g.player.x, g.player.y, 'HEAVY PUSH', '#ffea00');
        const isZh = g.language === 'zh';
        let pushMsg = '';
        if (pushableBlock.blockType === 'server_rack') {
          pushMsg = isZh ? '伺服器機櫃發出電流聲，緩緩滑開。' : 'The server rack hums with static as it slides open.';
        } else if (pushableBlock.blockType === 'crate') {
          pushMsg = isZh ? '沉重的貨櫃發出金屬摩擦聲，被推開了一格。' : 'The heavy crate grinds against the floor as you push it.';
        } else {
          pushMsg = isZh ? '機械轟鳴聲中，厚重的牆體緩緩滑動。' : 'With a mechanical rumble, the heavy wall panel slides open.';
        }
        g.pushMessage(pushMsg, 'info');

        if (
          pushableBlock.secretDoor &&
          !pushableBlock.revealed &&
          (pushableBlock.x !== oldX || pushableBlock.y !== oldY)
        ) {
          pushableBlock.revealed = true;
          const sd = pushableBlock.secretDoor;
          const mapData = g.map.tiles || g.map.grid;
          if (Array.isArray(mapData)) {
            const row = mapData[sd.y];
            if (Array.isArray(row)) {
              row[sd.x] = sd.revealedTile ?? 4;
            }
          }
          soundFX.victory();
          if (g.renderer && g.fx) {
            const tileSize = g.renderer.tileSize || 16;
            g.fx.spawnSparks(sd.x * tileSize + tileSize / 2, sd.y * tileSize + tileSize / 2, '#00ff88', 20);
            g.fx.triggerShake(6);
          }
          g.pushFloatingText(sd.x, sd.y, 'SECRET REVEALED!', '#00ff88');
          g.pushMessage(
            isZh
              ? '【發現暗門】移開' + (pushableBlock.nameZh || pushableBlock.name) + '後，顯現出一道隱密暗門！'
              : '[SECRET REVEALED] Pushed ' + pushableBlock.name + ' to reveal a hidden door!',
            'success'
          );
          g.gainExp(50, 'SECRET_DISCOVERY');
        }

        if (pushableBlock.secretSurprise && !pushableBlock.secretSurprise.claimed) {
          pushableBlock.secretSurprise.claimed = true;
          const surprise = pushableBlock.secretSurprise;
          if (surprise.type === 'credits') {
            const amt = surprise.amount || 0;
            g.player.credits += amt;
            g.pushFloatingText(g.player.x, g.player.y, `+${amt} CR`, '#ffea00');
            soundFX.pickup();
            g.pushMessage(
              (isZh ? surprise.messageZh : surprise.messageEn) ||
                (isZh ? '發現隱密物資！' : 'Discovered secret supplies!'),
              'success'
            );
            g.gainExp(35, 'SECRET_CACHE');
          } else if (surprise.type === 'energy') {
            const amt = surprise.amount || 0;
            g.player.energy = Math.min(g.player.maxEnergy, g.player.energy + amt);
            g.pushFloatingText(g.player.x, g.player.y, `+${amt} EN`, '#00f0ff');
            soundFX.pickup();
            g.pushMessage(
              (isZh ? surprise.messageZh : surprise.messageEn) ||
                (isZh ? '發現隱密物資！' : 'Discovered secret supplies!'),
              'success'
            );
            g.gainExp(35, 'SECRET_CACHE');
          } else if (surprise.type === 'item' && surprise.item) {
            g.groundItems.push({ ...surprise.item, x: oldX, y: oldY } as GroundItem);
            g.pushFloatingText(oldX, oldY, surprise.item.name, '#00f0ff');
            soundFX.pickup();
            g.pushMessage(
              isZh
                ? '【發現物資】移開障礙物後，發現了隱藏物資！'
                : '[SUPPLY FOUND] Uncovered hidden supplies behind the block!',
              'success'
            );
            g.gainExp(45, 'SECRET_CACHE');
          }
        }

        g.handlePlayerStep();
        g.checkItemPickup();
        g.tick();
        g.render();
        return;
      } else {
        soundFX.hit();
        g.pushMessage(
          g.language === 'zh'
            ? '此處牆體略有晃動，但後方受阻無法推動！'
            : 'This wall panel seems movable, but is blocked behind!',
          'warning'
        );
        g.render();
        return;
      }
    }

    // 4. Normal movement check against robots
    const adjacentRobot = g.robots.find(
      (r) => r.isAlive && Math.round(Number(r.x)) === nx && Math.round(Number(r.y)) === ny
    );
    if (adjacentRobot) {
      soundFX.hit();
      const isZh = g.language === 'zh';
      const rName = isZh ? adjacentRobot.nameZh || adjacentRobot.name : adjacentRobot.name;
      g.pushMessage(
        isZh
          ? `路徑受阻！前方有巡邏機器人 [${rName}]，請按 [F] 拔槍迎擊。`
          : `Path blocked by security robot [${adjacentRobot.name}]! Press F to draw weapon.`,
        'warning'
      );
      g.render();
      return;
    }

    // 5. Normal tile stepping
    const tile = getTile(g.map, { x: nx, y: ny });
    if (tile && isWalkable(tile)) {
      ctx.lastDialogueNpcId = null;
      g.player.x = nx;
      g.player.y = ny;
      soundFX.step();
      g.handlePlayerStep();

      g.checkItemPickup();

      const standingTile = getTile(g.map, { x: nx, y: ny });
      if (Number(standingTile) === 9 || String(standingTile).toUpperCase() === 'ELEVATOR') {
        const nextSec = getNextSectorId(g.map.id ?? '', nx, ny);
        g.switchSector(nextSec);
        g.render();
        return;
      }

      if (g.player.isDisguised) {
        if (g.player.energy > 0) {
          g.player.energy = Math.max(0, g.player.energy - 1);
        } else {
          g.player.isDisguised = false;
          soundFX.powerDown();
          g.pushMessage('Energy depleted! Holo-disguise collapsed!', 'danger');
        }
      }

      g.tick();
    } else if (tile === 3 || String(tile).toUpperCase() === 'DOOR_CLOSED') {
      if (toggleDoor(g.map, { x: nx, y: ny })) {
        soundFX.door();
        g.tick();
        g.lastAdjacentPassageKey = `door_open-${nx},${ny}-${g.player.x},${g.player.y}`;
        g.pushMessage(g.language === 'zh' ? '氣密隔離門已開啟。' : 'Airlock blast door cycled open.', 'info');
      } else {
        g.pushMessage(
          g.language === 'zh'
            ? '隔離門已被鎖定，請使用終端機解鎖。'
            : 'Blast door is locked. Use terminal to unlock.',
          'warning'
        );
        g.render();
      }
      return;
    } else if (tile === 5 || String(tile).toUpperCase() === 'FORCEFIELD') {
      const isZh = g.language === 'zh';
      const sectorId = g.map?.id || '';
      let msg = '';
      let floatText = '';
      if (sectorId === 'sector-2') {
        msg = isZh
          ? '⚡ 電漿力場阻擋！請前往北側機房終端機 [15, 05] 輸入 OVERRIDE 關閉力場。'
          : '⚡ PLASMA FORCEFIELD BLOCKING! Go to North Server Room Terminal [15, 05] and type OVERRIDE to disable.';
        floatText = isZh ? '⚡ 力場阻擋 ⚡' : '⚡ FORCEFIELD ⚡';
      } else if (sectorId === 'sector-1') {
        msg = isZh
          ? '⚡ 電漿力場阻擋！請前往檢查哨終端機 [26, 05] 輸入 OVERRIDE 關閉力場。'
          : '⚡ PLASMA FORCEFIELD BLOCKING! Go to Checkpoint Terminal [26, 05] and type OVERRIDE to disable.';
        floatText = isZh ? '⚡ 力場阻擋 ⚡' : '⚡ FORCEFIELD ⚡';
      } else {
        msg = isZh ? '⚡ 電漿力場阻擋！' : '⚡ PLASMA FORCEFIELD BLOCKING!';
        floatText = isZh ? '⚡ 力場 ⚡' : '⚡ FORCEFIELD ⚡';
      }
      g.pushMessage(msg, 'warning');
      g.pushFloatingText(nx, ny, floatText, '#ff2a4b');
      g.render();
      return;
    } else {
      g.pushMessage('Path blocked.', 'warning');
      g.render();
      return;
    }
  }
}
