import type { SectorMap, Player, Robot, SecurityLevel, GameMessage } from './types';
import type { TerminalSession } from './terminal';
import * as MapModule from './map';
import { drawTileSprite, drawPlayerSprite, drawRobotSprite } from './sprites';

export type Position = { x: number; y: number };

export class GameRenderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  tileSize: number = 48;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  render(
    map: SectorMap,
    player: Player,
    robots: Robot[],
    visibleTiles: Set<string>,
    exploredTiles: Set<string>,
    securityLevel: SecurityLevel,
    messages: GameMessage[],
    activeTerminal: TerminalSession | null,
    laserBeams?: Array<{ from: Position; to: Position; color: string }>
  ): void {
    const width = Number(this.canvas.width) || 800;
    const height = Number(this.canvas.height) || 600;
    const ctx = this.ctx as any;

    ctx.save?.();
    ctx.fillStyle = '#050a0f';
    ctx.fillRect?.(0, 0, width, height);

    const px = Number(player?.x) || 0;
    const py = Number(player?.y) || 0;
    const camX = px * this.tileSize - width / 2;
    const camY = py * this.tileSize - height / 2;

    const visible = visibleTiles ?? new Set<string>();
    const explored = exploredTiles ?? new Set<string>();
    const drawn = new Set<string>();

    explored.forEach((key) => {
      if (visible.has(key) || drawn.has(key)) return;
      const pos = this.parseKey(key);
      if (!pos) return;
      this.drawTile(map, pos.x, pos.y, false, camX, camY, ctx);
      drawn.add(key);
    });

    visible.forEach((key) => {
      if (drawn.has(key)) return;
      const pos = this.parseKey(key);
      if (!pos) return;
      this.drawTile(map, pos.x, pos.y, true, camX, camY, ctx);
      drawn.add(key);
    });

    if (Array.isArray(robots)) {
      robots.forEach((robot) => {
        if (!robot || robot.isAlive === false) return;
        const rx = Number(robot.x);
        const ry = Number(robot.y);
        if (Number.isNaN(rx) || Number.isNaN(ry)) return;
        const key = this.key(rx, ry);
        if (!visible.has(key)) return;
        this.drawRobot(robot, rx, ry, camX, camY, ctx);
      });
    }

    this.drawPlayer(player, camX, camY, ctx);

    if (Array.isArray(laserBeams)) {
      laserBeams.forEach((beam) => {
        if (!beam || !beam.from || !beam.to) return;
        this.drawLine(
          beam.from.x * this.tileSize - camX + this.tileSize / 2,
          beam.from.y * this.tileSize - camY + this.tileSize / 2,
          beam.to.x * this.tileSize - camX + this.tileSize / 2,
          beam.to.y * this.tileSize - camY + this.tileSize / 2,
          beam.color || '#ff3b3b',
          ctx
        );
      });
    }

    this.drawHud(width, height, player, securityLevel, messages, ctx);

    if (activeTerminal) {
      this.drawTerminal(activeTerminal, width, height, ctx);
    }

    ctx.restore?.();
  }

  key(x: number, y: number): string {
    const keyFn = (MapModule as any).key;
    if (typeof keyFn === 'function') {
      try {
        const result = keyFn.call(MapModule, x, y);
        if (typeof result === 'string') return result;
      } catch (err) {
        void err;
      }
    }
    return `${x},${y}`;
  }

  parseKey(key: string): Position | null {
    const parseFn = (MapModule as any).parseKey;
    if (typeof parseFn === 'function') {
      try {
        const result = parseFn.call(MapModule, key);
        if (result && Number.isFinite(result.x) && Number.isFinite(result.y)) {
          return { x: Number(result.x), y: Number(result.y) };
        }
      } catch (err) {
        void err;
      }
    }

    const parts = key.split(/[,:_]/);
    if (parts.length < 2) return null;

    const x = Number(parts[0]);
    const y = Number(parts[1]);
    if (Number.isNaN(x) || Number.isNaN(y)) return null;

    return { x, y };
  }

  drawTile(
    map: SectorMap,
    x: number,
    y: number,
    visible: boolean,
    camX: number,
    camY: number,
    ctx: any
  ): void {
    const m = map as any;
    const sx = x * this.tileSize - camX;
    const sy = y * this.tileSize - camY;
    const canvasWidth = Number(this.canvas.width) || 800;
    const canvasHeight = Number(this.canvas.height) || 600;

    if (
      sx + this.tileSize < 0 ||
      sy + this.tileSize < 0 ||
      sx >= canvasWidth ||
      sy >= canvasHeight
    ) {
      return;
    }

    ctx.save?.();
    ctx.fillStyle = visible ? '#0b141c' : '#070d12';
    ctx.fillRect?.(sx, sy, this.tileSize, this.tileSize);

    ctx.strokeStyle = visible ? 'rgba(80, 160, 200, 0.18)' : 'rgba(80, 160, 200, 0.06)';
    ctx.lineWidth = 1;
    ctx.strokeRect?.(sx + 0.5, sy + 0.5, this.tileSize - 1, this.tileSize - 1);

    const tile = this.getTile(m, x, y);
    drawTileSprite(ctx, tile ?? 1, sx, sy, this.tileSize, visible, performance.now());

    ctx.restore?.();
  }

  getTile(map: any, x: number, y: number): any {
    if (!map) return null;

    if (Array.isArray(map.tiles)) {
      const row = map.tiles[y];
      if (Array.isArray(row)) return row[x] ?? null;
    }

    if (map.tiles && typeof map.tiles.get === 'function') {
      return map.tiles.get(this.key(x, y)) ?? null;
    }

    if (map.getTile && typeof map.getTile === 'function') {
      try {
        return map.getTile(x, y) ?? null;
      } catch (err) {
        void err;
        return null;
      }
    }

    return null;
  }

  drawRobot(
    robot: Robot,
    rx: number,
    ry: number,
    camX: number,
    camY: number,
    ctx: any
  ): void {
    drawRobotSprite(ctx, robot, rx * this.tileSize - camX, ry * this.tileSize - camY, this.tileSize, true, performance.now());
  }

  drawPlayer(player: Player, camX: number, camY: number, ctx: any): void {
    const p = player as any;
    const px = Number(p?.x) || 0;
    const py = Number(p?.y) || 0;
    drawPlayerSprite(ctx, player, px * this.tileSize - camX, py * this.tileSize - camY, this.tileSize, performance.now());
  }

  drawLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
    ctx: any
  ): void {
    ctx.save?.();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath?.();
    ctx.moveTo?.(x1, y1);
    ctx.lineTo?.(x2, y2);
    ctx.stroke?.();
    ctx.restore?.();
  }

  drawHud(
    width: number,
    height: number,
    player: Player,
    securityLevel: SecurityLevel,
    messages: GameMessage[],
    ctx: any
  ): void {
    ctx.save?.();

    ctx.fillStyle = 'rgba(5, 10, 15, 0.72)';
    ctx.fillRect?.(0, 0, width, 32);

    ctx.fillStyle = '#cfe8f3';
    ctx.font = '14px monospace';
    ctx.textBaseline = 'middle';

    const p = player as any;
    const px = Number(p?.x) || 0;
    const py = Number(p?.y) || 0;
    const sec = String(securityLevel ?? 'unknown');
    ctx.fillText?.(`POS ${px},${py}  SEC ${sec}`, 10, 16);

    if (Array.isArray(messages)) {
      const recent = (messages as any[]).slice(-3);
      ctx.textAlign = 'right';

      recent.forEach((message, index) => {
        const m = message as any;
        const text = String(m?.text ?? m?.message ?? m ?? '');
        ctx.fillStyle =
          index === recent.length - 1 ? '#e8f7ff' : 'rgba(232, 247, 255, 0.55)';
        ctx.fillText?.(text, width - 10, 16 + index * 14);
      });

      ctx.textAlign = 'left';
    }

    ctx.restore?.();
  }

  drawTerminal(terminal: TerminalSession, width: number, height: number, ctx: any): void {
    const t = terminal as any;

    ctx.save?.();

    const pad = 12;
    const boxW = Math.min(width - pad * 2, 640);
    const boxH = Math.min(height - pad * 2, 360);
    const x = (width - boxW) / 2;
    const y = (height - boxH) / 2;

    ctx.fillStyle = 'rgba(4, 8, 12, 0.92)';
    ctx.fillRect?.(x, y, boxW, boxH);

    ctx.strokeStyle = '#2f6f8f';
    ctx.lineWidth = 1;
    ctx.strokeRect?.(x + 0.5, y + 0.5, boxW - 1, boxH - 1);

    ctx.fillStyle = '#8fd3ff';
    ctx.font = '14px monospace';
    ctx.textBaseline = 'top';

    const title = String(t?.title ?? t?.name ?? 'TERMINAL');
    ctx.fillText?.(title, x + pad, y + pad);

    const lines: string[] = [];
    const history = t?.history ?? t?.lines ?? t?.log ?? [];
    if (Array.isArray(history)) {
      history.slice(-8).forEach((line: any) => {
        lines.push(String(line?.text ?? line?.message ?? line ?? ''));
      });
    }

    const input = String(t?.input ?? t?.buffer ?? t?.value ?? '');
    if (input) lines.push('> ' + input);

    lines.forEach((line, index) => {
      ctx.fillStyle = index === lines.length - 1 ? '#e8f7ff' : 'rgba(232, 247, 255, 0.78)';
      ctx.fillText?.(line, x + pad, y + pad + 24 + index * 18);
    });

    ctx.restore?.();
  }
}
