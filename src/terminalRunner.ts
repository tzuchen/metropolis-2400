import type { TerminalSession } from './terminal';
import type { GameEngine } from './game';
import { soundFX } from './audio';
import { disableForcefield } from './map';
import { createBreachSession } from './breachProtocol';

export interface TerminalContext {
  hasDefeatedBoss: boolean;
  items: string[];
  level: number;
  decryptedSlates: string[];
}

export function handleTerminalInput(game: GameEngine, key: string): void {
  if (!game.activeTerminal) {
    return;
  }

  if (key === 'Escape' || key === 'Esc') {
    game.activeTerminal = null;
    game.terminalInputBuffer = '';
    soundFX.terminal();
    game.render();
    return;
  }

  if (key === 'Backspace') {
    game.terminalInputBuffer = game.terminalInputBuffer.slice(0, -1);
    if (game.activeTerminal) game.activeTerminal.input = game.terminalInputBuffer;
    game.render();
    return;
  }

  if (key === 'Enter') {
    const cmd = game.terminalInputBuffer || game.activeTerminal?.input || '';
    game.terminalInputBuffer = '';
    if (game.activeTerminal) game.activeTerminal.input = '';

    const upperCmd = cmd.toUpperCase();
    if (upperCmd === 'BREACH' || upperCmd === 'HACK') {
      game.activeBreachSession = createBreachSession(game.activeTerminal?.terminal?.id || 'CORE');
      game.render();
      return;
    }

    if (upperCmd === 'CHECKIN') {
      game.performCheckIn();
      game.render();
      return;
    }

    const inventory = game.player.inventory;
    const items: string[] = [];
    if (Array.isArray(inventory)) {
      for (const it of inventory) {
        if (it?.id) items.push(it.id);
        if (it?.name) items.push(it.name);
      }
    }
    const consumables = game.player.consumables;
    if (consumables?.batteries) items.push(`batteries:${consumables.batteries}`);
    if (consumables?.empGrenades) items.push(`empGrenades:${consumables.empGrenades}`);
    if (game.player.equippedWeapon?.name) items.push(`equippedWeapon:${game.player.equippedWeapon.name}`);

    const context: TerminalContext = {
      hasDefeatedBoss: game.player.hasDefeatedBoss === true,
      items,
      level: game.player.level ?? 1,
      decryptedSlates: game.storyLogs.filter((l) => l.read).map((l) => l.id),
    };
    const result: any = game.activeTerminal.executeCommand(cmd, context);

    if (result?.disabledForcefield) {
      const ffName: string = result.disabledForcefield || 'CORE_FF';
      try {
        disableForcefield(game.map, ffName);
      } catch (err) {
        void err;
      }
      // Also try to disable the other forcefield if it exists
      const otherFF: string = ffName === 'CHECKPOINT_FF' ? 'CORE_FF' : 'CHECKPOINT_FF';
      try {
        disableForcefield(game.map, otherFF);
      } catch (err) {
        void err;
      }
      const forcefieldObj = game.missionObjectives.find((o) => o.id === 'obj-forcefield');
      if (forcefieldObj && !forcefieldObj.completed) {
        forcefieldObj.completed = true;
        game.pushMessage(game.language === 'zh' ? '【任務更新】01 號檢查哨能量屏障已解除！' : 'MISSION UPDATE: Checkpoint 01 forcefield deactivated!', 'success');
        game.gainExp(50, 'MISSION_COMPLETE');
      }
      game.pushMessage(`${ffName}: Plasma barrier capacitors short-circuited. Barrier offline.`, 'success');
      soundFX.victory();
      game.gainExp(60, 'HACK_SUCCESS');
      game.forcefieldDisabled = true;
      game.updateNPCDialogues();
    }

    if (result?.disarmCollar) {
      game.disarmCollar();
    }

    if (result?.endgameChoice) {
      game.endgameChoice = result.endgameChoice;
      game.player.endgameChoice = result.endgameChoice;
      game.victory = true;
      game.isCitadelHordeActive = false;
      for (const r of game.robots) {
        r.isAlive = false;
      }
      soundFX.victory();
      game.pushMessage('OPERATION PROMETHEUS: [' + result.endgameChoice + '] protocol executed.', 'success');
      game.pushFloatingText(game.player.x, game.player.y, 'ENDGAME: ' + result.endgameChoice, '#00ff88');
    }

    if (result?.victory) {
      game.victory = true;
    }

    if (result?.clearedAlert) {
      if (game.checkInAlertActive) {
        game.pushMessage(
          game.language === 'zh'
            ? '❌ 無法解除警報：神經項圈逾期未簽到！請執行 CHECKIN 指令。'
            : '❌ Cannot clear alert: Neural collar check-in overdue! Execute CHECKIN command.',
          'danger'
        );
      } else {
        game.securityLevel = 'CLEAR' as any;
        game.pushMessage('Security alert cleared. All units returning to patrol.', 'info');
      }
    }

    if (result?.energyGain) {
      game.player.energy = Math.min(game.player.maxEnergy, game.player.energy + result.energyGain);
      game.pushFloatingText(game.player.x, game.player.y, `+${result.energyGain} EN`, '#00f0ff');
      game.pushMessage(`Energy siphoned: +${result.energyGain} EN.`, 'success');
      game.gainExp(25, 'ENERGY_SIPHON');
    }

    if (result?.shouldExit) {
      game.activeTerminal = null;
    }

    game.render();
    return;
  }

  if (key.length === 1 && key >= ' ' && key <= '~') {
    game.terminalInputBuffer += key;
    if (game.activeTerminal) game.activeTerminal.input = game.terminalInputBuffer;
    game.render();
  }
}
