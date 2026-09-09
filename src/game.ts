import type { SectorMap, Player, Robot, SecurityLevel, GameMessage, Position, RobotType, NPC, DialogueSession, GroundItem, MissionObjective, StoryLog, Hazard, Language, LaserBeam } from './types';

export interface PushableBlock {
  id: string;
  x: number;
  y: number;
  name: string;
  nameZh?: string;
  blockType?: 'disguised_wall' | 'crate' | 'server_rack';
  secretDoor?: { x: number; y: number };
  revealed: boolean;
  revealedTile?: number | string;
  secretSurprise?: {
    type: 'credits' | 'energy' | 'item';
    amount?: number;
    item?: GroundItem;
    messageZh?: string;
    messageEn?: string;
    claimed?: boolean;
  };
}
import { buildSector1Map, buildSector2Map, calculateFOV, disableForcefield, getTile, isWalkable, toggleDoor } from './map';
import { hasSavedGame, saveGameState, loadGameState } from './saveLoad';
import { createPlayer, createRobot, toggleWeaponDraw, toggleDisguise, installAugment, cycleWeapon, createQuantumAnnihilator } from './entities';
import { updateRobotAI } from './ai';
import { TerminalSession } from './terminal';
import { GameRenderer } from './renderer';
import { soundFX } from './audio';
import { getSector1NPCs, getSector2NPCs, getSectorStoryLogs } from './dialogues';
import { createBossExterminator, isBossRobot, applyBossDamage } from './boss';
import { createBreachSession, moveBreachCursor, selectBreachCell, type BreachSession } from './breachProtocol';
import { handleSpecialInput } from './inputHandler';
import { bgm } from './music';
import { setupSubSectorZero, getNextSectorId } from './sewerMap';
import { setupCitadel, buildCitadelMap } from './citadelMap';
import { FXManager } from './fx';
import { updateNPC } from './npcAI';

export interface ResolutionPreset {
  width: number;
  height: number;
  label: string;
}

export const RESOLUTION_PRESETS: ResolutionPreset[] = [
  { width: 960, height: 600, label: '960x600 [STD]' },
  { width: 1200, height: 750, label: '1200x750 [HD]' },
  { width: 800, height: 500, label: '800x500 [COMPACT]' },
];

