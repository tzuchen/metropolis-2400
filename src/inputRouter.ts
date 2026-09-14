import type { GameEngine } from './game';
import { handleSpecialInput } from './inputHandler';
import {
  handleEnvironmentalInteraction,
  handleNPCOrTerminalInteraction,
  handleItemPickup,
  type InteractionSystemHost,
} from './interactionSystem';
import {
  createBreachSession,
  moveBreachCursor,
  selectBreachCell,
  type BreachSession,
} from './breachProtocol';
import { disableForcefield } from './map';
import {
  createPlayer,
  createRobot,
  toggleWeaponDraw,
  toggleDisguise,
  installAugment,
  cycleWeapon,
} from './entities';
import { soundFX } from './audio';
import { bgm } from './music';
import { TerminalSession } from './terminal';
import {
  createSectorRobots,
  createSectorNPCs,
  createSector2NPCs,
  createSectorStoryLogs,
  createSectorItems,
  createSector2Items,
  createSectorObjectives,
  createSectorHazards,
  createSectorPushableBlocks,
} from './worldBuilder';
import { advanceDialogue } from './dialogueSystem';
import {
  executeDetentionRelocation,
  startDefeatCutscene,
  updateDefeatCutscene,
} from './defeatCutscene';
import {
  triggerCitadelHorde as _triggerCitadelHorde,
  updateCitadelHorde as _updateCitadelHorde,
} from './citadelHorde';
import { setupSubSectorZero, getNextSectorId } from './sewerMap';
import { setupCitadel, buildCitadelMap } from './citadelMap';
import { FXManager } from './fx';
import { updateNPC } from './npcAI';
import { updateNPCDialogues as _updateNPCDialogues } from './npcDialogueManager';
import { fireEquippedWeapon as _fireEquippedWeapon } from './combat';
import { handleTerminalInput as _handleTerminalInput } from './terminalRunner';
import { processConveyors as _processConveyors, detonateCanister as _detonateCanister } from './hazardSystem';
import { buildSector1Map, buildSector2Map, calculateFOV, getTile, isWalkable, toggleDoor } from './map';
import { hasSavedGame, saveGameState, loadGameState } from './saveLoad';
import { createBossExterminator, isBossRobot, applyBossDamage } from './boss';
import { getSector1NPCs, getSector2NPCs, getSectorStoryLogs } from './dialogues';
import type {
  SectorMap,
  Player,
  Item,
  Robot,
  SecurityLevel,
  GameMessage,
  Position,
  RobotType,
  NPC,
  DialogueSession,
  GroundItem,
  MissionObjective,
  StoryLog,
  Hazard,
  Language,
  LaserBeam,
  PushableBlock,
  TerminalData,
} from './types';

export class InputRouter {
  private game: GameEngine;

  constructor(game: GameEngine) {
    this.game = game;
  }

