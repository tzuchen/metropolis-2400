import type { SectorMap, Player, Robot, SecurityLevel, GameMessage } from './types';
import type { TerminalSession } from './terminal';
import * as MapModule from './map';
import { drawTileSprite, drawPlayerSprite, drawRobotSprite } from './sprites';

export type Position = { x: number; y: number };

// 街景霓虹看板標識定義 (基於地圖 Tile 座標)
interface StreetSign {
  x: number;
  y: number;
  text: string;
  color: string;
  subtext?: string;
}

const SECTOR_STREET_SIGNS: StreetSign[] = [
  { x: 10, y: 4, text: '★ REBEL BASE', color: '#ff7700', subtext: 'ENTRY' },
  { x: 14, y: 2, text: 'CYBER-ALLEY 4', color: '#00e5ff' },
  { x: 25, y: 5, text: '⚠ TZORG CHECKPOINT', color: '#ff1744', subtext: 'RESTRICTED' },
  { x: 27, y: 3, text: '⚡ HIGH-VOLTAGE', color: '#ffea00' },
  { x: 30, y: 20, text: 'SYS // DATA HUB', color: '#9d4edd', subtext: 'AUTHORIZED ONLY' },
  { x: 35, y: 17, text: 'SERVER VAULT', color: '#00ff88' },
];

