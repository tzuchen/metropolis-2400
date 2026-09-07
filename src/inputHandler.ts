import { createBreachSession, moveBreachCursor, selectBreachCell } from './breachProtocol';
import { disableForcefield } from './map';
import { soundFX } from './audio';

export function handleSpecialInput(game: any, key: string): boolean {
  // 1. Manual Modal (特工戰術手冊)
  if (game.isManualOpen) {
    if (['Escape', 'Esc', 'h', 'H', ' ', 'Space', 'Enter'].includes(key)) {
      game.isManualOpen = false;
      soundFX.terminal();
      game.render();
      return true;
    }
    return true;
  }

  // 2. Title Screen (標題畫面)
  if (game.isTitleScreen) {
    if (key === 'h' || key === 'H') {
      game.isManualOpen = true;
      soundFX.terminal();
      game.render();
      return true;
    }
    if (['n', 'N', 'Enter', ' ', 'Space'].includes(key)) {
      game.isTitleScreen = false;
      soundFX.pickup();
      const msg = game.language === 'zh' ? '任務啟動！' : 'MISSION START!';
      game.pushFloatingText(game.player.x, game.player.y, msg, '#00ffcc');
      game.render();
      return true;
    }
    if (key === 'l' || key === 'L') {
      if (game.loadGame()) {
        game.isTitleScreen = false;
      }
      return true;
    }
    if (key === 'z' || key === 'Z') {
      game.toggleLanguage();
      return true;
    }
    return true;
  }

  // 3. Breach Protocol Session (矩陣代碼入侵)
  if (game.activeBreachSession) {
    const session = game.activeBreachSession;
    if (session.completed) {
      if ([' ', 'Space', 'Enter', 'Escape', 'Esc'].includes(key)) {
        game.activeBreachSession = null;
        soundFX.terminal();
        game.render();
        return true;
      }
      return true;
    }

    if (key === 'Escape' || key === 'Esc') {
      game.activeBreachSession = null;
      soundFX.terminal();
      game.render();
      return true;
    }

    if (['ArrowUp', 'w', 'W'].includes(key)) {
      moveBreachCursor(session, -1, 0);
      soundFX.terminal();
      game.render();
      return true;
    }
    if (['ArrowDown', 's', 'S'].includes(key)) {
      moveBreachCursor(session, 1, 0);
      soundFX.terminal();
      game.render();
      return true;
    }
    if (['ArrowLeft', 'a', 'A'].includes(key)) {
      moveBreachCursor(session, 0, -1);
      soundFX.terminal();
      game.render();
      return true;
    }
    if (['ArrowRight', 'd', 'D'].includes(key)) {
      moveBreachCursor(session, 0, 1);
      soundFX.terminal();
      game.render();
      return true;
    }

    if ([' ', 'Space', 'Enter'].includes(key)) {
      const res = selectBreachCell(session);
      if (res.wonRewards.length > 0) {
        soundFX.victory();
        res.wonRewards.forEach((r) => {
          if (r.type === 'UNLOCK') {
            if (game.activeTerminal) game.activeTerminal.isHacked = true;
            disableForcefield(game.map, 'CHECKPOINT_FF');
            game.pushMessage(game.language === 'zh' ? '矩陣入侵：安全力場已被強制解鎖！' : 'BREACH PROTOCOL: Security forcefield overridden!', 'success');
          }
          if (r.type === 'CREDITS') {
            game.player.credits += 80;
            game.pushMessage(game.language === 'zh' ? '矩陣入侵：搜刮信用點 (+80 CR)！' : 'BREACH PROTOCOL: Siphoned +80 Credits!', 'success');
          }
          if (r.type === 'EMP_SURGE') {
            (game.robots || []).forEach((rob: any) => { rob.stunnedTurns = 12; });
            game.pushMessage(game.language === 'zh' ? '矩陣入侵：分區電網過載，機器人全體癱瘓 12 回合！' : 'BREACH PROTOCOL: Network overload, all robots stunned 12 turns!', 'success');
          }
        });
      } else {
        soundFX.pickup();
      }
      game.render();
      return true;
    }
    return true;
  }

  // 4. In-game Manual Toggle Key
  if (key === 'h' || key === 'H') {
    game.isManualOpen = true;
    soundFX.terminal();
    game.render();
    return true;
  }

  return false;
}
