import type { SectorMap, Player, Robot, SecurityLevel, GameMessage, Position, RobotType, NPC, DialogueSession, GroundItem, MissionObjective, StoryLog, Hazard, Language } from './types';
import { buildSector1Map, buildSector2Map, calculateFOV, disableForcefield, getTile, isWalkable, toggleDoor } from './map';
import { hasSavedGame, saveGameState, loadGameState } from './saveLoad';
import { createPlayer, createRobot, toggleWeaponDraw, toggleDisguise, installAugment, cycleWeapon } from './entities';
import { updateRobotAI } from './ai';
import { TerminalSession } from './terminal';
import { GameRenderer } from './renderer';
import { soundFX } from './audio';
import { getSector1NPCs, getSector2NPCs, getSectorStoryLogs } from './dialogues';
import { createBossExterminator } from './boss';
import { createBreachSession, moveBreachCursor, selectBreachCell, type BreachSession } from './breachProtocol';
import { handleSpecialInput } from './inputHandler';

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
  laserBeams: Array<{ from: Position; to: Position; color: string }>;
  floatingTexts: Array<{ x: number; y: number; text: string; color: string; createdAt?: number }>;
  hazards: Hazard[] = [];
  isAugmentShopOpen: boolean = false;
  terminalInputBuffer: string = '';
  victory: boolean = false;
  isTitleScreen: boolean = false;
  language: Language = 'zh';
  isManualOpen: boolean = false;
  activeBreachSession: BreachSession | null = null;

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
      createRobot('SHOCK_ENFORCER' as RobotType, { x: 25, y: 6 }, [{ x: 25, y: 6 }, { x: 27, y: 6 }]),
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
        x: 18,
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
        y: 10,
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
        x: 6,
        y: 3,
        description: 'Encrypted memory disc: Dr. Vance\'s remorse regarding the Neural Collar.',
        iconColor: '#00e5ff',
        storyLogId: 'slate-vance',
      },
      {
        id: 'slate-item-kira',
        name: 'Data Slate 02',
        itemType: 'DATA_SLATE',
        x: 3,
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
        y: 9,
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
    ];
  }

  private createSectorHazards(): Hazard[] {
    return [
      { id: 'hazard-plasma-1', x: 19, y: 8, type: 'PLASMA_CANISTER', hp: 1, exploded: false },
      { id: 'hazard-plasma-2', x: 26, y: 7, type: 'PLASMA_CANISTER', hp: 1, exploded: false },
      { id: 'hazard-plasma-3', x: 33, y: 19, type: 'PLASMA_CANISTER', hp: 1, exploded: false },
      { id: 'hazard-plasma-4', x: 14, y: 12, type: 'PLASMA_CANISTER', hp: 1, exploded: false },
    ];
  }

  switchSector(targetSectorId: string): void {
    if (targetSectorId === 'sector-2') {
      this.map = buildSector2Map();
      this.player.x = 3;
      this.player.y = 5;
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
      this.visibleTiles.clear();
      this.exploredTiles.clear();
      this.updateFOV();
      soundFX.door();
      this.pushFloatingText(this.player.x, this.player.y, 'SECTOR 2: FAB-PLEX', '#00f0ff');
      this.pushMessage('TRANSIT COMPLETE: Arrived at Sector 2 (Fab-Plex). Central Overmind core located to East!', 'warning');
    } else if (targetSectorId === 'sector-1') {
      this.map = buildSector1Map();
      this.player.x = 37;
      this.player.y = 25;
      (this.player as any).currentSectorId = 'sector-1';
      this.robots = this.createSectorRobots();
      this.hazards = this.createSectorHazards();
      this.npcs = this.createSectorNPCs();
      this.visibleTiles.clear();
      this.exploredTiles.clear();
      this.updateFOV();
      soundFX.door();
      this.pushFloatingText(this.player.x, this.player.y, 'SECTOR 1: STREETS', '#00f0ff');
      this.pushMessage('TRANSIT COMPLETE: Returned to Sector 1 Metropolis.', 'info');
    }
  }

  private pushMessage(text: string, type: GameMessage['type']): void {
    this.messages.push({ text, type });
    if (this.messages.length > 50) {
      this.messages.splice(0, this.messages.length - 50);
    }
  }

  private pushFloatingText(x: number, y: number, text: string, color: string): void {
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

  updateFOV(): void {
    this.visibleTiles = calculateFOV(this.map, { x: this.player.x, y: this.player.y }, 9);
    this.visibleTiles.forEach((key) => {
      this.exploredTiles.add(key);
    });
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
    this.renderer.isTitleScreen = this.isTitleScreen;
    this.renderer.language = this.language;
    this.renderer.hasSaveData = this.hasSaveGame();
    this.renderer.isManualOpen = this.isManualOpen;
    this.renderer.activeBreachSession = this.activeBreachSession;
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
  }

  handleKeyDown(key: string): void {
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
          }
          soundFX.pickup();
          this.pushMessage(r.message, 'success');

          const safehouseObj = this.missionObjectives.find((o) => o.id === 'obj-safehouse');
          if (safehouseObj && !safehouseObj.completed) {
            safehouseObj.completed = true;
            this.pushMessage('MISSION UPDATE: Safehouse Recon objective complete!', 'success');
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

    // 活躍終端機模式 (Terminal Session)
    if (this.activeTerminal) {
      if (key === 'Escape' || key === 'Esc') {
        this.activeTerminal = null;
        this.terminalInputBuffer = '';
        soundFX.terminal();
        this.render();
        return;
      }

      if (key === 'Enter') {
        soundFX.terminal();
        const cmd = this.terminalInputBuffer;
        this.terminalInputBuffer = '';
        this.activeTerminal.input = '';
        if (cmd.toUpperCase() === 'BREACH' || cmd.toUpperCase() === 'HACK') {
          const terminalId =
            (this.activeTerminal as any).terminalId ??
            (this.activeTerminal as any).terminal?.id ??
            (this.activeTerminal as any).id ??
            'UNKNOWN';
          this.activeBreachSession = createBreachSession(terminalId);
          soundFX.terminal();
          this.pushMessage(this.language === 'zh' ? '神經入侵協定啟動：正在載入賽博代碼矩陣...' : 'NEURAL BREACH: Initializing cyberspace matrix...', 'info');
          this.render();
          return;
        }
        const result: any = this.activeTerminal.executeCommand(cmd);

        if (result?.disabledForcefield) {
          disableForcefield(this.map, result.disabledForcefield);
          this.securityLevel = 'CLEAR' as SecurityLevel;
          this.victory = true;
          soundFX.victory();
          this.pushMessage('Checkpoint forcefield disabled. Resistance objective accomplished!', 'success');
          this.pushFloatingText(this.player.x, this.player.y, 'VICTORY!', '#00ff88');

          const ffObj = this.missionObjectives.find((o) => o.id === 'obj-forcefield');
          if (ffObj) ffObj.completed = true;
          const vaultObj = this.missionObjectives.find((o) => o.id === 'obj-vault');
          if (vaultObj) vaultObj.completed = true;
        }

        if (result?.endgameChoice) {
          (this.player as any).endgameChoice = result.endgameChoice;
          this.victory = true;
          soundFX.victory();
          this.pushMessage('OPERATION PROMETHEUS: [' + result.endgameChoice + '] protocol executed.', 'success');
          this.pushFloatingText(this.player.x, this.player.y, 'ENDGAME: ' + result.endgameChoice, '#00ff88');
        }

        if (result?.clearedAlert) {
          this.securityLevel = 'CLEAR' as SecurityLevel;
          soundFX.pickup();
          this.pushMessage('Security alert cleared from terminal database.', 'success');
        }

        if (result?.energyGain) {
          this.player.energy = Math.min(this.player.maxEnergy, this.player.energy + result.energyGain);
          soundFX.pickup();
          this.pushFloatingText(this.player.x, this.player.y, '+' + result.energyGain + ' EN', '#00f0ff');
          this.pushMessage('Extracted +' + result.energyGain + ' energy from terminal capacitors.', 'success');
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
        this.activeTerminal.input = this.terminalInputBuffer;
        this.render();
        return;
      }

      if (key.length === 1) {
        soundFX.terminal();
        this.terminalInputBuffer += key;
        this.activeTerminal.input = this.terminalInputBuffer;
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
    } else if (key === 'q' || key === 'Q') {
      const weapon = cycleWeapon(this.player);
      soundFX.terminal();
      const isSup = (weapon as any).isSuppressed;
      this.pushFloatingText(this.player.x, this.player.y, weapon.name, isSup ? '#00ff88' : '#00f0ff');
      this.pushMessage('ARMAMENT SWITCH: Equipped [' + weapon.name + '] (' + weapon.power + ' DMG, ' + weapon.energyCost + ' EN' + (isSup ? ' | SUPPRESSED' : '') + ').', 'info');
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
      // 優先檢查是否與相鄰居民交談
      const dirs: [number, number][] = [[0, 0], [0, 1], [0, -1], [1, 0], [-1, 0]];
      for (const [ox, oy] of dirs) {
        const tx = this.player.x + ox;
        const ty = this.player.y + oy;
        const npc = this.npcs.find((n) => n.isAlive && n.x === tx && n.y === ty);
        if (npc) {
          soundFX.terminal();
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
    } else if (key === ' ' || key === '.') {
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
        let hitRobot: Robot | null = null;
        let hitCanister: Hazard | null = null;
        const maxRange = (this.player.equippedWeapon as any)?.range ?? 5;
        for (let range = 1; range <= maxRange; range++) {
          const tx = this.player.x + dx * range;
          const ty = this.player.y + dy * range;
          const tTile = getTile(this.map, { x: tx, y: ty });
          const tName = String(tTile).toUpperCase();
          if (tName === 'WALL' || tTile === 2) break;

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

        if (hitRobot) {
          const weapon = this.player.equippedWeapon;
          const energyCost = weapon?.energyCost ?? 5;
          if (this.player.energy < energyCost) {
            soundFX.hit();
            this.pushMessage('Energy depleted! Blaster power cells exhausted.', 'danger');
            this.render();
            return;
          }

          // 戰術背刺與奇襲判定 (Ambush / Silent Backstab)
          const isBackstab =
            this.player.isDisguised ||
            hitRobot.aiState === 'patrol' ||
            (hitRobot.stunnedTurns ?? 0) > 0;

          const baseDamage = weapon?.power ?? 35;
          const damage = isBackstab ? Math.round(baseDamage * 3) : baseDamage;

          this.player.energy -= energyCost;
          const weaponId = (weapon as any)?.weaponId;
          if (weaponId === 'DART_GUN') {
            soundFX.dart();
          } else if (weaponId === 'SCATTER_SHOTGUN') {
            soundFX.shotgun();
          } else {
            soundFX.laser();
          }
          hitRobot.hp -= damage;
          this.laserBeams.push({
            from: { x: this.player.x, y: this.player.y },
            to: { x: hitRobot.x, y: hitRobot.y },
            color: isBackstab ? '#ffea00' : '#00f0ff',
          });

          if (isBackstab) {
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
          } else {
            soundFX.hit();
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
                r.aiState = 'investigate';
                r.targetPos = { x: this.player.x, y: this.player.y };
              }
            }
          } else {
            this.pushMessage('Silent takedown executed! Acoustic suppression maintained.', 'info');
          }

          this.tick();
          return;
        }

        if (hitCanister) {
          this.detonateCanister(hitCanister);
          this.tick();
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

        // 自動拾取地面物資 (Auto-loot ground items)
        this.checkItemPickup();

        const standingTile = getTile(this.map, { x: nx, y: ny });
        if (Number(standingTile) === 9 || String(standingTile).toUpperCase() === 'ELEVATOR') {
          const nextSec = this.map.id === 'sector-1' ? 'sector-2' : 'sector-1';
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
      }
    }
  }

  tick(): void {
    const now = Date.now();
    this.floatingTexts = this.floatingTexts.filter((ft) => !ft.createdAt || now - ft.createdAt < 1500);
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

    this.updateFOV();
    this.render();
    this.laserBeams = [];
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

  private detonateCanister(canister: Hazard): void {
    canister.exploded = true;
    canister.hp = 0;
    soundFX.explosion();
    this.pushFloatingText(canister.x, canister.y, 'PLASMA DETONATION!', '#ff6d00');

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
        this.pushFloatingText(this.player.x, this.player.y, 'PASSCODE ACQUIRED', '#ffea00');
        this.pushMessage(`Acquired [${item.name}]: Tzorg security clearance elevated.`, 'success');
      } else if (item.itemType === 'DATA_SLATE') {
        const foundLog = this.storyLogs.find((l) => l.id === item.storyLogId);
        if (foundLog) {
          foundLog.read = true;
          this.activeStoryLog = foundLog;
          soundFX.terminal();
          this.pushFloatingText(this.player.x, this.player.y, 'LORE UNLOCKED!', '#00e5ff');
          this.pushMessage(`Decrypted Data Slate: [${foundLog.title}]. Press [L] to review archives.`, 'success');
          this.updateNPCDialogues();
        }
      }
      soundFX.pickup();

      const scavengeObj = this.missionObjectives.find((o) => o.id === 'obj-scavenge');
      if (scavengeObj && !scavengeObj.completed) {
        scavengeObj.completed = true;
        this.pushMessage('MISSION UPDATE: Tactical Stockpile objective complete!', 'success');
      }
    }
  }

  private updateNPCDialogues(): void {
    const vanceRead = this.storyLogs.find((l) => l.id === 'slate-vance')?.read;
    const kiraRead = this.storyLogs.find((l) => l.id === 'slate-kira')?.read;
    const tzorgRead = this.storyLogs.find((l) => l.id === 'slate-tzorg')?.read;

    const vance = this.npcs.find((n) => n.id === 'npc-vance');
    if (vance && vanceRead) {
      vance.dialogue = [
        'You recovered my laboratory disc, Raven... yes. I engineered the early neural dampeners.',
        'The guilt burns every waking second. That is why I synthesized those restorative nanites specifically to purge Tzorg\'s command signals.',
        'The checkpoint forcefield ahead uses a phased harmonic barrier. Infiltrate terminal CHECKPOINT_FF to short-circuit the capacitors.',
      ];
    }

    const kira = this.npcs.find((n) => n.id === 'npc-kira');
    if (kira && kiraRead) {
      kira.dialogue = [
        'You read the Sector 2 codex... we lost seventy courageous souls when the Hunter-Killers purged our base.',
        'Doc Vance rebuilt your chassis from prototype military salvage. You are the vanguard of our revolution, Raven.',
        'Once that forcefield drops, Ghost will guide you directly to the Central Vault. Make Tzorg answer for every fallen comrade!',
      ];
    }

    const jax = this.npcs.find((n) => n.id === 'npc-jax');
    if (jax && tzorgRead) {
      jax.dialogue = [
        'Raven! Tzorg\'s Overmind broadcasted an all-units security memo about you on the encrypted channels.',
        'They know you have military-grade camouflage and EMP shock modules. They are terrified of what you might do to their mainframes.',
        'If you drop an EMP on a patrol, hit them from behind while they are stunned. It deals massive critical override damage!',
      ];
    }
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
