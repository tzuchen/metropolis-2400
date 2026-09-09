// @ts-nocheck
// eslint-disable
import type { SectorMap, Player, Robot, SecurityLevel, GameMessage, TerminalData, DialogueSession, NPC, GroundItem, MissionObjective, StoryLog, Hazard, LaserBeam } from './types';
import type { TerminalSession } from './terminal';
import * as MapModule from './map';
import { drawTileSprite, drawPlayerSprite, drawRobotSprite, drawNPCSprite, drawItemSprite, drawHazardSprite } from './sprites';
import { drawTitleScreen } from './titleScreen';
import { wrapText } from './textWrap';
import { drawManualModal } from './manualModal';
import { drawBreachModal, type BreachSession } from './breachProtocol';
import { drawMiniRadar } from './radar';
import { drawBigMapModal } from './bigMapModal';
import { getFont, getTitleFont, CJK_FONT_STACK } from './uiFont';

export type Position = { x: number; y: number };
export type Language = 'zh' | 'en';

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
  // 第二區 (Sector 2) - 黑市與工坊
  { x: 42, y: 8, text: '⚙ BLACK MARKET', color: '#ff6600', subtext: 'NO QUESTIONS' },
  { x: 45, y: 12, text: 'ZERO-ONE WORKSHOP', color: '#00ffcc', subtext: 'CUSTOM CYBERWARE' },
  { x: 48, y: 6, text: '▲ CITADEL LIFT', color: '#ffea00', subtext: 'AUTHORIZED ONLY' },
  // 零號下水道 (Sewer 0) - 排水與廢水
  { x: 52, y: 25, text: '⚠ DRAIN VALVE 0-A', color: '#88ff00', subtext: 'TOXIC LEVEL' },
  { x: 55, y: 28, text: '☣ SEWAGE BASIN', color: '#44ff88', subtext: 'DANGER' },
];

