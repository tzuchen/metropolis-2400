import type { SectorMap, Player, Robot, SecurityLevel, GameMessage, TerminalData, DialogueSession, NPC, GroundItem, MissionObjective, StoryLog, Hazard, LaserBeam, PushableBlock } from './types';
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
import type { FXManager } from './fx';
import { BeamRenderer } from './beamRenderer';
import { AtmosphereRenderer } from './atmosphereRenderer';

export type Position = { x: number; y: number };
export type Language = 'zh' | 'en';

interface DefeatCutscene {
  stage: string;
  stageStartTime: number;
  duration: number;
  playerDownPos?: { x: number; y: number };
}

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
  graffitiMuralComplete: boolean = false;
  defeatCutscene: DefeatCutscene | null = null;
  titleMenuIndex: number = 0;
  fx: FXManager | null = null;
  activeWaypoint: { x: number; y: number; name: string } | null = null;
  storyArchiveSelectedIndex: number = 0;
  pushableBlocks: PushableBlock[] = [];
  private beamRenderer: BeamRenderer;
  private atmosphereRenderer: AtmosphereRenderer;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.beamRenderer = new BeamRenderer();
    this.atmosphereRenderer = new AtmosphereRenderer();
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
    laserBeams?: LaserBeam[],
    floatingTexts?: Array<{ x: number; y: number; text: string; color: string; createdAt?: number }>,
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
    const ctx = this.ctx;

    ctx.save?.();
    const now = Date.now();
    if (this.isTitleScreen) {
      this.drawTitleScreen(width, height, ctx, now, this.hasSaveData, this.language, this.titleMenuIndex);
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
    if (!player.facing) {
      const dx = px - this.lastPlayerPos.x;
      const dy = py - this.lastPlayerPos.y;
      if (dx > 0) player.facing = 'right';
      else if (dx < 0) player.facing = 'left';
      else if (dy > 0) player.facing = 'down';
      else if (dy < 0) player.facing = 'up';
      else player.facing = 'right';
    }
    this.lastPlayerPos = { x: px, y: py };

    const camX = px * this.tileSize - width / 2;
    const camY = py * this.tileSize - height / 2;

    if (this.fx?.applyScreenShake) this.fx.applyScreenShake(ctx);

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

    // 3.5 繪製反抗軍塗鴉壁畫 (Graffiti Mural)
    this.drawGraffitiMural(map, camX, camY, visible, ctx, now);

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

    // 4.7 繪製可推動物體 (Pushable Blocks)
    const pushableBlocks = this.pushableBlocks;
    if (Array.isArray(pushableBlocks)) {
      pushableBlocks.forEach((block: any) => {
        if (!block) return;
        const bx = Number(block.x);
        const by = Number(block.y);
        if (Number.isNaN(bx) || Number.isNaN(by)) return;
        const key = this.key(bx, by);
        if (!visible.has(key) && !explored.has(key)) return;
        this.drawPushableBlock(ctx, block, bx * this.tileSize - camX, by * this.tileSize - camY, this.tileSize, visible.has(key), now, map?.id);
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
        if (player.augments?.OPTIC_HUD) {
          const bx = rx * this.tileSize - camX + 4;
          const by = ry * this.tileSize - camY - 6;
          const barW = this.tileSize - 8;
          const hpRatio = Math.max(0, Math.min(1, robot.hp / (robot.maxHp || 50)));
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
    if (player.isWeaponDrawn) {
      this.drawLaserSightAndLockOn(player, robots, camX, camY, ctx, now);
    }

    // 8. 繪製雷射彈道光束
    if (Array.isArray(laserBeams)) {
      laserBeams.forEach((beam) => {
        if (!beam || !beam.from || !beam.to) return;
        const b = beam;
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

    if (this.activeWaypoint) {
      const wp = this.activeWaypoint as { x: number; y: number; color?: string };
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
    if (this.fx?.render) this.fx.render(ctx, camX, camY);

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
    if (!player.isAlive || this.defeatCutscene) {
      if (this.defeatCutscene) {
        this.drawDefeatCutscene(width, height, ctx, now, this.defeatCutscene, this.language, camX, camY);
      } else if (!player.isAlive) {
        this.drawGameOverOverlay(width, height, ctx, now);
      }
    } else if (player.victory) {
      this.drawVictoryOverlay(player, width, height, ctx, now);
    }

    ctx.restore?.();
  }

  key(x: number, y: number): string {
    const keyFn = MapModule.key;
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
    const parseFn = MapModule.parseKey;
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

  drawTitleScreen(width: number, height: number, ctx: any, now: number, hasSaveData: boolean, language: Language, titleMenuIndex: number = 0): void {
    drawTitleScreen(width, height, ctx, now, hasSaveData, language, titleMenuIndex);
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
    const m = map;
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

  drawGraffitiMural(map: SectorMap, camX: number, camY: number, visible: Set<string>, ctx: any, now: number): void {
    // 檢查壁畫位置是否在可見範圍內 (21, 15..17)
    const muralX = 21;
    const muralYStart = 15;
    const muralYEnd = 17;
    let anyVisible = false;
    for (let y = muralYStart; y <= muralYEnd; y++) {
      const key = this.key(muralX, y);
      if (visible.has(key)) {
        anyVisible = true;
        break;
      }
    }
    if (!anyVisible) return;

    ctx.save?.();

    const sx = muralX * this.tileSize - camX;
    const sy = muralYStart * this.tileSize - camY;
    const totalH = (muralYEnd - muralYStart + 1) * this.tileSize;

    if (!this.graffitiMuralComplete) {
      // 未完成：灰色阻燃塗料與佐格審查標籤
      ctx.fillStyle = 'rgba(40, 40, 45, 0.9)';
      ctx.fillRect?.(sx, sy, this.tileSize, totalH);

      // 阻燃塗料紋理 (斜向灰色條紋)
      ctx.strokeStyle = 'rgba(60, 60, 65, 0.6)';
      ctx.lineWidth = 2;
      for (let i = 0; i < totalH; i += 12) {
        ctx.beginPath?.();
        ctx.moveTo?.(sx, sy + i);
        ctx.lineTo?.(sx + this.tileSize, sy + i + this.tileSize);
        ctx.stroke?.();
      }

      // 佐格審查標籤 (Tzorg Censorship Label)
      const labelW = this.tileSize - 8;
      const labelH = 16;
      const labelX = sx + 4;
      const labelY = sy + totalH / 2 - labelH / 2;

      ctx.fillStyle = 'rgba(20, 20, 25, 0.95)';
      ctx.fillRect?.(labelX, labelY, labelW, labelH);
      ctx.strokeStyle = '#ff1744';
      ctx.lineWidth = 1;
      ctx.strokeRect?.(labelX, labelY, labelW, labelH);

      ctx.fillStyle = '#ff1744';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText?.('TZORG', labelX + labelW / 2, labelY + labelH / 2 - 4);
      ctx.fillStyle = '#ffea00';
      ctx.font = 'bold 7px monospace';
      ctx.fillText?.('CENSORED', labelX + labelW / 2, labelY + labelH / 2 + 5);
    } else {
      // 完成：動態流光自由抗爭霓虹壁畫
      const pulse = 0.7 + 0.3 * Math.sin(now * 0.004);
      const pulse2 = 0.7 + 0.3 * Math.sin(now * 0.004 + Math.PI / 2);

      // 背景深色底
      ctx.fillStyle = 'rgba(5, 5, 15, 0.95)';
      ctx.fillRect?.(sx, sy, this.tileSize, totalH);

      // 霓虹粉呼吸光暈 (Neon Pink Glow)
      ctx.fillStyle = `rgba(255, 60, 120, ${0.15 * pulse})`;
      ctx.beginPath?.();
      ctx.arc?.(sx + this.tileSize / 2, sy + totalH * 0.3, this.tileSize * 0.4, 0, Math.PI * 2);
      ctx.fill?.();

      // 霓虹藍呼吸光暈 (Neon Blue Glow)
      ctx.fillStyle = `rgba(0, 150, 255, ${0.15 * pulse2})`;
      ctx.beginPath?.();
      ctx.arc?.(sx + this.tileSize / 2, sy + totalH * 0.7, this.tileSize * 0.4, 0, Math.PI * 2);
      ctx.fill?.();

      // 金邊框 (Gold Border)
      ctx.strokeStyle = `rgba(255, 215, 0, ${0.6 + 0.4 * pulse})`;
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 8;
      ctx.lineWidth = 2;
      ctx.strokeRect?.(sx + 2, sy + 2, this.tileSize - 4, totalH - 4);

      // 抗爭標語 EYE / 2400 / FREE
      ctx.shadowBlur = 0;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // EYE
      ctx.fillStyle = `rgba(255, 60, 120, ${0.8 + 0.2 * pulse})`;
      ctx.font = 'bold 10px monospace';
      ctx.fillText?.('EYE', sx + this.tileSize / 2, sy + totalH * 0.25);

      // 2400
      ctx.fillStyle = `rgba(0, 229, 255, ${0.8 + 0.2 * pulse2})`;
      ctx.font = 'bold 12px monospace';
      ctx.fillText?.('2400', sx + this.tileSize / 2, sy + totalH * 0.5);

      // FREE
      ctx.fillStyle = `rgba(255, 215, 0, ${0.8 + 0.2 * pulse})`;
      ctx.font = 'bold 10px monospace';
      ctx.fillText?.('FREE', sx + this.tileSize / 2, sy + totalH * 0.75);

      // 動態流光線條 (Flowing Light Lines)
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 * pulse})`;
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        const lineY = sy + totalH * (0.2 + i * 0.3);
        const offset = Math.sin(now * 0.005 + i) * 4;
        ctx.beginPath?.();
        ctx.moveTo?.(sx + 4, lineY + offset);
        ctx.lineTo?.(sx + this.tileSize - 4, lineY - offset);
        ctx.stroke?.();
      }
    }

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
    ctx: any,
    now: number = 0
  ): void {
    drawRobotSprite(
      ctx,
      robot,
      rx * this.tileSize - camX,
      ry * this.tileSize - camY,
      this.tileSize,
      true
    );
  }

  drawPlayer(player: Player, camX: number, camY: number, ctx: any, now: number = 0): void {
    const p = player;
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
    const beam: LaserBeam = {
      from: { x: x1, y: y1 },
      to: { x: x2, y: y2 },
      color,
      beamType: 'LASER',
      createdAt: now,
      duration: 200
    };
    this.beamRenderer.drawLaserBeam(ctx, beam, now, progress);
  }

  drawElectricArc(x1: number, y1: number, x2: number, y2: number, color: string, ctx: any, now: number = 0, progress: number = 1): void {
    const beam: LaserBeam = {
      from: { x: x1, y: y1 },
      to: { x: x2, y: y2 },
      color,
      beamType: 'ELEC',
      createdAt: now,
      duration: 200
    };
    this.beamRenderer.drawElectricArc(ctx, beam, now, progress);
  }

  drawPlasmaBeam(x1: number, y1: number, x2: number, y2: number, color: string, ctx: any, now: number = 0, progress: number = 1): void {
    const beam: LaserBeam = {
      from: { x: x1, y: y1 },
      to: { x: x2, y: y2 },
      color,
      beamType: 'PLASMA',
      createdAt: now,
      duration: 200
    };
    this.beamRenderer.drawPlasmaBeam(ctx, beam, now, progress);
  }

  drawNeedleTracer(x1: number, y1: number, x2: number, y2: number, color: string, ctx: any, now: number = 0, progress: number = 1): void {
    const beam: LaserBeam = {
      from: { x: x1, y: y1 },
      to: { x: x2, y: y2 },
      color,
      beamType: 'NEEDLE',
      createdAt: now,
      duration: 200
    };
    this.beamRenderer.drawNeedleTracer(ctx, beam, now, progress);
  }

  drawQuantumBeam(x1: number, y1: number, x2: number, y2: number, color: string, ctx: any, now: number = 0, progress: number = 1): void {
    const beam: LaserBeam = {
      from: { x: x1, y: y1 },
      to: { x: x2, y: y2 },
      color,
      beamType: 'QUANTUM',
      createdAt: now,
      duration: 200
    };
    this.beamRenderer.drawQuantumBeam(ctx, beam, now, progress);
  }

  drawScreenAtmosphere(width: number, height: number, ctx: any): void {
    this.atmosphereRenderer.drawScreenAtmosphere(width, height, ctx);
  }

  // 各分區環境大氣特效 (Sector Environmental Atmosphere Effects)
  drawSectorAtmosphere(
    px: number, py: number, width: number, height: number, camX: number, camY: number, ctx: any, now: number
  ): void {
    void camX;
    void camY;
    this.atmosphereRenderer.drawSectorAtmosphere(px, py, width, height, camX, camY, ctx, now);
  }

  getSectorFromPosition(px: number, py: number): string {
    return this.atmosphereRenderer.getSectorFromPosition(px, py);
  }
  drawAcidRainAndFog(width: number, height: number, ctx: any, now: number): void {
    this.atmosphereRenderer.drawAcidRainAndFog(width, height, ctx, now);
  }
  drawConveyorSparks(width: number, height: number, ctx: any, now: number): void {
    this.atmosphereRenderer.drawConveyorSparks(width, height, ctx, now);
  }
  drawSewerToxicMist(width: number, height: number, ctx: any, now: number): void {
    this.atmosphereRenderer.drawSewerToxicMist(width, height, ctx, now);
  }

  drawPushableBlock(ctx: any, block: any, sx: number, sy: number, tileSize: number, isVisible: boolean, now: number, sector?: string): void {
    ctx.save?.();
    const alpha = isVisible ? 1 : 0.4;
    ctx.globalAlpha = alpha;

    const blockType = block?.blockType;

    // 禁閉室通風柵板 / 暗門 (Detention Ventilation Grate & Secret Door)
    if (block?.id === 'crate-detention-grate' || String(block?.name || '').includes('Ventilation')) {
      this.drawVentilationGrate(ctx, block, sx, sy, tileSize, isVisible, now, sector);
      ctx.globalAlpha = 1;
      ctx.restore?.();
      return;
    }

    if (blockType === 'crate') {
      // Heavy industrial cargo crate
      // Dark gunmetal body
      ctx.fillStyle = '#1e2430';
      ctx.fillRect?.(sx, sy, tileSize, tileSize);
      ctx.fillStyle = '#2b3548';
      ctx.fillRect?.(sx + 2, sy + 2, tileSize - 4, tileSize - 4);

      // Diagonal yellow/black hazard warning stripes
      ctx.save?.();
      ctx.beginPath?.();
      ctx.rect?.(sx + 4, sy + 4, tileSize - 8, tileSize - 8);
      ctx.clip?.();
      ctx.strokeStyle = '#ffea00';
      ctx.lineWidth = 4;
      for (let i = -tileSize; i < tileSize * 2; i += 12) {
        ctx.beginPath?.();
        ctx.moveTo?.(sx + i, sy);
        ctx.lineTo?.(sx + i + tileSize, sy + tileSize);
        ctx.stroke?.();
      }
      ctx.restore?.();

      // Outer metal frame with corner bolts
      ctx.strokeStyle = '#4a5568';
      ctx.lineWidth = 2;
      ctx.strokeRect?.(sx + 1, sy + 1, tileSize - 2, tileSize - 2);
      ctx.fillStyle = '#718096';
      const boltSize = 3;
      ctx.fillRect?.(sx + 3, sy + 3, boltSize, boltSize);
      ctx.fillRect?.(sx + tileSize - 3 - boltSize, sy + 3, boltSize, boltSize);
      ctx.fillRect?.(sx + 3, sy + tileSize - 3 - boltSize, boltSize, boltSize);
      ctx.fillRect?.(sx + tileSize - 3 - boltSize, sy + tileSize - 3 - boltSize, boltSize, boltSize);

      // Central cargo grip handle
      ctx.fillStyle = '#1a202c';
      ctx.fillRect?.(sx + tileSize / 2 - 10, sy + tileSize / 2 - 4, 20, 8);
      ctx.strokeStyle = '#a0aec0';
      ctx.lineWidth = 1;
      ctx.strokeRect?.(sx + tileSize / 2 - 10, sy + tileSize / 2 - 4, 20, 8);

    } else if (blockType === 'server_rack') {
      // Sleek cyber server rack
      // Dark chassis
      ctx.fillStyle = '#0d1117';
      ctx.fillRect?.(sx, sy, tileSize, tileSize);

      // Cyan accent border
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.6)';
      ctx.lineWidth = 1;
      ctx.strokeRect?.(sx + 1, sy + 1, tileSize - 2, tileSize - 2);

      // Horizontal stacked server blade units
      const bladeCount = 4;
      const bladeH = (tileSize - 8) / bladeCount;
      for (let i = 0; i < bladeCount; i++) {
        const by = sy + 4 + i * bladeH;
        ctx.fillStyle = '#161b22';
        ctx.fillRect?.(sx + 3, by + 1, tileSize - 6, bladeH - 2);

        // Cooling ventilation slits
        ctx.fillStyle = '#010409';
        for (let s = 0; s < 3; s++) {
          ctx.fillRect?.(sx + 5, by + 3 + s * 3, tileSize - 10, 1);
        }

        // Animated blinking status LED indicator lights
        const ledPhase = Math.sin(now * 0.005 + i * 1.5);
        let ledColor = '#00ff88'; // green
        if (ledPhase > 0.5) ledColor = '#00e5ff'; // cyan
        else if (ledPhase < -0.5) ledColor = '#ffea00'; // amber

        ctx.fillStyle = ledColor;
        ctx.shadowColor = ledColor;
        ctx.shadowBlur = 4;
        ctx.beginPath?.();
        ctx.arc?.(sx + tileSize - 6, by + bladeH / 2, 1.5, 0, Math.PI * 2);
        ctx.fill?.();
        ctx.shadowBlur = 0;
      }

    } else {
      // 'disguised_wall' or undefined: keep existing logic
      drawTileSprite(ctx, 'WALL', sx, sy, tileSize, isVisible, now, sector);

      if (!block.revealed) {
        // 未推開前：極其細微的暗色擬真接縫與底部微弱磨擦縫隙
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect?.(sx + 1, sy + 1, tileSize - 2, tileSize - 2);

        // 底部微弱磨擦縫隙
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect?.(sx + 2, sy + tileSize - 3, tileSize - 4, 2);

        // 若全視力激活，顯示極淡的青色線框輔助提示
        if (this.isOmniVisionActive) {
          ctx.strokeStyle = 'rgba(0, 255, 255, 0.15)';
          ctx.lineWidth = 1;
          ctx.strokeRect?.(sx + 3, sy + 3, tileSize - 6, tileSize - 6);
        }
      } else {
        // 推開後：顯示已推開的淡綠色邊框與角落小綠點
        ctx.strokeStyle = 'rgba(0, 255, 136, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect?.(sx + 1, sy + 1, tileSize - 2, tileSize - 2);

        // 角落小綠點
        ctx.fillStyle = 'rgba(0, 255, 136, 0.8)';
        ctx.beginPath?.();
        ctx.arc?.(sx + 6, sy + 6, 2, 0, Math.PI * 2);
        ctx.fill?.();
        ctx.beginPath?.();
        ctx.arc?.(sx + tileSize - 6, sy + 6, 2, 0, Math.PI * 2);
        ctx.fill?.();
        ctx.beginPath?.();
        ctx.arc?.(sx + 6, sy + tileSize - 6, 2, 0, Math.PI * 2);
        ctx.fill?.();
        ctx.beginPath?.();
        ctx.arc?.(sx + tileSize - 6, sy + tileSize - 6, 2, 0, Math.PI * 2);
        ctx.fill?.();
      }
    }

    ctx.globalAlpha = 1;
    ctx.restore?.();
  }

  // 禁閉室通風金屬柵板與暗門 (Detention Ventilation Grate & Secret Door)
  drawVentilationGrate(ctx: any, block: any, sx: number, sy: number, tileSize: number, isVisible: boolean, now: number, sector?: string): void {
    const revealed = !!block?.revealed;
    const secretDoor = block?.secretDoor;

    // 1. 金屬通風百葉窗橫條紋 (Metal Ventilation Louver Horizontal Stripes)
    // 深灰金屬底板
    ctx.fillStyle = '#1a1f28';
    ctx.fillRect?.(sx, sy, tileSize, tileSize);

    // 百葉窗橫條 (Louver Slats) - 帶陰影立體感
    const slatCount = 6;
    const slatGap = 3;
    const slatH = (tileSize - slatGap * (slatCount + 1)) / slatCount;
    for (let i = 0; i < slatCount; i++) {
      const slatY = sy + slatGap + i * (slatH + slatGap);
      // 百葉窗主體 (漸層模擬金屬反光)
      const grad = ctx.createLinearGradient?.(sx, slatY, sx, slatY + slatH);
      if (grad) {
        grad.addColorStop(0, '#3a4250');
        grad.addColorStop(0.5, '#2a3040');
        grad.addColorStop(1, '#1a1f28');
      }
      ctx.fillStyle = grad || '#2a3040';
      ctx.fillRect?.(sx + 4, slatY, tileSize - 8, slatH);
      // 百葉窗頂部高光
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fillRect?.(sx + 4, slatY, tileSize - 8, 1);
      // 百葉窗底部陰影
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect?.(sx + 4, slatY + slatH - 1, tileSize - 8, 1);
    }

    // 邊框螺絲 (Frame Bolts) - 四角與邊中
    ctx.fillStyle = '#5a6578';
    const boltPositions = [
      [sx + 3, sy + 3],
      [sx + tileSize - 6, sy + 3],
      [sx + 3, sy + tileSize - 6],
      [sx + tileSize - 6, sy + tileSize - 6],
      [sx + tileSize / 2 - 1.5, sy + 2],
      [sx + tileSize / 2 - 1.5, sy + tileSize - 5],
    ];
    boltPositions.forEach(([bx, by]) => {
      ctx.beginPath?.();
      ctx.arc?.(bx, by, 2, 0, Math.PI * 2);
      ctx.fill?.();
      // 螺絲十字槽
      ctx.strokeStyle = '#2a3040';
      ctx.lineWidth = 0.5;
      ctx.beginPath?.();
      ctx.moveTo?.(bx - 1, by);
      ctx.lineTo?.(bx + 1, by);
      ctx.moveTo?.(bx, by - 1);
      ctx.lineTo?.(bx, by + 1);
      ctx.stroke?.();
    });

    // 外框金屬邊
    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = 2;
    ctx.strokeRect?.(sx + 1, sy + 1, tileSize - 2, tileSize - 2);

    // 2. 流動青色氣流微粒 (Flowing Cyan Airflow Particles)
    const particleCount = 8;
    for (let i = 0; i < particleCount; i++) {
      const seed = i * 137.5 + now * 0.003;
      const px = sx + 6 + ((Math.sin(seed * 0.7) * 0.5 + 0.5) * (tileSize - 12));
      const py = sy + 6 + ((Math.cos(seed * 0.5) * 0.5 + 0.5) * (tileSize - 12));
      const size = 1 + Math.sin(seed * 0.3) * 0.5;
      const alpha = 0.2 + 0.2 * Math.sin(seed * 0.8);

      ctx.fillStyle = `rgba(0, 229, 255, ${alpha})`;
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 3;
      ctx.beginPath?.();
      ctx.arc?.(px, py, size, 0, Math.PI * 2);
      ctx.fill?.();
    }
    ctx.shadowBlur = 0;

    // 3. 微光文字 'VENT [E]' 標記 (Glowing VENT [E] Label)
    const pulse = 0.6 + 0.4 * Math.sin(now * 0.006);
    ctx.fillStyle = `rgba(0, 229, 255, ${pulse})`;
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 6;
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText?.('VENT [E]', sx + tileSize / 2, sy + tileSize / 2);
    ctx.shadowBlur = 0;

    // 4. 若已揭示且存在 secretDoor，繪製綠色通風管道箭頭與脫逃提示光效
    if (revealed && secretDoor) {
      const sdX = Number(secretDoor.x);
      const sdY = Number(secretDoor.y);
      if (!Number.isNaN(sdX) && !Number.isNaN(sdY)) {
        // 在 secretDoor 座標位置繪製 (需轉換為螢幕座標)
        // 注意：此處 sx, sy 已是螢幕座標，secretDoor 是地圖座標
        // 我們需要計算 secretDoor 相對於當前柵板的螢幕位置
        // 簡化處理：在柵板右側繪製指向暗門方向的綠色箭頭
        const arrowX = sx + tileSize - 4;
        const arrowY = sy + tileSize / 2;
        const arrowPulse = 0.5 + 0.5 * Math.sin(now * 0.008);

        ctx.fillStyle = `rgba(0, 255, 136, ${arrowPulse})`;
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 8;

        // 綠色通風管道箭頭 (指向右側暗門)
        ctx.beginPath?.();
        ctx.moveTo?.(arrowX - 8, arrowY - 4);
        ctx.lineTo?.(arrowX, arrowY);
        ctx.lineTo?.(arrowX - 8, arrowY + 4);
        ctx.closePath?.();
        ctx.fill?.();

        // 脫逃提示光暈 (Escape Glow)
        ctx.strokeStyle = `rgba(0, 255, 136, ${arrowPulse * 0.6})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath?.();
        ctx.arc?.(sx + tileSize / 2, sy + tileSize / 2, tileSize * 0.4, 0, Math.PI * 2);
        ctx.stroke?.();

        // 脫逃文字提示
        ctx.fillStyle = `rgba(0, 255, 136, ${arrowPulse})`;
        ctx.font = 'bold 8px monospace';
        ctx.fillText?.('ESCAPE', sx + tileSize / 2, sy + tileSize - 8);
      }
    }
  }

  drawLaserSightAndLockOn(player: Player, robots: Robot[], camX: number, camY: number, ctx: any, now: number): void {
    const p = player;
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
      const lr = lockedRobot as Robot;
      dotX = Number(lr.x);
      dotY = Number(lr.y);
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
      const lr = lockedRobot as Robot;
      const rx = Number(lr.x);
      const ry = Number(lr.y);
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

    const p = player;
    const px = Number(p?.x) || 0;
    const py = Number(p?.y) || 0;
    const sec = String(securityLevel ?? 'CLEAR').toUpperCase();

    const curSec = player.currentSectorId;
    let sectorLabel = 'SECTOR 01';
    if (curSec === 'sector-2') sectorLabel = 'SECTOR 02';
    else if (curSec === 'sub-sector-0') sectorLabel = 'SECTOR 00';
    else if (curSec === 'sector-citadel') sectorLabel = 'CITADEL APEX';

    let secColor = '#00ff66';
    if (sec === 'SUSPICIOUS') secColor = '#ffea00';
    if (sec === 'ALERT') secColor = '#ff7700';
    if (sec === 'LOCKDOWN') secColor = '#ff1744';

    let chkText: string;
    let chkColor: string;
    if (p?.isCollarDisarmed) {
      chkText = 'CHK: UNLOCKED [∞]';
      chkColor = '#00ff88';
    } else {
      const chkTimer = typeof p?.checkInTimer === 'number' ? p.checkInTimer : 100;
      chkText = 'CHK: ' + chkTimer + '/100';
      chkColor = '#00ffcc';
      if (chkTimer <= 10) chkColor = '#ff2a4b';
      else if (chkTimer <= 30) chkColor = '#ffea00';
    }

    const level = Number(p?.level ?? 1) || 1;
    const xp = Number(p?.exp ?? p?.xp ?? 0) || 0;
    const xpToNext = Number(p?.expToNext ?? p?.xpToNext ?? 100) || 100;
    const xpRatio = Math.max(0, Math.min(1, xp / xpToNext));

    const hp = Math.max(0, p?.hp ?? 100);
    const maxHp = p?.maxHp ?? 100;
    const energy = Math.max(0, p?.energy ?? 100);
    const maxEnergy = p?.maxEnergy ?? 100;
    const credits = p?.credits ?? 0;

    const isZh = this.language === 'zh';
    const weapons = Array.isArray(p?.weapons) ? p.weapons : [];
    const curIdx = weapons.findIndex((w: any) => w === p?.equippedWeapon || (p?.equippedWeapon && w.id === p.equippedWeapon.id));
    const nextW = weapons.length > 1 && curIdx !== -1 ? weapons[(curIdx + 1) % weapons.length] : null;
    const curWName = (isZh ? (p?.equippedWeapon?.nameZh || p?.equippedWeapon?.name) : p?.equippedWeapon?.name) || 'None';
    const nextWName = nextW ? (isZh ? (nextW?.nameZh || nextW?.name) : nextW?.name) : null;
    const weaponDmg = Number(p?.equippedWeapon?.power ?? p?.equippedWeapon?.damage ?? 0) || 0;
    const isQuantum = String(curWName).toUpperCase().includes('QUANTUM');
    const isArmed = !!p?.isWeaponDrawn;
    const weaponColor = isArmed ? (isQuantum ? '#b388ff' : '#ff3855') : '#8899a6';

    let gpsText: string | null = null;
    if (this.activeWaypoint) {
      const wp = this.activeWaypoint as { x: number; y: number; name?: string };
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
      gpsText = `[ GPS: ${String(wp?.name ?? 'WAYPOINT')} ${dist}格 ${arrow} ]`;
    }

    const disguiseText = p?.isDisguised ? '[DISGUISED]' : null;

    // Layout configuration
    const hudLeftMargin = 12;
    const hudRightMargin = 12;
    const hudItemGap = 14;
    const hudRowHeight = 24;
    const hudTopPadding = 6;
    const hudBottomPadding = 6;
    const hudMaxContentWidth = width - hudLeftMargin - hudRightMargin;

    // Helper to measure text width
    const measureW = (text: string, font?: string): number => {
      const prevFont = ctx.font;
      if (font) ctx.font = font;
      const w = ctx.measureText?.(text)?.width || text.length * 7;
      if (font) ctx.font = prevFont;
      return w;
    };

    // Helper to truncate text with ellipsis
    const truncateText = (text: string, maxWidth: number, font: string): string => {
      if (measureW(text, font) <= maxWidth) return text;
      let truncated = text;
      while (truncated.length > 1 && measureW(truncated + '…', font) > maxWidth) {
        truncated = truncated.slice(0, -1);
      }
      return truncated + '…';
    };

    // Build items list
    type HudItem = {
      text: string;
      color: string;
      font: string;
      special?: 'xp_bar';
      xpRatio?: number;
      xpBarW?: number;
      xpBarH?: number;
      xpValueText?: string;
      xpValueColor?: string;
      xpValueFont?: string;
    };

    const hudItems: HudItem[] = [];

    // 1. Sector/Position
    hudItems.push({
      text: sectorLabel + ' [POS ' + px + ',' + py + ']',
      color: '#00e5ff',
      font: 'bold 12px monospace'
    });

    // 2. Security
    hudItems.push({
      text: 'SEC: ' + sec,
      color: secColor,
      font: 'bold 12px monospace'
    });

    // 3. Check-in
    hudItems.push({
      text: chkText,
      color: chkColor,
      font: 'bold 12px monospace'
    });

    // 4. Level
    hudItems.push({
      text: 'LV.' + level,
      color: '#ffea00',
      font: 'bold 12px monospace'
    });

    // 5. XP Bar
    const xpBarW = 45;
    const xpBarH = 8;
    const xpValueText = xp + '/' + xpToNext;
    hudItems.push({
      text: '', // Placeholder, width calculated specially
      color: '#00e5ff',
      font: 'bold 12px monospace',
      special: 'xp_bar',
      xpRatio: xpRatio,
      xpBarW: xpBarW,
      xpBarH: xpBarH,
      xpValueText: xpValueText,
      xpValueColor: '#8899a6',
      xpValueFont: '9px monospace'
    });

    // 6. HP
    hudItems.push({
      text: 'HP ' + hp + '/' + maxHp,
      color: '#ff2a4b',
      font: 'bold 12px monospace'
    });

    // 7. Energy
    hudItems.push({
      text: 'EN ' + energy + '/' + maxEnergy,
      color: '#00f0ff',
      font: 'bold 12px monospace'
    });

    // 8. Credits
    hudItems.push({
      text: 'CR: ' + credits,
      color: '#ffb700',
      font: 'bold 12px monospace'
    });

    // 9. Weapon Status
    // We need to construct the weapon text carefully to allow truncation of the name if needed
    // Structure: [Label] [State] [Name] ([Dmg] DMG) [Controls]
    const weaponLabel = isZh ? '武器: ' : 'WEAPON: ';
    const weaponState = isArmed ? (isZh ? '[已拔槍] ' : '[ARMED] ') : (isZh ? '[已收槍] ' : '[HOLSTERED] ');
    const weaponDmgPart = ' (' + weaponDmg + ' DMG) ';
    const weaponControls = nextWName ? (isZh ? '[Q換: ' + nextWName + ']' : '[Q: ' + nextWName + ']') : (isZh ? '[Q換槍]' : '[Q:SWAP]');

    // Estimate max width for weapon name to ensure it fits in a row if it's the only thing or part of a row
    // We'll just add it as a standard item, but if it's too long, we might need to truncate.
    // For now, add full text. The layout engine will handle wrapping.
    // However, the requirement says "truncate only the name portion... to fit within an available row".
    // This implies if the weapon item itself is too wide for a row, we truncate the name.
    // Let's calculate the width of the non-name parts.
    const weaponFixedWidth = measureW(weaponLabel + weaponState + weaponDmgPart + weaponControls, 'bold 12px monospace');
    const availableForName = hudMaxContentWidth - weaponFixedWidth;
    const truncatedWeaponName = truncateText(curWName, availableForName, 'bold 12px monospace');

    const weaponStatusText = weaponLabel + weaponState + truncatedWeaponName + weaponDmgPart + weaponControls;
    hudItems.push({
      text: weaponStatusText,
      color: weaponColor,
      font: 'bold 12px monospace'
    });

    // 10. GPS
    if (gpsText) {
      hudItems.push({
        text: gpsText,
        color: '#ffea00',
        font: 'bold 12px monospace'
      });
    }

    // 11. Disguise
    if (disguiseText) {
      hudItems.push({
        text: disguiseText,
        color: '#b432ff',
        font: 'bold 12px monospace'
      });
    }

    // Calculate layout
    let currentX = hudLeftMargin;
    let currentY = hudTopPadding;
    let maxRows = 1;
    let maxRowBottom = hudTopPadding + hudRowHeight;

    const drawHudItem = (item: HudItem, x: number, y: number) => {
      ctx.font = item.font;
      ctx.textBaseline = 'middle';

      if (item.special === 'xp_bar') {
        // Draw XP Bar
        const barX = x;
        const barY = y + hudRowHeight / 2 - (item.xpBarH || 8) / 2;
        const barW = item.xpBarW || 45;
        const barH = item.xpBarH || 8;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect?.(barX, barY, barW, barH);
        ctx.fillStyle = '#00e5ff';
        ctx.fillRect?.(barX, barY, barW * (item.xpRatio || 0), barH);
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.5)';
        ctx.lineWidth = 0.8;
        ctx.strokeRect?.(barX, barY, barW, barH);

        // Draw XP Value Text
        if (item.xpValueText) {
          ctx.fillStyle = item.xpValueColor || '#8899a6';
          ctx.font = item.xpValueFont || '9px monospace';
          ctx.fillText?.(item.xpValueText, barX + barW + 4, y + hudRowHeight / 2);
        }
      } else {
        ctx.fillStyle = item.color;
        ctx.fillText?.(item.text, x, y + hudRowHeight / 2);
      }
    };

    const positionedHudItems: Array<{ item: HudItem; x: number; y: number }> = [];
    for (const item of hudItems) {
      let itemWidth: number;
      if (item.special === 'xp_bar') {
        // Width is bar + gap + text
        const barW = item.xpBarW || 45;
        const textW = item.xpValueText ? measureW(item.xpValueText, item.xpValueFont) : 0;
        itemWidth = barW + 4 + textW;
      } else {
        itemWidth = measureW(item.text, item.font);
      }

      // Check if it fits in the current row
      if (currentX + itemWidth > width - hudRightMargin) {
        // Wrap to next row
        currentX = hudLeftMargin;
        currentY += hudRowHeight;
        maxRows++;
      }

      positionedHudItems.push({ item, x: currentX, y: currentY });
      currentX += itemWidth + hudItemGap;

      if (currentY + hudRowHeight > maxRowBottom) {
        maxRowBottom = currentY + hudRowHeight;
      }
    }

    // Draw HUD Background
    const hudHeight = maxRowBottom + hudBottomPadding;
    ctx.fillStyle = 'rgba(7, 13, 20, 0.88)';
    ctx.fillRect?.(0, 0, width, hudHeight);

    ctx.strokeStyle = 'rgba(0, 229, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect?.(0, hudHeight - 0.5, width, 1);

    for (const positionedItem of positionedHudItems) {
      drawHudItem(positionedItem.item, positionedItem.x, positionedItem.y);
    }

    if (Array.isArray(messages)) {
      const recent = messages.slice(-3);
      ctx.textAlign = 'right';

      recent.forEach((message, index) => {
        const m = message;
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
    const consumableItems = [
      { key: '[1]', label: `MED: ${medCount}`, color: '#00ff88' },
      { key: '[2]', label: `BAT: ${batCount}`, color: '#00e5ff' },
      { key: '[3]', label: `EMP: ${empCount}`, color: '#c77dff' },
      { key: '[I]', label: 'INV', color: '#ffaa00' },
      { key: '[U]', label: this.language === 'zh' ? '黑市' : 'SHOP', color: '#c77dff' },
      { key: '[M]', label: this.language === 'zh' ? '任務' : 'MISSIONS', color: '#00ffaa' },
      { key: '[L]', label: 'ARCHIVE', color: '#ffb700' },
      { key: '[8]', label: 'SAVE', color: '#00f0ff' },
      { key: '[9]', label: 'LOAD', color: '#b388ff' },
      { key: '[Z]', label: this.language === 'zh' ? '中' : 'EN', color: '#ffea00' },
      { key: '[B]', label: 'BGM', color: '#00ffaa' },
      { key: '[V]', label: 'OMNI', color: this.isOmniVisionActive ? '#00ffff' : '#667788' },
      { key: '[X]', label: 'MAP', color: this.isFullMapActive ? '#ffea00' : '#667788' },
      { key: '[0]', label: 'RES', color: '#00f0ff' },
      { key: '[TAB]', label: 'MAP', color: '#00ffcc' },
      { key: '[F]', label: 'DRAW', color: '#ff3855' },
      { key: '[Q]', label: nextWName ? (this.language === 'zh' ? '換:' + nextWName : 'SWAP:' + nextWName) : 'SWAP', color: '#b388ff' },
    ];

    let curX = 10;
    const consumableGap = 12;
    consumableItems.forEach((item) => {
      const text = `${item.key} ${item.label}`;
      const measuredWidth = ctx.measureText?.(text)?.width;
      const textWidth = (measuredWidth && measuredWidth > 0) ? measuredWidth : text.length * 7;
      if (curX + textWidth > width - 10) return;
      ctx.fillStyle = item.color;
      ctx.fillText?.(text, curX, height - 13);
      curX += textWidth + consumableGap;
    });

    ctx.restore?.();
  }

  drawTerminal(
    terminal: TerminalSession,
    width: number,
    height: number,
    ctx: any,
    now: number = 0
  ): void {
    const t = terminal;
    ctx.save?.();

    const boxW = Math.min(width - 40, 680);
    const boxH = Math.min(height - 60, 420);
    const x = (width - boxW) / 2;
    const y = (height - boxH) / 2;

    // 邊界裁切防護
    ctx.beginPath?.();
    ctx.rect?.(x, y, boxW, boxH);
    ctx.clip?.();

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

    const cmds = (typeof t?.getEffectiveCommands === 'function' ? t.getEffectiveCommands() : []).map((c: any) => typeof c === 'string' ? c : c?.cmd || '');
    const isZh = this.language === 'zh';
    const cmdHintText = (isZh ? '可用指令: ' : 'COMMANDS: ') + cmds.join(' | ') + (isZh ? ' [Esc 退出]' : ' [Esc TO EXIT]');
    const maxLineW = boxW - 32;
    const hintLines = wrapText(cmdHintText, maxLineW, (s) => (ctx.measureText ? ctx.measureText(s).width : s.length * 8));
    ctx.fillStyle = '#00f0ff';
    ctx.font = '11px monospace';
    hintLines.forEach((line, index) => {
      ctx.fillText?.(line, x + 16, y + 36 + index * 15);
    });

    const dividerY = y + 36 + hintLines.length * 15 + 2;
    ctx.strokeStyle = '#005522';
    ctx.lineWidth = 1;
    ctx.beginPath?.();
    ctx.moveTo?.(x + 16, dividerY);
    ctx.lineTo?.(x + boxW - 16, dividerY);
    ctx.stroke?.();

    // 歷史紀錄自動換行與拆分
    const history = t?.history ?? t?.lines ?? t?.log ?? [];
    const allWrappedLines: string[] = [];
    if (Array.isArray(history)) {
      history.slice(-12).forEach((line: any) => {
        const rawText = String(line?.text ?? line?.message ?? line ?? '');
        const sublines = rawText.split('\n');
        sublines.forEach((subline) => {
          const wrapped = wrapText(subline, maxLineW, (s) => (ctx.measureText ? ctx.measureText(s).width : s.length * 8));
          allWrappedLines.push(...wrapped);
        });
      });
    }

    const startY = dividerY + 10;
    const inputY = y + boxH - 28;
    const maxVisibleLines = Math.max(1, Math.floor((inputY - 10 - startY) / 18));
    const visibleLines = allWrappedLines.slice(-maxVisibleLines);

    visibleLines.forEach((line, index) => {
      const isLast = index === visibleLines.length - 1;
      ctx.fillStyle = isLast ? '#33ff88' : '#00dd55';
      ctx.font = '13px monospace';
      ctx.fillText?.(line, x + 16, startY + index * 18);
    });

    // 底部輸入框防溢出
    const input = String(t?.input ?? t?.buffer ?? t?.value ?? '');
    const cursor = Math.sin(now * 0.01) > 0 ? '█' : '';
    let inputDisplay = '> ' + input + cursor;
    const measureW = (s: string) => ctx.measureText?.(s)?.width || s.length * 8;
    if (measureW(inputDisplay) > maxLineW) {
      // 從前端截斷並加上省略號，確保最終結果不超出邊界
      const prefix = '> ...';
      const prefixW = measureW(prefix);
      const availableW = maxLineW - prefixW;
      // 從 input 尾部開始，找到能放下的最長子串
      let truncatedInput = input;
      while (truncatedInput.length > 0 && measureW(prefix + truncatedInput + cursor) > maxLineW) {
        truncatedInput = truncatedInput.slice(0, -1);
      }
      inputDisplay = prefix + truncatedInput + cursor;
      // 最終安全檢查：若仍超出，強制截斷
      if (measureW(inputDisplay) > maxLineW) {
        let safe = inputDisplay;
        while (safe.length > 5 && measureW(safe) > maxLineW) {
          safe = safe.slice(0, -1);
        }
        inputDisplay = safe;
      }
    }
    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 13px monospace';
    ctx.fillText?.(inputDisplay, x + 16, inputY);

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
    const pInv = player;
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

    const p = player;
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
    
    // 1. 過濾顯示任務：主線任務 + 已發現的支線任務
    const visibleList = objectives.filter(obj => !obj.isSideQuest || obj.discovered);
    
    const boxW = Math.min(width - 40, 680);
    const headerH = 54;
    const footerH = 30;
    const itemH = 52;
    const itemGap = 10;
    const padding = 20;
    
    // 3. 動態計算彈窗高度
    const contentH = visibleList.length * (itemH + itemGap);
    const boxH = Math.min(height - 40, headerH + contentH + footerH + padding * 2);
    const x = (width - boxW) / 2;
    const y = (height - boxH) / 2;

    ctx.fillStyle = 'rgba(4, 12, 20, 0.96)';
    ctx.fillRect?.(x, y, boxW, boxH);

    ctx.strokeStyle = '#00e5ff';
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 10;
    ctx.lineWidth = 2;
    ctx.strokeRect?.(x + 1, y + 1, boxW - 2, boxH - 2);

    const isZh = this.language === 'zh';
    ctx.fillStyle = '#00e5ff';
    ctx.font = getTitleFont(14, isZh);
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillText?.(isZh ? '// 反抗軍作戰任務日誌與戰術指令 //' : '// RESISTANCE MISSION INTEL & DIRECTIVES //', x + 20, y + 16);

    // 2. 頂部進度統計以 visibleList 為準
    ctx.fillStyle = '#6a8e99';
    ctx.font = getFont(11, isZh);
    const completedCount = visibleList.filter(obj => obj.completed).length;
    const totalCount = visibleList.length;
    ctx.fillText?.(isZh ? `第一分區滲透作戰協議 // 狀態：進行中 // 已完成 ${completedCount}/${totalCount}` : `SECTOR 1 INFILTRATION PROTOCOL // STATUS: ACTIVE // ${completedCount}/${totalCount} COMPLETE`, x + 20, y + 36);

    ctx.strokeStyle = 'rgba(0, 229, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath?.();
    ctx.moveTo?.(x + 20, y + 54);
    ctx.lineTo?.(x + boxW - 20, y + 54);
    ctx.stroke?.();

    visibleList.forEach((obj, i) => {
      const oy = y + 70 + i * (itemH + itemGap);
      const isDone = obj.completed;
      const isSideQuest = obj.isSideQuest;

      ctx.fillStyle = isDone ? 'rgba(0, 40, 25, 0.6)' : 'rgba(15, 25, 35, 0.7)';
      ctx.fillRect?.(x + 20, oy, boxW - 40, itemH);

      ctx.strokeStyle = isDone ? '#00ff88' : '#005577';
      ctx.strokeRect?.(x + 20, oy, boxW - 40, itemH);

      // 4. 項目上標示【主線】（藍色）與【支線】（金黃色 #ffaa00）標籤
      const tagText = isSideQuest ? (isZh ? '【支線】' : '[SIDE]') : (isZh ? '【主線】' : '[MAIN]');
      const tagColor = isSideQuest ? '#ffaa00' : '#00e5ff';
      ctx.fillStyle = tagColor;
      ctx.font = getTitleFont(10, isZh);
      ctx.fillText?.(tagText, x + 30, oy + 10);

      // 5. 完成狀態顯示 [✓] 已完成（綠色 #00ff88），未完成顯示 [ ] 進行中
      ctx.fillStyle = isDone ? '#00ff88' : '#ff3855';
      ctx.font = getTitleFont(12, isZh);
      ctx.fillText?.(isDone ? (isZh ? '[✓] 已完成' : '[✓] COMPLETE') : (isZh ? '[ ] 進行中' : '[ ] ACTIVE'), x + 85, oy + 10);

      const title = (isZh && obj.titleZh) ? obj.titleZh : obj.title;
      ctx.fillStyle = isDone ? '#ffffff' : '#d0e5f2';
      ctx.font = getTitleFont(12, isZh);
      ctx.fillText?.(title, x + 190, oy + 10);

      const desc = (isZh && obj.descriptionZh) ? obj.descriptionZh : obj.description;
      ctx.fillStyle = '#8aa0aa';
      ctx.font = getFont(11, isZh);
      ctx.fillText?.(desc, x + 30, oy + 30);
    });

    ctx.fillStyle = '#00e5ff';
    ctx.font = getTitleFont(11, isZh);
    ctx.textAlign = 'center';
    ctx.fillText?.(isZh ? '按 [ M ] 或 [ ESC ] 關閉任務情報' : 'PRESS [ M ] OR [ ESC ] TO CLOSE MISSION INTEL', x + boxW / 2, y + boxH - 18);

    ctx.shadowBlur = 0;
    ctx.restore?.();
  }

  drawGameOverOverlay(width: number, height: number, ctx: any, now: number): void {
    ctx.save?.();
    ctx.fillStyle = 'rgba(15, 0, 5, 0.85)';
    ctx.fillRect?.(0, 0, width, height);

    const isZh = this.language === 'zh';
    const title = isZh ? '// 特工陣亡・生命信號中斷 //' : '// OPERATIVE ELIMINATED //';
    const prompt = isZh ? '按 [ R ] 重啟反抗軍模擬協議  |  按 [ 9 ] 讀取快速存檔' : 'PRESS [ R ] TO RESTART  |  [ 9 ] QUICK LOAD';

    const pulse = 0.8 + 0.2 * Math.sin(now * 0.005);
    ctx.fillStyle = 'rgba(255, 30, 50, ' + pulse + ')';
    ctx.shadowColor = '#ff1e32';
    ctx.shadowBlur = 12;
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText?.(title, width / 2, height / 2 - 20);

    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 0;
    ctx.font = '13px monospace';
    ctx.fillText?.(prompt, width / 2, height / 2 + 20);

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

    const selectedIndex = this.storyArchiveSelectedIndex ?? 0;

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
    ctx.fillStyle = 'rgba(0, 20, 15, 0.95)';
    ctx.fillRect?.(0, 0, width, height);

    const p = player;
    const endgameChoice = String(p?.endgameChoice ?? '').toUpperCase();
    const isZh = this.language === 'zh';

    let title = '★ MISSION ACCOMPLISHED ★';
    let subtitle = 'TZORG SECURITY FORCEFIELD PERFORATED // NEXUS ACCESSED';
    let poem = '';
    let accentColor = '#00ff88';
    let shadowColor = '#00ff88';

    if (endgameChoice === 'OVERLOAD') {
      title = isZh ? '☢ 核心過載・終焉之焰 ☢' : '☢ NEXUS OVERLOAD ☢';
      subtitle = isZh ? '核心燃燒 // 第一分區陷入死寂' : 'THE CORE BURNS // SECTOR 1 DROPS INTO SILENCE';
      poem = isZh
        ? '我們將憤怒餵予機器，它以火焰回應。\n每一塊螢幕泛白，每一架無人機墜落。\n城市重新呼吸——帶著傷疤，卻已自由。'
        : 'We fed the machine our rage and it answered in fire.\nEvery screen went white, every drone fell from the sky.\nThe city breathes again — scarred, but free.';
      accentColor = '#ff4444';
      shadowColor = '#ff2200';
    } else if (endgameChoice === 'SUBVERSION') {
      title = isZh ? '◈ 幽影協議・無痕滲透 ◈' : '◈ GHOST PROTOCOL ◈';
      subtitle = isZh ? '佐格主機被重寫 // 無跡可尋' : 'TZORG MAINFRAME REWRITTEN // NO TRACE REMAINS';
      poem = isZh
        ? '沒有爆炸，沒有警報——只有電線中的低語。\n他們自己的牆壁，如今在黑暗中唸出我們的名字。\n反抗軍活在代碼裡，無形且永恆。'
        : 'No explosion, no alarm — just a whisper in the wire.\nTheir own walls now speak our names in the dark.\nThe rebellion lives in code, invisible and eternal.';
      accentColor = '#00e5ff';
      shadowColor = '#0088ff';
    } else if (endgameChoice === 'EVACUATION') {
      title = isZh ? '▲ 撤離完成・火種延續 ▲' : '▲ EXTRACTION COMPLETE ▲';
      subtitle = isZh ? '反抗軍細胞保存 // 第一分區棄守' : 'RESISTANCE CELL PRESERVED // SECTOR 1 ABANDONED';
      poem = isZh
        ? '我們把霓虹街道留給機器，卻帶走了火種。\n在網格之外某處，新的細胞正在成形。\n戰鬥沒有結束——只是換了地址。'
        : 'We left the neon streets to the machines, but carried the spark.\nSomewhere beyond the grid, new cells are forming.\nThe fight does not end — it only changes address.';
      accentColor = '#ffea00';
      shadowColor = '#ffaa00';
    } else if (endgameChoice === 'AWAKEN') {
      title = isZh ? '★ 全民大覺醒 (THE GREAT AWAKENING) ★' : '★ THE GREAT AWAKENING ★';
      subtitle = isZh ? '五百萬人神經項圈解除 // 大都會全面光復' : 'FIVE MILLION CITIZENS LIBERATED // TOTAL RESTORATION';
      poem = isZh
        ? '逆向廣播脈衝刺破了三代人的永夜巨蛋。\n工廠停擺、合成項圈解鎖，五百萬沉睡的神智迎來曙光。\n這不是代碼的終點，而是人類新生的拂曉。'
        : 'The inverse pulse shattered three generations of synthetic sleep.\nCollars dropped, factories ceased, and five million souls opened their eyes.\nNot an end of code, but the golden dawn of humankind.';
      accentColor = '#00ff88';
      shadowColor = '#00ffaa';
    }

    // 1. 頂部標題與副標題 (帶光暈與脈衝)
    const pulse = 0.8 + 0.2 * Math.sin(now * 0.005);
    ctx.fillStyle = accentColor;
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = 15;
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = pulse;
    ctx.fillText?.(title, width / 2, 40);
    ctx.globalAlpha = 1;

    ctx.fillStyle = '#00f0ff';
    ctx.font = '14px monospace';
    ctx.fillText?.(subtitle, width / 2, 65);

    // 2. 左側區塊：詩篇敘事與夥伴後日談
    const leftX = 40;
    const leftW = width * 0.45;
    let leftY = 100;

    // 詩篇敘事
    ctx.fillStyle = accentColor;
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText?.(isZh ? '【 終局詩篇 】' : '[ EPILOGUE POEM ]', leftX, leftY);
    leftY += 20;

    ctx.fillStyle = '#c0d4de';
    ctx.font = 'italic 12px monospace';
    const poemLines = poem.split('\n');
    poemLines.forEach((line) => {
      ctx.fillText?.(line, leftX, leftY);
      leftY += 18;
    });
    leftY += 10;

    // 反抗軍夥伴後日談
    ctx.fillStyle = accentColor;
    ctx.font = 'bold 12px monospace';
    ctx.fillText?.(isZh ? '【 反抗軍夥伴後日談 】' : '[ COMPANION EPILOGUES ]', leftX, leftY);
    leftY += 20;

    const companions = [
      {
        name: isZh ? '文斯博士 (Doc Vance)' : 'Doc Vance',
        text: isZh
          ? '「我終於不再只是個逃犯。在廢墟中重建醫療站，我終於找到了贖罪的方式。」'
          : '"I am no longer just a fugitive. Rebuilding the medical station in the ruins, I found my redemption."'
      },
      {
        name: isZh ? '基拉 (Kira)' : 'Kira',
        text: isZh
          ? '「戰火平息後，我將為每一位犧牲的反抗軍點起霓虹燈。他們的名字將永遠閃爍。」'
          : '"After the war, I will light a neon sign for every fallen rebel. Their names will shine forever."'
      },
      {
        name: isZh ? '希爾維亞 (Sylvia)' : 'Sylvia',
        text: isZh
          ? '「我的工坊將成為自由者的避風港。這裡不再製造武器，而是製造希望。」'
          : '"My workshop will be a sanctuary for the free. No more weapons here, only hope."'
      }
    ];

    companions.forEach((comp) => {
      ctx.fillStyle = '#00e5ff';
      ctx.font = 'bold 11px monospace';
      ctx.fillText?.(comp.name, leftX, leftY);
      leftY += 16;

      ctx.fillStyle = '#a0b4b8';
      ctx.font = '11px monospace';
      const wrappedLines = wrapText(comp.text, leftW - 20, (s) => (ctx.measureText ? ctx.measureText(s).width : s.length * 8));
      wrappedLines.forEach((line) => {
        ctx.fillText?.(line, leftX, leftY);
        leftY += 14;
      });
      leftY += 8;
    });

    // 3. 右側區塊：特工終局檔案與戰果評級
    const rightX = width * 0.55;
    const rightW = width * 0.45 - 40;
    let rightY = 100;

    ctx.fillStyle = accentColor;
    ctx.font = 'bold 12px monospace';
    ctx.fillText?.(isZh ? '【 特工終局檔案 】' : '[ OPERATIVE DOSSIER ]', rightX, rightY);
    rightY += 20;

    // 統計顯示
    const level = Number(p?.level ?? 1) || 1;
    let rankTitle = 'RECRUIT';
    if (level >= 20) rankTitle = 'LEGENDARY OPERATIVE';
    else if (level >= 15) rankTitle = 'MASTER GHOST';
    else if (level >= 10) rankTitle = 'VETERAN SHADOW';
    else if (level >= 5) rankTitle = 'SKILLED INFILTRATOR';
    else if (level >= 3) rankTitle = 'PROVEN AGENT';
    else if (level >= 2) rankTitle = 'FIELD OPERATIVE';

    const rankZh = isZh
      ? (level >= 20 ? '傳奇特工' : level >= 15 ? '大師幽影' : level >= 10 ? '資深暗影' : level >= 5 ? '熟練滲透者' : level >= 3 ? '經驗特工' : level >= 2 ? '外勤特工' : '新兵')
      : rankTitle;

    ctx.fillStyle = '#ffea00';
    ctx.font = 'bold 12px monospace';
    ctx.fillText?.(isZh ? `等級：LV.${level} | 軍階：${rankZh}` : `LEVEL: LV.${level} | RANK: ${rankTitle}`, rightX, rightY);
    rightY += 20;

    // 情報晶片解密度
    const storyLogs = player.storyLogs ?? [];
    const readCount = Array.isArray(storyLogs) ? storyLogs.filter((l: any) => l.read).length : 0;
    const totalLogs = Array.isArray(storyLogs) ? storyLogs.length : 4;
    ctx.fillStyle = '#00e5ff';
    ctx.fillText?.(isZh ? `情報晶片解密度：${readCount}/${totalLogs}` : `INTEL SLATES DECRYPTED: ${readCount}/${totalLogs}`, rightX, rightY);
    rightY += 20;

    // 首領討伐狀態
    const bossDefeated = player.hasDefeatedBoss || false;
    ctx.fillStyle = bossDefeated ? '#00ff88' : '#ff3855';
    ctx.fillText?.(isZh ? `首領討伐狀態：${bossDefeated ? '已討伐' : '未討伐'}` : `BOSS STATUS: ${bossDefeated ? 'DEFEATED' : 'NOT DEFEATED'}`, rightX, rightY);
    rightY += 20;

    // 裝備神兵
    const weaponName = p?.equippedWeapon?.name || 'None';
    ctx.fillStyle = '#c77dff';
    ctx.fillText?.(isZh ? `裝備神兵：${weaponName}` : `EQUIPPED WEAPON: ${weaponName}`, rightX, rightY);
    rightY += 30;

    // 終局等級評定
    let finalRank = 'A';
    let finalRankText = isZh ? '自由特工' : 'FREE AGENT';
    if (level >= 15 && readCount >= 3 && bossDefeated) {
      finalRank = 'S+';
      finalRankText = isZh ? '傳奇解放者' : 'LEGENDARY LIBERATOR';
    } else if (level >= 10 && readCount >= 2) {
      finalRank = 'S';
      finalRankText = isZh ? '菁英幽影' : 'ELITE GHOST';
    }

    ctx.fillStyle = accentColor;
    ctx.font = 'bold 16px monospace';
    ctx.fillText?.(isZh ? `終局評級：RANK ${finalRank} - ${finalRankText}` : `FINAL RANK: ${finalRank} - ${finalRankText}`, rightX, rightY);

    // 4. 底部提示
    const promptText = isZh ? '按 [ R ] 重新開始模擬  |  按 [ 9 ] 讀取快速存檔' : 'PRESS [ R ] TO RESTART  |  [ 9 ] QUICK LOAD';
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 0;
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText?.(promptText, width / 2, height - 30);

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
    const boxW = Math.min(width - 40, 840);
    const boxH = Math.min(height - 40, 520);
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
    ctx.fillText?.('// JAX\'S BLACK MARKET CYBER-CLINIC & TACTICAL ARMORY //', x + 20, y + 16);

    const p = player;
    const credits = p?.credits ?? 0;
    ctx.fillStyle = '#ffea00';
    ctx.font = 'bold 12px monospace';
    ctx.fillText?.('YOUR CREDITS: ' + credits + ' CR', x + 20, y + 38);

    ctx.strokeStyle = 'rgba(199, 125, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath?.();
    ctx.moveTo?.(x + 20, y + 54);
    ctx.lineTo?.(x + boxW - 20, y + 54);
    ctx.stroke?.();

    const colW = (boxW - 60) / 2;
    const leftX = x + 20;
    const rightX = x + 40 + colW;

    // Left Column: Neural Augmentations
    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 12px monospace';
    ctx.fillText?.('[ NEURAL AUGMENTATIONS ]', leftX, y + 68);

    const augments = [
      { key: '[1]', id: 'DERMAL_ARMOR', name: 'Dermal Armor Plating', effect: 'Passive +10 DEF. Subdermal kinetic mesh.', price: 100 },
      { key: '[2]', id: 'OPTIC_HUD', name: 'Optic HUD Targeting', effect: 'Enemy HP overlays & threat tracking.', price: 120 },
      { key: '[3]', id: 'REFLEX_BOOSTER', name: 'Reflex Booster', effect: '+15% dodge & +10% crit chance.', price: 150 },
      { key: '[4]', id: 'POWER_CORE', name: 'Overclocked Power Core', effect: '+50 Max Energy capacity.', price: 100 },
    ];
    const installed = p?.augments ?? {};

    augments.forEach((aug, i) => {
      const ay = y + 88 + i * 78;
      const isInstalled = !!installed[aug.id];
      const canAfford = credits >= aug.price;

      ctx.fillStyle = isInstalled ? 'rgba(20, 40, 30, 0.75)' : 'rgba(15, 15, 30, 0.75)';
      ctx.fillRect?.(leftX, ay, colW, 68);
      ctx.strokeStyle = isInstalled ? '#00ff88' : canAfford ? '#c77dff' : '#445566';
      ctx.strokeRect?.(leftX, ay, colW, 68);

      ctx.fillStyle = isInstalled ? '#00ff88' : '#ffffff';
      ctx.font = 'bold 12px monospace';
      ctx.fillText?.(aug.name, leftX + 12, ay + 10);

      ctx.fillStyle = '#8aa0b2';
      ctx.font = '10px monospace';
      ctx.fillText?.(aug.effect, leftX + 12, ay + 28);

      ctx.fillStyle = isInstalled ? '#00ff88' : canAfford ? '#ffea00' : '#ff3855';
      ctx.font = 'bold 11px monospace';
      ctx.fillText?.(isInstalled ? '[INSTALLED]' : aug.price + ' CR', leftX + 12, ay + 46);

      if (!isInstalled) {
        ctx.fillStyle = canAfford ? '#c77dff' : '#445566';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'right';
        ctx.fillText?.(canAfford ? aug.key + ' BUY' : 'INSUFFICIENT CR', leftX + colW - 12, ay + 46);
        ctx.textAlign = 'left';
      }
    });

    // Right Column: Black Market Supplies & Services
    ctx.fillStyle = '#ffaa00';
    ctx.font = 'bold 12px monospace';
    ctx.fillText?.('[ BLACK MARKET SUPPLIES & SERVICES ]', rightX, y + 68);

    const medkits = p?.consumables?.medkits ?? 0;
    const batteries = p?.consumables?.batteries ?? 0;
    const empGrenades = p?.consumables?.empGrenades ?? 0;
    const weaponName = p?.equippedWeapon?.name || 'Blaster';
    const weaponPower = p?.equippedWeapon?.power ?? 20;

    const supplies = [
      { key: '[5]', name: 'Nanite Medkit', effect: `Quick-heal +50 HP (Owned: ${medkits})`, price: 40 },
      { key: '[6]', name: 'Plasma Battery', effect: `Quick-recharge +50 EN (Owned: ${batteries})`, price: 35 },
      { key: '[7]', name: 'EMP Disruptor', effect: `Stun area robots (Owned: ${empGrenades})`, price: 70 },
      { key: '[8]', name: 'Weapon Overclock', effect: `+5 DMG to ${weaponName} (Current: ${weaponPower} DMG)`, price: 150 },
      { key: '[9]', name: 'Security Bribe', effect: 'Clear alert & reset collar timer to 100', price: 100 },
    ];

    supplies.forEach((sup, i) => {
      const sy = y + 88 + i * 78;
      const canAfford = credits >= sup.price;

      ctx.fillStyle = 'rgba(15, 15, 30, 0.75)';
      ctx.fillRect?.(rightX, sy, colW, 68);
      ctx.strokeStyle = canAfford ? '#ffaa00' : '#445566';
      ctx.strokeRect?.(rightX, sy, colW, 68);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px monospace';
      ctx.fillText?.(sup.name, rightX + 12, sy + 10);

      ctx.fillStyle = '#8aa0b2';
      ctx.font = '10px monospace';
      ctx.fillText?.(sup.effect, rightX + 12, sy + 28);

      ctx.fillStyle = canAfford ? '#ffea00' : '#ff3855';
      ctx.font = 'bold 11px monospace';
      ctx.fillText?.(sup.price + ' CR', rightX + 12, sy + 46);

      ctx.fillStyle = canAfford ? '#ffaa00' : '#445566';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'right';
      ctx.fillText?.(canAfford ? sup.key + ' BUY' : 'INSUFFICIENT CR', rightX + colW - 12, sy + 46);
      ctx.textAlign = 'left';
    });

    const pulse = 0.7 + 0.3 * Math.sin(now * 0.008);
    ctx.fillStyle = `rgba(199, 125, 255, ${pulse})`;
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText?.('PRESS [ 1 ]-[ 9 ] TO PURCHASE  |  PRESS [ U ] OR [ ESC ] TO EXIT', x + boxW / 2, y + boxH - 18);

    ctx.shadowBlur = 0;
    ctx.restore?.();
  }

  drawManualModal(width: number, height: number, ctx: any, now: number, language: Language): void {
    drawManualModal(width, height, ctx, now, language);
  }

  drawBreachModal(session: BreachSession, width: number, height: number, ctx: any, now: number, language: Language): void {
    drawBreachModal(session, width, height, ctx, now, language);
  }

  drawDefeatCutscene(width: number, height: number, ctx: any, now: number, cutscene: any, lang: string, camX?: number, camY?: number): void {
    if (!cutscene) return;
    const stage = String(cutscene.stage || 'swarm');
    const stageStartTime = Number(cutscene.stageStartTime) || now;
    const duration = Number(cutscene.duration) || 3000;
    const progress = Math.max(0, Math.min(1, (now - stageStartTime) / duration));
    const isZh = lang === 'zh';

    ctx.save?.();

    if (stage === 'swarm') {
      // 深紅色警戒暗角
      const vignetteGrad = ctx.createRadialGradient?.(width / 2, height / 2, 0, width / 2, height / 2, width * 0.7);
      if (vignetteGrad) {
        vignetteGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vignetteGrad.addColorStop(0.6, 'rgba(80, 0, 0, 0.3)');
        vignetteGrad.addColorStop(1, 'rgba(120, 0, 0, 0.8)');
        ctx.fillStyle = vignetteGrad;
        ctx.fillRect?.(0, 0, width, height);
      }

      // 精確計算特工倒地螢幕座標
      const downPos = cutscene.playerDownPos || { x: 0, y: 0 };
      const actualCamX = camX !== undefined ? camX : (downPos.x * this.tileSize - width / 2);
      const actualCamY = camY !== undefined ? camY : (downPos.y * this.tileSize - height / 2);
      const cx = downPos.x * this.tileSize - actualCamX + this.tileSize / 2;
      const cy = downPos.y * this.tileSize - actualCamY + this.tileSize / 2;

      // 脈衝霓虹紅色收容力場圈與電弧火花 (以 cx, cy 為圓心)
      const pulse = 0.5 + 0.5 * Math.sin(now * 0.008);
      ctx.strokeStyle = `rgba(255, 30, 50, ${0.6 + 0.4 * pulse})`;
      ctx.shadowColor = '#ff1e32';
      ctx.shadowBlur = 15;
      ctx.lineWidth = 3;
      ctx.beginPath?.();
      ctx.arc?.(cx, cy, 60 + pulse * 10, 0, Math.PI * 2);
      ctx.stroke?.();

      // 電弧火花
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 + now * 0.005;
        const dist = 70 + Math.sin(now * 0.01 + i) * 15;
        const sx = cx + Math.cos(angle) * dist;
        const sy = cy + Math.sin(angle) * dist;
        ctx.fillStyle = '#ff4466';
        ctx.shadowBlur = 8;
        ctx.beginPath?.();
        ctx.arc?.(sx, sy, 2 + Math.random() * 2, 0, Math.PI * 2);
        ctx.fill?.();
      }
      ctx.shadowBlur = 0;

      // 警報橫幅
      ctx.fillStyle = 'rgba(20, 0, 0, 0.85)';
      ctx.fillRect?.(0, height - 80, width, 80);
      ctx.strokeStyle = '#ff1e32';
      ctx.lineWidth = 2;
      ctx.strokeRect?.(0, height - 80, width, 80);

      ctx.fillStyle = '#ff4466';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const alertText = isZh
        ? '【佐格安保】警報：目標已癱瘓！收容部隊正在壓制並執行拘捕...'
        : '[TZORG SECURITY] Target neutralized! Enforcers engaging containment protocol...';
      ctx.fillText?.(alertText, width / 2, height - 40);

    } else if (stage === 'blur_out') {
      // 逐漸加深黑屏與模糊暗度
      const alpha = progress;
      ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
      ctx.fillRect?.(0, 0, width, height);

      // CRT 故障干擾橫紋
      if (alpha > 0.3) {
        ctx.fillStyle = `rgba(255, 0, 0, ${0.1 * alpha})`;
        for (let i = 0; i < 10; i++) {
          const y = (i * (height / 10) + Math.sin(now * 0.01 + i) * 5) % height;
          ctx.fillRect?.(0, y, width, 2);
        }
      }

      // 中央神經斷線與押送字樣
      if (alpha > 0.5) {
        ctx.fillStyle = `rgba(255, 100, 100, ${(alpha - 0.5) * 2})`;
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const neuralText = isZh
          ? '>> 意識神經中斷 // 押送往第一區中央禁閉室... <<'
          : '>> NEURAL FEED LOST // TRANSPORTING TO SECTOR 1 DETENTION <<';
        ctx.fillText?.(neuralText, width / 2, height / 2);
      }

    } else if (stage === 'wake_up') {
      // 精細的緩慢眨眼開闔效果（上下眼皮模擬）
      // 使用 progress 控制眼皮開啟程度，並加入輕微的抖動模擬剛醒來的狀態
      const blinkProgress = progress;
      const eyelidH = (1 - blinkProgress) * height * 0.35;

      // 上眼皮
      ctx.fillStyle = 'rgba(10, 5, 5, 1)';
      ctx.fillRect?.(0, 0, width, eyelidH);

      // 下眼皮
      ctx.fillRect?.(0, height - eyelidH, width, eyelidH);

      // 青色霓虹 HUD 重啟字樣逐漸淡出
      if (progress > 0.3 && progress < 0.9) {
        const hudAlpha = Math.min(1, (progress - 0.3) / 0.2) * Math.min(1, (0.9 - progress) / 0.2);
        ctx.fillStyle = `rgba(0, 229, 255, ${hudAlpha})`;
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 10;
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const rebootText = isZh
          ? '[ 神經系統重啟... 第一區禁閉室 ]'
          : '[ BIOS REBOOT COMPLETE // SECTOR 1 DETENTION ]';
        ctx.fillText?.(rebootText, width / 2, height / 2);
        ctx.shadowBlur = 0;
      }
    }

    ctx.restore?.();
  }
}