  handleKeyDown(key: string): void {
    const g = this.game;

    // 1. Defeat Cutscene
    if (g.defeatCutscene) {
      if (key === 'Escape' || key === 'Esc' || key === ' ' || key === 'Space' || key === 'Enter') {
        g.executeDetentionRelocation(true);
        g.defeatCutscene = null;
        g.render();
        return;
      }
      return;
    }

    // 2. Breach Protocol Session
    if (g.activeBreachSession) {
      if (key === 'Escape' || key === 'Esc') {
        g.activeBreachSession = null;
        soundFX.terminal();
        g.render();
      }
      return;
    }

    // 3. Terminal Input Mode
    if (g.activeTerminal) {
      this.handleTerminalInput(key);
      return;
    }

    // 4. Resolution / Waypoint
    if (g.isBigMapOpen && key === '0' && !g.activeTerminal) {
      g.activeWaypoint = null;
      soundFX.terminal();
      g.render();
      return;
    }
    if ((key === '0' || key === 'F10') && !g.activeTerminal) {
      g.cycleResolution();
      return;
    }

    // 5. Title Screen
    if (g.isTitleScreen) {
      // 5.1 Title Story Modal
      if (g.isTitleStoryOpen) {
        if (key === 'Escape' || key === 'Esc' || key === 'Enter' || key === ' ' || key === 'Space') {
          g.isTitleStoryOpen = false;
          g.titleStoryScrollOffset = 0;
          soundFX.terminal();
          g.render();
          return;
        }
        if (key === 'ArrowDown' || key === 's' || key === 'S' || key === 'j' || key === 'J') {
          g.titleStoryScrollOffset = (g.titleStoryScrollOffset || 0) + 40;
          soundFX.terminal();
          g.render();
          return;
        }
        if (key === 'ArrowUp' || key === 'w' || key === 'W' || key === 'k' || key === 'K') {
          g.titleStoryScrollOffset = Math.max(0, (g.titleStoryScrollOffset || 0) - 40);
          soundFX.terminal();
          g.render();
          return;
        }
        if (key === 'PageDown') {
          g.titleStoryScrollOffset = (g.titleStoryScrollOffset || 0) + 200;
          soundFX.terminal();
          g.render();
          return;
        }
        if (key === 'PageUp') {
          g.titleStoryScrollOffset = Math.max(0, (g.titleStoryScrollOffset || 0) - 200);
          soundFX.terminal();
          g.render();
          return;
        }
        if (key === 'Home') {
          g.titleStoryScrollOffset = 0;
          soundFX.terminal();
          g.render();
          return;
        }
        if (key === 'z' || key === 'Z') {
          g.toggleLanguage();
          return;
        }
        // Consume all other keys
        return;
      }

      if (key === 'ArrowUp' || key === 'w' || key === 'W') {
        g.titleMenuIndex = (g.titleMenuIndex - 1 + 7) % 7;
        g.render();
        soundFX.terminal();
        return;
      }
      if (key === 'ArrowDown' || key === 's' || key === 'S') {
        g.titleMenuIndex = (g.titleMenuIndex + 1) % 7;
        g.render();
        soundFX.terminal();
        return;
      }
      if (key === 'Enter' || key === ' ' || key === 'Space') {
        this.executeTitleMenuItem(g.titleMenuIndex);
        return;
      }
      if (key === 'n' || key === 'N') {
        g.isTitleScreen = false;
        soundFX.pickup();
        const msg = g.language === 'zh' ? '任務啟動！' : 'MISSION START!';
        g.pushFloatingText(g.player.x, g.player.y, msg, '#00ffcc');
        g.render();
        return;
      }
      if (key === 'l' || key === 'L') {
        if (g.loadGame()) {
          g.isTitleScreen = false;
        }
        return;
      }
      if (key === 'z' || key === 'Z') {
        g.toggleLanguage();
        return;
      }
      if (key === 'h' || key === 'H') {
        g.isManualOpen = !g.isManualOpen;
        soundFX.terminal();
        g.render();
        return;
      }
      if (key === 'b' || key === 'B') {
        const on = bgm.toggle();
        const msg = on
          ? (g.language === 'zh' ? '合成器音樂：已開啟' : 'SYNTH BGM: ONLINE')
          : (g.language === 'zh' ? '合成器音樂：已靜音' : 'SYNTH BGM: MUTED');
        g.pushFloatingText(g.player.x, g.player.y, msg, on ? '#00ffaa' : '#888888');
        g.pushMessage(msg, 'info');
        g.render();
        return;
      }
      if (key === 'p' || key === 'P') {
        g.openJournal();
        soundFX.terminal();
        return;
      }
      if (key === '0' || key === 'F10') {
        g.cycleResolution();
        return;
      }
      return;
    }

    // 6. Special Input (Manual, BGM, OmniVision, FullMap)
    if (handleSpecialInput(g, key)) return;

    // 7. Big Map
    if (g.isBigMapOpen) {
      if (key === 'Escape' || key === 'Esc' || key === 'Tab' || key === 'tab' || key === ' ' || key === 'Space' || key === 'Enter' || key === 'k' || key === 'K') {
        g.isBigMapOpen = false;
        soundFX.terminal();
        g.render();
        return;
      }
      if (key === 'x' || key === 'X') {
        g.toggleFullMap();
        return;
      }
      if (key === 'v' || key === 'V') {
        g.toggleOmniVision();
        return;
      }
      if (key === 's' || key === 'S') {
        const sectors = ['current', 'sector-1', 'sector-2', 'sub-sector-0', 'sector-citadel', 'all'];
        const idx = sectors.indexOf(g.bigMapSelectedSector);
        g.bigMapSelectedSector = sectors[(idx + 1) % sectors.length];
        soundFX.terminal();
        g.render();
        return;
      }
      if (key === 'g' || key === 'G') {
        g.bigMapSelectedSector = g.bigMapSelectedSector === 'all' ? 'current' : 'all';
        soundFX.terminal();
        g.render();
        return;
      }
      if (key >= '1' && key <= '5') {
        const waypoints: Record<string, { x: number; y: number; name: string; color: string }> = {
          '1': { x: 4, y: 24, name: 'Rebel Safehouse', color: '#00ff88' },
          '2': { x: 20, y: 12, name: 'Cyber Park', color: '#00f0ff' },
          '3': { x: 12, y: 22, name: 'Neon Market', color: '#ff7700' },
          '4': { x: 28, y: 14, name: 'Checkpoint', color: '#ff2a4b' },
          '5': { x: 36, y: 26, name: 'Elevator', color: '#ffea00' },
        };
        g.activeWaypoint = waypoints[key];
        soundFX.pickup();
        g.render();
        return;
      }
      if (key === '0') {
        g.activeWaypoint = null;
        soundFX.terminal();
        g.render();
        return;
      }
      return;
    }

    // 8. Victory State
    if (g.victory) {
      if (key === 'Enter') {
        g.returnToTitleScreen();
        return;
      }
      return;
    }

    // 9. Game Over / Victory Restart
    if (key === 'r' || key === 'R') {
      if (!g.player.isAlive || g.victory) {
        g.restartGame();
        return;
      }
    }

    if (!g.player.isAlive) {
      return;
    }

    // 9. Story Log Reader Mode
    if (g.activeStoryLog) {
      if (key === 'Escape' || key === 'Esc' || key === 'Enter' || key === ' ' || key === 'Space') {
        g.activeStoryLog = null;
        soundFX.terminal();
        g.render();
        return;
      }
      if (key === 'z' || key === 'Z') {
        g.toggleLanguage();
        return;
      }
      return;
    }

    // 10. Story Archive Modal Mode
    if (g.isStoryArchiveOpen) {
      if (key === 'Escape' || key === 'Esc' || key === 'l' || key === 'L') {
        g.isStoryArchiveOpen = false;
        soundFX.terminal();
        g.render();
        return;
      }
      if (key === 'z' || key === 'Z') {
        g.toggleLanguage();
        return;
      }
      let cleanKey = key.replace(/^(Digit|Numpad)/, '');
      const num = parseInt(cleanKey, 10);
      if (!isNaN(num) && num >= 1 && num <= g.storyLogs.length) {
        g.storyArchiveSelectedIndex = num - 1;
        g.openStoryLog(g.storyLogs[num - 1]);
        return;
      }
      if (['ArrowUp', 'w', 'W'].includes(key)) {
        g.storyArchiveSelectedIndex = (g.storyArchiveSelectedIndex - 1 + g.storyLogs.length) % g.storyLogs.length;
        soundFX.terminal();
        g.render();
        return;
      }
      if (['ArrowDown', 's', 'S'].includes(key)) {
        g.storyArchiveSelectedIndex = (g.storyArchiveSelectedIndex + 1) % g.storyLogs.length;
        soundFX.terminal();
        g.render();
        return;
      }
      if (['Enter', ' ', 'Space'].includes(key)) {
        const log = g.storyLogs[g.storyArchiveSelectedIndex];
        if (log) {
          g.openStoryLog(log);
          return;
        }
      }
      return;
    }

    // 11. Journal Modal Mode
    if (g.isJournalOpen) {
      if (g.journalMode === 'compose') {
        if (key === 'Enter') {
          g.submitJournalEntry();
          return;
        }
        if (key === 'Escape' || key === 'Esc') {
          g.journalMode = 'view';
          g.journalInputBuffer = '';
          g.render();
          return;
        }
        if (key === 'Backspace') {
          g.journalInputBuffer = g.journalInputBuffer.slice(0, -1);
          g.render();
          return;
        }
        if (key.length === 1) {
          g.journalInputBuffer += key;
          g.render();
          return;
        }
        return;
      }

      // view mode
      if (key === 'Escape' || key === 'Esc' || key === 'p' || key === 'P') {
        g.closeJournal();
        return;
      }
      if (key === 'z' || key === 'Z') {
        g.toggleLanguage();
        return;
      }
      const totalItems = (g.journalEntries?.length || 0) + 1;
      if (['ArrowUp', 'w', 'W', 'k', 'K'].includes(key)) {
        g.journalSelectedIndex = (g.journalSelectedIndex - 1 + totalItems) % totalItems;
        g.render();
        return;
      }
      if (['ArrowDown', 's', 'S', 'j', 'J'].includes(key)) {
        g.journalSelectedIndex = (g.journalSelectedIndex + 1) % totalItems;
        g.render();
        return;
      }
      if (key === 'n' || key === 'N') {
        g.journalMode = 'compose';
        g.journalInputBuffer = '';
        g.render();
        return;
      }
      if (key === 'Enter' || key === ' ' || key === 'Space') {
        if (g.journalSelectedIndex === 0) {
          g.journalMode = 'compose';
          g.render();
          return;
        }
        return;
      }
      if (key === 'Delete' || key === 'd' || key === 'D') {
        if (g.journalSelectedIndex > 0) {
          g.deleteSelectedJournalEntry();
        }
        return;
      }
      return;
    }

    // 12. Augment Shop Modal Mode
    if (g.isAugmentShopOpen) {
      if (key === 'Escape' || key === 'Esc' || key === 'u' || key === 'U') {
        g.isAugmentShopOpen = false;
        soundFX.terminal();
        g.render();
        return;
      }
      if (key === '1') { g.buyAugment('DERMAL_ARMOR'); return; }
      if (key === '2') { g.buyAugment('OPTIC_HUD'); return; }
      if (key === '3') { g.buyAugment('REFLEX_BOOSTER'); return; }
      if (key === '4') { g.buyAugment('POWER_CORE'); return; }
      if (key === '5') { g.buyConsumableItem('MEDKIT', 40); return; }
      if (key === '6') { g.buyConsumableItem('BATTERY', 35); return; }
      if (key === '7') { g.buyConsumableItem('EMP_GRENADE', 70); return; }
      if (key === '8') { g.buyWeaponOverclock(150); return; }
      if (key === '9') { g.bribeSecurityNetwork(100); return; }
      return;
    }

    // 12. Inventory Modal Mode
    if (g.isInventoryOpen) {
      if (key === 'Escape' || key === 'Esc' || key === 'i' || key === 'I') {
        g.isInventoryOpen = false;
        soundFX.terminal();
        g.render();
        return;
      }
      if (key === '1') {
        g.useMedkit();
        return;
      }
      if (key === '2') {
        g.useBattery();
        return;
      }
      if (key === '3') {
        g.useEMPGrenade();
        return;
      }
      if (key === 'q' || key === 'Q') {
        const weapon = cycleWeapon(g.player);
        soundFX.terminal();
        const isSup = weapon.isSuppressed;
        const isZh = g.language === 'zh';
        const wName = isZh ? (weapon.nameZh || weapon.name) : weapon.name;
        g.pushFloatingText(g.player.x, g.player.y, wName, isSup ? '#00ff88' : '#00f0ff');
        g.pushMessage(
          isZh
            ? '【武器切換】已裝備 [' + wName + ']（威力: ' + weapon.power + ' DMG，耗能: ' + weapon.energyCost + ' EN' + (isSup ? ' | 靜音消音' : '') + '）。'
            : 'ARMAMENT SWITCH: Equipped [' + weapon.name + '] (' + weapon.power + ' DMG, ' + weapon.energyCost + ' EN' + (isSup ? ' | SUPPRESSED' : '') + ').'
        , 'info');
        g.render();
        return;
      }
      if (key === 'f' || key === 'F') {
        const wasDisguised = g.player.isDisguised;
        const drawn = toggleWeaponDraw(g.player);
        soundFX.laser();
        g.pushMessage(
          drawn ? 'Blaster drawn! Security will treat operative as hostile.' : 'Blaster holstered.',
          drawn ? 'warning' : 'info'
        );
        if (drawn && wasDisguised && !g.player.isDisguised) {
          g.pushMessage(
            g.language === 'zh'
              ? '拔槍動作使全息偽裝崩解！'
              : 'Drawing your weapon collapsed the holo-disguise!',
            'warning'
          );
        }
        g.render();
        return;
      }
      return;
    }

    // 13. Mission Log Modal Mode
    if (g.isMissionLogOpen) {
      if (key === 'Escape' || key === 'Esc' || key === 'm' || key === 'M') {
        g.isMissionLogOpen = false;
        soundFX.terminal();
        g.render();
        return;
      }
      return;
    }

    // 14. Dialogue Session
    if (g.activeDialogue) {
      if (key === 'Escape' || key === 'Esc') {
        g.activeDialogue = null;
        soundFX.terminal();
        g.render();
        return;
      }

      if (key === ' ' || key === 'Enter' || key === 'Space') {
        advanceDialogue(g);
        return;
      }

      return;
    }

    // 15. Normal Gameplay
    let dx = 0;
    let dy = 0;

    if (key === 'ArrowUp' || key === 'w' || key === 'W') {
      dy = -1;
      g.player.facing = 'up';
    } else if (key === 'ArrowDown' || key === 's' || key === 'S') {
      dy = 1;
      g.player.facing = 'down';
    } else if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
      dx = -1;
      g.player.facing = 'left';
    } else if (key === 'ArrowRight' || key === 'd' || key === 'D') {
      dx = 1;
      g.player.facing = 'right';
    } else if (key === 'f' || key === 'F') {
      const wasDisguised = g.player.isDisguised;
      const drawn = toggleWeaponDraw(g.player);
      soundFX.laser();
      if (drawn) {
        g.pushMessage(
          g.language === 'zh'
            ? '已拔槍！按 [空白鍵] 或 [方向鍵] 開火，[Q] 切換武器。'
            : 'Blaster drawn! Press [SPACE] or [ARROWS] to fire, [Q] to switch weapon.',
          'warning'
        );
        if (wasDisguised && !g.player.isDisguised) {
          g.pushMessage(
            g.language === 'zh'
              ? '拔槍動作使全息偽裝崩解！'
              : 'Drawing your weapon collapsed the holo-disguise!',
            'warning'
          );
        }
      } else {
        g.pushMessage(
          g.language === 'zh' ? '已收槍。' : 'Blaster holstered.',
          'info'
        );
      }
      g.tick();
      return;
    } else if (key === 'q' || key === 'Q') {
      const weapon = cycleWeapon(g.player);
      soundFX.terminal();
      const isSup = weapon.isSuppressed;
      const isZh = g.language === 'zh';
      const wName = isZh ? (weapon.nameZh || weapon.name) : weapon.name;
      g.pushFloatingText(g.player.x, g.player.y, wName, isSup ? '#00ff88' : '#00f0ff');
      g.pushMessage(
        isZh
          ? '【武器切換】已裝備 [' + wName + ']（威力: ' + weapon.power + ' DMG，耗能: ' + weapon.energyCost + ' EN' + (isSup ? ' | 靜音消音' : '') + '）。'
          : 'ARMAMENT SWITCH: Equipped [' + weapon.name + '] (' + weapon.power + ' DMG, ' + weapon.energyCost + ' EN' + (isSup ? ' | SUPPRESSED' : '') + ').'
      , 'info');
      g.render();
      return;
    } else if (key === 'c' || key === 'C') {
      const active = toggleDisguise(g.player);
      if (active) {
        soundFX.pickup();
        g.pushMessage('Holo-disguise activated.', 'info');
      } else {
        soundFX.powerDown();
        g.pushMessage('Holo-disguise deactivated.', 'info');
      }
      g.tick();
      return;
    } else if (key === 'e' || key === 'E') {
      // Route to InteractionSystem
      const host = this.buildInteractionHost();
      handleEnvironmentalInteraction(host);
      return;
    } else if (key === 't' || key === 'T') {
      // Route to InteractionSystem
      const host = this.buildInteractionHost();
      handleNPCOrTerminalInteraction(host);
      return;
    } else if (key === 'i' || key === 'I') {
      g.isInventoryOpen = true;
      soundFX.terminal();
      g.render();
      return;
    } else if (key === 'Tab' || key === 'tab' || key === 'k' || key === 'K') {
      g.isBigMapOpen = true;
      soundFX.terminal();
      g.render();
      return;
    } else if (key === 'm' || key === 'M') {
      g.isMissionLogOpen = true;
      soundFX.terminal();
      g.render();
      return;
    } else if (key === 'l' || key === 'L') {
      g.isStoryArchiveOpen = true;
      soundFX.terminal();
      g.render();
      return;
    } else if (key === 'u' || key === 'U') {
      g.isAugmentShopOpen = true;
      soundFX.terminal();
      g.render();
      return;
    } else if (key === 'z' || key === 'Z') {
      g.toggleLanguage();
      return;
    } else if (key === '8' || key === 'F5') {
      g.saveGame();
      return;
    } else if (key === '9' || key === 'F9') {
      g.loadGame();
      return;
    } else if (key === '1') {
      g.useMedkit();
      return;
    } else if (key === '2') {
      g.useBattery();
      return;
    } else if (key === '3') {
      g.useEMPGrenade();
      return;
    } else if (key === 'g' || key === 'G') {
      // Route to InteractionSystem
      const host = this.buildInteractionHost();
      handleItemPickup(host);
      g.render();
      return;
    } else if (key === 'j' || key === 'J') {
      g.performTacticalDash();
      return;
    } else if (key === 'p' || key === 'P') {
      g.openJournal();
      soundFX.terminal();
      return;
    } else if (key === ' ' || key === 'Enter' || key === '.') {
      if (g.player.isWeaponDrawn) {
        g.fireEquippedWeapon();
        return;
      }
      g.tick();
      return;
    }

