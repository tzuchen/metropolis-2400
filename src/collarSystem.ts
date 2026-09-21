/**
 * Metropolis 2400 - Collar & Security Check-In System
 *
 * Handles neural collar timer countdown, step decrement, warning thresholds,
 * overdue alert states, robot alert escalation, terminal check-ins,
 * and permanent neutralization via Tzorg Master Pass.
 */

import { Player, Robot, SecurityLevel } from './types';
import { soundFX } from './audio';

export interface CollarHost {
  player: Player;
  isCollarDisarmed: boolean;
  checkInAlertActive: boolean;
  securityLevel: SecurityLevel;
  robots: Robot[];
  language: 'en' | 'zh';
  pushMessage(text: string, type?: 'info' | 'success' | 'warning' | 'danger'): void;
  pushFloatingText(x: number, y: number, text: string, color: string): void;
  gainExp?(amount: number, reason?: string): void;
  render(): void;
}

export interface CollarStatus {
  isDisarmed: boolean;
  timer: number;
  maxTimer: number;
  alertActive: boolean;
  warningState: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'OVERDUE';
}

export class CollarSystem {
  /**
   * Evaluates collar status for HUD, AI perception, and inspection.
   */
  static getCollarStatus(host: CollarHost): CollarStatus {
    const isDisarmed = host.isCollarDisarmed || host.player.isCollarDisarmed || false;
    const timer = host.player.checkInTimer ?? 100;
    const maxTimer = host.player.checkInMaxTimer ?? 100;
    const alertActive = host.checkInAlertActive || false;

    let warningState: CollarStatus['warningState'] = 'NORMAL';
    if (alertActive || timer <= 0) {
      warningState = 'OVERDUE';
    } else if (timer <= 10) {
      warningState = 'CRITICAL';
    } else if (timer <= 20) {
      warningState = 'WARNING';
    }

    return {
      isDisarmed,
      timer,
      maxTimer,
      alertActive,
      warningState,
    };
  }

  /**
   * Resets collar countdown, de-escalates security level, and restores patrol robots.
   * If player holds the Master Pass relic, permanently disarms the collar instead.
   */
  static performCheckIn(host: CollarHost): void {
    const hasMasterPass =
      Array.isArray(host.player.inventory) &&
      host.player.inventory.some((it: any) => it?.id === 'item-master-pass');

    if (hasMasterPass && !host.isCollarDisarmed) {
      CollarSystem.disarmCollar(host);
      return;
    }

    const maxTimer = host.player.checkInMaxTimer || 100;
    host.player.checkInTimer = maxTimer;
    host.checkInAlertActive = false;
    host.securityLevel = 'CLEAR' as SecurityLevel;

    for (const r of host.robots) {
      if (!r.isAlive) continue;
      r.aiState = 'patrol';
      r.targetPos = null;
      r.pursuitTurns = 0;
    }

    host.pushMessage(
      host.language === 'zh'
        ? `神經項圈簽到成功：警報已解除，計時器重置為 ${maxTimer} 步，巡邏單位恢復常規模式。`
        : `Neural collar check-in successful: Alert cleared, timer reset to ${maxTimer} steps, patrol units returning to routine.`,
      'success'
    );
    host.pushFloatingText(host.player.x, host.player.y, `✔ CHECKED IN (${maxTimer})`, '#00ff88');
    soundFX.pickup();
    host.render();
  }

  /**
   * Executes collar step decrement and handles warning/overdue transitions.
   */
  static handlePlayerStep(host: CollarHost): void {
    if (host.isCollarDisarmed || host.player.isCollarDisarmed) return;
    const timer = host.player.checkInTimer;
    if (typeof timer === 'undefined') return;

    if (timer <= 0 || host.checkInAlertActive) {
      host.player.checkInTimer = 0;
      host.checkInAlertActive = true;
      host.securityLevel = 'ALERT' as SecurityLevel;
      for (const r of host.robots) {
        if (!r.isAlive) continue;
        if (r.aiState !== 'chase') {
          r.aiState = 'chase';
          r.targetPos = { x: host.player.x, y: host.player.y };
          r.pursuitTurns = 8;
        }
      }
      return;
    }

    const newTimer = timer - 1;
    host.player.checkInTimer = newTimer;

    if (newTimer === 20) {
      host.pushMessage(
        host.language === 'zh'
          ? '⚠ 神經項圈警告：剩餘 20 步未簽到，請盡快尋找終端機！'
          : '⚠ NEURAL COLLAR WARNING: 20 steps remaining until check-in deadline. Find a terminal ASAP!',
        'warning'
      );
      host.pushFloatingText(host.player.x, host.player.y, '⚠ 20 STEPS LEFT', '#ffea00');
    } else if (newTimer === 10) {
      host.pushMessage(
        host.language === 'zh'
          ? '⚠ 神經項圈緊急：剩餘 10 步！立即簽到否則觸發強制中和！'
          : '⚠ NEURAL COLLAR CRITICAL: 10 steps remaining! Check in immediately or face forced neutralization!',
        'danger'
      );
      host.pushFloatingText(host.player.x, host.player.y, '⚠ 10 STEPS LEFT', '#ff2a4b');
    }

    if (newTimer <= 0) {
      host.checkInAlertActive = true;
      host.securityLevel = 'ALERT' as SecurityLevel;
      soundFX.alarm();
      host.pushMessage(
        host.language === 'zh'
          ? '❌ 簽到逾期！神經項圈觸發強制警報，所有巡邏單位進入攻擊模式！'
          : '❌ CHECK-IN OVERDUE! Neural collar triggered forced alert. All patrol units entering attack mode!',
        'danger'
      );
      host.pushFloatingText(host.player.x, host.player.y, '❌ CHECKIN OVERDUE', '#ff2a4b');

      for (const r of host.robots) {
        if (!r.isAlive) continue;
        r.aiState = 'chase';
        r.targetPos = { x: host.player.x, y: host.player.y };
        r.pursuitTurns = 10;
      }
    }
  }

  /**
   * Permanently disarms and neutralizes the neural collar.
   */
  static disarmCollar(host: CollarHost): void {
    host.isCollarDisarmed = true;
    host.player.isCollarDisarmed = true;
    host.checkInAlertActive = false;
    host.player.checkInTimer = 100;
    host.securityLevel = 'CLEAR' as SecurityLevel;

    for (const r of host.robots) {
      if (!r.isAlive) continue;
      r.aiState = 'patrol';
      r.targetPos = null;
      r.pursuitTurns = 0;
    }

    soundFX.victory();
    host.pushFloatingText(host.player.x, host.player.y, 'COLLAR DISARMED!', '#00ff88');
    host.pushMessage(
      host.language === 'zh'
        ? '【密寶啟動】最高特權金鑰生效！神經項圈已永久解鎖並解除監控，100 步限制完全消除！'
        : '[RELIC ACTIVATED] Tzorg Master Pass verified! Neural collar permanently neutralized! 100-step restriction lifted!',
      'success'
    );

    if (typeof host.gainExp === 'function') {
      host.gainExp(100, 'MISSION_COMPLETE');
    }
    host.render();
  }
}
