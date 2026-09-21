// src/actionExecutor.ts
// AI Action Executor for Metropolis 2400
// Maps AI action names to keyboard events and forwards them to the game engine.

import type { GameEngine } from './game';
import { checkPlayerMovementCollision } from './aiPerception';
import { saveJournalEntry, loadJournalEntries } from './journalSystem';
import { getMentalMapSnapshot, planMentalMapRoute, type MentalMapSnapshot, type RoutePlan } from './mentalMap';
import { getTile } from './map';
import { TileType } from './types';

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
    const frontiers: any[] = [];
    let nearestFrontier: any | null = null;
    if (frontiers.length > 0) {
      nearestFrontier = frontiers.reduce((closest: any, f: any) => {
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
  const preMessageCount = game.messages?.length ?? 0;

  // Auto-draw weapon before firing to prevent direction keys from being treated as movement
  if (action.startsWith('FIRE_') && !game.player.isWeaponDrawn) {
    game.player.isWeaponDrawn = true;
  }

  // Handle FIRE_* actions directly to prevent accidental movement via direction keys
  if (action.startsWith('FIRE_')) {
    let fireDir: { dx: number; dy: number } = { dx: 0, dy: 0 };
    if (action === 'FIRE_E') {
      fireDir = { dx: 1, dy: 0 };
    } else if (action === 'FIRE_W') {
      fireDir = { dx: -1, dy: 0 };
    } else if (action === 'FIRE_N') {
      fireDir = { dx: 0, dy: -1 };
    } else if (action === 'FIRE_S') {
      fireDir = { dx: 0, dy: 1 };
    }

    // Update player facing
    if (game.player.facing !== undefined) {
      if (action === 'FIRE_E') {
        game.player.facing = 'right';
      } else if (action === 'FIRE_W') {
        game.player.facing = 'left';
      } else if (action === 'FIRE_N') {
        game.player.facing = 'up';
      } else if (action === 'FIRE_S') {
        game.player.facing = 'down';
      }
    }

    // Call fireEquippedWeapon if available
    if (typeof game.fireEquippedWeapon === 'function') {
      game.fireEquippedWeapon(fireDir);
    }

    // Render if available
    if (typeof game.render === 'function') {
      game.render();
    }
  } else {
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
    // Check for new messages indicating firing, hitting, or destroying
    const newMessages = (game.messages || []).slice(preMessageCount);
    const fireIndicators = [
      'destroyed',
      'Fired laser',
      'Fired weapon',
      'Scatter Plasma Shotgun',
      'QUANTUM ANNIHILATOR',
      'Silent takedown',
      'Weapon impact blocked',
      'Salvaged scrap data'
    ];
    const hasFireMessage = newMessages.some(msg => 
      fireIndicators.some(indicator => msg.text?.toLowerCase().includes(indicator.toLowerCase()))
    );
    
    const hasEnergyDepletedMessage = newMessages.some(msg => 
      msg.text?.toLowerCase().includes('energy depleted')
    );
    
    // Check if player has enough energy for the weapon
    const equipped = game.player.equippedWeapon as any;
    const weaponEnergyCost = Number(equipped?.energyCost) || 0;
    const hasInsufficientEnergy = preEnergy < weaponEnergyCost;
    const hasNoWeapon = !equipped;
    
    if (hasFireMessage || preEnergy > postEnergy) {
      fired = true;
      reason = 'weapon_fired';
    } else if (hasEnergyDepletedMessage || hasInsufficientEnergy) {
      reason = 'insufficient_energy';
    } else if (hasNoWeapon) {
      reason = 'no_weapon_equipped';
    } else {
      // Default to fired if weapon is drawn and energy is sufficient
      fired = true;
      reason = 'weapon_fired';
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
