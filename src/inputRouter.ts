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
import { PlayerMovementController, MovementContext } from './playerMovement';

export class InputRouter {
  private game: GameEngine;
  private lastDialogueNpcId: string | null = null;

  constructor(game: GameEngine) {
    this.game = game;
  }

  handleKeyDown(key: string): void {
    const g = this.game;

    // 0. Intro Briefing
    if (g.isIntroBriefingOpen && !g.isTitleScreen) {
      if (key === 'Escape' || key === 'Esc' || key === 'Enter' || key === ' ' || key === 'Space') {
        g.isIntroBriefingOpen = false;
        g.introBriefingScrollOffset = 0;
        soundFX.pickup();
        const msg = g.language === 'zh' ? '任務啟動！' : 'MISSION START!';
        g.pushFloatingText(g.player.x, g.player.y, msg, '#00ffcc');
        g.pushMessage(g.language === 'zh' ? '【任務簡報完畢】特工日記已就緒，隨時按 [P] 開啟。' : '[BRIEFING COMPLETE] Operative journal ready. Press [P] anytime.', 'info');
        g.render();
        return;
      }
      if (['ArrowDown', 's', 'S', 'j', 'J'].includes(key)) {
        g.introBriefingScrollOffset = (g.introBriefingScrollOffset || 0) + 36;
        g.render();
        return;
      }
      if (['ArrowUp', 'w', 'W', 'k', 'K'].includes(key)) {
        g.introBriefingScrollOffset = Math.max(0, (g.introBriefingScrollOffset || 0) - 36);
        g.render();
        return;
      }
      if (key === 'PageDown') {
        g.introBriefingScrollOffset = (g.introBriefingScrollOffset || 0) + 144;
        g.render();
        return;
      }
      if (key === 'PageUp') {
        g.introBriefingScrollOffset = Math.max(0, (g.introBriefingScrollOffset || 0) - 144);
        g.render();
        return;
      }
      if (key === 'Home') {
        g.introBriefingScrollOffset = 0;
        g.render();
        return;
      }
      if (key === 'z' || key === 'Z') {
        g.toggleLanguage();
        return;
      }
      // 若玩家按其他遊戲按鍵（如移動、存檔 [8]、開日記 [P] 等），自動關閉簡報並繼續向下處理該按鍵
      g.isIntroBriefingOpen = false;
      g.introBriefingScrollOffset = 0;
    }

    // 1. Defeat Cutscene
    if (g.defeatCutscene) {
      if (key === 'Escape' || key === 'Esc' || key === ' ' || key === 'Space' || key === 'Enter') {
        g.executeDetentionRelocation(true);
        g.defeatCutscene = null;
        g.renderer.defeatCutscene = null;
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

    // 11. Journal Modal Mode
    if (g.isJournalOpen) {
      if (g.journalMode === 'compose') {
        if (key === 'Escape' || key === 'Esc') {
          g.journalMode = 'view';
          g.journalInputBuffer = '';
          g.journalTitleInputBuffer = '';
          g.journalComposeField = 'title';
          g.render();
          return;
        }

        if (g.journalComposeField === 'title') {
          if (key === 'Tab' || key === 'Enter' || key === 'ArrowDown') {
            g.journalComposeField = 'content';
            g.render();
            return;
          }
          if (key === 'ArrowUp') {
            g.journalComposeField = 'content';
            g.render();
            return;
          }
          if (key === 'Backspace') {
            g.journalTitleInputBuffer = g.journalTitleInputBuffer.slice(0, -1);
            g.render();
            return;
          }
          if (key === ' ' || key === 'Space') {
            g.journalTitleInputBuffer += ' ';
            g.render();
            return;
          }
          
          // Exclude non-text control keys
          const controlKeys = [
            'Shift', 'Control', 'Alt', 'Meta', 'CapsLock',
            'ArrowUp', 'ArrowLeft', 'ArrowRight',
            'PageUp', 'PageDown', 'Home', 'End',
            'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
            'Process', 'Unidentified'
          ];
          if (controlKeys.includes(key)) {
            return;
          }

          // Append any other key (single char, CJK, digits, punctuation, etc.)
          g.journalTitleInputBuffer += key;
          g.render();
          return;
        } else {
          // content field
          if (key === 'Enter') {
            g.submitJournalEntry();
            return;
          }
          if (key === 'Tab' || key === 'ArrowUp') {
            g.journalComposeField = 'title';
            g.render();
            return;
          }
          if (key === 'Backspace') {
            g.journalInputBuffer = g.journalInputBuffer.slice(0, -1);
            g.render();
            return;
          }
          if (key === ' ' || key === 'Space') {
            g.journalInputBuffer += ' ';
            g.render();
            return;
          }
          
          // Exclude non-text control keys
          const controlKeys = [
            'Shift', 'Control', 'Alt', 'Meta', 'CapsLock',
            'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
            'PageUp', 'PageDown', 'Home', 'End',
            'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
            'Process', 'Unidentified'
          ];
          if (controlKeys.includes(key)) {
            return;
          }

          // Append any other key (single char, CJK, digits, punctuation, etc.)
          g.journalInputBuffer += key;
          g.render();
          return;
        }
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
        g.journalTitleInputBuffer = '';
        g.journalComposeField = 'title';
        g.render();
        return;
      }
      if (key === 'Enter' || key === ' ' || key === 'Space') {
        if (g.journalSelectedIndex === 0) {
          g.journalMode = 'compose';
          g.journalInputBuffer = '';
          g.journalTitleInputBuffer = '';
          g.journalComposeField = 'title';
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
      if (key === 'c' || key === 'C') {
        g.clearAllJournalEntries();
        return;
      }
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
        g.isIntroBriefingOpen = true;
        g.introBriefingScrollOffset = 0;
        soundFX.terminal();
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
      if (key === '9' || key === 'F9') {
        g.loadGame();
        return;
      }
      if (key === 'r' || key === 'R' || key === 'Enter' || key === ' ' || key === 'Space') {
        g.restartGame();
        return;
      }
      if (key === 'Escape' || key === 'Esc') {
        g.returnToTitleScreen();
        return;
      }
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
      if (key === ' ' || key === 'Enter' || key === 'Space') {
        advanceDialogue(g);
        return;
      }

      if (key === 'Escape' || key === 'Esc') {
        g.activeDialogue = null;
        soundFX.terminal();
        g.render();
        return;
      }

      // Other keys: close dialogue and fall through to Normal Gameplay
      this.lastDialogueNpcId = g.activeDialogue.npc.id;
      g.activeDialogue = null;
      soundFX.terminal();
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
    const ctx: MovementContext = { lastDialogueNpcId: this.lastDialogueNpcId };
    PlayerMovementController.handleMovement(g as any, dx, dy, ctx);
    this.lastDialogueNpcId = ctx.lastDialogueNpcId;
  }

  private handleTerminalInput(key: string): void {
    _handleTerminalInput(this.game, key);
  }

  private executeTitleMenuItem(index: number): void {
    const g = this.game;
    switch (index) {
      case 0:
        g.isTitleScreen = false;
        g.isIntroBriefingOpen = true;
        g.introBriefingScrollOffset = 0;
        soundFX.terminal();
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

    Object.defineProperty(host, 'activeDialogue', {
      get: () => g.activeDialogue,
      set: (val: DialogueSession | null) => {
        g.activeDialogue = val;
        this.lastDialogueNpcId = val?.npc?.id ?? null;
      },
      enumerable: true,
      configurable: true,
    });

    return host;
  }
}

export default InputRouter;
