import type { SectorMap, Player, Robot, SecurityLevel, GameMessage, Position, RobotType, NPC, DialogueSession, GroundItem, MissionObjective } from './types';
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
  npcs: NPC[];
  groundItems: GroundItem[];
  missionObjectives: MissionObjective[];
  isInventoryOpen: boolean = false;
  isMissionLogOpen: boolean = false;
  securityLevel: SecurityLevel;
  messages: GameMessage[];
  visibleTiles: Set<string>;
  exploredTiles: Set<string>;
  activeTerminal: TerminalSession | null;
  activeDialogue: DialogueSession | null;
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
    this.npcs = this.createSectorNPCs();
    this.groundItems = this.createSectorItems();
    this.missionObjectives = this.createSectorObjectives();
    this.isInventoryOpen = false;
    this.isMissionLogOpen = false;
    this.securityLevel = 'CLEAR' as SecurityLevel;
    this.messages = [];
    this.floatingTexts = [];
    this.pushMessage('SYSTEM: Resistance neural-link online.', 'info');
    this.pushMessage('MISSION: Infiltrate Tzorg facility & deactivate checkpoint forcefield.', 'warning');
    this.pushMessage('INTEL: Speak with Kira [T], check tactical missions [M] & inventory [I].', 'info');
    this.visibleTiles = new Set<string>();
    this.exploredTiles = new Set<string>();
    this.activeTerminal = null;
    this.activeDialogue = null;
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

  private createSectorNPCs(): NPC[] {
    return [
      {
        id: 'npc-kira',
        name: 'Kira',
        role: 'Spark Cell Commander',
        avatarColor: '#ff6d00',
        x: 4,
        y: 6,
        hp: 100,
        maxHp: 100,
        isAlive: true,
        dialogue: [
          'Operative! The Tzorg network has locked down Checkpoint 01 with a high-energy plasma barrier.',
          'We confirmed the forcefield is tied to terminal CHECKPOINT_FF inside the outpost. Infiltrate and override it.',
          'Use your Holo-Disguise [C] to slip past patrol drones, and keep that blaster holstered until needed.',
          'Here, take these auxiliary power cells (+40 EN). The Spark is counting on you!',
        ],
        questReward: {
          type: 'ENERGY',
          amount: 40,
          message: 'Kira granted +40 Energy Cells!',
        },
        rewardClaimed: false,
      },
      {
        id: 'npc-vance',
        name: 'Doc Vance',
        role: 'Cyber-Medic',
        avatarColor: '#00e5ff',
        x: 7,
        y: 4,
        hp: 80,
        maxHp: 80,
        isAlive: true,
        dialogue: [
          'Good to see you breathing, operative. Let me patch your dermal plating and vital systems.',
          'Take this dose of restorative nanites (+35 HP).',
          'Watch out for the Shock Enforcers. Their electro-stuns bypass body armor completely!',
        ],
        questReward: {
          type: 'HEAL',
          amount: 35,
          message: 'Doc Vance restored +35 HP with nanites!',
        },
        rewardClaimed: false,
      },
      {
        id: 'npc-jax',
        name: 'Jax',
        role: 'Alley Informant',
        avatarColor: '#ffea00',
        x: 16,
        y: 6,
        hp: 70,
        maxHp: 70,
        isAlive: true,
        dialogue: [
          'Psst... keep your head down! The patrol drones have been buzzing this alley all morning.',
          'If you trip a security alert, you can clear it from any terminal by typing CLEAR_ALARM.',
          'I salvaged some credit chips from an old enforcer patrol. Take 60 Credits (+60 CR)!',
        ],
        questReward: {
          type: 'CREDITS',
          amount: 60,
          message: 'Jax handed you +60 Credits!',
        },
        rewardClaimed: false,
      },
      {
        id: 'npc-ghost',
        name: 'Ghost',
        role: 'Resistance Infiltrator',
        avatarColor: '#9d4edd',
        x: 31,
        y: 23,
        hp: 90,
        maxHp: 90,
        isAlive: true,
        dialogue: [
          'You bypassed the checkpoint forcefield! Outstanding infiltration, operative.',
          'The Tzorg central server vault is directly ahead. Access the terminal inside to complete our sector victory!',
        ],
        rewardClaimed: false,
      },
    ];
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
      this.floatingTexts,
      this.npcs,
      this.activeDialogue,
      this.groundItems,
      this.isInventoryOpen,
      this.isMissionLogOpen,
      this.missionObjectives
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
        const list = npc.dialogue || [];
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
        for (let range = 1; range <= 5; range++) {
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
        }

        if (hitRobot) {
          if (this.player.energy < 5) {
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

          const baseDamage = 35;
          const damage = isBackstab ? 105 : baseDamage;

          this.player.energy -= 5;
          soundFX.laser();
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
          if (!isBackstab) {
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
      }
      soundFX.pickup();

      const scavengeObj = this.missionObjectives.find((o) => o.id === 'obj-scavenge');
      if (scavengeObj && !scavengeObj.completed) {
        scavengeObj.completed = true;
        this.pushMessage('MISSION UPDATE: Tactical Stockpile objective complete!', 'success');
      }
    }
  }

  restartGame(): void {
    this.map = buildSector1Map();
    this.player = createPlayer(this.map.playerStart);
    this.robots = this.createSectorRobots();
    this.npcs = this.createSectorNPCs();
    this.groundItems = this.createSectorItems();
    this.missionObjectives = this.createSectorObjectives();
    this.isInventoryOpen = false;
    this.isMissionLogOpen = false;
    this.securityLevel = 'CLEAR' as SecurityLevel;
    this.messages = [];
    this.floatingTexts = [];
    this.pushMessage('SYSTEM: Protocol restarted. Resistance operative deployed.', 'info');
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