export class GameRenderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  tileSize: number = 48;
  lastPlayerPos: Position = { x: 5, y: 5 };

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
    // 深黑色賽博街道基底背景
    ctx.fillStyle = '#050a0f';
    ctx.fillRect?.(0, 0, width, height);

    const px = Number(player?.x) || 0;
    const py = Number(player?.y) || 0;

    // 更新玩家面向 (朝向邏輯)
    if (!(player as any).facing) {
      const dx = px - this.lastPlayerPos.x;
      const dy = py - this.lastPlayerPos.y;
      if (dx > 0) (player as any).facing = 'right';
      else if (dx < 0) (player as any).facing = 'left';
      else if (dy > 0) (player as any).facing = 'down';
      else if (dy < 0) (player as any).facing = 'up';
      else (player as any).facing = 'right';
    }
    this.lastPlayerPos = { x: px, y: py };

    const camX = px * this.tileSize - width / 2;
    const camY = py * this.tileSize - height / 2;
    const now = performance.now();

    const visible = visibleTiles ?? new Set<string>();
    const explored = exploredTiles ?? new Set<string>();
    const drawn = new Set<string>();

    // 1. 繪製探索過但不在視線內的磚塊 (迷霧視角 / 昏暗)
    explored.forEach((key) => {
      if (visible.has(key) || drawn.has(key)) return;
      const pos = this.parseKey(key);
      if (!pos) return;
      this.drawTile(map, pos.x, pos.y, false, camX, camY, ctx, now);
      drawn.add(key);
    });

    // 2. 繪製目前視線可見的磚塊 (完全照明)
    visible.forEach((key) => {
      if (drawn.has(key)) return;
      const pos = this.parseKey(key);
      if (!pos) return;
      this.drawTile(map, pos.x, pos.y, true, camX, camY, ctx, now);
      drawn.add(key);
    });

    // 3. 繪製街景霓虹看板層 (Cyberpunk Neon Signboard Layer)
    this.drawStreetSigns(camX, camY, visible, ctx, now);

    // 4. 繪製巡邏與警戒機器人
    if (Array.isArray(robots)) {
      robots.forEach((robot) => {
        if (!robot || robot.isAlive === false) return;
        const rx = Number(robot.x);
        const ry = Number(robot.y);
        if (Number.isNaN(rx) || Number.isNaN(ry)) return;
        const key = this.key(rx, ry);
        if (!visible.has(key)) return;
        this.drawRobot(robot, rx, ry, camX, camY, ctx, now);
      });
    }

    // 5. 繪製主角 (帶有風衣、目鏡、武器與護盾)
    this.drawPlayer(player, camX, camY, ctx, now);

    // 6. 繪製雷射彈道光束
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

    // 7. 畫面周圍氛圍暗角 (Vignette & Scanline Overlay)
    this.drawScreenAtmosphere(width, height, ctx);

    // 8. 賽博風格抬頭顯示 HUD (Tactical HUD)
    this.drawHud(width, height, player, securityLevel, messages, ctx);

    // 9. 活躍終端機畫面 (CRT Terminal Session)
    if (activeTerminal) {
      this.drawTerminal(activeTerminal, width, height, ctx, now);
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
    ctx: any,
    now: number = 0
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
    let tile = this.getTile(m, x, y);

    // 終端機座標比對 (確保安全屋/檢點/伺服室終端機正確以 TERMINAL 材質渲染)
    if (m?.terminals) {
      const termList = Array.isArray(m.terminals) ? m.terminals : Object.values(m.terminals);
      const isTerminal = termList.some(
        (t: any) => t?.position && t.position.x === x && t.position.y === y
      );
      if (isTerminal) {
        tile = 'TERMINAL';
      }
    }

    drawTileSprite(ctx, tile ?? 'FLOOR', sx, sy, this.tileSize, visible, now);
    ctx.restore?.();
  }

  // 街景霓虹標誌層
  drawStreetSigns(camX: number, camY: number, visible: Set<string>, ctx: any, now: number): void {
    for (const sign of SECTOR_STREET_SIGNS) {
      const sx = sign.x * this.tileSize - camX;
      const sy = sign.y * this.tileSize - camY;
      const key = `${sign.x},${sign.y}`;

      // 只有在視野或附近可見時才發光渲染
      if (!visible.has(key)) continue;

      ctx.save?.();
      const pulse = 0.8 + 0.2 * Math.sin(now * 0.005 + sign.x);
      ctx.globalAlpha = pulse;

      // 霓虹看板背景條
      const signW = this.tileSize * 1.6;
      const signH = 16;
      const bx = sx + (this.tileSize - signW) / 2;
      const by = sy - 10;

      ctx.fillStyle = 'rgba(10, 15, 22, 0.85)';
      ctx.fillRect?.(bx, by, signW, signH);

      ctx.strokeStyle = sign.color;
      ctx.shadowColor = sign.color;
      ctx.shadowBlur = 6;
      ctx.lineWidth = 1;
      ctx.strokeRect?.(bx, by, signW, signH);

      ctx.fillStyle = sign.color;
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText?.(sign.text, bx + signW / 2, by + signH / 2);

      ctx.shadowBlur = 0;
      ctx.restore?.();
    }
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
    ctx: any,
    now: number = 0
  ): void {
    drawRobotSprite(
      ctx,
      robot,
      rx * this.tileSize - camX,
      ry * this.tileSize - camY,
      this.tileSize,
      true,
      now
    );
  }

  drawPlayer(player: Player, camX: number, camY: number, ctx: any, now: number = 0): void {
    const p = player as any;
    const px = Number(p?.x) || 0;
    const py = Number(p?.y) || 0;
    drawPlayerSprite(
      ctx,
      player,
      px * this.tileSize - camX,
      py * this.tileSize - camY,
      this.tileSize,
      now
    );
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
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.lineWidth = 2.5;
    ctx.beginPath?.();
    ctx.moveTo?.(x1, y1);
    ctx.lineTo?.(x2, y2);
    ctx.stroke?.();
    ctx.shadowBlur = 0;
    ctx.restore?.();
  }

  drawScreenAtmosphere(width: number, height: number, ctx: any): void {
    ctx.save?.();
    // 頂部與底部輕微暗角
    const grad = ctx.createLinearGradient?.(0, 0, 0, height);
    if (grad) {
      grad.addColorStop(0, 'rgba(0, 5, 10, 0.4)');
      grad.addColorStop(0.1, 'rgba(0, 0, 0, 0)');
      grad.addColorStop(0.9, 'rgba(0, 0, 0, 0)');
      grad.addColorStop(1, 'rgba(0, 5, 10, 0.6)');
      ctx.fillStyle = grad;
      ctx.fillRect?.(0, 0, width, height);
    }
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

    // 頂部賽博半透明 HUD 欄位
    ctx.fillStyle = 'rgba(7, 13, 20, 0.88)';
    ctx.fillRect?.(0, 0, width, 36);

    ctx.strokeStyle = 'rgba(0, 229, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect?.(0, 35.5, width, 1);

    ctx.font = 'bold 12px monospace';
    ctx.textBaseline = 'middle';

    const p = player as any;
    const px = Number(p?.x) || 0;
    const py = Number(p?.y) || 0;
    const sec = String(securityLevel ?? 'CLEAR').toUpperCase();

    // 左側：座標與警戒狀態
    ctx.fillStyle = '#00e5ff';
    ctx.fillText?.(`SECTOR 01 [POS ${px},${py}]`, 12, 18);

    // 警戒等級標籤
    let secColor = '#00ff66';
    if (sec === 'SUSPICIOUS') secColor = '#ffea00';
    if (sec === 'ALERT') secColor = '#ff7700';
    if (sec === 'LOCKDOWN') secColor = '#ff1744';

    ctx.fillStyle = secColor;
    ctx.fillText?.(`SEC: ${sec}`, 180, 18);

    // 中間：生命值 (HP) 與能量 (EN) 狀態條
    const hp = Math.max(0, p?.hp ?? 100);
    const maxHp = p?.maxHp ?? 100;
    ctx.fillStyle = '#ff2a4b';
    ctx.fillText?.(`HP ${hp}/${maxHp}`, 290, 18);

    const energy = Math.max(0, p?.energy ?? 100);
    const maxEnergy = p?.maxEnergy ?? 100;
    ctx.fillStyle = '#00f0ff';
    ctx.fillText?.(`EN ${energy}/${maxEnergy}`, 400, 18);

    // 裝備狀態：武器／偽裝
    const weaponStatus = p?.isWeaponDrawn ? 'WEAPON: READY' : 'WEAPON: HOLSTER';
    ctx.fillStyle = p?.isWeaponDrawn ? '#ff3855' : '#8899a6';
    ctx.fillText?.(weaponStatus, 510, 18);

    if (p?.isDisguised) {
      ctx.fillStyle = '#b432ff';
      ctx.fillText?.('[HOLO-DISGUISED]', 650, 18);
    }

    // 底部遊戲訊息懸浮提示
    if (Array.isArray(messages)) {
      const recent = messages.slice(-3);
      ctx.textAlign = 'right';

      recent.forEach((message, index) => {
        const m = message as any;
        const text = String(m?.text ?? m?.message ?? m ?? '');
        const msgType = String(m?.type ?? 'info');

        let msgColor = '#d0e4f0';
        if (msgType === 'warning') msgColor = '#ffea00';
        if (msgType === 'danger') msgColor = '#ff3855';
        if (msgType === 'success') msgColor = '#00ff88';

        ctx.fillStyle =
          index === recent.length - 1 ? msgColor : 'rgba(200, 220, 235, 0.45)';
        ctx.fillText?.(text, width - 12, height - 36 + index * 14);
      });

      ctx.textAlign = 'left';
    }

    ctx.restore?.();
  }

  drawTerminal(
    terminal: TerminalSession,
    width: number,
    height: number,
    ctx: any,
    now: number = 0
  ): void {
    const t = terminal as any;
    ctx.save?.();

    const boxW = Math.min(width - 40, 680);
    const boxH = Math.min(height - 60, 420);
    const x = (width - boxW) / 2;
    const y = (height - boxH) / 2;

    // 黑色 CRT 機殼與半透明螢幕
    ctx.fillStyle = 'rgba(2, 10, 6, 0.95)';
    ctx.fillRect?.(x, y, boxW, boxH);

    // CRT 綠色螢光框
    ctx.strokeStyle = '#00ff66';
    ctx.shadowColor = '#00ff66';
    ctx.shadowBlur = 10;
    ctx.lineWidth = 2;
    ctx.strokeRect?.(x + 1, y + 1, boxW - 2, boxH - 2);

    // 標題列
    ctx.fillStyle = '#00ff66';
    ctx.font = 'bold 14px monospace';
    ctx.textBaseline = 'top';
    const title = String(t?.title ?? t?.name ?? 'METROPOLIS // SECURE TERMINAL').toUpperCase();
    ctx.fillText?.(`[ ${title} ]`, x + 16, y + 16);

    ctx.fillStyle = '#00aa44';
    ctx.font = '11px monospace';
    ctx.fillText?.('TYPE HELP FOR COMMANDS, ESC TO DISCONNECT', x + 16, y + 36);

    ctx.strokeStyle = '#005522';
    ctx.lineWidth = 1;
    ctx.beginPath?.();
    ctx.moveTo?.(x + 16, y + 54);
    ctx.lineTo?.(x + boxW - 16, y + 54);
    ctx.stroke?.();

    // 終端機歷史文字
    const lines: string[] = [];
    const history = t?.history ?? t?.lines ?? t?.log ?? [];
    if (Array.isArray(history)) {
      history.slice(-12).forEach((line: any) => {
        lines.push(String(line?.text ?? line?.message ?? line ?? ''));
      });
    }

    lines.forEach((line, index) => {
      ctx.fillStyle = index === lines.length - 1 ? '#33ff88' : '#00dd55';
      ctx.font = '13px monospace';
      ctx.fillText?.(line, x + 16, y + 64 + index * 18);
    });

    // 輸入提示符與閃爍游標
    const input = String(t?.input ?? t?.buffer ?? t?.value ?? '');
    const cursor = Math.sin(now * 0.01) > 0 ? '█' : '';
    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 13px monospace';
    ctx.fillText?.(`> ${input}${cursor}`, x + 16, y + boxH - 28);

    ctx.shadowBlur = 0;
    ctx.restore?.();
  }
}