export class GameRenderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  tileSize: number = 48;
  lastPlayerPos: Position = { x: 5, y: 5 };
  isTitleScreen: boolean = false;
  language: Language = 'zh';
  hasSaveData: boolean = false;
  isManualOpen: boolean = false;
  activeBreachSession: BreachSession | null = null;
  isOmniVisionActive: boolean = false;
  isFullMapActive: boolean = false;
  isBigMapOpen: boolean = false;
  bigMapSelectedSector: string = 'current';

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
    laserBeams?: Array<LaserBeam | { from: Position; to: Position; color: string }>,
    floatingTexts?: Array<{ x: number; y: number; text: string; color: string }>,
    npcs?: NPC[],
    activeDialogue?: DialogueSession | null,
    groundItems?: GroundItem[],
    isInventoryOpen?: boolean,
    isMissionLogOpen?: boolean,
    missionObjectives?: MissionObjective[],
    activeStoryLog?: StoryLog | null,
    isStoryArchiveOpen?: boolean,
    storyLogs?: StoryLog[],
    hazards?: Hazard[],
    isAugmentShopOpen?: boolean
  ): void {
    const width = Number(this.canvas.width) || 800;
    const height = Number(this.canvas.height) || 600;
    const ctx = this.ctx as any;

    ctx.save?.();
    const now = Date.now();
    if (this.isTitleScreen) {
      this.drawTitleScreen(width, height, ctx, now, this.hasSaveData, this.language);
      if (this.isManualOpen) {
        this.drawManualModal(width, height, ctx, now, this.language);
      }
      ctx.restore?.();
      return;
    }
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

    if ((this as any).fx?.applyScreenShake) (this as any).fx.applyScreenShake(ctx);

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

    // 4. 繪製反抗軍居民與 NPC 角色
    if (Array.isArray(npcs)) {
      npcs.forEach((npc) => {
        if (!npc || npc.isAlive === false) return;
        const nx = Number(npc.x);
        const ny = Number(npc.y);
        const key = this.key(nx, ny);
        if (!visible.has(key) && !explored.has(key)) return;
        drawNPCSprite(
          ctx,
          npc,
          nx * this.tileSize - camX,
          ny * this.tileSize - camY,
          this.tileSize,
          visible.has(key),
          now
        );
      });
    }

    // 4.5 繪製戰術物資與地面裝備道具 (Ground Items)
    if (Array.isArray(groundItems)) {
      groundItems.forEach((item) => {
        if (!item) return;
        const ix = Number(item.x);
        const iy = Number(item.y);
        const key = this.key(ix, iy);
        if (!visible.has(key) && !explored.has(key)) return;
        drawItemSprite(
          ctx,
          item,
          ix * this.tileSize - camX,
          iy * this.tileSize - camY,
          this.tileSize,
          visible.has(key),
          now
        );
      });
    }

    // 4.6 繪製環境危險物 (Hazards)
    if (Array.isArray(hazards)) {
      hazards.forEach((hazard) => {
        if (!hazard || hazard.exploded) return;
        const hx = Number(hazard.x);
        const hy = Number(hazard.y);
        const key = this.key(hx, hy);
        if (!visible.has(key) && !explored.has(key)) return;
        drawHazardSprite(ctx, hazard, hx * this.tileSize - camX, hy * this.tileSize - camY, this.tileSize, now);
      });
    }

    // 5. 繪製已被摧毀的機器人殘骸
    if (Array.isArray(robots)) {
      robots.forEach((robot) => {
        if (!robot || robot.isAlive !== false) return;
        const rx = Number(robot.x);
        const ry = Number(robot.y);
        if (Number.isNaN(rx) || Number.isNaN(ry)) return;
        const key = this.key(rx, ry);
        if (!visible.has(key) && !explored.has(key)) return;
        this.drawRobot(robot, rx, ry, camX, camY, ctx, now);
      });
    }

    // 6. 繪製活著的巡邏與警戒機器人
    if (Array.isArray(robots)) {
      robots.forEach((robot) => {
        if (!robot || robot.isAlive === false) return;
        const rx = Number(robot.x);
        const ry = Number(robot.y);
        if (Number.isNaN(rx) || Number.isNaN(ry)) return;
        const key = this.key(rx, ry);
        if (!visible.has(key)) return;
        this.drawRobot(robot, rx, ry, camX, camY, ctx, now);
        if ((player as any).augments?.OPTIC_HUD) {
          const bx = rx * this.tileSize - camX + 4;
          const by = ry * this.tileSize - camY - 6;
          const barW = this.tileSize - 8;
          const hpRatio = Math.max(0, Math.min(1, (robot as any).hp / ((robot as any).maxHp || 50)));
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.fillRect?.(bx, by, barW, 4);
          ctx.fillStyle = hpRatio > 0.5 ? '#00ff88' : hpRatio > 0.25 ? '#ffaa00' : '#ff3344';
          ctx.fillRect?.(bx, by, barW * hpRatio, 4);
          ctx.strokeStyle = '#223344';
          ctx.lineWidth = 0.8;
          ctx.strokeRect?.(bx, by, barW, 4);
        }
      });
    }

    // 7. 繪製主角 (帶有風衣、目鏡、武器與護盾)
    this.drawPlayer(player, camX, camY, ctx, now);

    // 7.5 繪製戰術瞄準雷射與鎖定框 (Laser Sight & Lock-on Reticle)
    if ((player as any).isWeaponDrawn) {
      this.drawLaserSightAndLockOn(player, robots, camX, camY, ctx, now);
    }

    // 8. 繪製雷射彈道光束
    if (Array.isArray(laserBeams)) {
      laserBeams.forEach((beam) => {
        if (!beam || !beam.from || !beam.to) return;
        const b = beam as any;
        const duration = typeof b.duration === 'number' ? b.duration : 200;
        let alpha = 1;
        let progress = 1;
        if (typeof b.createdAt === 'number') {
          const age = Math.max(0, now - b.createdAt);
          if (age > duration) return;
          alpha = Math.max(0.1, 1 - age / duration);
          progress = Math.min(1, Math.max(0, age / duration));
        }
        const x1 = beam.from.x * this.tileSize - camX + this.tileSize / 2;
        const y1 = beam.from.y * this.tileSize - camY + this.tileSize / 2;
        let targetX = beam.to.x;
        let targetY = beam.to.y;
        if (b.targetRobot && b.targetRobot.isAlive !== false) {
          targetX = Number(b.targetRobot.x);
          targetY = Number(b.targetRobot.y);
        }
        const x2 = targetX * this.tileSize - camX + this.tileSize / 2;
        const y2 = targetY * this.tileSize - camY + this.tileSize / 2;
        const color = b.color || '#ff3b3b';
        const beamType = String(b.beamType || 'LASER').toUpperCase();
        ctx.save?.();
        ctx.globalAlpha = alpha;
        if (beamType === 'ELEC') {
          this.drawElectricArc(x1, y1, x2, y2, color, ctx, now, progress);
        } else if (beamType === 'PLASMA') {
          this.drawPlasmaBeam(x1, y1, x2, y2, color, ctx, now, progress);
        } else if (beamType === 'NEEDLE') {
          this.drawNeedleTracer(x1, y1, x2, y2, color, ctx, now, progress);
        } else if (beamType === 'QUANTUM') {
          this.drawQuantumBeam(x1, y1, x2, y2, color, ctx, now, progress);
        } else {
          this.drawLaserBeam(x1, y1, x2, y2, color, ctx, now, progress);
        }
        ctx.restore?.();
      });
    }

    // 9. 繪製戰鬥浮動文字 (Floating Combat Text)
    if (Array.isArray(floatingTexts)) {
      floatingTexts.forEach((ft) => {
        if (!ft) return;
        let alpha = 1;
        let floatOffset = 0;
        if (typeof ft.createdAt === 'number') {
          const age = now - ft.createdAt;
          if (age > 1200) return;
          floatOffset = Math.min(18, (age / 1200) * 16);
          alpha = Math.max(0, 1 - age / 1200);
        }
        const fx = ft.x * this.tileSize - camX + this.tileSize / 2;
        const fy = ft.y * this.tileSize - camY - 12 - floatOffset;
        ctx.save?.();
        ctx.globalAlpha = alpha;
        ctx.font = 'bold 13px monospace';
        ctx.fillStyle = ft.color || '#ffea00';
        ctx.shadowColor = ft.color || '#ffea00';
        ctx.shadowBlur = 6;
        ctx.textAlign = 'center';
        ctx.fillText?.(ft.text, fx, fy);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        ctx.restore?.();
      });
    }

    if ((this as any).activeWaypoint) {
      const wp = (this as any).activeWaypoint;
      const wx = wp.x * this.tileSize + this.tileSize / 2 - camX;
      const wy = wp.y * this.tileSize + this.tileSize / 2 - camY;
      const pulse = 0.6 + 0.4 * Math.sin(now * 0.008);
      ctx.save?.();
      ctx.strokeStyle = wp.color || '#ffea00';
      ctx.lineWidth = 2;
      ctx.beginPath?.();
      ctx.arc?.(wx, wy, this.tileSize * 0.45 * pulse + 4, 0, Math.PI * 2);
      ctx.stroke?.();
      ctx.restore?.();
    }
    if ((this as any).fx?.render) (this as any).fx.render(ctx, camX, camY);

    // 10. 畫面周圍氛圍暗角 (Vignette & Scanline Overlay)
    this.drawScreenAtmosphere(width, height, ctx);

    // 10.5 各分區環境大氣特效 (Sector Environmental Atmosphere Effects)
    this.drawSectorAtmosphere(px, py, width, height, camX, camY, ctx, now);

    // 11. 戰術小雷達 (Sector Mini Radar，包含道具黃點、居民綠點、機器人)
    this.drawMiniRadar(width, map, player, robots, npcs, groundItems, visible, ctx, now, this.isFullMapActive, this.language);

    // 12. 賽博風格抬頭顯示 HUD (Tactical HUD)
    this.drawHud(width, height, player, securityLevel, messages, ctx);

    // 13. 活躍終端機畫面 (CRT Terminal Session)
    if (activeTerminal) {
      this.drawTerminal(activeTerminal, width, height, ctx, now);
    }

    // 14. 居民對話框 (Resident Dialogue Box)
    if (activeDialogue) {
      this.drawDialogueBox(activeDialogue, width, height, ctx, now);
    }

    // 14.5 背包與戰術裝備視窗 (Tactical Inventory Modal)
    if (isInventoryOpen) {
      this.drawInventoryModal(player, width, height, ctx, now);
    }

    // 14.6 任務目標情報日誌 (Mission Log Modal)
    if (isMissionLogOpen) {
      this.drawMissionLogModal(missionObjectives ?? [], width, height, ctx, now);
    }

    // 14.7 反抗軍資料庫視窗 (Story Archive Modal)
    if (isStoryArchiveOpen) {
      this.drawStoryArchiveModal(storyLogs ?? [], width, height, ctx, now);
    }

    // 14.8 故事數據檔案閱讀器 (Data Slate Story Viewer)
    if (activeStoryLog) {
      this.drawStoryLogModal(activeStoryLog, width, height, ctx, now);
    }

    // 14.9 義體改裝診所 (Augmentation Clinic Modal)
    if (isAugmentShopOpen) {
      this.drawAugmentShopModal(player, width, height, ctx, now);
    }

    // 14.10 矩陣入侵協議畫面 (Breach Protocol Modal)
    if (this.activeBreachSession) {
      this.drawBreachModal(this.activeBreachSession, width, height, ctx, now, this.language);
    }

    // 14.11 操作手冊畫面 (Manual Modal)
    if (this.isManualOpen) {
      this.drawManualModal(width, height, ctx, now, this.language);
    }

    // 14.12 戰術全域大地圖 (Tactical Big Map Modal)
    if (this.isBigMapOpen) {
      drawBigMapModal(
        width,
        height,
        map,
        player,
        robots,
        npcs,
        groundItems,
        visibleTiles,
        exploredTiles,
        ctx,
        now,
        this.isFullMapActive,
        this.language,
        this.bigMapSelectedSector || 'current'
      );
    }

    // 15. 死亡／勝利畫面橫幅 (Game Over / Victory Banner)
    if (!player.isAlive) {
      this.drawGameOverOverlay(width, height, ctx, now);
    } else if ((player as any).victory) {
      this.drawVictoryOverlay(player, width, height, ctx, now);
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
    return x + ',' + y;
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

  drawTitleScreen(width: number, height: number, ctx: any, now: number, hasSaveData: boolean, language: Language): void {
    drawTitleScreen(width, height, ctx, now, hasSaveData, language);
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

    if (m?.terminals) {
      const termList = Array.isArray(m.terminals) ? m.terminals : Object.values(m.terminals);
      const isTerminal = termList.some(
        (t: any) => t?.position && t.position.x === x && t.position.y === y
      );
      if (isTerminal) {
        tile = 'TERMINAL';
      }
    }

    drawTileSprite(ctx, tile ?? 'FLOOR', sx, sy, this.tileSize, visible, now, m?.id);
    ctx.restore?.();
  }

  drawStreetSigns(camX: number, camY: number, visible: Set<string>, ctx: any, now: number): void {
    for (const sign of SECTOR_STREET_SIGNS) {
      const sx = sign.x * this.tileSize - camX;
      const sy = sign.y * this.tileSize - camY;
      const key = sign.x + ',' + sign.y;

      if (!visible.has(key)) continue;

      ctx.save?.();
      const pulse = 0.8 + 0.2 * Math.sin(now * 0.005 + sign.x);
      ctx.globalAlpha = pulse;

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

  drawMiniRadar(
    width: number,
    map: SectorMap,
    player: Player,
    robots: Robot[],
    npcs: NPC[] | undefined,
    groundItems: GroundItem[] | undefined,
    visible: Set<string>,
    ctx: any,
    now: number,
    isFull?: boolean,
    language?: Language
  ): void {
    drawMiniRadar(width, map, player, robots, npcs, groundItems, visible, ctx, now, isFull ?? this.isFullMapActive, language ?? this.language);
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

  drawLaserBeam(x1: number, y1: number, x2: number, y2: number, color: string, ctx: any, now: number = 0, progress: number = 1): void {
    ctx.save?.();
    const p = Math.min(1, Math.max(0, progress));
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.hypot(dx, dy) || 1;
    const headDist = Math.min(dist, p * 1.65 * dist);
    const tailDist = Math.max(0, headDist - Math.min(dist * 0.45, 48));
    const hx = x1 + (dx / dist) * headDist;
    const hy = y1 + (dy / dist) * headDist;
    const tx = x1 + (dx / dist) * tailDist;
    const ty = y1 + (dy / dist) * tailDist;

    // 發光外層光束
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.lineWidth = 2.5;
    ctx.beginPath?.();
    ctx.moveTo?.(tx, ty);
    ctx.lineTo?.(hx, hy);
    ctx.stroke?.();

    // 高能白色核心細線
    ctx.strokeStyle = '#ffffff';
    ctx.shadowColor = color;
    ctx.shadowBlur = 4;
    ctx.lineWidth = 1;
    ctx.beginPath?.();
    ctx.moveTo?.(tx, ty);
    ctx.lineTo?.(hx, hy);
    ctx.stroke?.();

    // 前端彈頭光點
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;
    ctx.beginPath?.();
    ctx.arc?.(hx, hy, 3, 0, Math.PI * 2);
    ctx.fill?.();

    // 當彈頭抵達目標時 (p >= 0.6)，在 (x2, y2) 身上繪製瞬間衝擊光環與火花
    if (p >= 0.6) {
      const impactPulse = 0.5 + 0.5 * Math.sin(now * 0.02);
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.lineWidth = 2;
      ctx.globalAlpha = impactPulse * 0.8;
      ctx.beginPath?.();
      ctx.arc?.(x2, y2, 8 + impactPulse * 4, 0, Math.PI * 2);
      ctx.stroke?.();

      // 火花
      for (let s = 0; s < 4; s++) {
        const angle = (s / 4) * Math.PI * 2 + now * 0.01;
        const sparkDist = 6 + Math.random() * 6;
        const sx = x2 + Math.cos(angle) * sparkDist;
        const sy = y2 + Math.sin(angle) * sparkDist;
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 4;
        ctx.beginPath?.();
        ctx.arc?.(sx, sy, 1.5, 0, Math.PI * 2);
        ctx.fill?.();
      }
      ctx.globalAlpha = 1;
    }

    ctx.shadowBlur = 0;
    ctx.restore?.();
  }

  drawElectricArc(x1: number, y1: number, x2: number, y2: number, color: string, ctx: any, now: number = 0, progress: number = 1): void {
    ctx.save?.();
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const headDist = Math.min(len, progress * 1.65 * len);
    const tailDist = Math.max(0, headDist - Math.min(len * 0.45, 52));
    const hx = x1 + (dx / len) * headDist;
    const hy = y1 + (dy / len) * headDist;
    const tx = x1 + (dx / len) * tailDist;
    const ty = y1 + (dy / len) * tailDist;
    const segments = 8;
    const perpX = -dy / len;
    const perpY = dx / len;

    // 尾端與起點間保留微弱半透明電離殘影
    if (tailDist > 0) {
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.3;
      ctx.shadowColor = color;
      ctx.shadowBlur = 4;
      ctx.lineWidth = 1;
      ctx.beginPath?.();
      ctx.moveTo?.(x1, y1);
      ctx.lineTo?.(tx, ty);
      ctx.stroke?.();
      ctx.globalAlpha = 1;
    }

    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.lineWidth = 2;
    ctx.beginPath?.();
    ctx.moveTo?.(tx, ty);

    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      const jitter = (Math.sin(now * 0.05 + i * 7.3) * 0.5 + Math.sin(now * 0.03 + i * 3.1) * 0.5) * (len * 0.15);
      const px = tx + (hx - tx) * t + perpX * jitter;
      const py = ty + (hy - ty) * t + perpY * jitter;
      ctx.lineTo?.(px, py);
    }
    ctx.lineTo?.(hx, hy);
    ctx.stroke?.();

    const sparkCount = 3;
    for (let s = 0; s < sparkCount; s++) {
      const t = 0.2 + (s / sparkCount) * 0.6;
      const jitter = Math.sin(now * 0.04 + s * 5.7) * (len * 0.1);
      const sx = tx + (hx - tx) * t + perpX * jitter;
      const sy = ty + (hy - ty) * t + perpY * jitter;
      const sparkSize = 2 + Math.random() * 2;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;
      ctx.beginPath?.();
      ctx.arc?.(sx, sy, sparkSize, 0, Math.PI * 2);
      ctx.fill?.();
    }

    // 前端彈頭光點
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;
    ctx.beginPath?.();
    ctx.arc?.(hx, hy, 3, 0, Math.PI * 2);
    ctx.fill?.();

    // 當彈頭抵達目標時 (progress >= 0.6)，在 (x2, y2) 身上繪製瞬間衝擊光環與火花
    if (progress >= 0.6) {
      const impactPulse = 0.5 + 0.5 * Math.sin(now * 0.02);
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.lineWidth = 2;
      ctx.globalAlpha = impactPulse * 0.8;
      ctx.beginPath?.();
      ctx.arc?.(x2, y2, 8 + impactPulse * 4, 0, Math.PI * 2);
      ctx.stroke?.();

      for (let s = 0; s < 4; s++) {
        const angle = (s / 4) * Math.PI * 2 + now * 0.01;
        const sparkDist = 6 + Math.random() * 6;
        const sx = x2 + Math.cos(angle) * sparkDist;
        const sy = y2 + Math.sin(angle) * sparkDist;
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 4;
        ctx.beginPath?.();
        ctx.arc?.(sx, sy, 1.5, 0, Math.PI * 2);
        ctx.fill?.();
      }
      ctx.globalAlpha = 1;
    }

    ctx.shadowBlur = 0;
    ctx.restore?.();
  }

  drawPlasmaBeam(x1: number, y1: number, x2: number, y2: number, color: string, ctx: any, now: number = 0, progress: number = 1): void {
    ctx.save?.();
    const p = Math.min(1, Math.max(0, progress));
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.hypot(dx, dy) || 1;
    const headDist = Math.min(dist, p * 1.65 * dist);
    const tailDist = Math.max(0, headDist - Math.min(dist * 0.45, 48));
    const hx = x1 + (dx / dist) * headDist;
    const hy = y1 + (dy / dist) * headDist;
    const tx = x1 + (dx / dist) * tailDist;
    const ty = y1 + (dy / dist) * tailDist;
    const pulse = 0.8 + 0.2 * Math.sin(now * 0.01);

    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 16;
    ctx.lineWidth = 6 * pulse;
    ctx.globalAlpha = 0.4;
    ctx.beginPath?.();
    ctx.moveTo?.(tx, ty);
    ctx.lineTo?.(hx, hy);
    ctx.stroke?.();

    ctx.strokeStyle = '#ffffff';
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.lineWidth = 2.5;
    ctx.globalAlpha = 0.9;
    ctx.beginPath?.();
    ctx.moveTo?.(tx, ty);
    ctx.lineTo?.(hx, hy);
    ctx.stroke?.();

    const orbRadius = 6 + 3 * Math.sin(now * 0.012);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.globalAlpha = 0.8;
    ctx.beginPath?.();
    ctx.arc?.(hx, hy, orbRadius, 0, Math.PI * 2);
    ctx.fill?.();

    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 4;
    ctx.globalAlpha = 0.9;
    ctx.beginPath?.();
    ctx.arc?.(hx, hy, orbRadius * 0.4, 0, Math.PI * 2);
    ctx.fill?.();

    // 當彈頭抵達目標時 (p >= 0.6)，在 (x2, y2) 身上繪製瞬間衝擊光環與火花
    if (p >= 0.6) {
      const impactPulse = 0.5 + 0.5 * Math.sin(now * 0.02);
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.lineWidth = 2;
      ctx.globalAlpha = impactPulse * 0.8;
      ctx.beginPath?.();
      ctx.arc?.(x2, y2, 8 + impactPulse * 4, 0, Math.PI * 2);
      ctx.stroke?.();

      for (let s = 0; s < 4; s++) {
        const angle = (s / 4) * Math.PI * 2 + now * 0.01;
        const sparkDist = 6 + Math.random() * 6;
        const sx = x2 + Math.cos(angle) * sparkDist;
        const sy = y2 + Math.sin(angle) * sparkDist;
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 4;
        ctx.beginPath?.();
        ctx.arc?.(sx, sy, 1.5, 0, Math.PI * 2);
        ctx.fill?.();
      }
      ctx.globalAlpha = 1;
    }

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.restore?.();
  }

  drawNeedleTracer(x1: number, y1: number, x2: number, y2: number, color: string, ctx: any, now: number = 0, progress: number = 1): void {
    ctx.save?.();
    const p = Math.min(1, Math.max(0, progress));
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.hypot(dx, dy) || 1;
    const headDist = Math.min(dist, p * 1.65 * dist);
    const tailDist = Math.max(0, headDist - Math.min(dist * 0.45, 48));
    const hx = x1 + (dx / dist) * headDist;
    const hy = y1 + (dy / dist) * headDist;
    const tx = x1 + (dx / dist) * tailDist;
    const ty = y1 + (dy / dist) * tailDist;

    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 4;
    ctx.lineWidth = 1;
    ctx.beginPath?.();
    ctx.moveTo?.(tx, ty);
    ctx.lineTo?.(hx, hy);
    ctx.stroke?.();

    ctx.fillStyle = color;
    ctx.shadowBlur = 6;
    ctx.beginPath?.();
    ctx.arc?.(hx, hy, 2, 0, Math.PI * 2);
    ctx.fill?.();

    // 當彈頭抵達目標時 (p >= 0.6)，在 (x2, y2) 身上繪製瞬間衝擊光環與火花
    if (p >= 0.6) {
      const impactPulse = 0.5 + 0.5 * Math.sin(now * 0.02);
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = impactPulse * 0.8;
      ctx.beginPath?.();
      ctx.arc?.(x2, y2, 6 + impactPulse * 3, 0, Math.PI * 2);
      ctx.stroke?.();

      for (let s = 0; s < 3; s++) {
        const angle = (s / 3) * Math.PI * 2 + now * 0.01;
        const sparkDist = 4 + Math.random() * 4;
        const sx = x2 + Math.cos(angle) * sparkDist;
        const sy = y2 + Math.sin(angle) * sparkDist;
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 3;
        ctx.beginPath?.();
        ctx.arc?.(sx, sy, 1, 0, Math.PI * 2);
        ctx.fill?.();
      }
      ctx.globalAlpha = 1;
    }

    ctx.shadowBlur = 0;
    ctx.restore?.();
  }

  drawQuantumBeam(x1: number, y1: number, x2: number, y2: number, color: string, ctx: any, now: number = 0, progress: number = 1): void {
    ctx.save?.();
    const p = Math.min(1, Math.max(0, progress));
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.hypot(dx, dy) || 1;
    const headDist = Math.min(dist, p * 1.65 * dist);
    const tailDist = Math.max(0, headDist - Math.min(dist * 0.45, 48));
    const hx = x1 + (dx / dist) * headDist;
    const hy = y1 + (dy / dist) * headDist;
    const tx = x1 + (dx / dist) * tailDist;
    const ty = y1 + (dy / dist) * tailDist;
    const pulse = 0.8 + 0.2 * Math.sin(now * 0.015);

    // 外層紫色高能反物質光束
    ctx.strokeStyle = '#b388ff';
    ctx.shadowColor = '#b388ff';
    ctx.shadowBlur = 14;
    ctx.lineWidth = 6 * pulse;
    ctx.globalAlpha = 0.6;
    ctx.beginPath?.();
    ctx.moveTo?.(tx, ty);
    ctx.lineTo?.(hx, hy);
    ctx.stroke?.();

    // 內層白青色凝聚核心
    ctx.strokeStyle = '#00ffff';
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 8;
    ctx.lineWidth = 2.5;
    ctx.globalAlpha = 0.9;
    ctx.beginPath?.();
    ctx.moveTo?.(tx, ty);
    ctx.lineTo?.(hx, hy);
    ctx.stroke?.();

    // 核心白點
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 4;
    ctx.globalAlpha = 1;
    ctx.beginPath?.();
    ctx.arc?.(hx, hy, 3, 0, Math.PI * 2);
    ctx.fill?.();

    // 當彈頭抵達目標時 (p >= 0.6)，在 (x2, y2) 身上繪製瞬間衝擊光環與火花
    if (p >= 0.6) {
      const impactPulse = 0.5 + 0.5 * Math.sin(now * 0.02);
      ctx.strokeStyle = '#b388ff';
      ctx.shadowColor = '#b388ff';
      ctx.shadowBlur = 12;
      ctx.lineWidth = 2;
      ctx.globalAlpha = impactPulse * 0.8;
      ctx.beginPath?.();
      ctx.arc?.(x2, y2, 8 + impactPulse * 4, 0, Math.PI * 2);
      ctx.stroke?.();

      for (let s = 0; s < 4; s++) {
        const angle = (s / 4) * Math.PI * 2 + now * 0.01;
        const sparkDist = 6 + Math.random() * 6;
        const sx = x2 + Math.cos(angle) * sparkDist;
        const sy = y2 + Math.sin(angle) * sparkDist;
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 4;
        ctx.beginPath?.();
        ctx.arc?.(sx, sy, 1.5, 0, Math.PI * 2);
        ctx.fill?.();
      }
      ctx.globalAlpha = 1;
    }

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.restore?.();
  }

  drawScreenAtmosphere(width: number, height: number, ctx: any): void {
    ctx.save?.();
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

  // 各分區環境大氣特效 (Sector Environmental Atmosphere Effects)
  drawSectorAtmosphere(
    px: number,
    py: number,
    width: number,
    height: number,
    camX: number,
    camY: number,
    ctx: any,
    now: number
  ): void {
    ctx.save?.();

    // 判斷玩家所在分區
    const sector = this.getSectorFromPosition(px, py);

    if (sector === 'SECTOR_1') {
      // 賽博酸雨絲與霧氣粒子 (Cyber Acid Rain & Fog Particles)
      this.drawAcidRainAndFog(width, height, ctx, now);
    } else if (sector === 'SECTOR_2') {
      // 科技區輸送帶微弱火花 (Tech District Conveyor Sparks)
      this.drawConveyorSparks(width, height, ctx, now);
    } else if (sector === 'SEWER_0') {
      // 下水道微弱毒霧蒸汽 (Sewer Toxic Mist & Steam)
      this.drawSewerToxicMist(width, height, ctx, now);
    }

    ctx.restore?.();
  }

  // 根據玩家位置判斷分區
  getSectorFromPosition(px: number, py: number): string {
    // 簡化分區判斷邏輯
    if (px >= 50 && py >= 20) {
      return 'SEWER_0';
    } else if (px >= 40) {
      return 'SECTOR_2';
    } else {
      return 'SECTOR_1';
    }
  }

  // 賽博酸雨絲與霧氣粒子
  drawAcidRainAndFog(width: number, height: number, ctx: any, now: number): void {
    ctx.save?.();

    // 霧氣層 (Fog Layer)
    const fogGrad = ctx.createLinearGradient?.(0, 0, 0, height);
    if (fogGrad) {
      fogGrad.addColorStop(0, 'rgba(20, 40, 50, 0.15)');
      fogGrad.addColorStop(0.5, 'rgba(10, 20, 30, 0.05)');
      fogGrad.addColorStop(1, 'rgba(15, 30, 40, 0.2)');
      ctx.fillStyle = fogGrad;
      ctx.fillRect?.(0, 0, width, height);
    }

    // 酸雨絲 (Acid Rain Streaks)
    const rainCount = 40;
    for (let i = 0; i < rainCount; i++) {
      const baseX = (i * (width / rainCount) * 1.618) % width;
      const x = baseX + Math.sin(now * 0.0006 + i) * 4;
      const y = ((now * 0.22 + i * 35) % (height + 60)) - 30;
      const len = 15 + Math.sin(i * 0.3) * 10;
      const alpha = 0.15 + 0.1 * Math.sin(i * 0.5);

      ctx.strokeStyle = `rgba(100, 255, 150, ${alpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath?.();
      ctx.moveTo?.(x, y);
      ctx.lineTo?.(x - 2, y + len);
      ctx.stroke?.();
    }

    // 霧氣粒子 (Fog Particles)
    const particleCount = 20;
    for (let i = 0; i < particleCount; i++) {
      const x = (i * (width / particleCount) + now * 0.012) % width;
      const y = ((i * 73.1) % height) + Math.sin(now * 0.0006 + i) * 12;
      const size = 20 + Math.sin(i * 0.6) * 15;
      const alpha = 0.02 + 0.02 * Math.sin(i * 0.8);

      ctx.fillStyle = `rgba(150, 200, 220, ${alpha})`;
      ctx.beginPath?.();
      ctx.arc?.(x, y, size, 0, Math.PI * 2);
      ctx.fill?.();
    }

    ctx.restore?.();
  }

  // 科技區輸送帶微弱火花
  drawConveyorSparks(width: number, height: number, ctx: any, now: number): void {
    ctx.save?.();

    // 背景微弱光暈 (Subtle Glow)
    const glowGrad = ctx.createRadialGradient?.(width / 2, height / 2, 0, width / 2, height / 2, width * 0.6);
    if (glowGrad) {
      glowGrad.addColorStop(0, 'rgba(0, 100, 150, 0.08)');
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect?.(0, 0, width, height);
    }

    // 輸送帶火花 (Conveyor Sparks)
    const sparkCount = 15;
    for (let i = 0; i < sparkCount; i++) {
      const seed = i * 211.7 + now * 0.08;
      const x = (Math.sin(seed * 0.5) * 0.5 + 0.5) * width;
      const y = (Math.cos(seed * 0.4) * 0.5 + 0.5) * height;
      const size = 1 + Math.random() * 2;
      const alpha = 0.3 + 0.3 * Math.sin(seed * 0.9);

      ctx.fillStyle = `rgba(255, 200, 50, ${alpha})`;
      ctx.shadowColor = '#ffcc33';
      ctx.shadowBlur = 4;
      ctx.beginPath?.();
      ctx.arc?.(x, y, size, 0, Math.PI * 2);
      ctx.fill?.();
    }

    ctx.shadowBlur = 0;
    ctx.restore?.();
  }

  // 下水道微弱毒霧蒸汽
  drawSewerToxicMist(width: number, height: number, ctx: any, now: number): void {
    ctx.save?.();

    // 毒霧底色 (Toxic Mist Base)
    const mistGrad = ctx.createLinearGradient?.(0, height * 0.6, 0, height);
    if (mistGrad) {
      mistGrad.addColorStop(0, 'rgba(50, 100, 30, 0)');
      mistGrad.addColorStop(0.5, 'rgba(60, 120, 40, 0.12)');
      mistGrad.addColorStop(1, 'rgba(80, 150, 50, 0.25)');
      ctx.fillStyle = mistGrad;
      ctx.fillRect?.(0, 0, width, height);
    }

    // 蒸汽粒子 (Steam Particles)
    const steamCount = 25;
    for (let i = 0; i < steamCount; i++) {
      const baseX = (i * (width / steamCount) * 1.618) % width;
      const x = baseX + Math.sin(now * 0.0008 + i * 0.5) * 8;
      const y = height - ((now * 0.15 + i * 40) % (height * 0.5));
      const size = 30 + Math.sin(i * 0.5) * 20;
      const alpha = 0.04 + 0.03 * Math.sin(i * 0.7);

      ctx.fillStyle = `rgba(120, 200, 80, ${alpha})`;
      ctx.beginPath?.();
      ctx.arc?.(x, y, size, 0, Math.PI * 2);
      ctx.fill?.();
    }

    // 地面毒氣光暈 (Ground Toxic Glow)
    const groundGlow = ctx.createLinearGradient?.(0, height - 80, 0, height);
    if (groundGlow) {
      groundGlow.addColorStop(0, 'rgba(100, 180, 60, 0)');
      groundGlow.addColorStop(1, 'rgba(120, 200, 70, 0.15)');
      ctx.fillStyle = groundGlow;
      ctx.fillRect?.(0, height - 80, width, 80);
    }

    ctx.restore?.();
  }

  drawLaserSightAndLockOn(player: Player, robots: Robot[], camX: number, camY: number, ctx: any, now: number): void {
    const p = player as any;
    const px = Number(p?.x) || 0;
    const py = Number(p?.y) || 0;
    const facing = p?.facing || 'right';
    const weapon = p?.equippedWeapon;
    if (!weapon) return;

    const range = Number(weapon.range) || 5;
    const dmg = Number(weapon.power ?? weapon.damage ?? 0) || 0;
    const isQuantum = String(weapon.name || '').toUpperCase().includes('QUANTUM');
    const laserColor = isQuantum ? '#b388ff' : '#ff1e27';

    // Determine direction vector
    let dx = 0, dy = 0;
    if (facing === 'right') dx = 1;
    else if (facing === 'left') dx = -1;
    else if (facing === 'down') dy = 1;
    else if (facing === 'up') dy = -1;

    // Calculate end point of laser
    const endX = px + dx * range;
    const endY = py + dy * range;

    // Check for robots in the line of fire
    let lockedRobot: Robot | null = null;
    let lockedDist = Infinity;

    if (Array.isArray(robots)) {
      robots.forEach((robot) => {
        if (!robot || robot.isAlive === false) return;
        const rx = Number(robot.x);
        const ry = Number(robot.y);
        if (Number.isNaN(rx) || Number.isNaN(ry)) return;

        // Check if robot is in the line of fire
        if (dx !== 0 && dy === 0) {
          if (ry === py && ((dx > 0 && rx > px && rx <= endX) || (dx < 0 && rx < px && rx >= endX))) {
            const dist = Math.abs(rx - px);
            if (dist < lockedDist) {
              lockedDist = dist;
              lockedRobot = robot;
            }
          }
        } else if (dy !== 0 && dx === 0) {
          if (rx === px && ((dy > 0 && ry > py && ry <= endY) || (dy < 0 && ry < py && ry >= endY))) {
            const dist = Math.abs(ry - py);
            if (dist < lockedDist) {
              lockedDist = dist;
              lockedRobot = robot;
            }
          }
        }
      });
    }

    // Determine where to draw the red dot
    let dotX: number;
    let dotY: number;
    if (lockedRobot) {
      dotX = Number(lockedRobot.x);
      dotY = Number(lockedRobot.y);
    } else {
      dotX = endX;
      dotY = endY;
    }

    const sx = dotX * this.tileSize - camX + this.tileSize / 2;
    const sy = dotY * this.tileSize - camY + this.tileSize / 2;
    const pulse = 0.8 + 0.2 * Math.sin(now * 0.01);

    ctx.save?.();

    // Draw Red Dot Sight
    ctx.fillStyle = laserColor;
    ctx.shadowColor = laserColor;
    ctx.shadowBlur = 8 * pulse;
    ctx.globalAlpha = pulse;
    ctx.beginPath?.();
    ctx.arc?.(sx, sy, 2.5, 0, Math.PI * 2);
    ctx.fill?.();

    // White core
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 2;
    ctx.globalAlpha = 1;
    ctx.beginPath?.();
    ctx.arc?.(sx, sy, 1, 0, Math.PI * 2);
    ctx.fill?.();

    // Draw lock-on reticle if robot found
    if (lockedRobot) {
      const rx = Number(lockedRobot.x);
      const ry = Number(lockedRobot.y);
      const boxX = rx * this.tileSize - camX;
      const boxY = ry * this.tileSize - camY;

      ctx.strokeStyle = laserColor;
      ctx.shadowColor = laserColor;
      ctx.shadowBlur = 10;
      ctx.lineWidth = 2;
      ctx.globalAlpha = pulse;

      // Draw corner brackets
      const size = this.tileSize * 0.6;
      const offset = this.tileSize * 0.2;
      // Top-left
      ctx.beginPath?.();
      ctx.moveTo?.(boxX + offset, boxY + offset + size);
      ctx.lineTo?.(boxX + offset, boxY + offset);
      ctx.lineTo?.(boxX + offset + size, boxY + offset);
      ctx.stroke?.();
      // Top-right
      ctx.beginPath?.();
      ctx.moveTo?.(boxX + this.tileSize - offset - size, boxY + offset);
      ctx.lineTo?.(boxX + this.tileSize - offset, boxY + offset);
      ctx.lineTo?.(boxX + this.tileSize - offset, boxY + offset + size);
      ctx.stroke?.();
      // Bottom-left
      ctx.beginPath?.();
      ctx.moveTo?.(boxX + offset, boxY + this.tileSize - offset - size);
      ctx.lineTo?.(boxX + offset, boxY + this.tileSize - offset);
      ctx.lineTo?.(boxX + offset + size, boxY + this.tileSize - offset);
      ctx.stroke?.();
      // Bottom-right
      ctx.beginPath?.();
      ctx.moveTo?.(boxX + this.tileSize - offset - size, boxY + this.tileSize - offset);
      ctx.lineTo?.(boxX + this.tileSize - offset, boxY + this.tileSize - offset);
      ctx.lineTo?.(boxX + this.tileSize - offset, boxY + this.tileSize - offset - size);
      ctx.stroke?.();

      // Draw lock text
      ctx.globalAlpha = 1;
      ctx.fillStyle = laserColor;
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      const lockText = this.language === 'zh' ? `[鎖定: ${dmg} 傷害]` : `[LOCKED: ${dmg} DMG]`;
      ctx.fillText?.(lockText, boxX + this.tileSize / 2, boxY - 8);
    }

    ctx.shadowBlur = 0;
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

    const curSec = (player as any)?.currentSectorId;
    let sectorLabel = 'SECTOR 01';
    if (curSec === 'sector-2') sectorLabel = 'SECTOR 02';
    else if (curSec === 'sub-sector-0') sectorLabel = 'SECTOR 00';
    else if (curSec === 'sector-citadel') sectorLabel = 'CITADEL APEX';

    ctx.fillStyle = '#00e5ff';
    ctx.fillText?.(sectorLabel + ' [POS ' + px + ',' + py + ']', 12, 18);

    let secColor = '#00ff66';
    if (sec === 'SUSPICIOUS') secColor = '#ffea00';
    if (sec === 'ALERT') secColor = '#ff7700';
    if (sec === 'LOCKDOWN') secColor = '#ff1744';

    ctx.fillStyle = secColor;
    ctx.fillText?.('SEC: ' + sec, 190, 18);

    // 玩家等級與經驗值迷你進度條 (LV.X & XP Bar)
    const level = Number(p?.level ?? 1) || 1;
    const xp = Number(p?.exp ?? p?.xp ?? 0) || 0;
    const xpToNext = Number(p?.expToNext ?? p?.xpToNext ?? 100) || 100;
    const xpRatio = Math.max(0, Math.min(1, xp / xpToNext));

    ctx.fillStyle = '#ffea00';
    ctx.fillText?.('LV.' + level, 290, 18);

    // XP 進度條 (寬度 45px)
    const xpBarX = 330;
    const xpBarY = 14;
    const xpBarW = 45;
    const xpBarH = 8;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect?.(xpBarX, xpBarY, xpBarW, xpBarH);
    ctx.fillStyle = '#00e5ff';
    ctx.fillRect?.(xpBarX, xpBarY, xpBarW * xpRatio, xpBarH);
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.5)';
    ctx.lineWidth = 0.8;
    ctx.strokeRect?.(xpBarX, xpBarY, xpBarW, xpBarH);
    ctx.fillStyle = '#8899a6';
    ctx.font = '9px monospace';
    ctx.fillText?.(xp + '/' + xpToNext, xpBarX + xpBarW + 4, 18);
    ctx.font = 'bold 12px monospace';

    const hp = Math.max(0, p?.hp ?? 100);
    const maxHp = p?.maxHp ?? 100;
    ctx.fillStyle = '#ff2a4b';
    ctx.fillText?.('HP ' + hp + '/' + maxHp, 430, 18);

    const energy = Math.max(0, p?.energy ?? 100);
    const maxEnergy = p?.maxEnergy ?? 100;
    ctx.fillStyle = '#00f0ff';
    ctx.fillText?.('EN ' + energy + '/' + maxEnergy, 520, 18);

    const credits = p?.credits ?? 0;
    ctx.fillStyle = '#ffb700';
    ctx.fillText?.('CR: ' + credits, 610, 18);

    const weaponName = p?.equippedWeapon?.name || 'None';
    const weaponDmg = Number(p?.equippedWeapon?.power ?? p?.equippedWeapon?.damage ?? 0) || 0;
    const isQuantum = String(weaponName).toUpperCase().includes('QUANTUM');
    let weaponStatusText: string;
    let weaponColor: string;
    if (p?.isWeaponDrawn) {
      weaponStatusText = this.language === 'zh'
        ? `WEAPON: [ARMED - 按空白鍵開火] [Q: ${weaponName} (${weaponDmg} DMG)]`
        : `WEAPON: [ARMED - SPACE to fire] [Q: ${weaponName} (${weaponDmg} DMG)]`;
      weaponColor = isQuantum ? '#b388ff' : '#ff3855';
    } else {
      weaponStatusText = this.language === 'zh'
        ? `WEAPON: [F] HOLSTERED [Q: ${weaponName}]`
        : `WEAPON: [F] HOLSTERED [Q: ${weaponName}]`;
      weaponColor = '#8899a6';
    }
    ctx.fillStyle = weaponColor;
    ctx.fillText?.(weaponStatusText, 680, 18);

    let hudCursorX = 850;
    if ((this as any).activeWaypoint) {
      const wp = (this as any).activeWaypoint;
      const wpx = Number(wp?.x) || 0;
      const wpy = Number(wp?.y) || 0;
      const dx = wpx - px;
      const dy = wpy - py;
      const dist = Math.round(Math.hypot(dx, dy));
      let arrow = '•';
      if (dx === 0 && dy === 0) {
        arrow = '✓';
      } else {
        const angle = Math.atan2(dy, dx);
        const deg = ((angle * 180) / Math.PI + 360) % 360;
        if (deg < 22.5 || deg >= 337.5) arrow = '→';
        else if (deg < 67.5) arrow = '↘';
        else if (deg < 112.5) arrow = '↓';
        else if (deg < 157.5) arrow = '↙';
        else if (deg < 202.5) arrow = '←';
        else if (deg < 247.5) arrow = '↖';
        else if (deg < 292.5) arrow = '↑';
        else arrow = '↗';
      }
      const gpsText = `[ GPS: ${String(wp?.name ?? 'WAYPOINT')} ${dist}格 ${arrow} ]`;
      ctx.fillStyle = '#ffea00';
      ctx.fillText?.(gpsText, hudCursorX, 18);
      hudCursorX += (ctx.measureText ? ctx.measureText(gpsText).width : gpsText.length * 6) + 14;
    }

    if (p?.isDisguised) {
      ctx.fillStyle = '#b432ff';
      ctx.fillText?.('[DISGUISED]', hudCursorX, 18);
    }

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
        ctx.font = getFont(12, this.language === 'zh', true);
        ctx.fillText?.(text, width - 12, height - 36 + index * 16);
      });

      ctx.textAlign = 'left';
    }

    // 快捷補給品底欄 (Tactical Consumables HUD Strip)
    const medCount = p?.consumables?.medkits ?? 0;
    const batCount = p?.consumables?.batteries ?? 0;
    const empCount = p?.consumables?.empGrenades ?? 0;

    ctx.fillStyle = 'rgba(7, 13, 20, 0.85)';
    ctx.fillRect?.(0, height - 26, width, 26);
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect?.(0, height - 26, width, 1);

    ctx.font = 'bold 11px monospace';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#00ff88';
    ctx.fillText?.(`[1] MED: ${medCount}`, 10, height - 13);
    ctx.fillStyle = '#00e5ff';
    ctx.fillText?.(`[2] BAT: ${batCount}`, 95, height - 13);
    ctx.fillStyle = '#c77dff';
    ctx.fillText?.(`[3] EMP: ${empCount}`, 180, height - 13);
    ctx.fillStyle = '#ffaa00';
    ctx.fillText?.('[I] INV', 265, height - 13);
    ctx.fillStyle = '#00ffaa';
    ctx.fillText?.('[M] MISSIONS', 320, height - 13);
    ctx.fillStyle = '#ffb700';
    ctx.fillText?.('[L] ARCHIVE', 410, height - 13);
    ctx.fillStyle = '#00f0ff';
    ctx.fillText?.('[8] SAVE', 495, height - 13);
    ctx.fillStyle = '#b388ff';
    ctx.fillText?.('[9] LOAD', 555, height - 13);
    ctx.fillStyle = '#ffea00';
    ctx.fillText?.('[Z] ' + (this.language === 'zh' ? '中' : 'EN'), 615, height - 13);
    ctx.fillStyle = '#00ffaa';
    ctx.fillText?.('[B] BGM', 665, height - 13);
    ctx.fillStyle = this.isOmniVisionActive ? '#00ffff' : '#667788';
    ctx.fillText?.('[V] OMNI', 715, height - 13);
    ctx.fillStyle = this.isFullMapActive ? '#ffea00' : '#667788';
    ctx.fillText?.('[X] MAP', 770, height - 13);
    ctx.fillStyle = '#00f0ff';
    ctx.fillText?.('[0] RES', 825, height - 13);
    ctx.fillStyle = '#00ffcc';
    ctx.fillText?.('[TAB] MAP', 880, height - 13);
    ctx.fillStyle = '#ff3855';
    ctx.fillText?.('[F] DRAW', 940, height - 13);
    ctx.fillStyle = '#b388ff';
    ctx.fillText?.('[Q] SWAP', 1000, height - 13);

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

    ctx.fillStyle = 'rgba(2, 10, 6, 0.95)';
    ctx.fillRect?.(x, y, boxW, boxH);

    ctx.strokeStyle = '#00ff66';
    ctx.shadowColor = '#00ff66';
    ctx.shadowBlur = 10;
    ctx.lineWidth = 2;
    ctx.strokeRect?.(x + 1, y + 1, boxW - 2, boxH - 2);

    ctx.fillStyle = '#00ff66';
    ctx.font = 'bold 14px monospace';
    ctx.textBaseline = 'top';
    const title = String(t?.title ?? t?.name ?? 'METROPOLIS // SECURE TERMINAL').toUpperCase();
    ctx.fillText?.('[ ' + title + ' ]', x + 16, y + 16);

    ctx.fillStyle = '#00aa44';
    ctx.font = '11px monospace';
    ctx.fillText?.('TYPE HELP FOR COMMANDS, ESC TO DISCONNECT', x + 16, y + 36);

    ctx.strokeStyle = '#005522';
    ctx.lineWidth = 1;
    ctx.beginPath?.();
    ctx.moveTo?.(x + 16, y + 54);
    ctx.lineTo?.(x + boxW - 16, y + 54);
    ctx.stroke?.();

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

    const input = String(t?.input ?? t?.buffer ?? t?.value ?? '');
    const cursor = Math.sin(now * 0.01) > 0 ? '█' : '';
    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 13px monospace';
    ctx.fillText?.('> ' + input + cursor, x + 16, y + boxH - 28);

    ctx.shadowBlur = 0;
    ctx.restore?.();
  }

  // 居民對話框 (Resident Dialogue Box)
  drawDialogueBox(
    dialogue: DialogueSession,
    width: number,
    height: number,
    ctx: any,
    now: number
  ): void {
    const npc = dialogue.npc;
    const textIndex = dialogue.textIndex || 0;
    const isZh = this.language === 'zh';
    const currentRole = (isZh && npc.roleZh) ? npc.roleZh : npc.role;
    const dialogueList = isZh && Array.isArray(npc.dialogueZh) && npc.dialogueZh.length > 0 ? npc.dialogueZh : (Array.isArray(npc.dialogue) ? npc.dialogue : ['...']);
    const currentText = dialogueList[textIndex] || '...';
    const isLastLine = textIndex >= dialogueList.length - 1;

    ctx.save?.();

    const boxW = Math.min(width - 40, 720);
    const boxH = 140;
    const x = (width - boxW) / 2;
    const y = height - boxH - 28;

    // 半透明深色底框
    ctx.fillStyle = 'rgba(4, 10, 16, 0.95)';
    ctx.fillRect?.(x, y, boxW, boxH);

    const themeColor = npc.avatarColor || '#00e5ff';
    ctx.strokeStyle = themeColor;
    ctx.shadowColor = themeColor;
    ctx.shadowBlur = 8;
    ctx.lineWidth = 2;
    ctx.strokeRect?.(x + 1, y + 1, boxW - 2, boxH - 2);

    // 說話者標題
    ctx.fillStyle = themeColor;
    ctx.font = getTitleFont(14, isZh);
    ctx.textBaseline = 'top';
    const title = '[ ' + npc.name.toUpperCase() + ' // ' + String(currentRole ?? '').toUpperCase() + ' ]';
    ctx.fillText?.(title, x + 18, y + 14);

    ctx.strokeStyle = 'rgba(0, 229, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath?.();
    ctx.moveTo?.(x + 18, y + 34);
    ctx.lineTo?.(x + boxW - 18, y + 34);
    ctx.stroke?.();

    // 對話內容 (折行渲染)
    ctx.fillStyle = '#e8f8ff';
    ctx.font = getFont(14, isZh);
    ctx.shadowBlur = 0;

    const maxLineW = boxW - 40;
    const lineSpacing = isZh ? 22 : 18;
    const wrappedLines = wrapText(currentText, maxLineW, (s) => (ctx.measureText ? ctx.measureText(s).width : s.length * 8));
    wrappedLines.forEach((line, index) => {
      ctx.fillText?.(line, x + 20, y + 46 + index * lineSpacing);
    });

    // 底部按鍵提示
    const promptText = isLastLine
      ? (isZh ? '[ 空格 / ENTER ] 關閉對話    [ ESC ] 離開' : '[ SPACE / ENTER ] CLOSE DIALOGUE    [ ESC ] LEAVE')
      : (isZh ? '[ 空格 / ENTER ] 下一句 (▼)    [ ESC ] 離開' : '[ SPACE / ENTER ] NEXT (▼)    [ ESC ] LEAVE');
    const pulse = 0.7 + 0.3 * Math.sin(now * 0.008);
    ctx.fillStyle = 'rgba(0, 255, 170, ' + pulse + ')';
    ctx.font = getTitleFont(11, isZh);
    ctx.textAlign = 'right';
    ctx.fillText?.(promptText, x + boxW - 20, y + boxH - 16);

    ctx.restore?.();
  }

  // 戰術裝備與背包情報視窗 (Tactical Inventory Modal)
  drawInventoryModal(
    player: Player,
    width: number,
    height: number,
    ctx: any,
    now: number
  ): void {
    ctx.save?.();
    const boxW = Math.min(width - 40, 720);
    const boxH = Math.min(height - 60, 440);
    const x = (width - boxW) / 2;
    const y = (height - boxH) / 2;

    ctx.fillStyle = 'rgba(3, 8, 14, 0.96)';
    ctx.fillRect?.(x, y, boxW, boxH);

    ctx.strokeStyle = '#ffaa00';
    ctx.shadowColor = '#ffaa00';
    ctx.shadowBlur = 10;
    ctx.lineWidth = 2;
    ctx.strokeRect?.(x + 1, y + 1, boxW - 2, boxH - 2);

    ctx.fillStyle = '#ffaa00';
    ctx.font = getTitleFont(14, this.language === 'zh');
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillText?.('// RESISTANCE TACTICAL INVENTORY & CYBERDECK //', x + 20, y + 16);

    // 特工軍階稱號、等級、經驗進度與技能點數 (Agent Rank, Level, XP & Skill Points)
    const pInv = player as any;
    const invLevel = Number(pInv?.level ?? 1) || 1;
    const invXp = Number(pInv?.exp ?? pInv?.xp ?? 0) || 0;
    const invXpToNext = Number(pInv?.expToNext ?? pInv?.xpToNext ?? 100) || 100;
    const invXpRatio = Math.max(0, Math.min(1, invXp / invXpToNext));
    const skillPoints = Number(pInv?.skillPoints ?? 0) || 0;

    // 軍階稱號 (Agent Rank Title)
    let rankTitle = 'RECRUIT';
    if (invLevel >= 20) rankTitle = 'LEGENDARY OPERATIVE';
    else if (invLevel >= 15) rankTitle = 'MASTER GHOST';
    else if (invLevel >= 10) rankTitle = 'VETERAN SHADOW';
    else if (invLevel >= 5) rankTitle = 'SKILLED INFILTRATOR';
    else if (invLevel >= 3) rankTitle = 'PROVEN AGENT';
    else if (invLevel >= 2) rankTitle = 'FIELD OPERATIVE';

    const isZhInv = this.language === 'zh';
    const rankZh = isZhInv
      ? (invLevel >= 20 ? '傳奇特工' : invLevel >= 15 ? '大師幽影' : invLevel >= 10 ? '資深暗影' : invLevel >= 5 ? '熟練滲透者' : invLevel >= 3 ? '經驗特工' : invLevel >= 2 ? '外勤特工' : '新兵')
      : rankTitle;

    // 右側賽博風格顯示
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffea00';
    ctx.font = getTitleFont(12, isZhInv);
    ctx.fillText?.(`[LV.${invLevel} RANK: ${rankZh}]`, x + boxW - 20, y + 16);

    // XP 進度條 (右側)
    const invXpBarW = 120;
    const invXpBarH = 6;
    const invXpBarX = x + boxW - 20 - invXpBarW;
    const invXpBarY = y + 34;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect?.(invXpBarX, invXpBarY, invXpBarW, invXpBarH);
    ctx.fillStyle = '#00e5ff';
    ctx.fillRect?.(invXpBarX, invXpBarY, invXpBarW * invXpRatio, invXpBarH);
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.5)';
    ctx.lineWidth = 0.8;
    ctx.strokeRect?.(invXpBarX, invXpBarY, invXpBarW, invXpBarH);
    ctx.fillStyle = '#8899a6';
    ctx.font = '9px monospace';
    ctx.fillText?.(`XP: ${invXp}/${invXpToNext}`, x + boxW - 20, invXpBarY + 8);

    // 技能點數
    ctx.fillStyle = skillPoints > 0 ? '#00ff88' : '#445566';
    ctx.font = getTitleFont(11, isZhInv);
    ctx.fillText?.(`[SKILL PTS: ${skillPoints}]`, x + boxW - 20, y + 52);
    ctx.textAlign = 'left';

    ctx.fillStyle = '#8899a6';
    ctx.font = getFont(11, this.language === 'zh');
    const hotkeyText = this.language === 'zh'
      ? 'HOTKEYS: [Q] 切換武器 | [F] 拔槍/收槍 | [1] 醫療包 | [2] 電池 | [3] EMP | [I/ESC] 關閉'
      : 'HOTKEYS: [Q] SWAP WEAPON | [F] DRAW/HOLSTER | [1] MEDKIT | [2] BATTERY | [3] EMP | [I/ESC] CLOSE';
    ctx.fillText?.(hotkeyText, x + 20, y + 36);

    ctx.strokeStyle = 'rgba(255, 170, 0, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath?.();
    ctx.moveTo?.(x + 20, y + 54);
    ctx.lineTo?.(x + boxW - 20, y + 54);
    ctx.stroke?.();

    const colW = (boxW - 60) / 2;

    // 左欄：已配備戰術裝備
    ctx.fillStyle = '#00e5ff';
    ctx.font = getTitleFont(13, this.language === 'zh');
    ctx.fillText?.('► EQUIPPED CYBERWARE & WEAPONS', x + 20, y + 68);

    const p = player as any;
    const equippedWeapon = p?.equippedWeapon;
    const isZh = this.language === 'zh';

    // Dynamically build weapon display
    let weaponName = 'None';
    let weaponStat = 'ATK: 0 DMG';
    let weaponDesc = 'No weapon equipped.';
    let weaponColor = '#8899a6';

    if (equippedWeapon) {
      weaponName = equippedWeapon.name || 'Unknown Weapon';
      const dmg = Number(equippedWeapon.power ?? equippedWeapon.damage ?? 0) || 0;
      const en = equippedWeapon.energyCost || 0;
      const range = equippedWeapon.range || 0;
      const isQuantum = String(weaponName).toUpperCase().includes('QUANTUM');

      if (isQuantum) {
        weaponName = isZh ? '量子殲滅重砲 [★ 最強神兵]' : 'Quantum Annihilator [★ ULTIMATE]';
        weaponStat = `ATK: ${dmg} DMG (${en} EN) | 射程 ${range} | 破盾穿透`;
        weaponDesc = isZh ? '反物質加農砲，一擊必殺，穿透所有護盾。' : 'Antimatter cannon, one-shot kill, pierces all shields.';
        weaponColor = '#b388ff';
      } else {
        weaponStat = `ATK: ${dmg} DMG (${en} EN) | 射程 ${range}`;
        weaponDesc = equippedWeapon.description || 'Standard tactical weapon.';
        weaponColor = '#ff3855';
      }
    }

    const gear = [
      { name: weaponName, stat: weaponStat, desc: weaponDesc, color: weaponColor },
      { name: 'Nanite Mesh Shield', stat: 'DEF: 50% ABSORB (4 EN)', desc: 'Kinetic & energy deflection barrier activated upon impact.', color: '#00f0ff' },
      { name: 'Holo-Disguise Matrix', stat: 'STEALTH: 1 EN/turn', desc: 'Projects civilian signature. Deactivates if weapon drawn.', color: '#00e5ff' },
      { name: 'Neural Cyberdeck v2.4', stat: 'HACK: CLEARANCE LV-2', desc: 'Direct-link terminal hacking apparatus for security hubs.', color: '#c77dff' },
    ];

    gear.forEach((g, i) => {
      const gy = y + 92 + i * 54;
      ctx.fillStyle = 'rgba(15, 25, 35, 0.8)';
      ctx.fillRect?.(x + 20, gy, colW, 46);
      ctx.strokeStyle = g.color || '#005577';
      ctx.strokeRect?.(x + 20, gy, colW, 46);

      ctx.fillStyle = g.color || '#ffffff';
      ctx.font = getTitleFont(12, isZh);
      ctx.fillText?.(g.name, x + 28, gy + 8);

      ctx.fillStyle = '#00f0ff';
      ctx.font = getFont(11, isZh);
      ctx.fillText?.(g.stat, x + 28, gy + 22);

      ctx.fillStyle = '#7a8e99';
      ctx.font = getFont(11, isZh);
      ctx.fillText?.(g.desc, x + 28, gy + 34);
    });

    // List all owned weapons
    const weapons = p?.weapons || [];
    if (Array.isArray(weapons) && weapons.length > 0) {
      ctx.fillStyle = '#ffea00';
      ctx.font = getTitleFont(12, isZh);
      ctx.fillText?.('► OWNED WEAPONS', x + 20, y + 320);

      weapons.forEach((w, i) => {
        const wy = y + 338 + i * 18;
        const isEquipped = equippedWeapon && w.id === equippedWeapon.id;
        ctx.fillStyle = isEquipped ? '#00ff88' : '#8899a6';
        ctx.font = '10px monospace';
        const equipTag = isEquipped ? (isZh ? ' [已裝備]' : ' [EQUIPPED]') : '';
        ctx.fillText?.(`${w.name || 'Unknown'}${equipTag}`, x + 28, wy);
      });
    }

    // 右欄：野戰補給品與消耗性戰術物品
    const rx = x + 30 + colW;
    ctx.fillStyle = '#00ff88';
    ctx.font = getTitleFont(13, this.language === 'zh');
    ctx.fillText?.('► FIELD CONSUMABLES & TACTICAL ITEMS', rx, y + 68);

    const medkits = p?.consumables?.medkits ?? 0;
    const batteries = p?.consumables?.batteries ?? 0;
    const emps = p?.consumables?.empGrenades ?? 0;

    const items = [
      { key: '[1]', name: 'Nanite Stimpack', count: medkits, color: '#00ff88', effect: '+40 HP immediate cellular repair' },
      { key: '[2]', name: 'Plasma Energy Cell', count: batteries, color: '#00e5ff', effect: '+50 Energy capacitors reload' },
      { key: '[3]', name: 'EMP Disruptor Grenade', count: emps, color: '#c77dff', effect: 'Stuns all robots in radius 4 for 4 turns' },
      { key: '[CR]', name: 'Tzorg Credits', count: p?.credits ?? 0, color: '#ffea00', effect: 'Black market currency for informants' },
    ];

    items.forEach((it, i) => {
      const iy = y + 92 + i * 54;
      ctx.fillStyle = 'rgba(15, 30, 22, 0.8)';
      ctx.fillRect?.(rx, iy, colW, 46);
      ctx.strokeStyle = it.color;
      ctx.strokeRect?.(rx, iy, colW, 46);

      ctx.fillStyle = it.color;
      ctx.font = getTitleFont(12, this.language === 'zh');
      ctx.fillText?.(`${it.key} ${it.name} (x${it.count})`, rx + 10, iy + 8);

      ctx.fillStyle = '#a0b4b8';
      ctx.font = getFont(11, this.language === 'zh');
      ctx.fillText?.(it.effect, rx + 10, iy + 26);
    });

    // 已安裝義體清單 (Installed Augmentations)
    const installedAugments = [
      { id: 'DERMAL_ARMOR', name: 'Dermal Armor Plating', desc: 'Passive +10 DEF' },
      { id: 'OPTIC_HUD', name: 'Optic HUD Targeting', desc: 'Enemy HP overlays' },
      { id: 'REFLEX_BOOSTER', name: 'Reflex Booster', desc: 'Dodge & crit chance up' },
      { id: 'POWER_CORE', name: 'Overclocked Power Core', desc: '+50 Max Energy' },
    ];
    const augList = p?.augments ?? {};
    ctx.fillStyle = '#c77dff';
    ctx.font = getTitleFont(13, this.language === 'zh');
    ctx.fillText?.('► INSTALLED AUGMENTATIONS', rx, y + 320);
    installedAugments.forEach((aug, i) => {
      const ay = y + 338 + i * 18;
      const isInstalled = !!augList[aug.id];
      ctx.fillStyle = isInstalled ? '#00ff88' : '#445566';
      ctx.font = '10px monospace';
      ctx.fillText?.(`${isInstalled ? '[✓]' : '[ ]'} ${aug.name} — ${aug.desc}`, rx + 10, ay);
    });

    // 底部提示
    ctx.fillStyle = '#ffaa00';
    ctx.font = getTitleFont(11, this.language === 'zh');
    ctx.textAlign = 'center';
    ctx.fillText?.('PRESS [ 1 ], [ 2 ], [ 3 ] TO QUICK-USE  |  PRESS [ I ] OR [ ESC ] TO RESUME TACTICAL VIEW', x + boxW / 2, y + boxH - 18);

    ctx.shadowBlur = 0;
    ctx.restore?.();
  }

  // 任務目標情報日誌 (Mission Log Modal)
  drawMissionLogModal(
    objectives: MissionObjective[],
    width: number,
    height: number,
    ctx: any,
    now: number
  ): void {
    ctx.save?.();
    const boxW = Math.min(width - 40, 680);
    const boxH = Math.min(height - 60, 420);
    const x = (width - boxW) / 2;
    const y = (height - boxH) / 2;

    ctx.fillStyle = 'rgba(4, 12, 20, 0.96)';
    ctx.fillRect?.(x, y, boxW, boxH);

    ctx.strokeStyle = '#00e5ff';
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 10;
    ctx.lineWidth = 2;
    ctx.strokeRect?.(x + 1, y + 1, boxW - 2, boxH - 2);

    ctx.fillStyle = '#00e5ff';
    ctx.font = getTitleFont(14, this.language === 'zh');
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillText?.('// RESISTANCE MISSION INTEL & DIRECTIVES //', x + 20, y + 16);

    ctx.fillStyle = '#6a8e99';
    ctx.font = '11px monospace';
    ctx.fillText?.('SECTOR 1 INFILTRATION PROTOCOL // STATUS: ACTIVE', x + 20, y + 36);

    ctx.strokeStyle = 'rgba(0, 229, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath?.();
    ctx.moveTo?.(x + 20, y + 54);
    ctx.lineTo?.(x + boxW - 20, y + 54);
    ctx.stroke?.();

    objectives.forEach((obj, i) => {
      const oy = y + 70 + i * 62;
      const isDone = obj.completed;

      ctx.fillStyle = isDone ? 'rgba(0, 40, 25, 0.6)' : 'rgba(15, 25, 35, 0.7)';
      ctx.fillRect?.(x + 20, oy, boxW - 40, 52);

      ctx.strokeStyle = isDone ? '#00ff88' : '#005577';
      ctx.strokeRect?.(x + 20, oy, boxW - 40, 52);

      // Checkbox
      ctx.fillStyle = isDone ? '#00ff88' : '#ff3855';
      ctx.font = 'bold 12px monospace';
      ctx.fillText?.(isDone ? '[✓] COMPLETE' : '[ ] ACTIVE', x + 30, oy + 10);

      ctx.fillStyle = isDone ? '#ffffff' : '#d0e5f2';
      ctx.font = getTitleFont(12, this.language === 'zh');
      ctx.fillText?.(obj.title, x + 150, oy + 10);

      ctx.fillStyle = '#8aa0aa';
      ctx.font = getFont(11, this.language === 'zh');
      ctx.fillText?.(obj.description, x + 30, oy + 30);
    });

    ctx.fillStyle = '#00e5ff';
    ctx.font = getTitleFont(11, this.language === 'zh');
    ctx.textAlign = 'center';
    ctx.fillText?.('PRESS [ M ] OR [ ESC ] TO CLOSE MISSION INTEL', x + boxW / 2, y + boxH - 18);

    ctx.shadowBlur = 0;
    ctx.restore?.();
  }

  drawGameOverOverlay(width: number, height: number, ctx: any, now: number): void {
    ctx.save?.();
    ctx.fillStyle = 'rgba(15, 0, 5, 0.85)';
    ctx.fillRect?.(0, 0, width, height);

    const pulse = 0.8 + 0.2 * Math.sin(now * 0.005);
    ctx.fillStyle = 'rgba(255, 30, 50, ' + pulse + ')';
    ctx.shadowColor = '#ff1e32';
    ctx.shadowBlur = 12;
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText?.('// OPERATIVE ELIMINATED //', width / 2, height / 2 - 20);

    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 0;
    ctx.font = '13px monospace';
    ctx.fillText?.('PRESS [ R ] TO RE-INITIALIZE RESISTANCE PROTOCOL', width / 2, height / 2 + 20);

    ctx.restore?.();
  }

  // 故事數據晶片檔案閱讀器 (Encrypted Data Slate Story Viewer)
  drawStoryLogModal(
    log: StoryLog,
    width: number,
    height: number,
    ctx: any,
    now: number
  ): void {
    ctx.save?.();
    const boxW = Math.min(width - 40, 720);
    const boxH = Math.min(height - 60, 440);
    const x = (width - boxW) / 2;
    const y = (height - boxH) / 2;
    const isZh = this.language === 'zh';
    const isUnlocked = log.read !== false;

    ctx.fillStyle = 'rgba(2, 8, 14, 0.97)';
    ctx.fillRect?.(x, y, boxW, boxH);

    const borderColor = isUnlocked ? '#00e5ff' : '#ff5533';
    ctx.strokeStyle = borderColor;
    ctx.shadowColor = borderColor;
    ctx.shadowBlur = 12;
    ctx.lineWidth = 2;
    ctx.strokeRect?.(x + 1, y + 1, boxW - 2, boxH - 2);

    ctx.fillStyle = borderColor;
    ctx.font = 'bold 13px monospace';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    const headerText = isUnlocked
      ? '// TZORG INTELLIGENCE ARCHIVE // CLASSIFIED RECORD //'
      : '// TZORG ENCRYPTION // ACCESS RESTRICTED //';
    ctx.fillText?.(headerText, x + 24, y + 18);

    const logTitle = isZh && log.titleZh ? log.titleZh : log.title;
    const titlePrefix = isUnlocked ? '► ' : '🔒 ';
    const titleColor = isUnlocked ? '#ffea00' : '#ff7755';
    const contentColor = isUnlocked ? '#e4f4fc' : '#ffccaa';

    ctx.fillStyle = titleColor;
    ctx.font = getTitleFont(14, isZh);
    ctx.fillText?.(titlePrefix + logTitle.toUpperCase(), x + 24, y + 38);

    ctx.fillStyle = '#8aa0b2';
    ctx.font = '10px monospace';
    ctx.fillText?.(`OPERATIVE: RAVEN  |  SOURCE: ${log.author}  |  TIMESTAMP: ${log.timestamp}`, x + 24, y + 56);

    ctx.strokeStyle = isUnlocked ? 'rgba(0, 229, 255, 0.35)' : 'rgba(255, 119, 85, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath?.();
    ctx.moveTo?.(x + 24, y + 72);
    ctx.lineTo?.(x + boxW - 24, y + 72);
    ctx.stroke?.();

    ctx.fillStyle = contentColor;
    ctx.font = getFont(14, isZh);
    let lineY = y + 84;
    const maxLineW = boxW - 48;

    const paragraphs = isZh && Array.isArray(log.contentZh) && log.contentZh.length > 0 ? log.contentZh : (Array.isArray(log.content) ? log.content : [String(log.content)]);
    paragraphs.forEach((paragraph) => {
      const lines = wrapText(paragraph, maxLineW, (s) => (ctx.measureText ? ctx.measureText(s).width : s.length * 8));
      lines.forEach((l) => {
        ctx.fillText?.('  ' + l, x + 24, lineY);
        lineY += isZh ? 22 : 18;
      });
      lineY += 6;
    });

    const pulse = 0.7 + 0.3 * Math.sin(now * 0.008);
    ctx.fillStyle = `rgba(${isUnlocked ? '0, 229, 255' : '255, 85, 51'}, ${pulse})`;
    ctx.font = getTitleFont(12, isZh);
    ctx.textAlign = 'center';
    const footerText = isZh
      ? '按 [ 空白鍵 ]、[ ENTER ] 或 [ ESC ] 關閉檔案記錄  |  按 [ Z ] 切換中英文'
      : 'PRESS [ SPACE ] OR [ ENTER ] OR [ ESC ] TO CLOSE  |  [ Z ] SWITCH LANGUAGE';
    ctx.fillText?.(footerText, x + boxW / 2, y + boxH - 18);

    ctx.shadowBlur = 0;
    ctx.restore?.();
  }

  // 反抗軍資料庫總覽視窗 (Story Archive Modal)
  drawStoryArchiveModal(
    logs: StoryLog[],
    width: number,
    height: number,
    ctx: any,
    now: number
  ): void {
    ctx.save?.();
    const boxW = Math.min(width - 40, 720);
    const boxH = Math.min(height - 60, 440);
    const x = (width - boxW) / 2;
    const y = (height - boxH) / 2;
    const isZh = this.language === 'zh';

    ctx.fillStyle = 'rgba(4, 10, 16, 0.97)';
    ctx.fillRect?.(x, y, boxW, boxH);

    ctx.strokeStyle = '#ff9900';
    ctx.shadowColor = '#ff9900';
    ctx.shadowBlur = 10;
    ctx.lineWidth = 2;
    ctx.strokeRect?.(x + 1, y + 1, boxW - 2, boxH - 2);

    ctx.fillStyle = '#ff9900';
    ctx.font = getTitleFont(14, isZh);
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    const headerText = isZh ? '// 反抗軍歷史數據檔案庫 // 第一分區情報主機 //' : '// RESISTANCE LORE ARCHIVES // SECTOR 1 DATA BANK //';
    ctx.fillText?.(headerText, x + 20, y + 16);

    const readCount = logs.filter((l) => l.read).length;
    ctx.fillStyle = '#8aa0aa';
    ctx.font = getFont(11, isZh);
    const subHeaderText = isZh
      ? `已解密記憶數據板：${readCount} / ${logs.length}（按 [1-4] 閱讀，按 [Z] 切換語言）`
      : `RECOVERED DATA SLATES: ${readCount} / ${logs.length} FOUND (Press [1-4] to read, [Z] for Lang)`;
    ctx.fillText?.(subHeaderText, x + 20, y + 36);

    ctx.strokeStyle = 'rgba(255, 153, 0, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath?.();
    ctx.moveTo?.(x + 20, y + 54);
    ctx.lineTo?.(x + boxW - 20, y + 54);
    ctx.stroke?.();

    const selectedIndex = (this as any).storyArchiveSelectedIndex ?? 0;

    logs.forEach((log, i) => {
      const ly = y + 66 + i * 80;
      const isFound = log.read;
      const isSelected = selectedIndex === i;

      ctx.fillStyle = isFound ? 'rgba(15, 28, 38, 0.7)' : 'rgba(10, 15, 20, 0.5)';
      ctx.fillRect?.(x + 20, ly, boxW - 40, 70);

      if (isSelected) {
        ctx.strokeStyle = '#ffea00';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#ffea00';
        ctx.shadowBlur = 8;
      } else {
        ctx.strokeStyle = isFound ? '#00e5ff' : '#334455';
        ctx.lineWidth = 1;
        ctx.shadowBlur = 0;
      }
      ctx.strokeRect?.(x + 20, ly, boxW - 40, 70);

      ctx.fillStyle = isFound ? '#00e5ff' : '#667788';
      ctx.font = getTitleFont(12, isZh);
      const logTitle = isZh && log.titleZh ? log.titleZh : log.title;
      const prefix = isSelected ? '► ' : '  ';
      const slateLabel = `${prefix}[ ${i + 1} ] [ ${isZh ? '數據板' : 'SLATE'} 0${i + 1} ] ${isFound ? logTitle : (isZh ? '// 🔒 加密鎖定（按此查閱線索）//' : '// 🔒 ENCRYPTED (PRESS TO VIEW INTEL) //')}`;
      ctx.fillText?.(slateLabel, x + 30, ly + 10);

      ctx.fillStyle = isFound ? '#ffea00' : '#445566';
      ctx.font = getFont(10, isZh);
      const sourceText = isFound
        ? isZh
          ? `來源：${log.author} | 日期戳：${log.timestamp}`
          : `SOURCE: ${log.author} | DATE: ${log.timestamp}`
        : isZh
          ? '搜索第一分區物資據點以回收此記憶磁碟'
          : 'SEARCH SECTOR 1 DEPOTS TO RECOVER DISK';
      ctx.fillText?.(sourceText, x + 30, ly + 28);

      ctx.fillStyle = isFound ? '#c0d4de' : '#334455';
      ctx.font = getFont(10, isZh);
      const snippet = isFound
        ? ((log.contentZh?.[0] || log.content[0] || '').slice(0, 80) + '...')
        : isZh
          ? '存取權限受佐格防火牆嚴格限制。'
          : 'Access restricted by Tzorg firewall.';
      ctx.fillText?.(snippet, x + 30, ly + 46);
    });

    ctx.fillStyle = '#ff9900';
    ctx.font = getTitleFont(11, isZh);
    ctx.textAlign = 'center';
    const footerText = isZh
      ? '按 [ 1-4 ] 或 [ ↑/↓ ] 選擇按 [ ENTER ] 閱讀  |  支援滑鼠點擊卡片  |  按 [ Z ] 切換語言  |  [ L / ESC ] 關閉'
      : 'PRESS [ 1-4 ] OR [ UP/DOWN + ENTER ] TO READ  |  CLICK TO OPEN  |  [ Z ] SWITCH LANG  |  [ L / ESC ] CLOSE';
    ctx.fillText?.(footerText, x + boxW / 2, y + boxH - 18);

    ctx.shadowBlur = 0;
    ctx.restore?.();
  }

  drawVictoryOverlay(player: Player, width: number, height: number, ctx: any, now: number): void {
    ctx.save?.();
    ctx.fillStyle = 'rgba(0, 20, 15, 0.85)';
    ctx.fillRect?.(0, 0, width, height);

    const p = player as any;
    const endgameChoice = String(p?.endgameChoice ?? '').toUpperCase();

    let title = '★ MISSION ACCOMPLISHED ★';
    let subtitle = 'TZORG SECURITY FORCEFIELD PERFORATED // NEXUS ACCESSED';
    let poem = '';
    let accentColor = '#00ff88';
    let shadowColor = '#00ff88';

    if (endgameChoice === 'OVERLOAD') {
      title = '☢ NEXUS OVERLOAD ☢';
      subtitle = 'THE CORE BURNS // SECTOR 1 DROPS INTO SILENCE';
      poem = 'We fed the machine our rage and it answered in fire.\nEvery screen went white, every drone fell from the sky.\nThe city breathes again — scarred, but free.';
      accentColor = '#ff4444';
      shadowColor = '#ff2200';
    } else if (endgameChoice === 'SUBVERSION') {
      title = '◈ GHOST PROTOCOL ◈';
      subtitle = 'TZORG MAINFRAME REWRITTEN // NO TRACE REMAINS';
      poem = 'No explosion, no alarm — just a whisper in the wire.\nTheir own walls now speak our names in the dark.\nThe rebellion lives in code, invisible and eternal.';
      accentColor = '#00e5ff';
      shadowColor = '#0088ff';
    } else if (endgameChoice === 'EVACUATION') {
      title = '▲ EXTRACTION COMPLETE ▲';
      subtitle = 'RESISTANCE CELL PRESERVED // SECTOR 1 ABANDONED';
      poem = 'We left the neon streets to the machines, but carried the spark.\nSomewhere beyond the grid, new cells are forming.\nThe fight does not end — it only changes address.';
      accentColor = '#ffea00';
      shadowColor = '#ffaa00';
    } else if (endgameChoice === 'AWAKEN') {
      const isZh = this.language === 'zh';
      title = isZh ? '★ 全民大覺醒 (THE GREAT AWAKENING) ★' : '★ THE GREAT AWAKENING ★';
      subtitle = isZh ? '五百萬人神經項圈解除 // 大都會全面光復' : 'FIVE MILLION CITIZENS LIBERATED // TOTAL RESTORATION';
      poem = isZh
        ? '逆向廣播脈衝刺破了三代人的永夜巨蛋。\n工廠停擺、合成項圈解鎖，五百萬沉睡的神智迎來曙光。\n這不是代碼的終點，而是人類新生的拂曉。'
        : 'The inverse pulse shattered three generations of synthetic sleep.\nCollars dropped, factories ceased, and five million souls opened their eyes.\nNot an end of code, but the golden dawn of humankind.';
      accentColor = '#00ff88';
      shadowColor = '#00ffaa';
    }

    const pulse = 0.8 + 0.2 * Math.sin(now * 0.005);
    ctx.fillStyle = accentColor;
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = 15;
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = pulse;
    ctx.fillText?.(title, width / 2, height / 2 - 50);
    ctx.globalAlpha = 1;

    ctx.fillStyle = '#00f0ff';
    ctx.font = '14px monospace';
    ctx.fillText?.(subtitle, width / 2, height / 2 - 20);

    if (poem) {
      ctx.fillStyle = '#c0d4de';
      ctx.font = 'italic 12px monospace';
      const poemLines = poem.split('\n');
      poemLines.forEach((line, i) => {
        ctx.fillText?.(line, width / 2, height / 2 + 5 + i * 18);
      });
    }

    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 0;
    ctx.font = '12px monospace';
    ctx.fillText?.('PRESS [ R ] TO RESTART SIMULATION', width / 2, height / 2 + 70);

    ctx.restore?.();
  }

  // 義體改裝診所 (Augmentation Clinic Modal)
  drawAugmentShopModal(
    player: Player,
    width: number,
    height: number,
    ctx: any,
    now: number
  ): void {
    ctx.save?.();
    const boxW = Math.min(width - 40, 720);
    const boxH = Math.min(height - 60, 460);
    const x = (width - boxW) / 2;
    const y = (height - boxH) / 2;

    ctx.fillStyle = 'rgba(2, 6, 12, 0.97)';
    ctx.fillRect?.(x, y, boxW, boxH);

    ctx.strokeStyle = '#c77dff';
    ctx.shadowColor = '#c77dff';
    ctx.shadowBlur = 12;
    ctx.lineWidth = 2;
    ctx.strokeRect?.(x + 1, y + 1, boxW - 2, boxH - 2);

    ctx.fillStyle = '#c77dff';
    ctx.font = 'bold 14px monospace';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillText?.('// JAX\'S BLACK MARKET CYBER-CLINIC //', x + 20, y + 16);

    const p = player as any;
    const credits = p?.credits ?? 0;
    ctx.fillStyle = '#ffea00';
    ctx.font = 'bold 12px monospace';
    ctx.fillText?.('YOUR CREDITS: ' + credits + ' CR', x + 20, y + 38);

    ctx.fillStyle = '#8aa0b2';
    ctx.font = '10px monospace';
    ctx.fillText?.('WARNING: UNLICENSED SURGERY. NO REFUNDS. NO GUARANTEES.', x + 20, y + 54);

    ctx.strokeStyle = 'rgba(199, 125, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath?.();
    ctx.moveTo?.(x + 20, y + 70);
    ctx.lineTo?.(x + boxW - 20, y + 70);
    ctx.stroke?.();

    const augments = [
      { key: '[1]', id: 'DERMAL_ARMOR', name: 'Dermal Armor Plating', effect: 'Passive +10 DEF. Subdermal kinetic mesh.', price: 200 },
      { key: '[2]', id: 'OPTIC_HUD', name: 'Optic HUD Targeting', effect: 'Enemy HP overlays & threat tracking.', price: 250 },
      { key: '[3]', id: 'REFLEX_BOOSTER', name: 'Reflex Booster', effect: '+15% dodge & +10% crit chance.', price: 300 },
      { key: '[4]', id: 'POWER_CORE', name: 'Overclocked Power Core', effect: '+50 Max Energy capacity.', price: 350 },
    ];
    const installed = p?.augments ?? {};

    augments.forEach((aug, i) => {
      const ay = y + 84 + i * 78;
      const isInstalled = !!installed[aug.id];
      const canAfford = credits >= aug.price;

      ctx.fillStyle = isInstalled ? 'rgba(20, 40, 30, 0.75)' : 'rgba(15, 15, 30, 0.75)';
      ctx.fillRect?.(x + 20, ay, boxW - 40, 68);
      ctx.strokeStyle = isInstalled ? '#00ff88' : canAfford ? '#c77dff' : '#445566';
      ctx.strokeRect?.(x + 20, ay, boxW - 40, 68);

      ctx.fillStyle = isInstalled ? '#00ff88' : '#ffffff';
      ctx.font = 'bold 12px monospace';
      ctx.fillText?.(aug.name, x + 32, ay + 10);

      ctx.fillStyle = '#8aa0b2';
      ctx.font = '10px monospace';
      ctx.fillText?.(aug.effect, x + 32, ay + 28);

      ctx.fillStyle = isInstalled ? '#00ff88' : canAfford ? '#ffea00' : '#ff3855';
      ctx.font = 'bold 11px monospace';
      ctx.fillText?.(isInstalled ? '[INSTALLED]' : aug.price + ' CR', x + 32, ay + 46);

      if (!isInstalled) {
        ctx.fillStyle = canAfford ? '#c77dff' : '#445566';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'right';
        ctx.fillText?.(canAfford ? aug.key + ' BUY' : 'INSUFFICIENT CR', x + boxW - 32, ay + 46);
        ctx.textAlign = 'left';
      }
    });

    const pulse = 0.7 + 0.3 * Math.sin(now * 0.008);
    ctx.fillStyle = `rgba(199, 125, 255, ${pulse})`;
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText?.('PRESS [ 1 ]-[ 4 ] TO PURCHASE  |  PRESS [ U ] OR [ ESC ] TO LEAVE CLINIC', x + boxW / 2, y + boxH - 18);

    ctx.shadowBlur = 0;
    ctx.restore?.();
  }

  drawManualModal(width: number, height: number, ctx: any, now: number, language: Language): void {
    drawManualModal(width, height, ctx, now, language);
  }

  drawBreachModal(session: BreachSession, width: number, height: number, ctx: any, now: number, language: Language): void {
    drawBreachModal(session, width, height, ctx, now, language);
  }
}
