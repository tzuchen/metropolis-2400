import type { SectorMap, Player, Robot, SecurityLevel, GameMessage, Position, RobotType } from './types';
import { buildSector1Map, calculateFOV, isWalkable, toggleDoor, disableForcefield, getTile } from './map';
import { createPlayer, createRobot, toggleWeaponDraw, toggleDisguise } from './entities';
import { updateRobotAI } from './ai';
import { TerminalSession } from './terminal';
import { GameRenderer } from './renderer';
import { soundFX } from './audio';

export class GameEngine {
  canvas: HTMLCanvasElement;
  renderer: GameRenderer;
  map: SectorMap;
  player: Player;
  robots: Robot[];
  securityLevel: SecurityLevel;
  messages: GameMessage[];
  visibleTiles: Set<string>;
  exploredTiles: Set<string>;
  activeTerminal: TerminalSession | null;
  laserBeams: Array<{ from: Position; to: Position; color: string }>;
  floatingTexts: Array<{ x: number; y: number; text: string; color: string }>;
  terminalInputBuffer: string = '';
  victory: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new GameRenderer(canvas);
    this.map = buildSector1Map();
    this.player = createPlayer(this.map.playerStart);
    this.robots = this.createSectorRobots();
    this.securityLevel = 'CLEAR' as SecurityLevel;
    this.messages = [];
    this.floatingTexts = [];
    this.pushMessage('SYSTEM: Resistance neural-link online.', 'info');
    this.pushMessage('MISSION: Infiltrate Tzorg facility & deactivate checkpoint forcefield.', 'warning');
    this.visibleTiles = new Set<string>();
    this.exploredTiles = new Set<string>();
    this.activeTerminal = null;
    this.laserBeams = [];
    this.terminalInputBuffer = '';
    this.victory = false;
    this.updateFOV();
    this.render();
  }

  private createSectorRobots(): Robot[] {
    return [
      createRobot('SCOUT_DRONE' as RobotType, { x: 12, y: 5 }, [{ x: 12, y: 5 }, { x: 12, y: 12 }]),
      createRobot('SCOUT_DRONE' as RobotType, { x: 18, y: 8 }, [{ x: 18, y: 8 }, { x: 24, y: 8 }]),
      createRobot('SHOCK_ENFORCER' as RobotType, { x: 25, y: 6 }, [{ x: 25, y: 6 }, { x: 27, y: 6 }]),
      createRobot('HUNTER_KILLER' as RobotType, { x: 32, y: 18 }, [{ x: 32, y: 18 }, { x: 32, y: 24 }]),
      createRobot('SERVICE_BOT' as RobotType, { x: 8, y: 10 }, [{ x: 8, y: 10 }, { x: 8, y: 14 }]),
    ];
  }

  private pushMessage(text: string, type: GameMessage['type']): void {
    this.messages.push({ text, type });
    if (this.messages.length > 50) {
      this.messages.splice(0, this.messages.length - 50);
    }
  }

  private pushFloatingText(x: number, y: number, text: string, color: string): void {
    this.floatingTexts.push({ x, y, text, color });
    if (this.floatingTexts.length > 8) {
      this.floatingTexts.shift();
    }
  }

  updateFOV(): void {
    this.visibleTiles = calculateFOV(this.map, { x: this.player.x, y: this.player.y }, 9);
    this.visibleTiles.forEach((key) => {
      this.exploredTiles.add(key);
    });
  }

  render(): void {
    (this.player as any).victory = this.victory;
    this.renderer.render(
      this.map,
      this.player,
      this.robots,
      this.visibleTiles,
      this.exploredTiles,
      this.securityLevel,
      this.messages,
      this.activeTerminal,
      this.laserBeams,
      this.floatingTexts
    );
  }

  handleKeyDown(key: string): void {
    // 遊戲結束或勝利時按 R 重新開始
    if (key === 'r' || key === 'R') {
      if (!this.player.isAlive || this.victory) {
        this.restartGame();
        return;
      }
    }

    if (!this.player.isAlive) {
      return;
    }

    // 活躍終端機模式 (Terminal Session)
    if (this.activeTerminal) {
      if (key === 'Escape' || key === 'Esc') {
        this.activeTerminal = null;
        soundFX.terminal();
        this.render();
        return;
      }

      if (key === 'Enter') {
        soundFX.terminal();
        const result: any = this.activeTerminal.executeCommand(this.terminalInputBuffer);
        this.terminalInputBuffer = '';

        if (result?.disabledForcefield) {
          disableForcefield(this.map, result.disabledForcefield);
          this.securityLevel = 'CLEAR' as SecurityLevel;
          this.victory = true;
          soundFX.victory();
          this.pushMessage('Checkpoint forcefield disabled. Resistance objective accomplished!', 'success');
          this.pushFloatingText(this.player.x, this.player.y, 'VICTORY!', '#00ff88');
        }

        if (result?.clearedAlert) {
          this.securityLevel = 'CLEAR' as SecurityLevel;
          soundFX.pickup();
          this.pushMessage('Security alert cleared from terminal database.', 'success');
        }

        if (result?.shouldExit) {
          this.activeTerminal = null;
        }

        this.render();
        return;
      }

      if (key === 'Backspace') {
        soundFX.terminal();
        this.terminalInputBuffer = this.terminalInputBuffer.slice(0, -1);
        this.render();
        return;
      }

      if (key.length === 1) {
        soundFX.terminal();
        this.terminalInputBuffer += key;
        this.render();
        return;
      }

      return;
    }

    let dx = 0;
    let dy = 0;

    if (key === 'ArrowUp' || key === 'w' || key === 'W') {
      dy = -1;
      (this.player as any).facing = 'up';
    } else if (key === 'ArrowDown' || key === 's' || key === 'S') {
      dy = 1;
      (this.player as any).facing = 'down';
    } else if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
      dx = -1;
      (this.player as any).facing = 'left';
    } else if (key === 'ArrowRight' || key === 'd' || key === 'D') {
      dx = 1;
      (this.player as any).facing = 'right';
    } else if (key === 'f' || key === 'F') {
      const drawn = toggleWeaponDraw(this.player);
      soundFX.laser();
      this.pushMessage(
        drawn ? 'Blaster drawn! Security will treat operative as hostile.' : 'Blaster holstered.',
        drawn ? 'warning' : 'info'
      );
      this.render();
      return;
    } else if (key === 'c' || key === 'C') {
      const ok = toggleDisguise(this.player);
      if (ok) {
        soundFX.pickup();
        this.pushMessage('Holo-disguise activated.', 'info');
      } else {
        soundFX.hit();
        this.pushMessage('Not enough energy for holo-disguise!', 'danger');
      }
      this.render();
      return;
    } else if (key === 'e' || key === 'E') {
      const dirs: [number, number][] = [[0, 1], [0, -1], [1, 0], [-1, 0]];
      for (const [ox, oy] of dirs) {
        const tx = this.player.x + ox;
        const ty = this.player.y + oy;
        if (toggleDoor(this.map, { x: tx, y: ty })) {
          soundFX.door();
          this.pushMessage('Airlock blast door cycled.', 'info');
          this.tick();
          return;
        }
      }
      this.pushMessage('No blast door within reach.', 'warning');
      this.render();
      return;
    } else if (key === 't' || key === 'T') {
      const dirs: [number, number][] = [[0, 0], [0, 1], [0, -1], [1, 0], [-1, 0]];
      for (const [ox, oy] of dirs) {
        const tx = this.player.x + ox;
        const ty = this.player.y + oy;
        const terminal = this.findTerminalAt(tx, ty);
        if (terminal) {
          soundFX.terminal();
          this.activeTerminal = new TerminalSession(terminal);
          this.render();
          return;
        }
      }
      this.pushMessage('No terminal console in range.', 'warning');
      this.render();
      return;
    } else if (key === ' ' || key === '.') {
      this.tick();
      return;
    }

    if (dx !== 0 || dy !== 0) {
      // 檢查是否拔槍射擊 (遠程或近戰雷射射擊)
      if (this.player.isWeaponDrawn) {
        let hitRobot: Robot | null = null;
        for (let range = 1; range <= 5; range++) {
          const tx = this.player.x + dx * range;
          const ty = this.player.y + dy * range;
          const tTile = getTile(this.map, { x: tx, y: ty });
          const tName = String(tTile).toUpperCase();
          if (tName === 'WALL' || tTile === 2) break; // 牆面阻擋雷射

          const found = this.robots.find((r) => r.isAlive && r.x === tx && r.y === ty);
          if (found) {
            hitRobot = found;
            break;
          }
        }

        if (hitRobot) {
          if (this.player.energy < 5) {
            soundFX.hit();
            this.pushMessage('Energy depleted! Blaster power cells exhausted.', 'danger');
            this.render();
            return;
          }

          this.player.energy -= 5;
          soundFX.laser();
          const damage = 35;
          hitRobot.hp -= damage;
          this.laserBeams.push({
            from: { x: this.player.x, y: this.player.y },
            to: { x: hitRobot.x, y: hitRobot.y },
            color: '#00f0ff',
          });
          this.pushFloatingText(hitRobot.x, hitRobot.y, `-${damage}`, '#ff3855');
          this.pushMessage(`Fired laser at ${hitRobot.name} for ${damage} dmg!`, 'danger');

          if (hitRobot.hp <= 0) {
            hitRobot.isAlive = false;
            soundFX.explosion();
            this.player.credits += 50;
            this.player.energy = Math.min(this.player.maxEnergy, this.player.energy + 20);
            this.pushFloatingText(hitRobot.x, hitRobot.y, '+50 CR', '#ffaa00');
            this.pushMessage(`${hitRobot.name} destroyed! Salvaged 50 CR & 20 EN.`, 'success');
          } else {
            soundFX.hit();
          }

          this.securityLevel = 'ALERT' as SecurityLevel;
          soundFX.alarm();
          this.tick();
          return;
        }
      }

      // 一般行走移動
      const nx = this.player.x + dx;
      const ny = this.player.y + dy;
      const adjacentRobot = this.robots.find((r) => r.isAlive && r.x === nx && r.y === ny);

      if (adjacentRobot) {
        soundFX.hit();
        this.pushMessage('Path blocked by security robot! Press F to draw weapon.', 'warning');
        this.render();
        return;
      }

      const tile = getTile(this.map, { x: nx, y: ny });
      if (tile && isWalkable(tile)) {
        this.player.x = nx;
        this.player.y = ny;
        soundFX.step();

        // 偽裝能量消耗
        if (this.player.isDisguised) {
          if (this.player.energy > 0) {
            this.player.energy = Math.max(0, this.player.energy - 1);
          } else {
            this.player.isDisguised = false;
            soundFX.powerDown();
            this.pushMessage('Energy depleted! Holo-disguise collapsed!', 'danger');
          }
        }

        this.tick();
      }
    }
  }

  tick(): void {
    if (!this.player.isAlive) {
      this.updateFOV();
      this.render();
      this.laserBeams = [];
      return;
    }

    for (const robot of this.robots) {
      if (!robot.isAlive) {
        continue;
      }

      const result: any = updateRobotAI(robot, this.player, this.map, this.securityLevel);

      if (result?.action === 'alarm') {
        this.securityLevel = 'ALERT' as SecurityLevel;
        soundFX.alarm();
        if (result.message) {
          this.pushMessage(result.message, 'danger');
        }
      } else if (result?.action === 'attack') {
        let damage = result.damage ?? robot.attackPower ?? 10;

        // 個人能量護盾抵擋 50% 傷害
        if (this.player.equippedShield && this.player.energy >= 4) {
          this.player.energy -= 4;
          damage = Math.max(1, Math.round(damage * 0.5));
          this.pushFloatingText(this.player.x, this.player.y, 'SHIELD ABSORB', '#00f0ff');
        }

        this.player.hp = Math.max(0, this.player.hp - damage);
        soundFX.hit();
        this.pushFloatingText(this.player.x, this.player.y, `-${damage}`, '#ff1744');
        if (result.message) {
          this.pushMessage(result.message, 'danger');
        }

        if (this.player.hp <= 0) {
          this.player.isAlive = false;
          soundFX.powerDown();
          this.pushMessage('MISSION FAILED: Operative neutralized by Tzorg forces.', 'danger');
        }
      }
    }

    this.updateFOV();
    this.render();
    this.laserBeams = [];
  }

  restartGame(): void {
    this.map = buildSector1Map();
    this.player = createPlayer(this.map.playerStart);
    this.robots = this.createSectorRobots();
    this.securityLevel = 'CLEAR' as SecurityLevel;
    this.messages = [];
    this.floatingTexts = [];
    this.pushMessage('SYSTEM: Protocol restarted. Resistance operative deployed.', 'info');
    this.activeTerminal = null;
    this.laserBeams = [];
    this.terminalInputBuffer = '';
    this.victory = false;
    soundFX.pickup();
    this.updateFOV();
    this.render();
  }

  private findTerminalAt(x: number, y: number): any {
    const rawTerminals = (this.map as any).terminals;

    if (Array.isArray(rawTerminals)) {
      for (const terminal of rawTerminals) {
        const pos = terminal?.position;
        if (pos && pos.x === x && pos.y === y) {
          return terminal;
        }
      }
      return null;
    }

    if (rawTerminals && typeof rawTerminals === 'object') {
      for (const terminal of Object.values(rawTerminals)) {
        const pos = (terminal as any)?.position;
        if (pos && pos.x === x && pos.y === y) {
          return terminal;
        }
      }
    }

    return null;
  }
}
