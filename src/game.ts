import type { SectorMap, Player, Item, Robot, SecurityLevel, GameMessage, Position, RobotType, NPC, DialogueSession, GroundItem, MissionObjective, StoryLog, Hazard, Language, LaserBeam, PushableBlock, CitadelAirdrop } from './types';
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
import { InputRouter } from './inputRouter';
import { bgm } from './music';
import { executeDetentionRelocation, startDefeatCutscene, updateDefeatCutscene } from './defeatCutscene';
import { triggerCitadelHorde as _triggerCitadelHorde, updateCitadelHorde as _updateCitadelHorde } from './citadelHorde';
import { setupSubSectorZero, getNextSectorId } from './sewerMap';
import { setupCitadel, buildCitadelMap } from './citadelMap';
import { FXManager } from './fx';
import { updateNPC } from './npcAI';
import { updateNPCDialogues as _updateNPCDialogues } from './npcDialogueManager';
import { fireEquippedWeapon as _fireEquippedWeapon } from './combat';
import {
  createSectorRobots,
  createSectorNPCs,
  createSector2NPCs,
  createSectorStoryLogs,
  createSectorItems,
  createSector2Items,
  createSectorObjectives,
  createSectorHazards,
  createSectorPushableBlocks,
} from './worldBuilder';
import { handleTerminalInput as _handleTerminalInput } from './terminalRunner';
import { processConveyors as _processConveyors, detonateCanister as _detonateCanister } from './hazardSystem';
import { checkQuestDiscovery as _checkQuestDiscovery, completeQuest as _completeQuest, discoverMainStoryQuest as _discoverMainStoryQuest, completeMainStoryQuest as _completeMainStoryQuest } from './questSystem';
import { JournalEntry, loadJournalEntries, saveJournalEntry, deleteJournalEntry, clearJournalEntries } from './journalSystem';
import { generateAIPerceptionSnapshot, AIPerceptionSnapshot, executeAIAction as _executeAIAction, AIActionOutcome, getActionSemantic, ACTION_SEMANTICS, ActionSemantic } from './aiPerception';
import { getMentalMapSnapshot, planMentalMapRoute, MentalMapSnapshot, RoutePlan } from './mentalMap';


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
  titleMenuIndex: number = 0;
  language: Language = 'zh';
  isManualOpen: boolean = false;
  isTitleStoryOpen: boolean = false;
  titleStoryScrollOffset: number = 0;
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
  graffitiMuralComplete: boolean = false;
  poetryQuestComplete: boolean = false;
  isGearConfiscated: boolean = false;
  confiscatedGear: any = null;
  isCitadelHordeActive: boolean = false;
  citadelAirdrops: CitadelAirdrop[] = [];
  defeatCutscene: {
    stage: 'swarm' | 'blur_out' | 'wake_up';
    startTime: number;
    stageStartTime: number;
    duration: number;
    playerDownPos: { x: number; y: number };
    swarmRobots: Robot[];
  } | null = null;
  private turnCounter: number = 0;
  private lastBroadcastTurn: number = 0;
  private lastBroadcastIndex: number = 0;
  private lastAdjacentPassageKey: string = '';
  private broadcastQueue: string[] = [];
  private inputRouter: InputRouter;
  checkInAlertActive: boolean = false;
  private lastSectorId: string = '';
  private lastLandmarkKey: string = '';
  storyArchiveSelectedIndex: number = 0;
  sectorGroundItems: Record<string, GroundItem[]> = {};
  pushableBlocks: PushableBlock[] = [];
  sectorPushableBlocks: Record<string, PushableBlock[]> = {};
  isJournalOpen: boolean = false;
  journalEntries: JournalEntry[] = [];
  journalSelectedIndex: number = 0;
  journalMode: 'view' | 'compose' = 'view';
  journalInputBuffer: string = '';
  journalTitleInputBuffer: string = '';
  journalComposeField: 'title' | 'content' = 'title';
  isIntroBriefingOpen: boolean = false;
  introBriefingScrollOffset: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.journalEntries = loadJournalEntries();
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
    this.pushMessage(this.language === 'zh' ? '【任務指示】搜集加密數據板並突破 01 號檢查哨。' : 'MISSION: Recover encrypted data slates & breach Checkpoint 01.', 'warning');
    this.pushMessage('INTEL: Speak with Kira [T], check tactical missions [M], inventory [I], archives [L].', 'info');
    this.pushMessage(this.language === 'zh' ? '【系統提示】神經視覺尚未校準，請移動一步以同步光學感測器。' : 'SYSTEM: Neural vision not yet calibrated. Move one step to synchronize optical sensors.', 'info');
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
    this.player.checkInTimer = 100;
    this.inputRouter = new InputRouter(this);
    if (typeof window !== 'undefined') {
      (window as any).getAIPerceptionSnapshot = () => this.getAIPerceptionSnapshot();
      (window as any).getGameStateSnapshot = () => this.getAIPerceptionSnapshot();
      (window as any).executeAIAction = (action: string) => this.executeAIAction(action);
      (window as any).sendAIAction = (action: string) => this.executeAIAction(action);
      (window as any).getActionSemantic = (action: string) => this.getActionSemantic(action);
      (window as any).ACTION_SEMANTICS = ACTION_SEMANTICS;
      (window as any).getMentalMap = (options?: any) => this.getMentalMap(options);
      (window as any).planMentalMapRoute = (target: string | { x: number; y: number }, startPos?: { x: number; y: number }) => this.planMentalMapRoute(target, startPos);
    }
  }

  private setupPointerEvents(): void {
    if (typeof window === 'undefined' || !this.canvas || typeof this.canvas.addEventListener !== 'function') return;
    this.canvas.addEventListener('pointerdown', (e: PointerEvent) => {
      if (this.isJournalOpen && this.journalMode === 'compose') {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const boxW = Math.min(this.canvas.width - 40, 720);
        const boxH = Math.min(this.canvas.height - 60, 440);
        const startX = (this.canvas.width - boxW) / 2;
        const startY = (this.canvas.height - boxH) / 2;
        const titleY = startY + 60;
        const titleH = 40;
        const contentY = startY + 110;
        const contentH = boxH - 170;
        if (x >= startX + 20 && x <= startX + boxW - 20) {
          if (y >= titleY && y <= titleY + titleH) {
            this.journalComposeField = 'title';
            this.render();
            return;
          } else if (y >= contentY && y <= contentY + contentH) {
            this.journalComposeField = 'content';
            this.render();
            return;
          }
        }
        return;
      }
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

  private executeTitleMenuItem(index: number): void {
    switch (index) {
      case 0:
        this.isTitleScreen = false;
        soundFX.pickup();
        const msg = this.language === 'zh' ? '任務啟動！' : 'MISSION START!';
        this.pushFloatingText(this.player.x, this.player.y, msg, '#00ffcc');
        this.updateMusicIntensity();
        this.render();
        break;
      case 1:
        if (this.hasSaveGame()) {
          if (this.loadGame()) {
            this.isTitleScreen = false;
            this.updateMusicIntensity();
          }
        } else {
          soundFX.hit();
          this.pushMessage(this.language === 'zh' ? '未發現存檔！' : 'NO SAVE FOUND!', 'warning');
          this.render();
        }
        break;
      case 2:
        this.toggleLanguage();
        break;
      case 3:
        this.isManualOpen = !this.isManualOpen;
        soundFX.terminal();
        this.render();
        break;
      case 4:
        // Quick save/load not actionable from title
        break;
      case 5:
        this.cycleResolution();
        break;
    }
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

    // Adjacent door / passage proximity hints
    this.checkAdjacentPassageHints();
  }

  private checkAdjacentPassageHints(): void {
    const px = this.player.x;
    const py = this.player.y;
    const isZh = this.language === 'zh';
    const facing = this.player.facing || 'down';

    // Directions in priority order: facing direction first, then the rest
    const allDirs: Array<{ dx: number; dy: number; label: string; labelEn: string }> = [
      { dx: 0, dy: -1, label: '上方', labelEn: 'above' },
      { dx: 0, dy: 1, label: '下方', labelEn: 'below' },
      { dx: -1, dy: 0, label: '左方', labelEn: 'to the left' },
      { dx: 1, dy: 0, label: '右方', labelEn: 'to the right' },
    ];
    const facingDir =
      facing === 'up' ? 0 : facing === 'down' ? 1 : facing === 'left' ? 2 : 3;
    const ordered = [allDirs[facingDir], ...allDirs.filter((_, i) => i !== facingDir)];

    let foundKey = '';
    let foundMsg = '';

    for (const dir of ordered) {
      const nx = px + dir.dx;
      const ny = py + dir.dy;
      const tile = getTile(this.map, { x: nx, y: ny });
      let kind: string | null = null;
      if (tile !== undefined) {
        const num = Number(tile);
        if (num === 3) kind = 'door_closed';
        else if (num === 4) kind = 'door_open';
        else if (num === 9) kind = 'elevator';
      }
      if (!kind) {
        const block = this.pushableBlocks.find((b) => b.x === nx && b.y === ny && b.secretDoor);
        if (block) kind = 'secret_door';
      }
      if (kind) {
        foundKey = `${kind}-${nx},${ny}`;
        if (kind === 'door_closed') {
          foundMsg = isZh
            ? `${dir.label}似乎有一扇門。`
            : `There seems to be a door ${dir.labelEn}.`;
        } else if (kind === 'door_open') {
          foundMsg = isZh
            ? `${dir.label}有一扇敞開的門。`
            : `There is an open door ${dir.labelEn}.`;
        } else if (kind === 'elevator') {
          foundMsg = isZh
            ? `${dir.label}似乎有一處升降機通道。`
            : `There seems to be an elevator passage ${dir.labelEn}.`;
        } else {
          foundMsg = isZh
            ? `${dir.label}似乎有一處隱密通道。`
            : `There seems to be a hidden passage ${dir.labelEn}.`;
        }
        break;
      }
    }

    if (foundKey) {
      const playerKey = `${foundKey}-${px},${py}`;
      if (this.lastAdjacentPassageKey !== playerKey) {
        this.lastAdjacentPassageKey = playerKey;
        this.pushMessage(foundMsg, 'info');
      }
    } else {
      this.lastAdjacentPassageKey = '';
    }
  }

  private startAnimationLoop(): void {
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      let lastTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const anim = () => {
        const currentTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const dt = Math.min(100, Math.max(8, currentTime - lastTime));
        lastTime = currentTime;
        this.updateVisualEffects(dt);
        this.render();
        window.requestAnimationFrame(anim);
      };
      window.requestAnimationFrame(anim);
    }
  }

  updateVisualEffects(dt: number = 16): void {
    this.fx.update(dt);
    if (this.defeatCutscene) {
      this.updateDefeatCutscene(Date.now());
    }
    const now = Date.now();
    this.floatingTexts = this.floatingTexts.filter((ft) => !ft.createdAt || now - ft.createdAt < 1500);
    this.laserBeams = this.laserBeams.filter((b) => !b.createdAt || now - b.createdAt < (b.duration || 220));
  }

  private createSectorRobots(): Robot[] {
    return createSectorRobots();
  }

  private createSectorNPCs(): NPC[] {
    return createSectorNPCs();
  }

  private createSector2NPCs(): NPC[] {
    return createSector2NPCs();
  }

  private createSectorStoryLogs(): StoryLog[] {
    return createSectorStoryLogs();
  }

  private createSectorItems(): GroundItem[] {
    return createSectorItems();
  }

  private createSector2Items(): GroundItem[] {
    return createSector2Items();
  }

  private createSectorObjectives(): MissionObjective[] {
    return createSectorObjectives();
  }

  private createSectorHazards(): Hazard[] {
    return createSectorHazards();
  }

  private createSectorPushableBlocks(sectorId?: string): PushableBlock[] {
    return createSectorPushableBlocks(sectorId || this.map?.id);
  }

  switchSector(targetSectorId: string): void {
    const prevMapId = this.map?.id;
    this.securityLevel = this.checkInAlertActive ? 'ALERT' as SecurityLevel : 'CLEAR' as SecurityLevel;
    this.laserBeams = [];

    if (prevMapId === 'sector-citadel' && targetSectorId !== 'sector-citadel') {
      this.citadelAirdrops.length = 0;
      this.isCitadelHordeActive = false;
    }

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
      this.updateMusicIntensity();
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
      this.updateMusicIntensity();
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
      this.player.currentSectorId = 'sector-2';
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
      this.updateMusicIntensity();
    } else if (targetSectorId === 'sector-1') {
      this.map = buildSector1Map();
      if (prevMapId === 'sub-sector-0') {
        this.player.x = 4;
        this.player.y = 21;
      } else {
        this.player.x = 37;
        this.player.y = 25;
      }
      this.player.currentSectorId = 'sector-1';
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
      this.updateMusicIntensity();
    }
  }

  private applyRevealedPushableBlocks(): void {
    for (const block of this.pushableBlocks) {
      if (block.revealed && block.secretDoor && block.secretDoor.revealedTile !== undefined) {
        const tile = getTile(this.map, { x: block.secretDoor.x, y: block.secretDoor.y });
        if (tile !== undefined && tile !== block.secretDoor.revealedTile) {
          // Set the tile to revealedTile (4 = DOOR_OPEN)
          const mapData = this.map.tiles || this.map.grid;
          if (Array.isArray(mapData)) {
            const row = mapData[block.secretDoor.y];
            if (Array.isArray(row)) {
              row[block.secretDoor.x] = block.secretDoor.revealedTile;
            }
          }
        }
      }
    }
  }

  pushMessage(text: string, type: GameMessage['type']): void {
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
    const inventory = this.player.inventory;
    return this.isOmniVisionActive || (Array.isArray(inventory) && inventory.some((it: any) => it?.id === 'item-omni-visor'));
  }

  hasFullMap(): boolean {
    const inventory = this.player.inventory;
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
    const p = this.player;
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
    const facing = this.player.facing || 'right';
    let dx = 0;
    let dy = 0;
    if (facing === 'right') dx = 1;
    else if (facing === 'left') dx = -1;
    else if (facing === 'up') dy = -1;
    else if (facing === 'down') dy = 1;

    const midX = this.player.x + dx;
    const midY = this.player.y + dy;
    const midPassable = this.isWalkable(midX, midY) && !this.findRobotAt(midX, midY) && !this.findNPCAt(midX, midY);

    if (!midPassable) {
      this.pushMessage(this.language === 'zh' ? '前方受阻，無法滑鏟！' : 'Path obstructed, cannot dash!', 'warning');
      return false;
    }

    let targetX = this.player.x + dx * 2;
    let targetY = this.player.y + dy * 2;
    let canMove = this.isWalkable(targetX, targetY) && !this.findRobotAt(targetX, targetY) && !this.findNPCAt(targetX, targetY);

    if (!canMove) {
      targetX = midX;
      targetY = midY;
      canMove = true;
    }

    this.player.energy -= 10;
    const tileSize = this.renderer.tileSize;
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
    const hasMasterPass = Array.isArray(this.player.inventory) && this.player.inventory.some((it: any) => it?.id === 'item-master-pass');
    if (hasMasterPass && !this.isCollarDisarmed) {
      this.disarmCollar();
      return;
    }
    const maxTimer = this.player.checkInMaxTimer || 100;
    this.player.checkInTimer = maxTimer;
    this.checkInAlertActive = false;
    this.securityLevel = 'CLEAR' as SecurityLevel;
    for (const r of this.robots) {
      if (!r.isAlive) continue;
      r.aiState = 'patrol';
      r.targetPos = null;
      r.pursuitTurns = 0;
    }
    this.pushMessage(
      this.language === 'zh'
        ? `神經項圈簽到成功：警報已解除，計時器重置為 ${maxTimer} 步，巡邏單位恢復常規模式。`
        : `Neural collar check-in successful: Alert cleared, timer reset to ${maxTimer} steps, patrol units returning to routine.`,
      'success'
    );
    this.pushFloatingText(this.player.x, this.player.y, `✔ CHECKED IN (${maxTimer})`, '#00ff88');
    soundFX.pickup();
    this.render();
  }

  handlePlayerStep(): void {
    if (this.isCollarDisarmed || this.player.isCollarDisarmed) return;
    const timer = this.player.checkInTimer;
    if (typeof timer === 'undefined') return;

    if (timer <= 0 || this.checkInAlertActive) {
      this.player.checkInTimer = 0;
      this.checkInAlertActive = true;
      this.securityLevel = 'ALERT' as SecurityLevel;
      for (const r of this.robots) {
        if (!r.isAlive) continue;
        if (r.aiState !== 'chase') {
          r.aiState = 'chase';
          r.targetPos = { x: this.player.x, y: this.player.y };
          r.pursuitTurns = 8;
        }
      }
      return;
    }

    const newTimer = timer - 1;
    this.player.checkInTimer = newTimer;

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
        r.pursuitTurns = 10;
      }
    }
  }

  private findRobotAt(x: number, y: number): Robot | null {
    return this.robots.find((r) => r.isAlive && r.x === x && r.y === y) || null;
  }

  findNPCAt(x: number, y: number): NPC | null {
    return this.npcs.find((n) => n.isAlive && n.x === x && n.y === y) || null;
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
      const width = Number(this.map.width) || 0;
      const height = Number(this.map.height) || 0;
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
      const width = Number(this.map.width) || 0;
      const height = Number(this.map.height) || 0;
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
      this.updateMusicIntensity();
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

  updateMusicIntensity(): void {
    if (this.isTitleScreen) {
      bgm.setIntensity('title');
    } else {
      const bossNear = this.robots.some((r) => r.isAlive && r.robotType === 'EXTERMINATOR' && Math.hypot(r.x - this.player.x, r.y - this.player.y) <= 9);
      const hostileNearby = this.robots.some(
        (r) =>
          r.isAlive &&
          (r.aiState === 'chase' || r.aiState === 'attack' || (r.pursuitTurns ?? 0) > 0) &&
          Math.hypot(r.x - this.player.x, r.y - this.player.y) <= 14
      );
      if (bossNear) {
        bgm.setIntensity('boss');
      } else if (hostileNearby) {
        bgm.setIntensity('combat');
      } else {
        bgm.setIntensity('exploration');
      }
    }
  }

  render(): void {
    try {
    this.renderer.fx = this.fx;
    this.renderer.defeatCutscene = this.defeatCutscene;
    this.renderer.activeWaypoint = this.activeWaypoint;
    this.renderer.isTitleScreen = this.isTitleScreen;
    this.renderer.language = this.language;
    this.renderer.hasSaveData = this.hasSaveGame();
    this.renderer.titleMenuIndex = this.titleMenuIndex;
    this.renderer.isManualOpen = this.isManualOpen;
    this.renderer.isTitleStoryOpen = this.isTitleStoryOpen;
    (this.renderer as any).titleStoryScrollOffset = this.titleStoryScrollOffset;
    this.renderer.activeBreachSession = this.activeBreachSession;
    this.renderer.isOmniVisionActive = this.hasOmniVision();
    this.renderer.isFullMapActive = this.hasFullMap();
    this.renderer.isBigMapOpen = this.isBigMapOpen;
    this.renderer.bigMapSelectedSector = this.bigMapSelectedSector;
    this.renderer.storyArchiveSelectedIndex = this.storyArchiveSelectedIndex;
    this.renderer.pushableBlocks = this.pushableBlocks;
    this.renderer.graffitiMuralComplete = this.graffitiMuralComplete;
    (this.renderer as any).citadelAirdrops = this.citadelAirdrops;
    (this.renderer as any).isJournalOpen = this.isJournalOpen;
    (this.renderer as any).journalEntries = this.journalEntries;
    (this.renderer as any).journalSelectedIndex = this.journalSelectedIndex;
    (this.renderer as any).journalMode = this.journalMode;
    (this.renderer as any).journalInputBuffer = this.journalInputBuffer;
    (this.renderer as any).journalTitleInputBuffer = this.journalTitleInputBuffer;
    (this.renderer as any).journalComposeField = this.journalComposeField;
    (this.renderer as any).isIntroBriefingOpen = this.isIntroBriefingOpen;
    (this.renderer as any).introBriefingScrollOffset = this.introBriefingScrollOffset;
    this.player.victory = this.victory;
    this.player.hasDefeatedBoss = this.robots.some((r) => !r.isAlive && isBossRobot(r));
    this.player.storyLogs = this.storyLogs;
    this.player.missionObjectives = this.missionObjectives;
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
    this.inputRouter.handleKeyDown(key);
  }

  tick(): void {
    const now = Date.now();
    this.updateVisualEffects(16);
    if (!this.player.isAlive) {
      this.updateFOV();
      this.updateMusicIntensity();
      this.render();
      return;
    }

    // Increment turn counter for broadcast scheduling
    this.turnCounter++;

    // Process conveyor belt transport
    this.processConveyors();

    // Update NPC autonomous behavior
    this.updateNPCs();

    // Citadel Horde endless reinforcement logic
    this.updateCitadelHorde();

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

    // Check environmental observations (conveyor, plasma barrier, bionic canopy, landmarks)
    this.checkEnvironmentalObservations();

    this.map.pushableBlocks = this.pushableBlocks;

    for (const robot of this.robots) {
      if (!robot.isAlive) {
        continue;
      }

      const result: any = updateRobotAI(robot, this.player, this.map, this.securityLevel, this.robots, this.npcs);

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
          const coverTileSize = this.renderer.tileSize;
          this.fx.spawnSparks(
            coverBlock.x * coverTileSize + coverTileSize / 2,
            coverBlock.y * coverTileSize + coverTileSize / 2,
            '#ffea00',
            10
          );
          this.fx.triggerShake(3);
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
        const hitPlayerTileSize = this.renderer.tileSize;
        const hitPlayerX = this.player.x * hitPlayerTileSize + hitPlayerTileSize / 2;
        const hitPlayerY = this.player.y * hitPlayerTileSize + hitPlayerTileSize / 2;
        let enemyBeamType: 'LASER' | 'ELEC' | 'PLASMA' | 'NEEDLE' = 'NEEDLE';
        let enemyBeamColor = '#ffea00';
        let enemyBeamWidth = 2;

        if (robot.robotType === 'SCOUT_DRONE') {
          enemyBeamType = 'NEEDLE';
          enemyBeamColor = '#ffea00';
          enemyBeamWidth = 2;
          soundFX.dart();
          this.fx.spawnSparks(hitPlayerX, hitPlayerY, '#ffea00', 8);
          this.fx.triggerShake(2);
        } else if (robot.robotType === 'HUNTER_KILLER') {
          enemyBeamType = 'LASER';
          enemyBeamColor = '#ff1744';
          enemyBeamWidth = 3.5;
          soundFX.laser();
          this.fx.spawnSparks(hitPlayerX, hitPlayerY, '#ff1744', 10);
          this.fx.triggerShake(5);
        } else if (robot.robotType === 'SHOCK_ENFORCER') {
          enemyBeamType = 'ELEC';
          enemyBeamColor = '#00e5ff';
          enemyBeamWidth = 3.5;
          soundFX.hit();
          this.fx.spawnSparks(hitPlayerX, hitPlayerY, '#00e5ff', 10);
          this.fx.triggerShake(4);
        } else if (robot.robotType === 'EXTERMINATOR' || isBossRobot(robot)) {
          enemyBeamType = 'PLASMA';
          enemyBeamColor = '#ff0055';
          enemyBeamWidth = 6;
          soundFX.explosion();
          this.fx.spawnExplosion(hitPlayerX, hitPlayerY, 18);
          this.fx.triggerShake(9);
        } else {
          soundFX.hit();
          this.fx.spawnSparks(hitPlayerX, hitPlayerY, '#ffea00', 10);
          this.fx.triggerShake(3);
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
          this.handlePlayerDefeat();
        }
      }
    }

    // 若所有追擊者已消滅，自動解除警報（神經項圈逾期時除外）
    if (this.securityLevel === 'ALERT' && !this.checkInAlertActive) {
      const anyChasing = this.robots.some(
        (r) =>
          r.isAlive &&
          (r.aiState === 'chase' || r.aiState === 'attack' || (r.pursuitTurns ?? 0) > 0)
      );
      if (!anyChasing) {
        this.securityLevel = 'CLEAR' as SecurityLevel;
        this.pushMessage('Threat neutralized. Security alert cleared.', 'info');
      }
    }

    this.updateMusicIntensity();
    this.updateFOV();
    this.render();
    this.laserBeams = this.laserBeams.filter((b) => !b.createdAt || now - b.createdAt < (b.duration || 350));
  }

  private useMedkitInternal(): void {
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
      const medTileSize = this.renderer.tileSize;
      this.fx.spawnSparks(
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

  useMedkit(): void {
    this.useMedkitInternal();
  }

  private useBatteryInternal(): void {
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
      const batteryTileSize = this.renderer.tileSize;
      this.fx.spawnSparks(
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

  useBattery(): void {
    this.useBatteryInternal();
  }

  private useEMPGrenadeInternal(): void {
    if ((this.player.consumables?.empGrenades ?? 0) > 0) {
      this.player.consumables!.empGrenades -= 1;
      soundFX.emp();
      soundFX.explosion();
      const empTileSize = this.renderer.tileSize;
      const blastRadius = 4;
      const ringRadius = blastRadius * empTileSize + 25;
      this.fx.spawnEmpRing(
        this.player.x * empTileSize + empTileSize / 2,
        this.player.y * empTileSize + empTileSize / 2,
        ringRadius
      );
      this.fx.triggerShake(6);
      let stunnedCount = 0;

      for (const r of this.robots) {
        if (!r.isAlive) continue;
        const dist = Math.abs(r.x - this.player.x) + Math.abs(r.y - this.player.y);
        if (dist <= blastRadius) {
          r.stunnedTurns = 4;
          r.aiState = 'idle';
          this.pushFloatingText(r.x, r.y, '⚡STUNNED (4T)⚡', '#00f0ff');
          this.fx.spawnSparks(
            r.x * empTileSize + empTileSize / 2,
            r.y * empTileSize + empTileSize / 2,
            '#00f0ff',
            12
          );
          stunnedCount++;
        }
      }

      this.pushFloatingText(this.player.x, this.player.y, '⚡EMP SHOCKWAVE⚡', '#c77dff');
      const isZh = this.language === 'zh';
      this.pushMessage(
        isZh
          ? `【EMP 震撼彈引爆】大範圍電磁脈衝震波席捲周遭！${stunnedCount} 隻機器人電路短路癱瘓 4 回合！`
          : `EMP Disruptor detonated! Electromagnetic shockwave short-circuited ${stunnedCount} robot(s) for 4 turns!`,
        'success'
      );
      this.tick();
    } else {
      this.pushMessage('No EMP Disruptor Grenades in inventory!', 'warning');
      this.render();
    }
  }

  useEMPGrenade(): void {
    this.useEMPGrenadeInternal();
  }

  private buyAugmentInternal(augmentId: string): void {
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

  buyAugment(augmentId: string): void {
    this.buyAugmentInternal(augmentId);
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
    if (this.player.equippedWeapon) { this.player.equippedWeapon.overclockLevel = (this.player.equippedWeapon.overclockLevel || 0) + 1; }
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
    this.player.checkInTimer = 100;
    
    for (const r of this.robots) {
      if (r.isAlive && r.aiState === 'chase') {
        r.aiState = 'patrol';
        r.pursuitTurns = 0;
      }
    }

    soundFX.terminal();
    this.pushFloatingText(this.player.x, this.player.y, 'SECURITY OVERRIDE - CLEAR', '#00ff88');
    this.pushMessage('Bribed Security Network. All alerts cleared and patrols reset.', 'success');
    this.render();
    return true;
  }

  private detonateCanister(canister: Hazard): void {
    const result = _detonateCanister(canister, this.player, this.robots);
    if (!canister.exploded || (result.damagedRobots.length === 0 && !result.playerDamaged && canister.hp !== 0)) return;
    soundFX.explosion();
    soundFX.emp();
    this.pushFloatingText(canister.x, canister.y, 'PLASMA DETONATION!', '#ff6d00');
    const tileSize = this.renderer.tileSize;
    this.fx.spawnPlasmaCanisterExplosion(canister.x * tileSize + tileSize / 2, canister.y * tileSize + tileSize / 2, tileSize * 2.2);
    this.fx.triggerShake(10);
    for (const robot of result.damagedRobots) this.pushFloatingText(robot.x, robot.y, '-70', '#ff6d00');
    for (const robot of result.destroyedRobots) { soundFX.explosion(); this.pushMessage(robot.name + ' destroyed by plasma explosion!', 'success'); }
    if (result.playerDamaged) { this.pushFloatingText(this.player.x, this.player.y, '-20', '#ff1744'); this.pushMessage('Plasma explosion! -20 HP from blast damage.', 'danger'); if (this.player.hp <= 0) this.handlePlayerDefeat(); }
  }

  handlePlayerDefeat(instant: boolean = (typeof window === 'undefined')): void {
    if (instant) {
      this.executeDetentionRelocationInternal(true);
      return;
    }
    if (this.defeatCutscene) {
      return;
    }
    this.startDefeatCutscene();
  }

  private executeDetentionRelocationInternal(showMessages: boolean = true): void {
    executeDetentionRelocation(this, showMessages);
  }

  executeDetentionRelocation(showMessages?: boolean): void {
    this.executeDetentionRelocationInternal(showMessages ?? true);
  }

  startDefeatCutscene(): void {
    startDefeatCutscene(this);
  }

  updateDefeatCutscene(now: number): void {
    updateDefeatCutscene(this, now);
  }

  recoverConfiscatedGear(): void {
    if (!this.isGearConfiscated || !this.confiscatedGear) return;
    const p = this.player;
    const gear = this.confiscatedGear;

    // Restore weapons
    if (Array.isArray(gear.weapons) && gear.weapons.length > 0) {
      p.weapons = [...gear.weapons];
    }
    if (gear.equippedWeapon) {
      p.equippedWeapon = { ...gear.equippedWeapon };
    } else if (Array.isArray(p.weapons) && p.weapons.length > 0) {
      p.equippedWeapon = { ...p.weapons[0] };
    }

    // Safety fallback: if weapons are still empty (e.g. corrupted save), use initial loadout
    if (!Array.isArray(p.weapons) || p.weapons.length === 0) {
      const fallback = createPlayer({ x: p.x, y: p.y });
      p.weapons = [...(fallback.weapons || [])];
      p.equippedWeapon = fallback.equippedWeapon ? { ...fallback.equippedWeapon } : null;
    }

    // Sync equipped flag on weapons and ensure equipped weapon is in inventory
    if (Array.isArray(p.weapons)) {
      for (const w of p.weapons) {
        if (w && p.equippedWeapon && w.id === p.equippedWeapon.id) {
          w.equipped = true;
        } else if (w) {
          w.equipped = false;
        }
      }
      if (p.equippedWeapon && Array.isArray(p.inventory)) {
        const eqId = p.equippedWeapon.id;
        if (!p.inventory.some((it: any) => it?.id === eqId)) {
          p.inventory.push({ ...p.equippedWeapon });
        }
      }
    }

    // Restore inventory
    if (Array.isArray(gear.inventory)) {
      p.inventory = [...gear.inventory];
      // Re-ensure equipped weapon is in inventory after restoring gear inventory
      if (p.equippedWeapon && Array.isArray(p.inventory)) {
        const eqId = p.equippedWeapon.id;
        if (!p.inventory.some((it: any) => it?.id === eqId)) {
          p.inventory.push({ ...p.equippedWeapon });
        }
      }
    }

    // Restore consumables
    if (gear.consumables) {
      p.consumables = { ...gear.consumables };
    }

    // Restore augments
    if (gear.augments) {
      p.augments = { ...gear.augments };
    }

    // Restore shield
    if (gear.equippedShield) {
      p.equippedShield = { ...gear.equippedShield };
    }

    this.isGearConfiscated = false;
    this.confiscatedGear = null;

    // Remove the confiscated locker from ground items
    const lockerIdx = this.groundItems.findIndex((it) => it.id === 'item-confiscated-locker');
    if (lockerIdx !== -1) {
      this.groundItems.splice(lockerIdx, 1);
    }
    if (this.sectorGroundItems['sector-1']) {
      const secLockerIdx = this.sectorGroundItems['sector-1'].findIndex((it) => it.id === 'item-confiscated-locker');
      if (secLockerIdx !== -1) {
        this.sectorGroundItems['sector-1'].splice(secLockerIdx, 1);
      }
    }

    soundFX.pickup();
    this.pushFloatingText(this.player.x, this.player.y, 'GEAR RECOVERED!', '#00ff88');
    this.pushMessage(
      this.language === 'zh'
        ? '【裝備找回】你從佐格證物保管箱中取回了所有被扣押的武器、裝備與補給品！'
        : '[GEAR RECOVERED] You retrieved all confiscated weapons, equipment, and supplies from the Tzorg evidence locker!',
      'success'
    );
    this.render();
  }

  resetDetentionCell(): void {
    const block = this.pushableBlocks.find((b) => b.id === 'crate-detention-grate');
    if (block) {
      block.revealed = false;
      block.x = 36;
      block.y = 4;
      // Restore the secret door tile back to wall
      if (block.secretDoor) {
        const mapData = this.map.tiles || this.map.grid;
        if (Array.isArray(mapData)) {
          const row = mapData[block.secretDoor.y];
          if (Array.isArray(row)) {
            row[block.secretDoor.x] = block.secretDoor.originalTile ?? 2; // WALL
          }
        }
      }
    }
  }

  private checkItemPickupInternal(): void {
    const itemIndex = this.groundItems.findIndex((it) => it.x === this.player.x && it.y === this.player.y);
    if (itemIndex !== -1) {
      const item = this.groundItems.splice(itemIndex, 1)[0];
      if (item.id === 'item-confiscated-locker') {
        this.recoverConfiscatedGear();
        this.resetDetentionCell();
        soundFX.pickup();
        return;
      }
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
        let inventory = this.player.inventory;
        if (!Array.isArray(inventory)) {
          inventory = [];
          this.player.inventory = inventory;
        }
        if (!inventory.some((it: any) => it?.id === item.id)) {
          inventory.push(item as unknown as Item);
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
        } else if (item.id === 'item-forged-checkin-credential') {
          const isZh = this.language === 'zh';
          const currentMax = this.player.checkInMaxTimer ?? 100;
          this.player.checkInMaxTimer = Math.max(currentMax, 125);
          const relayObj = this.missionObjectives.find((o) => o.id === 'obj-checkpoint-relay');
          if (relayObj && !relayObj.completed) {
            relayObj.completed = true;
            relayObj.discovered = true;
            this.pushMessage(isZh ? '【任務更新】滲透檢查哨中繼附屬區任務完成！' : 'MISSION UPDATE: Infiltrate Checkpoint Relay Annex objective complete!', 'success');
          }
          this.gainExp(100, 'CREDENTIAL');
          this.pushFloatingText(this.player.x, this.player.y, 'CHECK-IN CREDENTIAL', '#ffea00');
          this.pushMessage(
            isZh
              ? `【取得簽到憑證】獲得【偽造簽到憑證】！未來每次簽到將重置為 125 步。`
              : `[CHECK-IN CREDENTIAL] Acquired [${item.name}]! Future check-ins will now reset to 125 steps.`,
            'success'
          );
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
      } else if (item.itemType === 'WEAPON') {
        const weaponId = item.weaponId || 'VIBRO_KATANA';
        const weaponName = item.name || 'Molecular Oscillation High-Frequency Blade';
        const weaponObj: Item = {
          id: `weapon-${weaponId}`,
          name: weaponName,
          type: 'WEAPON' as const,
          itemType: 'WEAPON' as const,
          weaponId,
          power: item.power || 48,
          energyCost: 6,
          range: 1,
          isSuppressed: true,
          iconColor: item.iconColor || '#00ffff',
          description: item.description || 'A high-frequency blade that cuts through molecular bonds.',
          equipped: false,
        } as Item;

        let inventory = this.player.inventory;
        if (!Array.isArray(inventory)) {
          inventory = [];
          this.player.inventory = inventory;
        }
        if (!inventory.some((it: any) => it?.id === weaponObj.id)) {
          inventory.push(weaponObj);
        }

        let weapons = this.player.weapons;
        if (!Array.isArray(weapons)) {
          weapons = [];
          this.player.weapons = weapons;
        }
        if (!weapons.some((w: any) => w?.id === weaponObj.id)) {
          weapons.push(weaponObj);
        }

        soundFX.victory();
        const isZh = this.language === 'zh';
        this.pushFloatingText(this.player.x, this.player.y, weaponName, '#00ffff');
        this.pushMessage(
          isZh
            ? `【獲得武器】你獲得了【${weaponName}】！按 [Q] 輪換武器。`
            : `[WEAPON ACQUIRED] You acquired [${weaponName}]! Press [Q] to cycle weapons.`,
          'success'
        );
      } else if (item.itemType === 'DATA_SLATE') {
        const foundLog = this.storyLogs.find((l) => l.id === item.storyLogId);
        if (foundLog) {
          foundLog.read = true;
          if (item.storyLogId) {
            _discoverMainStoryQuest(this, { sourceType: 'STORY_LOG', sourceId: item.storyLogId });
            _completeMainStoryQuest(this, { sourceType: 'STORY_LOG', sourceId: item.storyLogId });
          }
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
        this.pushMessage(this.language === 'zh' ? '【任務更新】戰術物資搜集任務完成！' : 'MISSION UPDATE: Tactical Stockpile objective complete!', 'success');
        this.gainExp(50, 'MISSION_COMPLETE');
      }
    }
  }

  checkItemPickup(): void {
    this.checkItemPickupInternal();
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

  updateNPCDialogues(): void {
    _updateNPCDialogues(this);
  }

  checkSideQuestDiscovery(npcId: string): void {
    _checkQuestDiscovery(this, npcId);
  }

  private completeSideQuestInternal(questId: string): void {
    _completeQuest(this, questId);
  }

  completeSideQuest(questId: string): void {
    this.completeSideQuestInternal(questId);
  }

  disarmCollar(): void {
    this.isCollarDisarmed = true;
    this.player.isCollarDisarmed = true;
    this.checkInAlertActive = false;
    this.player.checkInTimer = 100;
    this.securityLevel = 'CLEAR' as SecurityLevel;
    for (const r of this.robots) {
      if (!r.isAlive) continue;
      r.aiState = 'patrol';
      r.targetPos = null;
      r.pursuitTurns = 0;
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
    this.journalEntries = loadJournalEntries();
    this.isTitleStoryOpen = false;
    this.titleStoryScrollOffset = 0;
    this.defeatCutscene = null;
    this.isGearConfiscated = false;
    this.confiscatedGear = null;
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
    this.isManualOpen = false;
    this.isAugmentShopOpen = false;
    this.isBigMapOpen = false;
    this.isJournalOpen = false;
    this.activeBreachSession = null;
    this.securityLevel = 'CLEAR' as SecurityLevel;
    this.messages = [];
    this.floatingTexts = [];
    this.pushMessage('OPERATION PROMETHEUS: Protocol restarted. Operative Raven deployed.', 'info');
    this.pushMessage(this.language === 'zh' ? '【系統提示】神經視覺尚未校準，請移動一步以同步光學感測器。' : 'SYSTEM: Neural vision not yet calibrated. Move one step to synchronize optical sensors.', 'info');
    this.activeTerminal = null;
    this.activeDialogue = null;
    this.laserBeams = [];
    this.terminalInputBuffer = '';
    this.victory = false;
    this.endgameChoice = null;
    this.citadelAirdrops.length = 0;
    this.isCitadelHordeActive = false;
    this.isIntroBriefingOpen = false;
    this.introBriefingScrollOffset = 0;
    if (this.renderer) {
      this.renderer.isTitleStoryOpen = false;
      this.renderer.isManualOpen = false;
      this.renderer.isBigMapOpen = false;
      this.renderer.activeBreachSession = null;
      this.renderer.storyArchiveSelectedIndex = 0;
      this.renderer.defeatCutscene = null;
    }
    soundFX.pickup();
    this.updateFOV();
    this.updateMusicIntensity();
    this.render();
  }

  returnToTitleScreen(): void {
    this.restartGame();
    this.journalEntries = loadJournalEntries();
    this.isTitleScreen = true;
    this.isTitleStoryOpen = false;
    this.titleStoryScrollOffset = 0;
    this.titleMenuIndex = 0;
    this.isIntroBriefingOpen = false;
    this.introBriefingScrollOffset = 0;
    this.defeatCutscene = null;
    this.isGearConfiscated = false;
    this.confiscatedGear = null;
    if (this.renderer) {
      this.renderer.isTitleStoryOpen = false;
      this.renderer.isManualOpen = false;
      this.renderer.isBigMapOpen = false;
      this.renderer.activeBreachSession = null;
      this.renderer.storyArchiveSelectedIndex = 0;
      this.renderer.defeatCutscene = null;
    }
    this.updateMusicIntensity();
    this.render();
  }

  private handleTerminalInput(key: string): void {
    _handleTerminalInput(this, key);
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
    _processConveyors({
      player: this.player,
      robots: this.robots,
      isConveyorTile: (x, y) => this.isConveyorTile(x, y),
      getDirection: (x, y) => this.getConveyorDirection(x, y),
      isWalkableAt: (x, y) => { const tile = getTile(this.map, { x, y }); return tile !== undefined && isWalkable(tile); },
      onPlayerMoved: (direction) => { this.checkItemPickupInternal(); soundFX.step(); const label = direction.dx === 1 ? '»» CONVEYOR »»' : direction.dx === -1 ? '«« CONVEYOR ««' : 'CONVEYOR'; this.pushFloatingText(this.player.x, this.player.y, label, '#00f0ff'); this.pushMessage('Conveyor belt transport: Operative moved to new position.', 'info'); },
    });
  }

  fireEquippedWeapon(direction?: { dx: number; dy: number }): boolean {
    return _fireEquippedWeapon(this, direction);
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
    const rawTerminals = this.map.terminals;

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
        const pos = terminal?.position;
        if (pos && pos.x === x && pos.y === y) {
          return terminal;
        }
      }
    }

    return null;
  }

  triggerCitadelHorde(): void {
    _triggerCitadelHorde(this.robots, this.player, (message, type) => this.pushMessage(message, type), this.citadelAirdrops);
    this.isCitadelHordeActive = true;
    this.render();
  }

  private updateCitadelHorde(): void {
    if (!this.isCitadelHordeActive || this.victory || this.map?.id !== 'sector-citadel') return;
    _updateCitadelHorde(this.robots, this.player, this.turnCounter, this.citadelAirdrops, Date.now());
  }

  openJournal(): void {
    this.journalEntries = loadJournalEntries();
    this.isJournalOpen = true;
    this.journalMode = 'view';
    this.journalSelectedIndex = 0;
    this.journalInputBuffer = '';
    this.journalTitleInputBuffer = '';
    this.journalComposeField = 'title';
    this.render();
  }

  closeJournal(): void {
    this.isJournalOpen = false;
    this.journalMode = 'view';
    this.journalInputBuffer = '';
    this.journalTitleInputBuffer = '';
    this.journalComposeField = 'title';
    this.render();
  }

  submitJournalEntry(): boolean {
    const content = this.journalInputBuffer.trim();
    if (!content) {
      return false;
    }
    const title = this.journalTitleInputBuffer.trim();
    saveJournalEntry(content, this.map?.id || 'sector-1', { x: this.player.x, y: this.player.y }, title);
    this.journalEntries = loadJournalEntries();
    this.journalMode = 'view';
    this.journalSelectedIndex = 1;
    this.journalInputBuffer = '';
    this.journalTitleInputBuffer = '';
    this.journalComposeField = 'title';
    soundFX.pickup();
    this.pushMessage(this.language === 'zh' ? '【日記】條目已儲存。' : '[JOURNAL] Entry saved.', 'success');
    this.render();
    return true;
  }

  deleteSelectedJournalEntry(): boolean {
    if (this.journalSelectedIndex <= 0) {
      return false;
    }
    const target = this.journalEntries[this.journalSelectedIndex - 1];
    if (!target) {
      return false;
    }
    deleteJournalEntry(target.id);
    this.journalEntries = loadJournalEntries();
    if (this.journalSelectedIndex > this.journalEntries.length) {
      this.journalSelectedIndex = this.journalEntries.length;
    }
    soundFX.terminal();
    this.pushMessage(this.language === 'zh' ? '【日記】條目已刪除。' : '[JOURNAL] Entry deleted.', 'info');
    this.render();
    return true;
  }

  clearAllJournalEntries(): void {
    clearJournalEntries();
    this.journalEntries = [];
    this.journalSelectedIndex = 0;
    soundFX.terminal();
    this.pushMessage(this.language === 'zh' ? '【日記】已清空所有特工筆記。' : '[JOURNAL] All entries cleared.', 'info');
    this.render();
  }

  getAIPerceptionSnapshot(): AIPerceptionSnapshot {
    return generateAIPerceptionSnapshot(this);
  }

  executeAIAction(action: string): AIActionOutcome {
    return _executeAIAction(this, action);
  }

  getActionSemantic(action: string): ActionSemantic {
    return getActionSemantic(action, this);
  }

  getMentalMap(options?: any): MentalMapSnapshot {
    return getMentalMapSnapshot(this, options);
  }

  planMentalMapRoute(target: string | { x: number; y: number }, startPos?: { x: number; y: number }): RoutePlan {
    return planMentalMapRoute(this, target, startPos);
  }
}

export default GameEngine;
