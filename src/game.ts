import type { SectorMap, Player, Robot, SecurityLevel, GameMessage, Position, RobotType } from './types';
import { buildSector1Map, calculateFOV, isWalkable, toggleDoor, disableForcefield, getTile } from './map';
import { createPlayer, createRobot, toggleWeaponDraw, toggleDisguise } from './entities';
import { updateRobotAI } from './ai';
import { TerminalSession } from './terminal';
import { GameRenderer } from './renderer';


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
  terminalInputBuffer: string = '';
  victory: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new GameRenderer(canvas);
    this.map = buildSector1Map();
    this.player = createPlayer(this.map.playerStart);
    this.robots = [
      createRobot('SCOUT_DRONE' as RobotType, { x: 12, y: 5 }, [{ x: 12, y: 5 }, { x: 12, y: 12 }]),
      createRobot('SCOUT_DRONE' as RobotType, { x: 18, y: 8 }, [{ x: 18, y: 8 }, { x: 24, y: 8 }]),
      createRobot('SHOCK_ENFORCER' as RobotType, { x: 25, y: 6 }, [{ x: 25, y: 6 }, { x: 27, y: 6 }]),
    ];
    this.securityLevel = 'CLEAR' as SecurityLevel;
    this.messages = [];
    this.pushMessage('SYSTEM: Resistance link established.', 'info');
    this.pushMessage('MISSION: Infiltrate the Tzorg facility and disable the checkpoint forcefield.', 'warning');
    this.visibleTiles = new Set<string>();
    this.exploredTiles = new Set<string>();
    this.activeTerminal = null;
    this.laserBeams = [];
    this.terminalInputBuffer = '';
    this.victory = false;
    this.updateFOV();
    this.render();
  }

  private pushMessage(text: string, type: GameMessage['type']): void {
    this.messages.push({ text, type });
    if (this.messages.length > 50) {
      this.messages.splice(0, this.messages.length - 50);
    }
  }

  updateFOV(): void {
    this.visibleTiles = calculateFOV(this.map, { x: this.player.x, y: this.player.y }, 9);
    this.visibleTiles.forEach((key) => {
      this.exploredTiles.add(key);
    });
  }

  render(): void {
    this.renderer.render(
      this.map,
      this.player,
      this.robots,
      this.visibleTiles,
      this.exploredTiles,
      this.securityLevel,
      this.messages,
      this.activeTerminal,
      this.laserBeams
    );
  }

  handleKeyDown(key: string): void {
    if (!this.player.isAlive) {
      return;
    }

    if (this.activeTerminal) {
      if (key === 'Escape' || key === 'Esc') {
        this.activeTerminal = null;
        this.render();
        return;
      }

      if (key === 'Enter') {
        const result: any = this.activeTerminal.executeCommand(this.terminalInputBuffer);
        this.terminalInputBuffer = '';

        if (result?.disabledForcefield) {
          disableForcefield(this.map, result.disabledForcefield);
          this.securityLevel = 'CLEAR' as SecurityLevel;

          this.victory = true;
          this.pushMessage('Checkpoint forcefield disabled. Mission objective complete.', 'success');
        }

        if (result?.clearedAlert) {
          this.securityLevel = 'CLEAR' as SecurityLevel;
        }

        if (result?.shouldExit) {
          this.activeTerminal = null;
        }

        this.render();
        return;
      }

      if (key === 'Backspace') {
        this.terminalInputBuffer = this.terminalInputBuffer.slice(0, -1);
        this.render();
        return;
      }

      if (key.length === 1) {
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
    } else if (key === 'ArrowDown' || key === 's' || key === 'S') {
      dy = 1;
    } else if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
      dx = -1;
    } else if (key === 'ArrowRight' || key === 'd' || key === 'D') {
      dx = 1;
    } else if (key === 'f' || key === 'F') {
      const drawn = toggleWeaponDraw(this.player);
      this.pushMessage(drawn ? 'Weapon drawn! Security robots will be suspicious.' : 'Weapon holstered.', drawn ? 'warning' : 'info');
      this.render();
      return;
    } else if (key === 'c' || key === 'C') {
      const ok = toggleDisguise(this.player);
      this.pushMessage(ok ? 'Holo-disguise toggled.' : 'Not enough energy for holo-disguise!', ok ? 'info' : 'danger');
      this.render();
      return;
    } else if (key === 'e' || key === 'E') {
      const dirs: [number, number][] = [[0, 1], [0, -1], [1, 0], [-1, 0]];
      for (const [ox, oy] of dirs) {
        const tx = this.player.x + ox;
        const ty = this.player.y + oy;
        if (toggleDoor(this.map, { x: tx, y: ty })) {
          this.pushMessage('Airlock door cycled.', 'info');
          this.tick();
          return;
        }

      }
      return;
    } else if (key === 't' || key === 'T') {
      const dirs: [number, number][] = [[0, 0], [0, 1], [0, -1], [1, 0], [-1, 0]];
      for (const [ox, oy] of dirs) {
        const tx = this.player.x + ox;
        const ty = this.player.y + oy;
        const terminal = this.findTerminalAt(tx, ty);
        if (terminal) {
          this.activeTerminal = new TerminalSession(terminal);
          this.render();
          return;
        }

      }
      this.pushMessage('No terminal in range.', 'warning');
      this.render();
      return;
    } else if (key === ' ' || key === '.') {
      this.tick();
      return;
    }

    if (dx !== 0 || dy !== 0) {
      const nx = this.player.x + dx;
      const ny = this.player.y + dy;
      const targetRobot = this.robots.find((r) => r.isAlive && r.x === nx && r.y === ny);

      if (targetRobot) {
        if (this.player.isWeaponDrawn) {
          const damage = 35;
          targetRobot.hp -= damage;
          this.laserBeams.push({

            from: { x: this.player.x, y: this.player.y },
            to: { x: targetRobot.x, y: targetRobot.y },
            color: '#ff3355',
          });
          this.pushMessage(`Fired laser at ${targetRobot.name} for ${damage} dmg!`, 'danger');

          if (targetRobot.hp <= 0) {
            targetRobot.isAlive = false;
            this.pushMessage(`${targetRobot.name} destroyed!`, 'success');
          }

          this.securityLevel = 'ALERT' as SecurityLevel;
        } else {
          this.pushMessage('Cannot attack with weapon holstered! Press F to draw weapon.', 'warning');
        }

        this.tick();
        return;
      }

      const tile = getTile(this.map, { x: nx, y: ny });
      if (tile && isWalkable(tile)) {
        this.player.x = nx;
        this.player.y = ny;
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
        if (result.message) {

          this.pushMessage(result.message, 'danger');
        }
      } else if (result?.action === 'attack') {
        const damage = result.damage ?? robot.attackPower ?? 10;
        this.player.hp = Math.max(0, this.player.hp - damage);
        if (result.message) {
          this.pushMessage(result.message, 'danger');
        }

        if (this.player.hp <= 0) {
          this.player.isAlive = false;
          this.pushMessage('MISSION FAILED: Operative eliminated.', 'danger');
        }
      }
    }

    this.updateFOV();
    this.render();
    this.laserBeams = [];
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