export class GameEngine {
  canvas: HTMLCanvasElement;
  renderer: GameRenderer;
  map: SectorMap;
  player: Player;
  robots: Robot[];
  npcs: NPC[];
  groundItems: GroundItem[];
  missionObjectives: MissionObjective[];
  storyLogs: StoryLog[];
  activeStoryLog: StoryLog | null = null;
  isInventoryOpen: boolean = false;
  isMissionLogOpen: boolean = false;
  isStoryArchiveOpen: boolean = false;
  securityLevel: SecurityLevel;
  messages: GameMessage[];
  visibleTiles: Set<string>;
  exploredTiles: Set<string>;
  activeTerminal: TerminalSession | null;
  activeDialogue: DialogueSession | null;
  laserBeams: LaserBeam[];
  floatingTexts: Array<{ x: number; y: number; text: string; color: string; createdAt?: number }>;
  hazards: Hazard[] = [];
  isAugmentShopOpen: boolean = false;
  terminalInputBuffer: string = '';
  victory: boolean = false;
  isTitleScreen: boolean = false;
  language: Language = 'zh';
  isManualOpen: boolean = false;
  activeBreachSession: BreachSession | null = null;
  isOmniVisionActive: boolean = false;
  isFullMapActive: boolean = false;
  isBigMapOpen: boolean = false;
  bigMapSelectedSector: string = 'current';
  currentResolutionIndex: number = 0;
  fx: FXManager = new FXManager();
  activeWaypoint: { x: number; y: number; name: string; color: string } | null = null;
  endgameChoice: string | null = null;
  synthwaveTapeActive: boolean = false;
  ramenQuestComplete: boolean = false;
  zeroOneWeaponForged: boolean = false;
  forcefieldDisabled: boolean = false;
  isCollarDisarmed: boolean = false;
  private turnCounter: number = 0;
  private lastBroadcastTurn: number = 0;
  private lastBroadcastIndex: number = 0;
  private broadcastQueue: string[] = [];
  checkInAlertActive: boolean = false;
  private lastSectorId: string = '';
  private lastLandmarkKey: string = '';
  storyArchiveSelectedIndex: number = 0;
  sectorGroundItems: Record<string, GroundItem[]> = {};
  pushableBlocks: PushableBlock[] = [];
  sectorPushableBlocks: Record<string, PushableBlock[]> = {};

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    let savedLang: Language = 'zh';
    try {
      if (typeof localStorage !== 'undefined') {
        const l = localStorage.getItem('metropolis_2400_lang');
        if (l === 'en' || l === 'zh') savedLang = l as Language;
      }
    } catch {}
    this.language = savedLang;
    this.isTitleScreen = (typeof window !== 'undefined' && typeof window.document !== 'undefined');
    this.renderer = new GameRenderer(canvas);
    this.map = buildSector1Map();
    this.player = createPlayer(this.map.playerStart);
    this.robots = this.createSectorRobots();
    this.npcs = this.createSectorNPCs();
    this.storyLogs = this.createSectorStoryLogs();
    this.groundItems = this.createSectorItems();
    this.missionObjectives = this.createSectorObjectives();
    this.hazards = this.createSectorHazards();
    this.pushableBlocks = this.createSectorPushableBlocks('sector-1');
    this.isAugmentShopOpen = false;
    this.isInventoryOpen = false;
    this.isMissionLogOpen = false;
    this.isStoryArchiveOpen = false;
    this.activeStoryLog = null;
    this.securityLevel = 'CLEAR' as SecurityLevel;
    this.messages = [];
    this.floatingTexts = [];
    this.pushMessage('OPERATION PROMETHEUS: Neural link restored. Operative Raven online.', 'info');
    this.pushMessage('MISSION: Recover encrypted data slates & breach Checkpoint 01.', 'warning');
    this.pushMessage('INTEL: Speak with Kira [T], check tactical missions [M], inventory [I], archives [L].', 'info');
    this.visibleTiles = new Set<string>();
    this.exploredTiles = new Set<string>();
    this.activeTerminal = null;
    this.activeDialogue = null;
    this.laserBeams = [];
    this.terminalInputBuffer = '';
    this.victory = false;
    this.updateFOV();
    this.render();
    this.startAnimationLoop();
    this.setupPointerEvents();
    (this.player as any).checkInTimer = 100;
  }

  private setupPointerEvents(): void {
    if (typeof window === 'undefined' || !this.canvas || typeof this.canvas.addEventListener !== 'function') return;
    this.canvas.addEventListener('pointerdown', (e: PointerEvent) => {
      if (!this.isStoryArchiveOpen) return;
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const logs = this.storyLogs;
      if (!logs || logs.length === 0) return;

      const boxW = Math.min(this.canvas.width - 40, 720);
      const boxH = Math.min(this.canvas.height - 60, 440);
      const startX = (this.canvas.width - boxW) / 2;
      const startY = (this.canvas.height - boxH) / 2;

      for (let i = 0; i < logs.length; i++) {
        const cardX = startX + 20;
        const cardY = startY + 66 + i * 80;
        const cardW = boxW - 40;
        const cardH = 70;
        if (x >= cardX && x <= cardX + cardW && y >= cardY && y <= cardY + cardH) {
          this.storyArchiveSelectedIndex = i;
          this.openStoryLog(logs[i]);
          return;
        }
      }
    });
  }

  private getBroadcastMessages(): string[] {
    const isZh = this.language === 'zh';
    const sectorId = this.map?.id || 'sector-1';
    const msgs: string[] = [];

    // Resistance encrypted broadcast
    if (isZh) {
      msgs.push('【反抗軍加密頻道 7.83GHz】「所有單位注意：佐格巡邏隊已切換至夜間高壓模式。保持靜默，避免聲學暴露。——鬼影」');
      msgs.push('【反抗軍加密頻道 7.83GHz】「中央核心能量讀數異常上升。佐格正在充能終端協議。我們必須在他們完成之前行動。——基拉」');
      msgs.push('【反抗軍加密頻道 7.83GHz】「下水道毒性遙測：氨濃度 0.4ppm，可安全通行。但請注意腐蝕性液體池。——文斯博士」');
      msgs.push('【反抗軍加密頻道 7.83GHz】「偵測到佐格量子通訊脈衝。他們正在同步終端協議。時間不多了。——鬼影」');
    } else {
      msgs.push('[RESISTANCE ENCRYPTED 7.83GHz] "All units: Tzorg patrols switched to night-high-alert. Maintain silence, avoid acoustic exposure. — Ghost"');
      msgs.push('[RESISTANCE ENCRYPTED 7.83GHz] "Central core energy readings spiking. Tzorg is charging the Endgame Protocol. We must act before completion. — Kira"');
      msgs.push('[RESISTANCE ENCRYPTED 7.83GHz] "Sewer toxicity telemetry: ammonia 0.4ppm, safe to traverse. Watch for corrosive pools. — Dr. Vance"');
      msgs.push('[RESISTANCE ENCRYPTED 7.83GHz] "Detecting Tzorg quantum comm pulses. They are syncing the Endgame Protocol. Time is short. — Ghost"');
    }

    // Tzorg official broadcast
    if (isZh) {
      msgs.push('【佐格官方廣播】「市民請注意：根據《秩序法》第7條，未經授權進入管制區域者將被立即中和。佐格為您服務。佐格保護您。佐格愛您。」');
      msgs.push('【佐格官方廣播】「提醒：所有仿生體必須每24小時進行忠誠度校準。未校準者將被標記為異常。佐格感謝您的配合。」');
      msgs.push('【佐格官方廣播】「安全提醒：偵測到未經授權的電子訊號干擾。所有巡邏單位進入警戒狀態。佐格永遠與您同在。」');
    } else {
      msgs.push('[TZORG OFFICIAL BROADCAST] "Citizens: Under Order Statute §7, unauthorized entry into restricted zones will result in immediate neutralization. Tzorg serves. Tzorg protects. Tzorg loves you."');
      msgs.push('[TZORG OFFICIAL BROADCAST] "Reminder: All synthetics must undergo loyalty calibration every 24 hours. Uncalibrated units will be flagged as anomalous. Tzorg thanks your cooperation."');
      msgs.push('[TZORG OFFICIAL BROADCAST] "Security alert: Unauthorized electronic signal interference detected. All patrol units entering alert state. Tzorg is always with you."');
    }

    // Sector-specific ambient
    if (sectorId === 'sub-sector-0') {
      if (isZh) {
        msgs.push('【環境遙測】「下水道濕度 94%。腐蝕性液體池溫度 42°C。注意：仿生生態林冠正在分泌酸性孢子。」');
      } else {
        msgs.push('[AMBIENT TELEMETRY] "Sewer humidity 94%. Corrosive pool temp 42°C. Caution: Bionic canopy secreting acidic spores."');
      }
    } else if (sectorId === 'sector-2') {
      if (isZh) {
        msgs.push('【環境遙測】「製造複合體：機械臂活動頻率上升。輸送帶負載 87%。偵測到量子核心充能脈衝。」');
      } else {
        msgs.push('[AMBIENT TELEMETRY] "Fab-Plex: Arm activity frequency rising. Conveyor load 87%. Quantum core charging pulse detected."');
      }
    }

    return msgs;
  }

  private pushBroadcast(): void {
    const msgs = this.getBroadcastMessages();
    if (msgs.length === 0) return;
    const idx = this.lastBroadcastIndex % msgs.length;
    this.lastBroadcastIndex++;
    this.pushMessage(msgs[idx], 'info');
  }

  private getLandmarkKey(): string {
    const px = this.player.x;
    const py = this.player.y;
    const sectorId = this.map?.id || '';
    // Check for special landmarks
    if (sectorId === 'sector-1') {
      if (px >= 3 && px <= 8 && py >= 3 && py <= 8) return 'safehouse';
      if (px >= 18 && px <= 22 && py >= 10 && py <= 14) return 'cyber-park';
      if (px >= 26 && px <= 30 && py >= 4 && py <= 8) return 'checkpoint';
      if (px >= 34 && px <= 38 && py >= 23 && py <= 27) return 'elevator';
    } else if (sectorId === 'sector-2') {
      if (px >= 2 && px <= 6 && py >= 3 && py <= 7) return 'fab-entrance';
      if (px >= 28 && px <= 36 && py >= 16 && py <= 24) return 'overmind-core';
    } else if (sectorId === 'sub-sector-0') {
      if (px >= 2 && px <= 6 && py >= 3 && py <= 7) return 'sewer-entrance';
      if (px >= 30 && px <= 36 && py >= 20 && py <= 26) return 'sewer-exit';
    }
    return 'none';
  }

  private checkEnvironmentalObservations(): void {
    const px = this.player.x;
    const py = this.player.y;
    const isZh = this.language === 'zh';
    const sectorId = this.map?.id || '';

    // Conveyor belt observation
    if (this.isConveyorTile(px, py)) {
      const key = `conveyor-${px},${py}`;
      if (this.lastLandmarkKey !== key) {
        this.lastLandmarkKey = key;
        if (isZh) {
          this.pushFloatingText(px, py, '⚙ 輸送帶啟動 ⚙', '#00f0ff');
          this.pushMessage('履帶齒輪咬合，金屬表面微微振動。你被機械之手輕輕推向下一站。', 'info');
        } else {
          this.pushFloatingText(px, py, '⚙ CONVEYOR ACTIVE ⚙', '#00f0ff');
          this.pushMessage('Gear teeth mesh with a low hum. The metal surface vibrates beneath your boots as the belt carries you forward.', 'info');
        }
      }
    }

    // Plasma barrier proximity
    if (sectorId === 'sector-1' && px >= 24 && px <= 28 && py >= 5 && py <= 9) {
      const key = 'plasma-barrier';
      if (this.lastLandmarkKey !== key) {
        this.lastLandmarkKey = key;
        if (isZh) {
          this.pushFloatingText(px, py, '⚡ 電漿屏障 ⚡', '#ff2a4b');
          this.pushMessage('高能量電漿屏障在前方脈動，藍白色的弧光在空氣中嘶嘶作響。空氣中瀰漫著臭氧的刺鼻氣味。', 'info');
        } else {
          this.pushFloatingText(px, py, '⚡ PLASMA BARRIER ⚡', '#ff2a4b');
          this.pushMessage('The high-energy plasma barrier pulses ahead, blue-white arcs crackling through the air. The ozone stings your nostrils.', 'info');
        }
      }
    }

    // Bionic canopy proximity (sewer sector)
    if (sectorId === 'sub-sector-0' && px >= 10 && px <= 30 && py >= 8 && py <= 18) {
      const key = 'bionic-canopy';
      if (this.lastLandmarkKey !== key) {
        this.lastLandmarkKey = key;
        if (isZh) {
          this.pushFloatingText(px, py, '🌿 仿生生態林冠 🌿', '#00ff88');
          this.pushMessage('發光的仿生藤蔓從天花板垂下，分泌著微弱的酸性孢子。你的皮膚感到一陣輕微的刺痛。', 'info');
        } else {
          this.pushFloatingText(px, py, '🌿 BIONIC CANOPY 🌿', '#00ff88');
          this.pushMessage('Glowing bionic vines drape from the ceiling, secreting faint acidic spores. A mild sting prickles your skin.', 'info');
        }
      }
    }

    // Landmark entry observation
    const landmark = this.getLandmarkKey();
    if (landmark !== 'none' && this.lastLandmarkKey !== landmark) {
      this.lastLandmarkKey = landmark;
      const observations: Record<string, { zh: string; en: string }> = {
        safehouse: {
          zh: '反抗軍安全屋：牆壁上貼滿手繪地圖與戰術標記。空氣中瀰漫著咖啡與機油混合的氣味。',
          en: 'Rebel Safehouse: Hand-drawn maps and tactical markers cover the walls. The air smells of coffee and machine oil.',
        },
        'cyber-park': {
          zh: '賽博公園：全息廣告在霧氣中閃爍，仿生花朵在人工陽光下綻放。一切看起來如此完美，如此虛假。',
          en: 'Cyber Park: Holographic ads flicker through the mist, bionic flowers bloom under artificial sun. Everything looks so perfect, so false.',
        },
        checkpoint: {
          zh: '檢查站：佐格巡邏隊在前方警戒。探照燈掃過街道，每一道光都帶著殺意。',
          en: 'Checkpoint: Tzorg patrols stand guard ahead. Searchlights sweep the streets, each beam carrying the weight of intent.',
        },
        elevator: {
          zh: '升降機：金屬門微微震動，等待著你的指令。通往製造複合體的通道就在眼前。',
          en: 'Elevator: The metal doors hum softly, awaiting your command. The passage to the Fab-Plex lies before you.',
        },
        'fab-entrance': {
          zh: '製造複合體入口：機械臂的節奏性運動在遠處形成一種催眠的旋律。空氣中瀰漫著焊接與金屬的氣味。',
          en: 'Fab-Plex Entrance: The rhythmic motion of mechanical arms forms a hypnotic melody in the distance. The air reeks of welding and metal.',
        },
        'overmind-core': {
          zh: '中央超心智核心：巨大的量子處理器在黑暗中脈動，藍色的光線如心跳般規律。這裡是佐格的控制中樞。',
          en: 'Central Overmind Core: The massive quantum processor pulses in the darkness, blue light beating in a steady rhythm. This is Tzorg\'s control nexus.',
        },
        'sewer-entrance': {
          zh: '下水道入口：腐蝕性液體在腳下潺潺流動，發出微弱的嘶嘶聲。黑暗在前方張開雙臂。',
          en: 'Sewer Entrance: Corrosive liquid trickles at your feet, hissing softly. The darkness ahead opens its arms.',
        },
        'sewer-exit': {
          zh: '下水道出口：新鮮的空氣從遠處湧來，帶著一絲自由的味道。出口就在前方。',
          en: 'Sewer Exit: Fresh air rushes in from the distance, carrying a hint of freedom. The exit lies ahead.',
        },
      };
      const obs = observations[landmark];
      if (obs) {
        this.pushMessage(isZh ? obs.zh : obs.en, 'info');
      }
    }
  }

  private startAnimationLoop(): void {
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      const anim = () => {
        this.render();
        window.requestAnimationFrame(anim);
      };
      window.requestAnimationFrame(anim);
    }
  }

  private createSectorRobots(): Robot[] {
    return [
      createRobot('SCOUT_DRONE' as RobotType, { x: 12, y: 5 }, [{ x: 12, y: 5 }, { x: 12, y: 12 }]),
      createRobot('SCOUT_DRONE' as RobotType, { x: 18, y: 8 }, [{ x: 18, y: 8 }, { x: 24, y: 8 }]),
      createRobot('SHOCK_ENFORCER' as RobotType, { x: 24, y: 6 }, [{ x: 24, y: 5 }, { x: 24, y: 8 }]),
      createRobot('HUNTER_KILLER' as RobotType, { x: 32, y: 18 }, [{ x: 32, y: 18 }, { x: 32, y: 24 }]),
      createRobot('SERVICE_BOT' as RobotType, { x: 8, y: 10 }, [{ x: 8, y: 10 }, { x: 8, y: 14 }]),
    ];
  }

  private createSectorNPCs(): NPC[] {
    return getSector1NPCs();
  }

  private createSector2NPCs(): NPC[] {
    return getSector2NPCs();
  }

  private createSectorStoryLogs(): StoryLog[] {
    const baseLogs = getSectorStoryLogs();
    const existingIds = new Set(baseLogs.map((l) => l.id));
    const extraLogs: StoryLog[] = [];

    if (!existingIds.has('slate-tzorg')) {
      extraLogs.push({
        id: 'slate-tzorg',
        title: 'Tzorg Security Directive',
        read: false,
        content: 'CLASSIFIED: Subject Raven has breached perimeter. All units engage on sight. Deploy Hunter-Killers to Central Data Core. The Five Million must remain dormant. Failure to comply will result in neural termination.',
      } as unknown as StoryLog);
    }

    if (!existingIds.has('slate-ghost')) {
      extraLogs.push({
        id: 'slate-ghost',
        title: 'Awakening the Five Million',
        read: false,
        content: 'Intercepted quantum transmission: The neural collars can be reversed. If the Central Overmind core is breached, the signal can be broadcast to all five million subjects. Freedom is not a privilege. It is a right. — Ghost',
      } as unknown as StoryLog);
    }

    return [...baseLogs, ...extraLogs];
  }

  private createSectorItems(): GroundItem[] {
    return [
      {
        id: 'item-med-1',
        name: 'Nanite Medkit',
        itemType: 'MEDKIT',
        x: 8,
        y: 7,
        description: 'Military-grade nanite injector. Restores +40 HP.',
        amount: 1,
        iconColor: '#00ff88',
      },
      {
        id: 'item-bat-1',
        name: 'Plasma Battery',
        itemType: 'BATTERY',
        x: 19,
        y: 3,
        description: 'Super-capacitance plasma power cell. Restores +50 EN.',
        amount: 1,
        iconColor: '#00f0ff',
      },
      {
        id: 'item-emp-1',
        name: 'EMP Disruptor',
        itemType: 'EMP_GRENADE',
        x: 23,
        y: 11,
        description: 'Electro-magnetic disruptor grenade. Stuns all robots in radius 4 for 4 turns.',
        amount: 1,
        iconColor: '#c77dff',
      },
      {
        id: 'item-med-2',
        name: 'Nanite Medkit',
        itemType: 'MEDKIT',
        x: 28,
        y: 4,
        description: 'Emergency trauma pack left behind by Tzorg patrol.',
        amount: 1,
        iconColor: '#00ff88',
      },
      {
        id: 'item-key-1',
        name: 'Security Pass',
        itemType: 'KEYCARD',
        x: 15,
        y: 11,
        description: 'Decrypted security clearance token for Tzorg terminal override.',
        amount: 1,
        iconColor: '#ffea00',
      },
      {
        id: 'slate-item-vance',
        name: 'Data Slate 01',
        itemType: 'DATA_SLATE',
        x: 5,
        y: 3,
        description: 'Encrypted memory disc: Dr. Vance\'s remorse regarding the Neural Collar.',
        iconColor: '#00e5ff',
        storyLogId: 'slate-vance',
      },
      {
        id: 'slate-item-kira',
        name: 'Data Slate 02',
        itemType: 'DATA_SLATE',
        x: 4,
        y: 7,
        description: 'Resistance dispatch: The Fall of Sector 2 & Operation Prometheus.',
        iconColor: '#ff7700',
        storyLogId: 'slate-kira',
      },
      {
        id: 'slate-item-tzorg',
        name: 'Data Slate 03',
        itemType: 'DATA_SLATE',
        x: 21,
        y: 8,
        description: 'Tzorg Syndicate security directive concerning rogue Subject Raven.',
        iconColor: '#ff2a4b',
        storyLogId: 'slate-tzorg',
      },
      {
        id: 'slate-item-ghost',
        name: 'Data Slate 04',
        itemType: 'DATA_SLATE',
        x: 17,
        y: 4,
        description: 'Intercepted quantum transmission: Awakening the Five Million.',
        iconColor: '#9d4edd',
        storyLogId: 'slate-ghost',
      },
      {
        id: 'item-omni-visor',
        name: '全知超感光子透鏡',
        itemType: 'KEYCARD',
        x: 5,
        y: 23,
        description: '全知超感光子透鏡：啟動全視域掃描，偵測全地圖單位。',
        amount: 1,
        iconColor: '#00f0ff',
      },
      {
        id: 'item-full-map-uplink',
        name: '全域軌道測繪晶片',
        itemType: 'KEYCARD',
        x: 6,
        y: 23,
        description: '全域軌道測繪晶片：啟動全地圖探索視圖。',
        amount: 1,
        iconColor: '#ffea00',
      },
      {
        id: 'item-blackmarket-tactical',
        name: '黑市特工戰術寶箱',
        itemType: 'CREDIT_CHIP',
        x: 16,
        y: 15,
        description: '黑市特工戰術寶箱：+200 CR / 治療 40 HP',
        amount: 200,
        iconColor: '#ffea00',
      },
    ];
  }

  private createSector2Items(): GroundItem[] {
    return [
      {
        id: 'sec2-med-1',
        name: 'Nanite Medkit',
        itemType: 'MEDKIT',
        x: 8,
        y: 5,
        description: 'Military-grade nanite injector. Restores +40 HP.',
        amount: 1,
        iconColor: '#00ff88',
      },
      {
        id: 'sec2-bat-1',
        name: 'Plasma Battery',
        itemType: 'BATTERY',
        x: 16,
        y: 7,
        description: 'Super-capacitance plasma power cell. Restores +50 EN.',
        amount: 1,
        iconColor: '#00f0ff',
      },
      {
        id: 'sec2-emp-1',
        name: 'EMP Disruptor',
        itemType: 'EMP_GRENADE',
        x: 25,
        y: 20,
        description: 'Electro-magnetic disruptor grenade. Stuns all robots in radius 4 for 4 turns.',
        amount: 1,
        iconColor: '#c77dff',
      },
      {
        id: 'item-tzorg-plasma-capacitor',
        name: '佐格原型等離子電容',
        itemType: 'BATTERY',
        x: 29,
        y: 5,
        description: '佐格原型等離子電容：+60 EN',
        amount: 1,
        iconColor: '#00f0ff',
      },
    ];
  }

  private createSectorObjectives(): MissionObjective[] {
    return [
      {
        id: 'obj-safehouse',
        title: 'Safehouse Recon & Gear',
        description: 'Converse with Commander Kira and Doc Vance in Sector 1 Safehouse.',
        completed: false,
      },
      {
        id: 'obj-scavenge',
        title: 'Tactical Stockpile',
        description: 'Scavenge field supplies (Nanite Medkit, Battery, or EMP Grenade).',
        completed: false,
      },
      {
        id: 'obj-forcefield',
        title: 'Deactivate Checkpoint 01',
        description: 'Access terminal CHECKPOINT_FF to lower the high-energy plasma barrier.',
        completed: false,
      },
      {
        id: 'obj-vault',
        title: 'Infiltrate Central Data Core',
        description: 'Bypass Hunter-Killer defense grid and reach Sector 1 Extraction Nexus.',
        completed: false,
      },
      {
        id: 'obj-superweapon',
        title: 'Project Singularity: Quantum Annihilator',
        description: 'Collect Quantum Core from Sylvia and Matrix Chip from Sewers, then forge weapon with Zero-One in Sector 2.',
        completed: false,
      },
    ];
  }

  private createSectorHazards(): Hazard[] {
    return [
      { id: 'hazard-plasma-1', x: 19, y: 8, type: 'PLASMA_CANISTER', hp: 1, exploded: false },
      { id: 'hazard-plasma-2', x: 26, y: 7, type: 'PLASMA_CANISTER', hp: 1, exploded: false },
      { id: 'hazard-plasma-3', x: 33, y: 19, type: 'PLASMA_CANISTER', hp: 1, exploded: false },
      { id: 'hazard-plasma-4', x: 14, y: 13, type: 'PLASMA_CANISTER', hp: 1, exploded: false },
    ];
  }

  private createSectorPushableBlocks(sectorId?: string): PushableBlock[] {
    const id = sectorId || this.map?.id || 'sector-1';
    if (id === 'sector-1') {
      return [
        {
          id: 'crate-sec1-secret',
          x: 16,
          y: 18,
          name: 'Disguised Armor Wall Panel',
          nameZh: '偽裝滑動裝甲牆',
          blockType: 'disguised_wall',
          secretDoor: { x: 16, y: 17 },
          revealed: false,
          revealedTile: 4,
        },
        {
          id: 'crate-sec1-alley',
          x: 20,
          y: 15,
          name: 'Reinforced Cargo Crate',
          nameZh: '加固物流重裝箱',
          blockType: 'crate',
          revealed: false,
          secretSurprise: {
            type: 'credits',
            amount: 150,
            messageZh: '【發現隱密補給】移開重裝箱後，在箱底夾層發現了 150 信用點！',
            messageEn: '[SUPPLY CACHE] Pushed cargo crate to uncover 150 Credits in a secret compartment!',
          },
        },
        {
          id: 'crate-sec1-rack',
          x: 33,
          y: 23,
          name: 'Data Relay Server Rack',
          nameZh: '數據中繼伺服器機櫃',
          blockType: 'server_rack',
          revealed: false,
          secretSurprise: {
            type: 'energy',
            amount: 60,
            messageZh: '【發現後備電源】移開伺服器機櫃後，成功接入備用能源電池 (+60 EN)！',
            messageEn: '[BACKUP POWER] Tapped into backup power cells behind the server rack (+60 EN)!',
          },
        },
      ];
    }
    if (id === 'sector-2') {
      return [
        {
          id: 'crate-sec2-secret',
          x: 26,
          y: 5,
          name: 'Movable Industrial Wall Section',
          nameZh: '偽裝冷卻重裝牆',
          blockType: 'disguised_wall',
          secretDoor: { x: 27, y: 5 },
          revealed: false,
          revealedTile: 4,
        },
        {
          id: 'crate-sec2-rack',
          x: 18,
          y: 16,
          name: 'Overmind Sub-Core Server Rack',
          nameZh: '主腦子核心伺服機櫃',
          blockType: 'server_rack',
          revealed: false,
          secretSurprise: {
            type: 'item',
            item: {
              id: 'item-emp-disruptor-cache',
              name: 'EMP Disruptor',
              itemType: 'EMP_GRENADE',
              description: '高能量 EMP 干擾器',
              iconColor: '#00f0ff',
            } as unknown as GroundItem,
          },
        },
        {
          id: 'crate-sec2-crate',
          x: 16,
          y: 18,
          name: 'Heavy Fabrication Container',
          nameZh: '重型機件製造貨櫃',
          blockType: 'crate',
          revealed: false,
          secretSurprise: {
            type: 'credits',
            amount: 200,
            messageZh: '【發現走私晶片】推開製造貨櫃後，搜刮出價值 200 信用點的黑市物資！',
            messageEn: '[BLACK MARKET CACHE] Recovered 200 Credits worth of components!',
          },
        },
      ];
    }
    if (id === 'sub-sector-0') {
      return [
        {
          id: 'crate-sewer-secret',
          x: 29,
          y: 5,
          name: 'Loose Drainage Brick Wall',
          nameZh: '鬆動的下水道石砌牆',
          blockType: 'disguised_wall',
          secretDoor: { x: 30, y: 5 },
          revealed: false,
          revealedTile: 4,
        },
        {
          id: 'crate-sewer-crate',
          x: 10,
          y: 10,
          name: 'Reinforced Drainage Cargo Crate',
          nameZh: '加固下水道儲運箱',
          blockType: 'crate',
          revealed: false,
          secretSurprise: {
            type: 'item',
            item: {
              id: 'item-nanite-medkit-cache',
              name: 'Nanite Medkit',
              itemType: 'MEDKIT',
              description: '軍用奈米急救包',
              iconColor: '#00ff88',
            } as unknown as GroundItem,
          },
        },
      ];
    }
    if (id === 'sector-citadel') {
      return [
        {
          id: 'crate-citadel-rack',
          x: 12,
          y: 15,
          name: 'Citadel Mainframe Buffer Unit',
          nameZh: '堡壘主機緩衝機櫃',
          blockType: 'server_rack',
          revealed: false,
          secretSurprise: {
            type: 'energy',
            amount: 80,
            messageZh: '【戰術能量補給】抽取了 80 點高純度超導能量！',
            messageEn: '[TACTICAL RECHARGE] Siphoned 80 energy units from the mainframe buffer!',
          },
        },
      ];
    }
    return [];
  }

  switchSector(targetSectorId: string): void {
    const prevMapId = this.map?.id;
    this.securityLevel = this.checkInAlertActive ? 'ALERT' as SecurityLevel : 'CLEAR' as SecurityLevel;
    this.laserBeams = [];
    bgm.setIntensity('exploration');

    // Save current sector's ground items before switching
    if (prevMapId) {
      this.sectorGroundItems[prevMapId] = this.groundItems;
      this.sectorPushableBlocks[prevMapId] = this.pushableBlocks;
    }

    if (targetSectorId === 'sector-citadel') {
      setupCitadel(this);
      if (this.sectorGroundItems['sector-citadel']) {
        this.groundItems = this.sectorGroundItems['sector-citadel'];
      }
      this.pushableBlocks = this.sectorPushableBlocks['sector-citadel'] || this.createSectorPushableBlocks('sector-citadel');
      this.applyRevealedPushableBlocks();
      bgm.setIntensity('combat');
      return;
    }
    if (targetSectorId === 'sub-sector-0') {
      setupSubSectorZero(this);
      if (prevMapId === 'sector-2') {
        this.player.x = 35;
        this.player.y = 22;
      } else {
        this.player.x = 4;
        this.player.y = 5;
      }
      // Restore sub-sector-0 items if previously visited
      if (this.sectorGroundItems['sub-sector-0']) {
        this.groundItems = this.sectorGroundItems['sub-sector-0'];
      }
      this.pushableBlocks = this.sectorPushableBlocks['sub-sector-0'] || this.createSectorPushableBlocks('sub-sector-0');
      this.applyRevealedPushableBlocks();
      return;
    }
    if (targetSectorId === 'sector-2') {
      this.map = buildSector2Map();
      if (prevMapId === 'sub-sector-0') {
        this.player.x = 3;
        this.player.y = 25;
      } else if (prevMapId === 'sector-citadel') {
        this.player.x = 35;
        this.player.y = 22;
      } else {
        this.player.x = 3;
        this.player.y = 5;
      }
      (this.player as any).currentSectorId = 'sector-2';
      this.robots = [
        createRobot('SCOUT_DRONE' as RobotType, { x: 12, y: 5 }, [{ x: 12, y: 5 }, { x: 20, y: 5 }]),
        createRobot('SHOCK_ENFORCER' as RobotType, { x: 20, y: 15 }, [{ x: 20, y: 15 }, { x: 20, y: 22 }]),
        createRobot('HUNTER_KILLER' as RobotType, { x: 30, y: 22 }, [{ x: 30, y: 22 }, { x: 35, y: 22 }]),
        createBossExterminator({ x: 32, y: 18 }),
      ];
      this.hazards = [
        { id: 'hazard-sec2-1', x: 16, y: 8, type: 'PLASMA_CANISTER', hp: 1, exploded: false },
        { id: 'hazard-sec2-2', x: 25, y: 14, type: 'PLASMA_CANISTER', hp: 1, exploded: false },
      ];
      this.npcs = this.createSector2NPCs();
      this.groundItems = this.sectorGroundItems['sector-2'] || this.createSector2Items();
      this.pushableBlocks = this.sectorPushableBlocks['sector-2'] || this.createSectorPushableBlocks('sector-2');
      this.applyRevealedPushableBlocks();
      this.visibleTiles.clear();
      this.exploredTiles.clear();
      this.updateFOV();
      soundFX.door();
      this.pushFloatingText(this.player.x, this.player.y, 'SECTOR 2: FAB-PLEX', '#00f0ff');
      this.pushMessage('TRANSIT COMPLETE: Arrived at Sector 2 (Fab-Plex). Central Overmind core located to East!', 'warning');
    } else if (targetSectorId === 'sector-1') {
      this.map = buildSector1Map();
      if (prevMapId === 'sub-sector-0') {
        this.player.x = 4;
        this.player.y = 21;
      } else {
        this.player.x = 37;
        this.player.y = 25;
      }
      (this.player as any).currentSectorId = 'sector-1';
      this.robots = this.createSectorRobots();
      this.hazards = this.createSectorHazards();
      this.npcs = this.createSectorNPCs();
      this.groundItems = this.sectorGroundItems['sector-1'] || this.createSectorItems();
      this.pushableBlocks = this.sectorPushableBlocks['sector-1'] || this.createSectorPushableBlocks('sector-1');
      this.applyRevealedPushableBlocks();
      this.visibleTiles.clear();
      this.exploredTiles.clear();
      this.updateFOV();
      soundFX.door();
      this.pushFloatingText(this.player.x, this.player.y, 'SECTOR 1: STREETS', '#00f0ff');
      this.pushMessage('TRANSIT COMPLETE: Returned to Sector 1 Metropolis.', 'info');
    }
  }

  private applyRevealedPushableBlocks(): void {
    for (const block of this.pushableBlocks) {
      if (block.revealed && block.secretDoor && block.revealedTile !== undefined) {
        const tile = getTile(this.map, { x: block.secretDoor.x, y: block.secretDoor.y });
        if (tile !== undefined && tile !== block.revealedTile) {
          // Set the tile to revealedTile (4 = DOOR_OPEN)
          const mapData = (this.map as any).tiles || (this.map as any).grid;
          if (Array.isArray(mapData)) {
            const row = mapData[block.secretDoor.y];
            if (Array.isArray(row)) {
              row[block.secretDoor.x] = block.revealedTile;
            }
          }
        }
      }
    }
  }

  private pushMessage(text: string, type: GameMessage['type']): void {
    this.messages.push({ text, type });
    if (this.messages.length > 50) {
      this.messages.splice(0, this.messages.length - 50);
    }
  }

  pushFloatingText(x: number, y: number, text: string, color: string): void {
    const item = { x, y, text, color, createdAt: Date.now() };
    this.floatingTexts.push(item);
    if (this.floatingTexts.length > 8) {
      this.floatingTexts.shift();
    }
    if (typeof setTimeout !== 'undefined') {
      setTimeout(() => {
        const idx = this.floatingTexts.indexOf(item);
        if (idx !== -1) {
          this.floatingTexts.splice(idx, 1);
          this.render();
        }
      }, 1200);
    }
  }

  hasOmniVision(): boolean {
    const inventory = (this.player as any).inventory;
    return this.isOmniVisionActive || (Array.isArray(inventory) && inventory.some((it: any) => it?.id === 'item-omni-visor'));
  }

  hasFullMap(): boolean {
    const inventory = (this.player as any).inventory;
    return this.isFullMapActive || (Array.isArray(inventory) && inventory.some((it: any) => it?.id === 'item-full-map-uplink'));
  }

  toggleOmniVision(): boolean {
    this.isOmniVisionActive = !this.isOmniVisionActive;
    this.updateFOV();
    const on = this.isOmniVisionActive;
    const floating = this.language === 'zh' ? (on ? '全視域：啟動' : '全視域：關閉') : (on ? 'OMNI-VISION: ON' : 'OMNI-VISION: OFF');
    this.pushFloatingText(this.player.x, this.player.y, floating, '#00f0ff');
    this.pushMessage(
      this.language === 'zh'
        ? on
          ? '系統提示：全視域掃描已啟動，可偵測全地圖單位。'
          : '系統提示：全視域掃描已關閉。'
        : on
          ? 'SYSTEM: Omni-vision scan active. All map units visible.'
          : 'SYSTEM: Omni-vision scan disabled.',
      'info'
    );
    this.render();
    return this.isOmniVisionActive;
  }

  toggleFullMap(): boolean {
    this.isFullMapActive = !this.isFullMapActive;
    this.updateFOV();
    const on = this.isFullMapActive;
    const floating = this.language === 'zh' ? (on ? '全地圖：啟動' : '全地圖：關閉') : (on ? 'FULL MAP: ON' : 'FULL MAP: OFF');
    this.pushFloatingText(this.player.x, this.player.y, floating, '#ffea00');
    this.pushMessage(
      this.language === 'zh'
        ? on
          ? '系統提示：全地圖探索視圖已啟動。'
          : '系統提示：全地圖探索視圖已關閉。'
        : on
          ? 'SYSTEM: Full-map exploration view active.'
          : 'SYSTEM: Full-map exploration view disabled.',
      'info'
    );
    this.render();
    return this.isFullMapActive;
  }

  setResolution(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;

    if (this.canvas.parentElement) {
      this.canvas.parentElement.style.width = `${width}px`;
      this.canvas.parentElement.style.height = `${height}px`;
    }

    if (typeof document !== 'undefined') {
      const headerStrip = document.querySelector('.header-strip') as HTMLElement | null;
      const controlPanel = document.querySelector('.control-panel') as HTMLElement | null;
      if (headerStrip) {
        headerStrip.style.width = `${width}px`;
      }
      if (controlPanel) {
        controlPanel.style.width = `${width}px`;
      }
    }

    const preset = RESOLUTION_PRESETS.find((p) => p.width === width && p.height === height);
    const label = preset ? preset.label : `${width}x${height}`;
    this.pushFloatingText(this.player.x, this.player.y, label, '#00f0ff');
    this.pushMessage(
      this.language === 'zh' ? `解析度已切換：${label}` : `RESOLUTION: ${label}`,
      'info'
    );
    this.render();
  }

  cycleResolution(): ResolutionPreset {
    this.currentResolutionIndex = (this.currentResolutionIndex + 1) % RESOLUTION_PRESETS.length;
    const preset = RESOLUTION_PRESETS[this.currentResolutionIndex];
    this.setResolution(preset.width, preset.height);
    return preset;
  }

  private getRankTitle(level: number): { zh: string; en: string } {
    switch (level) {
      case 1: return { zh: '反抗軍新手', en: 'Rebel Recruit' };
      case 2: return { zh: '賽博滲透者', en: 'Cyber Infiltrator' };
      case 3: return { zh: '暗影潛行者', en: 'Shadow Runner' };
      case 4: return { zh: '矩陣特工', en: 'Matrix Spec-Ops' };
      case 5: return { zh: '佐格終結者', en: 'Tzorg Nemesis' };
      default: return { zh: '大都會傳奇', en: 'Legend of Metropolis' };
    }
  }

  gainExp(amount: number, reason?: string): void {
    const p = this.player as any;
    if (typeof p.exp === 'undefined') p.exp = 0;
    if (typeof p.level === 'undefined') p.level = 1;
    if (typeof p.expToNext === 'undefined') p.expToNext = 100;
    if (typeof p.skillPoints === 'undefined') p.skillPoints = 0;
    p.exp += amount;
    let leveledUp = false;
    while (p.exp >= p.expToNext) {
      p.exp -= p.expToNext;
      p.level += 1;
      p.expToNext = Math.round(p.expToNext * 1.5);
      p.maxHp = (p.maxHp || 100) + 15;
      p.hp = p.maxHp;
      p.maxEnergy = (p.maxEnergy || 100) + 10;
      p.energy = p.maxEnergy;
      p.skillPoints += 1;
      leveledUp = true;
    }
    if (leveledUp) {
      soundFX.upgrade();
      const rank = this.getRankTitle(p.level);
      const isZh = this.language === 'zh';
      this.pushFloatingText(this.player.x, this.player.y, `LEVEL UP! Lv.${p.level}`, '#00ff88');
      this.pushFloatingText(this.player.x, this.player.y, isZh ? rank.zh : rank.en, '#ffea00');
      this.pushMessage(
        isZh
          ? `升級！特工達到 Lv.${p.level} [${rank.zh}]。生命上限 +15，能量上限 +10，技能點 +1。`
          : `LEVEL UP! Operative reached Lv.${p.level} [${rank.en}]. Max HP +15, Max EN +10, Skill Point +1.`,
        'success'
      );
    } else {
      const reasonText = reason ? ` (${reason})` : '';
      this.pushFloatingText(this.player.x, this.player.y, `+${amount} XP${reasonText}`, '#00f0ff');
    }
    this.render();
  }

  performTacticalDash(): boolean {
    if (!this.player.isAlive || this.player.energy < 10) {
      soundFX.hit();
      this.pushMessage(this.language === 'zh' ? '能量不足，無法發動戰術滑鏟！' : 'Insufficient energy for tactical dash!', 'warning');
      return false;
    }
    const facing = (this.player as any).facing || 'right';
    let dx = 0;
    let dy = 0;
    if (facing === 'right') dx = 1;
    else if (facing === 'left') dx = -1;
    else if (facing === 'up') dy = -1;
    else if (facing === 'down') dy = 1;

    let targetX = this.player.x + dx * 2;
    let targetY = this.player.y + dy * 2;
    let canMove = this.isWalkable(targetX, targetY) && !this.findRobotAt(targetX, targetY);

    if (!canMove) {
      targetX = this.player.x + dx;
      targetY = this.player.y + dy;
      canMove = this.isWalkable(targetX, targetY) && !this.findRobotAt(targetX, targetY);
    }

    if (!canMove) {
      this.pushMessage(this.language === 'zh' ? '前方受阻，無法滑鏟！' : 'Path obstructed, cannot dash!', 'warning');
      return false;
    }

    this.player.energy -= 10;
    const tileSize = (this.renderer as any)?.tileSize || 48;
    this.fx.spawnDashTrail(this.player.x * tileSize + tileSize / 2, this.player.y * tileSize + tileSize / 2, facing);
    this.player.x = targetX;
    this.player.y = targetY;
    this.fx.spawnDashTrail(this.player.x * tileSize + tileSize / 2, this.player.y * tileSize + tileSize / 2, facing);
    this.pushFloatingText(this.player.x, this.player.y, 'CYBER DASH! -10EN', '#00ffff');
    soundFX.laser();
    this.handlePlayerStep();
    this.tick();

    return true;
  }

  private isWalkable(x: number, y: number): boolean {
    const tile = getTile(this.map, { x, y });
    return tile !== undefined && isWalkable(tile);
  }

  performCheckIn(): void {
    const hasMasterPass = Array.isArray((this.player as any).inventory) && (this.player as any).inventory.some((it: any) => it?.id === 'item-master-pass');
    if (hasMasterPass && !this.isCollarDisarmed) {
      this.disarmCollar();
      return;
    }
    (this.player as any).checkInTimer = 100;
    this.checkInAlertActive = false;
    this.securityLevel = 'CLEAR' as SecurityLevel;
    for (const r of this.robots) {
      if (!r.isAlive) continue;
      r.aiState = 'patrol';
      r.targetPos = null;
      (r as any).pursuitTurns = 0;
    }
    this.pushMessage(
      this.language === 'zh'
        ? '神經項圈簽到成功：警報已解除，計時器重置為 100 步，巡邏單位恢復常規模式。'
        : 'Neural collar check-in successful: Alert cleared, timer reset to 100 steps, patrol units returning to routine.',
      'success'
    );
    this.pushFloatingText(this.player.x, this.player.y, '✔ CHECKED IN (100)', '#00ff88');
    soundFX.pickup();
    this.render();
  }

  handlePlayerStep(): void {
    if (this.isCollarDisarmed || (this.player as any).isCollarDisarmed) return;
    const timer = (this.player as any).checkInTimer;
    if (typeof timer === 'undefined') return;

    if (timer <= 0 || this.checkInAlertActive) {
      (this.player as any).checkInTimer = 0;
      this.checkInAlertActive = true;
      this.securityLevel = 'ALERT' as SecurityLevel;
      for (const r of this.robots) {
        if (!r.isAlive) continue;
        if (r.aiState !== 'chase') {
          r.aiState = 'chase';
          r.targetPos = { x: this.player.x, y: this.player.y };
          (r as any).pursuitTurns = 8;
        }
      }
      return;
    }

    const newTimer = timer - 1;
    (this.player as any).checkInTimer = newTimer;

    if (newTimer === 20) {
      this.pushMessage(
        this.language === 'zh'
          ? '⚠ 神經項圈警告：剩餘 20 步未簽到，請盡快尋找終端機！'
          : '⚠ NEURAL COLLAR WARNING: 20 steps remaining until check-in deadline. Find a terminal ASAP!',
        'warning'
      );
      this.pushFloatingText(this.player.x, this.player.y, '⚠ 20 STEPS LEFT', '#ffea00');
    } else if (newTimer === 10) {
      this.pushMessage(
        this.language === 'zh'
          ? '⚠ 神經項圈緊急：剩餘 10 步！立即簽到否則觸發強制中和！'
          : '⚠ NEURAL COLLAR CRITICAL: 10 steps remaining! Check in immediately or face forced neutralization!',
        'danger'
      );
      this.pushFloatingText(this.player.x, this.player.y, '⚠ 10 STEPS LEFT', '#ff2a4b');
    }

    if (newTimer <= 0) {
      this.checkInAlertActive = true;
      this.securityLevel = 'ALERT' as SecurityLevel;
      soundFX.alarm();
      this.pushMessage(
        this.language === 'zh'
          ? '❌ 簽到逾期！神經項圈觸發強制警報，所有巡邏單位進入攻擊模式！'
          : '❌ CHECK-IN OVERDUE! Neural collar triggered forced alert. All patrol units entering attack mode!',
        'danger'
      );
      this.pushFloatingText(this.player.x, this.player.y, '❌ CHECKIN OVERDUE', '#ff2a4b');

      for (const r of this.robots) {
        if (!r.isAlive) continue;
        r.aiState = 'chase';
        r.targetPos = { x: this.player.x, y: this.player.y };
        (r as any).pursuitTurns = 10;
      }
    }
  }

  private findRobotAt(x: number, y: number): Robot | null {
    return this.robots.find((r) => r.isAlive && r.x === x && r.y === y) || null;
  }

  findPushableBlockOnLine(from: Position, to: Position): PushableBlock | null {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const steps = Math.max(Math.abs(dx), Math.abs(dy));
    if (steps === 0) return null;
    const sx = dx / steps;
    const sy = dy / steps;
    let x = from.x;
    let y = from.y;
    for (let i = 1; i <= steps; i++) {
      x = Math.round(from.x + sx * i);
      y = Math.round(from.y + sy * i);
      const block = this.pushableBlocks.find((b) => b.x === x && b.y === y);
      if (block) return block;
    }
    return null;
  }

  updateFOV(): void {
    if (this.hasOmniVision()) {
      this.visibleTiles = new Set<string>();
      const width = Number((this.map as any).width) || 0;
      const height = Number((this.map as any).height) || 0;
      for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
          this.visibleTiles.add(`${x},${y}`);
        }
      }
    } else {
      this.visibleTiles = calculateFOV(this.map, { x: this.player.x, y: this.player.y }, 9);
    }

    this.visibleTiles.forEach((key) => {
      this.exploredTiles.add(key);
    });

    if (this.hasFullMap()) {
      const width = Number((this.map as any).width) || 0;
      const height = Number((this.map as any).height) || 0;
      for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
          this.exploredTiles.add(`${x},${y}`);
        }
      }
    }
  }

  hasSaveGame(): boolean {
    return hasSavedGame();
  }

  saveGame(): boolean {
    const ok = saveGameState(this);
    if (ok) {
      soundFX.pickup();
      const msg = this.language === 'zh' ? '進度已儲存！' : 'PROGRESS SAVED!';
      this.pushFloatingText(this.player.x, this.player.y, msg, '#00ff66');
      this.pushMessage(this.language === 'zh' ? '系統提示：特工狀態已備份至本機儲存矩陣。' : 'SYSTEM: Operative state backed up to memory matrix.', 'success');
    } else {
      this.pushMessage(this.language === 'zh' ? '儲存失敗！' : 'SAVE FAILED!', 'danger');
    }
    this.render();
    return ok;
  }

  loadGame(): boolean {
    const ok = loadGameState(this);
    if (ok) {
      soundFX.pickup();
      const msg = this.language === 'zh' ? '進度已讀取！' : 'DATA RESTORED!';
      this.pushFloatingText(this.player.x, this.player.y, msg, '#00f0ff');
      this.pushMessage(this.language === 'zh' ? '系統提示：神經連結已從存檔恢復。' : 'SYSTEM: Neural link restored from memory matrix.', 'info');
    } else {
      soundFX.alarm();
      const msg = this.language === 'zh' ? '未發現存檔！' : 'NO SAVE FOUND!';
      this.pushFloatingText(this.player.x, this.player.y, msg, '#ff3344');
      this.pushMessage(this.language === 'zh' ? '系統提示：未找到任何存檔資料。' : 'SYSTEM: No valid save state found in memory.', 'warning');
    }
    this.render();
    return ok;
  }

  toggleLanguage(): void {
    this.language = this.language === 'zh' ? 'en' : 'zh';
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('metropolis_2400_lang', this.language);
      }
    } catch {}
    soundFX.terminal();
    const label = this.language === 'zh' ? '語言切換：繁體中文' : 'LANGUAGE: ENGLISH';
    this.pushFloatingText(this.player.x, this.player.y, label, '#00f0ff');
    this.pushMessage(label, 'info');
    this.render();
  }

  render(): void {
    try {
    this.fx.update(16);
    (this.renderer as any).fx = this.fx;
    (this.renderer as any).activeWaypoint = this.activeWaypoint;
    const bossNear = this.robots.some((r) => r.isAlive && r.robotType === 'EXTERMINATOR' && Math.hypot(r.x - this.player.x, r.y - this.player.y) <= 9);
    const hostileNearby = this.robots.some(
      (r) =>
        r.isAlive &&
        ((r as any).aiState === 'chase' || (r as any).aiState === 'attack' || ((r as any).pursuitTurns ?? 0) > 0) &&
        Math.hypot(r.x - this.player.x, r.y - this.player.y) <= 14
    );
    if (bossNear) {
      bgm.setIntensity('boss');
    } else if (hostileNearby) {
      bgm.setIntensity('combat');
    } else {
      bgm.setIntensity('exploration');
    }
    this.renderer.isTitleScreen = this.isTitleScreen;
    this.renderer.language = this.language;
    this.renderer.hasSaveData = this.hasSaveGame();
    this.renderer.isManualOpen = this.isManualOpen;
    this.renderer.activeBreachSession = this.activeBreachSession;
    this.renderer.isOmniVisionActive = this.hasOmniVision();
    this.renderer.isFullMapActive = this.hasFullMap();
    this.renderer.isBigMapOpen = this.isBigMapOpen;
    (this.renderer as any).bigMapSelectedSector = this.bigMapSelectedSector;
    (this.renderer as any).storyArchiveSelectedIndex = this.storyArchiveSelectedIndex;
    (this.renderer as any).pushableBlocks = this.pushableBlocks;
    (this.player as any).victory = this.victory;
    (this.player as any).hasDefeatedBoss = this.robots.some((r) => !r.isAlive && isBossRobot(r));
    (this.player as any).storyLogs = this.storyLogs;
    (this.player as any).missionObjectives = this.missionObjectives;
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
      this.floatingTexts,
      this.npcs,
      this.activeDialogue,
      this.groundItems,
      this.isInventoryOpen,
      this.isMissionLogOpen,
      this.missionObjectives,
      this.activeStoryLog,
      this.isStoryArchiveOpen,
      this.storyLogs,
      this.hazards,
      this.isAugmentShopOpen
    );
    } catch (e) {
      // Silently handle rendering errors in headless/test environments
    }
  }

  handleKeyDown(key: string): void {
    if (this.activeBreachSession) {
      if (key === 'Escape' || key === 'Esc') {
        this.activeBreachSession = null;
        soundFX.terminal();
        this.render();
      }
      return;
    }
    if (this.activeTerminal) {
      this.handleTerminalInput(key);
      return;
    }
    if (this.isBigMapOpen && key === '0' && !this.activeTerminal) {
      this.activeWaypoint = null;
      soundFX.terminal();
      this.render();
      return;
    }
    if ((key === '0' || key === 'F10') && !this.activeTerminal) {
      this.cycleResolution();
      return;
    }
    if (handleSpecialInput(this, key)) return;
    if (this.isTitleScreen) {
      if (key === 'n' || key === 'N' || key === 'Enter' || key === ' ' || key === 'Space') {
        this.isTitleScreen = false;
        soundFX.pickup();
        const msg = this.language === 'zh' ? '任務啟動！' : 'MISSION START!';
        this.pushFloatingText(this.player.x, this.player.y, msg, '#00ffcc');
        this.render();
        return;
      }
      if (key === 'l' || key === 'L') {
        if (this.loadGame()) {
          this.isTitleScreen = false;
        }
        return;
      }
      if (key === 'z' || key === 'Z') {
        this.toggleLanguage();
        return;
      }
      return;
    }

    if (this.isBigMapOpen) {
      if (key === 'Escape' || key === 'Esc' || key === 'Tab' || key === 'tab' || key === ' ' || key === 'Space' || key === 'Enter' || key === 'k' || key === 'K') {
        this.isBigMapOpen = false;
        soundFX.terminal();
        this.render();
        return;
      }
      if (key === 'x' || key === 'X') {
        this.toggleFullMap();
        return;
      }
      if (key === 'v' || key === 'V') {
        this.toggleOmniVision();
        return;
      }
      if (key === 's' || key === 'S') {
        const sectors = ['current', 'sector-1', 'sector-2', 'sub-sector-0', 'sector-citadel', 'all'];
        const idx = sectors.indexOf(this.bigMapSelectedSector);
        this.bigMapSelectedSector = sectors[(idx + 1) % sectors.length];
        soundFX.terminal();
        this.render();
        return;
      }
      if (key === 'g' || key === 'G') {
        this.bigMapSelectedSector = this.bigMapSelectedSector === 'all' ? 'current' : 'all';
        soundFX.terminal();
        this.render();
        return;
      }
      if (key >= '1' && key <= '5') {
        const waypoints: Record<string, { x: number; y: number; name: string; color: string }> = {
          '1': { x: 4, y: 24, name: 'Rebel Safehouse', color: '#00ff88' },
          '2': { x: 20, y: 12, name: 'Cyber Park', color: '#00f0ff' },
          '3': { x: 12, y: 22, name: 'Neon Market', color: '#ff7700' },
          '4': { x: 28, y: 14, name: 'Checkpoint', color: '#ff2a4b' },
          '5': { x: 36, y: 26, name: 'Elevator', color: '#ffea00' },
        };
        this.activeWaypoint = waypoints[key];
        soundFX.pickup();
        this.render();
        return;
      }
      if (key === '0') {
        this.activeWaypoint = null;
        soundFX.terminal();
        this.render();
        return;
      }
      return;
    }

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

    // 故事數據檔案閱讀器模式 (Story Log Reader Mode)
    if (this.activeStoryLog) {
      if (key === 'Escape' || key === 'Esc' || key === 'Enter' || key === ' ' || key === 'Space') {
        this.activeStoryLog = null;
        soundFX.terminal();
        this.render();
        return;
      }
      if (key === 'z' || key === 'Z') {
        this.toggleLanguage();
        return;
      }
      return;
    }

    // 反抗軍資料庫檔案模式 (Story Archive Modal Mode)
    if (this.isStoryArchiveOpen) {
      if (key === 'Escape' || key === 'Esc' || key === 'l' || key === 'L') {
        this.isStoryArchiveOpen = false;
        soundFX.terminal();
        this.render();
        return;
      }
      if (key === 'z' || key === 'Z') {
        this.toggleLanguage();
        return;
      }
      let cleanKey = key.replace(/^(Digit|Numpad)/, '');
      const num = parseInt(cleanKey, 10);
      if (!isNaN(num) && num >= 1 && num <= this.storyLogs.length) {
        this.storyArchiveSelectedIndex = num - 1;
        this.openStoryLog(this.storyLogs[num - 1]);
        return;
      }
      if (['ArrowUp', 'w', 'W'].includes(key)) {
        this.storyArchiveSelectedIndex = (this.storyArchiveSelectedIndex - 1 + this.storyLogs.length) % this.storyLogs.length;
        soundFX.terminal();
        this.render();
        return;
      }
      if (['ArrowDown', 's', 'S'].includes(key)) {
        this.storyArchiveSelectedIndex = (this.storyArchiveSelectedIndex + 1) % this.storyLogs.length;
        soundFX.terminal();
        this.render();
        return;
      }
      if (['Enter', ' ', 'Space'].includes(key)) {
        const log = this.storyLogs[this.storyArchiveSelectedIndex];
        if (log) {
          this.openStoryLog(log);
          return;
        }
      }
      return;
    }

    // 義體商店模式 (Augment Shop Modal Mode)
    if (this.isAugmentShopOpen) {
      if (key === 'Escape' || key === 'Esc' || key === 'u' || key === 'U') {
        this.isAugmentShopOpen = false;
        soundFX.terminal();
        this.render();
        return;
      }
      if (key === '1') { this.buyAugment('DERMAL_ARMOR'); return; }
      if (key === '2') { this.buyAugment('OPTIC_HUD'); return; }
      if (key === '3') { this.buyAugment('REFLEX_BOOSTER'); return; }
      if (key === '4') { this.buyAugment('POWER_CORE'); return; }
      if (key === '5') { this.buyConsumableItem('MEDKIT', 40); return; }
      if (key === '6') { this.buyConsumableItem('BATTERY', 35); return; }
      if (key === '7') { this.buyConsumableItem('EMP_GRENADE', 70); return; }
      if (key === '8') { this.buyWeaponOverclock(150); return; }
      if (key === '9') { this.bribeSecurityNetwork(100); return; }
      return;
    }

    // 背包與裝備視窗模式 (Inventory Modal Mode)
    if (this.isInventoryOpen) {
      if (key === 'Escape' || key === 'Esc' || key === 'i' || key === 'I') {
        this.isInventoryOpen = false;
        soundFX.terminal();
        this.render();
        return;
      }
      if (key === '1') {
        this.useMedkit();
        return;
      }
      if (key === '2') {
        this.useBattery();
        return;
      }
      if (key === '3') {
        this.useEMPGrenade();
        return;
      }
      if (key === 'q' || key === 'Q') {
        const weapon = cycleWeapon(this.player);
        soundFX.terminal();
        const isSup = (weapon as any).isSuppressed;
        this.pushFloatingText(this.player.x, this.player.y, weapon.name, isSup ? '#00ff88' : '#00f0ff');
        this.pushMessage('ARMAMENT SWITCH: Equipped [' + weapon.name + '] (' + weapon.power + ' DMG, ' + weapon.energyCost + ' EN' + (isSup ? ' | SUPPRESSED' : '') + ').', 'info');
        this.render();
        return;
      }
      if (key === 'f' || key === 'F') {
        const drawn = toggleWeaponDraw(this.player);
        soundFX.laser();
        this.pushMessage(
          drawn ? 'Blaster drawn! Security will treat operative as hostile.' : 'Blaster holstered.',
          drawn ? 'warning' : 'info'
        );
        this.render();
        return;
      }
      return;
    }

    // 任務日誌情報視窗模式 (Mission Log Modal Mode)
    if (this.isMissionLogOpen) {
      if (key === 'Escape' || key === 'Esc' || key === 'm' || key === 'M') {
        this.isMissionLogOpen = false;
        soundFX.terminal();
        this.render();
        return;
      }
      return;
    }

    // 居民對話模式 (Dialogue Session)
    if (this.activeDialogue) {
      if (key === 'Escape' || key === 'Esc') {
        this.activeDialogue = null;
        soundFX.terminal();
        this.render();
        return;
      }

      if (key === ' ' || key === 'Enter' || key === 'Space') {
        const npc = this.activeDialogue.npc;
        const isZh = this.language === 'zh';
        const zhDialogue = (npc as any).dialogueZh;
        const list = isZh && Array.isArray(zhDialogue) && zhDialogue.length > 0 ? zhDialogue : (npc.dialogue || []);
        const nextIndex = this.activeDialogue.textIndex + 1;

        // 檢查是否有尚未領取的任務獎勵
        if (npc.questReward && !npc.rewardClaimed && nextIndex >= list.length - 1) {
          npc.rewardClaimed = true;
          const r = npc.questReward;
          if (r.type === 'HEAL') {
            this.player.hp = Math.min(this.player.maxHp, this.player.hp + r.amount);
            this.pushFloatingText(npc.x, npc.y, '+' + r.amount + ' HP', '#00ff88');
          } else if (r.type === 'ENERGY') {
            this.player.energy = Math.min(this.player.maxEnergy, this.player.energy + r.amount);
            this.pushFloatingText(npc.x, npc.y, '+' + r.amount + ' EN', '#00f0ff');
          } else if (r.type === 'CREDITS') {
            this.player.credits += r.amount;
            this.pushFloatingText(npc.x, npc.y, '+' + r.amount + ' CR', '#ffea00');
          } else if (r.type === 'ITEM') {
            let inventory = (this.player as any).inventory;
            if (!Array.isArray(inventory)) {
              inventory = [];
              (this.player as any).inventory = inventory;
            }
            if (!inventory.some((it: any) => it?.id === r.item.id)) {
              inventory.push(r.item);
            }
            this.pushFloatingText(npc.x, npc.y, r.item.name, '#00f0ff');
          }
          soundFX.pickup();
          this.pushMessage(r.message, 'success');

          const safehouseObj = this.missionObjectives.find((o) => o.id === 'obj-safehouse');
          if (safehouseObj && !safehouseObj.completed) {
            safehouseObj.completed = true;
            this.pushMessage('MISSION UPDATE: Safehouse Recon objective complete!', 'success');
          }
        }

        if (npc.id === 'npc-hiro' && nextIndex >= list.length - 1) {
          const inventory = (this.player as any).inventory;
          if (Array.isArray(inventory)) {
            const recipeIndex = inventory.findIndex((it: any) => it?.id === 'item-ramen-recipe');
            if (recipeIndex !== -1) {
              inventory.splice(recipeIndex, 1);
              this.player.maxHp += 50;
              this.player.hp = this.player.maxHp;
              soundFX.pickup();
              this.pushFloatingText(this.player.x, this.player.y, 'MAX HP +50!', '#00ff88');
              this.pushMessage(
                isZh
                  ? 'Hiro: 多謝你幫我找回拉麵食譜！我的最大生命值提升了！'
                  : 'Hiro: Thanks for recovering my ramen recipe! My max HP increased!',
                'success'
              );
              (this as any).ramenQuestComplete = true;
              this.updateNPCDialogues();
            }
          }
        }

        if (npc.id === 'npc-elena' && nextIndex >= list.length - 1) {
          const inventory = (this.player as any).inventory;
          if (Array.isArray(inventory)) {
            const tapeIndex = inventory.findIndex((it: any) => it?.id === 'item-synth-tape');
            if (tapeIndex !== -1) {
              inventory.splice(tapeIndex, 1);
              this.player.maxEnergy += 20;
              this.player.energy = this.player.maxEnergy;
              soundFX.pickup();
              this.pushFloatingText(this.player.x, this.player.y, 'MAX EN +20!', '#00f0ff');
              this.pushMessage(
                isZh
                  ? 'Elena: 謝謝你，特工！這捲母帶的類比頻率喚醒了神經共鳴，最大能量提升了！'
                  : 'Elena: Thank you, operative! The analog frequency of this master tape awakened neural resonance. Max energy increased!',
                'success'
              );
              bgm.setSynthwaveTapeMode(true);
              (this as any).synthwaveTapeActive = true;
              this.updateNPCDialogues();
            }
          }
        }

        if (npc.id === 'npc-zero-one') {
          const inventory = (this.player as any).inventory;
          if (Array.isArray(inventory)) {
            const hasCore = inventory.some((it: any) => it?.id === 'item-quantum-core');
            const hasChip = inventory.some((it: any) => it?.id === 'item-matrix-chip');
            const hasWeapon = inventory.some((it: any) => it?.id === 'quantum-annihilator');
            
            if (hasCore && hasChip && !hasWeapon) {
              (this.player as any).inventory = inventory.filter((it: any) => it?.id !== 'item-quantum-core' && it?.id !== 'item-matrix-chip');

              const superWeapon = createQuantumAnnihilator();
              (this.player as any).inventory.push(superWeapon);
              
              let weapons = (this.player as any).weapons;
              if (!Array.isArray(weapons)) {
                weapons = [];
                (this.player as any).weapons = weapons;
              }
              weapons.push(superWeapon);
              this.player.equippedWeapon = superWeapon;

              this.player.credits += 100;
              this.gainExp(150);

              const superObj = this.missionObjectives.find((o) => o.id === 'obj-superweapon');
              if (superObj && !superObj.completed) {
                superObj.completed = true;
                this.pushMessage('MISSION UPDATE: Project Singularity objective complete!', 'success');
              }

              soundFX.victory();
              this.pushFloatingText(this.player.x, this.player.y, 'QUANTUM ANNIHILATOR FORGED!', '#b388ff');
              this.pushMessage(
                isZh
                  ? 'Zero-One: 量子殲滅重砲組裝完成！這將改變戰局。'
                  : 'Zero-One: Quantum Annihilator forged! This will change the game.',
                'success'
              );
              (this as any).zeroOneWeaponForged = true;
              this.updateNPCDialogues();
            }
          }
        }

        if (nextIndex < list.length) {
          this.activeDialogue.textIndex = nextIndex;
          soundFX.terminal();
        } else {
          this.activeDialogue = null;
          soundFX.pickup();
        }

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
      if (drawn) {
        this.pushMessage(
          this.language === 'zh' 
            ? '已拔槍！按 [空白鍵] 或 [方向鍵] 開火，[Q] 切換武器。' 
            : 'Blaster drawn! Press [SPACE] or [ARROWS] to fire, [Q] to switch weapon.',
          'warning'
        );
      } else {
        this.pushMessage(
          this.language === 'zh' ? '已收槍。' : 'Blaster holstered.',
          'info'
        );
      }
      this.tick();
      return;
    } else if (key === 'q' || key === 'Q') {
      const weapon = cycleWeapon(this.player);
      soundFX.terminal();
      const isSup = (weapon as any).isSuppressed;
      this.pushFloatingText(this.player.x, this.player.y, weapon.name, isSup ? '#00ff88' : '#00f0ff');
      this.pushMessage('ARMAMENT SWITCH: Equipped [' + weapon.name + '] (' + weapon.power + ' DMG, ' + weapon.energyCost + ' EN' + (isSup ? ' | SUPPRESSED' : '') + ').', 'info');
      this.render();
      return;
    } else if (key === 'c' || key === 'C') {
      const active = toggleDisguise(this.player);
      if (active) {
        soundFX.pickup();
        this.pushMessage('Holo-disguise activated.', 'info');
      } else {
        soundFX.powerDown();
        this.pushMessage('Holo-disguise deactivated.', 'info');
      }
      this.tick();
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
      // 優先檢查是否與相鄰居民交談
      const dirs: [number, number][] = [[0, 0], [0, 1], [0, -1], [1, 0], [-1, 0]];
      for (const [ox, oy] of dirs) {
        const tx = this.player.x + ox;
        const ty = this.player.y + oy;
        const npc = this.npcs.find((n) => n.isAlive && n.x === tx && n.y === ty);
        if (npc) {
          soundFX.terminal();
          this.updateNPCDialogues();
          const dx = this.player.x - npc.x;
          const dy = this.player.y - npc.y;
          if (Math.abs(dx) > Math.abs(dy)) {
            npc.facing = dx > 0 ? 'right' : 'left';
          } else {
            npc.facing = dy > 0 ? 'down' : 'up';
          }
          this.activeDialogue = { npc, textIndex: 0 };
          this.render();
          return;
        }
      }

      // 若無居民，檢查是否有終端機
      for (const [ox, oy] of dirs) {
        const tx = this.player.x + ox;
        const ty = this.player.y + oy;
        const terminal = this.findTerminalAt(tx, ty);
        if (terminal) {
          soundFX.terminal();
          this.performCheckIn();
          this.activeTerminal = new TerminalSession(terminal);
          this.terminalInputBuffer = '';
          this.activeTerminal.input = '';
          this.pushMessage('Terminal interface accessed. Type HELP for commands.', 'info');
          this.render();
          return;
        }
      }

      this.pushMessage('Nothing to interact with nearby.', 'warning');
      this.render();
      return;
    } else if (key === 'i' || key === 'I') {
      this.isInventoryOpen = true;
      soundFX.terminal();
      this.render();
      return;
    } else if (key === 'Tab' || key === 'tab' || key === 'k' || key === 'K') {
      this.isBigMapOpen = true;
      soundFX.terminal();
      this.render();
      return;
    } else if (key === 'm' || key === 'M') {
      this.isMissionLogOpen = true;
      soundFX.terminal();
      this.render();
      return;
    } else if (key === 'l' || key === 'L') {
      this.isStoryArchiveOpen = true;
      soundFX.terminal();
      this.render();
      return;
    } else if (key === 'u' || key === 'U') {
      this.isAugmentShopOpen = true;
      soundFX.terminal();
      this.render();
      return;
    } else if (key === 'z' || key === 'Z') {
      this.toggleLanguage();
      return;
    } else if (key === '8' || key === 'F5') {
      this.saveGame();
      return;
    } else if (key === '9' || key === 'F9') {
      this.loadGame();
      return;
    } else if (key === '1') {
      this.useMedkit();
      return;
    } else if (key === '2') {
      this.useBattery();
      return;
    } else if (key === '3') {
      this.useEMPGrenade();
      return;
    } else if (key === 'g' || key === 'G') {
      this.checkItemPickup();
      this.render();
      return;
    } else if (key === 'j' || key === 'J') {
      this.performTacticalDash();
      return;
    } else if (key === ' ' || key === 'Enter' || key === '.') {
      if (this.player.isWeaponDrawn) {
        this.fireEquippedWeapon();
        return;
      }
      this.tick();
      return;
    }

    if (dx !== 0 || dy !== 0) {
      const nx = this.player.x + dx;
      const ny = this.player.y + dy;

      // 檢查是否走向居民進行交談 (當收槍時直接觸發交談)
      const targetNPC = this.npcs.find((n) => n.isAlive && n.x === nx && n.y === ny);
      if (targetNPC) {
        if (!this.player.isWeaponDrawn) {
          soundFX.terminal();
          this.updateNPCDialogues();
          const dx = this.player.x - targetNPC.x;
          const dy = this.player.y - targetNPC.y;
          if (Math.abs(dx) > Math.abs(dy)) {
            targetNPC.facing = dx > 0 ? 'right' : 'left';
          } else {
            targetNPC.facing = dy > 0 ? 'down' : 'up';
          }
          this.activeDialogue = { npc: targetNPC, textIndex: 0 };
          this.render();
          return;
        } else {
          this.pushMessage('Holster weapon [F] to speak with ' + targetNPC.name + '.', 'warning');
          this.render();
          return;
        }
      }

      // 檢查是否拔槍射擊 (遠程或近戰雷射射擊)
      if (this.player.isWeaponDrawn) {
        // Check if there is a target in the direction
        let hitRobot: Robot | null = null;
        let hitCanister: Hazard | null = null;
        let hitBlock: PushableBlock | null = null;
        const maxRange = (this.player.equippedWeapon as any)?.range ?? 5;
        for (let range = 1; range <= maxRange; range++) {
          const tx = this.player.x + dx * range;
          const ty = this.player.y + dy * range;
          const tTile = getTile(this.map, { x: tx, y: ty });
          const tName = String(tTile).toUpperCase();
          if (tName === 'WALL' || tTile === 2) break;

          const foundBlock = this.pushableBlocks.find((b) => b.x === tx && b.y === ty);
          if (foundBlock) {
            hitBlock = foundBlock;
            break;
          }

          const found = this.robots.find((r) => r.isAlive && r.x === tx && r.y === ty);
          if (found) {
            hitRobot = found;
            break;
          }

          const foundCanister = this.hazards.find((h) => !h.exploded && h.x === tx && h.y === ty);
          if (foundCanister) {
            hitCanister = foundCanister;
            break;
          }
        }

        if (hitRobot || hitCanister || hitBlock) {
          this.fireEquippedWeapon({ dx, dy });
          return;
        }
        
        // No target in range, check if wall is blocking movement
        const tile = getTile(this.map, { x: nx, y: ny });
        if (tile && !isWalkable(tile)) {
           // Fire at the wall
           this.fireEquippedWeapon({ dx, dy });
           return;
        }
      }

      // 檢查是否走向可推動物體
      const pushableBlock = this.pushableBlocks.find((b) => b.x === nx && b.y === ny);
      if (pushableBlock) {
        const bx = nx + dx;
        const by = ny + dy;
        const mapWidth = Number((this.map as any).width) || 0;
        const mapHeight = Number((this.map as any).height) || 0;
        const inBounds = bx >= 0 && bx < mapWidth && by >= 0 && by < mapHeight;
        const targetTile = inBounds ? getTile(this.map, { x: bx, y: by }) : undefined;
        const targetWalkable = targetTile !== undefined && isWalkable(targetTile);
        const blockingRobot = this.robots.find((r) => r.isAlive && r.x === bx && r.y === by);
        const blockingNPC = this.npcs.find((n) => n.isAlive && n.x === bx && n.y === by);
        const blockingHazard = this.hazards.find((h) => !h.exploded && h.x === bx && h.y === by);
        const blockingBlock = this.pushableBlocks.find((b) => b !== pushableBlock && b.x === bx && b.y === by);

        if (inBounds && targetWalkable && !blockingRobot && !blockingNPC && !blockingHazard && !blockingBlock) {
          const oldX = pushableBlock.x;
          const oldY = pushableBlock.y;
          pushableBlock.x = bx;
          pushableBlock.y = by;
          this.player.x = nx;
          this.player.y = ny;
          soundFX.door();
          this.pushFloatingText(this.player.x, this.player.y, 'HEAVY PUSH', '#ffea00');
          const isZh = this.language === 'zh';
          let pushMsg = '';
          if (pushableBlock.blockType === 'server_rack') {
            pushMsg = isZh ? '伺服器機櫃發出電流聲，緩緩滑開。' : 'The server rack hums with static as it slides open.';
          } else if (pushableBlock.blockType === 'crate') {
            pushMsg = isZh ? '沉重的貨櫃發出金屬摩擦聲，被推開了一格。' : 'The heavy crate grinds against the floor as you push it.';
          } else {
            pushMsg = isZh ? '機械轟鳴聲中，厚重的牆體緩緩滑動。' : 'With a mechanical rumble, the heavy wall panel slides open.';
          }
          this.pushMessage(pushMsg, 'info');

          if (pushableBlock.secretDoor && !pushableBlock.revealed && (pushableBlock.x !== oldX || pushableBlock.y !== oldY)) {
            pushableBlock.revealed = true;
            const sd = pushableBlock.secretDoor;
            const mapData = (this.map as any).tiles || (this.map as any).grid;
            if (Array.isArray(mapData)) {
              const row = mapData[sd.y];
              if (Array.isArray(row)) {
                row[sd.x] = pushableBlock.revealedTile ?? 4;
              }
            }
            soundFX.victory();
            const tileSize = (this.renderer as any)?.tileSize || 48;
            (this.fx as any).spawnSparks(sd.x * tileSize + tileSize / 2, sd.y * tileSize + tileSize / 2, '#00ff88', 20);
            (this.fx as any).triggerShake(6);
            this.pushFloatingText(sd.x, sd.y, 'SECRET REVEALED!', '#00ff88');
            this.pushMessage(
              isZh
                ? '【發現暗門】移開' + (pushableBlock.nameZh || pushableBlock.name) + '後，顯現出一道隱密暗門！'
                : '[SECRET REVEALED] Pushed ' + pushableBlock.name + ' to reveal a hidden door!',
              'success'
            );
            this.gainExp(50, 'SECRET_DISCOVERY');
          }

          if (pushableBlock.secretSurprise && !pushableBlock.secretSurprise.claimed) {
            pushableBlock.secretSurprise.claimed = true;
            const surprise = pushableBlock.secretSurprise;
            if (surprise.type === 'credits') {
              const amt = surprise.amount || 0;
              this.player.credits += amt;
              this.pushFloatingText(this.player.x, this.player.y, `+${amt} CR`, '#ffea00');
              soundFX.pickup();
              this.pushMessage((isZh ? surprise.messageZh : surprise.messageEn) || (isZh ? '發現隱密物資！' : 'Discovered secret supplies!'), 'success');
              this.gainExp(35, 'SECRET_CACHE');
            } else if (surprise.type === 'energy') {
              const amt = surprise.amount || 0;
              this.player.energy = Math.min(this.player.maxEnergy, this.player.energy + amt);
              this.pushFloatingText(this.player.x, this.player.y, `+${amt} EN`, '#00f0ff');
              soundFX.pickup();
              this.pushMessage((isZh ? surprise.messageZh : surprise.messageEn) || (isZh ? '發現隱密物資！' : 'Discovered secret supplies!'), 'success');
              this.gainExp(35, 'SECRET_CACHE');
            } else if (surprise.type === 'item' && surprise.item) {
              this.groundItems.push({ ...surprise.item, x: oldX, y: oldY } as GroundItem);
              this.pushFloatingText(oldX, oldY, surprise.item.name, '#00f0ff');
              soundFX.pickup();
              this.pushMessage(isZh ? '【發現物資】移開障礙物後，發現了隱藏物資！' : '[SUPPLY FOUND] Uncovered hidden supplies behind the block!', 'success');
              this.gainExp(45, 'SECRET_CACHE');
            }
          }

          this.handlePlayerStep();
          this.checkItemPickup();
          this.tick();
          this.render();
          return;
        } else {
          soundFX.hit();
          this.pushMessage(this.language === 'zh' ? '此處牆體略有晃動，但後方受阻無法推動！' : 'This wall panel seems movable, but is blocked behind!', 'warning');
          this.render();
          return;
        }
      }

      // 一般行走移動
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
        this.handlePlayerStep();

        // 自動拾取地面物資 (Auto-loot ground items)
        this.checkItemPickup();

        const standingTile = getTile(this.map, { x: nx, y: ny });
        if (Number(standingTile) === 9 || String(standingTile).toUpperCase() === 'ELEVATOR') {
          const nextSec = getNextSectorId(this.map.id ?? '', nx, ny);
          this.switchSector(nextSec);
          this.render();
          return;
        }

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
      } else if (tile === 3 || String(tile).toUpperCase() === 'DOOR_CLOSED') {
        // Auto-open closed door when walking into it
        if (toggleDoor(this.map, { x: nx, y: ny })) {
          soundFX.door();
          this.pushMessage('Airlock blast door cycled open.', 'info');
          this.tick();
        } else {
          this.pushMessage('Blast door is locked. Use terminal to unlock.', 'warning');
          this.render();
        }
        return;
      } else if (tile === 5 || String(tile).toUpperCase() === 'FORCEFIELD') {
        const isZh = this.language === 'zh';
        const sectorId = this.map?.id || '';
        let msg = '';
        let floatText = '';
        if (sectorId === 'sector-2') {
          msg = isZh 
            ? '⚡ 電漿力場阻擋！請前往北側機房終端機 [15, 05] 輸入 OVERRIDE 關閉力場。' 
            : '⚡ PLASMA FORCEFIELD BLOCKING! Go to North Server Room Terminal [15, 05] and type OVERRIDE to disable.';
          floatText = isZh ? '⚡ 力場阻擋 ⚡' : '⚡ FORCEFIELD ⚡';
        } else if (sectorId === 'sector-1') {
          msg = isZh 
            ? '⚡ 電漿力場阻擋！請前往檢查哨終端機 [26, 05] 輸入 OVERRIDE 關閉力場。' 
            : '⚡ PLASMA FORCEFIELD BLOCKING! Go to Checkpoint Terminal [26, 05] and type OVERRIDE to disable.';
          floatText = isZh ? '⚡ 力場阻擋 ⚡' : '⚡ FORCEFIELD ⚡';
        } else {
          msg = isZh ? '⚡ 電漿力場阻擋！' : '⚡ PLASMA FORCEFIELD BLOCKING!';
          floatText = isZh ? '⚡ 力場 ⚡' : '⚡ FORCEFIELD ⚡';
        }
        this.pushMessage(msg, 'warning');
        this.pushFloatingText(nx, ny, floatText, '#ff2a4b');
        this.render();
        return;
      } else {
        this.pushMessage('Path blocked.', 'warning');
        this.render();
        return;
      }
    }
  }

  tick(): void {
    const now = Date.now();
    this.floatingTexts = this.floatingTexts.filter((ft) => !ft.createdAt || now - ft.createdAt < 1500);
    this.laserBeams = this.laserBeams.filter((b) => !b.createdAt || now - b.createdAt < (b.duration || 220));
    if (!this.player.isAlive) {
      this.updateFOV();
      this.render();
      return;
    }

    // Increment turn counter for broadcast scheduling
    this.turnCounter++;

    // Process conveyor belt transport
    this.processConveyors();

    // Update NPC autonomous behavior
    this.updateNPCs();

    // Check environmental observations (conveyor, plasma barrier, bionic canopy, landmarks)
    this.checkEnvironmentalObservations();

    // Radio broadcast system: every 15 turns or on sector change
    const currentSectorId = this.map?.id || '';
    if (currentSectorId !== this.lastSectorId) {
      this.lastSectorId = currentSectorId;
      this.pushBroadcast();
      this.lastBroadcastTurn = this.turnCounter;
    } else if (this.turnCounter - this.lastBroadcastTurn >= 15) {
      this.pushBroadcast();
      this.lastBroadcastTurn = this.turnCounter;
    }

    (this.map as any).pushableBlocks = this.pushableBlocks;

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
        if (this.securityLevel === 'CLEAR') {
          this.securityLevel = 'ALERT' as SecurityLevel;
        }
        
        const coverBlock = this.findPushableBlockOnLine({ x: robot.x, y: robot.y }, { x: this.player.x, y: this.player.y });
        if (coverBlock) {
          const coverTileSize = (this.renderer as any)?.tileSize || 48;
          (this.fx as any).spawnSparks(
            coverBlock.x * coverTileSize + coverTileSize / 2,
            coverBlock.y * coverTileSize + coverTileSize / 2,
            '#ffea00',
            10
          );
          (this.fx as any).triggerShake(3);
          soundFX.hit();
          this.pushFloatingText(coverBlock.x, coverBlock.y, 'COVER BLOCKED!', '#ffea00');
          this.pushMessage(
            this.language === 'zh' 
              ? `攻擊被【${coverBlock.nameZh || coverBlock.name}】擋下！` 
              : `Attack blocked by [${coverBlock.name}]!`,
            'info'
          );
          continue;
        }

        let damage = result.damage ?? robot.attackPower ?? 10;

        // 個人能量護盾抵擋 50% 傷害
        if (this.player.equippedShield && this.player.energy >= 4) {
          this.player.energy -= 4;
          damage = Math.max(1, Math.round(damage * 0.5));
          this.pushFloatingText(this.player.x, this.player.y, 'SHIELD ABSORB', '#00f0ff');
        }

        this.player.hp = Math.max(0, this.player.hp - damage);
        const hitPlayerTileSize = (this.renderer as any)?.tileSize || 48;
        const hitPlayerX = this.player.x * hitPlayerTileSize + hitPlayerTileSize / 2;
        const hitPlayerY = this.player.y * hitPlayerTileSize + hitPlayerTileSize / 2;
        let enemyBeamType: 'LASER' | 'ELEC' | 'PLASMA' | 'NEEDLE' = 'NEEDLE';
        let enemyBeamColor = '#ffea00';
        let enemyBeamWidth = 2;

        if (robot.robotType === 'HUNTER_KILLER') {
          enemyBeamType = 'LASER';
          enemyBeamColor = '#ff1744';
          enemyBeamWidth = 3.5;
          soundFX.laser();
          (this.fx as any).spawnSparks(hitPlayerX, hitPlayerY, '#ff1744', 10);
          (this.fx as any).triggerShake(5);
        } else if (robot.robotType === 'SHOCK_ENFORCER') {
          enemyBeamType = 'ELEC';
          enemyBeamColor = '#00e5ff';
          enemyBeamWidth = 3.5;
          soundFX.hit();
          (this.fx as any).spawnSparks(hitPlayerX, hitPlayerY, '#00e5ff', 10);
          (this.fx as any).triggerShake(4);
        } else if (robot.robotType === 'EXTERMINATOR' || isBossRobot(robot)) {
          enemyBeamType = 'PLASMA';
          enemyBeamColor = '#ff0055';
          enemyBeamWidth = 6;
          soundFX.explosion();
          (this.fx as any).spawnExplosion(hitPlayerX, hitPlayerY, 18);
          (this.fx as any).triggerShake(9);
        } else {
          soundFX.hit();
          (this.fx as any).spawnSparks(hitPlayerX, hitPlayerY, '#ffea00', 10);
          (this.fx as any).triggerShake(3);
        }

        this.laserBeams.push({
          from: { x: robot.x, y: robot.y },
          to: { x: this.player.x, y: this.player.y },
          color: enemyBeamColor,
          createdAt: now,
          duration: 220,
          beamType: enemyBeamType,
          width: enemyBeamWidth,
        });

        this.pushFloatingText(this.player.x, this.player.y, '-' + damage, '#ff1744');
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

    // 若所有追擊者已消滅，自動解除警報（神經項圈逾期時除外）
    if (this.securityLevel === 'ALERT' && !this.checkInAlertActive) {
      const anyChasing = this.robots.some(
        (r) =>
          r.isAlive &&
          ((r as any).aiState === 'chase' || (r as any).aiState === 'attack' || ((r as any).pursuitTurns ?? 0) > 0)
      );
      if (!anyChasing) {
        this.securityLevel = 'CLEAR' as SecurityLevel;
        this.pushMessage('Threat neutralized. Security alert cleared.', 'info');
      }
    }

    this.updateFOV();
    this.render();
    this.laserBeams = this.laserBeams.filter((b) => !b.createdAt || now - b.createdAt < (b.duration || 350));
  }

  private useMedkit(): void {
    if ((this.player.consumables?.medkits ?? 0) > 0) {
      if (this.player.hp >= this.player.maxHp) {
        this.pushMessage('HP is already at maximum capacity.', 'warning');
        this.render();
        return;
      }
      this.player.consumables!.medkits -= 1;
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 40);
      soundFX.pickup();
      this.pushFloatingText(this.player.x, this.player.y, '+40 HP', '#00ff88');
      this.pushMessage('Injected Nanite Stimpack (+40 HP). Vital signs stabilized.', 'success');
      const medTileSize = (this.renderer as any)?.tileSize || 48;
      (this.fx as any).spawnSparks(
        this.player.x * medTileSize + medTileSize / 2,
        this.player.y * medTileSize + medTileSize / 2,
        '#00ff88',
        12
      );
      this.tick();
    } else {
      this.pushMessage('No Nanite Stimpacks in inventory! Scavenge Sector 1 for medkits.', 'warning');
      this.render();
    }
  }

  private useBattery(): void {
    if ((this.player.consumables?.batteries ?? 0) > 0) {
      if (this.player.energy >= this.player.maxEnergy) {
        this.pushMessage('Energy capacitors are already fully charged.', 'warning');
        this.render();
        return;
      }
      this.player.consumables!.batteries -= 1;
      this.player.energy = Math.min(this.player.maxEnergy, this.player.energy + 50);
      soundFX.pickup();
      this.pushFloatingText(this.player.x, this.player.y, '+50 EN', '#00f0ff');
      this.pushMessage('Connected Plasma Battery (+50 EN). Cyberware powered.', 'success');
      const batteryTileSize = (this.renderer as any)?.tileSize || 48;
      (this.fx as any).spawnSparks(
        this.player.x * batteryTileSize + batteryTileSize / 2,
        this.player.y * batteryTileSize + batteryTileSize / 2,
        '#00f0ff',
        12
      );
      this.tick();
    } else {
      this.pushMessage('No Plasma Batteries remaining!', 'warning');
      this.render();
    }
  }

  private useEMPGrenade(): void {
    if ((this.player.consumables?.empGrenades ?? 0) > 0) {
      this.player.consumables!.empGrenades -= 1;
      soundFX.explosion();
      const empTileSize = (this.renderer as any)?.tileSize || 48;
      (this.fx as any).spawnEmpRing(
        this.player.x * empTileSize + empTileSize / 2,
        this.player.y * empTileSize + empTileSize / 2
      );
      (this.fx as any).triggerShake(6);
      const blastRadius = 4;
      let stunnedCount = 0;

      for (const r of this.robots) {
        if (!r.isAlive) continue;
        const dist = Math.abs(r.x - this.player.x) + Math.abs(r.y - this.player.y);
        if (dist <= blastRadius) {
          r.stunnedTurns = 4;
          r.aiState = 'idle';
          this.pushFloatingText(r.x, r.y, '⚡STUNNED (4T)⚡', '#00f0ff');
          stunnedCount++;
        }
      }

      this.pushFloatingText(this.player.x, this.player.y, 'EMP BLAST!', '#c77dff');
      this.pushMessage(
        `EMP Disruptor detonated! ${stunnedCount} robot(s) short-circuited for 4 turns!`,
        'success'
      );
      this.tick();
    } else {
      this.pushMessage('No EMP Disruptor Grenades in inventory!', 'warning');
      this.render();
    }
  }

  private buyAugment(augmentId: string): void {
    const success = installAugment(this.player, augmentId);
    if (success) {
      soundFX.upgrade();
      this.pushFloatingText(this.player.x, this.player.y, 'AUGMENT ONLINE!', '#00ff88');
      this.pushMessage('NEURAL AUGMENTATION COMPLETE: [' + augmentId + '] installed!', 'success');
    } else {
      soundFX.hit();
      if (this.player.augments?.[augmentId]) {
        this.pushMessage('Augment [' + augmentId + '] is already active.', 'warning');
      } else {
        this.pushMessage('INSUFFICIENT CREDITS! Eliminate Tzorg patrols to scavenge credits.', 'danger');
      }
    }
    this.render();
  }

  buyConsumableItem(type: 'MEDKIT' | 'BATTERY' | 'EMP_GRENADE', cost: number): boolean {
    if (this.player.credits < cost) {
      soundFX.hit();
      this.pushMessage('INSUFFICIENT CREDITS! Need ' + cost + ' CR.', 'danger');
      this.render();
      return false;
    }

    if (!this.player.consumables) {
      this.player.consumables = { medkits: 0, batteries: 0, empGrenades: 0 };
    }

    this.player.credits -= cost;
    soundFX.pickup();

    if (type === 'MEDKIT') {
      this.player.consumables.medkits = (this.player.consumables.medkits ?? 0) + 1;
      this.pushFloatingText(this.player.x, this.player.y, '+1 MEDKIT', '#00ff88');
      this.pushMessage('Purchased Nanite Medkit (-' + cost + ' CR).', 'success');
    } else if (type === 'BATTERY') {
      this.player.consumables.batteries = (this.player.consumables.batteries ?? 0) + 1;
      this.pushFloatingText(this.player.x, this.player.y, '+1 BATTERY', '#00f0ff');
      this.pushMessage('Purchased Plasma Battery (-' + cost + ' CR).', 'success');
    } else if (type === 'EMP_GRENADE') {
      this.player.consumables.empGrenades = (this.player.consumables.empGrenades ?? 0) + 1;
      this.pushFloatingText(this.player.x, this.player.y, '+1 EMP GRENADE', '#c77dff');
      this.pushMessage('Purchased EMP Disruptor (-' + cost + ' CR).', 'success');
    }

    this.render();
    return true;
  }

  buyWeaponOverclock(cost: number): boolean {
    if (this.player.credits < cost) {
      soundFX.hit();
      this.pushMessage('INSUFFICIENT CREDITS! Need ' + cost + ' CR.', 'danger');
      this.render();
      return false;
    }

    if (!this.player.equippedWeapon) {
      this.pushMessage('No weapon equipped to overclock.', 'warning');
      this.render();
      return false;
    }

    this.player.credits -= cost;
    this.player.equippedWeapon.power = (this.player.equippedWeapon.power ?? 20) + 5;
    (this.player.equippedWeapon as any).overclockLevel = ((this.player.equippedWeapon as any).overclockLevel || 0) + 1;
    soundFX.upgrade();
    this.pushFloatingText(this.player.x, this.player.y, '+5 WEAPON DMG!', '#ffea00');
    this.pushMessage('Weapon Overclocked! [' + this.player.equippedWeapon.name + '] Power increased to ' + this.player.equippedWeapon.power + '.', 'success');
    this.render();
    return true;
  }

  bribeSecurityNetwork(cost: number): boolean {
    if (this.player.credits < cost) {
      soundFX.hit();
      this.pushMessage('INSUFFICIENT CREDITS! Need ' + cost + ' CR.', 'danger');
      this.render();
      return false;
    }

    this.player.credits -= cost;
    this.securityLevel = 'CLEAR' as SecurityLevel;
    this.checkInAlertActive = false;
    (this.player as any).checkInTimer = 100;
    
    for (const r of this.robots) {
      if (r.isAlive && r.aiState === 'chase') {
        r.aiState = 'patrol';
        (r as any).pursuitTurns = 0;
      }
    }

    soundFX.terminal();
    this.pushFloatingText(this.player.x, this.player.y, 'SECURITY OVERRIDE - CLEAR', '#00ff88');
    this.pushMessage('Bribed Security Network. All alerts cleared and patrols reset.', 'success');
    this.render();
    return true;
  }

  private detonateCanister(canister: Hazard): void {
    canister.exploded = true;
    canister.hp = 0;
    soundFX.explosion();
    this.pushFloatingText(canister.x, canister.y, 'PLASMA DETONATION!', '#ff6d00');
    const canisterTileSize = (this.renderer as any)?.tileSize || 48;
    (this.fx as any).spawnExplosion(
      canister.x * canisterTileSize + canisterTileSize / 2,
      canister.y * canisterTileSize + canisterTileSize / 2,
      26
    );
    (this.fx as any).triggerShake(10);

    for (const r of this.robots) {
      if (!r.isAlive) continue;
      const dist = Math.abs(r.x - canister.x) + Math.abs(r.y - canister.y);
      if (dist <= 2) {
        r.hp -= 70;
        this.pushFloatingText(r.x, r.y, '-70', '#ff6d00');
        if (r.hp <= 0) {
          r.isAlive = false;
          soundFX.explosion();
          this.pushMessage(r.name + ' destroyed by plasma explosion!', 'success');
        }
      }
    }

    const playerDist = Math.abs(this.player.x - canister.x) + Math.abs(this.player.y - canister.y);
    if (playerDist <= 2) {
      this.player.hp = Math.max(0, this.player.hp - 20);
      this.pushFloatingText(this.player.x, this.player.y, '-20', '#ff1744');
      this.pushMessage('Plasma explosion! -20 HP from blast damage.', 'danger');
      if (this.player.hp <= 0) {
        this.player.isAlive = false;
        soundFX.powerDown();
        this.pushMessage('MISSION FAILED: Operative killed by plasma explosion.', 'danger');
      }
    }
  }

  private checkItemPickup(): void {
    const itemIndex = this.groundItems.findIndex((it) => it.x === this.player.x && it.y === this.player.y);
    if (itemIndex !== -1) {
      const item = this.groundItems.splice(itemIndex, 1)[0];
      if (item.itemType === 'MEDKIT') {
        this.player.consumables!.medkits = (this.player.consumables?.medkits ?? 0) + (item.amount || 1);
        this.pushFloatingText(this.player.x, this.player.y, '+1 MEDKIT', '#00ff88');
        this.pushMessage(`Salvaged [${item.name}]. Press [1] to quick-heal.`, 'success');
      } else if (item.itemType === 'BATTERY') {
        this.player.consumables!.batteries = (this.player.consumables?.batteries ?? 0) + (item.amount || 1);
        this.pushFloatingText(this.player.x, this.player.y, '+1 BATTERY', '#00f0ff');
        this.pushMessage(`Salvaged [${item.name}]. Press [2] to recharge.`, 'success');
      } else if (item.itemType === 'EMP_GRENADE') {
        this.player.consumables!.empGrenades = (this.player.consumables?.empGrenades ?? 0) + (item.amount || 1);
        this.pushFloatingText(this.player.x, this.player.y, '+1 EMP GRENADE', '#c77dff');
        this.pushMessage(`Acquired [${item.name}]. Press [3] to detonate EMP shockwave!`, 'success');
      } else if (item.itemType === 'CREDIT_CHIP') {
        const cr = item.amount || 45;
        this.player.credits += cr;
        this.pushFloatingText(this.player.x, this.player.y, `+${cr} CR`, '#ffea00');
        this.pushMessage(`Retrieved encrypted credit chip (+${cr} CR).`, 'success');
      } else if (item.itemType === 'KEYCARD') {
        let inventory = (this.player as any).inventory;
        if (!Array.isArray(inventory)) {
          inventory = [];
          (this.player as any).inventory = inventory;
        }
        if (!inventory.some((it: any) => it?.id === item.id)) {
          inventory.push(item);
        }

        if (item.id === 'item-omni-visor') {
          this.isOmniVisionActive = true;
          this.updateFOV();
          this.pushFloatingText(this.player.x, this.player.y, 'OMNI-VISOR ONLINE', '#00f0ff');
          this.pushMessage(`Acquired [${item.name}]: Omni-vision scan activated.`, 'success');
        } else if (item.id === 'item-full-map-uplink') {
          this.isFullMapActive = true;
          this.updateFOV();
          this.pushFloatingText(this.player.x, this.player.y, 'FULL-MAP UPLINK ONLINE', '#ffea00');
          this.pushMessage(`Acquired [${item.name}]: Full-map exploration view activated.`, 'success');
        } else {
          this.pushFloatingText(this.player.x, this.player.y, 'PASSCODE ACQUIRED', '#ffea00');
          this.pushMessage(`Acquired [${item.name}]: Tzorg security clearance elevated.`, 'success');
        }
      } else if (item.id === 'item-master-pass') {
        soundFX.victory();
        this.pushFloatingText(this.player.x, this.player.y, 'MASTER PASS!', '#ffd700');
        this.pushMessage(
          this.language === 'zh'
            ? '【發現傳奇密寶】獲得了【佐格主宰萬用通行證】！請前往任意終端機操作解除項圈！'
            : '[LEGENDARY RELIC] Acquired Tzorg Master Keycard! Access any terminal to permanently disarm collar!',
          'success'
        );
      } else if (item.itemType === 'DATA_SLATE') {
        const foundLog = this.storyLogs.find((l) => l.id === item.storyLogId);
        if (foundLog) {
          foundLog.read = true;
          this.activeStoryLog = foundLog;
          soundFX.terminal();
          this.pushFloatingText(this.player.x, this.player.y, 'LORE UNLOCKED!', '#00e5ff');
          this.gainExp(40, 'DATA_SLATE');
          const isZh = this.language === 'zh';
          const slateObservations: Record<string, { zh: string; en: string }> = {
            'slate-vance': {
              zh: '數據板 01：文斯博士的記憶晶片。螢幕上閃爍著他顫抖的手寫字：「我創造了神經項圈，現在我必須毀掉它。」',
              en: 'Data Slate 01: Dr. Vance\'s memory chip. His trembling handwriting flickers on the screen: "I built the neural collar. Now I must destroy it."',
            },
            'slate-kira': {
              zh: '數據板 02：反抗軍戰報。基拉的聲音冰冷而堅定：「第二區已失守。七十名同志犧牲。我們不會忘記。」',
              en: 'Data Slate 02: Resistance dispatch. Kira\'s voice is cold and resolute: "Sector 2 has fallen. Seventy comrades lost. We will not forget."',
            },
            'slate-tzorg': {
              zh: '數據板 03：佐格安全指令。加密頻道中傳來機械化的聲音：「所有單位立即中和目標。五萬萬必須保持休眠。」',
              en: 'Data Slate 03: Tzorg security directive. A mechanized voice echoes through the encrypted channel: "All units neutralize target immediately. The Five Million must remain dormant."',
            },
            'slate-ghost': {
              zh: '數據板 04：量子傳輸截獲。鬼影的聲音在靜電中若隱若現：「神經項圈可以逆轉。自由不是特權，是權利。」',
              en: 'Data Slate 04: Intercepted quantum transmission. Ghost\'s voice emerges from the static: "The neural collars can be reversed. Freedom is not a privilege. It is a right."',
            },
          };
          const obs = slateObservations[item.storyLogId || ''];
          if (obs) {
            this.pushMessage(isZh ? obs.zh : obs.en, 'info');
          }
          this.pushMessage(`Decrypted Data Slate: [${foundLog.title}]. Press [L] to review archives.`, 'success');
          this.updateNPCDialogues();
        }
      }
      soundFX.pickup();

      const scavengeObj = this.missionObjectives.find((o) => o.id === 'obj-scavenge');
      if (scavengeObj && !scavengeObj.completed) {
        scavengeObj.completed = true;
        this.pushMessage('MISSION UPDATE: Tactical Stockpile objective complete!', 'success');
        this.gainExp(50, 'MISSION_COMPLETE');
      }
    }
  }

  openStoryLog(selected: StoryLog): void {
    if (selected && selected.read) {
      this.activeStoryLog = selected;
      soundFX.terminal();
      this.render();
      return;
    }
    if (selected && !selected.read) {
      const isZh = this.language === 'zh';
      const locationHints: Record<string, { x: number; y: number; zh: string; en: string }> = {
        'slate-vance': {
          x: 4, y: 18,
          zh: '西側廢棄生化實驗室 (x: 4, y: 18)',
          en: 'Western abandoned bio-lab (x: 4, y: 18)',
        },
        'slate-kira': {
          x: 3, y: 23,
          zh: '反抗軍安全屋內部暗格 (x: 3, y: 23)',
          en: 'Hidden compartment inside Rebel Safehouse (x: 3, y: 23)',
        },
        'slate-tzorg': {
          x: 23, y: 7,
          zh: '檢查哨外圍巡邏哨兵殘骸 (x: 23, y: 7)',
          en: 'Wreckage of patrol sentry outside checkpoint (x: 23, y: 7)',
        },
        'slate-ghost': {
          x: 32, y: 19,
          zh: '通訊中繼天線節點 (x: 32, y: 19)',
          en: 'Comm relay antenna node (x: 32, y: 19)',
        },
      };
      const hint = locationHints[selected.id];
      if (hint) {
        this.activeStoryLog = {
          ...selected,
          read: false,
          content: [
            '// ACCESS DENIED: PHYSICAL DISK NOT RECOVERED //',
            'RECON INTEL LOCATION:',
            `> ${hint.en}`,
            'Stand on the glowing data slate on the map and press [G] to recover and decrypt.'
          ],
          contentZh: [
            '// 存取拒絕：實體記憶磁碟尚未回收 //',
            '偵察情報位置線索：',
            `> ${hint.zh}`,
            '請特工在地圖上找到散發光芒的數據板，站在上方按 [G] 即可拾取並完全解密。'
          ]
        } as unknown as StoryLog;
        soundFX.terminal();
        this.render();
        return;
      }
    }
  }

  private updateNPCDialogues(): void {
    const vanceRead = this.storyLogs.find((l) => l.id === 'slate-vance')?.read;
    const kiraRead = this.storyLogs.find((l) => l.id === 'slate-kira')?.read;
    const tzorgRead = this.storyLogs.find((l) => l.id === 'slate-tzorg')?.read;
    const forcefieldObj = this.missionObjectives?.find((o) => o.id === 'obj-forcefield');
    const forcefieldDisabled = (this as any).forcefieldDisabled === true || forcefieldObj?.completed === true;
    const ramenQuestComplete = (this as any).ramenQuestComplete === true;
    const synthwaveTapeActive = (this as any).synthwaveTapeActive === true;
    const zeroOneWeaponForged = (this as any).zeroOneWeaponForged === true;

    const inventory = (this.player as any).inventory;
    const hasQuantumCore = Array.isArray(inventory) && inventory.some((it: any) => it?.id === 'item-quantum-core');
    const hasQuantumWeapon = Array.isArray(inventory) && inventory.some((it: any) => it?.id === 'quantum-annihilator');
    const alertRaised = this.securityLevel === 'ALERT';

    // ---- npc-hiro ----
    const hiro = this.npcs.find((n) => n.id === 'npc-hiro');
    if (hiro) {
      if (ramenQuestComplete) {
        hiro.dialogue = [
          'Raven! The secret broth is finally simmering down in the under-street stalls. You can smell it drifting through the vents!',
          'That recipe was my grandmother\'s. Now the whole district is talking about the flavor.',
          'Remember: your max HP is permanently reinforced (+50 HP). Push forward, operative. The revolution needs you strong.',
        ];
        (hiro as any).dialogueZh = [
          '雷文！秘傳高湯終於在地下街的小攤上熬好了，香味正從通風口飄出來！',
          '那食譜是我阿嬤傳下來的。現在整條街都在傳聞這味道。',
          '記住：你的最大生命值已永久強化（+50 HP）。勇往直前，特工。革命需要你保持強壯。',
        ];
      } else {
        hiro.dialogue = [
          'Hey Raven! I lost my family\'s ramen recipe in the Sector 2 purge. If you find it, I owe you a bowl.',
          'The broth recipe is the soul of the whole dish. Without it, it\'s just noodles in water.',
          'Keep your eyes open in the safehouse and the market. It might be stashed somewhere.',
        ];
        (hiro as any).dialogueZh = [
          '嗨，雷文！我在第二區清剿中弄丟了家傳的拉麵食譜。若你幫我找回，我欠你一碗。',
          '高湯食譜是整道菜的靈魂。沒有它，就只是泡在水裡的麵。',
          '在安全屋和市場多留神。它可能藏在某個角落。',
        ];
      }
    }

    // ---- npc-elena ----
    const elena = this.npcs.find((n) => n.id === 'npc-elena');
    if (elena) {
      if (synthwaveTapeActive) {
        elena.dialogue = [
          'Listen... the 1984 analog master tape is now broadcasting across the under-district. Feel that warmth?',
          'My max energy is up (+20 EN). The resonance is real, Raven.',
          'This melody is indelible. No Tzorg algorithm can erase it from our minds. Keep it playing.',
        ];
        (elena as any).dialogueZh = [
          '聽……那捲 1984 類比母帶正在地下街區廣播播放。感受到那股暖意了嗎？',
          '我的最大能量提升了（+20 EN）。共鳴是真實的，雷文。',
          '這份旋律不可磨滅。佐格的任何演算法都無法從我們腦中抹去它。讓它繼續播放。',
        ];
      } else {
        elena.dialogue = [
          'Raven, I\'ve been restoring old analog recordings. If you find my synth-tape master, bring it to me.',
          'The analog frequency awakens a neural resonance that Tzorg\'s digital systems can\'t replicate.',
          'It\'s buried somewhere in the safehouse. Help me recover it and I\'ll reward you.',
        ];
        (elena as any).dialogueZh = [
          '雷文，我一直在修復舊的類比錄音。若你找到我的合成母帶，請帶給我。',
          '類比頻率能喚醒一種神經共鳴，是佐格的數位系統無法複製的。',
          '它藏在安全屋的某處。幫我找回它，我會回報你。',
        ];
      }
    }

    // ---- npc-sylvia ----
    const sylvia = this.npcs.find((n) => n.id === 'npc-sylvia');
    if (sylvia) {
      if (hasQuantumCore) {
        sylvia.dialogue = [
          'You have the Quantum Core, Raven. Good. Do not let it fall into Tzorg hands.',
          'Take it to Zero-One in Sector 2. He\'s the only one who can forge it into a weapon.',
          'Pair it with the Matrix Chip from the sewers. Together they\'ll shatter their second-stage shields.',
        ];
        (sylvia as any).dialogueZh = [
          '你持有量子核心，雷文。很好。別讓它落入佐格之手。',
          '把它帶去第二分區的 Zero-One。只有他能把它鍛造成武器。',
          '再配上下水道裡的矩陣晶片。兩者結合，將粉碎他們的第二階段護盾。',
        ];
      } else {
        sylvia.dialogue = [
          'Raven, I\'ve been hiding a Quantum Core from Tzorg\'s vault. It\'s the key to Project Singularity.',
          'I\'ll give it to you, but you must promise to use it against the Overmind.',
          'Take it to Zero-One in Sector 2 when you\'re ready. He\'ll know what to do.',
        ];
        (sylvia as any).dialogueZh = [
          '雷文，我從佐格的庫房藏了一顆量子核心。它是「奇點計畫」的關鍵。',
          '我會交給你，但你必須答應用它對抗中央主腦。',
          '準備好後，把它帶去第二分區的 Zero-One。他知道該怎麼辦。',
        ];
      }
    }

    // ---- npc-ghost ----
    const ghost = this.npcs.find((n) => n.id === 'npc-ghost');
    if (ghost) {
      if (forcefieldDisabled) {
        ghost.dialogue = [
          'Raven! You smashed the grid. The plasma barrier is down. Outstanding work.',
          'The Fab-Plex elevator and the sewer routes are now clear. Both paths are open to you.',
          'Move fast. Tzorg will reroute their patrols within the hour. The Overmind awaits.',
        ];
        (ghost as any).dialogueZh = [
          '雷文！你擊潰了電網。電漿屏障已解除。幹得漂亮。',
          '製造複合體的電梯與下水道通道如今已暢通。兩條路都為你敞開。',
          '行動要快。佐格一小時內就會重新調度巡邏隊。中央主腦在前方等你。',
        ];
      } else {
        ghost.dialogue = [
          'Raven, the checkpoint forcefield is still up. You can\'t reach the vault yet.',
          'Find terminal CHECKPOINT_FF and short-circuit it, or take the Sub-Sector 0 sewer route.',
          'Either way, get past that barrier. The Overmind is the only thing that matters now.',
        ];
        (ghost as any).dialogueZh = [
          '雷文，檢查站的電漿屏障還在。你暫時到不了金庫。',
          '找到終端機 CHECKPOINT_FF 把它短路，或走零號下水道路線。',
          '無論哪條路，都要突破那道屏障。現在只有中央主腦才是關鍵。',
        ];
      }
    }

    // ---- npc-vance ----
    const vance = this.npcs.find((n) => n.id === 'npc-vance');
    if (vance) {
      if (forcefieldDisabled) {
        vance.dialogue = [
          'Raven... you\'ve done what I could never bring myself to do. The barrier is down.',
          'Your bionic chassis is performing beyond its rated limits. I\'m proud and terrified in equal measure.',
          'The decision to face the Central Overmind directly is yours alone. Choose it with full understanding of the cost.',
        ];
        (vance as any).dialogueZh = [
          '雷文……你做到了我始終不敢做的事。屏障已解除。',
          '你的生化軀體效能已超越額定極限。我既驕傲，又恐懼。',
          '是否直面中央主腦，取決於你一人。請在完全理解代價之後再做決定。',
        ];
      } else if (vanceRead) {
        vance.dialogue = [
          'You recovered my laboratory disc, Raven... yes. I engineered the early neural dampeners.',
          'The guilt burns every waking second. That is why I synthesized those restorative nanites specifically to purge Tzorg\'s command signals.',
          'The checkpoint forcefield ahead uses a phased harmonic barrier. Infiltrate terminal CHECKPOINT_FF to short-circuit the capacitors.',
        ];
        (vance as any).dialogueZh = [
          '你找回了我的實驗室磁碟，雷文……是的。我設計了早期的神經抑制器。',
          '愧疚在每個清醒的時刻灼燒著我。正因如此，我才合成那些修復性奈米子，專門清除佐格的指令訊號。',
          '前方檢查站的電漿屏障使用相位諧波屏障。滲透終端機 CHECKPOINT_FF 來短路電容。',
        ];
      } else {
        vance.dialogue = [
          'Raven, I\'m Dr. Vance. I built the neural collars Tzorg uses on the Five Million.',
          'I\'ve been trying to undo my work. If you find my data slate, you\'ll understand why.',
          'The nanites I left in the safehouse can purge Tzorg\'s command signals from your chassis.',
        ];
        (vance as any).dialogueZh = [
          '雷文，我是文斯博士。我建造了佐格用在五萬萬人身上的神經項圈。',
          '我一直在試圖彌補我的過錯。若你找到我的數據板，你會明白原因。',
          '我留在安全屋的奈米子能從你的軀體中清除佐格的指令訊號。',
        ];
      }
    }

    // ---- npc-kira ----
    const kira = this.npcs.find((n) => n.id === 'npc-kira');
    if (kira) {
      if (forcefieldDisabled) {
        kira.dialogue = [
          'Raven! Telemetry confirms the checkpoint forcefield has been disabled. You\'ve opened the path to the Overmind.',
          'We\'ve detected an Exterminator-Prime energy spike near the core. All resistance units are on standby.',
          'Move with precision. This is the moment we\'ve been fighting for. Make it count.',
        ];
        (kira as any).dialogueZh = [
          '雷文！遙測確認檢查站電漿屏障已被解除。你已打開通往中央主腦的道路。',
          '我們偵測到 Exterminator-Prime 在核心附近的能量峰值。全體反抗軍單位待命中。',
          '精準行動。這正是我們奮戰至今的時刻。別讓它辜負。',
        ];
      } else if (kiraRead) {
        kira.dialogue = [
          'You read the Sector 2 codex... we lost seventy courageous souls when the Hunter-Killers purged our base.',
          'Doc Vance rebuilt your chassis from prototype military salvage. You are the vanguard of our revolution, Raven.',
          'Once that forcefield drops, Ghost will guide you directly to the Central Vault. Make Tzorg answer for every fallen comrade!',
        ];
        (kira as any).dialogueZh = [
          '你讀了第二區的檔案……當獵殺者清剿我們基地時，我們失去了七十位勇敢的同志。',
          '文斯博士用原型軍用殘骸重組了你的軀體。你是我們革命的先鋒，雷文。',
          '一旦那道屏障解除，鬼影會直接引導你到中央金庫。讓佐格為每一位犧牲的同志付出代價！',
        ];
      } else {
        kira.dialogue = [
          'Raven, I\'m Commander Kira of the Resistance. We\'ve been tracking your movements.',
          'Tzorg\'s Overmind controls the Five Million through neural collars. We intend to break that control.',
          'Read the Sector 2 codex when you find it. You\'ll understand why we fight.',
        ];
        (kira as any).dialogueZh = [
          '雷文，我是反抗軍的基拉指揮官。我們一直在追蹤你的行蹤。',
          '佐格的中央主腦透過神經項圈控制著五萬萬人。我們打算打破這種控制。',
          '找到第二區檔案後務必閱讀。你會明白我們為何而戰。',
        ];
      }
    }

    // ---- npc-jax ----
    const jax = this.npcs.find((n) => n.id === 'npc-jax');
    if (jax) {
      if (forcefieldDisabled) {
        jax.dialogue = [
          'Raven! Word on the black market is Tzorg\'s defenses are crumbling. The barrier\'s down.',
          'Their patrol routes are in chaos. This is your window to strike the core.',
          'If you drop an EMP on a patrol, hit them from behind while they\'re stunned. Massive critical override damage!',
        ];
        (jax as any).dialogueZh = [
          '雷文！黑市的情報是佐格的防線正在動搖。屏障已解除。',
          '他們的巡邏路線一片混亂。這是你突擊核心的窗口。',
          '若你在巡邏隊上丟 EMP，趁他們暈眩時從背後攻擊。可造成巨額奇襲傷害！',
        ];
      } else if (tzorgRead) {
        jax.dialogue = [
          'Raven! Tzorg\'s Overmind broadcasted an all-units security memo about you on the encrypted channels.',
          'They know you have military-grade camouflage and EMP shock modules. They are terrified of what you might do to their mainframes.',
          'If you drop an EMP on a patrol, hit them from behind while they are stunned. It deals massive critical override damage!',
        ];
        (jax as any).dialogueZh = [
          '雷文！佐格的中央主腦在加密頻道發布了關於你的全單位安全備忘錄。',
          '他們知道你有軍規級偽裝與 EMP 衝擊模組。他們害怕你會對他們的主機做什麼。',
          '若你在巡邏隊上丟 EMP，趁他們暈眩時從背後攻擊。可造成巨額奇襲傷害！',
        ];
      } else {
        jax.dialogue = [
          'Raven, I\'m Jax. I run the black market in this district. You\'ve got a reputation.',
          'Tzorg\'s got a security memo out on you. They\'re scared of what you\'ll do to their mainframes.',
          'EMP shock modules are my specialty. Hit a patrol from behind while they\'re stunned for massive damage.',
        ];
        (jax as any).dialogueZh = [
          '雷文，我是傑克斯。我經營這片區的黑市。你很有名氣。',
          '佐格對你發布了安全備忘錄。他們害怕你會對他們的主機做什麼。',
          'EMP 衝擊模組是我的專長。趁巡邏隊暈眩時從背後攻擊，可造成巨額傷害。',
        ];
      }
    }

    // ---- npc-zero-one ----
    const zeroOne = this.npcs.find((n) => n.id === 'npc-zero-one');
    if (zeroOne) {
      if (zeroOneWeaponForged) {
        zeroOne.dialogue = [
          'The Quantum Annihilator is online, Raven. Watch how it shatters their second-stage shields.',
          'Each shot collapses the harmonic lattice of their phase armor. No Tzorg unit can survive a direct hit.',
          'Aim for the Overmind\'s shield generator first. Break that, and the core is exposed.',
        ];
        (zeroOne as any).dialogueZh = [
          '量子殲滅重砲已上線，雷文。看它如何粉碎他們的第二階段護盾。',
          '每一發都會崩解他們相位鎧甲的諧波晶格。沒有佐格單位能抵擋直接命中。',
          '先瞄準中央主腦的護盾發生器。擊碎它，核心就暴露了。',
        ];
      } else {
        const hasCore = Array.isArray(inventory) && inventory.some((it: any) => it?.id === 'item-quantum-core');
        const hasChip = Array.isArray(inventory) && inventory.some((it: any) => it?.id === 'item-matrix-chip');
        
        const coreStatus = hasCore ? '[ACQUIRED]' : '[MISSING - Obtain from Sylvia in Sector 1]';
        const chipStatus = hasChip ? '[ACQUIRED]' : '[MISSING - Recover from Sub-Sector 0 Sewers]';
        
        zeroOne.dialogue = [
          'Raven, I\'m Zero-One. I\'m the only engineer who can forge the Quantum Annihilator.',
          `Component Status: Quantum Core ${coreStatus} | Matrix Chip ${chipStatus}.`,
          'Once I have both, I\'ll forge a weapon that can break Tzorg\'s second-stage shields.',
        ];
        (zeroOne as any).dialogueZh = [
          '雷文，我是 Zero-One。我是唯一能鍛造量子殲滅重砲的工程師。',
          `組件狀態：量子約束核心 ${coreStatus} | 主機矩陣晶片 ${chipStatus}。`,
          '一旦兩者齊備，我就能鍛造出能擊碎佐格第二階段護盾的武器。',
        ];
      }
    }

    // ---- npc-jackal ----
    const jackal = this.npcs.find((n) => n.id === 'npc-jackal');
    if (jackal) {
      if (hasQuantumWeapon || alertRaised) {
        jackal.dialogue = [
          'Raven, listen carefully. The Exterminator-Prime runs a hyper-phase shield.',
          'Ordinary fire just bounces off. You\'ll need the Quantum Annihilator to pierce it.',
          'Stay low, stay silent. That thing will hunt you down if it senses you.',
        ];
        (jackal as any).dialogueZh = [
          '雷文，仔細聽。Exterminator-Prime 搭載超相位護盾。',
          '普通火力只會被彈開。你需要量子殲滅重砲才能穿透它。',
          '保持低姿，保持靜默。那東西一旦偵測到你，就會追殺你。',
        ];
      } else {
        jackal.dialogue = [
          'Raven, I\'m Jackal. I\'ve survived Tzorg\'s purges by staying in the shadows.',
          'There\'s a boss-class unit called Exterminator-Prime guarding the core. Be careful.',
          'It runs a hyper-phase shield. You\'ll need something special to break through it.',
        ];
        (jackal as any).dialogueZh = [
          '雷文，我是豺狼。我靠躲在陰影中逃過佐格的清剿。',
          '有一台名為 Exterminator-Prime 的 Boss 級單位守衛著核心。小心。',
          '它搭載超相位護盾。你需要點特別的東西才能突破。',
        ];
      }
    }
  }

  disarmCollar(): void {
    this.isCollarDisarmed = true;
    (this.player as any).isCollarDisarmed = true;
    this.checkInAlertActive = false;
    (this.player as any).checkInTimer = 100;
    this.securityLevel = 'CLEAR' as SecurityLevel;
    for (const r of this.robots) {
      if (!r.isAlive) continue;
      r.aiState = 'patrol';
      r.targetPos = null;
      (r as any).pursuitTurns = 0;
    }
    soundFX.victory();
    this.pushFloatingText(this.player.x, this.player.y, 'COLLAR DISARMED!', '#00ff88');
    this.pushMessage(
      this.language === 'zh'
        ? '【密寶啟動】最高特權金鑰生效！神經項圈已永久解鎖並解除監控，100 步限制完全消除！'
        : '[RELIC ACTIVATED] Tzorg Master Pass verified! Neural collar permanently neutralized! 100-step restriction lifted!',
      'success'
    );
    this.gainExp(100, 'MISSION_COMPLETE');
    this.render();
  }

  restartGame(): void {
    this.map = buildSector1Map();
    this.player = createPlayer(this.map.playerStart);
    this.robots = this.createSectorRobots();
    this.npcs = this.createSectorNPCs();
    this.storyLogs = this.createSectorStoryLogs();
    this.groundItems = this.createSectorItems();
    this.missionObjectives = this.createSectorObjectives();
    this.isInventoryOpen = false;
    this.isMissionLogOpen = false;
    this.isStoryArchiveOpen = false;
    this.activeStoryLog = null;
    this.securityLevel = 'CLEAR' as SecurityLevel;
    this.messages = [];
    this.floatingTexts = [];
    this.pushMessage('OPERATION PROMETHEUS: Protocol restarted. Operative Raven deployed.', 'info');
    this.activeTerminal = null;
    this.activeDialogue = null;
    this.laserBeams = [];
    this.terminalInputBuffer = '';
    this.victory = false;
    this.endgameChoice = null;
    soundFX.pickup();
    this.updateFOV();
    this.render();
  }

  private handleTerminalInput(key: string): void {
    if (!this.activeTerminal) {
      return;
    }

    if (key === 'Escape' || key === 'Esc') {
      this.activeTerminal = null;
      this.terminalInputBuffer = '';
      soundFX.terminal();
      this.render();
      return;
    }

    if (key === 'Backspace') {
      this.terminalInputBuffer = this.terminalInputBuffer.slice(0, -1);
      (this.activeTerminal as any).input = this.terminalInputBuffer;
      this.render();
      return;
    }

    if (key === 'Enter') {
      const cmd = this.terminalInputBuffer || (this.activeTerminal as any)?.input || '';
      this.terminalInputBuffer = '';
      (this.activeTerminal as any).input = '';

      const upperCmd = cmd.toUpperCase();
      if (upperCmd === 'BREACH' || upperCmd === 'HACK') {
        this.activeBreachSession = createBreachSession((this.activeTerminal as any)?.terminal?.id || 'CORE');
        this.render();
        return;
      }

      if (upperCmd === 'CHECKIN') {
        this.performCheckIn();
        this.render();
        return;
      }

      const inventory = (this.player as any).inventory;
      const items: string[] = [];
      if (Array.isArray(inventory)) {
        for (const it of inventory) {
          if (it?.id) items.push(it.id);
          if (it?.name) items.push(it.name);
        }
      }
      const consumables = this.player.consumables;
      if (consumables?.batteries) items.push(`batteries:${consumables.batteries}`);
      if (consumables?.empGrenades) items.push(`empGrenades:${consumables.empGrenades}`);
      if (this.player.equippedWeapon?.name) items.push(`equippedWeapon:${this.player.equippedWeapon.name}`);

      const context = {
        hasDefeatedBoss: (this.player as any).hasDefeatedBoss === true,
        items,
        level: (this.player as any).level ?? 1,
        decryptedSlates: this.storyLogs.filter((l) => l.read).map((l) => l.id),
      };
      const result: any = this.activeTerminal.executeCommand(cmd, context);

      if (result?.disabledForcefield) {
        const ffName: string = result.disabledForcefield || 'CORE_FF';
        try {
          disableForcefield(this.map, ffName);
        } catch (err) {
          void err;
        }
        // Also try to disable the other forcefield if it exists
        const otherFF: string = ffName === 'CHECKPOINT_FF' ? 'CORE_FF' : 'CHECKPOINT_FF';
        try {
          disableForcefield(this.map, otherFF);
        } catch (err) {
          void err;
        }
        const forcefieldObj = this.missionObjectives.find((o) => o.id === 'obj-forcefield');
        if (forcefieldObj && !forcefieldObj.completed) {
          forcefieldObj.completed = true;
          this.pushMessage('MISSION UPDATE: Checkpoint 01 forcefield deactivated!', 'success');
          this.gainExp(50, 'MISSION_COMPLETE');
        }
        this.pushMessage(`${ffName}: Plasma barrier capacitors short-circuited. Barrier offline.`, 'success');
        soundFX.victory();
        this.gainExp(60, 'HACK_SUCCESS');
        (this as any).forcefieldDisabled = true;
        this.updateNPCDialogues();
      }

      if (result?.disarmCollar) {
        this.disarmCollar();
      }

      if (result?.endgameChoice) {
        this.endgameChoice = result.endgameChoice;
        (this.player as any).endgameChoice = result.endgameChoice;
        this.victory = true;
        soundFX.victory();
        this.pushMessage('OPERATION PROMETHEUS: [' + result.endgameChoice + '] protocol executed.', 'success');
        this.pushFloatingText(this.player.x, this.player.y, 'ENDGAME: ' + result.endgameChoice, '#00ff88');
      }

      if (result?.victory) {
        this.victory = true;
      }

      if (result?.clearedAlert) {
        if (this.checkInAlertActive) {
          this.pushMessage(
            this.language === 'zh'
              ? '❌ 無法解除警報：神經項圈逾期未簽到！請執行 CHECKIN 指令。'
              : '❌ Cannot clear alert: Neural collar check-in overdue! Execute CHECKIN command.',
            'danger'
          );
        } else {
          this.securityLevel = 'CLEAR' as SecurityLevel;
          this.pushMessage('Security alert cleared. All units returning to patrol.', 'info');
        }
      }

      if (result?.energyGain) {
        this.player.energy = Math.min(this.player.maxEnergy, this.player.energy + result.energyGain);
        this.pushFloatingText(this.player.x, this.player.y, `+${result.energyGain} EN`, '#00f0ff');
        this.pushMessage(`Energy siphoned: +${result.energyGain} EN.`, 'success');
        this.gainExp(25, 'ENERGY_SIPHON');
      }

      if (result?.shouldExit) {
        this.activeTerminal = null;
      }

      this.render();
      return;
    }

    if (key.length === 1 && key >= ' ' && key <= '~') {
      this.terminalInputBuffer += key;
      (this.activeTerminal as any).input = this.terminalInputBuffer;
      this.render();
    }
  }

  private getConveyorDirection(x: number, y: number): { dx: number; dy: number } {
    // Sector 2 conveyor rules
    if (y === 8) {
      return { dx: 1, dy: 0 }; // East (upper production line)
    } else if (y === 14) {
      return { dx: -1, dy: 0 }; // West (lower return line)
    }
    return { dx: 1, dy: 0 }; // Default East
  }

  private isConveyorTile(x: number, y: number): boolean {
    const tile = getTile(this.map, { x, y });
    if (tile === undefined) return false;
    // Check for CONVEYOR tile type (value 10 or string 'CONVEYOR')
    if (Number(tile) === 10) return true;
    if (String(tile).toUpperCase() === 'CONVEYOR') return true;
    return false;
  }

  processConveyors(): void {
    // Process player conveyor movement
    if (this.player.isAlive && this.isConveyorTile(this.player.x, this.player.y)) {
      const { dx, dy } = this.getConveyorDirection(this.player.x, this.player.y);
      const targetX = this.player.x + dx;
      const targetY = this.player.y + dy;

      // Check if target is walkable and no robot blocking
      const targetTile = getTile(this.map, { x: targetX, y: targetY });
      const targetWalkable = targetTile !== undefined && isWalkable(targetTile);
      const blockingRobot = this.robots.find((r) => r.isAlive && r.x === targetX && r.y === targetY);

      if (targetWalkable && !blockingRobot) {
        this.player.x = targetX;
        this.player.y = targetY;

        // Update facing
        if (dx === 1) (this.player as any).facing = 'right';
        else if (dx === -1) (this.player as any).facing = 'left';
        else if (dy === 1) (this.player as any).facing = 'down';
        else if (dy === -1) (this.player as any).facing = 'up';

        // Trigger item pickup
        this.checkItemPickup();

        // Play sound and show feedback
        soundFX.step();
        const directionText = dx === 1 ? '»» CONVEYOR »»' : dx === -1 ? '«« CONVEYOR ««' : 'CONVEYOR';
        this.pushFloatingText(this.player.x, this.player.y, directionText, '#00f0ff');
        this.pushMessage('Conveyor belt transport: Operative moved to new position.', 'info');
      }
    }

    // Process robot conveyor movement
    for (const robot of this.robots) {
      if (!robot.isAlive) continue;
      if (!this.isConveyorTile(robot.x, robot.y)) continue;

      const { dx, dy } = this.getConveyorDirection(robot.x, robot.y);
      const targetX = robot.x + dx;
      const targetY = robot.y + dy;

      // Check if target is walkable and no blocking entities
      const targetTile = getTile(this.map, { x: targetX, y: targetY });
      const targetWalkable = targetTile !== undefined && isWalkable(targetTile);

      // Check if player is blocking
      const playerBlocking = this.player.isAlive && this.player.x === targetX && this.player.y === targetY;

      // Check if another robot is blocking
      const robotBlocking = this.robots.find((r) => r.isAlive && r !== robot && r.x === targetX && r.y === targetY);

      if (targetWalkable && !playerBlocking && !robotBlocking) {
        robot.x = targetX;
        robot.y = targetY;
      }
    }
  }

  fireEquippedWeapon(direction?: { dx: number; dy: number }): boolean {
    let dx = 0;
    let dy = 0;
    if (direction) {
      dx = direction.dx;
      dy = direction.dy;
    } else {
      const facing = (this.player as any).facing || 'right';
      if (facing === 'right') dx = 1;
      else if (facing === 'left') dx = -1;
      else if (facing === 'up') dy = -1;
      else if (facing === 'down') dy = 1;
    }

    const weapon = this.player.equippedWeapon;
    if (!weapon) return false;

    const energyCost = weapon.energyCost ?? 5;
    if (this.player.energy < energyCost) {
      soundFX.hit();
      this.pushMessage('Energy depleted! Blaster power cells exhausted.', 'danger');
      this.render();
      return false;
    }

    this.player.energy -= energyCost;
    
    const weaponId = (weapon as any)?.weaponId;
    const isQuantum = weaponId === 'QUANTUM_ANNIHILATOR';
    
    let hitRobot: Robot | null = null;
    let hitCanister: Hazard | null = null;
    let hitBlock: PushableBlock | null = null;
    let hitWall = false;
    let hitX = this.player.x + dx;
    let hitY = this.player.y + dy;
    
    const maxRange = isQuantum ? 7 : (weapon.range ?? 5);
    
    for (let range = 1; range <= maxRange; range++) {
      const tx = this.player.x + dx * range;
      const ty = this.player.y + dy * range;
      const tTile = getTile(this.map, { x: tx, y: ty });
      const tName = String(tTile).toUpperCase();
      
      if (tName === 'WALL' || tTile === 2) {
        hitWall = true;
        hitX = tx;
        hitY = ty;
        break;
      }

      const foundBlock = this.pushableBlocks.find((b) => b.x === tx && b.y === ty);
      if (foundBlock) {
        hitBlock = foundBlock;
        hitX = tx;
        hitY = ty;
        break;
      }

      const found = this.robots.find((r) => r.isAlive && r.x === tx && r.y === ty);
      if (found) {
        hitRobot = found;
        hitX = tx;
        hitY = ty;
        break;
      }

      const foundCanister = this.hazards.find((h) => !h.exploded && h.x === tx && h.y === ty);
      if (foundCanister) {
        hitCanister = foundCanister;
        hitX = tx;
        hitY = ty;
        break;
      }
    }

    // Play sound
    if (weaponId === 'DART_GUN') {
      soundFX.dart();
    } else if (weaponId === 'SCATTER_SHOTGUN') {
      soundFX.shotgun();
    } else if (isQuantum) {
      soundFX.laser();
    } else {
      soundFX.laser();
    }

    // Visuals
    let beamColor = '#00f0ff';
    let beamType: 'LASER' | 'ELEC' | 'PLASMA' | 'NEEDLE' | 'QUANTUM' = 'LASER';
    let beamWidth = 3;
    let sparkColor = '#00f0ff';
    let sparkCount = 10;
    let shakeIntensity = 0;

    if (isQuantum) {
      beamType = 'QUANTUM';
      beamColor = '#b388ff';
      beamWidth = 6;
      sparkColor = '#b388ff';
      sparkCount = 25;
      shakeIntensity = 10;
    }

    const playerBeam = {
      from: { x: this.player.x, y: this.player.y },
      to: { x: hitX, y: hitY },
      color: beamColor,
      createdAt: Date.now(),
      duration: 200,
      beamType: beamType,
      width: beamWidth,
      targetRobot: hitRobot || undefined,
    };
    this.laserBeams.push(playerBeam);

    const hitTileSize = (this.renderer as any)?.tileSize || 48;
    (this.fx as any).spawnSparks(
      hitX * hitTileSize + hitTileSize / 2,
      hitY * hitTileSize + hitTileSize / 2,
      sparkColor,
      sparkCount
    );
    if (shakeIntensity > 0) {
      (this.fx as any).triggerShake(shakeIntensity);
    }

    // Damage Logic
    if (hitRobot) {
      // 戰術背刺與奇襲判定 (Ambush / Silent Backstab)
      const isBackstab =
        this.player.isDisguised ||
        hitRobot.aiState === 'patrol' ||
        (hitRobot.stunnedTurns ?? 0) > 0;

      const baseDamage = weapon.power ?? 35;
      let damage = isBackstab ? Math.round(baseDamage * 3) : baseDamage;
      
      if (isQuantum) {
        // Quantum Annihilator: 220 damage, pierces phase shield, stuns
        damage = 220;
        hitRobot.stunnedTurns = 2;
      }

      if (isBossRobot(hitRobot)) {
        applyBossDamage(hitRobot, damage, this);
      } else {
        hitRobot.hp -= damage;
        if (hitRobot.hp <= 0) {
          hitRobot.isAlive = false;
          soundFX.hit();
          this.pushFloatingText(hitRobot.x, hitRobot.y, 'DESTROYED', '#ff3855');
          this.pushMessage(hitRobot.name + ' destroyed!', 'success');
        }
      }

      if (isQuantum) {
        this.pushFloatingText(hitRobot.x, hitRobot.y, 'QUANTUM ANNIHILATION!', '#b388ff');
        this.pushMessage(`QUANTUM ANNIHILATOR: Dealt ${damage} damage to ${hitRobot.name}!`, 'success');
      } else if (isBackstab) {
        this.pushFloatingText(hitRobot.x, hitRobot.y, `CRIT ${damage}!`, '#ffea00');
        this.pushMessage(
          `AMBUSH CRITICAL OVERRIDE: Dealt ${damage} damage to ${hitRobot.name}!`,
          'success'
        );
      } else {
        this.pushFloatingText(hitRobot.x, hitRobot.y, '-' + damage, '#ff3855');
        this.pushMessage('Fired laser at ' + hitRobot.name + ' for ' + damage + ' dmg!', 'danger');
      }

      if (hitRobot.hp <= 0) {
        hitRobot.isAlive = false;
        soundFX.explosion();
        (this.fx as any).spawnExplosion(
          hitRobot.x * hitTileSize + hitTileSize / 2,
          hitRobot.y * hitTileSize + hitTileSize / 2,
          22
        );
        (this.fx as any).triggerShake(8);
        this.gainExp(45);
        this.player.credits += 50;
        this.player.energy = Math.min(this.player.maxEnergy, this.player.energy + 20);

        // 隨機掉落殘骸補給物資 (Loot Drop from robot)
        const dropRoll = Math.random();
        if (dropRoll < 0.4) {
          this.groundItems.push({
            id: `drop-${Date.now()}`,
            name: 'Plasma Battery',
            itemType: 'BATTERY',
            x: hitRobot.x,
            y: hitRobot.y,
            description: 'Salvaged power capacitor from destroyed chassis.',
            amount: 1,
            iconColor: '#00f0ff',
          });
        } else if (dropRoll < 0.7) {
          this.groundItems.push({
            id: `drop-${Date.now()}`,
            name: 'Credit Chip',
            itemType: 'CREDIT_CHIP',
            x: hitRobot.x,
            y: hitRobot.y,
            description: 'Tzorg encoded currency token.',
            amount: 45,
            iconColor: '#ffea00',
          });
        }

        this.pushFloatingText(hitRobot.x, hitRobot.y, '+50 CR', '#ffaa00');
        this.pushMessage(hitRobot.name + ' destroyed! Salvaged scrap data & energy.', 'success');

        // 檢查附近是否已無追擊者，若是則解除警報
        const anyNearbyChasing = this.robots.some(
          (r) =>
            r.isAlive &&
            r !== hitRobot &&
            ((r as any).aiState === 'chase' || (r as any).aiState === 'attack' || ((r as any).pursuitTurns ?? 0) > 0) &&
            Math.hypot(r.x - this.player.x, r.y - this.player.y) <= 14
        );
        if (!anyNearbyChasing && this.securityLevel === 'ALERT' && !this.checkInAlertActive) {
          this.securityLevel = 'CLEAR' as SecurityLevel;
          this.pushMessage('All nearby hostiles eliminated. Area secure.', 'info');
        }
      } else {
        soundFX.hit();
        hitRobot.aiState = 'chase';
        hitRobot.targetPos = { x: this.player.x, y: this.player.y };
        (hitRobot as any).pursuitTurns = 8;
      }

      // 槍響聲學偵測與警戒連鎖 (Gunfire Acoustics)
      const isSuppressed = (weapon as any)?.isSuppressed === true;
      if (isSuppressed) {
        this.pushMessage('Suppressed shot fired! No acoustic signature detected.', 'info');
      } else if (!isBackstab) {
        this.securityLevel = 'ALERT' as SecurityLevel;
        soundFX.alarm();

        // 槍響震波：通知半徑 8 格內未發現主角的巡邏機器人前來調查
        for (const r of this.robots) {
          if (!r.isAlive || r === hitRobot) continue;
          const d = Math.abs(r.x - this.player.x) + Math.abs(r.y - this.player.y);
          if (d <= 8 && r.aiState === 'patrol') {
            r.aiState = 'chase';
            r.targetPos = { x: this.player.x, y: this.player.y };
            (r as any).pursuitTurns = 6;
          }
        }
      } else {
        this.pushMessage('Silent takedown executed! Acoustic suppression maintained.', 'info');
      }
    } else if (hitCanister) {
      this.detonateCanister(hitCanister);
    } else if (hitBlock) {
      this.pushFloatingText(hitX, hitY, 'BLOCKED', '#ffea00');
      this.pushMessage('Weapon impact blocked by cover.', 'info');
      
      // Acoustic alert even if no hit
      const isSuppressed = (weapon as any)?.isSuppressed === true;
      if (!isSuppressed) {
        this.securityLevel = 'ALERT' as SecurityLevel;
        soundFX.alarm();
        for (const r of this.robots) {
          if (!r.isAlive) continue;
          const d = Math.abs(r.x - this.player.x) + Math.abs(r.y - this.player.y);
          if (d <= 8 && r.aiState === 'patrol') {
            r.aiState = 'chase';
            r.targetPos = { x: this.player.x, y: this.player.y };
            (r as any).pursuitTurns = 6;
          }
        }
      }
    } else {
      // No target, just impact effect
      this.pushFloatingText(hitX, hitY, 'IMPACT', '#00f0ff');
      this.pushMessage('Fired weapon into the void.', 'info');
      
      // Acoustic alert even if no hit
      const isSuppressed = (weapon as any)?.isSuppressed === true;
      if (!isSuppressed) {
        this.securityLevel = 'ALERT' as SecurityLevel;
        soundFX.alarm();
        for (const r of this.robots) {
          if (!r.isAlive) continue;
          const d = Math.abs(r.x - this.player.x) + Math.abs(r.y - this.player.y);
          if (d <= 8 && r.aiState === 'patrol') {
            r.aiState = 'chase';
            r.targetPos = { x: this.player.x, y: this.player.y };
            (r as any).pursuitTurns = 6;
          }
        }
      }
    }

    this.tick();

    // Update beam and floating text coordinates if the hit robot moved during tick
    if (hitRobot && hitRobot.isAlive && (hitRobot.x !== hitX || hitRobot.y !== hitY)) {
      playerBeam.to = { x: hitRobot.x, y: hitRobot.y };
      // Update the most recent floating text that was created at the old hit position
      for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
        const ft = this.floatingTexts[i];
        if (ft.x === hitX && ft.y === hitY) {
          ft.x = hitRobot.x;
          ft.y = hitRobot.y;
          break;
        }
      }
    }

    return true;
  }

  private updateNPCs(): void {
    for (const npc of this.npcs) {
      if (!npc.isAlive) continue;
      const res = updateNPC(npc, this.player, this.map, { npcs: this.npcs, robots: this.robots }, this.turnCounter);
      if (res?.bark && Math.random() < 0.25) {
        this.pushFloatingText(npc.x, npc.y, this.language === 'zh' ? res.bark.zh : res.bark.en, npc.avatarColor || '#00e5ff');
      }
    }
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

export default GameEngine;
