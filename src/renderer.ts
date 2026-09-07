// @ts-nocheck
// eslint-disable
import type { SectorMap, Player, Robot, SecurityLevel, GameMessage, TerminalData, DialogueSession, NPC, GroundItem, MissionObjective, StoryLog, Hazard } from './types';
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
    laserBeams?: Array<{ from: Position; to: Position; color: string }>,
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
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
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

    // 8. 繪製雷射彈道光束
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

    // 10. 畫面周圍氛圍暗角 (Vignette & Scanline Overlay)
    this.drawScreenAtmosphere(width, height, ctx);

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

    // 14.7 故事數據檔案閱讀器 (Data Slate Story Viewer)
    if (activeStoryLog) {
      this.drawStoryLogModal(activeStoryLog, width, height, ctx, now);
    }

    // 14.8 反抗軍資料庫視窗 (Story Archive Modal)
    if (isStoryArchiveOpen) {
      this.drawStoryArchiveModal(storyLogs ?? [], width, height, ctx, now);
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
        this.language
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

    drawTileSprite(ctx, tile ?? 'FLOOR', sx, sy, this.tileSize, visible, now);
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

    ctx.fillStyle = '#00e5ff';
    ctx.fillText?.('SECTOR 01 [POS ' + px + ',' + py + ']', 12, 18);

    let secColor = '#00ff66';
    if (sec === 'SUSPICIOUS') secColor = '#ffea00';
    if (sec === 'ALERT') secColor = '#ff7700';
    if (sec === 'LOCKDOWN') secColor = '#ff1744';

    ctx.fillStyle = secColor;
    ctx.fillText?.('SEC: ' + sec, 175, 18);

    const hp = Math.max(0, p?.hp ?? 100);
    const maxHp = p?.maxHp ?? 100;
    ctx.fillStyle = '#ff2a4b';
    ctx.fillText?.('HP ' + hp + '/' + maxHp, 280, 18);

    const energy = Math.max(0, p?.energy ?? 100);
    const maxEnergy = p?.maxEnergy ?? 100;
    ctx.fillStyle = '#00f0ff';
    ctx.fillText?.('EN ' + energy + '/' + maxEnergy, 380, 18);

    const credits = p?.credits ?? 0;
    ctx.fillStyle = '#ffb700';
    ctx.fillText?.('CR: ' + credits, 480, 18);

    const weaponStatus = p?.isWeaponDrawn ? 'WEAPON: ARMED' : 'WEAPON: HOLSTER';
    const weaponName = p?.equippedWeapon?.name ? ' [Q: ' + p.equippedWeapon.name + ']' : '';
    ctx.fillStyle = p?.isWeaponDrawn ? '#ff3855' : '#8899a6';
    ctx.fillText?.(weaponStatus + weaponName, 570, 18);

    if (p?.isDisguised) {
      ctx.fillStyle = '#b432ff';
      ctx.fillText?.('[DISGUISED]', 700, 18);
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

    ctx.fillStyle = '#8899a6';
    ctx.font = getFont(11, this.language === 'zh');
    ctx.fillText?.('HOTKEYS: [1] USE MEDKIT  |  [2] USE BATTERY  |  [3] THROW EMP  |  [I / ESC] CLOSE', x + 20, y + 36);

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

    const gear = [
      { name: 'Laser Blaster Mk-II', stat: 'ATK: 35 DMG (5 EN)', desc: 'High-density coherent pulse rifle. Silent backstabs deal 3x dmg.' },
      { name: 'Nanite Mesh Shield', stat: 'DEF: 50% ABSORB (4 EN)', desc: 'Kinetic & energy deflection barrier activated upon impact.' },
      { name: 'Holo-Disguise Matrix', stat: 'STEALTH: 1 EN/turn', desc: 'Projects civilian signature. Deactivates if weapon drawn.' },
      { name: 'Neural Cyberdeck v2.4', stat: 'HACK: CLEARANCE LV-2', desc: 'Direct-link terminal hacking apparatus for security hubs.' },
    ];

    gear.forEach((g, i) => {
      const gy = y + 92 + i * 54;
      ctx.fillStyle = 'rgba(15, 25, 35, 0.8)';
      ctx.fillRect?.(x + 20, gy, colW, 46);
      ctx.strokeStyle = '#005577';
      ctx.strokeRect?.(x + 20, gy, colW, 46);

      ctx.fillStyle = '#ffffff';
      ctx.font = getTitleFont(12, this.language === 'zh');
      ctx.fillText?.(g.name, x + 28, gy + 8);

      ctx.fillStyle = '#00f0ff';
      ctx.font = getFont(11, this.language === 'zh');
      ctx.fillText?.(g.stat, x + 28, gy + 22);

      ctx.fillStyle = '#7a8e99';
      ctx.font = getFont(11, this.language === 'zh');
      ctx.fillText?.(g.desc, x + 28, gy + 34);
    });

    // 右欄：野戰補給品與消耗性戰術物品
    const rx = x + 30 + colW;
    ctx.fillStyle = '#00ff88';
    ctx.font = getTitleFont(13, this.language === 'zh');
    ctx.fillText?.('► FIELD CONSUMABLES & TACTICAL ITEMS', rx, y + 68);

    const p = player as any;
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

    ctx.fillStyle = 'rgba(2, 8, 14, 0.97)';
    ctx.fillRect?.(x, y, boxW, boxH);

    ctx.strokeStyle = '#00e5ff';
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 12;
    ctx.lineWidth = 2;
    ctx.strokeRect?.(x + 1, y + 1, boxW - 2, boxH - 2);

    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 13px monospace';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillText?.('// TZORG INTELLIGENCE ARCHIVE // CLASSIFIED RECORD //', x + 24, y + 18);

    const isZh = this.language === 'zh';
    const logTitle = isZh && log.titleZh ? log.titleZh : log.title;
    ctx.fillStyle = '#ffea00';
    ctx.font = getTitleFont(14, isZh);
    ctx.fillText?.('► ' + logTitle.toUpperCase(), x + 24, y + 38);

    ctx.fillStyle = '#8aa0b2';
    ctx.font = '10px monospace';
    ctx.fillText?.(`OPERATIVE: RAVEN  |  SOURCE: ${log.author}  |  TIMESTAMP: ${log.timestamp}`, x + 24, y + 56);

    ctx.strokeStyle = 'rgba(0, 229, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath?.();
    ctx.moveTo?.(x + 24, y + 72);
    ctx.lineTo?.(x + boxW - 24, y + 72);
    ctx.stroke?.();

    ctx.fillStyle = '#e4f4fc';
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
    ctx.fillStyle = `rgba(0, 229, 255, ${pulse})`;
    ctx.font = getTitleFont(12, isZh);
    ctx.textAlign = 'center';
    ctx.fillText?.('PRESS [ SPACE ] OR [ ENTER ] OR [ ESC ] TO CLOSE ARCHIVAL RECORD', x + boxW / 2, y + boxH - 18);

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

    ctx.fillStyle = 'rgba(4, 10, 16, 0.97)';
    ctx.fillRect?.(x, y, boxW, boxH);

    ctx.strokeStyle = '#ff9900';
    ctx.shadowColor = '#ff9900';
    ctx.shadowBlur = 10;
    ctx.lineWidth = 2;
    ctx.strokeRect?.(x + 1, y + 1, boxW - 2, boxH - 2);

    ctx.fillStyle = '#ff9900';
    ctx.font = 'bold 14px monospace';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillText?.('// RESISTANCE LORE ARCHIVES // SECTOR 1 DATA BANK //', x + 20, y + 16);

    const readCount = logs.filter((l) => l.read).length;
    ctx.fillStyle = '#8aa0aa';
    ctx.font = '11px monospace';
    ctx.fillText?.(`RECOVERED DATA SLATES: ${readCount} / ${logs.length} FOUND IN SECTOR`, x + 20, y + 36);

    ctx.strokeStyle = 'rgba(255, 153, 0, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath?.();
    ctx.moveTo?.(x + 20, y + 54);
    ctx.lineTo?.(x + boxW - 20, y + 54);
    ctx.stroke?.();

    logs.forEach((log, i) => {
      const ly = y + 66 + i * 80;
      const isFound = log.read;

      ctx.fillStyle = isFound ? 'rgba(15, 28, 38, 0.7)' : 'rgba(10, 15, 20, 0.5)';
      ctx.fillRect?.(x + 20, ly, boxW - 40, 70);

      ctx.strokeStyle = isFound ? '#00e5ff' : '#334455';
      ctx.strokeRect?.(x + 20, ly, boxW - 40, 70);

      ctx.fillStyle = isFound ? '#00e5ff' : '#667788';
      ctx.font = 'bold 12px monospace';
      ctx.fillText?.(
        isFound ? `[ SLATE 0${i + 1} ] ${log.title}` : `[ SLATE 0${i + 1} ] // ENCRYPTED DATA CORRUPTED //`,
        x + 30,
        ly + 10
      );

      ctx.fillStyle = isFound ? '#ffea00' : '#445566';
      ctx.font = '10px monospace';
      ctx.fillText?.(
        isFound ? `SOURCE: ${log.author} | DATE: ${log.timestamp}` : 'SEARCH SECTOR 1 DEPOTS TO RECOVER DISK',
        x + 30,
        ly + 28
      );

      ctx.fillStyle = isFound ? '#c0d4de' : '#334455';
      ctx.font = '10px monospace';
      const snippet = isFound
        ? (log.content[0] ? log.content[0].slice(0, 80) + '...' : '')
        : 'Access restricted by Tzorg firewall.';
      ctx.fillText?.(snippet, x + 30, ly + 46);
    });

    ctx.fillStyle = '#ff9900';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText?.('PRESS [ L ] OR [ ESC ] TO RETURN TO TACTICAL VIEW', x + boxW / 2, y + boxH - 18);

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