    if (dx !== 0 || dy !== 0) {
      this.handleMovement(g, dx, dy);
    }
  }

  private handleMovement(g: GameEngine, dx: number, dy: number): void {
    const nx = g.player.x + dx;
    const ny = g.player.y + dy;

    // Check if walking toward NPC for dialogue
    const targetNPC = g.npcs.find((n) => n.isAlive && n.x === nx && n.y === ny);
    if (targetNPC) {
      if (!g.player.isWeaponDrawn) {
        soundFX.terminal();
        g.updateNPCDialogues();
        const dx = g.player.x - targetNPC.x;
        const dy = g.player.y - targetNPC.y;
        if (Math.abs(dx) > Math.abs(dy)) {
          targetNPC.facing = dx > 0 ? 'right' : 'left';
        } else {
          targetNPC.facing = dy > 0 ? 'down' : 'up';
        }
        g.activeDialogue = { npc: targetNPC, textIndex: 0 };
        g.checkSideQuestDiscovery(targetNPC.id);
        g.render();
        return;
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

    // Check if weapon is drawn and firing
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

    // Check for pushable blocks
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
      const blockingNPC = g.npcs.find((n) => n.isAlive && n.x === bx && n.y === by);
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
        const altBlockingNPC = g.npcs.find((n) => n.isAlive && n.x === altX && n.y === altY);
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

        if (pushableBlock.secretDoor && !pushableBlock.revealed && (pushableBlock.x !== oldX || pushableBlock.y !== oldY)) {
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
          const tileSize = g.renderer.tileSize;
          g.fx.spawnSparks(sd.x * tileSize + tileSize / 2, sd.y * tileSize + tileSize / 2, '#00ff88', 20);
          g.fx.triggerShake(6);
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
            g.pushMessage((isZh ? surprise.messageZh : surprise.messageEn) || (isZh ? '發現隱密物資！' : 'Discovered secret supplies!'), 'success');
            g.gainExp(35, 'SECRET_CACHE');
          } else if (surprise.type === 'energy') {
            const amt = surprise.amount || 0;
            g.player.energy = Math.min(g.player.maxEnergy, g.player.energy + amt);
            g.pushFloatingText(g.player.x, g.player.y, `+${amt} EN`, '#00f0ff');
            soundFX.pickup();
            g.pushMessage((isZh ? surprise.messageZh : surprise.messageEn) || (isZh ? '發現隱密物資！' : 'Discovered secret supplies!'), 'success');
            g.gainExp(35, 'SECRET_CACHE');
          } else if (surprise.type === 'item' && surprise.item) {
            g.groundItems.push({ ...surprise.item, x: oldX, y: oldY } as GroundItem);
            g.pushFloatingText(oldX, oldY, surprise.item.name, '#00f0ff');
            soundFX.pickup();
            g.pushMessage(isZh ? '【發現物資】移開障礙物後，發現了隱藏物資！' : '[SUPPLY FOUND] Uncovered hidden supplies behind the block!', 'success');
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
        g.pushMessage(g.language === 'zh' ? '此處牆體略有晃動，但後方受阻無法推動！' : 'This wall panel seems movable, but is blocked behind!', 'warning');
        g.render();
        return;
      }
    }

    // Normal movement
    const adjacentRobot = g.robots.find((r) => r.isAlive && Math.round(Number(r.x)) === nx && Math.round(Number(r.y)) === ny);
    if (adjacentRobot) {
      soundFX.hit();
      const isZh = g.language === 'zh';
      const rName = isZh ? (adjacentRobot.nameZh || adjacentRobot.name) : adjacentRobot.name;
      g.pushMessage(
        isZh
          ? `路徑受阻！前方有巡邏機器人 [${rName}]，請按 [F] 拔槍迎擊。`
          : `Path blocked by security robot [${adjacentRobot.name}]! Press F to draw weapon.`,
        'warning'
      );
      g.render();
      return;
    }

    const tile = getTile(g.map, { x: nx, y: ny });
    if (tile && isWalkable(tile)) {
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
        g.pushMessage('Airlock blast door cycled open.', 'info');
        g.tick();
      } else {
        g.pushMessage('Blast door is locked. Use terminal to unlock.', 'warning');
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

  private handleTerminalInput(key: string): void {
    _handleTerminalInput(this.game, key);
  }

  private executeTitleMenuItem(index: number): void {
    const g = this.game;
    switch (index) {
      case 0:
        g.isTitleScreen = false;
        soundFX.pickup();
        const msg = g.language === 'zh' ? '任務啟動！' : 'MISSION START!';
        g.pushFloatingText(g.player.x, g.player.y, msg, '#00ffcc');
        g.render();
        break;
      case 1:
        if (g.hasSaveGame()) {
          if (g.loadGame()) {
            g.isTitleScreen = false;
          }
        } else {
          soundFX.hit();
          g.pushMessage(g.language === 'zh' ? '未發現存檔！' : 'NO SAVE FOUND!', 'warning');
          g.render();
        }
        break;
      case 2:
        g.toggleLanguage();
        break;
      case 3:
        g.isManualOpen = !g.isManualOpen;
        if (g.isManualOpen) {
          g.isTitleStoryOpen = false;
        }
        soundFX.terminal();
        g.render();
        break;
      case 4:
        g.isTitleStoryOpen = true;
        g.isManualOpen = false;
        g.titleStoryScrollOffset = 0;
        soundFX.terminal();
        g.render();
        break;
      case 5:
        break;
      case 6:
        g.cycleResolution();
        break;
    }
  }

  private buildInteractionHost(): InteractionSystemHost {
    const g = this.game;
    const host: InteractionSystemHost = {
      map: g.map,
      player: g.player,
      robots: g.robots,
      npcs: g.npcs,
      groundItems: g.groundItems,
      pushableBlocks: g.pushableBlocks,
      activeTerminal: g.activeTerminal,
      activeDialogue: g.activeDialogue,
      terminalInputBuffer: g.terminalInputBuffer,
      language: g.language,
      renderer: g.renderer,
      fx: g.fx,
      pushMessage: (text: string, type: GameMessage['type']) => g.pushMessage(text, type),
      pushFloatingText: (x: number, y: number, text: string, color: string) => g.pushFloatingText(x, y, text, color),
      gainExp: (amount: number, reason?: string) => g.gainExp(amount, reason),
      tick: () => g.tick(),
      render: () => g.render(),
      checkItemPickup: () => g.checkItemPickup(),
      updateNPCDialogues: () => g.updateNPCDialogues(),
      checkSideQuestDiscovery: (npcId: string) => g.checkSideQuestDiscovery(npcId),
      performCheckIn: () => g.performCheckIn(),
      recoverConfiscatedGear: () => g.recoverConfiscatedGear(),
      resetDetentionCell: () => g.resetDetentionCell(),
      openStoryLog: (selected: StoryLog) => g.openStoryLog(selected),
      storyLogs: g.storyLogs,
      missionObjectives: g.missionObjectives,
      createTerminalSession: (terminal: TerminalData) => new TerminalSession(terminal),
    };

    Object.defineProperty(host, 'activeTerminal', {
      get: () => g.activeTerminal,
      set: (val: TerminalSession | null) => { g.activeTerminal = val; },
      enumerable: true,
      configurable: true,
    });

    Object.defineProperty(host, 'terminalInputBuffer', {
      get: () => g.terminalInputBuffer,
      set: (val: string) => { g.terminalInputBuffer = val; },
      enumerable: true,
      configurable: true,
    });

    return host;
  }
}

export default InputRouter;
